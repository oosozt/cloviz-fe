import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { PlayingCardRN } from './components/PlayingCardRN';
import { PlayerHand } from './components/PlayerHand';
import { CenterArea } from './components/CenterArea';
import { HAND_SIZE, getCardDimensions } from './lib/cards';
import { styles } from './styles/CardTableScreen.styles';

import { useDealingStage } from './hooks/useDealingStage';
import { usePeekStage } from './hooks/usePeekStage';
import { useTurnStage } from './hooks/useTurnStage';

/**
 * Main "table" screen.
 *
 * This file is intentionally a *wiring layer*:
 * - It renders the table layout (4 hands around a center area).
 * - It owns a small `phase` state that acts like a finite-state machine (FSM).
 * - It delegates gameplay logic/timers to hooks:
 *   - `useDealingStage`: shuffles + deals with animation
 *   - `usePeekStage`: controlled peek at start (2 cards/player, 5s window)
 *   - `useTurnStage`: core game loop + respond window + end game + Q/J powers
 *
 * The important detail: UI seat positions are not the same as logical "Player 1..4"
 * order in an abstract sense. We use player keys `p1..p4` everywhere, and
 * `TURN_ORDER` in `lib/seating.js` defines the clockwise order that matches
 * this UI layout.
 */

export default function CardTableScreenRN() {
  // Phase/state machine.
  // init -> dealing -> dealt -> peek -> peekDone -> turn -> (look/joker) -> respond -> turn -> ... -> gameOver
  const [phase, setPhase] = useState('init');

  // Layout refs used ONLY for the dealing animation.
  // We measure the absolute screen positions of the deck and each card slot, then
  // animate a single "flying" card from deck -> target slot.
  const rootRef = useRef(null);
  const deckOriginRef = useRef(null);
  const slotRefs = useRef({ p1: [], p2: [], p3: [], p4: [] });

  // Card render specs per seat.
  // These specs match how the table is drawn:
  // - p1 bottom: larger vertical cards
  // - p3 left / p4 right: rotated to face the center
  // - p2 top: smaller vertical cards
  const cardSpecs = useMemo(
    () => ({
      p1: { size: 'medium', scale: 1, orientation: 'vertical', rotationDeg: 0 },
      p2: { size: 'small', scale: 1.15, orientation: 'vertical', rotationDeg: 0 },
      p3: { size: 'small', scale: 1.15, orientation: 'horizontal', rotationDeg: 90 },
      p4: { size: 'small', scale: 1.15, orientation: 'horizontal', rotationDeg: -90 },
    }),
    []
  );

  // Dealing hook owns the deck + hands state at game start.
  // The rest of the game continues using these same `deck` and `hands` objects.
  const { deck, setDeck, hands, setHands, dealingCard, dealXY, dealOpacity } = useDealingStage({
    phase,
    setPhase,
    cardSpecs,
    rootRef,
    deckOriginRef,
    slotRefs,
  });

  // Peek hook only controls the *peek stage* (timed, 2 looks/player).
  const {
    peekTurnPlayer,
    peekedByPlayer,
    peekedCountFor,
    markPeeked,
    timerText,
    activePeekLabel,
  } = usePeekStage({ phase, setPhase, seconds: 5 });

  // Turn hook controls the core loop once peek is done.
  // This includes:
  // - draw/resolve turn
  // - respond window between turns
  // - end-game declaration
  // - special powers (Q/J)
  const {
    discardPile,
    turnPlayer,
    turnStep,
    drawnCard,

    respondPlayer,
    respondRank,
    respondStatusLabel,
    respondTimerText,

    powerType,
    powerPlayer,
    powerStatusLabel,
    powerTimerText,
    lookRevealed,
    jokerPickA,
    lookAtCard,
    jokerPickCard,

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
    gameOverResult,
    turnStatusLabel,
  } = useTurnStage({ phase, setPhase, deck, setDeck, hands, setHands });

  // Convenience bool for any "special power" stage.
  const isPowerPhase = phase === 'look' || phase === 'joker';

  // The hook also computes scores, but the screen keeps a simple computed
  // snapshot for the overlay.
  const finalScores = useMemo(() => {
    if (phase !== 'gameOver') return null;

    const valueOf = (rank) => {
      if (rank === 'A') return 1;
      if (rank === 'J') return 11;
      if (rank === 'Q') return 12;
      if (rank === 'K') return 0;
      const n = Number(rank);
      return Number.isFinite(n) ? n : 0;
    };

    const scores = {
      p1: (hands.p1 ?? []).reduce((s, c) => s + valueOf(c?.rank), 0),
      p2: (hands.p2 ?? []).reduce((s, c) => s + valueOf(c?.rank), 0),
      p3: (hands.p3 ?? []).reduce((s, c) => s + valueOf(c?.rank), 0),
      p4: (hands.p4 ?? []).reduce((s, c) => s + valueOf(c?.rank), 0),
    };

    const min = Math.min(scores.p1, scores.p2, scores.p3, scores.p4);
    const winners = Object.keys(scores).filter((k) => scores[k] === min);
    return { scores, winners };
  }, [hands.p1, hands.p2, hands.p3, hands.p4, phase]);

  // Render-time slot sizing so the “empty slots” reserve space from the start.
  // Important because hands can grow/shrink during respond penalties.
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

  // Top-right status label shows which phase is active (and who is acting).
  const turnLabel = useMemo(() => {
    if (phase === 'peek') return activePeekLabel;
    if (phase === 'look' || phase === 'joker') return powerStatusLabel;
    if (phase === 'respond') return respondStatusLabel;
    if (phase === 'turn') return turnStatusLabel;
    if (phase === 'gameOver') return 'GAME OVER';
    return '⏱';
  }, [activePeekLabel, phase, powerStatusLabel, respondStatusLabel, turnStatusLabel]);

  // Power stage: tap any player's card slots.
  // - look: reveal exactly one card for the remainder of the 5s window
  // - joker: pick two cards to swap (no reveal)
  const powerPress = (playerKey, index) => {
    if (phase === 'look') return lookAtCard(playerKey, index);
    if (phase === 'joker') return jokerPickCard(playerKey, index);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View ref={rootRef} collapsable={false} style={styles.root}>
        {phase === 'gameOver' && finalScores ? (
          <View style={styles.gameOverOverlay} pointerEvents="none">
            <Text style={styles.gameOverTitle}>FINAL SCORES</Text>
            <Text style={styles.gameOverLine}>P1: {finalScores.scores?.p1 ?? 0}</Text>
            <Text style={styles.gameOverLine}>P2: {finalScores.scores?.p3 ?? 0}</Text>
            <Text style={styles.gameOverLine}>P3: {finalScores.scores?.p2 ?? 0}</Text>
            <Text style={styles.gameOverLine}>P4: {finalScores.scores?.p4 ?? 0}</Text>
            <Text style={styles.gameOverLine}>
              WINNER:{' '}
              {(finalScores.winners ?? [])
                .map((k) => (k === 'p1' ? 'P1' : k === 'p3' ? 'P2' : k === 'p2' ? 'P3' : 'P4'))
                .join(' / ') || '-'}
            </Text>
          </View>
        ) : null}

        {/*
          Timer - Top Right (absolute overlay)
          The label + timer text changes by phase:
          - peek: uses peek countdown
          - respond: uses respond countdown
          - look/joker: uses power countdown
        */}
        <View style={[styles.labelBox, styles.timer]}>
          <Text style={styles.labelText}>{turnLabel}</Text>
          <Text style={[styles.labelText, styles.timerText]}>
            {phase === 'peek'
              ? timerText
              : phase === 'respond'
                ? respondTimerText
                : phase === 'look' || phase === 'joker'
                  ? powerTimerText
                  : ''}
          </Text>
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

        {/*
          Player 3 (Top)
          UI seat mapping:
          - This is `p2` (see lib/seating.js). The label says "PLAYER 3".
        */}
        <View style={[styles.topPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View
            style={[
              styles.nameplate,
              phase === 'peek' && peekTurnPlayer === 'p2' ? styles.nameplateActive : null,
              phase === 'respond' && respondPlayer === 'p2' ? styles.nameplateActive : null,
              isPowerPhase && powerPlayer === 'p2' ? styles.nameplateActive : null,
            ]}
          >
            <Text
              style={[
                styles.labelText,
                phase === 'peek' && peekTurnPlayer === 'p2' ? styles.labelTextActive : null,
                phase === 'respond' && respondPlayer === 'p2' ? styles.labelTextActive : null,
                isPowerPhase && powerPlayer === 'p2' ? styles.labelTextActive : null,
              ]}
            >
              PLAYER 3
            </Text>
          </View>
          <PlayerHand
            playerKey="p2"
            hand={hands.p2}
            handSize={HAND_SIZE}
            cardSpec={cardSpecs.p2}
            getSlotBoxStyle={getSlotBoxStyle}
            slotRefs={slotRefs}
            styles={styles}
            layout="row"
            gapStyle={styles.mr4}
            // Peek phase: active player can flip up to 2 cards (face-down otherwise).
            canPeekAtIndex={(i) =>
              phase === 'peek' &&
              peekTurnPlayer === 'p2' &&
              (peekedByPlayer.p2[i] || peekedCountFor('p2') < 2)
            }
            onPeekAtIndex={(i) =>
              markPeeked('p2', i)
            }
            // Respond phase: active responder may play *any* card (cards are face-down).
            canRespondAtIndex={(i) =>
              phase === 'respond' &&
              respondPlayer === 'p2' &&
              !!respondRank &&
              !!hands.p2?.[i]
            }
            onRespondAtIndex={(i) => respondPlayFromHand('p2', i)}
            // Power phases (Q/J): allow tapping any existing card.
            canPowerAtIndex={(i) =>
              isPowerPhase &&
              !!hands.p2?.[i] &&
              (phase === 'look' ? !lookRevealed : true)
            }
            onPowerAtIndex={(i) => powerPress('p2', i)}
            // Only the selected looked-at card is revealed during the look window.
            isFaceUpAtIndex={(i) =>
              phase === 'look' &&
              lookRevealed?.playerKey === 'p2' &&
              lookRevealed?.index === i
            }
            // Turn resolve: active player can swap the drawn card with a slot in their hand.
            canSwap={phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p2' && !!drawnCard}
            onSwapAtIndex={(i) => swapWithHand('p2', i)}
            forceFaceUp={phase === 'gameOver'}
          />
        </View>

        {/*
          Player 2 (Left)
          UI seat mapping:
          - This is `p3` (label says "PLAYER 2").
          - Cards are rotated to face the table.
        */}
        <View style={[styles.leftPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View
            style={[
              styles.nameplate,
              phase === 'peek' && peekTurnPlayer === 'p3' ? styles.nameplateActive : null,
              phase === 'respond' && respondPlayer === 'p3' ? styles.nameplateActive : null,
              isPowerPhase && powerPlayer === 'p3' ? styles.nameplateActive : null,
            ]}
          >
            <Text
              style={[
                styles.labelText,
                phase === 'peek' && peekTurnPlayer === 'p3' ? styles.labelTextActive : null,
                phase === 'respond' && respondPlayer === 'p3' ? styles.labelTextActive : null,
                isPowerPhase && powerPlayer === 'p3' ? styles.labelTextActive : null,
              ]}
            >
              PLAYER 2
            </Text>
          </View>
          <PlayerHand
            playerKey="p3"
            hand={hands.p3}
            handSize={HAND_SIZE}
            cardSpec={cardSpecs.p3}
            getSlotBoxStyle={getSlotBoxStyle}
            slotRefs={slotRefs}
            styles={styles}
            layout="col"
            gapStyle={styles.mb2}
            // See top player for interaction comments; the same rules apply per player.
            canPeekAtIndex={(i) =>
              phase === 'peek' &&
              peekTurnPlayer === 'p3' &&
              (peekedByPlayer.p3[i] || peekedCountFor('p3') < 2)
            }
            onPeekAtIndex={(i) =>
              markPeeked('p3', i)
            }
            canRespondAtIndex={(i) =>
              phase === 'respond' &&
              respondPlayer === 'p3' &&
              !!respondRank &&
              !!hands.p3?.[i]
            }
            onRespondAtIndex={(i) => respondPlayFromHand('p3', i)}
            canPowerAtIndex={(i) =>
              isPowerPhase &&
              !!hands.p3?.[i] &&
              (phase === 'look' ? !lookRevealed : true)
            }
            onPowerAtIndex={(i) => powerPress('p3', i)}
            isFaceUpAtIndex={(i) =>
              phase === 'look' &&
              lookRevealed?.playerKey === 'p3' &&
              lookRevealed?.index === i
            }
            canSwap={phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p3' && !!drawnCard}
            onSwapAtIndex={(i) => swapWithHand('p3', i)}
            forceFaceUp={phase === 'gameOver'}
          />
        </View>

        {/*
          Player 4 (Right)
          UI seat mapping:
          - This is `p4` (label says "PLAYER 4").
          - Cards are rotated to face the table.
        */}
        <View style={[styles.rightPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View
            style={[
              styles.nameplate,
              phase === 'peek' && peekTurnPlayer === 'p4' ? styles.nameplateActive : null,
              phase === 'respond' && respondPlayer === 'p4' ? styles.nameplateActive : null,
              isPowerPhase && powerPlayer === 'p4' ? styles.nameplateActive : null,
            ]}
          >
            <Text
              style={[
                styles.labelText,
                phase === 'peek' && peekTurnPlayer === 'p4' ? styles.labelTextActive : null,
                phase === 'respond' && respondPlayer === 'p4' ? styles.labelTextActive : null,
                isPowerPhase && powerPlayer === 'p4' ? styles.labelTextActive : null,
              ]}
            >
              PLAYER 4
            </Text>
          </View>
          <PlayerHand
            playerKey="p4"
            hand={hands.p4}
            handSize={HAND_SIZE}
            cardSpec={cardSpecs.p4}
            getSlotBoxStyle={getSlotBoxStyle}
            slotRefs={slotRefs}
            styles={styles}
            layout="col"
            gapStyle={styles.mb2}
            canPeekAtIndex={(i) =>
              phase === 'peek' &&
              peekTurnPlayer === 'p4' &&
              (peekedByPlayer.p4[i] || peekedCountFor('p4') < 2)
            }
            onPeekAtIndex={(i) =>
              markPeeked('p4', i)
            }
            canRespondAtIndex={(i) =>
              phase === 'respond' &&
              respondPlayer === 'p4' &&
              !!respondRank &&
              !!hands.p4?.[i]
            }
            onRespondAtIndex={(i) => respondPlayFromHand('p4', i)}
            canPowerAtIndex={(i) =>
              isPowerPhase &&
              !!hands.p4?.[i] &&
              (phase === 'look' ? !lookRevealed : true)
            }
            onPowerAtIndex={(i) => powerPress('p4', i)}
            isFaceUpAtIndex={(i) =>
              phase === 'look' &&
              lookRevealed?.playerKey === 'p4' &&
              lookRevealed?.index === i
            }
            canSwap={phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p4' && !!drawnCard}
            onSwapAtIndex={(i) => swapWithHand('p4', i)}
            forceFaceUp={phase === 'gameOver'}
          />
        </View>

        {/*
          CenterArea contains deck + drawn card + discard pile.
          - Deck tap: draw from deck
          - Pile tap: during turn, either draw the pile (turnStep=draw) or discard drawn card (turnStep=resolve)
          - END button: only enabled at the start of respond window (player who just played)
        */}
        <CenterArea
          styles={styles}
          deckOriginRef={deckOriginRef}
          canDrawDeck={canDrawDeck}
          onDrawDeck={drawFromDeck}
          drawnCard={drawnCard}
          canDrawPile={phase === 'turn' ? canDrawPile || canDiscardToPile : false}
          discardPileTop={discardPile.length > 0 ? discardPile[discardPile.length - 1] : null}
          onPilePress={() => {
            if (phase !== 'turn') return;
            if (turnStep === 'draw') drawFromPile();
            else discardDrawnToPile();
          }}
          canDeclareEnd={canDeclareEnd}
          onDeclareEnd={declareEnd}
        />

        {/*
          Player 1 (Bottom / Current User)
          UI seat mapping:
          - This is `p1` (label says "YOU - PLAYER 1").
        */}
        <View style={[styles.bottomPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <PlayerHand
            playerKey="p1"
            hand={hands.p1}
            handSize={HAND_SIZE}
            cardSpec={cardSpecs.p1}
            getSlotBoxStyle={getSlotBoxStyle}
            slotRefs={slotRefs}
            styles={styles}
            layout="row"
            gapStyle={styles.mr8}
            canPeekAtIndex={(i) =>
              phase === 'peek' &&
              peekTurnPlayer === 'p1' &&
              (peekedByPlayer.p1[i] || peekedCountFor('p1') < 2)
            }
            onPeekAtIndex={(i) =>
              markPeeked('p1', i)
            }
            canRespondAtIndex={(i) =>
              phase === 'respond' &&
              respondPlayer === 'p1' &&
              !!respondRank &&
              !!hands.p1?.[i]
            }
            onRespondAtIndex={(i) => respondPlayFromHand('p1', i)}
            canPowerAtIndex={(i) =>
              isPowerPhase &&
              !!hands.p1?.[i] &&
              (phase === 'look' ? !lookRevealed : true)
            }
            onPowerAtIndex={(i) => powerPress('p1', i)}
            isFaceUpAtIndex={(i) =>
              phase === 'look' &&
              lookRevealed?.playerKey === 'p1' &&
              lookRevealed?.index === i
            }
            canSwap={phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p1' && !!drawnCard}
            onSwapAtIndex={(i) => swapWithHand('p1', i)}
            forceFaceUp={phase === 'gameOver'}
          />
          <View
            style={[
              styles.nameplate,
              styles.nameplateYou,
              phase === 'peek' && peekTurnPlayer === 'p1' ? styles.nameplateActive : null,
              phase === 'respond' && respondPlayer === 'p1' ? styles.nameplateActive : null,
              phase === 'turn' && turnPlayer === 'p1' ? styles.nameplateActive : null,
              isPowerPhase && powerPlayer === 'p1' ? styles.nameplateActive : null,
            ]}
          >
            <Text
              style={[
                styles.labelText,
                styles.labelTextYou,
                phase === 'peek' && peekTurnPlayer === 'p1' ? styles.labelTextActive : null,
                phase === 'respond' && respondPlayer === 'p1' ? styles.labelTextActive : null,
                phase === 'turn' && turnPlayer === 'p1' ? styles.labelTextActive : null,
                isPowerPhase && powerPlayer === 'p1' ? styles.labelTextActive : null,
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

