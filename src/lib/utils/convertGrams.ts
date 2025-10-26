
import { Macros } from '@/types/macros';
import {
  PROTEIN_CALORIES_PER_GRAM,
  CARBS_CALORIES_PER_GRAM,
  FAT_CALORIES_PER_GRAM,
} from '@/constants';

export const convertGrams = (calories: number, split: { protein: number, carbs: number, fat: number }): Omit<Macros, 'calories'> => {
  const proteinCalories = calories * split.protein;
  const carbCalories = calories * split.carbs;
  const fatCalories = calories * split.fat;

  const proteinInGrams = proteinCalories / PROTEIN_CALORIES_PER_GRAM;
  const carbsInGrams = carbCalories / CARBS_CALORIES_PER_GRAM;
  const fatInGrams = fatCalories / FAT_CALORIES_PER_GRAM;

  return {
    protein: Math.round(proteinInGrams),
    carbs: Math.round(carbsInGrams),
    fat: Math.round(fatInGrams),
  };
}