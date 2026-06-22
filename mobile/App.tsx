import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import DevConnectionBanner from './src/components/DevConnectionBanner';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {__DEV__ && <DevConnectionBanner />}
      <AppNavigator />
    </SafeAreaProvider>
  );
}
