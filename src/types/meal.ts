
import { Timestamp } from 'firebase/firestore';
import { Macros } from './macros';

export interface MealItem {
  id: string;
  name: string;
  macros: Macros;
  servings: number;
  servingSize: string;
}

/**
 * Defines the possible categories for a meal entry.
 */
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string;
  mealCategory: MealCategory;
  description: string;
  items: MealItem[];
  macros: Macros;
  // Timestamps for querying and auditing
  timestamp: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
