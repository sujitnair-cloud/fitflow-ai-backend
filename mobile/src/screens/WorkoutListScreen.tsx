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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { fetchWorkouts } from '../services/api';
import type { Workout, RootStackParamList } from '../types/workout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Category config ───────────────────────────────────────────────────────────

interface CategoryConfig {
  id: string;
  label: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  description: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'hiit',      label: 'HIIT',          color: '#FF6B35', icon: 'flame',   description: 'High-intensity intervals for fat burn' },
  { id: 'strength',  label: 'Strength',       color: '#C77DFF', icon: 'barbell', description: 'Build muscle and power' },
  { id: 'walk_jog',  label: 'Walk / Jog',     color: '#4ECDC4', icon: 'walk',    description: 'Cardio base-building for all levels' },
  { id: 'mobility',  label: 'Mobility',       color: '#56CFE1', icon: 'body',    description: 'Flexibility and recovery' },
  { id: 'senior',    label: 'Senior',         color: '#80B918', icon: 'heart',   description: 'Gentle movement for active ageing' },
  { id: 'pregnancy', label: 'Pregnancy',      color: '#F72585', icon: 'star',    description: 'Safe prenatal exercise' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function workoutDurationMin(w: Workout): number {
  return Math.round(w.intervals.reduce((s, i) => s + i.durationSec, 0) / 60);
}

function totalRounds(w: Workout): number {
  return w.intervals.length > 0
    ? Math.max(...w.intervals.map((i) => i.roundGroup))
    : 1;
}

function groupByCategory(workouts: Workout[]): Map<string, Workout[]> {
  const map = new Map<string, Workout[]>();
  for (const w of workouts) {
    const existing = map.get(w.category) ?? [];
    map.set(w.category, [...existing, w]);
  }
  return map;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryHeader({ cat }: { cat: CategoryConfig }) {
  return (
    <View style={styles.catHeader}>
      <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}20` }]}>
        <Ionicons name={cat.icon} size={18} color={cat.color} />
      </View>
      <View>
        <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
        <Text style={styles.catDesc}>{cat.description}</Text>
      </View>
    </View>
  );
}

function WorkoutCard({
  workout,
  color,
  onPress,
}: {
  workout: Workout;
  color: string;
  onPress: () => void;
}) {
  const durationMin = workoutDurationMin(workout);
  const rounds = totalRounds(workout);
  const workCount = workout.intervals.filter((i) => i.type === 'work').length;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{workout.title}</Text>
        {workout.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{workout.description}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={12} color="#666688" />
            <Text style={styles.metaText}>{durationMin} min</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="repeat-outline" size={12} color="#666688" />
            <Text style={styles.metaText}>{rounds} round{rounds !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="flash-outline" size={12} color="#666688" />
            <Text style={styles.metaText}>{workCount} exercises</Text>
          </View>
        </View>
      </View>
      <View style={[styles.cardPlayBtn, { backgroundColor: `${color}20` }]}>
        <Ionicons name="play" size={16} color={color} />
      </View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function WorkoutListScreen() {
  const navigation = useNavigation<Nav>();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkouts();
      setWorkouts(data);
    } catch {
      setError('Could not load workouts. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() { setRefreshing(true); load(true); }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading workouts…</Text>
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

  if (workouts.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="barbell-outline" size={48} color="#444466" />
        <Text style={styles.errorText}>No workouts found. Run the seed script.</Text>
        <Pressable style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const grouped = groupByCategory(workouts);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
        }
      >
        <Text style={styles.pageSubtitle}>
          {workouts.length} workout{workouts.length !== 1 ? 's' : ''} available
        </Text>

        {CATEGORIES.map((cat) => {
          const catWorkouts = grouped.get(cat.id);
          if (!catWorkouts || catWorkouts.length === 0) return null;

          return (
            <View key={cat.id} style={styles.catSection}>
              <CategoryHeader cat={cat} />
              {catWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  color={cat.color}
                  onPress={() =>
                    navigation.navigate('WorkoutPlayer', { workoutId: workout.id })
                  }
                />
              ))}
            </View>
          );
        })}

        {/* Workouts with unknown categories rendered at the bottom */}
        {(() => {
          const knownIds = new Set(CATEGORIES.map((c) => c.id));
          const unknown = workouts.filter((w) => !knownIds.has(w.category));
          if (unknown.length === 0) return null;
          return (
            <View style={styles.catSection}>
              <Text style={styles.catLabel}>Other</Text>
              {unknown.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  color="#6C63FF"
                  onPress={() =>
                    navigation.navigate('WorkoutPlayer', { workoutId: workout.id })
                  }
                />
              ))}
            </View>
          );
        })()}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  scroll: { padding: 16, paddingBottom: 40 },
  pageSubtitle: {
    color: '#444466', fontSize: 13, fontWeight: '600',
    letterSpacing: 0.5, marginBottom: 20,
  },

  catSection: { marginBottom: 28 },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  catIconWrap: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 16, fontWeight: '800' },
  catDesc: { color: '#555577', fontSize: 12, marginTop: 1 },

  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    minHeight: 72,
  },
  cardPressed: { opacity: 0.8 },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: '#666688', fontSize: 12, lineHeight: 17, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#666688', fontSize: 12 },
  cardPlayBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },

  centered: {
    flex: 1, backgroundColor: '#0F0F23', alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  loadingText: { color: '#9B9BB4', marginTop: 12, fontSize: 14 },
  errorText: { color: '#9B9BB4', fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  retryBtn: { marginTop: 20, backgroundColor: '#6C63FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
