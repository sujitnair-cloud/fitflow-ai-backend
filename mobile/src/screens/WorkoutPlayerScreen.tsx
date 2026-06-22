import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { fetchWorkout } from '../services/api';
import { useWorkoutEngine } from '../hooks/useWorkoutEngine';
import { useWorkoutAudio } from '../hooks/useWorkoutAudio';
import { useMusicEngine, getMusicProfile } from '../hooks/useMusicEngine';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList, Workout, WorkoutInterval } from '../types/workout';

type PlayerRoute = RouteProp<RootStackParamList, 'WorkoutPlayer'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const WORK_COLOR = '#FF6B35';
const REST_COLOR = '#4ECDC4';
const BG_DARK = '#0F0F23';
const WORK_BG_TINT = '#1A0E08';
const REST_BG_TINT = '#081A1A';

function formatTime(seconds: number): string {
  const total = Math.ceil(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ToggleIconBtn({
  iconOn, iconOff, enabled, onToggle, color,
}: {
  iconOn: React.ComponentProps<typeof Ionicons>['name'];
  iconOff: React.ComponentProps<typeof Ionicons>['name'];
  enabled: boolean;
  onToggle: () => void;
  color: string;
}) {
  return (
    <Pressable onPress={onToggle} hitSlop={12} style={styles.toggleBtn}>
      <Ionicons name={enabled ? iconOn : iconOff} size={22} color={enabled ? color : '#444466'} />
    </Pressable>
  );
}

function ControlBtn({
  label, icon, onPress, style, textStyle,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  style?: object;
  textStyle?: object;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.controlBtn, style, pressed && styles.controlBtnPressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={[styles.controlBtnLabel, textStyle]}>{label}</Text>
    </Pressable>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Wraps an in-memory workout into the same shape as a fetched Workout
function inMemoryToWorkout(im: NonNullable<PlayerRoute['params']['inMemoryWorkout']>): Workout {
  return {
    id: 'in-memory',
    title: im.title,
    category: im.category,
    description: null,
    intervals: im.intervals,
    createdAt: new Date().toISOString(),
  };
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutPlayerScreen() {
  useKeepAwake();

  const route = useRoute<PlayerRoute>();
  const navigation = useNavigation<Nav>();
  const { workoutId, inMemoryWorkout } = route.params;
  const { profile: userProfile } = useAuthStore();

  const [workout, setWorkout] = useState<Workout | null>(
    inMemoryWorkout ? inMemoryToWorkout(inMemoryWorkout) : null,
  );
  const [loading, setLoading] = useState(!inMemoryWorkout);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const startedAtRef = useRef<string>('');

  const bgAnim = useRef(new Animated.Value(0)).current;

  const audio = useWorkoutAudio();

  const animateToBg = useCallback(
    (type: WorkoutInterval['type']) => {
      Animated.timing(bgAnim, {
        toValue: type === 'rest' ? 1 : 0,
        duration: 600,
        useNativeDriver: false,
      }).start();
    },
    [bgAnim],
  );

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [WORK_BG_TINT, REST_BG_TINT],
  });

  const intervals = workout?.intervals ?? [];

  // Current interval type for music engine (default to 'work' before start)
  const [currentIntervalType, setCurrentIntervalType] = useState<'work' | 'rest'>('work');
  const musicProfile = workout
    ? getMusicProfile(userProfile?.age, workout.category)
    : null;
  const music = useMusicEngine(musicProfile, currentIntervalType === 'work');

  const engine = useWorkoutEngine(intervals, {
    onIntervalChange: useCallback(
      (current: WorkoutInterval, _next: WorkoutInterval | null) => {
        audio.announceInterval(current.label, current.type);
        animateToBg(current.type);
        setCurrentIntervalType(current.type);
      },
      [audio, animateToBg],
    ),
    onCountdown: useCallback((n: number) => audio.announceCountdown(n), [audio]),
    onHalfway: useCallback(() => audio.announceHalfway(), [audio]),
    onComplete: useCallback(() => { audio.announceComplete(); music.stopMusic(); }, [audio, music]),
  });

  const { state, controls } = engine;
  const currentInterval = intervals[state.currentIntervalIndex];
  const nextInterval = intervals[state.currentIntervalIndex + 1] ?? null;
  const accentColor = currentInterval?.type === 'rest' ? REST_COLOR : WORK_COLOR;
  const overallProgress =
    state.totalDurationSec > 0 ? state.elapsedTotal / state.totalDurationSec : 0;

  // ── Fetch from DB only when not in-memory ────────────────────────────────
  useEffect(() => {
    if (inMemoryWorkout) return; // already set in initial state
    if (!workoutId) {
      setFetchError('No workout specified');
      setLoading(false);
      return;
    }
    fetchWorkout(workoutId)
      .then((data: Workout) => setWorkout(data))
      .catch(() => setFetchError('Failed to load workout'))
      .finally(() => setLoading(false));
  }, [workoutId, inMemoryWorkout]);

  // ── Auto-start once workout is ready ────────────────────────────────────
  useEffect(() => {
    if (workout && !started && intervals.length > 0) {
      setStarted(true);
      startedAtRef.current = new Date().toISOString();
      controls.start();
    }
  }, [workout, started, intervals.length, controls]);

  // ── Navigate to summary on completion ───────────────────────────────────
  useEffect(() => {
    if (state.isComplete && workout) {
      navigation.replace('WorkoutSummary', {
        workoutId: workout.id !== 'in-memory' ? workout.id : undefined,
        workoutTitle: workout.title,
        workoutCategory: workout.category,
        durationSec: Math.round(state.elapsedTotal),
        roundsCompleted: state.currentRound,
        intervalsCompleted: state.currentIntervalIndex,
        startedAt: startedAtRef.current,
        skipSession: workout.id === 'in-memory',
      });
    }
  }, [state.isComplete, workout, navigation, state]);

  // Wrap pause/resume to also sync music
  const handlePause = useCallback(() => {
    controls.pause();
    music.pauseMusic();
  }, [controls, music]);

  const handleResume = useCallback(() => {
    controls.resume();
    music.resumeMusic();
  }, [controls, music]);

  // ── End early ────────────────────────────────────────────────────────────
  const handleEnd = useCallback(() => {
    if (state.isPaused || !state.isRunning) {
      music.stopMusic();
      controls.end();
      return;
    }
    handlePause();
    Alert.alert('End Workout?', 'Your progress will be saved up to this point.', [
      { text: 'Keep Going', style: 'cancel', onPress: handleResume },
      { text: 'End Workout', style: 'destructive', onPress: () => { music.stopMusic(); controls.end(); } },
    ]);
  }, [state.isPaused, state.isRunning, controls, music, handlePause, handleResume]);

  // ────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (fetchError || !workout) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color="#444466" />
        <Text style={styles.errorText}>{fetchError ?? 'Unknown error'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.root, { backgroundColor: bgColor }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.toggleRow}>
            <ToggleIconBtn
              iconOn="volume-high" iconOff="volume-mute"
              enabled={audio.voiceEnabled}
              onToggle={() => audio.setVoiceEnabled((v) => !v)}
              color={accentColor}
            />
            <ToggleIconBtn
              iconOn="phone-portrait" iconOff="phone-portrait-outline"
              enabled={audio.hapticsEnabled}
              onToggle={() => audio.setHapticsEnabled((h) => !h)}
              color={accentColor}
            />
            {music.isWebPlatform && (
              <ToggleIconBtn
                iconOn="musical-notes" iconOff="musical-notes-outline"
                enabled={music.musicEnabled}
                onToggle={music.toggleMusic}
                color={musicProfile?.accentColor ?? accentColor}
              />
            )}
          </View>

          {/* Title + music profile label */}
          <View style={styles.titleBlock}>
            <Text style={styles.workoutTitle} numberOfLines={1}>{workout.title}</Text>
            {music.musicEnabled && musicProfile && (
              <Text style={[styles.musicLabel, { color: musicProfile.accentColor }]}>
                {musicProfile.emoji} {musicProfile.label} · {musicProfile.bpm} BPM
              </Text>
            )}
          </View>

          <Pressable onPress={handleEnd} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#666688" />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${Math.min(overallProgress * 100, 100)}%`, backgroundColor: accentColor },
            ]}
          />
        </View>

        {/* Round indicator */}
        <Text style={styles.roundLabel}>
          Round {state.currentRound} of {state.totalRounds}
        </Text>

        {/* Timer */}
        <View style={styles.timerZone}>
          <Text style={[styles.timerText, { color: accentColor }]}>
            {formatTime(state.timeRemaining)}
          </Text>
          <View style={[styles.typeBadge, { borderColor: accentColor }]}>
            <View style={[styles.typeDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.typeText, { color: accentColor }]}>
              {currentInterval?.type === 'rest' ? 'REST' : 'WORK'}
            </Text>
          </View>
        </View>

        {/* Exercise name */}
        <View style={styles.exerciseZone}>
          <Text style={styles.exerciseName} adjustsFontSizeToFit numberOfLines={2}>
            {currentInterval?.label ?? '—'}
          </Text>
          {nextInterval ? (
            <View style={styles.nextUpRow}>
              <Text style={styles.nextUpLabel}>Next: </Text>
              <Text style={styles.nextUpText}>{nextInterval.label}</Text>
            </View>
          ) : (
            <Text style={styles.nextUpLabel}>Last interval!</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsZone}>
          {currentInterval?.type === 'rest' && state.isRunning && (
            <Pressable style={styles.addTimeBtn} onPress={() => controls.addRestTime(30)}>
              <Ionicons name="add-circle-outline" size={18} color="#9B9BB4" />
              <Text style={styles.addTimeText}>+30s rest</Text>
            </Pressable>
          )}
          <View style={styles.mainControls}>
            <ControlBtn
              label={state.isRunning ? 'Pause' : 'Resume'}
              icon={state.isRunning ? 'pause' : 'play'}
              onPress={state.isRunning ? handlePause : handleResume}
              style={[styles.pauseBtn, { borderColor: accentColor }]}
              textStyle={{ color: accentColor }}
            />
            <ControlBtn
              label="Skip" icon="play-skip-forward"
              onPress={controls.skipToNext}
              style={styles.skipBtn}
            />
          </View>
          <Pressable
            style={({ pressed }) => [styles.endBtn, pressed && { opacity: 0.7 }]}
            onPress={handleEnd}
          >
            <Text style={styles.endBtnText}>End Workout</Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DARK },
  safeArea: { flex: 1 },
  centered: {
    flex: 1, backgroundColor: BG_DARK, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  errorText: { color: '#9B9BB4', marginTop: 16, textAlign: 'center', fontSize: 14 },
  backBtn: { marginTop: 20, backgroundColor: '#6C63FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  toggleRow: { flexDirection: 'row', gap: 4 },
  toggleBtn: { padding: 6 },
  titleBlock: { flex: 1, alignItems: 'center' },
  workoutTitle: { color: '#666688', fontSize: 13, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 },
  musicLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, marginTop: 2 },
  closeBtn: { padding: 6 },
  progressTrack: { height: 4, backgroundColor: '#1E1E3A' },
  progressFill: { height: 4, borderRadius: 2 },
  roundLabel: {
    color: '#666688', fontSize: 13, fontWeight: '600', textAlign: 'center',
    marginTop: 16, letterSpacing: 0.5, textTransform: 'uppercase',
  },
  timerZone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  timerText: {
    fontSize: SCREEN_W * 0.28, fontWeight: '800',
    fontVariant: ['tabular-nums'], letterSpacing: -2, lineHeight: SCREEN_W * 0.32,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginTop: 12, gap: 6,
  },
  typeDot: { width: 7, height: 7, borderRadius: 4 },
  typeText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  exerciseZone: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 },
  exerciseName: {
    color: '#FFFFFF', fontSize: SCREEN_H * 0.042, fontWeight: '800',
    textAlign: 'center', letterSpacing: 0.5, maxWidth: SCREEN_W * 0.85,
  },
  nextUpRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  nextUpLabel: { color: '#555577', fontSize: 14, fontWeight: '500' },
  nextUpText: { color: '#9B9BB4', fontSize: 14, fontWeight: '600' },
  controlsZone: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingVertical: 6 },
  addTimeText: { color: '#9B9BB4', fontSize: 13, fontWeight: '600' },
  mainControls: { flexDirection: 'row', gap: 12 },
  controlBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 60, borderRadius: 16, backgroundColor: '#1A1A2E',
  },
  controlBtnPressed: { opacity: 0.75 },
  controlBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pauseBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
  skipBtn: { maxWidth: 100, flex: 0, paddingHorizontal: 20, backgroundColor: '#1A1A2E' },
  endBtn: { height: 52, borderRadius: 14, backgroundColor: '#2A1A1A', alignItems: 'center', justifyContent: 'center' },
  endBtnText: { color: '#FF4444', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
