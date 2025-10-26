
import { calculateDailyCalorieTarget } from '../calculateDailyCalorieTarget';
import { PercentageGoal, BodyweightGoal } from '@/types';
import {
  WEIGHT_LOSS_ADJUSTMENT,
  WEIGHT_GAIN_ADJUSTMENT,
  MUSCLE_GAIN_ADJUSTMENT,
  MAINTENANCE_ADJUSTMENT,
} from '@/constants/tdee';
import {
  GOAL_BASED_MACRO_SPLITS,
  DEFAULT_REMAINING_SPLIT,
} from '@/constants/macrosplits';
import { GOAL_BASED_PROTEIN_TARGETS } from '@/constants/bodyweight';

const TDEE = 2000;

// Mock goals using imported constants for adjustments and macro splits
const weightLossGoal: PercentageGoal = {
  type: 'weight-loss',
  calculationStrategy: 'percentage',
  adjustmentPercentage: WEIGHT_LOSS_ADJUSTMENT,
  split: {
    protein: GOAL_BASED_MACRO_SPLITS['weight-loss'].protein.target,
    carbs: GOAL_BASED_MACRO_SPLITS['weight-loss'].carbs.target,
    fat: GOAL_BASED_MACRO_SPLITS['weight-loss'].fat.target,
  },
};

const weightGainGoal: BodyweightGoal = {
  type: 'weight-gain',
  calculationStrategy: 'bodyweight',
  adjustmentPercentage: WEIGHT_GAIN_ADJUSTMENT,
  proteinPerBodyweight: GOAL_BASED_PROTEIN_TARGETS['muscle-gain'].target,
  remainingSplit: DEFAULT_REMAINING_SPLIT,
};

const muscleGainGoal: PercentageGoal = {
  type: 'muscle-gain',
  calculationStrategy: 'percentage',
  adjustmentPercentage: MUSCLE_GAIN_ADJUSTMENT,
  split: {
    protein: GOAL_BASED_MACRO_SPLITS['muscle-gain'].protein.target,
    carbs: GOAL_BASED_MACRO_SPLITS['muscle-gain'].carbs.target,
    fat: GOAL_BASED_MACRO_SPLITS['muscle-gain'].fat.target,
  },
};

const maintenanceGoal: BodyweightGoal = {
  type: 'maintenance',
  calculationStrategy: 'bodyweight',
  adjustmentPercentage: MAINTENANCE_ADJUSTMENT,
  proteinPerBodyweight: GOAL_BASED_PROTEIN_TARGETS['maintenance'].target,
  remainingSplit: DEFAULT_REMAINING_SPLIT,
};

describe('calculateDailyCalorieTarget', () => {
  it('should calculate a 20% deficit for a weight-loss goal', () => {
    expect(calculateDailyCalorieTarget(TDEE, weightLossGoal)).toBe(1600);
  });

  it('should calculate a 15% surplus for a weight-gain goal', () => {
    expect(calculateDailyCalorieTarget(TDEE, weightGainGoal)).toBe(2300);
  });

  it('should calculate a 10% surplus for a muscle-gain goal', () => {
    expect(calculateDailyCalorieTarget(TDEE, muscleGainGoal)).toBe(2200);
  });

  it('should calculate no change for a maintenance goal', () => {
    expect(calculateDailyCalorieTarget(TDEE, maintenanceGoal)).toBe(2000);
  });

  it('should correctly round the result for decimal TDEE values', () => {
    const decimalTdee = 2150.8;
    expect(calculateDailyCalorieTarget(decimalTdee, weightLossGoal)).toBe(1721);
  });

  it('should return 0 if the TDEE is 0', () => {
    expect(calculateDailyCalorieTarget(0, weightLossGoal)).toBe(0);
  });

  it('should never return a negative calorie target', () => {
    const extremeWeightLossGoal: PercentageGoal = { ...weightLossGoal, adjustmentPercentage: -1.5 }; // -150% adjustment
    expect(calculateDailyCalorieTarget(TDEE, extremeWeightLossGoal)).toBe(0);
  });
});
