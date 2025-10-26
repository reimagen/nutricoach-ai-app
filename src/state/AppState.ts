
import { User, MealEntry } from '@/types';

/**
 * Represents a single exchange in the conversation between the user and the agent.
 */
export interface TranscriptEntry {
  source: 'user' | 'agent';
  text: string;
  isFinal: boolean;
}

/**
 * The overall state of the application.
 */
export interface AppState {
  /** The authenticated user's profile and goals. */
  user: User;
  /** The log of meals for the current day. */
  mealEntries: MealEntry[];
  /** The full transcript of the conversation. */
  transcript: TranscriptEntry[];
  /** A meal item proposed by the agent, pending user confirmation. */
  pendingMealItem?: MealEntry;
}

/**
 * The initial, empty state of the application before any data is loaded.
 */
export const initialState: AppState = {
  user: {},
  mealEntries: [],
  transcript: [],
};
