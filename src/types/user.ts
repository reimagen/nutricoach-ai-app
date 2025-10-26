
import { Timestamp } from 'firebase/firestore';
import { RecapMetrics } from './recap';
import { MacroCalculationStrategy, MacroSplit } from './macros';

/**
 * Represents the user's core profile information.
 * This data is essential for calculating BMR and TDEE, but optional for a default experience.
 */
export interface UserProfile {
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  units?: 'metric' | 'imperial';
  height?: number;
  weight?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
  timezone?: string;
}

/**
 * Base interface for all user goals.
 */
interface UserGoalBase {
  type: 'weight-loss' | 'weight-gain' | 'muscle-gain' | 'maintenance';
  /** The user's target daily calorie intake, adjusted from TDEE for their goal. */
  targetCalories: number;
}

/**
 * Goal definition for percentage-based macro calculation.
 */
export interface PercentageGoal extends UserGoalBase {
  calculationStrategy: 'percentage';
  /** The macro split to be used for the calculation. */
  split: MacroSplit;
}

/**
 * Goal definition for bodyweight-based protein calculation.
 */
export interface BodyweightGoal extends UserGoalBase {
  calculationStrategy: 'bodyweight';
  /** The target grams of protein per unit of bodyweight (kg or lb). */
  proteinPerBodyweight: number;
  /** The split for the remaining calories after protein is accounted for. */
  remainingSplit: Omit<MacroSplit, 'protein'>;
}

/**
 * A discriminated union of all possible user goal types.
 * The `calculationStrategy` field determines the shape of the goal object.
 */
export type UserGoal = PercentageGoal | BodyweightGoal;

/**
 * The complete user data model as stored in Firestore.
 * A user may exist without a complete profile or goal.
 */
export interface User {
  uid: string; // Firestore document ID
  userProfile?: UserProfile;
  userGoal?: UserGoal;

  /**
   * A cache for pre-calculated recap metrics to improve performance.
   * This is updated periodically by scheduled functions rather than calculated on every request.
   */
  cachedRecaps?: {
    daily?: { metrics: RecapMetrics; lastUpdated: Timestamp };
    weekly?: { metrics: RecapMetrics; lastUpdated: Timestamp };
    monthly?: { metrics: RecapMetrics; lastUpdated: Timestamp };
  }
}
