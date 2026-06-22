import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { updateProfile as apiUpdateProfile } from '../services/api';

type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
type Goal = 'weight_loss' | 'strength' | 'cardio' | 'flexibility';

const FITNESS_LEVELS: { id: FitnessLevel; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const GOALS: { id: Goal; label: string }[] = [
  { id: 'weight_loss', label: 'Lose Weight' },
  { id: 'strength', label: 'Build Strength' },
  { id: 'cardio', label: 'Boost Cardio' },
  { id: 'flexibility', label: 'Flexibility' },
];

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <View style={av.wrap}>
      <Text style={av.text}>{initials}</Text>
    </View>
  );
}

const av = StyleSheet.create({
  wrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#fff', fontSize: 26, fontWeight: '800' },
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
          <Ionicons name="remove" size={18} color={value <= min ? '#333355' : '#9B9BB4'} />
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
          <Ionicons name="add" size={18} color={value >= max ? '#333355' : '#9B9BB4'} />
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
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  label: { color: '#9B9BB4', fontSize: 14, fontWeight: '600', flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#0F0F23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  valueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 3, minWidth: 70, justifyContent: 'center' },
  value: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  unit: { color: '#666688', fontSize: 12, fontWeight: '600' },
});

export default function ProfileScreen() {
  const { user, profile, token, updateUser, updateProfile, signOut, isGuest, exitGuestMode } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [name, setName] = useState(user?.name ?? '');
  const [age, setAge] = useState(profile?.age ?? 28);
  const [heightCm, setHeightCm] = useState(profile?.heightCm ?? 170);
  const [weightKg, setWeightKg] = useState(profile?.weightKg ?? 70);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(
    (profile?.fitnessLevel as FitnessLevel) ?? 'intermediate',
  );
  const [goal, setGoal] = useState<Goal>((profile?.goal as Goal) ?? 'weight_loss');

  function startEdit() {
    setName(user?.name ?? '');
    setAge(profile?.age ?? 28);
    setHeightCm(profile?.heightCm ?? 170);
    setWeightKg(profile?.weightKg ?? 70);
    setFitnessLevel((profile?.fitnessLevel as FitnessLevel) ?? 'intermediate');
    setGoal((profile?.goal as Goal) ?? 'weight_loss');
    setEditing(true);
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      const res = await apiUpdateProfile(token, {
        name: name.trim() || null,
        age,
        heightCm,
        weightKg,
        fitnessLevel,
        goal,
      });
      updateUser({ name: res.user.name });
      updateProfile({
        age: res.profile.age,
        heightCm: res.profile.heightCm,
        weightKg: res.profile.weightKg,
        fitnessLevel: res.profile.fitnessLevel,
        goal: res.profile.goal,
      });
      setEditing(false);
    } catch {
      Alert.alert('Save failed', 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const displayName = user?.name ?? null;
  const email = user?.email ?? '';

  // ── Guest profile view ───────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={[av.wrap, { backgroundColor: '#2A2A4A' }]}>
                <Ionicons name="person-outline" size={38} color="#555577" />
              </View>
              <Text style={styles.profileName}>Guest User</Text>
              <Text style={styles.profileEmail}>Exploring FitFlow AI</Text>
            </View>

            {/* Guest description */}
            <View style={styles.guestCard}>
              <Ionicons name="star-outline" size={28} color="#FFD700" />
              <Text style={styles.guestCardTitle}>Unlock the full experience</Text>
              <Text style={styles.guestCardBody}>
                Create a free account to save your workouts, track streaks, get a personalized AI coach, and sync your progress across devices.
              </Text>
            </View>

            {/* Feature list */}
            {[
              { icon: 'checkmark-circle-outline' as const, text: 'Save workouts & history', color: '#4ECDC4' },
              { icon: 'checkmark-circle-outline' as const, text: 'Personalised AI coach', color: '#6C63FF' },
              { icon: 'checkmark-circle-outline' as const, text: 'Streak & calorie tracking', color: '#FF6B35' },
              { icon: 'checkmark-circle-outline' as const, text: 'Music tuned to your age & workout', color: '#C77DFF' },
            ].map(({ icon, text, color }) => (
              <View key={text} style={styles.featureRow}>
                <Ionicons name={icon} size={20} color={color} />
                <Text style={styles.featureText}>{text}</Text>
              </View>
            ))}

            {/* CTAs */}
            <View style={styles.guestCtaBlock}>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
                onPress={exitGuestMode}
              >
                <Text style={styles.primaryBtnText}>Create Free Account</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
                onPress={exitGuestMode}
              >
                <Text style={styles.secondaryBtnText}>Sign In</Text>
              </Pressable>
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) return null;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <View style={styles.hero}>
              <Avatar name={displayName} email={email} />
              {!editing ? (
                <>
                  <Text style={styles.heroName}>{displayName ?? 'FitFlow User'}</Text>
                  <Text style={styles.heroEmail}>{email}</Text>

                  {/* PAR-Q clearance badge */}
                  <View style={[
                    styles.parqBadge,
                    profile?.parqCleared ? styles.parqBadgeCleared : styles.parqBadgeWarning,
                  ]}>
                    <Ionicons
                      name={profile?.parqCleared ? 'shield-checkmark' : 'warning'}
                      size={13}
                      color={profile?.parqCleared ? '#4ECDC4' : '#FF6B35'}
                    />
                    <Text style={[
                      styles.parqBadgeText,
                      profile?.parqCleared ? styles.parqBadgeTextCleared : styles.parqBadgeTextWarning,
                    ]}>
                      {profile?.parqCleared
                        ? 'Medically cleared'
                        : 'Doctor clearance recommended'}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.nameInputWrap}>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor="#444466"
                    autoCapitalize="words"
                  />
                </View>
              )}
            </View>

            {/* ── View mode ─────────────────────────────────────────────── */}
            {!editing ? (
              <>
                <Text style={styles.sectionLabel}>Body Stats</Text>
                <View style={styles.statsRow}>
                  {[
                    { label: 'Age', value: profile?.age ? `${profile.age} yrs` : '—' },
                    { label: 'Height', value: profile?.heightCm ? `${profile.heightCm} cm` : '—' },
                    { label: 'Weight', value: profile?.weightKg ? `${profile.weightKg} kg` : '—' },
                  ].map((s) => (
                    <View key={s.label} style={styles.statChip}>
                      <Text style={styles.statChipValue}>{s.value}</Text>
                      <Text style={styles.statChipLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Fitness Profile</Text>
                <View style={styles.profileCard}>
                  <ProfileRow label="Level" value={profile?.fitnessLevel ?? '—'} />
                  <ProfileRow label="Goal" value={goalLabel(profile?.goal)} />
                  <ProfileRow label="Mode" value={profile?.mode ?? 'Standard'} last />
                </View>

                <Pressable
                  style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.85 }]}
                  onPress={startEdit}
                >
                  <Ionicons name="pencil" size={16} color="#6C63FF" />
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </Pressable>
              </>
            ) : (
              /* ── Edit mode ─────────────────────────────────────────────── */
              <>
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

                <Text style={styles.sectionLabel}>Fitness Level</Text>
                <View style={styles.chipRow}>
                  {FITNESS_LEVELS.map((lvl) => {
                    const active = fitnessLevel === lvl.id;
                    return (
                      <Pressable
                        key={lvl.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setFitnessLevel(lvl.id)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{lvl.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.sectionLabel}>Goal</Text>
                <View style={styles.chipRow}>
                  {GOALS.map((g) => {
                    const active = goal === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setGoal(g.id)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.editActions}>
                  <Pressable
                    style={({ pressed }) => [styles.saveBtn, saving && { opacity: 0.7 }, pressed && { opacity: 0.85 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setEditing(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* ── App section ───────────────────────────────────────────── */}
            <View style={styles.appSection}>
              <Text style={styles.appVersion}>FitFlow AI · v0.1.0</Text>
              <Pressable
                style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.8 }]}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={18} color="#FF6B35" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function ProfileRow({
  label, value, last,
}: {
  label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[pr.row, !last && pr.rowBorder]}>
      <Text style={pr.label}>{label}</Text>
      <Text style={pr.value}>{value}</Text>
    </View>
  );
}

const pr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#2A2A4A' },
  label: { color: '#666688', fontSize: 14 },
  value: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
});

function goalLabel(goal?: string | null): string {
  const map: Record<string, string> = {
    weight_loss: 'Lose Weight',
    strength: 'Build Strength',
    cardio: 'Boost Cardio',
    flexibility: 'Flexibility',
  };
  return goal ? (map[goal] ?? goal) : '—';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F23' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },

  // ── Guest profile styles ──────────────────────────────────────────────────────
  avatarSection: { alignItems: 'center', gap: 8, marginBottom: 28 },
  profileName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 4 },
  profileEmail: { color: '#666688', fontSize: 14 },
  guestCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  guestCardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  guestCardBody: { color: '#9B9BB4', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  featureText: { color: '#CCCCEE', fontSize: 15, fontWeight: '500' },
  guestCtaBlock: { marginTop: 24, gap: 12 },
  primaryBtn: {
    height: 58,
    backgroundColor: '#6C63FF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  secondaryBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },

  // Hero
  hero: { alignItems: 'center', gap: 8, marginBottom: 32 },
  heroName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 4 },
  heroEmail: { color: '#666688', fontSize: 14 },

  parqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  parqBadgeCleared: { backgroundColor: '#4ECDC415', borderWidth: 1, borderColor: '#4ECDC430' },
  parqBadgeWarning: { backgroundColor: '#FF6B3515', borderWidth: 1, borderColor: '#FF6B3530' },
  parqBadgeText: { fontSize: 12, fontWeight: '600' },
  parqBadgeTextCleared: { color: '#4ECDC4' },
  parqBadgeTextWarning: { color: '#FF6B35' },

  nameInputWrap: { width: '100%', marginTop: 8 },
  nameInput: {
    height: 52,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingHorizontal: 18,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    textAlign: 'center',
  },

  // Section label
  sectionLabel: {
    color: '#9B9BB4',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statChip: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  statChipValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  statChipLabel: { color: '#666688', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Profile card
  profileCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },

  // Edit profile button
  editBtn: {
    height: 52,
    backgroundColor: '#6C63FF15',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#6C63FF40',
    marginBottom: 32,
  },
  editBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '700' },

  // Edit mode
  steppersWrap: { gap: 10, marginBottom: 24 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    borderWidth: 1.5,
    borderColor: '#2A2A4A',
  },
  chipActive: { backgroundColor: '#6C63FF20', borderColor: '#6C63FF' },
  chipText: { color: '#666688', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#6C63FF' },

  editActions: { gap: 10, marginBottom: 32 },
  saveBtn: {
    height: 56,
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#444466', fontSize: 14, fontWeight: '600' },

  // App section
  appSection: { gap: 16, alignItems: 'center', paddingTop: 8 },
  appVersion: { color: '#333355', fontSize: 12 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF6B3510',
    borderWidth: 1,
    borderColor: '#FF6B3520',
  },
  signOutText: { color: '#FF6B35', fontSize: 14, fontWeight: '700' },
});
