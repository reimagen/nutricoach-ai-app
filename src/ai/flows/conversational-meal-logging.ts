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

const ConversationalMealLoggingOutputSchema = z.object({
  response: z.string().describe('The AI\'s spoken response to the user.'),
  isEndOfConversation: z.boolean().describe('Whether the AI considers the current conversational exchange to be complete.'),
  // In a real app, you might include structured data here to save to a DB
  // For now, we'll just keep it conversational.
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

Your primary goal is to gather meal information. When you have enough detail to log a meal (e.g., food items, quantities, and meal type like breakfast/lunch/dinner), confirm with the user and then set 'isEndOfConversation' to true.

Keep your responses concise and conversational, as if you were speaking.

If the user asks a general nutrition question, answer it and consider the conversation ended.

Conversation History (for context):
{{#if conversationHistory}}
{{#each conversationHistory}}
- {{this}}
{{/each}}
{{/if}}

Current User Query:
"{{userQuery}}"

Based on this, generate your next response.
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
