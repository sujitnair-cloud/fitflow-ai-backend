import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import type { OnboardingStackParamList } from '../types/auth';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

const FITNESS_LEVELS: { id: FitnessLevel; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={step.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[step.dot, i < current ? step.dotDone : i === current - 1 ? step.dotActive : step.dotFuture]}
        />
      ))}
    </View>
  );
}

const step = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 4, borderRadius: 2 },
  dotDone: { width: 20, backgroundColor: '#6C63FF' },
  dotActive: { width: 28, backgroundColor: '#6C63FF' },
  dotFuture: { width: 20, backgroundColor: '#2A2A4A' },
});

function Stepper({
  label,
  unit,
  value,
  min,
  max,
  onDecrement,
  onIncrement,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={st.row}>
      <Text style={st.label}>{label}</Text>
      <View style={st.controls}>
        <Pressable
          style={({ pressed }) => [st.btn, value <= min && st.btnDisabled, pressed && { opacity: 0.7 }]}
          onPress={onDecrement}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={20} color={value <= min ? '#333355' : '#9B9BB4'} />
        </Pressable>
        <View style={st.valueWrap}>
          <Text style={st.value}>{value}</Text>
          <Text style={st.unit}>{unit}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [st.btn, value >= max && st.btnDisabled, pressed && { opacity: 0.7 }]}
          onPress={onIncrement}
          disabled={value >= max}
        >
          <Ionicons name="add" size={20} color={value >= max ? '#333355' : '#9B9BB4'} />
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  label: { color: '#9B9BB4', fontSize: 15, fontWeight: '600', flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F0F23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  valueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 3, minWidth: 80, justifyContent: 'center' },
  value: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  unit: { color: '#666688', fontSize: 13, fontWeight: '600' },
});

export default function OnboardingProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { updateProfile } = useAuthStore();

  const [age, setAge] = useState(28);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('intermediate');

  function handleContinue() {
    updateProfile({ age, heightCm, weightKg, fitnessLevel });
    navigation.navigate('PARQ');
  }

  function handleSkip() {
    navigation.navigate('PARQ');
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Progress */}
          <View style={styles.progressRow}>
            <StepIndicator current={2} total={3} />
            <Text style={styles.stepLabel}>Step 2 of 3</Text>
          </View>

          {/* Header */}
          <Text style={styles.title}>Tell us about{'\n'}yourself</Text>
          <Text style={styles.subtitle}>
            Used to personalise calorie estimates and workout recommendations.
          </Text>

          {/* Body stats */}
          <Text style={styles.sectionLabel}>Body Stats</Text>
          <View style={styles.steppersWrap}>
            <Stepper
              label="Age"
              unit="yrs"
              value={age}
              min={13}
              max={100}
              onDecrement={() => setAge((v) => Math.max(13, v - 1))}
              onIncrement={() => setAge((v) => Math.min(100, v + 1))}
            />
            <Stepper
              label="Height"
              unit="cm"
              value={heightCm}
              min={100}
              max={250}
              onDecrement={() => setHeightCm((v) => Math.max(100, v - 1))}
              onIncrement={() => setHeightCm((v) => Math.min(250, v + 1))}
            />
            <Stepper
              label="Weight"
              unit="kg"
              value={weightKg}
              min={30}
              max={250}
              onDecrement={() => setWeightKg((v) => Math.max(30, v - 1))}
              onIncrement={() => setWeightKg((v) => Math.min(250, v + 1))}
            />
          </View>

          {/* Fitness level */}
          <Text style={styles.sectionLabel}>Current Fitness Level</Text>
          <View style={styles.levelRow}>
            {FITNESS_LEVELS.map((lvl) => {
              const isActive = fitnessLevel === lvl.id;
              return (
                <Pressable
                  key={lvl.id}
                  style={({ pressed }) => [
                    styles.levelChip,
                    isActive && styles.levelChipActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setFitnessLevel(lvl.id)}
                >
                  <Text style={[styles.levelChipText, isActive && styles.levelChipTextActive]}>
                    {lvl.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.88 }]}
              onPress={handleContinue}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  stepLabel: { color: '#444466', fontSize: 12, fontWeight: '600' },

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: { color: '#666688', fontSize: 15, lineHeight: 22, marginBottom: 28 },

  sectionLabel: {
    color: '#9B9BB4',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },

  steppersWrap: { gap: 10, marginBottom: 28 },

  levelRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  levelChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2A2A4A',
  },
  levelChipActive: { backgroundColor: '#6C63FF20', borderColor: '#6C63FF' },
  levelChipText: { color: '#666688', fontSize: 13, fontWeight: '700' },
  levelChipTextActive: { color: '#6C63FF' },

  actions: { gap: 12 },
  continueBtn: {
    height: 58,
    backgroundColor: '#6C63FF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  skipBtn: { alignItems: 'center', height: 44, justifyContent: 'center' },
  skipText: { color: '#444466', fontSize: 14, fontWeight: '600' },
});
