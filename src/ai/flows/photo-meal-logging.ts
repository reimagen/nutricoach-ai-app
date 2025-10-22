'use server';

/**
 * @fileOverview A flow for logging meals by taking a photo of the food.
 *
 * - photoMealLogging - A function that handles the photo meal logging process.
 * - PhotoMealLoggingInput - The input type for the photoMealLogging function.
 * - PhotoMealLoggingOutput - The return type for the photoMealLogging function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PhotoMealLoggingInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of the meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type PhotoMealLoggingInput = z.infer<typeof PhotoMealLoggingInputSchema>;

const PhotoMealLoggingOutputSchema = z.object({
  foodItems: z
    .array(z.string())
    .describe('A list of food items identified in the photo.'),
  macroEstimates: z.object({
    calories: z.number().describe('Estimated calories in the meal.'),
    protein: z.number().describe('Estimated protein in grams.'),
    carbs: z.number().describe('Estimated carbohydrates in grams.'),
    fat: z.number().describe('Estimated fat in grams.'),
  }).describe('Estimated macro values for the meal.'),
});
export type PhotoMealLoggingOutput = z.infer<typeof PhotoMealLoggingOutputSchema>;

export async function photoMealLogging(input: PhotoMealLoggingInput): Promise<PhotoMealLoggingOutput> {
  return photoMealLoggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'photoMealLoggingPrompt',
  input: {schema: PhotoMealLoggingInputSchema},
  output: {schema: PhotoMealLoggingOutputSchema},
  prompt: `You are an AI assistant that analyzes images of meals and estimates their nutritional content.

  Analyze the photo and identify the food items present.  Then, estimate the macro content of the meal.

  Photo: {{media url=photoDataUri}}
  `,
});

const photoMealLoggingFlow = ai.defineFlow(
  {
    name: 'photoMealLoggingFlow',
    inputSchema: PhotoMealLoggingInputSchema,
    outputSchema: PhotoMealLoggingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
