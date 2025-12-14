import { useEffect, useMemo, useRef, useState } from 'react';

import { HAND_SIZE } from '../lib/cards';
import { PLAYER_NUM_BY_KEY, TURN_ORDER } from '../lib/seating';

/**
 * Core gameplay hook (everything after peek).
 *
 * Inputs:
 * - `phase` / `setPhase`: a small FSM controlled by the screen.
 * - `deck` / `setDeck`: remaining draw deck.
 * - `hands` / `setHands`: object keyed by playerKey (`p1..p4`) -> array of cards.
 *
 * High-level phases used by this hook:
 * - `turn`: active player's turn
 *    - turnStep 'draw': draw from deck (or pile if allowed)
 *    - turnStep 'resolve': after drawing, either swap with a hand card OR discard drawn to pile
 * - `look` (Q power): 5 seconds to reveal exactly ONE selected card anywhere
 * - `joker` (J power): 5 seconds to choose 2 cards and swap them unseen
 * - `respond`: 3-second windows per player to optionally play onto the pile
 * - `gameOver`: end screen (scores computed from remaining hands)
 *
 * Important gameplay rules captured here:
 * - Opening rule: Player 1 must draw from deck on their very first draw.
 * - Respond rule: players can play ANY facedown card; if it doesn't match respondRank, they draw 2.
 * - End rule: if any player reaches 0 cards, game ends immediately.
 * - Declare End: only allowed at the start of respond window after your play.
 *
 * Timing implementation detail:
 * - Both respond and power timers use a deadline + token approach.
 *   This avoids "skipping" players due to interval drift or repeated effect runs.
 */

export function useTurnStage({ phase, setPhase, deck, setDeck, hands, setHands }) {
  const [discardPile, setDiscardPile] = useState([]); // top is last element
  const [turnPlayer, setTurnPlayer] = useState('p1');
  const [turnStep, setTurnStep] = useState('draw'); // 'draw' | 'resolve'
  const [drawnCard, setDrawnCard] = useState(null);
  const [openingTurnComplete, setOpeningTurnComplete] = useState(false);

  // Between-turn stage: respond window for stacking matching cards (e.g., 2s on 2s).
  const RESPOND_SECONDS = 3;
  const [respondOrder, setRespondOrder] = useState(null);
  const [respondIndex, setRespondIndex] = useState(0);
  const [respondSecondsLeft, setRespondSecondsLeft] = useState(RESPOND_SECONDS);
  const [respondRank, setRespondRank] = useState(null);
  const [pendingNextTurnPlayer, setPendingNextTurnPlayer] = useState('p1');

  // Special powers played to the pile:
  // - Q: "look" stage (5s) -> player can reveal exactly one card anywhere
  // - J: "joker" stage -> player swaps two cards anywhere without revealing
  const POWER_SECONDS = 5;
  const [powerType, setPowerType] = useState(null); // 'look' | 'joker' | null
  const [powerPlayer, setPowerPlayer] = useState(null);
  const [powerSecondsLeft, setPowerSecondsLeft] = useState(POWER_SECONDS);
  const [lookRevealed, setLookRevealed] = useState(null); // { playerKey, index }
  const [jokerPickA, setJokerPickA] = useState(null); // { playerKey, index }

  const powerDeadlineMsRef = useRef(0);
  const powerWindowTokenRef = useRef(0);

  const [endDeclaredBy, setEndDeclaredBy] = useState(null);
  const [gameOverResult, setGameOverResult] = useState(null);

  // Deadline-based respond timer to avoid interval drift / double-advances.
  const respondDeadlineMsRef = useRef(0);
  const respondWindowTokenRef = useRef(0);

  const respondPlayer = respondOrder?.[respondIndex] ?? null;

  // Scoring values used on game over.
  // NOTE: ranks are strings (e.g. '10', 'Q'), not numbers.
  const computeRankValue = (rank) => {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 0;
    const n = Number(rank);
    if (Number.isFinite(n)) return n;
    return 0;
  };

  // Compute total points per player. Lowest total wins.
  const computeScores = (handsSnapshot) => {
    const scores = {};
    for (const key of TURN_ORDER) {
      const hand = handsSnapshot?.[key] ?? [];
      scores[key] = hand.reduce((sum, c) => sum + computeRankValue(c?.rank), 0);
    }
    const min = Math.min(...Object.values(scores));
    const winners = Object.keys(scores).filter((k) => scores[k] === min);
    return { scores, winners, min };
  };

  // Force game over now.
  // Caller can pass a hand snapshot if it knows hands are changing concurrently.
  const endGameNow = (handsSnapshot) => {
    const result = computeScores(handsSnapshot);
    setGameOverResult(result);
    setPhase('gameOver');
  };

  useEffect(() => {
    if (phase !== 'peekDone') return;
    // Starting state for the first real turn after peek.
    setTurnPlayer('p1');
    setTurnStep('draw');
    setDrawnCard(null);
    setOpeningTurnComplete(false);
    setEndDeclaredBy(null);
    setGameOverResult(null);
    setPowerType(null);
    setPowerPlayer(null);
    setLookRevealed(null);
    setJokerPickA(null);
    setPhase('turn');
  }, [phase, setPhase]);

  const endTurn = () => {
    // Move to next player in TURN_ORDER.
    const idx = TURN_ORDER.indexOf(turnPlayer);
    const next = idx >= 0 ? TURN_ORDER[(idx + 1) % TURN_ORDER.length] : 'p1';

    if (!openingTurnComplete && turnPlayer === 'p1') setOpeningTurnComplete(true);

    setTurnPlayer(next);
    setTurnStep('draw');
    setDrawnCard(null);
  };

  const beginPostPlayFlow = ({ playedBy, rank }) => {
    // After ANY card is played to the pile (discard or swap), we run:
    // 1) optional power stage (Q/J)
    // 2) respond window (all players clockwise starting from the player who just played)
    const startIdx = TURN_ORDER.indexOf(playedBy);
    const order =
      startIdx >= 0
        ? [...TURN_ORDER.slice(startIdx), ...TURN_ORDER.slice(0, startIdx)]
        : [...TURN_ORDER];

    const nextIdx = TURN_ORDER.indexOf(playedBy);
    const next = nextIdx >= 0 ? TURN_ORDER[(nextIdx + 1) % TURN_ORDER.length] : 'p1';

    if (!openingTurnComplete && playedBy === 'p1') setOpeningTurnComplete(true);

    setRespondOrder(order);
    setRespondIndex(0);
    setRespondRank(rank);
    // Reset timer whenever a new respond flow starts.
    setRespondSecondsLeft(RESPOND_SECONDS);
    setPendingNextTurnPlayer(next);

    setPowerPlayer(playedBy);
    if (rank === 'Q') {
      // Queen: allow the acting player to reveal 1 card anywhere for 5 seconds.
      setPowerType('look');
      setLookRevealed(null);
      setJokerPickA(null);
      setPhase('look');
      return;
    }

    if (rank === 'J') {
      // Jack: allow the acting player to swap 2 cards anywhere, unseen.
      setPowerType('joker');
      setJokerPickA(null);
      setLookRevealed(null);
      setPhase('joker');
      return;
    }

    setPowerType(null);
    setLookRevealed(null);
    setJokerPickA(null);
    setPhase('respond');
  };

  const finishPowerStage = () => {
    // Power window ended (timeout or immediate completion).
    powerDeadlineMsRef.current = 0;
    powerWindowTokenRef.current += 1;
    setPowerType(null);
    setPowerPlayer(null);
    setPowerSecondsLeft(POWER_SECONDS);
    setLookRevealed(null);
    setJokerPickA(null);
    setPhase('respond');
  };

  const finishRespondStage = () => {
    // Respond window ended (all players consumed or order empty).
    respondDeadlineMsRef.current = 0;
    respondWindowTokenRef.current += 1;
    setRespondOrder(null);
    setRespondIndex(0);
    setRespondRank(null);
    setRespondSecondsLeft(RESPOND_SECONDS);

    // If someone declared end, the game stops right before we would give them another turn.
    if (endDeclaredBy && pendingNextTurnPlayer === endDeclaredBy) {
      endGameNow(hands);
      return;
    }

    setTurnPlayer(pendingNextTurnPlayer);
    setTurnStep('draw');
    setDrawnCard(null);
    setPhase('turn');
  };

  const restartRespondWindowFrom = ({ playedBy, playedRank }) => {
    // During respond, someone may play a card.
    // - We restart the respond order from them (they become respond index 0).
    // - If they played Q/J, we interpose the power stage before respond continues.
    if (!respondRank) return;

    const startIdx = TURN_ORDER.indexOf(playedBy);
    const order =
      startIdx >= 0
        ? [...TURN_ORDER.slice(startIdx), ...TURN_ORDER.slice(0, startIdx)]
        : [...TURN_ORDER];

    setRespondOrder(order);
    setRespondIndex(0);
    setRespondSecondsLeft(RESPOND_SECONDS);

    setPowerPlayer(playedBy);

    if (playedRank === 'Q') {
      setPowerType('look');
      setLookRevealed(null);
      setJokerPickA(null);
      setPhase('look');
      return;
    }

    if (playedRank === 'J') {
      setPowerType('joker');
      setJokerPickA(null);
      setLookRevealed(null);
      setPhase('joker');
      return;
    }
  };

  const canDeclareEnd =
    phase === 'respond' &&
    !gameOverResult &&
    !endDeclaredBy &&
    !!respondOrder &&
    respondIndex === 0 &&
    respondPlayer === respondOrder[0];

  const declareEnd = () => {
    if (!canDeclareEnd) return;
    setEndDeclaredBy(respondOrder[0]);
  };

  const mustDrawFromDeck =
    phase === 'turn' &&
    turnStep === 'draw' &&
    !openingTurnComplete &&
    turnPlayer === 'p1';

  const canDrawDeck = phase === 'turn' && turnStep === 'draw' && !drawnCard && deck.length > 0;
  const canDrawPile =
    phase === 'turn' &&
    turnStep === 'draw' &&
    !drawnCard &&
    discardPile.length > 0 &&
    !mustDrawFromDeck;
  const canDiscardToPile = phase === 'turn' && turnStep === 'resolve' && !!drawnCard;

  const drawFromDeck = () => {
    // Draw the top card of the deck.
    if (!canDrawDeck) return;
    const card = deck[0];
    if (!card) return;
    setDeck((prev) => prev.slice(1));
    setDrawnCard(card);
    setTurnStep('resolve');
  };

  const drawFromPile = () => {
    // Draw the top card of the discard pile.
    if (!canDrawPile) return;
    setDiscardPile((prev) => {
      const card = prev[prev.length - 1];
      if (!card) return prev;
      setDrawnCard(card);
      setTurnStep('resolve');
      return prev.slice(0, -1);
    });
  };

  const discardDrawnToPile = () => {
    // Choose to discard the drawn card instead of swapping.
    if (!canDiscardToPile) return;
    const played = drawnCard;
    setDiscardPile((prev) => [...prev, played]);
    setDrawnCard(null);
    setTurnStep('draw');
    beginPostPlayFlow({ playedBy: turnPlayer, rank: played.rank });
  };

  const swapWithHand = (playerKey, index) => {
    // Choose a slot in your hand to swap with the drawn card.
    // The swapped-out card becomes the played card on the pile.
    if (phase !== 'turn' || turnStep !== 'resolve') return;
    if (!drawnCard) return;
    if (turnPlayer !== playerKey) return;
    const currentHand = hands?.[playerKey] ?? [];
    if (index < 0 || index >= currentHand.length) return;

    const played = hands?.[playerKey]?.[index];
    if (!played) return;

    setHands((prev) => {
      const hand = prev[playerKey] ?? [];
      const oldCard = hand[index];
      if (!oldCard) return prev;
      const nextHand = hand.map((c, idx) => (idx === index ? drawnCard : c));
      setDiscardPile((pilePrev) => [...pilePrev, oldCard]);
      return { ...prev, [playerKey]: nextHand };
    });

    setDrawnCard(null);
    setTurnStep('draw');
    beginPostPlayFlow({ playedBy: turnPlayer, rank: played.rank });
  };

  // Power stage timer (look/joker): fixed 5 seconds.
  useEffect(() => {
    if (phase !== 'look' && phase !== 'joker') return;
    if (!powerType) return;

    const token = (powerWindowTokenRef.current += 1);
    const deadline = Date.now() + POWER_SECONDS * 1000;
    powerDeadlineMsRef.current = deadline;

    const updateSeconds = () => {
      const remainingMs = powerDeadlineMsRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setPowerSecondsLeft(remainingSec);
    };

    updateSeconds();
    const tickId = setInterval(updateSeconds, 200);
    const timeoutId = setTimeout(() => {
      if (powerWindowTokenRef.current !== token) return;
      finishPowerStage();
    }, POWER_SECONDS * 1000);

    return () => {
      clearInterval(tickId);
      clearTimeout(timeoutId);
    };
  }, [phase, powerType]);

  const lookAtCard = (targetPlayerKey, index) => {
    // Queen power: allow exactly one reveal selection.
    if (phase !== 'look') return;
    if (powerType !== 'look') return;
    if (lookRevealed) return; // exactly one look
    const card = hands?.[targetPlayerKey]?.[index];
    if (!card) return;
    setLookRevealed({ playerKey: targetPlayerKey, index });
  };

  const jokerPickCard = (targetPlayerKey, index) => {
    // Jack power: pick two card positions, then swap their objects in `hands`.
    // No reveal happens here; UI stays face-down.
    if (phase !== 'joker') return;
    if (powerType !== 'joker') return;
    const card = hands?.[targetPlayerKey]?.[index];
    if (!card) return;

    if (!jokerPickA) {
      // First selection.
      setJokerPickA({ playerKey: targetPlayerKey, index });
      return;
    }

    if (jokerPickA.playerKey === targetPlayerKey && jokerPickA.index === index) {
      // Tapping the same slot cancels the first selection.
      setJokerPickA(null);
      return;
    }

    // Swap two cards without revealing them.
    const a = jokerPickA;
    setHands((prev) => {
      const handA = prev[a.playerKey] ?? [];
      const handB = prev[targetPlayerKey] ?? [];
      const cardA = handA[a.index];
      const cardB = handB[index];
      if (!cardA || !cardB) return prev;

      const nextHandA = handA.map((c, idx) => (idx === a.index ? cardB : c));
      const nextHandB = handB.map((c, idx) => (idx === index ? cardA : c));
      return {
        ...prev,
        [a.playerKey]: nextHandA,
        [targetPlayerKey]: nextHandB,
      };
    });

    setJokerPickA(null);
    finishPowerStage();
  };

  // Respond stage: strictly advance one player per 3-second window.
  useEffect(() => {
    if (phase !== 'respond') return;

    const total = respondOrder?.length ?? 0;
    if (total === 0) {
      finishRespondStage();
      return;
    }

    // New window.
    const token = (respondWindowTokenRef.current += 1);
    const deadline = Date.now() + RESPOND_SECONDS * 1000;
    respondDeadlineMsRef.current = deadline;

    const updateSeconds = () => {
      const remainingMs = respondDeadlineMsRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setRespondSecondsLeft(remainingSec);
    };

    updateSeconds();
    const tickId = setInterval(updateSeconds, 200);

    const timeoutId = setTimeout(() => {
      // If a newer window started, ignore this one.
      if (respondWindowTokenRef.current !== token) return;

      if (respondIndex >= total - 1) {
        finishRespondStage();
        return;
      }

      setRespondIndex((prev) => prev + 1);
    }, RESPOND_SECONDS * 1000);

    return () => {
      clearInterval(tickId);
      clearTimeout(timeoutId);
    };
  }, [phase, respondIndex, respondOrder]);

  const respondPlayFromHand = (playerKey, index) => {
    // Respond action: play one facedown card.
    // The card is always placed on the pile.
    // If it's not the same rank as `respondRank`, player draws 2 penalty cards.
    if (phase !== 'respond') return;
    if (!respondPlayer) return;
    if (playerKey !== respondPlayer) return;
    if (!respondRank) return;

    const currentHandSnapshot = hands?.[playerKey] ?? [];
    const card = currentHandSnapshot?.[index];
    if (!card) return;

    // Always allow playing a card during respond.
    // If it matches the required rank, it's a clean stack.
    // If it's wrong, the player keeps the penalty by drawing 2 cards.
    const isCorrect = card.rank === respondRank;

    // Remove the played card from the player's hand.
    const nextHandSnapshot = currentHandSnapshot.filter((_, idx) => idx !== index);
    const becameEmpty = nextHandSnapshot.length === 0;
    setHands((prev) => {
      const hand = prev[playerKey] ?? [];
      const current = hand[index];
      if (!current) return prev;
      const nextHand = hand.filter((_, idx) => idx !== index);
      return { ...prev, [playerKey]: nextHand };
    });

    // Put the played card onto the pile.
    setDiscardPile((prev) => [...prev, card]);

    // If a player threw their last card, game ends immediately.
    if (becameEmpty) {
      // Build a hands snapshot as best-effort: we know this player will be empty.
      const snapshot = { ...hands, [playerKey]: [] };
      endGameNow(snapshot);
      return;
    }

    // Restart the respond window from the player who just played.
    // If they played Q/J, interpose that power phase before respond continues.
    restartRespondWindowFrom({ playedBy: playerKey, playedRank: card.rank });

    if (!isCorrect) {
      // Penalty: draw 2 from deck (or less if deck is low).
      const c1 = deck?.[0] ?? null;
      const c2 = deck?.[1] ?? null;
      const penaltyCards = [c1, c2].filter(Boolean);
      if (penaltyCards.length > 0) {
        setDeck((prev) => prev.slice(penaltyCards.length));
        setHands((prev) => {
          const hand = prev[playerKey] ?? [];
          return { ...prev, [playerKey]: [...hand, ...penaltyCards] };
        });
      }
    }
  };

  const respondStatusLabel = useMemo(() => {
    if (phase !== 'respond') return '';
    const n = PLAYER_NUM_BY_KEY[respondPlayer] ?? 1;
    return `P${n} RESPOND`;
  }, [phase, respondPlayer]);

  const respondTimerText = useMemo(() => {
    const clamped = Math.max(0, respondSecondsLeft);
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, [respondSecondsLeft]);

  const powerStatusLabel = useMemo(() => {
    if (phase !== 'look' && phase !== 'joker') return '';
    const n = PLAYER_NUM_BY_KEY[powerPlayer] ?? 1;
    return phase === 'look' ? `P${n} LOOK` : `P${n} JOKER`;
  }, [phase, powerPlayer]);

  const powerTimerText = useMemo(() => {
    const clamped = Math.max(0, powerSecondsLeft);
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, [powerSecondsLeft]);

  const turnStatusLabel = useMemo(() => {
    const n = PLAYER_NUM_BY_KEY[turnPlayer] ?? 1;
    return `P${n} ${turnStep === 'draw' ? 'DRAW' : 'PLAY'}`;
  }, [turnPlayer, turnStep]);

  return {
    powerType,
    powerPlayer,
    powerStatusLabel,
    powerTimerText,
    lookRevealed,
    jokerPickA,
    lookAtCard,
    jokerPickCard,
    discardPile,
    turnPlayer,
    turnStep,
    drawnCard,

    respondPlayer,
    respondRank,
    respondSecondsLeft,
    respondStatusLabel,
    respondTimerText,

    canDrawDeck,
    canDrawPile,
    canDiscardToPile,

    drawFromDeck,
    drawFromPile,
    discardDrawnToPile,
    swapWithHand,

    respondPlayFromHand,

    canDeclareEnd,
    declareEnd,
    endDeclaredBy,
    gameOverResult,

    turnStatusLabel,
  };
}
