'use server';

/**
 * @fileOverview AI-powered macro estimation flow.
 *
 * - estimateMacros - Estimates macros for a given meal description.
 * - EstimateMacrosInput - The input type for the estimateMacros function.
 * - EstimateMacrosOutput - The return type for the estimateMacros function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateMacrosInputSchema = z.object({
  mealDescription: z
    .string()
    .describe('A description of the meal, including all food items and approximate quantities.'),
});

export type EstimateMacrosInput = z.infer<typeof EstimateMacrosInputSchema>;

const EstimateMacrosOutputSchema = z.object({
  estimatedKcal: z.number().describe('Estimated total calories in kcal for the meal.'),
  estimatedProteinGrams: z.number().describe('Estimated protein content in grams.'),
  estimatedCarbGrams: z.number().describe('Estimated carbohydrate content in grams.'),
  estimatedFatGrams: z.number().describe('Estimated fat content in grams.'),
});

export type EstimateMacrosOutput = z.infer<typeof EstimateMacrosOutputSchema>;

export async function estimateMacros(input: EstimateMacrosInput): Promise<EstimateMacrosOutput> {
  return estimateMacrosFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateMacrosPrompt',
  input: {schema: EstimateMacrosInputSchema},
  output: {schema: EstimateMacrosOutputSchema},
  prompt: `You are a nutrition expert.  Given the following description of a meal, estimate the macros (calories, protein, carbs, and fat).

Description: {{{mealDescription}}}

Provide your best estimate for the following:
- Estimated total calories (kcal):
- Estimated protein (grams):
- Estimated carbohydrates (grams):
- Estimated fat (grams):

Ensure your estimates are realistic and based on typical nutritional values for common foods.  Present the estimated values clearly.  Do not include explanations or additional text.

{{#if estimatedKcal}}Estimated Calories: {{estimatedKcal}} kcal{{/if}}
{{#if estimatedProteinGrams}}Estimated Protein: {{estimatedProteinGrams}} g{{/if}}
{{#if estimatedCarbGrams}}Estimated Carbs: {{estimatedCarbGrams}} g{{/if}}
{{#if estimatedFatGrams}}Estimated Fat: {{estimatedFatGrams}} g{{/if}}`,
});

const estimateMacrosFlow = ai.defineFlow(
  {
    name: 'estimateMacrosFlow',
    inputSchema: EstimateMacrosInputSchema,
    outputSchema: EstimateMacrosOutputSchema,
  },
  async input => {
    const response = await prompt(input);

    // Attempt to parse the LLM output into the desired schema.  If the LLM hallucinates and includes
    // introductory or concluding remarks, or any other text besides the data fields, then
    // this parseFloat operation will return NaN.  In that case, consider re-wording the prompt.
    const parsedKcal = parseFloat(response.output?.estimatedKcal?.toString() || 'NaN');
    const parsedProtein = parseFloat(response.output?.estimatedProteinGrams?.toString() || 'NaN');
    const parsedCarbs = parseFloat(response.output?.estimatedCarbGrams?.toString() || 'NaN');
    const parsedFat = parseFloat(response.output?.estimatedFatGrams?.toString() || 'NaN');

    return {
      estimatedKcal: parsedKcal,
      estimatedProteinGrams: parsedProtein,
      estimatedCarbGrams: parsedCarbs,
      estimatedFatGrams: parsedFat,
    };
  }
);
