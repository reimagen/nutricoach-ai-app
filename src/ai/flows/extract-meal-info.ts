'use server';

/**
 * @fileOverview Extracts structured meal information from a conversation transcript.
 *
 * - extractMealInfo - A function that extracts meal data.
 * - ExtractMealInfoInput - The input type for the function.
 * - MealInfo - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractMealInfoInputSchema = z.object({
  conversationHistory: z.string().describe('The full transcript of the conversation between the user and the AI.'),
});
export type ExtractMealInfoInput = z.infer<typeof ExtractMealInfoInputSchema>;

const FoodItemSchema = z.object({
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


export async function extractMealInfo(input: ExtractMealInfoInput): Promise<MealInfo> {
  return extractMealInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractMealInfoPrompt',
  input: {schema: ExtractMealInfoInputSchema},
  output: {schema: MealInfoSchema},
  prompt: `You are an expert nutrition data analyst. Your task is to analyze a conversation transcript and extract structured information about a meal.

**Strict Rules:**
1.  Analyze the *entire* conversation to determine the meal items and category.
2.  If the user has not explicitly stated whether the meal is breakfast, lunch, dinner, or a snack, you MUST set 'mealCategory' to 'unknown'.
3.  Accurately identify all food items mentioned.
4.  Estimate the macronutrients (calories, protein, carbohydrates, fat) for each item.
5.  Calculate the total macros for the entire meal.
6.  Create a brief, accurate summary for 'mealDescription'.
7.  If no meal is described, return an empty 'items' array and set 'mealCategory' to 'unknown'.

Conversation Transcript:
---
{{conversationHistory}}
---

Based on the transcript, produce a JSON object that strictly follows the required schema.
`,
});

const extractMealInfoFlow = ai.defineFlow(
  {
    name: 'extractMealInfoFlow',
    inputSchema: ExtractMealInfoInputSchema,
    outputSchema: MealInfoSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
