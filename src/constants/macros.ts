
import { MacroSplit, MacroSplitRecommendation } from '@/types';

// A balanced, common default split for macronutrients.
export const DEFAULT_MACRO_SPLIT: MacroSplit = {
  protein: 0.30,
  carbs:   0.40,
  fat:     0.30,
};

// Pre-defined macro splits tailored to specific user goals, including acceptable ranges.
export const GOAL_BASED_MACRO_SPLITS: { [key: string]: MacroSplitRecommendation } = {
  'weight-loss': {
    protein: { min: 0.35, max: 0.45, target: 0.40 },
    carbs:   { min: 0.25, max: 0.35, target: 0.30 },
    fat:     { min: 0.25, max: 0.35, target: 0.30 },
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
