import React from 'react';
import { View } from 'react-native';

import { PlayingCardRN } from './PlayingCardRN';

/**
 * Renders one player's hand as a row/column of card slots.
 *
 * Key ideas:
 * - The game starts with a fixed `handSize` (usually 4), but hands can grow/shrink
 *   later (wrong respond plays draw extra cards; playing cards removes them).
 *   So we render `max(handSize, hand.length)` slots to keep layout stable.
 * - Each slot's View ref is stored in `slotRefs` so the dealing animation can
 *   measure exact positions for the "fly-in" effect.
 * - Interaction is phase-driven. The parent screen passes small per-index
 *   predicate callbacks:
 *   - canPeekAtIndex / onPeekAtIndex
 *   - canRespondAtIndex / onRespondAtIndex
 *   - canPowerAtIndex / onPowerAtIndex
 *   - canSwap / onSwapAtIndex
 *
 * This component stays *dumb* on purpose: it doesn't know about rules, only
 * "if it's tappable" and "what should happen when tapped".
 */

export function PlayerHand({
  playerKey,
  hand,
  handSize,
  cardSpec,
  getSlotBoxStyle,
  slotRefs,
  styles,

  layout = 'row',
  gapStyle,

  canPeekAtIndex,
  onPeekAtIndex,

  canRespondAtIndex,
  onRespondAtIndex,

  canPowerAtIndex,
  onPowerAtIndex,
  isFaceUpAtIndex,

  canSwap = false,
  onSwapAtIndex,

  forceFaceUp = false,
}) {
  const isColumn = layout === 'col';
  // Render enough slots so the table doesn't "jump" when a hand changes size.
  const slotsToRender = Math.max(handSize, hand?.length ?? 0);

  return (
    <View style={isColumn ? styles.col : styles.row}>
      {Array.from({ length: slotsToRender }).map((_, i) => {
        const card = hand?.[i];

        // Per-slot interaction gates.
        const canPeekHere = !!canPeekAtIndex?.(i);
        const canRespondHere = !!canRespondAtIndex?.(i);
        const canPowerHere = !!canPowerAtIndex?.(i);
        const canSwapHere = !!canSwap;

        // "pressEnabled" is used by PlayingCardRN to decide whether the card press
        // should do anything (even if it cannot flip).
        const pressEnabled = canPeekHere || canRespondHere || canPowerHere || canSwapHere;

        // This is how we selectively reveal a single card during the Q power.
        const faceUpHere = !!forceFaceUp || !!isFaceUpAtIndex?.(i);

        return (
          <View
            key={`${playerKey}-slot-${i}`}
            ref={(r) => {
              // Store the slot ref for dealing measurement.
              if (!slotRefs?.current?.[playerKey]) slotRefs.current[playerKey] = [];
              slotRefs.current[playerKey][i] = r;
            }}
            collapsable={false}
            style={[
              getSlotBoxStyle(playerKey),
              i < slotsToRender - 1 ? gapStyle : undefined,
            ]}
          >
            {/* Yellow halo indicates an actionable slot in the current phase. */}
            {canSwapHere || canRespondHere || canPowerHere ? (
              <View pointerEvents="none" style={styles.actionHaloFill} />
            ) : null}

            {card ? (
              <PlayingCardRN
                size={cardSpec.size}
                scale={cardSpec.scale}
                orientation={cardSpec.orientation}
                rotationDeg={cardSpec.rotationDeg}
                value={card.rank}
                suit={card.suit}
                faceDown={!faceUpHere}
                pressEnabled={pressEnabled}
                // Peek uses PlayingCardRN's built-in flip animation/state.
                canFlip={canPeekHere}
                onPress={() => {
                  // Priority order matters: only one action should happen per press.
                  if (canPeekHere) return onPeekAtIndex?.(i);
                  if (canRespondHere) return onRespondAtIndex?.(i);
                  if (canPowerHere) return onPowerAtIndex?.(i);
                  if (canSwapHere) return onSwapAtIndex?.(i);
                }}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
