import { TURN_ORDER } from './seating';

// Shared scoring rules (used by game-over UI and end-game logic).
// Lowest total points wins.
export function rankValue(rank) {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 0;
  const n = Number(rank);
  return Number.isFinite(n) ? n : 0;
}

export function handScore(hand) {
  return (hand ?? []).reduce((sum, c) => sum + rankValue(c?.rank), 0);
}

export function computeScoresForHands(handsSnapshot, keys = TURN_ORDER) {
  const scores = {};
  for (const key of keys) {
    scores[key] = handScore(handsSnapshot?.[key] ?? []);
  }
  return scores;
}

export function computeGameResult(handsSnapshot, keys = TURN_ORDER) {
  const scores = computeScoresForHands(handsSnapshot, keys);
  const values = Object.values(scores);
  const min = values.length ? Math.min(...values) : 0;
  const winners = Object.keys(scores).filter((k) => scores[k] === min);
  return { scores, winners, min };
}
