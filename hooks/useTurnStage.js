import { useEffect, useMemo, useRef, useState } from 'react';

import { HAND_SIZE } from '../lib/cards';
import { PLAYER_NUM_BY_KEY, TURN_ORDER } from '../lib/seating';

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

  const [endDeclaredBy, setEndDeclaredBy] = useState(null);
  const [gameOverResult, setGameOverResult] = useState(null);

  // Deadline-based respond timer to avoid interval drift / double-advances.
  const respondDeadlineMsRef = useRef(0);
  const respondWindowTokenRef = useRef(0);

  const respondPlayer = respondOrder?.[respondIndex] ?? null;

  const computeRankValue = (rank) => {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 0;
    const n = Number(rank);
    if (Number.isFinite(n)) return n;
    return 0;
  };

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

  const endGameNow = (handsSnapshot) => {
    const result = computeScores(handsSnapshot);
    setGameOverResult(result);
    setPhase('gameOver');
  };

  useEffect(() => {
    if (phase !== 'peekDone') return;
    setTurnPlayer('p1');
    setTurnStep('draw');
    setDrawnCard(null);
    setOpeningTurnComplete(false);
    setEndDeclaredBy(null);
    setGameOverResult(null);
    setPhase('turn');
  }, [phase, setPhase]);

  const endTurn = () => {
    const idx = TURN_ORDER.indexOf(turnPlayer);
    const next = idx >= 0 ? TURN_ORDER[(idx + 1) % TURN_ORDER.length] : 'p1';

    if (!openingTurnComplete && turnPlayer === 'p1') setOpeningTurnComplete(true);

    setTurnPlayer(next);
    setTurnStep('draw');
    setDrawnCard(null);
  };

  const beginRespondStage = ({ playedBy, rank }) => {
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
    setPendingNextTurnPlayer(next);
    setPhase('respond');
  };

  const finishRespondStage = () => {
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
    if (!canDrawDeck) return;
    const card = deck[0];
    if (!card) return;
    setDeck((prev) => prev.slice(1));
    setDrawnCard(card);
    setTurnStep('resolve');
  };

  const drawFromPile = () => {
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
    if (!canDiscardToPile) return;
    const played = drawnCard;
    setDiscardPile((prev) => [...prev, played]);
    setDrawnCard(null);
    setTurnStep('draw');
    beginRespondStage({ playedBy: turnPlayer, rank: played.rank });
  };

  const swapWithHand = (playerKey, index) => {
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
    beginRespondStage({ playedBy: turnPlayer, rank: played.rank });
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
    if (phase !== 'respond') return;
    if (!respondPlayer) return;
    if (playerKey !== respondPlayer) return;
    if (!respondRank) return;

    const card = hands?.[playerKey]?.[index];
    if (!card) return;

    // Always allow playing a card during respond.
    // If it matches the required rank, it's a clean stack.
    // If it's wrong, the player keeps the penalty by drawing 2 cards.
    const isCorrect = card.rank === respondRank;

    // Remove the played card from the player's hand.
    let becameEmpty = false;
    setHands((prev) => {
      const hand = prev[playerKey] ?? [];
      const current = hand[index];
      if (!current) return prev;
      const nextHand = hand.filter((_, idx) => idx !== index);
      becameEmpty = nextHand.length === 0;
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

    if (!isCorrect) {
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

  const turnStatusLabel = useMemo(() => {
    const n = PLAYER_NUM_BY_KEY[turnPlayer] ?? 1;
    return `P${n} ${turnStep === 'draw' ? 'DRAW' : 'PLAY'}`;
  }, [turnPlayer, turnStep]);

  return {
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
