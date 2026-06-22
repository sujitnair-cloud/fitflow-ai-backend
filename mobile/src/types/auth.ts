export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface ProfileData {
  id?: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  fitnessLevel: string | null;
  goal: string | null;
  mode: string;
  parqCleared: boolean;
  onboardingComplete: boolean;
}

export type AuthStackParamList = {
  Welcome: undefined;
  Auth: undefined;
};

export type OnboardingStackParamList = {
  OnboardingGoal: undefined;
  OnboardingProfile: undefined;
  PARQ: undefined;
};
