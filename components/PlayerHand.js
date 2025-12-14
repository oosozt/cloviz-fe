import React from 'react';
import { View } from 'react-native';

import { PlayingCardRN } from './PlayingCardRN';

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

  canSwap = false,
  onSwapAtIndex,

  forceFaceUp = false,
}) {
  const isColumn = layout === 'col';
  const slotsToRender = Math.max(handSize, hand?.length ?? 0);

  return (
    <View style={isColumn ? styles.col : styles.row}>
      {Array.from({ length: slotsToRender }).map((_, i) => {
        const card = hand?.[i];
        const canPeekHere = !!canPeekAtIndex?.(i);
        const canRespondHere = !!canRespondAtIndex?.(i);
        const canSwapHere = !!canSwap;
        const pressEnabled = canPeekHere || canRespondHere || canSwapHere;

        return (
          <View
            key={`${playerKey}-slot-${i}`}
            ref={(r) => {
              if (!slotRefs?.current?.[playerKey]) slotRefs.current[playerKey] = [];
              slotRefs.current[playerKey][i] = r;
            }}
            collapsable={false}
            style={[
              getSlotBoxStyle(playerKey),
              i < slotsToRender - 1 ? gapStyle : undefined,
            ]}
          >
            {canSwapHere || canRespondHere ? (
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
                faceDown={!forceFaceUp}
                pressEnabled={pressEnabled}
                canFlip={canPeekHere}
                onPress={() => {
                  if (canPeekHere) return onPeekAtIndex?.(i);
                  if (canRespondHere) return onRespondAtIndex?.(i);
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
