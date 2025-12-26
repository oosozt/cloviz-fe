import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const HAND_SIZE = 4;
const DEAL_ORDER = ['p1', 'p2', 'p3', 'p4'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];

// Builds a standard 52-card deck.
function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${rank}${suit}`, rank, suit })));
}

// Fisher–Yates shuffle (returns the same array instance shuffled).
function shuffleInPlace(cards) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function measureInWindowAsync(ref) {
  return new Promise((resolve, reject) => {
    const node = ref?.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      reject(new Error('Ref not measurable'));
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      // Some Android cases can briefly return zeros before layout settles.
      if (width === 0 && height === 0) {
        reject(new Error('Layout not ready'));
        return;
      }

      resolve({ x, y, width, height });
    });
  });
}

// Returns base (unscaled) card width/height by size + orientation.
// We keep this centralized so changing card sizing is one edit.
function getCardDimensions(size, orientation) {
  const bySize = {
    small: orientation === 'vertical' ? { w: 48, h: 64 } : { w: 64, h: 48 },
    medium: orientation === 'vertical' ? { w: 64, h: 96 } : { w: 96, h: 64 },
    large: orientation === 'vertical' ? { w: 80, h: 112 } : { w: 112, h: 80 },
  };
  return bySize[size];
}

// Use a platform-appropriate monospace font for the “pixel / retro” UI.
function getMonospaceFontFamily() {
  return Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  });
}

// A single playing card UI.
// - Tap toggles between back/face (simple state flip, not a 3D animation).
// - `rotationDeg` rotates the whole card for side players.
// - `scale` slightly increases/decreases the rendered size.
export function PlayingCardRN({
  faceDown = true,
  size = 'medium',
  orientation = 'horizontal',
  rotationDeg = 0,
  scale = 1,
  value = 'A',
  suit = '♠',
  style,
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  const isRed = suit === '♥' || suit === '♦';
  // If `faceDown` is true, we still allow tap-to-reveal via `isFlipped`.
  const showFaceDown = faceDown && !isFlipped;

  // Compute card dimensions, then adjust for rotation (90/270 swaps width/height)
  // and finally apply the optional scale factor.
  const dims = useMemo(() => getCardDimensions(size, orientation), [size, orientation]);
  const rotation = ((rotationDeg % 360) + 360) % 360;
  const swapsDimensions = rotation === 90 || rotation === 270;
  const outerDims = swapsDimensions ? { w: dims.h, h: dims.w } : dims;
  const clampedScale = typeof scale === 'number' && Number.isFinite(scale) ? scale : 1;
  const scaledDims = { w: outerDims.w * clampedScale, h: outerDims.h * clampedScale };

  const valueFontSize = size === 'small' ? 10 : size === 'medium' ? 14 : 16;
  const suitFontSize = size === 'small' ? 16 : size === 'medium' ? 24 : 28;

  return (
    <Pressable
      onPress={() => setIsFlipped((prev) => !prev)}
      style={({ pressed }) => {
        const transforms = [];
        if (rotationDeg) transforms.push({ rotateZ: `${rotationDeg}deg` });
        if (pressed) transforms.push({ scale: 1.03 });

        return [
          styles.card,
          { width: scaledDims.w, height: scaledDims.h },
          transforms.length ? { transform: transforms } : null,
          style,
        ];
      }}
    >
      {showFaceDown ? (
        <View style={styles.cardBack}>
          <View style={styles.cardBackInner}>
            <View style={styles.backGrid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View key={i} style={styles.backPixel} />
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.cardFront}>
          <Text
            style={[
              styles.cardValue,
              { color: isRed ? '#dc2626' : '#000000', fontSize: valueFontSize },
            ]}
          >
            {value}
          </Text>
          <Text style={{ color: isRed ? '#dc2626' : '#000000', fontSize: suitFontSize }}>
            {suit}
          </Text>
          <Text
            style={[
              styles.cardValue,
              { color: isRed ? '#dc2626' : '#000000', fontSize: valueFontSize },
            ]}
          >
            {value}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

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

  // Simple looping countdown: 10 → 0, then resets to 10.
  const [remainingSeconds, setRemainingSeconds] = useState(10);

  useEffect(() => {
    // One interval for the lifetime of this screen.
    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 0 ? 10 : prev - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Format as m:ss for display (e.g. 0:09).
  const timerText = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, [remainingSeconds]);

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
          <Text style={styles.labelText}>⏱</Text>
          <Text style={[styles.labelText, styles.timerText]}>{timerText}</Text>
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
          <View style={styles.nameplate}>
            <Text style={styles.labelText}>PLAYER 3</Text>
          </View>
          <View style={styles.row}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => {
              const card = hands.p2[i];
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
                  {card ? (
                    <PlayingCardRN
                      size={cardSpecs.p2.size}
                      scale={cardSpecs.p2.scale}
                      orientation={cardSpecs.p2.orientation}
                      rotationDeg={cardSpecs.p2.rotationDeg}
                      value={card.rank}
                      suit={card.suit}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Player 2 (Left) - cards rotated to face the table */}
        <View style={[styles.leftPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={styles.nameplate}>
            <Text style={styles.labelText}>PLAYER 2</Text>
          </View>
          <View style={styles.col}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => {
              const card = hands.p3[i];
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
                  {card ? (
                    <PlayingCardRN
                      size={cardSpecs.p3.size}
                      scale={cardSpecs.p3.scale}
                      orientation={cardSpecs.p3.orientation}
                      rotationDeg={cardSpecs.p3.rotationDeg}
                      value={card.rank}
                      suit={card.suit}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Player 4 (Right) - cards rotated to face the table */}
        <View style={[styles.rightPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={styles.nameplate}>
            <Text style={styles.labelText}>PLAYER 4</Text>
          </View>
          <View style={styles.col}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => {
              const card = hands.p4[i];
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
                  {card ? (
                    <PlayingCardRN
                      size={cardSpecs.p4.size}
                      scale={cardSpecs.p4.scale}
                      orientation={cardSpecs.p4.orientation}
                      rotationDeg={cardSpecs.p4.rotationDeg}
                      value={card.rank}
                      suit={card.suit}
                    />
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
              <View style={{ position: 'relative', width: 64, height: 96 }}>
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
              </View>
              <Text style={styles.caption}>DECK</Text>
            </View>

            {/* Play Area */}
            <View style={[styles.centerBlock, styles.mt24]}>
              <View style={styles.playSlot}>
                <Text style={styles.playSlotText}>PLAY</Text>
              </View>
              <Text style={styles.caption}>PLAY</Text>
            </View>
          </View>
        </View>

        {/* Player 1 (Bottom / Current User) */}
        <View style={[styles.bottomPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={styles.row}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => {
              const card = hands.p1[i];
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
                  {card ? (
                    <PlayingCardRN
                      size={cardSpecs.p1.size}
                      scale={cardSpecs.p1.scale}
                      orientation={cardSpecs.p1.orientation}
                      rotationDeg={cardSpecs.p1.rotationDeg}
                      value={card.rank}
                      suit={card.suit}
                      faceDown={true}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
          <View style={[styles.nameplate, styles.nameplateYou]}>
            <Text style={[styles.labelText, styles.labelTextYou]}>YOU - PLAYER 1</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: '#d4d4d4',
  },
  root: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },

  labelBox: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 0,
        shadowOffset: { width: 4, height: 4 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  labelText: {
    color: '#000000',
    fontFamily: getMonospaceFontFamily(),
  },
  timerText: {
    marginLeft: 8,
  },
  timer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },

  // The animated dealing card is rendered in an absolute layer at (0,0)
  // and moved using translate transforms.
  dealCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 20,
  },

  // During stage 1 we keep the player UI mounted (so we can measure slot
  // positions), but hide it so only the deck is visible.
  playersHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },

  nameplate: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 0,
        shadowOffset: { width: 4, height: 4 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  nameplateYou: {
    backgroundColor: '#000000',
    marginTop: 8,
  },
  labelTextYou: {
    color: '#ffffff',
  },

  topPlayer: {
    // Positioned around the table edges using absolute layouts.
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  leftPlayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  rightPlayer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  bottomPlayer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },

  centerArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStack: {
    alignItems: 'center',
  },
  centerBlock: {
    alignItems: 'center',
  },
  mt24: {
    marginTop: 24,
  },
  caption: {
    color: '#000000',
    fontFamily: getMonospaceFontFamily(),
    fontSize: 12,
    marginTop: 8,
  },
  playSlot: {
    width: 64,
    height: 96,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#000000',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 0,
        shadowOffset: { width: 4, height: 4 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  playSlotText: {
    color: 'rgba(0,0,0,0.5)',
    fontFamily: getMonospaceFontFamily(),
    fontSize: 12,
  },

  card: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#000000',
    overflow: 'hidden',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 0,
        shadowOffset: { width: 4, height: 4 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  cardPressed: {
    transform: [{ scale: 1.03 }],
  },
  cardBack: {
    flex: 1,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPixel: {
    width: 6,
    height: 6,
    backgroundColor: '#ffffff',
    margin: 1,
  },
  cardFront: {
    flex: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    fontFamily: getMonospaceFontFamily(),
  },

  row: {
    // Shared layout helpers (simple “utility classes”).
    flexDirection: 'row',
    marginTop: 8,
  },
  col: {
    flexDirection: 'column',
    marginTop: 8,
  },
  mr4: {
    marginRight: 4,
  },
  mr8: {
    marginRight: 8,
  },
  mb4: {
    marginBottom: 4,
  },
  mb2: {
    marginBottom: -8,
  },
});