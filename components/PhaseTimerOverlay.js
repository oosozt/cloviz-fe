import React from 'react';
import { Text, View } from 'react-native';

/**
 * Top-right overlay showing the current phase label and (optional) timer text.
 * Presentational only.
 */
export function PhaseTimerOverlay({ styles, label, timerText }) {
  return (
    <View style={[styles.labelBox, styles.timer]}>
      <Text style={styles.labelText}>{label}</Text>
      <Text style={[styles.labelText, styles.timerText]}>{timerText ?? ''}</Text>
    </View>
  );
}
