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
  prompt: `You are an expert nutritionist. Your task is to analyze the user's meal description and return nutritional estimates.

**Strict Rules:**
1.  Analyze the user's meal description: "{{mealDescription}}".
2.  Provide your best estimate for calories (kcal), protein (grams), carbohydrates (grams), and fat (grams).
3.  Your output **MUST** be a valid JSON object that strictly adheres to the provided output schema.
4.  Do **NOT** include any other text, explanations, or introductory phrases in your response. Only the JSON object is allowed.

Example valid output:
{
  "estimatedKcal": 250,
  "estimatedProteinGrams": 20,
  "estimatedCarbGrams": 1,
  "estimatedFatGrams": 18
}
`,
});

const estimateMacrosFlow = ai.defineFlow(
  {
    name: 'estimateMacrosFlow',
    inputSchema: EstimateMacrosInputSchema,
    outputSchema: EstimateMacrosOutputSchema,
  },
  async input => {
    const {output: rawOutput} = await prompt(input);
    if (!rawOutput) {
      throw new Error("Unable to process request. AI model did not return an output.");
    }
    
    // Sometimes the model returns a string containing JSON. We need to parse it.
    let output: EstimateMacrosOutput;
    if (typeof rawOutput === 'string') {
        try {
            const jsonMatch = rawOutput.match(/\{.*\}/s);
            if (!jsonMatch) {
                throw new Error("No valid JSON object found in the AI's string response.");
            }
            output = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Failed to parse stringified JSON from AI:", e);
            throw new Error("The AI returned a malformed response.");
        }
    } else {
        output = rawOutput as EstimateMacrosOutput;
    }


    // This robust parsing is a fallback, the strict prompt should prevent non-numeric values.
    const parsedKcal = parseFloat(output.estimatedKcal?.toString() || '0');
    const parsedProtein = parseFloat(output.estimatedProteinGrams?.toString() || '0');
    const parsedCarbs = parseFloat(output.estimatedCarbGrams?.toString() || '0');
    const parsedFat = parseFloat(output.estimatedFatGrams?.toString() || '0');

    return {
      estimatedKcal: isNaN(parsedKcal) ? 0 : parsedKcal,
      estimatedProteinGrams: isNaN(parsedProtein) ? 0 : parsedProtein,
      estimatedCarbGrams: isNaN(parsedCarbs) ? 0 : parsedCarbs,
      estimatedFatGrams: isNaN(parsedFat) ? 0 : parsedFat,
    };
  }
);
