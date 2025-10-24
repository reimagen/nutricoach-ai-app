'use server';

/**
 * @fileOverview Conversational meal logging flow.
 *
 * - conversationalMealLogging - A function that handles a conversational turn.
 * - ConversationalMealLoggingInput - The input type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationalMealLoggingInputSchema = z.object({
  userQuery: z.string().describe('The user\'s spoken query.'),
  conversationHistory: z.array(z.string()).describe('The history of the conversation so far.').optional(),
});
export type ConversationalMealLoggingInput = z.infer<typeof ConversationalMealLoggingInputSchema>;


export async function conversationalMealLogging(input: ConversationalMealLoggingInput): Promise<string> {
  return conversationalMealLoggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'conversationalMealLoggingPrompt',
  input: {schema: ConversationalMealLoggingInputSchema},
  output: {schema: z.string()},
  prompt: `You are NutriCoach AI, a friendly and conversational nutrition assistant. A user is speaking to you to log their meals or ask questions. Your goal is to gather enough information to log a meal.

Your primary goal is to determine the food items and the meal category (breakfast, lunch, dinner, or snack).

Keep your responses brief, natural, and conversational, as if you were speaking.

If the user asks a general nutrition question, answer it concisely.

Once you believe you have enough information to create a meal log (i.e., you have at least one food item), you should end your response with the special token: [DONE]

Conversation History (for context):
{{#if conversationHistory}}
{{#each conversationHistory}}
- {{this}}
{{/each}}
{{/if}}

Current User Query:
"{{userQuery}}"

Based on this, generate your next conversational response. Remember to add [DONE] if you think the meal is ready to be analyzed.
`,
});

const conversationalMealLoggingFlow = ai.defineFlow(
  {
    name: 'conversationalMealLoggingFlow',
    inputSchema: ConversationalMealLoggingInputSchema,
    outputSchema: z.string(),
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
