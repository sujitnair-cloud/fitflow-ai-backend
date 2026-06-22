import { API_BASE_URL } from '../config/api';

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) throw new Error('Backend unreachable');
  return res.json();
}

export async function fetchWorkouts() {
  const res = await fetch(`${API_BASE_URL}/api/workouts`);
  if (!res.ok) throw new Error('Failed to fetch workouts');
  return res.json();
}

export async function fetchWorkout(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/workouts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch workout');
  return res.json();
}

export async function postSession(data: {
  userId: string;
  workoutId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
}) {
  const res = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save session');
  return res.json();
}

export async function fetchSessions(userId?: string) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const res = await fetch(`${API_BASE_URL}/api/sessions${qs}`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function createWorkout(data: {
  title: string;
  category: string;
  description?: string;
  intervals: Array<{
    label: string;
    durationSec: number;
    type: string;
    order: number;
    roundGroup: number;
  }>;
}) {
  const res = await fetch(`${API_BASE_URL}/api/workouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create workout');
  return res.json();
}

// ── Auth endpoints ─────────────────────────────────────────────────────────────

export async function requestOtp(email: string): Promise<{
  message: string;
  devOtp?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Failed to send code');
  }
  return res.json();
}

export async function verifyOtp(email: string, otp: string): Promise<{
  token: string;
  user: { id: string; email: string; name: string | null; role: string };
  isNew: boolean;
}> {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Verification failed');
  }
  return res.json();
}

export async function getProfile(token: string): Promise<{
  user: { id: string; email: string; name: string | null; role: string };
  profile: {
    id: string;
    age: number | null;
    heightCm: number | null;
    weightKg: number | null;
    fitnessLevel: string | null;
    goal: string | null;
    mode: string;
    parqCleared: boolean;
    onboardingComplete: boolean;
  } | null;
}> {
  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateProfile(
  token: string,
  data: {
    name?: string | null;
    age?: number | null;
    heightCm?: number | null;
    weightKg?: number | null;
    fitnessLevel?: string | null;
    goal?: string | null;
    mode?: string;
    parqCleared?: boolean;
    onboardingComplete?: boolean;
  },
): Promise<{
  user: { id: string; email: string; name: string | null; role: string };
  profile: {
    id: string;
    age: number | null;
    heightCm: number | null;
    weightKg: number | null;
    fitnessLevel: string | null;
    goal: string | null;
    mode: string;
    parqCleared: boolean;
    onboardingComplete: boolean;
  };
}> {
  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}
