import React from 'react';
import { Text, View } from 'react-native';

import { PlayerHand } from './PlayerHand';

/**
 * One seat on the table: nameplate + hand.
 * This removes the repeated boilerplate in CardTableScreen.
 */
export function PlayerSeat({
  styles,
  containerStyle,
  hidden,

  title,
  active,
  isYou = false,
  nameplateAfter = false,

  handProps,
}) {
  const nameplate = (
    <View
      style={[
        styles.nameplate,
        isYou ? styles.nameplateYou : null,
        active ? styles.nameplateActive : null,
      ]}
    >
      <Text
        style={[
          styles.labelText,
          isYou ? styles.labelTextYou : null,
          active ? styles.labelTextActive : null,
        ]}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <View style={[containerStyle, hidden ? styles.playersHidden : null]}>
      {nameplateAfter ? null : nameplate}
      <PlayerHand {...handProps} />
      {nameplateAfter ? nameplate : null}
    </View>
  );
}
