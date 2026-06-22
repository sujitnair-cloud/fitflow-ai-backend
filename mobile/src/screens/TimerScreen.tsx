import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TimerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timer</Text>
      <Text style={styles.subtitle}>Workout player & quick timer</Text>
      <Text style={styles.placeholder}>[ Phase 2 — workout player engine with voice, beeps, and haptics ]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9B9BB4', fontSize: 16, marginBottom: 24 },
  placeholder: { color: '#444466', fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});
