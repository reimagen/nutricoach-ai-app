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

const VoiceMealLoggingOutputSchema = z.object({
  mealDescription: z.string().describe('A detailed description of the meal.'),
  estimatedMacros: z.object({
    caloriesKcal: z.number().describe('Estimated calories in kcal.'),
    proteinG: z.number().describe('Estimated protein in grams.'),
    carbohydrateG: z.number().describe('Estimated carbohydrates in grams.'),
    fatG: z.number().describe('Estimated fat in grams.'),
  }).describe('Estimated macro breakdown of the meal.'),
});
export type VoiceMealLoggingOutput = z.infer<typeof VoiceMealLoggingOutputSchema>;

export async function voiceMealLogging(input: VoiceMealLoggingInput): Promise<VoiceMealLoggingOutput> {
  return voiceMealLoggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceMealLoggingPrompt',
  input: {schema: VoiceMealLoggingInputSchema},
  output: {schema: VoiceMealLoggingOutputSchema},
  prompt: `You are a nutrition expert. A user has provided the following text describing their meal:

{{speechText}}

Based on this text, provide a detailed description of the meal and estimate its macro breakdown. Please use your best judgement to fill in any gaps.

Format the output as a JSON object with \"mealDescription\" and \"estimatedMacros\" fields. The \"estimatedMacros\" field should itself be a JSON object with \"caloriesKcal\", \"proteinG\", \"carbohydrateG\", and \"fatG\" fields.`, 
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
