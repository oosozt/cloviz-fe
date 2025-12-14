import { useEffect, useMemo, useState } from 'react';

import { HAND_SIZE } from '../lib/cards';
import { PLAYER_NUM_BY_KEY, TURN_ORDER } from '../lib/seating';

export function usePeekStage({ phase, setPhase, seconds = 3 }) {
  const [peekTurnPlayer, setPeekTurnPlayer] = useState('p1');
  const [peekSecondsLeft, setPeekSecondsLeft] = useState(seconds);
  const [peekedByPlayer, setPeekedByPlayer] = useState(() => ({
    p1: Array(HAND_SIZE).fill(false),
    p2: Array(HAND_SIZE).fill(false),
    p3: Array(HAND_SIZE).fill(false),
    p4: Array(HAND_SIZE).fill(false),
  }));

  const peekedCountFor = (playerKey) => peekedByPlayer[playerKey].filter(Boolean).length;

  const activePeekLabel = useMemo(() => {
    const n = PLAYER_NUM_BY_KEY[peekTurnPlayer] ?? 1;
    return `P${n} LOOK ${peekedCountFor(peekTurnPlayer)}/2`;
  }, [peekTurnPlayer, peekedByPlayer]);

  const timerText = useMemo(() => {
    const clamped = Math.max(0, peekSecondsLeft);
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, [peekSecondsLeft]);

  const advancePeekTurn = () => {
    setPeekTurnPlayer((prev) => {
      const idx = TURN_ORDER.indexOf(prev);
      if (idx < 0) return 'p1';
      if (idx === TURN_ORDER.length - 1) {
        setPhase('peekDone');
        return prev;
      }
      return TURN_ORDER[idx + 1];
    });
  };

  // Transition into the peek stage after dealing completes.
  useEffect(() => {
    if (phase !== 'dealt') return;
    setPhase('peek');
  }, [phase, setPhase]);

  // Reset peek state when peek starts.
  useEffect(() => {
    if (phase !== 'peek') return;
    setPeekTurnPlayer('p1');
    setPeekedByPlayer({
      p1: Array(HAND_SIZE).fill(false),
      p2: Array(HAND_SIZE).fill(false),
      p3: Array(HAND_SIZE).fill(false),
      p4: Array(HAND_SIZE).fill(false),
    });
  }, [phase]);

  // Countdown per player.
  useEffect(() => {
    if (phase !== 'peek') return;

    setPeekSecondsLeft(seconds);
    const intervalId = setInterval(() => {
      setPeekSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [phase, peekTurnPlayer, seconds]);

  useEffect(() => {
    if (phase !== 'peek') return;
    if (peekSecondsLeft > 0) return;
    advancePeekTurn();
  }, [peekSecondsLeft, phase]);

  const markPeeked = (playerKey, index) => {
    setPeekedByPlayer((prev) => {
      const row = prev[playerKey];
      if (!row) return prev;
      if (row[index]) return prev;
      return {
        ...prev,
        [playerKey]: row.map((v, idx) => (idx === index ? true : v)),
      };
    });
  };

  return {
    peekTurnPlayer,
    peekSecondsLeft,
    peekedByPlayer,
    peekedCountFor,
    markPeeked,
    timerText,
    activePeekLabel,
  };
}
