import type { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  weight?: number;
  height?: number;
  goal?: 'lose' | 'maintain' | 'gain';
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very';
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealEntry {
  id?: string;
  uid: string;
  date: Date;
  description: string;
  source: 'voice' | 'photo' | 'manual';
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface EducationModule {
  day: number;
  phase: number;
  theme: string;
  title: string;
  content: string;
  format: string;
}

export interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
}
