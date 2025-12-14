import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PlayingCardRN } from './components/PlayingCardRN';
import { DEAL_ORDER, HAND_SIZE, createDeck, getCardDimensions, shuffleInPlace } from './lib/cards';
import { measureInWindowAsync } from './lib/ui';
import { styles } from './styles/CardTableScreen.styles';

export default function CardTableScreenRN() {
  // Game phases for the first two stages:
  // 1) init: deck is shuffled, no player cards shown
  // 2) dealing: one-by-one deal animation fills each player's 4-card hand
  const [phase, setPhase] = useState('init');

  // Stage 1: shuffle deck once at game start.
  const [deck, setDeck] = useState(() => shuffleInPlace(createDeck()));
  const [hands, setHands] = useState({ p1: [], p2: [], p3: [], p4: [] });
  const [dealStep, setDealStep] = useState(0);

  // Layout measuring for dealing animation.
  const rootRef = useRef(null);
  const deckOriginRef = useRef(null);
  const slotRefs = useRef({ p1: [], p2: [], p3: [], p4: [] });
  const [layout, setLayout] = useState(null);

  // Animated “flying” card from deck → slot.
  const dealXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dealOpacity = useRef(new Animated.Value(0)).current;
  const [dealingCard, setDealingCard] = useState(null);
  const isAnimatingRef = useRef(false);

  // Card render specs per player (sizes/orientation match current table UI).
  const cardSpecs = useMemo(
    () => ({
      p1: { size: 'medium', scale: 1, orientation: 'vertical', rotationDeg: 0 },
      p2: { size: 'small', scale: 1.15, orientation: 'vertical', rotationDeg: 0 },
      p3: { size: 'small', scale: 1.15, orientation: 'horizontal', rotationDeg: 90 },
      p4: { size: 'small', scale: 1.15, orientation: 'horizontal', rotationDeg: -90 },
    }),
    []
  );

  // Render-time slot sizing so the “empty slots” reserve space from the start.
  const getSlotBoxStyle = (playerKey) => {
    const spec = cardSpecs[playerKey];
    const dims = getCardDimensions(spec.size, spec.orientation);
    const rot = ((spec.rotationDeg % 360) + 360) % 360;
    const swaps = rot === 90 || rot === 270;
    const outerDims = swaps ? { w: dims.h, h: dims.w } : dims;
    const w = outerDims.w * spec.scale;
    const h = outerDims.h * spec.scale;
    return { width: w, height: h };
  };

  // Capture absolute (window) positions of the deck origin and each slot, then
  // convert them into coordinates relative to the root container.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const tryMeasure = async () => {
      tries += 1;

      // Ensure refs exist before measuring.
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
  }, []);

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
  }, [layout, phase, startDealingRequested]);

  // Stage 3 (new): peek/lookup stage.
  // Each player, in clockwise order (p1 → p2 → p3 → p4), has 5 seconds
  // to look at (flip) exactly 2 of their 4 cards.
  // NOTE: The current table layout maps keys to seats like:
  // - p1: bottom (Player 1)
  // - p3: left   (Player 2)
  // - p2: top    (Player 3)
  // - p4: right  (Player 4)
  const PEEK_SECONDS = 5;
  const PEEK_TURN_ORDER = ['p1', 'p3', 'p2', 'p4'];
  const PLAYER_NUM_BY_KEY = { p1: 1, p2: 3, p3: 2, p4: 4 };
  const [peekTurnPlayer, setPeekTurnPlayer] = useState('p1');
  const [peekSecondsLeft, setPeekSecondsLeft] = useState(PEEK_SECONDS);
  const [peekedByPlayer, setPeekedByPlayer] = useState(() => ({
    p1: Array(HAND_SIZE).fill(false),
    p2: Array(HAND_SIZE).fill(false),
    p3: Array(HAND_SIZE).fill(false),
    p4: Array(HAND_SIZE).fill(false),
  }));

  const peekedCountFor = (playerKey) => peekedByPlayer[playerKey].filter(Boolean).length;

  const advancePeekTurn = () => {
    setPeekTurnPlayer((prev) => {
      const idx = PEEK_TURN_ORDER.indexOf(prev);
      if (idx < 0) return 'p1';
      if (idx === PEEK_TURN_ORDER.length - 1) {
        setPhase('peekDone');
        return prev;
      }
      return PEEK_TURN_ORDER[idx + 1];
    });
  };

  useEffect(() => {
    if (phase !== 'peek') return;

    setPeekSecondsLeft(PEEK_SECONDS);
    const intervalId = setInterval(() => {
      setPeekSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [phase, peekTurnPlayer]);

  useEffect(() => {
    if (phase !== 'peek') return;
    if (peekSecondsLeft > 0) return;
    advancePeekTurn();
  }, [peekSecondsLeft, phase]);

  useEffect(() => {
    if (phase !== 'peek') return;
    // When the peek stage starts, always begin with Player 1.
    setPeekTurnPlayer('p1');
    setPeekedByPlayer({
      p1: Array(HAND_SIZE).fill(false),
      p2: Array(HAND_SIZE).fill(false),
      p3: Array(HAND_SIZE).fill(false),
      p4: Array(HAND_SIZE).fill(false),
    });
  }, [phase]);

  // Transition into the peek stage after dealing completes.
  useEffect(() => {
    if (phase !== 'dealt') return;
    setPhase('peek');
  }, [phase]);

  // Stage 4 (new): start-of-game turns (draw → swap/discard).
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
  }, [phase]);

  const turnLabel = useMemo(() => {
    if (phase === 'peek') return activePeekLabel;
    if (phase === 'turn') {
      const n = PLAYER_NUM_BY_KEY[turnPlayer] ?? 1;
      return `P${n} ${turnStep === 'draw' ? 'DRAW' : 'PLAY'}`;
    }
    return '⏱';
  }, [activePeekLabel, phase, PLAYER_NUM_BY_KEY, turnPlayer, turnStep]);

  const endTurn = () => {
    const order = PEEK_TURN_ORDER;
    const idx = order.indexOf(turnPlayer);
    const next = idx >= 0 ? order[(idx + 1) % order.length] : 'p1';

    if (!openingTurnComplete && turnPlayer === 'p1') setOpeningTurnComplete(true);

    setTurnPlayer(next);
    setTurnStep('draw');
    setDrawnCard(null);
  };

  const mustDrawFromDeck = phase === 'turn' && turnStep === 'draw' && !openingTurnComplete && turnPlayer === 'p1';
  const canDrawDeck = phase === 'turn' && turnStep === 'draw' && !drawnCard && deck.length > 0;
  const canDrawPile =
    phase === 'turn' &&
    turnStep === 'draw' &&
    !drawnCard &&
    discardPile.length > 0 &&
    !mustDrawFromDeck;

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
    if (phase !== 'turn' || turnStep !== 'resolve') return;
    if (!drawnCard) return;
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

  const timerText = useMemo(() => {
    const clamped = Math.max(0, peekSecondsLeft);
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, [peekSecondsLeft]);

  const activePeekLabel = useMemo(() => {
    const n = PLAYER_NUM_BY_KEY[peekTurnPlayer] ?? 1;
    return `P${n} LOOK ${peekedCountFor(peekTurnPlayer)}/2`;
  }, [PLAYER_NUM_BY_KEY, peekTurnPlayer, peekedByPlayer]);

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
  }, [cardSpecs, dealOpacity, dealStep, dealXY, deck, layout, phase]);

  return (
    <SafeAreaView style={styles.screen}>
      <View ref={rootRef} collapsable={false} style={styles.root}>
        {/* Timer - Top Right (absolute overlay) */}
        <View style={[styles.labelBox, styles.timer]}>
          <Text style={styles.labelText}>{turnLabel}</Text>
          <Text style={[styles.labelText, styles.timerText]}>{phase === 'peek' ? timerText : ''}</Text>
        </View>

        {/* Animated dealing card (shown only during stage 2) */}
        {phase === 'dealing' && dealingCard ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.dealCard,
              {
                opacity: dealOpacity,
                transform: dealXY.getTranslateTransform(),
              },
            ]}
          >
            <PlayingCardRN
              size={dealingCard.size}
              scale={dealingCard.scale}
              orientation={dealingCard.orientation}
              rotationDeg={dealingCard.rotationDeg}
              faceDown={true}
            />
          </Animated.View>
        ) : null}

        {/* Player 3 (Top) */}
        <View style={[styles.topPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={[styles.nameplate, phase === 'peek' && peekTurnPlayer === 'p2' ? styles.nameplateActive : null]}>
            <Text style={[styles.labelText, phase === 'peek' && peekTurnPlayer === 'p2' ? styles.labelTextActive : null]}>PLAYER 3</Text>
          </View>
          <View style={styles.row}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => {
              const card = hands.p2[i];
              const canPeekHere =
                phase === 'peek' &&
                peekTurnPlayer === 'p2' &&
                (peekedByPlayer.p2[i] || peekedCountFor('p2') < 2);
              const canSwapHere = phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p2' && !!drawnCard;
              const pressEnabled = canPeekHere || canSwapHere;
              return (
                <View
                  key={`p2-slot-${i}`}
                  ref={(r) => {
                    slotRefs.current.p2[i] = r;
                  }}
                  collapsable={false}
                  style={[
                    getSlotBoxStyle('p2'),
                    i < HAND_SIZE - 1 ? styles.mr4 : undefined,
                  ]}
                >
                  {canSwapHere ? <View pointerEvents="none" style={styles.actionHaloFill} /> : null}
                  {card ? (
                    <PlayingCardRN
                      size={cardSpecs.p2.size}
                      scale={cardSpecs.p2.scale}
                      orientation={cardSpecs.p2.orientation}
                      rotationDeg={cardSpecs.p2.rotationDeg}
                      value={card.rank}
                      suit={card.suit}
                      faceDown={true}
                      pressEnabled={pressEnabled}
                      canFlip={canPeekHere}
                      onPress={() => {
                        if (canPeekHere) {
                          setPeekedByPlayer((prev) => {
                            if (prev.p2[i]) return prev;
                            return { ...prev, p2: prev.p2.map((v, idx) => (idx === i ? true : v)) };
                          });
                          return;
                        }

                        if (canSwapHere) swapWithHand('p2', i);
                      }}
                    />
                  ) : null}

                  {card && canSwapHere ? (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                      <PlayingCardRN
                        size={cardSpecs.p2.size}
                        scale={cardSpecs.p2.scale}
                        orientation={cardSpecs.p2.orientation}
                        rotationDeg={cardSpecs.p2.rotationDeg}
                        value={card.rank}
                        suit={card.suit}
                        faceDown={true}
                        pressEnabled={true}
                        canFlip={false}
                        onPress={() => swapWithHand('p2', i)}
                        style={{ opacity: 0 }}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Player 2 (Left) - cards rotated to face the table */}
        <View style={[styles.leftPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={[styles.nameplate, phase === 'peek' && peekTurnPlayer === 'p3' ? styles.nameplateActive : null]}>
            <Text style={[styles.labelText, phase === 'peek' && peekTurnPlayer === 'p3' ? styles.labelTextActive : null]}>PLAYER 2</Text>
          </View>
          <View style={styles.col}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => {
              const card = hands.p3[i];
              const canPeekHere =
                phase === 'peek' &&
                peekTurnPlayer === 'p3' &&
                (peekedByPlayer.p3[i] || peekedCountFor('p3') < 2);
              const canSwapHere = phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p3' && !!drawnCard;
              const pressEnabled = canPeekHere || canSwapHere;
              return (
                <View
                  key={`p3-slot-${i}`}
                  ref={(r) => {
                    slotRefs.current.p3[i] = r;
                  }}
                  collapsable={false}
                  style={[
                    getSlotBoxStyle('p3'),
                    i < HAND_SIZE - 1 ? styles.mb2 : undefined,
                  ]}
                >
                  {canSwapHere ? <View pointerEvents="none" style={styles.actionHaloFill} /> : null}
                  {card ? (
                    <PlayingCardRN
                      size={cardSpecs.p3.size}
                      scale={cardSpecs.p3.scale}
                      orientation={cardSpecs.p3.orientation}
                      rotationDeg={cardSpecs.p3.rotationDeg}
                      value={card.rank}
                      suit={card.suit}
                      faceDown={true}
                      pressEnabled={pressEnabled}
                      canFlip={canPeekHere}
                      onPress={() => {
                        if (canPeekHere) {
                          setPeekedByPlayer((prev) => {
                            if (prev.p3[i]) return prev;
                            return { ...prev, p3: prev.p3.map((v, idx) => (idx === i ? true : v)) };
                          });
                          return;
                        }

                        if (canSwapHere) swapWithHand('p3', i);
                      }}
                    />
                  ) : null}

                  {card && canSwapHere ? (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                      <PlayingCardRN
                        size={cardSpecs.p3.size}
                        scale={cardSpecs.p3.scale}
                        orientation={cardSpecs.p3.orientation}
                        rotationDeg={cardSpecs.p3.rotationDeg}
                        value={card.rank}
                        suit={card.suit}
                        faceDown={true}
                        pressEnabled={true}
                        canFlip={false}
                        onPress={() => swapWithHand('p3', i)}
                        style={{ opacity: 0 }}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Player 4 (Right) - cards rotated to face the table */}
        <View style={[styles.rightPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={[styles.nameplate, phase === 'peek' && peekTurnPlayer === 'p4' ? styles.nameplateActive : null]}>
            <Text style={[styles.labelText, phase === 'peek' && peekTurnPlayer === 'p4' ? styles.labelTextActive : null]}>PLAYER 4</Text>
          </View>
          <View style={styles.col}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => {
              const card = hands.p4[i];
              const canPeekHere =
                phase === 'peek' &&
                peekTurnPlayer === 'p4' &&
                (peekedByPlayer.p4[i] || peekedCountFor('p4') < 2);
              const canSwapHere = phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p4' && !!drawnCard;
              const pressEnabled = canPeekHere || canSwapHere;
              return (
                <View
                  key={`p4-slot-${i}`}
                  ref={(r) => {
                    slotRefs.current.p4[i] = r;
                  }}
                  collapsable={false}
                  style={[
                    getSlotBoxStyle('p4'),
                    i < HAND_SIZE - 1 ? styles.mb2 : undefined,
                  ]}
                >
                  {canSwapHere ? <View pointerEvents="none" style={styles.actionHaloFill} /> : null}
                  {card ? (
                    <PlayingCardRN
                      size={cardSpecs.p4.size}
                      scale={cardSpecs.p4.scale}
                      orientation={cardSpecs.p4.orientation}
                      rotationDeg={cardSpecs.p4.rotationDeg}
                      value={card.rank}
                      suit={card.suit}
                      faceDown={true}
                      pressEnabled={pressEnabled}
                      canFlip={canPeekHere}
                      onPress={() => {
                        if (canPeekHere) {
                          setPeekedByPlayer((prev) => {
                            if (prev.p4[i]) return prev;
                            return { ...prev, p4: prev.p4.map((v, idx) => (idx === i ? true : v)) };
                          });
                          return;
                        }

                        if (canSwapHere) swapWithHand('p4', i);
                      }}
                    />
                  ) : null}

                  {card && canSwapHere ? (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                      <PlayingCardRN
                        size={cardSpecs.p4.size}
                        scale={cardSpecs.p4.scale}
                        orientation={cardSpecs.p4.orientation}
                        rotationDeg={cardSpecs.p4.rotationDeg}
                        value={card.rank}
                        suit={card.suit}
                        faceDown={true}
                        pressEnabled={true}
                        canFlip={false}
                        onPress={() => swapWithHand('p4', i)}
                        style={{ opacity: 0 }}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Center play area: deck + play slot */}
        <View style={styles.centerArea}>
          <View style={styles.centerStack}>
            {/* Deck */}
            <View style={styles.centerBlock}>
              <Pressable
                onPress={drawFromDeck}
                style={[
                  { position: 'relative', width: 64, height: 96, padding: 4, borderRadius: 2 },
                  canDrawDeck ? styles.actionHalo : null,
                ]}
              >
                {/* Deck origin (measured) is the top card position */}
                <View ref={deckOriginRef} collapsable={false}>
                  <PlayingCardRN size="small" orientation="vertical" />
                </View>
                <PlayingCardRN
                  size="small"
                  orientation="vertical"
                  style={{ position: 'absolute', top: 4, left: 4 }}
                />
                <PlayingCardRN
                  size="small"
                  orientation="vertical"
                  style={{ position: 'absolute', top: 8, left: 8 }}
                />
              </Pressable>
              <Text style={styles.caption}>DECK</Text>
            </View>

            {/* Drawn card (shown after drawing) */}
            <View style={[styles.centerBlock, styles.mt24]}>
              <View style={{ alignItems: 'center' }}>
                {drawnCard ? (
                  <PlayingCardRN
                    size="small"
                    orientation="vertical"
                    faceDown={false}
                    value={drawnCard.rank}
                    suit={drawnCard.suit}
                  />
                ) : (
                  <View style={styles.playSlot}>
                    <Text style={styles.playSlotText}>DRAWN</Text>
                  </View>
                )}
                <Text style={styles.caption}>DRAWN</Text>
              </View>
            </View>

            {/* Discard pile (middle) */}
            <View style={[styles.centerBlock, styles.mt24]}>
              <Pressable
                onPress={() => {
                  if (phase === 'turn' && turnStep === 'draw') drawFromPile();
                  else discardDrawnToPile();
                }}
                style={[
                  styles.playSlot,
                  (canDrawPile || (phase === 'turn' && turnStep === 'resolve' && !!drawnCard))
                    ? styles.actionHalo
                    : null,
                ]}
              >
                {discardPile.length > 0 ? (
                  <PlayingCardRN
                    size="small"
                    orientation="vertical"
                    faceDown={false}
                    value={discardPile[discardPile.length - 1].rank}
                    suit={discardPile[discardPile.length - 1].suit}
                  />
                ) : (
                  <Text style={styles.playSlotText}>PILE</Text>
                )}
              </Pressable>
              <Text style={styles.caption}>PILE</Text>
            </View>
          </View>
        </View>

        {/* Player 1 (Bottom / Current User) */}
        <View style={[styles.bottomPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={styles.row}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => {
              const card = hands.p1[i];
              const canPeekHere =
                phase === 'peek' &&
                peekTurnPlayer === 'p1' &&
                (peekedByPlayer.p1[i] || peekedCountFor('p1') < 2);
              const canSwapHere = phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p1' && !!drawnCard;
              const pressEnabled = canPeekHere || canSwapHere;
              return (
                <View
                  key={`p1-slot-${i}`}
                  ref={(r) => {
                    slotRefs.current.p1[i] = r;
                  }}
                  collapsable={false}
                  style={[
                    getSlotBoxStyle('p1'),
                    i < HAND_SIZE - 1 ? styles.mr8 : undefined,
                  ]}
                >
                  {canSwapHere ? <View pointerEvents="none" style={styles.actionHaloFill} /> : null}
                  {card ? (
                    <PlayingCardRN
                      size={cardSpecs.p1.size}
                      scale={cardSpecs.p1.scale}
                      orientation={cardSpecs.p1.orientation}
                      rotationDeg={cardSpecs.p1.rotationDeg}
                      value={card.rank}
                      suit={card.suit}
                      faceDown={true}
                      pressEnabled={pressEnabled}
                      canFlip={canPeekHere}
                      onPress={() => {
                        if (canPeekHere) {
                          setPeekedByPlayer((prev) => {
                            if (prev.p1[i]) return prev;
                            return { ...prev, p1: prev.p1.map((v, idx) => (idx === i ? true : v)) };
                          });
                          return;
                        }

                        if (canSwapHere) swapWithHand('p1', i);
                      }}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
          <View
            style={[
              styles.nameplate,
              styles.nameplateYou,
              phase === 'peek' && peekTurnPlayer === 'p1' ? styles.nameplateActive : null,
              phase === 'turn' && turnPlayer === 'p1' ? styles.nameplateActive : null,
            ]}
          >
            <Text
              style={[
                styles.labelText,
                styles.labelTextYou,
                phase === 'peek' && peekTurnPlayer === 'p1' ? styles.labelTextActive : null,
                phase === 'turn' && turnPlayer === 'p1' ? styles.labelTextActive : null,
              ]}
            >
              YOU - PLAYER 1
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

