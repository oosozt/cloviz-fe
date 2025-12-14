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

  canSwap = false,
  onSwapAtIndex,
}) {
  const isColumn = layout === 'col';

  return (
    <View style={isColumn ? styles.col : styles.row}>
      {Array.from({ length: handSize }).map((_, i) => {
        const card = hand?.[i];
        const canPeekHere = !!canPeekAtIndex?.(i);
        const canSwapHere = !!canSwap;
        const pressEnabled = canPeekHere || canSwapHere;

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
              i < handSize - 1 ? gapStyle : undefined,
            ]}
          >
            {canSwapHere ? <View pointerEvents="none" style={styles.actionHaloFill} /> : null}

            {card ? (
              <PlayingCardRN
                size={cardSpec.size}
                scale={cardSpec.scale}
                orientation={cardSpec.orientation}
                rotationDeg={cardSpec.rotationDeg}
                value={card.rank}
                suit={card.suit}
                faceDown={true}
                pressEnabled={pressEnabled}
                canFlip={canPeekHere}
                onPress={() => {
                  if (canPeekHere) return onPeekAtIndex?.(i);
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
