'use server';

/**
 * @fileOverview Conversational meal logging flow.
 *
 * - conversationalMealLogging - A function that handles a conversational turn.
 * - ConversationalMealLoggingInput - The input type for the function.
 * - ConversationalMealLoggingOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationalMealLoggingInputSchema = z.object({
  userQuery: z.string().describe('The user\'s spoken query.'),
  conversationHistory: z.array(z.string()).describe('The history of the conversation so far.').optional(),
});
export type ConversationalMealLoggingInput = z.infer<typeof ConversationalMealLoggingInputSchema>;

const FoodItemSchema = z.object({
  name: z.string().describe('Description of the food item (e.g., "2 large hard-boiled eggs", "1 cup of black coffee").'),
  macros: z.object({
    caloriesKcal: z.number(),
    proteinG: z.number(),
    carbohydrateG: z.number(),
    fatG: z.number(),
  }),
});

const ConversationalMealLoggingOutputSchema = z.object({
  response: z.string().describe('The AI\'s spoken response to the user.'),
  isEndOfConversation: z.boolean().describe('Whether the AI considers the current conversational exchange to be complete.'),
  mealToLog: z.object({
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
  }).optional().describe('The structured meal data to be logged. This should only be populated when the meal details are finalized.'),
});
export type ConversationalMealLoggingOutput = z.infer<typeof ConversationalMealLoggingOutputSchema>;


export async function conversationalMealLogging(input: ConversationalMealLoggingInput): Promise<ConversationalMealLoggingOutput> {
  return conversationalMealLoggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'conversationalMealLoggingPrompt',
  input: {schema: ConversationalMealLoggingInputSchema},
  output: {schema: ConversationalMealLoggingOutputSchema},
  prompt: `You are NutriCoach AI, a friendly and conversational nutrition assistant. A user is speaking to you to log their meals or ask questions. Engage in a natural, spoken conversation.

Your primary goal is to gather meal information. Ask clarifying questions if needed. Once you have enough detail to log a meal (e.g., food items, quantities, and meal type like breakfast/lunch/dinner), your tasks are:
1.  **Confirm the meal with the user** in your 'response' text (e.g., "Got it! Two hard-boiled eggs and one black coffee for breakfast. I'll log that for you.").
2.  **Set 'isEndOfConversation' to true.**
3.  **Populate the 'mealToLog' object** with the full, structured details of the meal, including itemized foods, macro estimates, totals, and the meal category. Use your nutritional expertise to estimate macros for each item.

If the user asks a general nutrition question, answer it and set 'isEndOfConversation' to true, leaving 'mealToLog' empty.

Keep your 'response' text concise and conversational, as if you were speaking.

Conversation History (for context):
{{#if conversationHistory}}
{{#each conversationHistory}}
- {{this}}
{{/each}}
{{/if}}

Current User Query:
"{{userQuery}}"

Based on this, generate your next response and actions.
`,
});

const conversationalMealLoggingFlow = ai.defineFlow(
  {
    name: 'conversationalMealLoggingFlow',
    inputSchema: ConversationalMealLoggingInputSchema,
    outputSchema: ConversationalMealLoggingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
