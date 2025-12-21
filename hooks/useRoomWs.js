// hooks/useRoomWs.js
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { KaboWsClient } from '../lib/kaboWsClient';

function getWsUrl() {
  // ✅ Android emulator: ws://10.0.2.2:8080/ws
  // ✅ iOS simulator: ws://localhost:8080/ws
  // ✅ gerçek cihaz: ws://LAN_IP:8080/ws
  return 'http://192.168.1.3:8080/ws';
}

export function useRoomWs({ roomId, playerName }) {
  const ws = useMemo(
    () =>
      new KaboWsClient({
        wsUrl: getWsUrl(),
        onDebug: (m) => console.log('[ws]', m),
        onError: (e) => console.log('[ws-err]', e),
      }),
    []
  );

  const [myPlayerId, setMyPlayerId] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [lastError, setLastError] = useState(null);

  const savedIdRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const storageKey = `kabo.playerId.${roomId}`;

  const handleEvent = async (ev) => {
    if (!ev || !ev.type) return;

    if (ev.type === 'ERROR') {
      setLastError(String(ev?.data?.message ?? 'Unknown error'));
      return;
    }

    // join/reconnect eventinden kendi playerId'ni yakala
    if ((ev.type === 'PLAYER_JOINED' || ev.type === 'PLAYER_RECONNECTED') && ev?.data?.playerName === playerName) {
      const pid = String(ev.data.playerId);
      setMyPlayerId(pid);
      savedIdRef.current = pid;
      await AsyncStorage.setItem(storageKey, pid);
    }

    // ana state: ROOM_STATE
    if (ev.type === 'ROOM_STATE') {
      setRoomState({
        roomId: ev.roomId,
        players: (ev.data.players ?? []).map((p) => ({ id: String(p.id), name: String(p.name) })),
        hostPlayerId: ev.data.hostPlayerId ? String(ev.data.hostPlayerId) : null,
        started: Boolean(ev.data.started),
        currentTurn: ev.data.currentTurn ? String(ev.data.currentTurn) : null,
        connectedPlayerIds: (ev.data.connectedPlayerIds ?? []).map((x) => String(x)),
      });
    }
  };

  const connectAndJoin = async () => {
    const saved = await AsyncStorage.getItem(storageKey);
    savedIdRef.current = saved;

    await ws.connect();
    ws.subscribeRoom(roomId, handleEvent);

    // subscribe'tan sonra join iyi pratik (ilk eventleri kaçırma)
    ws.joinRoom(roomId, playerName, saved);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await connectAndJoin();
      } catch (e) {
        if (!mounted) return;
        setLastError(String(e?.message ?? e));
      }
    })();

    const sub = AppState.addEventListener('change', async (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // app tekrar foreground olunca: reconnect + join
      if (prev.match(/inactive|background/) && nextState === 'active') {
        try {
          await connectAndJoin();
        } catch (e) {
          setLastError(String(e?.message ?? e));
        }
      }
    });

    return () => {
      mounted = false;
      sub.remove();
      ws.disconnect();
    };
  }, [roomId, playerName]);

  const isHost = roomState?.hostPlayerId && myPlayerId && roomState.hostPlayerId === myPlayerId;
  const isMyTurn = roomState?.currentTurn && myPlayerId && roomState.currentTurn === myPlayerId;

  return {
    ws,
    myPlayerId,
    roomState,
    isHost,
    isMyTurn,
    lastError,
    clearError: () => setLastError(null),
  };
}
