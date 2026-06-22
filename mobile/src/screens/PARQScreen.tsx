import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { updateProfile } from '../services/api';

const PAR_Q_QUESTIONS = [
  'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
  'Do you feel pain in your chest when you do physical activity?',
  'In the past month, have you had chest pain when you were NOT doing physical activity?',
  'Do you lose your balance because of dizziness, or do you ever lose consciousness?',
  'Do you have a bone or joint problem (e.g. back, knee or hip) that could be made worse by physical activity?',
  'Is your doctor currently prescribing medication for your blood pressure or heart condition?',
  'Do you know of any other reason why you should not do physical activity?',
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

function QuestionRow({
  index,
  text,
  answer,
  onAnswer,
}: {
  index: number;
  text: string;
  answer: boolean | null;
  onAnswer: (val: boolean) => void;
}) {
  return (
    <View style={q.wrap}>
      <View style={q.row}>
        <View style={q.numberWrap}>
          <Text style={q.number}>{index + 1}</Text>
        </View>
        <Text style={q.text}>{text}</Text>
      </View>
      <View style={q.btnRow}>
        <Pressable
          style={({ pressed }) => [
            q.btn,
            answer === false && q.btnNo,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => onAnswer(false)}
        >
          <Text style={[q.btnText, answer === false && q.btnTextNo]}>NO</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            q.btn,
            answer === true && q.btnYes,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => onAnswer(true)}
        >
          <Text style={[q.btnText, answer === true && q.btnTextYes]}>YES</Text>
        </Pressable>
      </View>
    </View>
  );
}

const q = StyleSheet.create({
  wrap: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  numberWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0F0F23',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  number: { color: '#6C63FF', fontSize: 12, fontWeight: '800' },
  text: { color: '#CCCCDD', fontSize: 14, lineHeight: 20, flex: 1 },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0F0F23',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2A2A4A',
  },
  btnYes: { backgroundColor: '#FF6B3515', borderColor: '#FF6B35' },
  btnNo: { backgroundColor: '#4ECDC415', borderColor: '#4ECDC4' },
  btnText: { color: '#666688', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  btnTextYes: { color: '#FF6B35' },
  btnTextNo: { color: '#4ECDC4' },
});

export default function PARQScreen() {
  const { token, profile, updateProfile: updateStoreProfile, updateUser } = useAuthStore();
  const [answers, setAnswers] = useState<(boolean | null)[]>(
    Array(PAR_Q_QUESTIONS.length).fill(null),
  );
  const [loading, setLoading] = useState(false);
  const [showClearanceModal, setShowClearanceModal] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const anyYes = answers.some((a) => a === true);

  function setAnswer(index: number, val: boolean) {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  }

  async function saveAndFinish(parqCleared: boolean) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await updateProfile(token, {
        age: profile?.age ?? undefined,
        heightCm: profile?.heightCm ?? undefined,
        weightKg: profile?.weightKg ?? undefined,
        fitnessLevel: profile?.fitnessLevel ?? undefined,
        goal: profile?.goal ?? undefined,
        mode: profile?.mode ?? 'standard',
        parqCleared,
        onboardingComplete: true,
      });
      updateStoreProfile({
        ...res.profile,
        parqCleared: res.profile.parqCleared,
        onboardingComplete: true,
      });
      if (res.user.name !== undefined) {
        updateUser({ name: res.user.name });
      }
    } catch {
      // Even if the save fails, complete onboarding locally so the user isn't stuck
      updateStoreProfile({ parqCleared, onboardingComplete: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!allAnswered) return;
    if (anyYes) {
      setShowClearanceModal(true);
    } else {
      await saveAndFinish(true);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* Progress */}
          <View style={styles.progressRow}>
            <StepIndicator current={3} total={3} />
            <Text style={styles.stepLabel}>Step 3 of 3</Text>
          </View>

          {/* Header */}
          <View style={styles.shieldRow}>
            <View style={styles.shieldIcon}>
              <Ionicons name="shield-checkmark" size={28} color="#6C63FF" />
            </View>
          </View>
          <Text style={styles.title}>Physical Activity{'\n'}Readiness</Text>
          <Text style={styles.subtitle}>
            Please answer YES or NO to each question honestly. This helps us keep you safe.
          </Text>

          {/* Questions */}
          <View style={styles.questions}>
            {PAR_Q_QUESTIONS.map((text, i) => (
              <QuestionRow
                key={i}
                index={i}
                text={text}
                answer={answers[i]}
                onAnswer={(val) => setAnswer(i, val)}
              />
            ))}
          </View>

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              (!allAnswered || loading) && styles.submitBtnDisabled,
              pressed && allAnswered && { opacity: 0.88 },
            ]}
            onPress={handleSubmit}
            disabled={!allAnswered || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>
                  {allAnswered ? 'Complete Setup' : `Answer all ${PAR_Q_QUESTIONS.length} questions`}
                </Text>
                {allAnswered && <Ionicons name="checkmark" size={18} color="#fff" />}
              </>
            )}
          </Pressable>

        </ScrollView>
      </SafeAreaView>

      {/* Doctor clearance modal */}
      <Modal
        visible={showClearanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearanceModal(false)}
      >
        <View style={modal.overlay}>
          <View style={modal.card}>
            <View style={modal.iconWrap}>
              <Ionicons name="medical" size={32} color="#FF6B35" />
            </View>
            <Text style={modal.title}>Medical Clearance Recommended</Text>
            <Text style={modal.body}>
              Based on your answers, we recommend consulting your doctor before starting a workout
              program.{'\n\n'}
              You can still explore FitFlow AI, but please seek medical clearance before exercising
              vigorously.
            </Text>
            <Pressable
              style={({ pressed }) => [modal.continueBtn, pressed && { opacity: 0.85 }]}
              onPress={async () => {
                setShowClearanceModal(false);
                await saveAndFinish(false);
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modal.continueBtnText}>I understand, continue anyway</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    gap: 16,
    borderWidth: 1,
    borderColor: '#FF6B3530',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FF6B3515',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: '#9B9BB4',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  continueBtn: {
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepLabel: { color: '#444466', fontSize: 12, fontWeight: '600' },

  shieldRow: { alignItems: 'flex-start', marginBottom: 12 },
  shieldIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#6C63FF15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: { color: '#666688', fontSize: 14, lineHeight: 21, marginBottom: 24 },

  questions: { gap: 10, marginBottom: 28 },

  submitBtn: {
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
  submitBtnDisabled: { backgroundColor: '#2A2A4A', shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
