import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { postSession } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../types/workout';

type SummaryRoute = RouteProp<RootStackParamList, 'WorkoutSummary'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const MET: Record<string, number> = {
  hiit: 8,
  strength: 5,
  walk_jog: 4.5,
  mobility: 3,
  senior: 2.5,
  pregnancy: 2.5,
};

function estimateCalories(category: string, durationSec: number, weightKg: number): number {
  const met = MET[category] ?? 4;
  return Math.max(1, Math.round(met * weightKg * (durationSec / 3600)));
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function WorkoutSummaryScreen() {
  const route = useRoute<SummaryRoute>();
  const navigation = useNavigation<Nav>();
  const { user, profile, isGuest } = useAuthStore();
  const {
    workoutId,
    workoutTitle,
    workoutCategory,
    durationSec,
    roundsCompleted,
    startedAt,
    skipSession,
  } = route.params;

  const weightKg = profile?.weightKg ?? 70;
  const calories = estimateCalories(workoutCategory, durationSec, weightKg);
  const sessionPostedRef = useRef(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    // Guests have no DB account — skip session POST entirely
    if (isGuest || skipSession || !workoutId || !user?.id) return;
    if (sessionPostedRef.current) return;
    sessionPostedRef.current = true;

    postSession({
      userId: user.id,
      workoutId,
      status: 'completed',
      startedAt,
      completedAt: new Date().toISOString(),
      durationSec,
    }).catch(() => setSaveError(true));
  }, [workoutId, durationSec, startedAt, skipSession, isGuest, user?.id]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.trophyWrap}>
            <Ionicons name="trophy" size={48} color="#FFD700" />
          </View>
          <Text style={styles.headline}>Workout Complete!</Text>
          <Text style={styles.subheadline}>{workoutTitle}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="time-outline"
            value={formatDuration(durationSec)}
            label="Duration"
            color="#6C63FF"
          />
          <StatCard
            icon="repeat-outline"
            value={String(roundsCompleted)}
            label="Rounds"
            color="#FF6B35"
          />
          <StatCard
            icon="flame-outline"
            value={`~${calories}`}
            label="kcal est."
            color="#4ECDC4"
          />
        </View>

        <Text style={styles.calNote}>
          Calorie estimate based on MET × {weightKg} kg bodyweight.{'\n'}
          {!profile?.weightKg && 'Update your weight in Profile for accuracy.'}
        </Text>

        {saveError && (
          <View style={styles.saveErrorBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color="#FF6B35" />
            <Text style={styles.saveErrorText}>
              Session not saved — backend unreachable
            </Text>
          </View>
        )}

        {/* Guest account nudge */}
        {isGuest && (
          <Pressable
            style={styles.guestNudge}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Ionicons name="person-add-outline" size={16} color="#4ECDC4" />
            <Text style={styles.guestNudgeText}>
              Create a free account to save this workout and track your progress over time
            </Text>
          </Pressable>
        )}

        {/* CTA */}
        <View style={styles.ctaZone}>
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
          {workoutId && (
            <Pressable
              style={({ pressed }) => [styles.againBtn, pressed && { opacity: 0.75 }]}
              onPress={() => navigation.replace('WorkoutPlayer', { workoutId })}
            >
              <Ionicons name="refresh" size={16} color="#6C63FF" />
              <Text style={styles.againBtnText}>Do it again</Text>
            </Pressable>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  safeArea: { flex: 1, paddingHorizontal: 24 },

  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  trophyWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1A1810',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  subheadline: {
    color: '#9B9BB4',
    fontSize: 16,
    fontWeight: '500',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#666688',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  calNote: {
    color: '#444466',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },

  saveErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1008',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  saveErrorText: { color: '#FF6B35', fontSize: 12 },

  guestNudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0A1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4ECDC430',
  },
  guestNudgeText: { color: '#4ECDC4', fontSize: 13, flex: 1, lineHeight: 18 },

  ctaZone: { marginTop: 'auto', paddingBottom: 8, gap: 12 },
  doneBtn: {
    backgroundColor: '#6C63FF',
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  againBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
  },
  againBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '700' },
});
