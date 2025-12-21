import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StatusBar } from 'react-native';
import { Client } from '@stomp/stompjs';

export default function LobbyScreen() {
  const [roomId, setRoomId] = useState('r1');
  const [name, setName] = useState('Ali');
  const [playerId, setPlayerId] = useState(null); // şimdilik RAM’de, sonra AsyncStorage ekleriz
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);

  const clientRef = useRef(null);
  const subRef = useRef(null);

  // ✅ telefon aynı wifi'da: backend IP
 const wsUrl = 'http://192.168.68.106:8080/ws';

  const addLog = (msg) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev]);
  };

  const disconnect = async () => {
    try {
      subRef.current?.unsubscribe();
    } catch {}
    subRef.current = null;

    try {
      await clientRef.current?.deactivate();
    } catch {}
    clientRef.current = null;

    setConnected(false);
    addLog('🧹 Disconnected');
  };

  const connectAndJoin = async () => {
    const r = roomId.trim();
    const n = name.trim();
    if (!r || !n) {
      addLog('⚠️ roomId/name boş olamaz');
      return;
    }

    // aynı node script gibi: yeniden başlatmak için önce kapat
    await disconnect();

    addLog(`🔌 connecting to ${wsUrl}`);

    const client = new Client({
      // ✅ Node'daki global.WebSocket karşılığı
      webSocketFactory: () => new WebSocket(wsUrl),

      reconnectDelay: 0,
      debug: () => {}, // istersen addLog ile açarsın
    });

    client.onConnect = () => {
      setConnected(true);
      addLog(`✅ connected as ${n}`);

      // 1) subscribe
      const topic = `/topic/room.${r}`;
      addLog(`🔔 subscribe ${topic}`);

      subRef.current = client.subscribe(topic, (msg) => {
        addLog(`📩 ${msg.body}`);

        // Node'daki gibi: join eventinden kendi playerId’ni yakala
        try {
          const ev = JSON.parse(msg.body);
          if (
            (ev.type === 'PLAYER_JOINED' || ev.type === 'PLAYER_RECONNECTED') &&
            ev.data &&
            ev.data.playerName === n
          ) {
            setPlayerId(ev.data.playerId);
            addLog(`🆔 myPlayerId = ${ev.data.playerId}`);
          }
        } catch {}
      });

      // 2) join publish
      const payload = { roomId: r, playerName: n, playerId: playerId }; // reconnect için ileride storage’dan gelecek
      addLog(`➡️ publish /app/room.join ${JSON.stringify(payload)}`);

      client.publish({
        destination: '/app/room.join',
        body: JSON.stringify(payload),
      });
    };

    client.onStompError = (frame) => {
      addLog(`❌ stomp error: ${frame.headers?.message || ''}`);
      if (frame.body) addLog(frame.body);
    };

    client.onWebSocketError = (err) => {
      addLog(`❌ ws error: ${String(err?.message ?? err)}`);
    };

    client.onWebSocketClose = () => {
      addLog('❌ ws closed');
      setConnected(false);
    };

    clientRef.current = client;
    client.activate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 50, paddingHorizontal: 16 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Lobby</Text>
      <Text style={{ marginTop: 6, color: '#374151' }}>WS: {wsUrl}</Text>

      <Text style={{ marginTop: 16, fontWeight: '700', color: '#111827' }}>Room</Text>
      <TextInput
        value={roomId}
        onChangeText={setRoomId}
        autoCapitalize="none"
        style={{ marginTop: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12 }}
      />

      <Text style={{ marginTop: 12, fontWeight: '700', color: '#111827' }}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
        style={{ marginTop: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 12 }}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Pressable
          onPress={connectAndJoin}
          style={{
            flex: 1,
            backgroundColor: '#111827',
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>{connected ? 'Tekrar Join' : 'Bağlan + Join'}</Text>
        </Pressable>

        <Pressable
          onPress={disconnect}
          style={{
            width: 110,
            backgroundColor: '#F3F4F6',
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <Text style={{ color: '#111827', fontWeight: '800' }}>Çık</Text>
        </Pressable>
      </View>

      <View
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          backgroundColor: '#F9FAFB',
        }}
      >
        <Text style={{ fontWeight: '800', color: '#111827' }}>
          Durum: {connected ? '✅ Connected' : '❌ Disconnected'}
        </Text>
        <Text style={{ marginTop: 4, color: '#111827' }}>myPlayerId: {playerId ?? '-'}</Text>
      </View>

      <Text style={{ marginTop: 16, fontWeight: '800', color: '#111827' }}>Logs</Text>
      <ScrollView
        style={{
          marginTop: 10,
          flex: 1,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 12,
          backgroundColor: '#F9FAFB',
          padding: 12,
        }}
      >
        {logs.map((l, i) => (
          <Text key={i} style={{ fontSize: 12, marginBottom: 8, color: '#111827' }}>
            {l}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
