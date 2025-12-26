import 'react-native-gesture-handler';
import * as React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import MainScreen from './MainScreen';
import CardTableScreen from './CardTableScreen';
import ConnectWsScreen from './ConnectWsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="CardTable" component={CardTableScreen} />
        <Stack.Screen name="ConnectWs" component={ConnectWsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}