import React from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getMonospaceFontFamily } from './lib/ui';

export default function MainScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.root}>
        <Text style={styles.title}>CLOVIZ</Text>

        <Pressable
          onPress={() => navigation.navigate('CardTable')}
          style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonText}>ENTER TABLE</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ConnectWs')}
          style={({ pressed }) => [styles.buttonWs, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.buttonText}>CONNECT TO WS</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#d4d4d4' },
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontFamily: getMonospaceFontFamily(), fontSize: 22, color: '#000', marginBottom: 16 },
  button: {
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...(Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 } },
      android: { elevation: 6 },
      default: {},
    }) || {}),
  },
  buttonWs: {
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    ...(Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 } },
      android: { elevation: 6 },
      default: {},
    }) || {}),
  },
  buttonPressed: { transform: [{ scale: 1.02 }] },
  buttonText: { fontFamily: getMonospaceFontFamily(), color: '#000' },
});