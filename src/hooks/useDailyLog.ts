'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MealEntry, MealItem } from '@/types';
import { format } from 'date-fns';
import { useEffect } from 'react';
import { getMealEntriesForDay, addMealEntry as apiAddMealEntry } from '@/lib/api';
import { useAuth } from './useAuth';
import { Timestamp } from 'firebase/firestore';

interface DailyLogState {
  log: MealEntry[];
  isLoading: boolean;
  fetchLog: (uid: string, date: Date, timezone: string) => Promise<void>;
  addEntry: (uid: string, entry: Omit<MealEntry, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

// Note: We are using a dynamic key for persistence, which isn't standard for zustand.
// This is a simplified approach for this app. A more robust solution might involve
// a single store with a nested object keyed by date.
const useDailyLogStore = create<DailyLogState>()(
  (set, get) => ({
    log: [],
    isLoading: true,
    fetchLog: async (uid: string, date: Date, timezone: string) => {
      set({ isLoading: true });
      try {
        const entries = await getMealEntriesForDay(uid, date, timezone);
        set({ log: entries });
      } catch (error) {
        console.error("Failed to fetch daily log:", error);
        set({ log: [] });
      } finally {
        set({ isLoading: false });
      }
    },
    addEntry: async (uid, newEntryData) => {
        try {
            // Create the full entry object for the optimistic update
            const now = Timestamp.now();
            const optimisticEntry: MealEntry = {
                id: `temp-${Date.now()}`, // Temporary ID
                ...newEntryData,
                timestamp: now,
                createdAt: now,
                updatedAt: now,
            };

            // Optimistic update
            set(state => ({ log: [...state.log, optimisticEntry] }));

            // Call the actual API
            await apiAddMealEntry(uid, newEntryData.mealCategory, {
                description: newEntryData.description,
                items: newEntryData.items,
                macros: newEntryData.macros,
            });

            // In a real app, you would then re-fetch the log or update the temporary entry
            // with the real one from the server to get the permanent ID.
            // For this app's purpose, the optimistic update is sufficient for the UI.

        } catch (error) {
            console.error("Failed to add meal entry:", error);
            // Optionally, revert the optimistic update here
            set(state => ({
                log: state.log.filter(entry => !entry.id.startsWith('temp-'))
            }));
        }
    },
  })
);


export const useDailyLog = (date: Date) => {
  const { user } = useAuth();
  const { log, isLoading, fetchLog, addEntry } = useDailyLogStore();

  useEffect(() => {
    if (user?.uid && user.userProfile?.timezone) {
      fetchLog(user.uid, date, user.userProfile.timezone);
    }
  }, [date, user?.uid, user?.userProfile?.timezone, fetchLog]);

  return { log, isLoading, addEntry };
};
