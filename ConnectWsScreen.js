import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useWebsocketHook } from './hooks/useWebsocketHook';
import { getMonospaceFontFamily } from './lib/ui';

function formatTs(ts) {
	const d = new Date(ts);
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	const ss = String(d.getSeconds()).padStart(2, '0');
	return `${hh}:${mm}:${ss}`;
}

export default function ConnectWsScreen({ navigation }) {
	const [url, setUrl] = useState('http://192.168.68.102:8080/ws');
	const [roomId, setRoomId] = useState('r1');
	const [playerName, setPlayerName] = useState('Player');
	const [kickTargetId, setKickTargetId] = useState('');
	const [actionType, setActionType] = useState('DRAW');
	const [adminPanelOpen, setAdminPanelOpen] = useState(true);

	const [myPlayerId, setMyPlayerId] = useState(null);
	const roomSubUnsubRef = useRef(null);

	const storageKey = useMemo(() => {
		const rid = String(roomId || '').trim() || 'r1';
		const nm = String(playerName || '').trim() || 'Player';
		return `stomp.playerId.${rid}.${nm}`;
	}, [playerName, roomId]);

	const connectHeaders = useMemo(() => ({}), []);

	const {
		status,
		lastError,
		logs,
		clearLogs,
		log,
		connect,
		disconnect,
		isConnected,
		subscribeJson,
		publishJson,
	} = useWebsocketHook({
		url,
		connectHeaders,
		enabled: false,
		healthcheckUrl: 'http://192.168.68.102:8080/health',
	});

	useEffect(() => {
		log?.('info', `UI status: ${status}`);
	}, [log, status]);

	useEffect(() => {
		if (!lastError) return;
		log?.('error', 'UI lastError changed', String(lastError));
	}, [lastError, log]);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const stored = await AsyncStorage.getItem(storageKey);
				if (!mounted) return;
				setMyPlayerId(stored ? String(stored) : null);
				log?.('info', 'Loaded stored playerId', stored ? String(stored) : null);
			} catch {
				if (!mounted) return;
				setMyPlayerId(null);
				log?.('warn', 'Failed to load stored playerId');
			}
		})();
		return () => {
			mounted = false;
		};
	}, [storageKey]);

	const cleanupRoomSub = () => {
		try {
			roomSubUnsubRef.current?.();
		} catch {
			// ignore
		}
		roomSubUnsubRef.current = null;
	};

	const connectAndJoin = async () => {
		log?.('info', 'CONNECT+JOIN pressed', { url, roomId, playerName, myPlayerId });
		cleanupRoomSub();
		const ok = await connect();
		log?.('info', 'connect() result', ok);
		if (!ok) return;

		const rid = String(roomId || '').trim();
		const nm = String(playerName || '').trim();
		if (!rid || !nm) return;

		roomSubUnsubRef.current = subscribeJson(`/topic/room.${rid}`, async (ev) => {
			if (!ev || !ev.type) return;

			if (
				(ev.type === 'PLAYER_JOINED' || ev.type === 'PLAYER_RECONNECTED') &&
				ev?.data?.playerName === nm
			) {
				const pid = ev?.data?.playerId ? String(ev.data.playerId) : null;
				if (!pid) return;
				setMyPlayerId(pid);
				try {
					await AsyncStorage.setItem(storageKey, pid);
					log?.('info', 'Saved playerId', pid);
				} catch {
					// ignore
					log?.('warn', 'Failed to save playerId', pid);
				}
			}
		});
		log?.('info', 'Subscribed room topic', `/topic/room.${rid}`);

		publishJson({
			destination: '/app/room.join',
			body: { roomId: rid, playerName: nm, playerId: myPlayerId },
		});
		log?.('info', 'Sent /app/room.join');
	};

	const sendStart = () => {
		const rid = String(roomId || '').trim();
		const nm = String(playerName || '').trim();
		if (!rid || !nm || !myPlayerId) return;
		log?.('info', 'Sending /app/room.start', { roomId: rid, playerId: myPlayerId });
		publishJson({
			destination: '/app/room.start',
			headers: { 'player-id': String(myPlayerId) },
			body: { roomId: rid, playerName: nm, playerId: myPlayerId },
		});
	};

	const sendKick = () => {
		const rid = String(roomId || '').trim();
		const target = String(kickTargetId || '').trim();
		if (!rid || !target || !myPlayerId) return;
		log?.('info', 'Sending /app/room.kick', { roomId: rid, targetPlayerId: target, playerId: myPlayerId });
		publishJson({
			destination: '/app/room.kick',
			headers: { 'player-id': String(myPlayerId) },
			body: { roomId: rid, targetPlayerId: target },
		});
	};

	const sendAction = () => {
		const rid = String(roomId || '').trim();
		const act = String(actionType || '').trim() || 'DRAW';
		if (!rid || !myPlayerId) return;
		log?.('info', 'Sending /app/room.action', { roomId: rid, actionType: act, playerId: myPlayerId });
		publishJson({
			destination: '/app/room.action',
			headers: { 'player-id': String(myPlayerId) },
			body: { roomId: rid, actionType: act, payload: null },
		});
	};

	const disconnectAll = async () => {
		log?.('info', 'DISCONNECT pressed');
		cleanupRoomSub();
		await disconnect();
		log?.('info', 'disconnect() finished');
	};

	return (
		<SafeAreaView style={styles.screen}>
			<View style={styles.container}>
				<Text style={styles.title}>WS CONNECT</Text>

				<View style={styles.row}>
					<Text style={styles.label}>URL</Text>
					<TextInput
						value={url}
						onChangeText={setUrl}
						autoCapitalize="none"
						autoCorrect={false}
						placeholder="ws://host:port/path"
						placeholderTextColor="#444"
						style={styles.input}
					/>
				</View>

				<View style={styles.twoCol}>
					<View style={styles.col}>
						<Text style={styles.label}>roomId</Text>
						<TextInput
							value={roomId}
							onChangeText={setRoomId}
							autoCapitalize="none"
							autoCorrect={false}
							style={styles.input}
						/>
					</View>
					<View style={styles.col}>
						<Text style={styles.label}>playerName</Text>
						<TextInput
							value={playerName}
							onChangeText={setPlayerName}
							autoCapitalize="none"
							autoCorrect={false}
							style={styles.input}
						/>
					</View>
				</View>

				<View style={styles.actions}>
					<Pressable
						onPress={connectAndJoin}
						style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
					>
						<Text style={styles.buttonText}>CONNECT + JOIN</Text>
					</Pressable>

					<Pressable
						onPress={disconnectAll}
						style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
					>
						<Text style={styles.buttonText}>DISCONNECT</Text>
					</Pressable>

					<Pressable
						onPress={sendStart}
						style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
					>
						<Text style={styles.buttonText}>START</Text>
					</Pressable>

					<Pressable
						onPress={clearLogs}
						style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
					>
						<Text style={styles.buttonText}>CLEAR</Text>
					</Pressable>

					<Pressable
						onPress={() => navigation?.navigate?.('CardTable')}
						style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
					>
						<Text style={styles.buttonText}>TABLE</Text>
					</Pressable>
				</View>

				<View style={styles.panel}>
					<Pressable
						onPress={() => setAdminPanelOpen((v) => !v)}
						style={({ pressed }) => [styles.panelHeader, pressed && styles.buttonPressed]}
					>
						<Text style={styles.panelHeaderText}>
							{adminPanelOpen ? '▼' : '▶'} KICK / ACTION
						</Text>
					</Pressable>

					{adminPanelOpen ? (
						<View style={styles.twoCol}>
							<View style={styles.col}>
								<Text style={styles.label}>kick targetPlayerId</Text>
								<TextInput
									value={kickTargetId}
									onChangeText={setKickTargetId}
									autoCapitalize="none"
									autoCorrect={false}
									style={styles.input}
								/>
								<Pressable
									onPress={sendKick}
									style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
								>
									<Text style={styles.buttonText}>KICK</Text>
								</Pressable>
							</View>
							<View style={styles.col}>
								<Text style={styles.label}>actionType</Text>
								<TextInput
									value={actionType}
									onChangeText={setActionType}
									autoCapitalize="characters"
									autoCorrect={false}
									style={styles.input}
								/>
								<Pressable
									onPress={sendAction}
									style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
								>
									<Text style={styles.buttonText}>SEND ACTION</Text>
								</Pressable>
							</View>
						</View>
					) : null}
				</View>

				<View style={styles.statusBar}>
					<Text style={styles.statusText}>STATUS: {status}</Text>
					{lastError ? <Text style={styles.errorText}>ERROR: {String(lastError)}</Text> : null}
					<Text style={styles.hintText}>{isConnected ? 'Connected' : 'Not connected'}</Text>
					<Text style={styles.hintText}>playerId: {myPlayerId ? String(myPlayerId) : '-'}</Text>
				</View>

				<View style={styles.logHeader}>
					<Text style={styles.logTitle}>LOGS ({logs.length})</Text>
				</View>

				<ScrollView style={styles.logBox} contentContainerStyle={styles.logBoxContent}>
					{logs.map((l, idx) => {
						const line = `[${formatTs(l.ts)}] ${String(l.level).toUpperCase()}: ${l.message}`;
						const data = l.data == null ? '' : ` ${typeof l.data === 'string' ? l.data : JSON.stringify(l.data)}`;
						return (
							<Text key={`${l.ts}-${idx}`} style={styles.logLine}>
								{line}
								{data}
							</Text>
						);
					})}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#d4d4d4' },
	container: { flex: 1, padding: 12, gap: 10 },
	title: {
		fontFamily: getMonospaceFontFamily(),
		fontSize: 20,
		color: '#000',
		marginBottom: 4,
	},
	row: { gap: 6 },
	label: { fontFamily: getMonospaceFontFamily(), color: '#000' },
	input: {
		fontFamily: getMonospaceFontFamily(),
		borderWidth: 4,
		borderColor: '#000',
		backgroundColor: '#fff',
		color: '#000',
		paddingHorizontal: 10,
		paddingVertical: 10,
	},
	twoCol: { flexDirection: 'row', gap: 10 },
	col: { flex: 1, gap: 6 },
	actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	button: {
		borderWidth: 4,
		borderColor: '#000',
		backgroundColor: '#fff',
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	buttonPressed: { transform: [{ scale: 1.02 }] },
	buttonText: { fontFamily: getMonospaceFontFamily(), color: '#000' },
	panel: { gap: 10 },
	panelHeader: {
		borderWidth: 4,
		borderColor: '#000',
		backgroundColor: '#fff',
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	panelHeaderText: { fontFamily: getMonospaceFontFamily(), color: '#000' },
	statusBar: {
		borderWidth: 4,
		borderColor: '#000',
		backgroundColor: '#fff',
		padding: 10,
		gap: 4,
	},
	statusText: { fontFamily: getMonospaceFontFamily(), color: '#000' },
	errorText: { fontFamily: getMonospaceFontFamily(), color: '#000' },
	hintText: { fontFamily: getMonospaceFontFamily(), color: '#000' },
	logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	logTitle: { fontFamily: getMonospaceFontFamily(), color: '#000' },
	logBox: {
		flex: 1,
		borderWidth: 4,
		borderColor: '#000',
		backgroundColor: '#fff',
	},
	logBoxContent: { padding: 10, gap: 6 },
	logLine: { fontFamily: getMonospaceFontFamily(), color: '#000', fontSize: 12 },
});

