
import { calculateMealEntryMacros } from '../calculateMealEntry';
import { calculateMealItemMacros } from '../calculateMealItem';
import { MealItem, Macros } from '@/types';

jest.mock('../calculateMealItem', () => ({
  calculateMealItemMacros: jest.fn((item: MealItem) => item.macros),
}));

describe('calculateMealEntryMacros', () => {
  beforeEach(() => {
    // Clear mock history before each test
    (calculateMealItemMacros as jest.Mock).mockClear();
  });

  it('should return zero for all macros if the item list is empty', () => {
    const result = calculateMealEntryMacros([]);
    expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('should correctly calculate macros for a single meal item', () => {
    const mockMacros: Macros = { calories: 300, protein: 30, carbs: 20, fat: 10 };
    const mockItems: MealItem[] = [
      { id: '1', name: 'Chicken Breast', macros: mockMacros, servings: 1, servingSize: '100g' },
    ];

    const result = calculateMealEntryMacros(mockItems);

    expect(result).toEqual(mockMacros);
    expect(calculateMealItemMacros).toHaveBeenCalledTimes(1);
    expect(calculateMealItemMacros).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should correctly sum the macros from multiple meal items', () => {
    const mockItems: MealItem[] = [
      {
        id: '1',
        name: 'Chicken Breast',
        macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        servings: 1,
        servingSize: '100g',
      },
      {
        id: '2',
        name: 'Brown Rice',
        macros: { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
        servings: 1,
        servingSize: '1 cup',
      },
      {
        id: '3',
        name: 'Broccoli',
        macros: { calories: 55, protein: 3.7, carbs: 11.2, fat: 0.6 },
        servings: 1,
        servingSize: '1 cup',
      },
    ];

    const result = calculateMealEntryMacros(mockItems);

    const expectedMacros: Macros = {
      calories: 165 + 111 + 55, // 331
      protein: 31 + 2.6 + 3.7, // 37.3
      carbs: 0 + 23 + 11.2, // 34.2
      fat: 3.6 + 0.9 + 0.6, // 5.1
    };

    expect(result.calories).toBeCloseTo(expectedMacros.calories);
    expect(result.protein).toBeCloseTo(expectedMacros.protein);
    expect(result.carbs).toBeCloseTo(expectedMacros.carbs);
    expect(result.fat).toBeCloseTo(expectedMacros.fat);

    expect(calculateMealItemMacros).toHaveBeenCalledTimes(3);
  });
});
