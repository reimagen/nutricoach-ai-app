
// The single source of truth for activity levels.
export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (little to no exercise)', multiplier: 1.2 },
  { value: 'light', label: 'Lightly active (light exercise/sports 1-3 days/week)', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderately active (moderate exercise/sports 3-5 days/week)', multiplier: 1.55 },
  { value: 'active', label: 'Very active (hard exercise/sports 6-7 days a week)', multiplier: 1.725 },
  { value: 'veryActive', label: 'Super active (very hard exercise/physical job & exercise 2x/day)', multiplier: 1.9 },
] as const;

// A mapped type for easy lookups of multipliers by value.
export const ACTIVITY_LEVEL_MAP = ACTIVITY_LEVELS.reduce((acc, level) => {
  acc[level.value] = level;
  return acc;
}, {} as { [key in typeof ACTIVITY_LEVELS[number]['value']]: typeof ACTIVITY_LEVELS[number] });

// A derived union type for type-safe usage in interfaces.
export type ActivityLevel = typeof ACTIVITY_LEVELS[number]['value'];
