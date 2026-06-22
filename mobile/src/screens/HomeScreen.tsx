import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { fetchWorkouts, fetchSessions } from '../services/api';
import { calculateStreak, fmtDuration } from '../utils/stats';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList, Workout, WorkoutSession, WorkoutInterval } from '../types/workout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_W } = Dimensions.get('window');

// ── Quick-start preset definitions (mirror of TimerHomeScreen) ────────────────

interface QuickPreset {
  id: string;
  label: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  category: string;
  buildIntervals: () => WorkoutInterval[];
}

function makeIntervals(
  workLabel: string, workSec: number,
  restLabel: string, restSec: number,
  rounds: number, category: string,
): WorkoutInterval[] {
  const result: WorkoutInterval[] = [];
  let order = 1;
  for (let r = 1; r <= rounds; r++) {
    result.push({ id: `${category}-w-${r}`, workoutId: 'quick-timer', order: order++, label: workLabel, durationSec: workSec, type: 'work', roundGroup: r });
    result.push({ id: `${category}-r-${r}`, workoutId: 'quick-timer', order: order++, label: restLabel, durationSec: restSec, type: 'rest', roundGroup: r });
  }
  return result;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'work45', label: '45/15', color: '#FF6B35', icon: 'flame',
    title: 'Work 45 / Rest 15', category: 'hiit',
    buildIntervals: () => makeIntervals('Work', 45, 'Rest', 15, 8, 'hiit'),
  },
  {
    id: 'tabata', label: 'Tabata', color: '#C77DFF', icon: 'flash',
    title: 'Tabata 20/10', category: 'hiit',
    buildIntervals: () => makeIntervals('Push It!', 20, 'Rest', 10, 8, 'hiit'),
  },
  {
    id: 'walkjog', label: 'Walk/Jog', color: '#4ECDC4', icon: 'walk',
    title: 'Walk 3min / Jog 1min', category: 'walk_jog',
    buildIntervals: () => makeIntervals('Jog', 60, 'Walk', 180, 5, 'walk_jog'),
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  hiit: '#FF6B35', strength: '#C77DFF', walk_jog: '#4ECDC4',
  mobility: '#56CFE1', senior: '#80B918', pregnancy: '#F72585',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Still up?';
}

function workoutDurationMin(workout: Workout): number {
  return Math.round(workout.intervals.reduce((s, i) => s + i.durationSec, 0) / 60);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  title, action, onAction,
}: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function StreakBanner({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <View style={styles.streakBanner}>
      <View style={styles.streakLeft}>
        <View style={styles.streakIconWrap}>
          <Ionicons name="flame" size={24} color="#FF6B35" />
        </View>
        <View>
          <Text style={styles.streakCount}>
            {streak} Day{streak !== 1 ? 's' : ''} Streak
          </Text>
          <Text style={styles.streakSub}>
            {streak >= 7 ? 'On fire! Keep it going 🏆' : 'Keep the momentum!'}
          </Text>
        </View>
      </View>
      <View style={styles.streakDots}>
        {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
          <View key={i} style={[styles.streakDot, i === Math.min(streak, 7) - 1 && styles.streakDotActive]} />
        ))}
      </View>
    </View>
  );
}

function LastWorkoutCard({
  workout, onPress,
}: {
  workout: Workout; onPress: () => void;
}) {
  const color = CATEGORY_COLORS[workout.category] ?? '#6C63FF';
  const duration = workoutDurationMin(workout);
  return (
    <Pressable
      style={({ pressed }) => [styles.lastWorkoutCard, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={[styles.lastWorkoutAccent, { backgroundColor: color }]} />
      <View style={styles.lastWorkoutBody}>
        <Text style={[styles.lastWorkoutCat, { color }]}>
          {workout.category.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.lastWorkoutTitle} numberOfLines={2}>
          {workout.title}
        </Text>
        <Text style={styles.lastWorkoutMeta}>{duration} min · {workout.intervals.length} intervals</Text>
      </View>
      <View style={[styles.lastWorkoutPlayBtn, { backgroundColor: color }]}>
        <Ionicons name="play" size={18} color="#fff" />
      </View>
    </Pressable>
  );
}

function FirstWorkoutCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.firstWorkoutCard, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <Ionicons name="barbell-outline" size={28} color="#6C63FF" />
      <View style={styles.firstWorkoutText}>
        <Text style={styles.firstWorkoutTitle}>Start your first workout</Text>
        <Text style={styles.firstWorkoutSub}>Pick from the library or use a quick preset below</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6C63FF" />
    </Pressable>
  );
}

function QuickPresetChip({ preset, onPress }: { preset: QuickPreset; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.presetChip, { borderColor: preset.color }, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <Ionicons name={preset.icon} size={15} color={preset.color} />
      <Text style={[styles.presetChipLabel, { color: preset.color }]}>{preset.label}</Text>
    </Pressable>
  );
}

function LibraryMiniCard({ workout, onPress }: { workout: Workout; onPress: () => void }) {
  const color = CATEGORY_COLORS[workout.category] ?? '#6C63FF';
  const duration = workoutDurationMin(workout);
  return (
    <Pressable
      style={({ pressed }) => [styles.miniCard, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <View style={[styles.miniCardTop, { backgroundColor: `${color}18` }]}>
        <View style={[styles.miniCardDot, { backgroundColor: color }]} />
        <Text style={[styles.miniCardCat, { color }]}>
          {workout.category.replace('_', ' ').toUpperCase()}
        </Text>
      </View>
      <Text style={styles.miniCardTitle} numberOfLines={2}>{workout.title}</Text>
      <Text style={styles.miniCardDuration}>{duration} min</Text>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user, profile, isGuest } = useAuthStore();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      // Guests have no DB user — only load the workout library
      const [w, s] = await Promise.all([
        fetchWorkouts(),
        userId ? fetchSessions(userId) : Promise.resolve([]),
      ]);
      setWorkouts(w);
      setSessions(s);
    } catch {
      setError('Could not load data. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() {
    setRefreshing(true);
    load(true);
  }

  // ── Derived state ───────────────────────────────────────────────────────────
  const greeting = getGreeting();
  const firstName = isGuest ? 'Guest' : (user?.name?.split(' ')[0] ?? null);
  const greetingText = firstName ? `${greeting}, ${firstName}` : greeting;
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const streak = calculateStreak(sessions);
  const lastCompletedSession = sessions.find((s) => s.status === 'completed');
  const lastWorkout = lastCompletedSession
    ? workouts.find((w) => w.id === lastCompletedSession.workoutId) ?? null
    : null;

  function launchPreset(preset: QuickPreset) {
    navigation.navigate('WorkoutPlayer', {
      inMemoryWorkout: {
        title: preset.title,
        category: preset.category,
        intervals: preset.buildIntervals(),
      },
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6C63FF"
          />
        }
      >

        {/* ── Greeting ──────────────────────────────────────────────────── */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>{greetingText} 👋</Text>
            <Text style={styles.dateText}>{dateLabel}</Text>
          </View>
          <Pressable
            onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Profile' })}
            style={styles.avatarBtn}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {isGuest ? 'G' : (user?.name ? user.name[0].toUpperCase() : user?.email?.[0]?.toUpperCase() ?? 'F')}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Guest mode nudge */}
        {isGuest && (
          <Pressable
            style={styles.guestNudge}
            onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Profile' })}
          >
            <Ionicons name="person-add-outline" size={14} color="#4ECDC4" />
            <Text style={styles.guestNudgeText}>
              Create a free account to save your workouts and track progress
            </Text>
          </Pressable>
        )}

        {/* PAR-Q clearance warning */}
        {!isGuest && profile?.onboardingComplete && !profile?.parqCleared && (
          <Pressable
            style={styles.parqWarning}
            onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Profile' })}
          >
            <Ionicons name="warning" size={14} color="#FF6B35" />
            <Text style={styles.parqWarningText}>
              Doctor clearance recommended before exercising — tap to view profile
            </Text>
          </Pressable>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color="#FF6B35" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* ── Streak ────────────────────────────────────────────────────── */}
        <StreakBanner streak={streak} />

        {/* ── Last / First workout ──────────────────────────────────────── */}
        <SectionHeader
          title={lastWorkout ? 'Continue' : 'Get Started'}
          action={lastWorkout ? 'Library →' : undefined}
          onAction={() => navigation.navigate('WorkoutList')}
        />
        {lastWorkout ? (
          <LastWorkoutCard
            workout={lastWorkout}
            onPress={() => navigation.navigate('WorkoutPlayer', { workoutId: lastWorkout.id })}
          />
        ) : (
          <FirstWorkoutCard onPress={() => navigation.navigate('WorkoutList')} />
        )}

        {/* ── Quick Start ───────────────────────────────────────────────── */}
        <SectionHeader
          title="Quick Start"
          action="More →"
          onAction={() => {
            // Navigate to Timer tab
            (navigation as any).navigate('MainTabs', { screen: 'Timer' });
          }}
        />
        <View style={styles.presetsRow}>
          {QUICK_PRESETS.map((p) => (
            <QuickPresetChip
              key={p.id}
              preset={p}
              onPress={() => launchPreset(p)}
            />
          ))}
        </View>

        {/* ── Library Preview ───────────────────────────────────────────── */}
        {workouts.length > 0 && (
          <>
            <SectionHeader
              title="Workout Library"
              action="See all →"
              onAction={() => navigation.navigate('WorkoutList')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.libraryRow}
            >
              {workouts.map((workout) => (
                <LibraryMiniCard
                  key={workout.id}
                  workout={workout}
                  onPress={() => navigation.navigate('WorkoutPlayer', { workoutId: workout.id })}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Today's stats (if sessions exist) ─────────────────────────── */}
        {sessions.filter((s) => s.status === 'completed').length > 0 && (
          <>
            <SectionHeader
              title="Your Progress"
              action="Full history →"
              onAction={() => (navigation as any).navigate('MainTabs', { screen: 'Progress' })}
            />
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>
                  {sessions.filter((s) => s.status === 'completed').length}
                </Text>
                <Text style={styles.miniStatLabel}>Workouts</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{streak}</Text>
                <Text style={styles.miniStatLabel}>Day streak</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>
                  {fmtDuration(sessions.reduce((s, sess) => s + (sess.durationSec ?? 0), 0))}
                </Text>
                <Text style={styles.miniStatLabel}>Total time</Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#0F0F23', alignItems: 'center', justifyContent: 'center' },

  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greetingText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 3 },
  dateText: { color: '#666688', fontSize: 14 },

  avatarBtn: { padding: 2 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  guestNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A1E1E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4ECDC430',
  },
  guestNudgeText: { color: '#4ECDC4', fontSize: 13, flex: 1, lineHeight: 18 },

  parqWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A0E08',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B3530',
  },
  parqWarningText: { color: '#FF6B35', fontSize: 12, flex: 1, lineHeight: 17 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1008', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorBannerText: { color: '#FF6B35', fontSize: 12, flex: 1 },

  // Streak banner
  streakBanner: {
    backgroundColor: '#1A0E08',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FF6B3530',
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FF6B3520', alignItems: 'center', justifyContent: 'center',
  },
  streakCount: { color: '#FF6B35', fontSize: 17, fontWeight: '800' },
  streakSub: { color: '#884422', fontSize: 12, marginTop: 2 },
  streakDots: { flexDirection: 'row', gap: 4 },
  streakDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B3540' },
  streakDotActive: { backgroundColor: '#FF6B35' },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, marginTop: 4,
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  sectionAction: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },

  // Last workout card
  lastWorkoutCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
    minHeight: 80,
  },
  lastWorkoutAccent: { width: 5, alignSelf: 'stretch' },
  lastWorkoutBody: { flex: 1, padding: 16 },
  lastWorkoutCat: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  lastWorkoutTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  lastWorkoutMeta: { color: '#666688', fontSize: 13 },
  lastWorkoutPlayBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },

  // First workout card
  firstWorkoutCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#6C63FF30',
  },
  firstWorkoutText: { flex: 1 },
  firstWorkoutTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 3 },
  firstWorkoutSub: { color: '#666688', fontSize: 12, lineHeight: 17 },

  // Quick preset chips
  presetsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  presetChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#1A1A2E',
  },
  presetChipLabel: { fontSize: 13, fontWeight: '700' },

  // Library mini cards
  libraryRow: { gap: 12, paddingBottom: 4, marginBottom: 24 },
  miniCard: {
    width: SCREEN_W * 0.42,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    overflow: 'hidden',
  },
  miniCardTop: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniCardDot: { width: 6, height: 6, borderRadius: 3 },
  miniCardCat: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  miniCardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, lineHeight: 19 },
  miniCardDuration: { color: '#666688', fontSize: 12, paddingHorizontal: 12, paddingBottom: 12 },

  // Mini stats
  miniStatsRow: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  miniStat: { flex: 1, alignItems: 'center' },
  miniStatValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 3 },
  miniStatLabel: { color: '#666688', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  miniStatDivider: { width: 1, height: 36, backgroundColor: '#2A2A4A' },
});
