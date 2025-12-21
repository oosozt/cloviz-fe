import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Button, TextInput, ScrollView, StatusBar } from 'react-native';
import { Client } from '@stomp/stompjs';

export default function App() {
  const [roomId, setRoomId] = useState('room1');
  const [name, setName] = useState('Ali');
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev]);
  };

  const wsUrl = 'ws://192.168.1.3:8080/ws';

  const client = useMemo(() => {
    const c = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 0,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
      debug: (str) => addLog(`[debug] ${str}`),
      onStompError: (frame) => addLog(`[stomp-error] ${frame.body || 'frame error'}`),
      onWebSocketError: (ev) => addLog(`[ws-error] ${String(ev?.message ?? ev)}`),
      onWebSocketClose: () => addLog(`[ws-close] closed`),
    });
    return c;
  }, []);

  useEffect(() => {
    client.onConnect = () => {
      addLog('✅ CONNECTED');

      const topic = `/topic/room.${roomId}`;
      addLog(`🔔 Subscribing: ${topic}`);

      client.subscribe(topic, (msg) => {
        addLog(`📩 EVENT: ${msg.body}`);
      });
    };

    addLog(`🔌 Connecting to ${wsUrl} ...`);
    client.activate();

    return () => {
      try {
        addLog('🧹 Disconnecting...');
        client.deactivate();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendJoin = () => {
    if (!client.connected) {
      addLog('⚠️ Not connected yet');
      return;
    }

    const payload = {
      roomId: roomId.trim(),
      playerName: name.trim(),
      playerId: null,
    };

    addLog(`➡️ SEND /app/room.join  ${JSON.stringify(payload)}`);

    client.publish({
      destination: '/app/room.join',
      body: JSON.stringify(payload),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 50 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <Text style={{ fontSize: 20, fontWeight: '700', color: '#ff9100ff' }}>Kabo WS Join Test</Text>
      <Text style={{ marginTop: 6, color: '#374151' }}>WS: {wsUrl}</Text>

      <Text style={{ marginTop: 16, color: '#f5b70fff', fontWeight: '600' }}>Room Id</Text>
      <TextInput
        value={roomId}
        onChangeText={setRoomId}
        autoCapitalize="none"
        placeholder="room1"
        placeholderTextColor="#9CA3AF"
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          backgroundColor: '#FFFFFF',
          color: 'rgba(156, 39, 23, 1)',
          padding: 10,
          borderRadius: 10,
          marginTop: 6,
        }}
      />

      <Text style={{ marginTop: 12, color: '#3ef810ff', fontWeight: '600' }}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
        placeholder="Ali"
        placeholderTextColor="#9CA3AF"
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          backgroundColor: '#FFFFFF',
          color: '#004beeff',
          padding: 10,
          borderRadius: 10,
          marginTop: 6,
        }}
      />

      <View style={{ height: 12 }} />
      <View style={{ borderRadius: 10, overflow: 'hidden' }}>
        <Button title="Join gönder" onPress={sendJoin} />
      </View>

      <Text style={{ marginTop: 16, fontWeight: '700', color: '#111827' }}>Logs</Text>
      <ScrollView
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 12,
          backgroundColor: '#F9FAFB',
          padding: 12,
        }}
      >
        {logs.length === 0 ? (
          <Text style={{ color: '#6B7280' }}>Henüz log yok…</Text>
        ) : (
          logs.map((l, i) => (
            <Text key={i} style={{ fontSize: 12, marginBottom: 8, color: '#111827' }}>
              {l}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}
