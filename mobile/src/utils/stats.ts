import { WorkoutSession } from '../types/workout';

// ── Date helpers ──────────────────────────────────────────────────────────────

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Streak ────────────────────────────────────────────────────────────────────

export function calculateStreak(sessions: WorkoutSession[]): number {
  const completedDays = new Set<string>(
    sessions
      .filter((s) => s.status === 'completed' && s.completedAt)
      .map((s) => dayKey(new Date(s.completedAt!))),
  );

  if (completedDays.size === 0) return 0;

  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Streak is only active if today OR yesterday had a workout
  const hasToday = completedDays.has(dayKey(today));
  const hasYesterday = completedDays.has(dayKey(yesterday));
  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  const cursor = new Date(hasToday ? today : yesterday);

  while (streak < 365) {
    if (completedDays.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ── Weekly activity data ──────────────────────────────────────────────────────

export interface WeekBar {
  label: string;   // "Jun 9"
  count: number;   // completed sessions that week
}

export function getWeeklyBars(sessions: WorkoutSession[], weeksBack = 7): WeekBar[] {
  const completed = sessions.filter((s) => s.status === 'completed' && s.completedAt);

  const bars: WeekBar[] = [];
  const now = new Date();

  // Anchor to the start of the current week (Monday)
  const currentWeekStart = startOfDay(new Date(now));
  const dayOfWeek = (currentWeekStart.getDay() + 6) % 7; // Mon=0 … Sun=6
  currentWeekStart.setDate(currentWeekStart.getDate() - dayOfWeek);

  for (let w = weeksBack - 1; w >= 0; w--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const count = completed.filter((s) => {
      const d = new Date(s.completedAt!);
      return d >= weekStart && d < weekEnd;
    }).length;

    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    bars.push({ label, count });
  }

  return bars;
}

// ── Totals ────────────────────────────────────────────────────────────────────

export interface SessionTotals {
  completedCount: number;
  totalDurationSec: number;
  totalCalories: number;
}

const MET: Record<string, number> = {
  hiit: 8, strength: 5, walk_jog: 4.5, mobility: 3, senior: 2.5, pregnancy: 2.5,
};

export function calcTotals(
  sessions: WorkoutSession[],
  workoutMap: Record<string, { category: string }>,
  weightKg: number = 70,
): SessionTotals {
  const completed = sessions.filter((s) => s.status === 'completed');
  const totalDurationSec = completed.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);
  const totalCalories = completed.reduce((sum, s) => {
    const cat = workoutMap[s.workoutId]?.category ?? 'hiit';
    const met = MET[cat] ?? 4;
    return sum + Math.round(met * weightKg * ((s.durationSec ?? 0) / 3600));
  }, 0);
  return { completedCount: completed.length, totalDurationSec, totalCalories };
}

// ── Format helpers ────────────────────────────────────────────────────────────

export function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

export function fmtSessionDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: new Date(isoString).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}
