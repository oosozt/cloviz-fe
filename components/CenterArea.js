import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { PlayingCardRN } from './PlayingCardRN';

export function CenterArea({
  styles,
  deckOriginRef,

  canDrawDeck,
  onDrawDeck,

  drawnCard,

  canDrawPile,
  discardPileTop,
  onPilePress,
}) {
  return (
    <View style={styles.centerArea}>
      <View style={styles.centerStack}>
        {/* Deck */}
        <View style={styles.centerBlock}>
          <Pressable
            onPress={onDrawDeck}
            style={{ position: 'relative', width: 64, height: 96, padding: 4, borderRadius: 6 }}
          >
            {canDrawDeck ? <View pointerEvents="none" style={styles.actionHaloFill} /> : null}

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

        {/* Discard pile */}
        <View style={[styles.centerBlock, styles.mt24]}>
          <Pressable
            onPress={onPilePress}
            style={[styles.playSlot, { position: 'relative' }]}
          >
            {canDrawPile ? <View pointerEvents="none" style={styles.actionHaloFill} /> : null}

            {discardPileTop ? (
              <PlayingCardRN
                size="small"
                orientation="vertical"
                faceDown={false}
                value={discardPileTop.rank}
                suit={discardPileTop.suit}
              />
            ) : (
              <Text style={styles.playSlotText}>PILE</Text>
            )}
          </Pressable>
          <Text style={styles.caption}>PILE</Text>
        </View>
      </View>
    </View>
  );
}
