
/**
 * Represents a concrete quantity of macronutrients (in grams) and calories.
 * This interface is used universally to describe the nutritional content of
 * a single food item, a full meal, or a user's daily target/total.
 */
export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Defines the proportional distribution of macronutrients.
 * Values should sum to 1.0.
 */
export interface MacroSplit {
  carbs: number;
  protein: number;
  fat: number;
}

/**
 * Represents a recommended macronutrient value within an acceptable range.
 */
export interface MacroTarget {
  min: number;
  max: number;
  target: number;
}

/**
 * Defines the proportional distribution of macronutrients, including the 
 * target, minimum, and maximum acceptable percentages for each.
 */
export interface MacroSplitRecommendation {
  protein: MacroTarget;
  carbs: MacroTarget;
  fat: MacroTarget;
}

/**
 * Defines the strategy for calculating macronutrient targets.
 * - 'calories-percentage-based': Based on a percentage split of total calories (e.g., 40/30/30).
 * - 'bodyweight': Based on grams of protein per unit of bodyweight.
 */
export type MacroCalculationStrategy = 'calories-percentage-based' | 'bodyweight';
