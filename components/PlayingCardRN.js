import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { getCardDimensions } from '../lib/cards';
import { getMonospaceFontFamily } from '../lib/ui';

// PlayingCardRN is a purely visual card component.
// It supports two independent interaction concepts:
// - Flip (peek): handled locally via internal `isFlipped` state when `canFlip` is true
// - Press (actions like swap/respond/power): handled by the parent via `pressEnabled` + `onPress`
//
// In other words: a card can be pressable even if it cannot flip.

// A single playing card UI.
// - Tap toggles between back/face when `canFlip` is true.
// - When `pressEnabled` is true, `onPress` will fire even if the card cannot flip.
// - `rotationDeg` rotates the whole card for side players.
// - `scale` slightly increases/decreases the rendered size.
export function PlayingCardRN({
  faceDown = true,
  canFlip = false,
  pressEnabled = false,
  size = 'medium',
  orientation = 'horizontal',
  rotationDeg = 0,
  scale = 1,
  value = 'A',
  suit = '♠',
  style,
  onPress,
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!canFlip && isFlipped) setIsFlipped(false);
  }, [canFlip, isFlipped]);

  const isRed = suit === '♥' || suit === '♦';
  const showFaceDown = faceDown && !isFlipped;

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
      disabled={!pressEnabled && !canFlip}
      onPress={() => {
        if (!pressEnabled && !canFlip) return;
        onPress?.();
        if (canFlip) setIsFlipped((prev) => !prev);
      }}
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

const styles = StyleSheet.create({
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
});
