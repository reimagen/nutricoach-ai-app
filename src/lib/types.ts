
export interface UserProfile {
    displayName?: string;
    email?: string;
    photoURL?: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    weightKg?: number;
    heightCm?: number;
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
    unitSystem?: 'metric' | 'imperial';
    bmr?: number;
    tdee?: number;
}

export interface UserGoal {
    type: 'weight-loss' | 'weight-gain' | 'maintenance' | 'muscle-gain';
    grammaticalString: string;
    macros: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
}

export interface User {
    profile?: UserProfile;
    goal?: UserGoal;
}

export interface FoodItem {
  id: string;
  name: string;
  macros: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
  };
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timestamp: string; // ISO 8601
}

export interface DailyLog {
    [date: string]: { // YYYY-MM-DD
        foods: FoodItem[];
    };
}

// Kept for compatibility with the old database structure
export interface MealEntry {
  id: string;
  userId: string;
  description: string;
  mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown';
  items: {
    name: string;
    macros: {
      caloriesKcal: number;
      proteinG: number;
      carbohydrateG: number;
      fatG: number;
    };
  }[];
  macros: {
    caloriesKcal: number;
    proteinG: number;
    carbohydrateG: number;
    fatG: number;
  };
  source: string;
  createdAt: any; // Firestore Timestamp
}
