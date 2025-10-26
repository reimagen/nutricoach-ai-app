
import { AppState } from './AppState';
import { AppAction, ActionType } from './actions';

export const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case ActionType.SET_STATE:
            return {
                ...state,
                ...action.payload,
            };

        case ActionType.SET_USER:
            // Replaces the user object. Expects a complete User object.
            return {
                ...state,
                user: action.payload,
            };

        case ActionType.SET_MEAL_ENTRIES:
            // Replaces the entire list of meal entries.
            return {
                ...state,
                mealEntries: action.payload,
            };

        case ActionType.ADD_MEAL_ENTRY:
            // Adds a single meal entry to the existing list.
            return {
                ...state,
                mealEntries: [...state.mealEntries, action.payload],
            };
        
        case ActionType.ADD_TRANSCRIPT_ENTRY:
            // Adds a finalized transcript entry.
            return {
                ...state,
                transcript: [...state.transcript, action.payload],
            };

        case ActionType.UPDATE_TRANSCRIPT:
            // Updates the last transcript entry if it's not final, otherwise adds a new one.
            const lastEntry = state.transcript[state.transcript.length - 1];
            if (lastEntry && lastEntry.source === action.payload.source && !lastEntry.isFinal) {
                // Update the text of the last, non-final entry from the same source
                const updatedEntry = { ...lastEntry, text: action.payload.text };
                return {
                    ...state,
                    transcript: [...state.transcript.slice(0, -1), updatedEntry],
                };
            } else {
                // Add a new, non-final entry
                return {
                    ...state,
                    transcript: [...state.transcript, { ...action.payload, isFinal: false }],
                };
            }

        case ActionType.CLEAR_CONVERSATION:
            return { ...state, transcript: [] };

        default:
            return state;
    }
};
