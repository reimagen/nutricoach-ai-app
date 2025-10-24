
import { User, FoodItem } from '../lib/types';

export enum ActionType {
    SET_USER = 'SET_USER',
    ADD_FOOD_ITEM = 'ADD_FOOD_ITEM',
    UPDATE_TRANSCRIPT = 'UPDATE_TRANSCRIPT',
    FINALIZE_TRANSCRIPT = 'FINALIZE_TRANSCRIPT',
    ADD_AGENT_TRANSCRIPT = 'ADD_AGENT_TRANSCRIPT',
    CLEAR_CONVERSATION = 'CLEAR_CONVERSATION',
}

export type AppAction = 
    | { type: ActionType.SET_USER; payload: User }
    | { type: ActionType.ADD_FOOD_ITEM; payload: { date: string; food: FoodItem } }
    | { type: ActionType.UPDATE_TRANSCRIPT; payload: { source: 'user'; text: string } }
    | { type: ActionType.FINALIZE_TRANSCRIPT; payload: { source: 'user' | 'agent' } }
    | { type: ActionType.ADD_AGENT_TRANSCRIPT; payload: string }
    | { type: ActionType.CLEAR_CONVERSATION };
