// Small pure helpers for turn order calculations.

export function buildOrderStartingFrom(playerKey, turnOrder) {
  const startIdx = turnOrder.indexOf(playerKey);
  if (startIdx < 0) return [...turnOrder];
  return [...turnOrder.slice(startIdx), ...turnOrder.slice(0, startIdx)];
}

export function nextPlayerInOrder(playerKey, turnOrder) {
  const idx = turnOrder.indexOf(playerKey);
  if (idx < 0) return turnOrder[0];
  return turnOrder[(idx + 1) % turnOrder.length];
}
