export interface WorkoutInterval {
  id: string;
  workoutId: string;
  order: number;
  label: string;
  durationSec: number;
  type: 'work' | 'rest';
  roundGroup: number;
}

export interface Workout {
  id: string;
  title: string;
  category: string;
  description: string | null;
  intervals: WorkoutInterval[];
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  durationSec: number | null;
}

// Intervals passed directly (no DB fetch needed — quick-timer and custom builder)
export interface InMemoryWorkout {
  title: string;
  category: string;
  intervals: WorkoutInterval[];
}

export type RootStackParamList = {
  MainTabs: undefined;
  WorkoutPlayer: {
    workoutId?: string;          // set when launching a saved DB workout
    inMemoryWorkout?: InMemoryWorkout; // set for quick-timer / unsaved custom
  };
  WorkoutSummary: {
    workoutId?: string;          // undefined for in-memory workouts
    workoutTitle: string;
    workoutCategory: string;
    durationSec: number;
    roundsCompleted: number;
    intervalsCompleted: number;
    startedAt: string;
    skipSession?: boolean;       // true → don't POST session (no DB row)
  };
  CustomBuilder: undefined;
  WorkoutList: undefined;
};
