'use server';

/**
 * @fileOverview Voice meal logging flow.
 *
 * - voiceMealLogging - A function that handles logging meals via voice input.
 * - VoiceMealLoggingInput - The input type for the voiceMealLogging function.
 * - VoiceMealLoggingOutput - The return type for the voiceMealLogging function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceMealLoggingInputSchema = z.object({
  speechText: z
    .string()
    .describe('The transcribed text from the user\'s voice input.'),
});
export type VoiceMealLoggingInput = z.infer<typeof VoiceMealLoggingInputSchema>;

const FoodItemSchema = z.object({
  name: z.string().describe('Description of the food item (e.g., "2 large hard-boiled eggs", "1 cup of black coffee").'),
  macros: z.object({
    caloriesKcal: z.number(),
    proteinG: z.number(),
    carbohydrateG: z.number(),
    fatG: z.number(),
  }),
});

const VoiceMealLoggingOutputSchema = z.object({
    mealDescription: z.string().describe('A summary description of the meal. If the meal category is unknown, this field should ask the user for clarification.'),
    mealCategory: z
        .enum(['breakfast', 'lunch', 'dinner', 'snack', 'unknown'])
        .describe('The category of the meal. Set to "unknown" if not specified by the user.'),
    items: z.array(FoodItemSchema).describe('An itemized list of the foods in the meal.'),
    totalMacros: z.object({
        caloriesKcal: z.number().describe('Total estimated calories for the entire meal.'),
        proteinG: z.number().describe('Total estimated protein in grams for the entire meal.'),
        carbohydrateG: z.number().describe('Total estimated carbohydrates in grams for the entire meal.'),
        fatG: z.number().describe('Total estimated fat in grams for the entire meal.'),
    }).describe('Total estimated macro breakdown for the entire meal.'),
});

export type VoiceMealLoggingOutput = z.infer<typeof VoiceMealLoggingOutputSchema>;

export async function voiceMealLogging(input: VoiceMealLoggingInput): Promise<VoiceMealLoggingOutput> {
  return voiceMealLoggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceMealLoggingPrompt',
  input: {schema: VoiceMealLoggingInputSchema},
  output: {schema: VoiceMealLoggingOutputSchema},
  prompt: `You are an expert nutritionist AI. A user has described a meal they ate using their voice. Your task is to analyze the transcribed text and provide a detailed nutritional breakdown.

User's meal description:
"{{speechText}}"

Your instructions are as follows:
1.  **Identify Meal Category**: Determine if the meal is breakfast, lunch, dinner, or a snack. If the user does not specify, set the 'mealCategory' to 'unknown'.
2.  **Itemize Foods**: Break down the meal into individual food items. For each item, provide a description (e.g., "2 large hard-boiled eggs") and estimate its macronutrients (calories, protein, carbohydrates, fat).
3.  **Calculate Totals**: Sum the macronutrients from all individual items to get the total for the meal.
4.  **Create a Summary**: Provide a brief, engaging summary of the meal in the 'mealDescription'.
5.  **Ask for Clarification**: If the meal category is 'unknown', you MUST include a question in the 'mealDescription' asking the user to clarify (e.g., "I've analyzed your meal. What category was it: breakfast, lunch, dinner, or a snack?").

Produce a JSON object that strictly follows this schema:
-   'mealCategory': one of 'breakfast', 'lunch', 'dinner', 'snack', or 'unknown'.
-   'items': An array of objects, where each object has:
    -   'name': string description of the item.
    -   'macros': an object with 'caloriesKcal', 'proteinG', 'carbohydrateG', and 'fatG' as numbers.
-   'totalMacros': An object with the total 'caloriesKcal', 'proteinG', 'carbohydrateG', and 'fatG' as numbers.
-   'mealDescription': A string containing the meal summary and a clarification question if needed.`,
});

const voiceMealLoggingFlow = ai.defineFlow(
  {
    name: 'voiceMealLoggingFlow',
    inputSchema: VoiceMealLoggingInputSchema,
    outputSchema: VoiceMealLoggingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
