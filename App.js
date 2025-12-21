import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import LobbyScreen from "./components/LobbyScreen";
import CardTableScreen from "./CardTableScreen.js";

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [playerName, setPlayerName] = useState(null);

  return (
    <View style={styles.container}>
      {!roomId ? (
        <LobbyScreen />
      ) : (
        <CardTableScreen roomId={roomId} playerName={playerName} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
});
