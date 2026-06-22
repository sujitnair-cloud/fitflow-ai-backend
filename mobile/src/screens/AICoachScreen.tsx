import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AICoachScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Coach</Text>
      <Text style={styles.subtitle}>Personalised workout generation</Text>
      <Text style={styles.placeholder}>[ Phase 6 — LLM-powered workout builder with safety guardrails ]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F23', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9B9BB4', fontSize: 16, marginBottom: 24 },
  placeholder: { color: '#444466', fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});
