import { User, MealEntry, TranscriptEntry } from '@/types';
import { AppState } from './AppState';

// Defines the types of actions that can be dispatched.
export enum ActionType {
    SET_STATE = 'SET_STATE',
    SET_USER = 'SET_USER',
    SET_MEAL_ENTRIES = 'SET_MEAL_ENTRIES',
    ADD_MEAL_ENTRY = 'ADD_MEAL_ENTRY',
    ADD_TRANSCRIPT_ENTRY = 'ADD_TRANSCRIPT_ENTRY',
    UPDATE_TRANSCRIPT = 'UPDATE_TRANSCRIPT',
    CLEAR_CONVERSATION = 'CLEAR_CONVERSATION',
}

// Action to replace the entire state
export interface SetStateAction {
    type: ActionType.SET_STATE;
    payload: Partial<AppState>;
}

// Action to set the user.
export interface SetUserAction {
    type: ActionType.SET_USER;
    payload: User;
}

// Action to set all meal entries
export interface SetMealEntriesAction {
    type: ActionType.SET_MEAL_ENTRIES;
    payload: MealEntry[];
}

// Action to add a single meal entry
export interface AddMealEntryAction {
    type: ActionType.ADD_MEAL_ENTRY;
    payload: MealEntry;
}

// Action to add a new transcript entry
export interface AddTranscriptEntryAction {
    type: ActionType.ADD_TRANSCRIPT_ENTRY;
    payload: TranscriptEntry;
}

// Action to update the last transcript entry in real-time.
export interface UpdateTranscriptAction {
    type: ActionType.UPDATE_TRANSCRIPT;
    payload: { source: 'user' | 'agent'; text: string };
}

// Action to clear the conversation.
export interface ClearConversationAction {
    type: ActionType.CLEAR_CONVERSATION;
}

// A union of all possible actions.
export type AppAction = 
    | SetStateAction 
    | SetUserAction 
    | SetMealEntriesAction 
    | AddMealEntryAction
    | AddTranscriptEntryAction
    | UpdateTranscriptAction
    | ClearConversationAction;
