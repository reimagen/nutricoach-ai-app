
import { MealItem, Macros } from '@/types';

/**
 * Calculates the total macros for a single meal item. This function might seem simple,
 * but it provides a consistent, single point of logic for processing meal items,
 * which will be useful if item-level adjustments or calculations are needed in the future.
 * @param item - A MealItem object.
 * @returns The Macros object for that item.
 */
export const calculateMealItemMacros = (item: MealItem): Macros => {
  // For now, this is a simple pass-through, but it can be expanded later.
  return item.macros;
};
