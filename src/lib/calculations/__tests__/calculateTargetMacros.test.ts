
import { calculateTargetMacros } from '../calculateTargetMacros';
import { calculateBMR } from '../calculateBMR';
import { calculateTDEE } from '../calculateTDEE';
import { getMacroRecommendation } from '../getMacroRecommendation';
import { UserProfile, UserGoal, Macros } from '@/types';

// Mock the dependencies to isolate the orchestration logic of calculateTargetMacros
jest.mock('../calculateBMR', () => ({ calculateBMR: jest.fn() }));
jest.mock('../calculateTDEE', () => ({ calculateTDEE: jest.fn() }));
jest.mock('../getMacroRecommendation', () => ({ getMacroRecommendation: jest.fn() }));

describe('calculateTargetMacros', () => {
  const mockUserProfile: UserProfile = {
    age: 30,
    gender: 'male',
    height: 175,
    weight: 70,
    activityLevel: 'sedentary',
  };

  const mockUserGoal: UserGoal = {
    type: 'weight-loss',
    adjustmentPercentage: -0.20, // 20% deficit
    calculationStrategy: 'bodyweight', // Example strategy
    proteinPerBodyweight: 1.8,
    remainingSplit: { carbs: 0.5, fat: 0.5 },
  };

  const mockMacros: Macros = { calories: 2000, protein: 150, carbs: 200, fat: 67 };

  beforeEach(() => {
    // Reset mocks before each test
    (calculateBMR as jest.Mock).mockClear();
    (calculateTDEE as jest.Mock).mockClear();
    (getMacroRecommendation as jest.Mock).mockClear();
  });

  it('should correctly orchestrate the macro calculation process', () => {
    // 1. Setup mock return values for the dependencies
    const mockBMR = 1600;
    const mockTDEE = 2000;
    (calculateBMR as jest.Mock).mockReturnValue(mockBMR);
    (calculateTDEE as jest.Mock).mockReturnValue(mockTDEE);
    (getMacroRecommendation as jest.Mock).mockReturnValue(mockMacros);

    // 2. Execute the function
    const result = calculateTargetMacros(mockUserProfile, mockUserGoal);

    // 3. Verify the orchestration flow
    // It should call BMR calculation with the user's profile
    expect(calculateBMR).toHaveBeenCalledWith(mockUserProfile);

    // It should call TDEE calculation with the result of BMR and the activity level
    expect(calculateTDEE).toHaveBeenCalledWith(mockBMR, mockUserProfile.activityLevel);

    // It should calculate the correct calorie target
    const expectedCalorieTarget = mockTDEE * (1 + mockUserGoal.adjustmentPercentage); // 2000 * 0.8 = 1600

    // It should delegate to the recommendation function with the correct parameters
    expect(getMacroRecommendation).toHaveBeenCalledWith(mockUserGoal, mockUserProfile, expectedCalorieTarget);

    // 4. Verify the final output
    // It should return the result from the recommendation function
    expect(result).toEqual(mockMacros);
  });

  it('should return null if userProfile is not provided', () => {
    const result = calculateTargetMacros(undefined as any, mockUserGoal);
    expect(result).toBeNull();
  });

  it('should return null if userGoal is not provided', () => {
    const result = calculateTargetMacros(mockUserProfile, undefined as any);
    expect(result).toBeNull();
  });
});
