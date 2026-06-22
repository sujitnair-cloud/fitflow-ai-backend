import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types/auth';
import { useAuthStore } from '../store/authStore';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

// Visual preview of interval timer concept: alternating work/rest bars
function IntervalBarsDecoration() {
  const segments = [
    { color: '#FF6B35', flex: 3 },
    { color: '#4ECDC4', flex: 1 },
    { color: '#FF6B35', flex: 3 },
    { color: '#4ECDC4', flex: 1 },
    { color: '#FF6B35', flex: 3 },
    { color: '#4ECDC4', flex: 1 },
    { color: '#FF6B35', flex: 2 },
  ];
  return (
    <View style={deco.row}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={[deco.bar, { flex: s.flex, backgroundColor: s.color, opacity: 0.85 }]}
        />
      ))}
    </View>
  );
}

const deco = StyleSheet.create({
  row: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 3 },
  bar: { borderRadius: 4 },
});

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Logo mark */}
          <View style={styles.logoMark}>
            <View style={styles.logoInner}>
              <Text style={styles.logoLetter}>F</Text>
            </View>
          </View>

          <Text style={styles.appName}>FitFlow AI</Text>
          <Text style={styles.tagline}>Your Workout.{'\n'}Your Rhythm. Your Coach.</Text>

          {/* Interval bars decoration */}
          <View style={styles.decoWrap}>
            <IntervalBarsDecoration />
            <View style={styles.decoLabels}>
              <Text style={styles.decoLabelWork}>WORK</Text>
              <Text style={styles.decoLabelRest}>REST</Text>
              <Text style={styles.decoLabelWork}>WORK</Text>
            </View>
          </View>

          {/* Feature tags */}
          <View style={styles.tagsRow}>
            {['Voice Cues', 'Haptics', 'Interval Timer'].map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <View style={styles.cta}>
          {/* Primary: create account / sign in */}
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.primaryBtnText}>Get Started — Create Account</Text>
          </Pressable>

          {/* Guest mode: full app access, no sign-up */}
          <Pressable
            style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.8 }]}
            onPress={enterGuestMode}
          >
            <Text style={styles.guestBtnText}>Try for Free</Text>
            <Text style={styles.guestBtnSub}>No sign-up · No OTP · Full access</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  safe: { flex: 1, paddingHorizontal: 28 },

  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },

  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  logoInner: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#8B84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },

  appName: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 4,
  },
  tagline: {
    color: '#9B9BB4',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },

  decoWrap: { width: '100%', gap: 10, marginTop: 8 },
  decoLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  decoLabelWork: { color: '#FF6B3580', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  decoLabelRest: { color: '#4ECDC480', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  tag: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  tagText: { color: '#666688', fontSize: 12, fontWeight: '600' },

  cta: { paddingBottom: 12, gap: 10 },

  primaryBtn: {
    height: 58,
    backgroundColor: '#6C63FF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  guestBtn: {
    height: 64,
    backgroundColor: 'transparent',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  guestBtnText: {
    color: '#4ECDC4',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  guestBtnSub: {
    color: '#4ECDC480',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  secondaryBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#555577',
    fontSize: 14,
    fontWeight: '600',
  },
});
