
import { MacroSplit, MacroSplitRecommendation } from '@/types';

// A balanced, common default split for macronutrients.
export const DEFAULT_MACRO_SPLIT: MacroSplit = {
  protein: 0.30,
  carbs:   0.40,
  fat:     0.30,
};

/**
 * Fallback default split for remaining calories if a specific goal is not recognized.
 * This provides a simple 50/50 split between carbs and fats.
 */
export const DEFAULT_REMAINING_SPLIT: Omit<MacroSplit, 'protein'> = {
  carbs: 0.5,
  fat:   0.5,
};


/**
 * Defines the industry-standard target splits for the remaining calories between carbohydrates and fat
 * after protein has been calculated based on bodyweight. These splits are tailored to specific fitness goals.
 */
export const GOAL_BASED_REMAINING_SPLITS: { [key: string]: Omit<MacroSplit, 'protein'> } = {
  'weight-loss': {
    // A balanced 50/50 split for satiety and sustained energy.
    carbs: 0.50,
    fat:   0.50,
  },
  'muscle-gain': {
    // A 65/35 split in favor of carbs to fuel intense workouts and aid recovery.
    carbs: 0.65,
    fat:   0.35,
  },
  maintenance: {
    // A 55/45 split slightly favoring carbs for balanced, sustained energy.
    carbs: 0.55,
    fat:   0.45,
  },
};


// Pre-defined macro splits tailored to specific user goals, including acceptable ranges.
export const GOAL_BASED_MACRO_SPLITS: { [key: string]: MacroSplitRecommendation } = {
  'weight-loss': {
    protein: { min: 0.35, max: 0.45, target: 0.40 },
    carbs:   { min: 0.25, max: 0.35, target: 0.30 },
    fat:     { min: 0.25, max: 0.35, target: 0.30 },
  },
  'weight-gain': {
    // For weight gain, protein is often bodyweight-based, so a default split is less common.
    // A general split is provided here if needed.
    protein: { min: 0.25, max: 0.35, target: 0.30 },
    carbs:   { min: 0.45, max: 0.55, target: 0.50 },
    fat:     { min: 0.20, max: 0.30, target: 0.20 },
  },
  'muscle-gain': {
    protein: { min: 0.30, max: 0.40, target: 0.35 },
    carbs:   { min: 0.40, max: 0.50, target: 0.45 },
    fat:     { min: 0.20, max: 0.30, target: 0.20 },
  },
  maintenance: {
    protein: { min: 0.25, max: 0.35, target: 0.30 },
    carbs:   { min: 0.35, max: 0.45, target: 0.40 },
    fat:     { min: 0.25, max: 0.35, target: 0.30 },
  },
};
