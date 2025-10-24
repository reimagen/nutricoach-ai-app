
'use server';

/**
 * @fileOverview A flow for logging meals by taking a photo of the food.
 *
 * - photoMealLogging - A function that handles the photo meal logging process.
 * - PhotoMealLoggingInput - The input type for the photoMealLogging function.
 * - MealInfo - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MealInfo, MealInfoSchema } from '@/ai/shared-types';

const PhotoMealLoggingInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of the meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type PhotoMealLoggingInput = z.infer<typeof PhotoMealLoggingInputSchema>;

export type PhotoMealLoggingOutput = z.infer<typeof MealInfoSchema>;

export async function photoMealLogging(input: PhotoMealLoggingInput): Promise<PhotoMealLoggingOutput> {
  return photoMealLoggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'photoMealLoggingPrompt',
  input: {schema: PhotoMealLoggingInputSchema},
  output: {schema: MealInfoSchema},
  prompt: `You are an expert nutritionist AI that analyzes images of meals. Your task is to analyze the provided photo and return a detailed nutritional breakdown.

**Strict Rules:**
1.  **Analyze the Photo**: Carefully examine the meal in the photo provided.
2.  **Itemize Foods**: Break down the meal into individual food items. For each item, provide a description (e.g., "2 large fried eggs", "half an avocado").
3.  **Estimate Macros**: For each item, estimate its macronutrients (calories, protein, carbohydrates, fat).
4.  **Calculate Totals**: Sum the macros from all items to get the meal's total.
5.  **Create a Summary**: Provide a brief summary of the meal in the 'mealDescription'.
6.  **Meal Category**: Set the 'mealCategory' to 'unknown'. The user will clarify this later if needed.
7.  **If Unclear**: If the image is not clear or does not contain food, return an empty 'items' array and set 'mealCategory' to 'unknown'.

Photo: {{media url=photoDataUri}}

Produce a JSON object that strictly follows the required schema.
`,
});

const photoMealLoggingFlow = ai.defineFlow(
  {
    name: 'photoMealLoggingFlow',
    inputSchema: PhotoMealLoggingInputSchema,
    outputSchema: MealInfoSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
