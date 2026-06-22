import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import type { OnboardingStackParamList } from '../types/auth';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

interface GoalOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

const GOALS: GoalOption[] = [
  {
    id: 'weight_loss',
    label: 'Lose Weight',
    description: 'Burn fat with interval and cardio workouts',
    icon: 'flame',
    color: '#FF6B35',
  },
  {
    id: 'strength',
    label: 'Build Strength',
    description: 'Increase muscle mass and power',
    icon: 'barbell',
    color: '#C77DFF',
  },
  {
    id: 'cardio',
    label: 'Boost Cardio',
    description: 'Improve endurance and heart health',
    icon: 'heart',
    color: '#4ECDC4',
  },
  {
    id: 'flexibility',
    label: 'Flexibility & Mobility',
    description: 'Reduce stress and improve range of motion',
    icon: 'body',
    color: '#56CFE1',
  },
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

export default function OnboardingGoalScreen() {
  const navigation = useNavigation<Nav>();
  const { updateProfile } = useAuthStore();
  const [selected, setSelected] = useState<string | null>(null);

  function handleContinue() {
    if (!selected) return;
    updateProfile({ goal: selected });
    navigation.navigate('OnboardingProfile');
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* Progress indicator */}
          <View style={styles.progressRow}>
            <StepIndicator current={1} total={3} />
            <Text style={styles.stepLabel}>Step 1 of 3</Text>
          </View>

          {/* Header */}
          <Text style={styles.title}>What's your{'\n'}main goal?</Text>
          <Text style={styles.subtitle}>We'll tailor workouts to what matters most to you.</Text>

          {/* Goal cards */}
          <View style={styles.goalsWrap}>
            {GOALS.map((goal) => {
              const isSelected = selected === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  style={({ pressed }) => [
                    styles.goalCard,
                    isSelected && { borderColor: goal.color, backgroundColor: `${goal.color}12` },
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => setSelected(goal.id)}
                >
                  <View style={[styles.goalIcon, { backgroundColor: `${goal.color}22` }]}>
                    <Ionicons name={goal.icon} size={26} color={goal.color} />
                  </View>
                  <View style={styles.goalText}>
                    <Text style={[styles.goalLabel, isSelected && { color: goal.color }]}>
                      {goal.label}
                    </Text>
                    <Text style={styles.goalDesc}>{goal.description}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={goal.color} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Continue button */}
          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              !selected && styles.continueBtnDisabled,
              pressed && !!selected && { opacity: 0.88 },
            ]}
            onPress={handleContinue}
            disabled={!selected}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>

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

  goalsWrap: { gap: 12, marginBottom: 28 },
  goalCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A4A',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  goalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalText: { flex: 1 },
  goalLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  goalDesc: { color: '#666688', fontSize: 13, lineHeight: 18 },

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
  continueBtnDisabled: { backgroundColor: '#2A2A4A', shadowOpacity: 0 },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
