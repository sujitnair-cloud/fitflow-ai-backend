import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import DevConnectionBanner from './src/components/DevConnectionBanner';

export default function App() {
  const [fontsLoaded] = useFonts(Ionicons.font);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0F0F23' }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {__DEV__ && <DevConnectionBanner />}
      <AppNavigator />
    </SafeAreaProvider>
  );
}
