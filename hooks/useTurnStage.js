import { useEffect, useMemo, useState } from 'react';

import { HAND_SIZE } from '../lib/cards';
import { PLAYER_NUM_BY_KEY, TURN_ORDER } from '../lib/seating';

export function useTurnStage({ phase, setPhase, deck, setDeck, hands, setHands }) {
  const [discardPile, setDiscardPile] = useState([]); // top is last element
  const [turnPlayer, setTurnPlayer] = useState('p1');
  const [turnStep, setTurnStep] = useState('draw'); // 'draw' | 'resolve'
  const [drawnCard, setDrawnCard] = useState(null);
  const [openingTurnComplete, setOpeningTurnComplete] = useState(false);

  useEffect(() => {
    if (phase !== 'peekDone') return;
    setTurnPlayer('p1');
    setTurnStep('draw');
    setDrawnCard(null);
    setOpeningTurnComplete(false);
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
    setDiscardPile((prev) => [...prev, drawnCard]);
    setDrawnCard(null);
    endTurn();
  };

  const swapWithHand = (playerKey, index) => {
    if (phase !== 'turn' || turnStep !== 'resolve') return;
    if (!drawnCard) return;
    if (turnPlayer !== playerKey) return;
    if (index < 0 || index >= HAND_SIZE) return;

    setHands((prev) => {
      const hand = prev[playerKey] ?? [];
      const oldCard = hand[index];
      if (!oldCard) return prev;
      const nextHand = hand.map((c, idx) => (idx === index ? drawnCard : c));
      setDiscardPile((pilePrev) => [...pilePrev, oldCard]);
      return { ...prev, [playerKey]: nextHand };
    });

    setDrawnCard(null);
    endTurn();
  };

  const turnStatusLabel = useMemo(() => {
    const n = PLAYER_NUM_BY_KEY[turnPlayer] ?? 1;
    return `P${n} ${turnStep === 'draw' ? 'DRAW' : 'PLAY'}`;
  }, [turnPlayer, turnStep]);

  return {
    discardPile,
    turnPlayer,
    turnStep,
    drawnCard,

    canDrawDeck,
    canDrawPile,
    canDiscardToPile,

    drawFromDeck,
    drawFromPile,
    discardDrawnToPile,
    swapWithHand,

    turnStatusLabel,
  };
}
