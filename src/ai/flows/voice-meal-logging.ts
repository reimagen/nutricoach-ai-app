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
import { FoodItemSchema, MealInfoSchema } from '@/ai/shared-types';

const VoiceMealLoggingInputSchema = z.object({
  speechText: z
    .string()
    .describe('The transcribed text from the user\'s voice input.'),
});
export type VoiceMealLoggingInput = z.infer<typeof VoiceMealLoggingInputSchema>;

export type VoiceMealLoggingOutput = z.infer<typeof MealInfoSchema>;

export async function voiceMealLogging(input: VoiceMealLoggingInput): Promise<VoiceMealLoggingOutput> {
  return voiceMealLoggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceMealLoggingPrompt',
  input: {schema: VoiceMealLoggingInputSchema},
  output: {schema: MealInfoSchema},
  prompt: `You are an expert nutritionist AI. A user has described a meal they ate using their voice. Your task is to analyze the transcribed text and provide a detailed nutritional breakdown.

User's meal description:
"{{speechText}}"

Your instructions are as follows:
1.  **Identify Meal Category**: Determine if the meal is breakfast, lunch, dinner, or a snack. If the user does not specify, set the 'mealCategory' to 'unknown'.
2.  **Itemize Foods**: Break down the meal into individual food items. For each item, provide a description (e.g., "2 large hard-boiled eggs") and estimate its macronutrients (calories, protein, carbohydrates, fat).
3.  **Calculate Totals**: Sum the macronutrients from all individual items to get the total for the meal.
4.  **Create a Summary**: Provide a brief, engaging summary of the meal in the 'mealDescription'.
5.  **Ask for Clarification**: If the meal category is 'unknown', you MUST include a question in the 'mealDescription' asking the user to clarify (e.g., "I've analyzed your meal. What category was it: breakfast, lunch, dinner, or a snack?").

Produce a JSON object that strictly follows this schema.`,
});

const voiceMealLoggingFlow = ai.defineFlow(
  {
    name: 'voiceMealLoggingFlow',
    inputSchema: VoiceMealLoggingInputSchema,
    outputSchema: MealInfoSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
