
import { AppState } from './AppState';
import { AppAction, ActionType } from './actions';

export const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case ActionType.SET_USER:
            // This completely replaces the user object.
            return { ...state, user: action.payload };

        case ActionType.ADD_FOOD_ITEM:
            // Adds a new food item to the log for a specific date.
            const { date, food } = action.payload;
            const existingFoods = state.dailyLog[date]?.foods || [];
            return {
                ...state,
                dailyLog: {
                    ...state.dailyLog,
                    [date]: {
                        foods: [...existingFoods, food],
                    },
                },
            };

        case ActionType.UPDATE_TRANSCRIPT:
            // Updates the text of the last transcript entry, used for real-time transcription.
            const lastEntry = state.transcript[state.transcript.length - 1];
            if (lastEntry && lastEntry.source === action.payload.source && !lastEntry.isFinal) {
                const updatedEntry = { ...lastEntry, text: action.payload.text };
                return {
                    ...state,
                    transcript: [...state.transcript.slice(0, -1), updatedEntry],
                };
            } else {
                // If the last entry doesn't match, create a new one.
                return {
                    ...state,
                    transcript: [...state.transcript, { ...action.payload, isFinal: false }],
                };
            }

        case ActionType.FINALIZE_TRANSCRIPT:
            // Marks the last transcript entry from a given source as final.
            const finalizableIndex = state.transcript.findLastIndex(
                (entry) => entry.source === action.payload.source && !entry.isFinal
            );
            if (finalizableIndex > -1) {
                const newTranscript = [...state.transcript];
                newTranscript[finalizableIndex] = { ...newTranscript[finalizableIndex], isFinal: true };
                return { ...state, transcript: newTranscript };
            }
            return state; // No change if no matching entry is found

        case ActionType.ADD_AGENT_TRANSCRIPT:
            // Adds a new, final transcript entry from the agent.
            return {
                ...state,
                transcript: [...state.transcript, { source: 'agent', text: action.payload, isFinal: true }],
            };

        case ActionType.CLEAR_CONVERSATION:
            // Clears the transcript.
            return { ...state, transcript: [] };

        default:
            return state;
    }
};
