
import { getMacroRecommendation } from '../getMacroRecommendation';
import { calculateMacrosByBodyweight } from '../calculateMacrosByBodyweight';
import { calculateMacrosByPercentage } from '../calculateMacrosByPercentage';
import { UserProfile, UserGoal, BodyweightGoal, CaloriesPercentageGoal } from '@/types';

// Mock the calculation functions to isolate the logic of getMacroRecommendation
jest.mock('../calculateMacrosByBodyweight');
jest.mock('../calculateMacrosByPercentage');

describe('getMacroRecommendation', () => {
  const mockUserProfile: UserProfile = {
    weight: 70, // Assuming weight is stored as a number in kg as per the context from previous files
    // ... other profile properties if needed for the test
  };
  const calorieTarget = 2000;

  // Clear mock history before each test
  beforeEach(() => {
    (calculateMacrosByBodyweight as jest.Mock).mockClear();
    (calculateMacrosByPercentage as jest.Mock).mockClear();
  });

  it('should delegate to calculateMacrosByBodyweight for bodyweight goals', () => {
    const bodyweightGoal: BodyweightGoal = { 
        type: 'muscle-gain', 
        adjustmentPercentage: 0.10,
        calculationStrategy: 'bodyweight', 
        proteinPerBodyweight: 2.0, 
        remainingSplit: { carbs: 0.65, fat: 0.35 } 
    };
    getMacroRecommendation(bodyweightGoal, mockUserProfile, calorieTarget);
    expect(calculateMacrosByBodyweight).toHaveBeenCalledWith(bodyweightGoal, mockUserProfile, calorieTarget);
    expect(calculateMacrosByPercentage).not.toHaveBeenCalled();
  });

  it('should delegate to calculateMacrosByPercentage for calories-percentage-based goals', () => {
    const caloriesPercentageGoal: CaloriesPercentageGoal = { 
        type: 'maintenance', 
        adjustmentPercentage: 0,
        calculationStrategy: 'calories-percentage-based', 
        split: { protein: 0.3, carbs: 0.4, fat: 0.3 } 
    };
    getMacroRecommendation(caloriesPercentageGoal, mockUserProfile, calorieTarget);
    expect(calculateMacrosByPercentage).toHaveBeenCalledWith(calorieTarget, caloriesPercentageGoal.split);
    expect(calculateMacrosByBodyweight).not.toHaveBeenCalled();
  });

  it('should use default percentage calculation for goals with unknown strategy', () => {
    const unknownGoal: UserGoal = { 
        type: 'weight-loss',
        adjustmentPercentage: -0.20,
        calculationStrategy: 'unknown-strategy' 
    } as any; // Using 'any' to bypass type checking for the test
    getMacroRecommendation(unknownGoal, mockUserProfile, calorieTarget);
    expect(calculateMacrosByPercentage).toHaveBeenCalledWith(calorieTarget);
    expect(calculateMacrosByBodyweight).not.toHaveBeenCalled();
  });

  it('should return null if goal is undefined', () => {
    const result = getMacroRecommendation(undefined, mockUserProfile, calorieTarget);
    expect(result).toBeNull();
  });

  it('should return null if userProfile is undefined', () => {
    const goal: CaloriesPercentageGoal = { type: 'weight-loss', adjustmentPercentage: -0.2, calculationStrategy: 'calories-percentage-based', split: { protein: 0.4, carbs: 0.3, fat: 0.3 } };
    const result = getMacroRecommendation(goal, undefined, calorieTarget);
    expect(result).toBeNull();
  });

  it('should return null if calorieTarget is undefined', () => {
    const goal: CaloriesPercentageGoal = { type: 'weight-loss', adjustmentPercentage: -0.2, calculationStrategy: 'calories-percentage-based', split: { protein: 0.4, carbs: 0.3, fat: 0.3 } };
    const result = getMacroRecommendation(goal, mockUserProfile, undefined);
    expect(result).toBeNull();
  });
});
