// LobbyScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";

import { styles } from "./styles/LobbyScreen.styles";

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

// Mock rooms (şimdilik). Sonra backend’den çekersin.
const MOCK_ROOMS = [
  { id: "r1", title: "Hızlı Oda", players: 2, stake: "Normal" },
  { id: "r2", title: "Usta Masası", players: 3, stake: "Destekli" },
  { id: "r3", title: "Yeni Başlayanlar", players: 1, stake: "Normal" },
];

// Bu listeyi boş yaparsan “Hazır oda yok” görünür:
// const MOCK_ROOMS = [];

export default function LobbyScreen({ navigation }) {
  // views: 'home' | 'rooms' | 'create'
  const [view, setView] = useState("home");

  const [playerName, setPlayerName] = useState("BFK");
  const [coins] = useState(13988576);

  // rooms
  const [search, setSearch] = useState("");

  // create table
  const [createRoomId, setCreateRoomId] = useState("r1");
  const [createStake, setCreateStake] = useState("Normal");

  // --- Animations (logo pulse + particles) ---
  const logoPulse = useRef(new Animated.Value(0)).current;
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const p3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const particleLoop = (v, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();

    particleLoop(p1, 2600);
    particleLoop(p2, 3100);
    particleLoop(p3, 3600);
  }, [logoPulse, p1, p2, p3]);

  const logoScale = logoPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const logoRotate = logoPulse.interpolate({
    inputRange: [0, 1],
    outputRange: ["-2deg", "2deg"],
  });

  const filteredRooms = useMemo(() => {
    const q = String(search || "")
      .trim()
      .toLowerCase();
    if (!q) return MOCK_ROOMS;
    return MOCK_ROOMS.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.stake.toLowerCase().includes(q)
    );
  }, [search]);

  const goWaitingRoom = (roomId) => {
    navigation.navigate("ConnectWs", {
      roomId: String(roomId || "").trim() || "r1",
      playerName: String(playerName || "").trim() || "Player",
    });
  };

  const SubHeader = ({ title, onBack }) => (
    <View style={styles.subHeader}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backBtn,
          pressed ? { transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        <Text style={styles.backBtnText}>← GERİ</Text>
      </Pressable>

      <Text style={styles.subTitle}>{title}</Text>

      {/* sağ tarafı dengelemek için hayalet buton */}
      <View style={styles.ghostBtn} />
    </View>
  );

  // Particle dots (decor)
  const Particle = ({ anim, size, left, top, opacity = 0.25 }) => {
    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -18],
    });
    const translateX = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 12],
    });
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.15],
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left,
          top,
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: "rgba(56,189,248,1)",
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* background */}
      <View style={styles.bg} />
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowMid} />
      <View style={styles.bgGlowBottom} />

      {/* particles */}
      <Particle anim={p1} size={10} left={28} top={110} opacity={0.18} />
      <Particle anim={p2} size={14} left={310} top={150} opacity={0.14} />
      <Particle anim={p3} size={12} left={220} top={420} opacity={0.12} />

      <View style={styles.root}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(playerName)}</Text>
            </View>

            <View style={styles.nameChip}>
              <Text style={styles.nameText}>
                {String(playerName || "Player")}
              </Text>
              <Text style={styles.subText}>LEVEL 11 • Online</Text>
            </View>
          </View>

          <View style={styles.coinsChip}>
            <Text style={styles.coinsLabel}>COINS</Text>
            <Text style={styles.coinsValue}>
              {coins.toLocaleString("tr-TR")}
            </Text>
          </View>
        </View>

        {/* HOME */}
        {view === "home" ? (
          <View style={[styles.panel, { flex: 1 }]}>
            <View style={styles.panelInner}>
              {/* Hero header */}
              <View style={styles.heroHeader}>

                  <Animated.View
                    style={{
                      transform: [
                        { scale: logoScale },
                        { rotateZ: logoRotate },
                      ],
                    }}
                  >
                    <View style={styles.logoBadge}>
                      <Image
                        source={require("./assets/Cloviz Logo.png")}
                        style={styles.logoImage}
                        resizeMode="contain"
                      />
                    </View>
                  </Animated.View>
                

                <Text style={styles.heroDesc}>
                  Odaya gir veya masa aç. Oyuncular dolunca bekleme odasından
                  oyun ekranına geçiş yapacaksın.
                </Text>
              </View>

              {/* Main actions */}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => setView("rooms")}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed ? { transform: [{ scale: 0.99 }] } : null,
                  ]}
                >
                  <View style={[styles.actionBtnInner, styles.btnBlue]}>
                    <Text style={styles.btnTitle}>ODA SEÇ</Text>
                    <Text style={styles.btnSub}>Açık odalara göz at</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setView("create")}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed ? { transform: [{ scale: 0.99 }] } : null,
                  ]}
                >
                  <View style={[styles.actionBtnInner, styles.btnOrange]}>
                    <Text style={styles.btnTitle}>MASA AÇ</Text>
                    <Text style={styles.btnSub}>Yeni oda oluştur</Text>
                  </View>
                </Pressable>
              </View>

              {/* Optional demo */}
              <Pressable
                onPress={() => navigation.navigate("CardTable")}
                style={({ pressed }) => [
                  styles.wideBtn,
                  pressed ? { transform: [{ scale: 0.99 }] } : null,
                ]}
              >
                <View style={styles.wideBtnInner}>
                  <Text style={styles.btnTitle}>OYUN EKRANI (DEMO)</Text>
                  <Text style={styles.btnSub}>Mevcut oyun ekranına geç</Text>
                </View>
              </Pressable>

              {/* Player name quick edit */}
              <View style={styles.form}>
                <TextInput
                  value={playerName}
                  onChangeText={setPlayerName}
                  placeholder="Oyuncu adın"
                  placeholderTextColor="rgba(229,231,235,0.45)"
                  style={styles.input}
                  autoCapitalize="words"
                />
                <Text style={styles.hint}>
                  İpucu: Odaya girince ConnectWs ekranında “CONNECT + JOIN” ile
                  bekleme odasına düşeceksin.
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ROOMS */}
        {view === "rooms" ? (
          <View style={[styles.panel, { flex: 1 }]}>
            <View style={styles.panelInner}>
              <SubHeader title="ODA SEÇ" onBack={() => setView("home")} />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Ara: r1, hızlı, destekli..."
                placeholderTextColor="rgba(229,231,235,0.45)"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {filteredRooms.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Hazır oda yok.</Text>
                  <Text style={styles.emptyText}>
                    İstersen “Masa Aç” ile yeni oda oluşturup bekleyebilirsin.
                  </Text>
                  <Pressable
                    onPress={() => setView("create")}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed ? { transform: [{ scale: 0.99 }] } : null,
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>MASA AÇ</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.list}>
                  {filteredRooms.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => goWaitingRoom(r.id)}
                      style={({ pressed }) => [
                        styles.roomItem,
                        pressed ? { transform: [{ scale: 0.99 }] } : null,
                      ]}
                    >
                      <View style={styles.roomLeft}>
                        <Text style={styles.roomName}>
                          {r.title} ({r.id})
                        </Text>
                        <Text style={styles.roomMeta}>
                          {r.players}/4 • {r.stake}
                        </Text>
                      </View>
                      <View style={styles.joinPill}>
                        <Text style={styles.joinPillText}>GİR</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        ) : null}

        {/* CREATE TABLE */}
        {view === "create" ? (
          <View style={[styles.panel, { flex: 1 }]}>
            <View style={styles.panelInner}>
              <SubHeader title="MASA AÇ" onBack={() => setView("home")} />

              {/* Table visual */}
              <View style={styles.tableWrap}>
                <View style={styles.table}>
                  <View style={styles.tableInner} />

                  {/* Seats */}
                  <View
                    style={[
                      styles.seat,
                      {
                        top: 12,
                        left: "50%",
                        transform: [{ translateX: -31 }],
                      },
                    ]}
                  >
                    <Text style={styles.seatTitle}>P3</Text>
                    <Text style={styles.seatSub}>Bekleniyor</Text>
                  </View>

                  <View
                    style={[
                      styles.seat,
                      {
                        left: 12,
                        top: "50%",
                        transform: [{ translateY: -31 }],
                      },
                    ]}
                  >
                    <Text style={styles.seatTitle}>P2</Text>
                    <Text style={styles.seatSub}>Bekleniyor</Text>
                  </View>

                  <View
                    style={[
                      styles.seat,
                      {
                        right: 12,
                        top: "50%",
                        transform: [{ translateY: -31 }],
                      },
                    ]}
                  >
                    <Text style={styles.seatTitle}>P4</Text>
                    <Text style={styles.seatSub}>Bekleniyor</Text>
                  </View>

                  <View
                    style={[
                      styles.seat,
                      styles.youSeat,
                      {
                        bottom: 12,
                        left: "50%",
                        transform: [{ translateX: -31 }],
                      },
                    ]}
                  >
                    <Text style={styles.seatTitle}>YOU</Text>
                    <Text style={styles.seatSub}>
                      {String(playerName || "Player")}
                    </Text>
                  </View>

                  {/* Center chip */}
                  <View style={styles.centerChip}>
                    <Text style={styles.centerChipText}>KABO</Text>
                  </View>
                </View>
              </View>

              {/* Form */}
              <View style={styles.form}>
                <TextInput
                  value={createRoomId}
                  onChangeText={setCreateRoomId}
                  placeholder="Oda id (örn: r1)"
                  placeholderTextColor="rgba(229,231,235,0.45)"
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  value={createStake}
                  onChangeText={setCreateStake}
                  placeholder="Masa tipi (Normal/Destekli/Turnuva)"
                  placeholderTextColor="rgba(229,231,235,0.45)"
                  style={styles.input}
                  autoCapitalize="words"
                  autoCorrect={false}
                />

                <Pressable
                  onPress={() => {
                    const rid = String(createRoomId || "").trim() || "r1";
                    goWaitingRoom(rid);
                  }}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed ? { transform: [{ scale: 0.99 }] } : null,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>MASAYI AÇ + BEKLE</Text>
                </Pressable>

                <Text style={styles.hint}>
                  Bu ekranda “masa aç” sadece oda id belirleyip bekleme odasına
                  geçiriyor. Sonra backend’e gerçek “create room” eklediğimizde
                  burada çağıracağız.
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
