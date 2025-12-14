import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { DEAL_ORDER, HAND_SIZE, createDeck, shuffleInPlace } from '../lib/cards';
import { measureInWindowAsync } from '../lib/ui';

export function useDealingStage({ phase, setPhase, cardSpecs, rootRef, deckOriginRef, slotRefs }) {
  // Stage 1: shuffle deck once at game start.
  const [deck, setDeck] = useState(() => shuffleInPlace(createDeck()));
  const [hands, setHands] = useState({ p1: [], p2: [], p3: [], p4: [] });
  const [dealStep, setDealStep] = useState(0);

  // Layout measuring for dealing animation.
  const [layout, setLayout] = useState(null);

  // Animated “flying” card from deck → slot.
  const dealXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dealOpacity = useRef(new Animated.Value(0)).current;
  const [dealingCard, setDealingCard] = useState(null);
  const isAnimatingRef = useRef(false);

  // Capture absolute (window) positions of the deck origin and each slot, then
  // convert them into coordinates relative to the root container.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const tryMeasure = async () => {
      tries += 1;

      const allSlotRefsReady = DEAL_ORDER.every(
        (p) => slotRefs.current[p] && slotRefs.current[p].filter(Boolean).length === HAND_SIZE
      );
      if (!rootRef.current || !deckOriginRef.current || !allSlotRefsReady) {
        if (!cancelled && tries < 60) setTimeout(tryMeasure, 50);
        return;
      }

      try {
        const rootWin = await measureInWindowAsync(rootRef);
        const deckWin = await measureInWindowAsync(deckOriginRef);

        const slots = { p1: [], p2: [], p3: [], p4: [] };
        for (const playerKey of DEAL_ORDER) {
          for (let i = 0; i < HAND_SIZE; i += 1) {
            const slotWin = await measureInWindowAsync({ current: slotRefs.current[playerKey][i] });
            slots[playerKey][i] = {
              x: slotWin.x - rootWin.x,
              y: slotWin.y - rootWin.y,
            };
          }
        }

        if (!cancelled) {
          setLayout({
            deck: { x: deckWin.x - rootWin.x, y: deckWin.y - rootWin.y },
            slots,
          });
        }
      } catch (e) {
        if (!cancelled && tries < 60) setTimeout(tryMeasure, 50);
      }
    };

    tryMeasure();

    return () => {
      cancelled = true;
    };
  }, [deckOriginRef, rootRef, slotRefs]);

  // Start stage 2 shortly after mount, but only after we have layout measured.
  const [startDealingRequested, setStartDealingRequested] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStartDealingRequested(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'init') return;
    if (!startDealingRequested) return;
    if (!layout) return;
    setPhase('dealing');
  }, [layout, phase, setPhase, startDealingRequested]);

  // Stage 2: deal 16 cards (4 to each player) round-robin with a simple
  // “fly from deck to slot” animation.
  useEffect(() => {
    if (phase !== 'dealing') return;
    if (!layout) return;
    if (isAnimatingRef.current) return;

    const totalDeals = HAND_SIZE * DEAL_ORDER.length;
    if (dealStep >= totalDeals) {
      setPhase('dealt');
      return;
    }

    const nextCard = deck[0];
    if (!nextCard) {
      setPhase('dealt');
      return;
    }

    const playerKey = DEAL_ORDER[dealStep % DEAL_ORDER.length];
    const slotIndex = Math.floor(dealStep / DEAL_ORDER.length);
    const target = layout.slots[playerKey][slotIndex];
    const start = layout.deck;
    const spec = cardSpecs[playerKey];

    setDealingCard({
      id: nextCard.id,
      size: spec.size,
      scale: spec.scale,
      orientation: spec.orientation,
      rotationDeg: spec.rotationDeg,
    });

    dealXY.setValue({ x: start.x, y: start.y });
    dealOpacity.setValue(1);
    isAnimatingRef.current = true;

    Animated.timing(dealXY, {
      toValue: { x: target.x, y: target.y },
      duration: 320,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        isAnimatingRef.current = false;
        return;
      }

      dealOpacity.setValue(0);
      setHands((prev) => ({
        ...prev,
        [playerKey]: [...prev[playerKey], nextCard],
      }));
      setDeck((prev) => prev.slice(1));
      setDealStep((prev) => prev + 1);
      isAnimatingRef.current = false;
    });
  }, [cardSpecs, dealOpacity, dealStep, dealXY, deck, layout, phase, setPhase]);

  return {
    deck,
    setDeck,
    hands,
    setHands,
    layout,
    dealingCard,
    dealXY,
    dealOpacity,
  };
}
