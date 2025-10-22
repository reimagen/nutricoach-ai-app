import {z} from 'genkit';

export const FoodItemSchema = z.object({
  name: z.string().describe('Description of the food item (e.g., "2 large hard-boiled eggs", "1 cup of black coffee").'),
  macros: z.object({
    caloriesKcal: z.number(),
    proteinG: z.number(),
    carbohydrateG: z.number(),
    fatG: z.number(),
  }),
});

export const MealInfoSchema = z.object({
  mealDescription: z.string().describe('A summary description of the meal.'),
  mealCategory: z
      .enum(['breakfast', 'lunch', 'dinner', 'snack', 'unknown'])
      .describe('The category of the meal. MUST be set to "unknown" if not explicitly specified by the user.'),
  items: z.array(FoodItemSchema).describe('An itemized list of the foods in the meal.'),
  totalMacros: z.object({
      caloriesKcal: z.number().describe('Total estimated calories for the entire meal.'),
      proteinG: z.number().describe('Total estimated protein in grams for the entire meal.'),
      carbohydrateG: z.number().describe('Total estimated carbohydrates in grams for the entire meal.'),
      fatG: z.number().describe('Total estimated fat in grams for the entire meal.'),
  }).describe('Total estimated macro breakdown for the entire meal.'),
});
export type MealInfo = z.infer<typeof MealInfoSchema>;
