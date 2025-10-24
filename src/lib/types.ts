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

export interface FoodItem {
    name: string;
    macros: {
        caloriesKcal: number;
        proteinG: number;
        carbohydrateG: number;
        fatG: number;
    };
}

export interface MealEntry {
  id: string;
  userId: string;
  createdAt: any;
  description: string;
  mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown';
  items: FoodItem[];
  macros: {
    caloriesKcal: number;
    proteinG: number;
    carbohydrateG: number;
    fatG: number;
  };
  totalMacros?: any; // For legacy data
  source: 'voice' | 'photo' | 'manual' | 'conversation';
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
