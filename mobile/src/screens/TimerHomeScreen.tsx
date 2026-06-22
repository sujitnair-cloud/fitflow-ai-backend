import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList, WorkoutInterval } from '../types/workout';
import { getMusicProfile } from '../hooks/useMusicEngine';
import { useAuthStore } from '../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Preset definitions ───────────────────────────────────────────────────────

interface Preset {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  totalMin: number;
  category: string;
  buildIntervals: () => WorkoutInterval[];
}

interface PresetCardProps {
  preset: Preset;
  onPress: () => void;
  musicGenre?: string;
  musicEmoji?: string;
  musicColor?: string;
}

function makeIntervals(
  workLabel: string,
  workSec: number,
  restLabel: string,
  restSec: number,
  rounds: number,
  category: string,
): WorkoutInterval[] {
  const result: WorkoutInterval[] = [];
  let order = 1;
  for (let r = 1; r <= rounds; r++) {
    result.push({
      id: `${category}-w-${r}`,
      workoutId: 'quick-timer',
      order: order++,
      label: workLabel,
      durationSec: workSec,
      type: 'work',
      roundGroup: r,
    });
    result.push({
      id: `${category}-r-${r}`,
      workoutId: 'quick-timer',
      order: order++,
      label: restLabel,
      durationSec: restSec,
      type: 'rest',
      roundGroup: r,
    });
  }
  return result;
}

const PRESETS: Preset[] = [
  {
    id: 'work45-rest15',
    title: 'Work 45 / Rest 15',
    subtitle: '8 rounds · 8 min',
    tag: 'Fat-burn classic',
    icon: 'flame',
    color: '#FF6B35',
    totalMin: 8,
    category: 'hiit',
    buildIntervals: () => makeIntervals('Work', 45, 'Rest', 15, 8, 'hiit'),
  },
  {
    id: 'tabata',
    title: 'Tabata 20/10',
    subtitle: '8 rounds · 4 min',
    tag: 'Max intensity',
    icon: 'flash',
    color: '#C77DFF',
    totalMin: 4,
    category: 'hiit',
    buildIntervals: () => makeIntervals('Push It!', 20, 'Rest', 10, 8, 'hiit'),
  },
  {
    id: 'walk-jog',
    title: 'Walk 3min / Jog 1min',
    subtitle: '5 rounds · 20 min',
    tag: 'Cardio builder',
    icon: 'walk',
    color: '#4ECDC4',
    totalMin: 20,
    category: 'walk_jog',
    buildIntervals: () => makeIntervals('Jog', 60, 'Walk', 180, 5, 'walk_jog'),
  },
];

// ── Components ───────────────────────────────────────────────────────────────

function PresetCard({ preset, onPress, musicGenre, musicEmoji, musicColor }: PresetCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.presetCard, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Left color bar */}
      <View style={[styles.colorBar, { backgroundColor: preset.color }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: `${preset.color}22` }]}>
        <Ionicons name={preset.icon} size={26} color={preset.color} />
      </View>

      {/* Text */}
      <View style={styles.presetText}>
        <View style={styles.presetTitleRow}>
          <Text style={styles.presetTitle}>{preset.title}</Text>
          <View style={[styles.tagChip, { backgroundColor: `${preset.color}22` }]}>
            <Text style={[styles.tagText, { color: preset.color }]}>{preset.tag}</Text>
          </View>
        </View>
        <View style={styles.presetBottomRow}>
          <Text style={styles.presetSubtitle}>{preset.subtitle}</Text>
          {musicGenre && musicColor && (
            <View style={[styles.musicChip, { backgroundColor: `${musicColor}18` }]}>
              <Text style={[styles.musicChipText, { color: musicColor }]}>
                {musicEmoji} {musicGenre}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Play button */}
      <View style={[styles.playBtn, { backgroundColor: preset.color }]}>
        <Ionicons name="play" size={16} color="#fff" />
      </View>
    </Pressable>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function TimerHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { profile: userProfile } = useAuthStore();

  function launchPreset(preset: Preset) {
    navigation.navigate('WorkoutPlayer', {
      inMemoryWorkout: {
        title: preset.title,
        category: preset.category,
        intervals: preset.buildIntervals(),
      },
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Quick Start section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="flash" size={16} color="#6C63FF" />
          <Text style={styles.sectionTitle}>Quick Start</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Tap a preset — it starts immediately, no setup needed.
        </Text>

        {PRESETS.map((preset) => {
          const mp = getMusicProfile(userProfile?.age, preset.category);
          return (
            <PresetCard
              key={preset.id}
              preset={preset}
              onPress={() => launchPreset(preset)}
              musicGenre={mp.genre}
              musicEmoji={mp.emoji}
              musicColor={mp.accentColor}
            />
          );
        })}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Custom Builder entry */}
        <Pressable
          style={({ pressed }) => [styles.buildBtn, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('CustomBuilder')}
        >
          <View style={styles.buildBtnLeft}>
            <View style={styles.buildIconWrap}>
              <Ionicons name="construct" size={22} color="#6C63FF" />
            </View>
            <View>
              <Text style={styles.buildBtnTitle}>Build Custom Workout</Text>
              <Text style={styles.buildBtnSub}>
                Set your own intervals, rounds, and labels
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#444466" />
        </Pressable>

        {/* Library shortcut */}
        <Pressable
          style={({ pressed }) => [styles.libraryBtn, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate('WorkoutList')}
        >
          <Ionicons name="library-outline" size={18} color="#9B9BB4" />
          <Text style={styles.libraryBtnText}>Browse Workout Library</Text>
          <Ionicons name="chevron-forward" size={16} color="#444466" />
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  scroll: { padding: 20, paddingBottom: 40 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  sectionDesc: { color: '#666688', fontSize: 13, marginBottom: 16, lineHeight: 19 },

  presetCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    minHeight: 76,
  },
  cardPressed: { opacity: 0.8 },
  colorBar: { width: 4, alignSelf: 'stretch' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    marginRight: 12,
  },
  presetText: { flex: 1, paddingVertical: 14 },
  presetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  presetTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  tagChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  presetBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  presetSubtitle: { color: '#666688', fontSize: 13 },
  musicChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  musicChipText: { fontSize: 10, fontWeight: '600' },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginLeft: 8,
  },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E1E3A' },
  dividerText: { color: '#444466', fontSize: 13, fontWeight: '600' },

  buildBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    marginBottom: 12,
  },
  buildBtnLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  buildIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6C63FF22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildBtnTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  buildBtnSub: { color: '#666688', fontSize: 12 },

  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  libraryBtnText: { flex: 1, color: '#9B9BB4', fontSize: 14, fontWeight: '600' },
});
