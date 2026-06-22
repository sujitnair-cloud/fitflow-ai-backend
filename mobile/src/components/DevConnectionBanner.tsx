import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { checkHealth } from '../services/api';

type ConnectionState = 'checking' | 'connected' | 'error';

export default function DevConnectionBanner() {
  const [state, setState] = useState<ConnectionState>('checking');

  useEffect(() => {
    checkHealth()
      .then(() => setState('connected'))
      .catch(() => setState('error'));
  }, []);

  const bgColor =
    state === 'connected' ? '#1a7a4a' : state === 'error' ? '#7a1a1a' : '#444';

  const label =
    state === 'connected'
      ? 'Backend connected'
      : state === 'error'
      ? 'Backend unreachable'
      : 'Checking backend…';

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
