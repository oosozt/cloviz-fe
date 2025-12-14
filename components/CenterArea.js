import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { PlayingCardRN } from './PlayingCardRN';

/**
 * Center table UI (deck, drawn-card display, discard pile, END button).
 *
 * This component is presentational. The screen/hook passes:
 * - booleans to highlight tappable actions
 * - callbacks to execute the current action
 *
 * `deckOriginRef` is measured by the dealing hook so it knows where the deck is
 * on screen for the dealing animation.
 */

export function CenterArea({
  styles,
  deckOriginRef,

  canDrawDeck,
  onDrawDeck,

  drawnCard,

  canDrawPile,
  discardPileTop,
  onPilePress,

  canDeclareEnd,
  onDeclareEnd,
}) {
  return (
    <View style={styles.centerArea}>
      <View style={styles.centerStack}>
        {/* Deck */}
        <View style={styles.centerBlock}>
          <View style={styles.deckActionWrap}>
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

            <Pressable
              onPress={onDeclareEnd}
              disabled={!canDeclareEnd}
              style={({ pressed }) => [
                styles.endButton,
                !canDeclareEnd ? styles.endButtonDisabled : null,
                pressed && canDeclareEnd ? styles.endButtonPressed : null,
              ]}
            >
              <View pointerEvents="none" style={styles.endButtonGloss} />
              <Text style={styles.endButtonText}>END</Text>
            </Pressable>
          </View>
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
