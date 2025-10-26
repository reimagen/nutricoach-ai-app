
import { calculateMacrosByBodyweight } from '../calculateMacrosByBodyweight';
import { UserProfile, BodyweightGoal } from '@/types';
import { DEFAULT_REMAINING_SPLIT, GOAL_BASED_REMAINING_SPLITS } from '@/constants/macrosplits';

describe('calculateMacrosByBodyweight', () => {

  const mockMetricProfile: UserProfile = {
    age: 30, height: 180, weight: 80, units: 'metric', gender: 'male', activityLevel: 'sedentary'
  };

  const mockImperialProfile: UserProfile = {
    age: 28, height: 65, weight: 150, units: 'imperial', gender: 'female', activityLevel: 'light'
  };

  const mockGoal: BodyweightGoal = {
    type: 'weight-loss',
    calculationStrategy: 'bodyweight',
    proteinPerBodyweight: 2.2,
    remainingSplit: GOAL_BASED_REMAINING_SPLITS["weight-loss"],
    adjustmentPercentage: -0.20
  };

  const calorieTarget = 2500;

  it('should calculate macros correctly for a user with metric units', () => {
    const result = calculateMacrosByBodyweight(mockGoal, mockMetricProfile, calorieTarget);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.calories).toBe(2500);
    expect(result.protein).toBe(176);
    expect(result.carbs).toBe(225);
    expect(result.fat).toBe(100);
  });

  it('should calculate macros correctly for a user with imperial units', () => {
    const result = calculateMacrosByBodyweight(mockGoal, mockImperialProfile, calorieTarget);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.calories).toBe(2500);
    expect(result.protein).toBe(150);
    expect(result.carbs).toBe(238);
    expect(result.fat).toBe(106);
  });

  it('should return null if the user has no weight information', () => {
    const profileWithoutWeight: UserProfile = { ...mockMetricProfile, weight: undefined };
    const result = calculateMacrosByBodyweight(mockGoal, profileWithoutWeight, calorieTarget);
    expect(result).toBeNull();
  });

  it('should use the default remaining split for an unrecognized goal type', () => {
    // @ts-expect-error - Intentionally testing an invalid goal type
    const customGoal: BodyweightGoal = {
      ...mockGoal,
      type: 'custom-goal', // A goal type not in GOAL_BASED_REMAINING_SPLITS
    };

    const result = calculateMacrosByBodyweight(customGoal, mockMetricProfile, calorieTarget);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.calories).toBe(2500);
    expect(result.protein).toBe(176);
    expect(result.carbs).toBe(225);
    expect(result.fat).toBe(100);
  });

  it('should use the user-defined remaining split when provided', () => {
    const customSplitGoal: BodyweightGoal = {
      ...mockGoal,
      remainingSplit: { carbs: 0.6, fat: 0.4 }, // 60% carbs, 40% fat
    };

    const result = calculateMacrosByBodyweight(customSplitGoal, mockMetricProfile, calorieTarget);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.calories).toBe(2500);
    expect(result.protein).toBe(176); // (80kg * 2.2)
    // Remaining calories = 2500 - (176 * 4) = 1796
    // Carbs = (1796 * 0.6) / 4 = 269.4 => 269
    // Fat = (1796 * 0.4) / 9 = 79.8 => 80
    expect(result.carbs).toBe(269);
    expect(result.fat).toBe(80);
  });
});
