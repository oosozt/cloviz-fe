// lib/kaboWsClient.js
import { Client } from '@stomp/stompjs';

export class KaboWsClient {
  constructor({ wsUrl, onDebug, onError }) {
    this.wsUrl = wsUrl;
    this.onDebug = onDebug;
    this.onError = onError;

    this.client = null;
    this.roomSub = null;
  }

  async connect() {
    if (this.client?.active && this.client.connected) return;

    const c = new Client({
      brokerURL: this.wsUrl,
      reconnectDelay: 1500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (msg) => this.onDebug?.(msg),
      onStompError: (frame) => this.onError?.(frame),
      onWebSocketError: (ev) => this.onError?.(ev),
    });

    this.client = c;

    await new Promise((resolve, reject) => {
      c.onConnect = () => resolve();
      c.activate();

      setTimeout(() => {
        if (!c.connected) reject(new Error('WS connect timeout'));
      }, 6000);
    });
  }

  subscribeRoom(roomId, onEvent) {
    if (!this.client?.connected) throw new Error('Not connected');

    if (this.roomSub) this.roomSub.unsubscribe();
    const topic = `/topic/room.${roomId}`;

    this.roomSub = this.client.subscribe(topic, (msg) => {
      try {
        const ev = JSON.parse(msg.body);
        onEvent(ev);
      } catch (e) {
        this.onError?.(e);
      }
    });
  }

  joinRoom(roomId, playerName, requestedPlayerId) {
    if (!this.client?.connected) throw new Error('Not connected');

    const payload = {
      roomId,
      playerName,
      playerId: requestedPlayerId || null,
    };

    this.client.publish({
      destination: '/app/room.join',
      body: JSON.stringify(payload),
    });
  }

  startRoom(roomId, playerId, playerName = 'host') {
    if (!this.client?.connected) throw new Error('Not connected');

    // Backend start endpoint'in JoinRoomRequest beklediği varsayımıyla:
    const payload = { roomId, playerName, playerId: null };

    this.client.publish({
      destination: '/app/room.start',
      headers: { 'player-id': playerId }, // ⚠️ kritik
      body: JSON.stringify(payload),
    });
  }

  action(roomId, playerId) {
    if (!this.client?.connected) throw new Error('Not connected');

    const payload = { roomId };

    this.client.publish({
      destination: '/app/room.action',
      headers: { 'player-id': playerId }, // ⚠️ kritik
      body: JSON.stringify(payload),
    });
  }

  disconnect() {
    try {
      this.roomSub?.unsubscribe();
    } catch {}
    this.roomSub = null;

    try {
      this.client?.deactivate();
    } catch {}
    this.client = null;
  }
}
