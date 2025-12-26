import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';

const DEFAULT_MAX_LOGS = 300;

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeWsUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  // If someone pastes http(s) endpoint, best-effort convert to ws(s).
  if (trimmed.startsWith('http://')) return `ws://${trimmed.slice('http://'.length)}`;
  if (trimmed.startsWith('https://')) return `wss://${trimmed.slice('https://'.length)}`;
  return trimmed;
}

function normalizeHttpUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('ws://')) return `http://${trimmed.slice('ws://'.length)}`;
  if (trimmed.startsWith('wss://')) return `https://${trimmed.slice('wss://'.length)}`;
  return trimmed;
}

function deriveHealthUrlFrom(url) {
  const httpish = normalizeHttpUrl(url);
  try {
    const u = new URL(httpish);
    u.pathname = '/health';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function deriveHostHeaderFrom(url) {
  try {
    // URL() requires http(s), so normalize ws(s) -> http(s)
    const httpish = normalizeHttpUrl(url);
    const u = new URL(httpish);
    return u.host; // host:port
  } catch {
    return null;
  }
}

function addWsListener(ws, type, handler) {
  try {
    if (typeof ws?.addEventListener === 'function') {
      ws.addEventListener(type, handler);
      return;
    }
  } catch {
    // ignore
  }

  // Fallback for environments without addEventListener.
  const prop = `on${type}`;
  const prev = ws?.[prop];
  ws[prop] = (e) => {
    try {
      prev?.(e);
    } catch {
      // ignore
    }
    handler?.(e);
  };
}

/**
 * STOMP websocket hook with log capture for debugging flaky connections.
 *
 * Returns:
 * - connect()/disconnect()
 * - status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
 * - logs: [{ ts, level, message, data }]
 */
export function useWebsocketHook({
  url,
  connectHeaders,
  enabled = false,
  maxLogs = DEFAULT_MAX_LOGS,
  reconnectDelayMs = 5000,
  heartbeatIncomingMs = 10000,
  heartbeatOutgoingMs = 10000,
  connectTimeoutMs = 8000,
  healthcheckUrl,
  healthcheckEnabled = true,
  healthcheckExpectedText = 'ok',
  healthcheckTimeoutMs = 3000,
} = {}) {
  const normalizedUrl = useMemo(() => normalizeWsUrl(url), [url]);
  const effectiveHealthUrl = useMemo(() => {
    if (healthcheckUrl) return normalizeHttpUrl(healthcheckUrl);
    return deriveHealthUrlFrom(url);
  }, [healthcheckUrl, url]);

  const clientRef = useRef(null);
  const subsRef = useRef([]);
  const connectAttemptRef = useRef(0);
  const connectPromiseRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [lastError, setLastError] = useState(null);
  const [logs, setLogs] = useState([]);

  const pushLog = useCallback(
    (level, message, data) => {
      const entry = {
        ts: Date.now(),
        level,
        message: String(message ?? ''),
        data,
      };

      setLogs((prev) => {
        const next = prev.length >= maxLogs ? prev.slice(prev.length - (maxLogs - 1)) : prev;
        return [...next, entry];
      });
    },
    [maxLogs]
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  const unsubscribeAll = useCallback(() => {
    const subs = subsRef.current;
    subsRef.current = [];
    for (const s of subs) {
      try {
        s?.unsubscribe?.();
      } catch {
        // ignore
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    const client = clientRef.current;
    clientRef.current = null;
    unsubscribeAll();

    if (!client) {
      setStatus((s) => (s === 'idle' ? 'idle' : 'disconnected'));
      pushLog('info', 'disconnect(): no active client');
      return;
    }

    try {
      pushLog('info', 'Deactivating STOMP client...');
      await client.deactivate();
      pushLog('info', 'STOMP client deactivated');
    } catch (e) {
      setLastError(String(e?.message ?? e));
      pushLog('error', 'Error during deactivate()', String(e?.message ?? e));
    } finally {
      setStatus('disconnected');
    }
  }, [pushLog, unsubscribeAll]);

  const runHealthcheck = useCallback(async () => {
    if (!healthcheckEnabled) return true;
    if (!effectiveHealthUrl) {
      pushLog('warn', 'Healthcheck skipped: missing URL');
      return true;
    }

    pushLog('info', `Healthcheck GET ${effectiveHealthUrl}`);
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ac?.abort?.(), healthcheckTimeoutMs);

    try {
      const res = await fetch(effectiveHealthUrl, {
        method: 'GET',
        signal: ac?.signal,
        headers: { Accept: 'text/plain' },
      });
      const text = await res.text();
      const body = String(text ?? '').trim();

      pushLog('info', 'Healthcheck response', { status: res.status, body });

      if (!res.ok) return false;
      if (healthcheckExpectedText != null && body !== String(healthcheckExpectedText)) return false;
      return true;
    } catch (e) {
      pushLog('error', 'Healthcheck failed', String(e?.message ?? e));
      return false;
    } finally {
      clearTimeout(t);
    }
  }, [effectiveHealthUrl, healthcheckEnabled, healthcheckExpectedText, healthcheckTimeoutMs, pushLog]);

  const subscribe = useCallback(
    (destination, onMessage) => {
      const client = clientRef.current;
      if (!client || status !== 'connected') {
        pushLog('error', 'subscribe() called while not connected', { destination, status });
        return () => {};
      }

      pushLog('info', `subscribe ${destination}`);
      const sub = client.subscribe(destination, (msg) => {
        pushLog('debug', `message ${destination}`, msg?.body);
        onMessage?.(msg);
      });

      subsRef.current.push(sub);
      return () => {
        try {
          sub.unsubscribe();
        } catch {
          // ignore
        }
        subsRef.current = subsRef.current.filter((x) => x !== sub);
      };
    },
    [pushLog, status]
  );

  const subscribeJson = useCallback(
    (destination, onEvent) => {
      return subscribe(destination, (msg) => {
        const ev = safeParseJson(msg?.body);
        if (ev) onEvent?.(ev, msg);
      });
    },
    [subscribe]
  );

  const publishJson = useCallback(
    ({ destination, body, headers }) => {
      const client = clientRef.current;
      if (!client || status !== 'connected') {
        pushLog('error', 'publishJson() called while not connected', { destination, status });
        return;
      }

      const payload = typeof body === 'string' ? body : JSON.stringify(body ?? {});
      pushLog('info', `publish ${destination}`, { headers: headers ?? {}, body: payload });
      client.publish({ destination, headers: headers ?? {}, body: payload });
    },
    [pushLog, status]
  );

  const connect = useCallback(async () => {
    if (!normalizedUrl) {
      setLastError('Missing websocket URL');
      pushLog('error', 'Missing websocket URL');
      setStatus('error');
      return false;
    }

    // If already active, do nothing.
    if (clientRef.current?.active) {
      pushLog('debug', 'connect(): client already active');
      return true;
    }

    // 1) Healthcheck first
    const healthOk = await runHealthcheck();
    if (!healthOk) {
      setLastError('Healthcheck failed');
      pushLog('error', 'Healthcheck failed: not attempting websocket connect');
      setStatus('error');
      return false;
    }

    setLastError(null);
    setStatus('connecting');
    pushLog('info', `Connecting to ${normalizedUrl}`);

    connectAttemptRef.current += 1;
    const attemptId = connectAttemptRef.current;

    const derivedHost = deriveHostHeaderFrom(normalizedUrl);
    const headersWithHost = {
      ...(connectHeaders ?? {}),
      ...(derivedHost && !(connectHeaders ?? {})?.host ? { host: derivedHost } : null),
    };
    if (derivedHost) pushLog('info', 'STOMP connect host header', derivedHost);
    pushLog('info', 'STOMP transport config', {
      // Workaround for a known React Native WebSocket issue where NULL (\0)
      // terminator in STOMP frames can be chopped on iOS.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
    });

    const client = new Client({
      // IMPORTANT: In React Native (iOS especially), providing webSocketFactory
      // is often more reliable than relying on brokerURL.
      // We normalize user input (http->ws) into `normalizedUrl`.
      webSocketFactory: () => {
        pushLog('info', 'Creating raw WebSocket', normalizedUrl);
        // Request STOMP subprotocol so Spring can route frames via StompSubProtocolHandler.
        // (Without Sec-WebSocket-Protocol, Spring may keep CONNECT/CONNECTED at 0.)
        const ws = new WebSocket(normalizedUrl, 'v12.stomp');

        // Lightweight instrumentation: log first few sends to confirm whether
        // frames are sent as strings (risk: \0 truncation) vs binary.
        try {
          const originalSend = ws.send?.bind(ws);
          if (typeof originalSend === 'function') {
            let sendCount = 0;
            ws.send = (data) => {
              sendCount += 1;
              if (sendCount <= 5) {
                const info = {
                  count: sendCount,
                  typeof: typeof data,
                  isString: typeof data === 'string',
                  isArrayBuffer: typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer,
                  isUint8Array: typeof Uint8Array !== 'undefined' && data instanceof Uint8Array,
                };

                if (typeof data === 'string') {
                  info.length = data.length;
                  info.nullIndex = data.indexOf('\0');
                  info.endsWithNull = data.endsWith('\0');
                } else if (data && typeof data === 'object') {
                  if (typeof data.byteLength === 'number') info.byteLength = data.byteLength;
                  if (typeof data.length === 'number') info.length = data.length;
                }

                pushLog('debug', 'RAW WS send', info);
              }

              return originalSend(data);
            };
          }
        } catch (e) {
          pushLog('warn', 'RAW WS send instrumentation failed', String(e?.message ?? e));
        }

        addWsListener(ws, 'open', () => pushLog('info', 'RAW WS open', { protocol: ws?.protocol ?? null }));
        addWsListener(ws, 'error', (e) => pushLog('error', 'RAW WS error', safeJson(e)));
        addWsListener(ws, 'close', (e) =>
          pushLog('warn', 'RAW WS close', {
            code: e?.code,
            reason: e?.reason,
            wasClean: e?.wasClean,
          })
        );

        return ws;
      },
      connectHeaders: headersWithHost,
      reconnectDelay: reconnectDelayMs,
      heartbeatIncoming: heartbeatIncomingMs,
      heartbeatOutgoing: heartbeatOutgoingMs,
      // React Native (iOS) can chop NULL terminators in string frames.
      // Force binary frames so the terminating 0x00 survives transport.
      forceBinaryWSFrames: true,
      // Workaround for RN bug on *incoming* frames (best-effort; safe for small frames).
      appendMissingNULLonIncoming: true,
      // This is called a lot; we still log it because you want logs.
      debug: (str) => pushLog('debug', str),
    });
    client.onConnect = (frame) => {
      pushLog('info', 'STOMP connected', {
        headers: frame?.headers,
      });
      setStatus('connected');

      const pending = connectPromiseRef.current;
      if (pending && pending.attemptId === attemptId) {
        connectPromiseRef.current = null;
        pending.resolve();
      }
    };

    client.onDisconnect = () => {
      pushLog('info', 'STOMP disconnected');
      setStatus('disconnected');
    };

    client.onStompError = (frame) => {
      const msg = frame?.headers?.message ?? 'STOMP error';
      const body = frame?.body;
      setLastError(String(msg));
      pushLog('error', 'STOMP error frame', { message: msg, body });
      setStatus('error');

      const pending = connectPromiseRef.current;
      if (pending && pending.attemptId === attemptId) {
        connectPromiseRef.current = null;
        pending.reject(new Error(String(msg)));
      }
    };

    client.onWebSocketError = (event) => {
      setLastError('WebSocket error');
      pushLog('error', 'WebSocket error', safeJson(event));
      setStatus('error');

      const pending = connectPromiseRef.current;
      if (pending && pending.attemptId === attemptId) {
        connectPromiseRef.current = null;
        pending.reject(new Error('WebSocket error'));
      }
    };

    client.onWebSocketClose = (event) => {
      pushLog('warn', 'WebSocket closed', {
        code: event?.code,
        reason: event?.reason,
        wasClean: event?.wasClean,
      });
      setStatus('disconnected');

      const pending = connectPromiseRef.current;
      if (pending && pending.attemptId === attemptId) {
        connectPromiseRef.current = null;
        pending.reject(new Error('WebSocket closed'));
      }
    };

    clientRef.current = client;

    try {
      client.activate();
      pushLog('info', 'STOMP activate() called');

      // Wait until onConnect (or error/timeout).
      const promise = new Promise((resolve, reject) => {
        connectPromiseRef.current = { attemptId, resolve, reject };
        setTimeout(() => {
          const pending = connectPromiseRef.current;
          if (pending && pending.attemptId === attemptId) {
            connectPromiseRef.current = null;
            reject(new Error('Connect timeout'));
          }
        }, connectTimeoutMs);
      });

      await promise;
      return true;
    } catch (e) {
      clientRef.current = null;
      setLastError(String(e?.message ?? e));
      pushLog('error', 'activate() threw', String(e?.message ?? e));
      setStatus('error');
      return false;
    }
  }, [
    connectHeaders,
    connectTimeoutMs,
    heartbeatIncomingMs,
    heartbeatOutgoingMs,
    normalizedUrl,
    pushLog,
    reconnectDelayMs,
    runHealthcheck,
  ]);

  // Auto-connect if enabled.
  useEffect(() => {
    if (!enabled) return;
    connect();

    return () => {
      // Always clean up on unmount.
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  const isConnected = status === 'connected';

  return {
    client: clientRef.current,
    status,
    isConnected,
    lastError,
    logs,
    clearLogs,
    log: pushLog,
    connect,
    disconnect,
    subscribe,
    subscribeJson,
    publishJson,
  };
}
