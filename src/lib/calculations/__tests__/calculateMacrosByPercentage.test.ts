
import { calculateMacrosByPercentage } from '../calculateMacrosByPercentage';
import { DEFAULT_MACRO_SPLIT, PROTEIN_CALORIES_PER_GRAM, CARBS_CALORIES_PER_GRAM, FAT_CALORIES_PER_GRAM } from '@/constants';

describe('calculateMacrosByPercentage', () => {

  it('should calculate macro grams correctly for a given calorie target', () => {
    const calorieTarget = 2000;

    // Calculation using the actual constant:
    const proteinGrams = (calorieTarget * DEFAULT_MACRO_SPLIT.protein) / PROTEIN_CALORIES_PER_GRAM;
    const carbsGrams = (calorieTarget * DEFAULT_MACRO_SPLIT.carbs) / CARBS_CALORIES_PER_GRAM;
    const fatGrams = (calorieTarget * DEFAULT_MACRO_SPLIT.fat) / FAT_CALORIES_PER_GRAM;

    const result = calculateMacrosByPercentage(calorieTarget);

    expect(result.calories).toBe(calorieTarget);
    expect(result.protein).toBe(Math.round(proteinGrams));
    expect(result.carbs).toBe(Math.round(carbsGrams));
    expect(result.fat).toBe(Math.round(fatGrams));
  });

  it('should return zero for all macros if calorie target is zero', () => {
    const calorieTarget = 0;

    const result = calculateMacrosByPercentage(calorieTarget);

    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
  });

});
