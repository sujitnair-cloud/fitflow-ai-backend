import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { fetchSessions, fetchWorkouts } from '../services/api';
import {
  calculateStreak,
  getWeeklyBars,
  calcTotals,
  fmtDuration,
  fmtSessionDate,
  WeekBar,
} from '../utils/stats';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList, Workout, WorkoutSession } from '../types/workout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORY_COLORS: Record<string, string> = {
  hiit: '#FF6B35', strength: '#C77DFF', walk_jog: '#4ECDC4',
  mobility: '#56CFE1', senior: '#80B918', pregnancy: '#F72585',
};

const MET: Record<string, number> = {
  hiit: 8, strength: 5, walk_jog: 4.5, mobility: 3, senior: 2.5, pregnancy: 2.5,
};

function sessionCalories(session: WorkoutSession, category: string, weightKg: number): number {
  const met = MET[category] ?? 4;
  return Math.max(1, Math.round(met * weightKg * ((session.durationSec ?? 0) / 3600)));
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, value, label, color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Weekly bar chart ──────────────────────────────────────────────────────────

const BAR_MAX_H = 80;

function WeeklyChart({ bars }: { bars: WeekBar[] }) {
  const maxCount = Math.max(...bars.map((b) => b.count), 1);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartBars}>
        {bars.map((bar, i) => {
          const fillH = Math.max((bar.count / maxCount) * BAR_MAX_H, bar.count > 0 ? 4 : 0);
          const isCurrentWeek = i === bars.length - 1;
          return (
            <View key={i} style={styles.barCol}>
              {/* Count label above bar */}
              {bar.count > 0 && (
                <Text style={[styles.barCount, isCurrentWeek && styles.barCountActive]}>
                  {bar.count}
                </Text>
              )}
              {/* Track */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: fillH },
                    isCurrentWeek && styles.barFillActive,
                  ]}
                />
              </View>
              {/* Week label */}
              <Text
                style={[styles.barLabel, isCurrentWeek && styles.barLabelActive]}
                numberOfLines={1}
              >
                {bar.label}
              </Text>
            </View>
          );
        })}
      </View>
      {/* Baseline */}
      <View style={styles.chartBaseline} />
    </View>
  );
}

// ── Session history row ───────────────────────────────────────────────────────

function SessionRow({
  session,
  workoutTitle,
  workoutCategory,
  weightKg,
  onPress,
}: {
  session: WorkoutSession;
  workoutTitle: string;
  workoutCategory: string;
  weightKg: number;
  onPress: () => void;
}) {
  const color = CATEGORY_COLORS[workoutCategory] ?? '#6C63FF';
  const calories = sessionCalories(session, workoutCategory, weightKg);
  const dur = fmtDuration(session.durationSec ?? 0);
  const dateStr = session.completedAt ? fmtSessionDate(session.completedAt) : '—';

  return (
    <Pressable
      style={({ pressed }) => [styles.sessionRow, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <View style={[styles.sessionDot, { backgroundColor: color }]} />
      <View style={styles.sessionBody}>
        <Text style={styles.sessionTitle} numberOfLines={1}>{workoutTitle}</Text>
        <Text style={styles.sessionMeta}>{dur} · ~{calories} kcal</Text>
      </View>
      <Text style={styles.sessionDate}>{dateStr}</Text>
    </Pressable>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyProgress({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="trophy-outline" size={56} color="#333355" />
      <Text style={styles.emptyTitle}>No workouts yet</Text>
      <Text style={styles.emptySubtitle}>
        Complete your first workout and your history will appear here.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
        onPress={onStart}
      >
        <Ionicons name="play" size={16} color="#fff" />
        <Text style={styles.emptyBtnText}>Start a Workout</Text>
      </Pressable>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const navigation = useNavigation<Nav>();
  const { user, profile, isGuest } = useAuthStore();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [s, w] = await Promise.all([
        userId ? fetchSessions(userId) : Promise.resolve([]),
        fetchWorkouts(),
      ]);
      setSessions(s);
      setWorkouts(w);
    } catch {
      setError('Could not load data. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() { setRefreshing(true); load(true); }

  // ── Derived values ─────────────────────────────────────────────────────────
  const workoutMap = Object.fromEntries(
    workouts.map((w) => [w.id, { title: w.title, category: w.category }]),
  );

  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const streak = calculateStreak(sessions);
  const bars = getWeeklyBars(sessions, 7);
  const weightKg = profile?.weightKg ?? 70;
  const totals = calcTotals(sessions, workoutMap, weightKg);

  const hasActivity = completedSessions.length > 0;

  // ────────────────────────────────────────────────────────────────────────────
  // Guests have no account — show a sign-up prompt instead of progress
  if (isGuest) {
    return (
      <View style={styles.centered}>
        <View style={styles.guestIcon}>
          <Ionicons name="bar-chart-outline" size={48} color="#6C63FF" />
        </View>
        <Text style={styles.guestTitle}>Track Your Progress</Text>
        <Text style={styles.guestBody}>
          Create a free account to save every workout, see your streak, track calories burned, and chart your improvement week by week.
        </Text>
        <Pressable
          style={styles.guestBtn}
          onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Profile' })}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.guestBtnText}>Create Free Account</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#444466" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!hasActivity) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <EmptyProgress
          onStart={() => navigation.navigate('WorkoutList')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
        }
      >

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsRow}>
          <StatCard
            icon="checkmark-circle-outline"
            value={String(totals.completedCount)}
            label="Workouts"
            color="#6C63FF"
          />
          <StatCard
            icon="flame-outline"
            value={`${streak}d`}
            label="Streak"
            color="#FF6B35"
          />
          <StatCard
            icon="time-outline"
            value={fmtDuration(totals.totalDurationSec)}
            label="Total time"
            color="#4ECDC4"
          />
          <StatCard
            icon="flash-outline"
            value={`~${totals.totalCalories}`}
            label="kcal est."
            color="#C77DFF"
          />
        </View>

        {/* ── Weekly activity chart ───────────────────────────────────── */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Activity</Text>
            <Text style={styles.sectionSub}>Last 7 weeks</Text>
          </View>
          {bars.every((b) => b.count === 0) ? (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>No completed workouts in the last 7 weeks</Text>
            </View>
          ) : (
            <WeeklyChart bars={bars} />
          )}
        </View>

        {/* ── Session history ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>History</Text>
          <Text style={styles.sectionSub}>{completedSessions.length} sessions</Text>
        </View>

        {completedSessions.map((session) => {
          const meta = workoutMap[session.workoutId];
          return (
            <SessionRow
              key={session.id}
              session={session}
              workoutTitle={meta?.title ?? 'Unknown Workout'}
              workoutCategory={meta?.category ?? 'hiit'}
              weightKg={weightKg}
              onPress={() => {
                if (meta) {
                  navigation.navigate('WorkoutPlayer', { workoutId: session.workoutId });
                }
              }}
            />
          );
        })}

        <Text style={styles.calDisclaimer}>
          Calorie estimates use MET × {weightKg} kg.
          {!profile?.weightKg && ' Update your weight in Profile for accuracy.'}
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  scroll: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: '#0F0F23', alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { color: '#9B9BB4', fontSize: 14, textAlign: 'center', marginTop: 16 },
  retryBtn: { marginTop: 20, backgroundColor: '#6C63FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  guestIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#6C63FF18', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  guestTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  guestBody: { color: '#9B9BB4', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  guestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#6C63FF', borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 16,
  },
  guestBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  sectionSub: { color: '#444466', fontSize: 12, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#444466', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

  // Chart
  chartSection: { marginBottom: 28 },
  chartWrap: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16 },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_MAX_H + 40,
    paddingBottom: 8,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barCount: { color: '#666688', fontSize: 10, fontWeight: '700' },
  barCountActive: { color: '#6C63FF' },
  barTrack: {
    width: '60%',
    height: BAR_MAX_H,
    backgroundColor: '#0F0F23',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#333355',
    borderRadius: 4,
  },
  barFillActive: { backgroundColor: '#6C63FF' },
  barLabel: { color: '#444466', fontSize: 9, fontWeight: '600', textAlign: 'center' },
  barLabelActive: { color: '#9B9BB4' },
  chartBaseline: { height: 1, backgroundColor: '#2A2A4A', marginTop: 4 },
  chartEmpty: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  chartEmptyText: { color: '#444466', fontSize: 13, textAlign: 'center' },

  // Session rows
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionBody: { flex: 1 },
  sessionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  sessionMeta: { color: '#666688', fontSize: 12 },
  sessionDate: { color: '#444466', fontSize: 12, fontWeight: '600' },

  calDisclaimer: {
    color: '#333355', fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 17,
  },

  // Empty state
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 8 },
  emptySubtitle: { color: '#666688', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#6C63FF', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
