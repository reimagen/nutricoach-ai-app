
import { calculateMealItemMacros } from '../calculateMealItem';
import { MealItem, Macros } from '@/types';

describe('calculateMealItemMacros', () => {
  it('should return the exact macros object from a given meal item', () => {
    // 1. Define the mock macros and meal item
    const mockMacros: Macros = {
      calories: 150,
      protein: 25,
      carbs: 0,
      fat: 5,
    };

    const mockMealItem: MealItem = {
      id: 'item-123',
      name: 'Grilled Chicken Breast',
      macros: mockMacros,
      servings: 1,
      servingSize: '100g',
    };

    // 2. Execute the function
    const result = calculateMealItemMacros(mockMealItem);

    // 3. Assert the result
    // The function should return the identical macros object.
    expect(result).toEqual(mockMacros);
    // We can also check for object reference equality since it should be a direct pass-through
    expect(result).toBe(mockMacros);
  });

  it('should handle different macro values correctly', () => {
    // 1. Define a different set of mock macros and meal item
    const mockMacros: Macros = {
      calories: 300,
      protein: 10,
      carbs: 50,
      fat: 8,
    };

    const mockMealItem: MealItem = {
      id: 'item-456',
      name: 'Oatmeal with Berries',
      macros: mockMacros,
      servings: 1,
      servingSize: '1 cup',
    };

    // 2. Execute the function
    const result = calculateMealItemMacros(mockMealItem);

    // 3. Assert the result
    expect(result).toEqual(mockMacros);
  });
});
