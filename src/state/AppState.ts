
import { User, DailyLog } from '../lib/types';

export interface TranscriptEntry {
    source: 'user' | 'agent';
    text: string;
    isFinal: boolean;
}

export interface AppState {
    user: User;
    dailyLog: DailyLog;
    transcript: TranscriptEntry[];
}

export const initialState: AppState = {
    user: {},
    dailyLog: {},
    transcript: [],
};
