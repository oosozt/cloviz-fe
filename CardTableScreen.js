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

export default function CardTableScreenRN() {
  const [phase, setPhase] = useState('init');

  const rootRef = useRef(null);
  const deckOriginRef = useRef(null);
  const slotRefs = useRef({ p1: [], p2: [], p3: [], p4: [] });

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

  const { deck, setDeck, hands, setHands, dealingCard, dealXY, dealOpacity } = useDealingStage({
    phase,
    setPhase,
    cardSpecs,
    rootRef,
    deckOriginRef,
    slotRefs,
  });

  const {
    peekTurnPlayer,
    peekedByPlayer,
    peekedCountFor,
    markPeeked,
    timerText,
    activePeekLabel,
  } = usePeekStage({ phase, setPhase, seconds: 5 });

  const {
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
  } = useTurnStage({ phase, setPhase, deck, setDeck, hands, setHands });

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

  const turnLabel = useMemo(() => {
    if (phase === 'peek') return activePeekLabel;
    if (phase === 'turn') return turnStatusLabel;
    return '⏱';
  }, [activePeekLabel, phase, turnStatusLabel]);

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
            canPeekAtIndex={(i) =>
              phase === 'peek' &&
              peekTurnPlayer === 'p2' &&
              (peekedByPlayer.p2[i] || peekedCountFor('p2') < 2)
            }
            onPeekAtIndex={(i) =>
              markPeeked('p2', i)
            }
            canSwap={phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p2' && !!drawnCard}
            onSwapAtIndex={(i) => swapWithHand('p2', i)}
          />
        </View>

        {/* Player 2 (Left) - cards rotated to face the table */}
        <View style={[styles.leftPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={[styles.nameplate, phase === 'peek' && peekTurnPlayer === 'p3' ? styles.nameplateActive : null]}>
            <Text style={[styles.labelText, phase === 'peek' && peekTurnPlayer === 'p3' ? styles.labelTextActive : null]}>PLAYER 2</Text>
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
            canPeekAtIndex={(i) =>
              phase === 'peek' &&
              peekTurnPlayer === 'p3' &&
              (peekedByPlayer.p3[i] || peekedCountFor('p3') < 2)
            }
            onPeekAtIndex={(i) =>
              markPeeked('p3', i)
            }
            canSwap={phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p3' && !!drawnCard}
            onSwapAtIndex={(i) => swapWithHand('p3', i)}
          />
        </View>

        {/* Player 4 (Right) - cards rotated to face the table */}
        <View style={[styles.rightPlayer, phase === 'init' ? styles.playersHidden : null]}>
          <View style={[styles.nameplate, phase === 'peek' && peekTurnPlayer === 'p4' ? styles.nameplateActive : null]}>
            <Text style={[styles.labelText, phase === 'peek' && peekTurnPlayer === 'p4' ? styles.labelTextActive : null]}>PLAYER 4</Text>
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
            canSwap={phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p4' && !!drawnCard}
            onSwapAtIndex={(i) => swapWithHand('p4', i)}
          />
        </View>

        <CenterArea
          styles={styles}
          deckOriginRef={deckOriginRef}
          canDrawDeck={canDrawDeck}
          onDrawDeck={drawFromDeck}
          drawnCard={drawnCard}
          canDrawPile={
            canDrawPile ||
            canDiscardToPile
          }
          discardPileTop={discardPile.length > 0 ? discardPile[discardPile.length - 1] : null}
          onPilePress={() => {
            if (turnStep === 'draw') drawFromPile();
            else discardDrawnToPile();
          }}
        />

        {/* Player 1 (Bottom / Current User) */}
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
            canSwap={phase === 'turn' && turnStep === 'resolve' && turnPlayer === 'p1' && !!drawnCard}
            onSwapAtIndex={(i) => swapWithHand('p1', i)}
          />
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

