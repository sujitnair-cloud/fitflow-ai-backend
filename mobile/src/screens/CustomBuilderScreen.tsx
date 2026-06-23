import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { createWorkout } from '../services/api';
import type { RootStackParamList, WorkoutInterval } from '../types/workout';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalInterval {
  key: string;
  label: string;
  durationSec: number;
  type: 'work' | 'rest';
}

const CATEGORIES = [
  { id: 'hiit', label: 'HIIT', color: '#FF6B35' },
  { id: 'strength', label: 'Strength', color: '#C77DFF' },
  { id: 'walk_jog', label: 'Walk/Jog', color: '#4ECDC4' },
  { id: 'mobility', label: 'Mobility', color: '#56CFE1' },
  { id: 'senior', label: 'Senior', color: '#80B918' },
];

const DURATION_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];

// Starter template shown by default so users see how intervals work
const STARTER_INTERVALS: LocalInterval[] = [
  { key: 'starter-1', label: 'Jumping Jacks', durationSec: 20, type: 'work' },
  { key: 'starter-2', label: 'Rest', durationSec: 10, type: 'rest' },
  { key: 'starter-3', label: 'High Knees', durationSec: 20, type: 'work' },
  { key: 'starter-4', label: 'Rest', durationSec: 10, type: 'rest' },
];

let _keyCounter = 0;
function nextKey() {
  return `interval-${++_keyCounter}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDur(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function buildWorkoutIntervals(
  localIntervals: LocalInterval[],
  rounds: number,
): WorkoutInterval[] {
  const result: WorkoutInterval[] = [];
  let order = 1;
  for (let r = 1; r <= rounds; r++) {
    for (const li of localIntervals) {
      result.push({
        id: `${li.key}-r${r}`,
        workoutId: 'custom',
        order: order++,
        label: li.label,
        durationSec: li.durationSec,
        type: li.type,
        roundGroup: r,
      });
    }
  }
  return result;
}

function totalDurationSec(localIntervals: LocalInterval[], rounds: number): number {
  return localIntervals.reduce((s, i) => s + i.durationSec, 0) * rounds;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IntervalRow({
  interval,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  onEdit,
}: {
  interval: LocalInterval;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const accentColor = interval.type === 'work' ? '#FF6B35' : '#4ECDC4';
  return (
    <View style={styles.intervalRow}>
      {/* Reorder column */}
      <View style={styles.reorderCol}>
        <Pressable
          onPress={onMoveUp}
          disabled={index === 0}
          hitSlop={8}
          style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
        >
          <Ionicons name="chevron-up" size={16} color={index === 0 ? '#333355' : '#9B9BB4'} />
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={index === total - 1}
          hitSlop={8}
          style={[styles.reorderBtn, index === total - 1 && styles.reorderBtnDisabled]}
        >
          <Ionicons name="chevron-down" size={16} color={index === total - 1 ? '#333355' : '#9B9BB4'} />
        </Pressable>
      </View>

      {/* Content */}
      <View style={[styles.intervalContent, { borderLeftColor: accentColor }]}>
        <Text style={styles.intervalLabel} numberOfLines={1}>{interval.label}</Text>
        <View style={styles.intervalMeta}>
          <View style={[styles.typePill, { backgroundColor: `${accentColor}22` }]}>
            <Text style={[styles.typePillText, { color: accentColor }]}>
              {interval.type.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.intervalDuration}>{formatDur(interval.durationSec)}</Text>
        </View>
      </View>

      {/* Edit */}
      <Pressable onPress={onEdit} hitSlop={10} style={styles.editBtn}>
        <Ionicons name="create-outline" size={18} color="#6C63FF" />
      </Pressable>

      {/* Delete */}
      <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
        <Ionicons name="close-circle" size={20} color="#444466" />
      </Pressable>
    </View>
  );
}

// ── Add/Edit form — controlled from parent so Edit can pre-fill it ─────────────

function AddIntervalForm({
  onAdd,
  label, setLabel,
  durationSec, setDurationSec,
  type, setType,
}: {
  onAdd: (li: LocalInterval) => void;
  label: string;
  setLabel: (v: string) => void;
  durationSec: number;
  setDurationSec: (v: number) => void;
  type: 'work' | 'rest';
  setType: (v: 'work' | 'rest') => void;
}) {
  function handleAdd() {
    const trimmed = label.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Give this interval a name before adding.');
      return;
    }
    onAdd({ key: nextKey(), label: trimmed, durationSec, type });
    setLabel('');
    setDurationSec(30);
    setType('work');
  }

  return (
    <View style={styles.addForm}>
      <Text style={styles.addFormTitle}>Add Interval</Text>

      {/* Label input */}
      <TextInput
        style={styles.labelInput}
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Jumping Jacks, Rest…"
        placeholderTextColor="#444466"
        returnKeyType="done"
        maxLength={40}
      />

      {/* Duration chips */}
      <Text style={styles.addFormSub}>Duration</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.durationChips}
      >
        {DURATION_PRESETS.map((sec) => (
          <Pressable
            key={sec}
            style={[styles.durationChip, durationSec === sec && styles.durationChipActive]}
            onPress={() => setDurationSec(sec)}
          >
            <Text
              style={[
                styles.durationChipText,
                durationSec === sec && styles.durationChipTextActive,
              ]}
            >
              {formatDur(sec)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Type toggle */}
      <Text style={styles.addFormSub}>Type</Text>
      <View style={styles.typeToggleRow}>
        <Pressable
          style={[styles.typeToggleBtn, type === 'work' && styles.typeToggleWork]}
          onPress={() => setType('work')}
        >
          <Ionicons name="flame" size={14} color={type === 'work' ? '#fff' : '#666688'} />
          <Text style={[styles.typeToggleLabel, type === 'work' && { color: '#fff' }]}>
            WORK
          </Text>
        </Pressable>
        <Pressable
          style={[styles.typeToggleBtn, type === 'rest' && styles.typeToggleRest]}
          onPress={() => setType('rest')}
        >
          <Ionicons name="pause-circle" size={14} color={type === 'rest' ? '#fff' : '#666688'} />
          <Text style={[styles.typeToggleLabel, type === 'rest' && { color: '#fff' }]}>
            REST
          </Text>
        </Pressable>
      </View>

      {/* Add button */}
      <Pressable
        style={({ pressed }) => [styles.addIntervalBtn, pressed && { opacity: 0.8 }]}
        onPress={handleAdd}
      >
        <Ionicons name="add" size={18} color="#6C63FF" />
        <Text style={styles.addIntervalBtnText}>Add</Text>
      </Pressable>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CustomBuilderScreen() {
  const navigation = useNavigation<Nav>();
  const scrollRef = useRef<ScrollView>(null);

  const [title, setTitle] = useState('My Workout');
  const [category, setCategory] = useState('hiit');
  const [rounds, setRounds] = useState(3);
  const [localIntervals, setLocalIntervals] = useState<LocalInterval[]>([...STARTER_INTERVALS]);
  const [saving, setSaving] = useState(false);

  // Form state lifted to parent so editInterval() can pre-fill it
  const [formLabel, setFormLabel] = useState('');
  const [formDurationSec, setFormDurationSec] = useState(30);
  const [formType, setFormType] = useState<'work' | 'rest'>('work');

  const totalSec = totalDurationSec(localIntervals, rounds);
  const totalMin = Math.round(totalSec / 60);

  // ── Interval list mutations ────────────────────────────────────────────────

  const addInterval = useCallback((li: LocalInterval) => {
    setLocalIntervals((prev) => [...prev, li]);
  }, []);

  const moveUp = useCallback((index: number) => {
    setLocalIntervals((prev) => {
      if (index === 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setLocalIntervals((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const deleteInterval = useCallback((index: number) => {
    setLocalIntervals((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Removes the interval from the list and pre-fills the form with its values
  const editInterval = useCallback((index: number) => {
    const interval = localIntervals[index];
    setFormLabel(interval.label);
    setFormDurationSec(interval.durationSec);
    setFormType(interval.type);
    setLocalIntervals((prev) => prev.filter((_, i) => i !== index));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [localIntervals]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function validate(): boolean {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your workout a name.');
      return false;
    }
    if (localIntervals.length === 0) {
      Alert.alert('No intervals', 'Add at least one interval before starting.');
      return false;
    }
    return true;
  }

  function handleStartNow() {
    if (!validate()) return;
    navigation.navigate('WorkoutPlayer', {
      inMemoryWorkout: {
        title: title.trim(),
        category,
        intervals: buildWorkoutIntervals(localIntervals, rounds),
      },
    });
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const intervals = buildWorkoutIntervals(localIntervals, rounds);
      const saved = await createWorkout({
        title: title.trim(),
        category,
        description: `Custom workout — ${rounds} round${rounds !== 1 ? 's' : ''}`,
        intervals: intervals.map((i) => ({
          label: i.label,
          durationSec: i.durationSec,
          type: i.type,
          order: i.order,
          roundGroup: i.roundGroup,
        })),
      });
      Alert.alert('Saved!', `"${saved.title}" is now in your library.`, [
        { text: 'Start it now', onPress: () => navigation.replace('WorkoutPlayer', { workoutId: saved.id }) },
        { text: 'Done', style: 'cancel', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Save failed', 'Could not reach the backend. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Title ─────────────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>Workout Name</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="My Workout"
            placeholderTextColor="#444466"
            maxLength={60}
            returnKeyType="done"
          />

          {/* ── Category ──────────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.catChip,
                    active && { backgroundColor: cat.color, borderColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={[styles.catChipText, active && { color: '#fff' }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Rounds ────────────────────────────────────────────────── */}
          <View style={styles.roundsRow}>
            <View>
              <Text style={styles.fieldLabel}>Rounds</Text>
              {totalSec > 0 && (
                <Text style={styles.totalTime}>~{totalMin} min total</Text>
              )}
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepperBtn, rounds <= 1 && styles.stepperBtnDisabled]}
                onPress={() => setRounds((r) => Math.max(1, r - 1))}
                disabled={rounds <= 1}
              >
                <Ionicons name="remove" size={20} color={rounds <= 1 ? '#333355' : '#9B9BB4'} />
              </Pressable>
              <Text style={styles.stepperValue}>{rounds}</Text>
              <Pressable
                style={[styles.stepperBtn, rounds >= 20 && styles.stepperBtnDisabled]}
                onPress={() => setRounds((r) => Math.min(20, r + 1))}
                disabled={rounds >= 20}
              >
                <Ionicons name="add" size={20} color={rounds >= 20 ? '#333355' : '#9B9BB4'} />
              </Pressable>
            </View>
          </View>

          {/* ── Interval list ─────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>
            Intervals{localIntervals.length > 0 ? ` (${localIntervals.length})` : ''}
          </Text>

          {localIntervals.length === 0 ? (
            <View style={styles.emptyIntervals}>
              <Ionicons name="list-outline" size={32} color="#333355" />
              <Text style={styles.emptyText}>No intervals yet — add one below</Text>
            </View>
          ) : (
            <View style={styles.intervalList}>
              {localIntervals.map((interval, index) => (
                <IntervalRow
                  key={interval.key}
                  interval={interval}
                  index={index}
                  total={localIntervals.length}
                  onMoveUp={() => moveUp(index)}
                  onMoveDown={() => moveDown(index)}
                  onDelete={() => deleteInterval(index)}
                  onEdit={() => editInterval(index)}
                />
              ))}
            </View>
          )}

          {/* ── Add / Edit form ───────────────────────────────────────── */}
          <AddIntervalForm
            onAdd={addInterval}
            label={formLabel}
            setLabel={setFormLabel}
            durationSec={formDurationSec}
            setDurationSec={setFormDurationSec}
            type={formType}
            setType={setFormType}
          />

          {/* ── Action buttons ────────────────────────────────────────── */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
              onPress={handleStartNow}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.startBtnText}>Start Now</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.75 }, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#6C63FF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#6C63FF" />
                  <Text style={styles.saveBtnText}>Save to Library</Text>
                </>
              )}
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  scroll: { padding: 20, paddingBottom: 48 },

  fieldLabel: {
    color: '#9B9BB4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
  },

  titleInput: {
    backgroundColor: '#1A1A2E',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },

  categoryChips: { gap: 8, paddingBottom: 4 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2A2A4A',
    backgroundColor: '#1A1A2E',
  },
  catChipText: { color: '#9B9BB4', fontSize: 13, fontWeight: '600' },

  roundsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  totalTime: { color: '#6C63FF', fontSize: 12, fontWeight: '600', marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  stepperBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', minWidth: 36, textAlign: 'center' },

  emptyIntervals: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    borderStyle: 'dashed',
  },
  emptyText: { color: '#444466', fontSize: 13 },

  intervalList: { gap: 8 },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  reorderCol: { paddingHorizontal: 4, gap: 0, alignItems: 'center', justifyContent: 'center' },
  reorderBtn: { padding: 6 },
  reorderBtnDisabled: { opacity: 0.3 },
  intervalContent: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    borderLeftWidth: 3,
  },
  intervalLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 5 },
  intervalMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  typePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  intervalDuration: { color: '#666688', fontSize: 13, fontWeight: '600' },
  editBtn: { padding: 10 },
  deleteBtn: { padding: 12 },

  // Add form
  addForm: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  addFormTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  addFormSub: { color: '#666688', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
  labelInput: {
    backgroundColor: '#0F0F23',
    color: '#FFFFFF',
    fontSize: 15,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  durationChips: { gap: 8, paddingBottom: 4 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F0F23',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  durationChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  durationChipText: { color: '#9B9BB4', fontSize: 13, fontWeight: '600' },
  durationChipTextActive: { color: '#fff' },
  typeToggleRow: { flexDirection: 'row', gap: 8 },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0F0F23',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  typeToggleWork: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  typeToggleRest: { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' },
  typeToggleLabel: { color: '#666688', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  addIntervalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#6C63FF',
  },
  addIntervalBtnText: { color: '#6C63FF', fontSize: 14, fontWeight: '700' },

  // Action buttons
  actions: { marginTop: 28, gap: 12 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#6C63FF',
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#6C63FF',
  },
  saveBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '700' },
});
