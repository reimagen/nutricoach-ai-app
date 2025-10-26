
import { calculateDailyMealTotal } from '../calculateDailyMealTotal';
import { calculateMealEntryMacros } from '../calculateMealEntry';
import { MealEntry, Macros } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Mock the calculateMealEntryMacros function
jest.mock('../calculateMealEntry', () => ({
  calculateMealEntryMacros: jest.fn((items) => {
    // Return a fixed macro object for simplicity
    return { calories: 100, protein: 10, carbs: 10, fat: 5 };
  }),
}));

describe('calculateDailyMealTotal', () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const baseMealEntry: Omit<MealEntry, 'id' | 'timestamp'> = {
    mealCategory: 'breakfast',
    description: 'A test meal',
    items: [], // Items are not relevant as we mock the next function
    macros: { calories: 100, protein: 10, carbs: 10, fat: 5 },
    createdAt: Timestamp.fromDate(today),
    updatedAt: Timestamp.fromDate(today),
  };

  beforeEach(() => {
    // Clear mock history before each test
    (calculateMealEntryMacros as jest.Mock).mockClear();
  });

  it('should return zero macros for an empty array of meal entries', () => {
    const result = calculateDailyMealTotal([]);
    expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(calculateMealEntryMacros).not.toHaveBeenCalled();
  });

  it('should only sum macros from meal entries dated today', () => {
    const mealEntries: MealEntry[] = [
      { ...baseMealEntry, id: '1', timestamp: Timestamp.fromDate(today) },
      { ...baseMealEntry, id: '2', timestamp: Timestamp.fromDate(yesterday) },
      { ...baseMealEntry, id: '3', timestamp: Timestamp.fromDate(tomorrow) },
      { ...baseMealEntry, id: '4', timestamp: Timestamp.fromDate(today) },
    ];

    const result = calculateDailyMealTotal(mealEntries);

    // Expecting the sum of 2 entries from today
    expect(result).toEqual({ calories: 200, protein: 20, carbs: 20, fat: 10 });
    expect(calculateMealEntryMacros).toHaveBeenCalledTimes(2);
  });

  it('should return zero macros if no meal entries are from today', () => {
    const mealEntries: MealEntry[] = [
      { ...baseMealEntry, id: '1', timestamp: Timestamp.fromDate(yesterday) },
      { ...baseMealEntry, id: '2', timestamp: Timestamp.fromDate(tomorrow) },
    ];

    const result = calculateDailyMealTotal(mealEntries);
    expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(calculateMealEntryMacros).not.toHaveBeenCalled();
  });

  it('should correctly handle a native Date object for the timestamp', () => {
    const mealEntries: MealEntry[] = [
        // This is not a valid MealEntry according to our types, but the function should handle it
        // @ts-ignore
      { ...baseMealEntry, id: '1', timestamp: today },
    ];

    const result = calculateDailyMealTotal(mealEntries);
    expect(result).toEqual({ calories: 100, protein: 10, carbs: 10, fat: 5 });
    expect(calculateMealEntryMacros).toHaveBeenCalledTimes(1);
  });
});
