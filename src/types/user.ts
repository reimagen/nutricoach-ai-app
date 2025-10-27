
import { Timestamp } from 'firebase/firestore';
import { RecapMetrics } from './recap';
import { MacroCalculationStrategy, MacroSplit } from './macros';
import { ActivityLevel } from '@/constants/activity-levels';

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
  activityLevel?: ActivityLevel;
  timezone?: string;
}

/**
 * Base interface for all user goals.
 */
interface UserGoalBase {
  type: 'weight-loss' | 'weight-gain' | 'muscle-gain' | 'maintenance';
  /** The percentage adjustment to apply to TDEE. Negative for loss (e.g., -0.20), positive for gain (e.g., 0.15). */
  adjustmentPercentage: number;
}

/**
 * Goal definition for calories-percentage-based macro calculation.
 */
export interface CaloriesPercentageGoal extends UserGoalBase {
  calculationStrategy: 'calories-percentage-based';
  /** The macro split to be used for the calculation. This is optional and may not be present initially. */
  split?: MacroSplit;
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
export type UserGoal = CaloriesPercentageGoal | BodyweightGoal;

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
