import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

// UI label mapping (matches current table seat mapping).
function labelForKey(k) {
  if (k === 'p1') return 'P1';
  if (k === 'p3') return 'P2';
  if (k === 'p2') return 'P3';
  return 'P4';
}

/**
 * Game-over scoreboard overlay.
 * `finalScores` is { scores: {p1,p2,p3,p4}, winners: [playerKey...] }.
 */
export function GameOverOverlay({ styles, finalScores, visible }) {
  const winnerText = useMemo(() => {
    const winners = finalScores?.winners ?? [];
    return winners.map(labelForKey).join(' / ') || '-';
  }, [finalScores]);

  if (!visible || !finalScores) return null;

  return (
    <View style={styles.gameOverOverlay} pointerEvents="none">
      <Text style={styles.gameOverTitle}>FINAL SCORES</Text>
      <Text style={styles.gameOverLine}>P1: {finalScores.scores?.p1 ?? 0}</Text>
      <Text style={styles.gameOverLine}>P2: {finalScores.scores?.p3 ?? 0}</Text>
      <Text style={styles.gameOverLine}>P3: {finalScores.scores?.p2 ?? 0}</Text>
      <Text style={styles.gameOverLine}>P4: {finalScores.scores?.p4 ?? 0}</Text>
      <Text style={styles.gameOverLine}>WINNER: {winnerText}</Text>
    </View>
  );
}
