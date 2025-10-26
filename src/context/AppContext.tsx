
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { AppState, initialState } from '@/state/AppState';
import { AppAction, ActionType } from '@/state/actions';
import { appReducer } from '@/state/reducer';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { useAuth } from '@/hooks/useAuth';
import { User, MealEntry, Macros } from '@/types';
import { calculateTargetMacros } from '@/lib/calculations/calculateTargetMacros';
import { calculateDailyTotal } from '@/lib/calculations/calculateDailyTotal';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  agent: ReturnType<typeof useVoiceAgent>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [loading, setLoading] = useState(true);
  const agent = useVoiceAgent(dispatch, authUser as User);

  useEffect(() => {
    const initializeUser = async () => {
      if (authUser) {
        try {
          setLoading(true);
          const response = await fetch('/api/user');
          if (!response.ok) {
            throw new Error('Failed to fetch user data');
          }
          const { mealEntries, ...userData }: { mealEntries: MealEntry[], userData: User } = await response.json();

          let dailyMacrosTarget: Macros | null = null;
          let currentMacros: Macros | null = null;

          // Only perform calculations if the user has set up their profile and goals
          if (userData.userProfile && userData.userGoal) {
            dailyMacrosTarget = calculateTargetMacros(userData);
            currentMacros = calculateDailyTotal(mealEntries || []);
          }

          // Always dispatch to ensure the user object is populated even for new users
          dispatch({
            type: ActionType.SET_STATE,
            payload: {
              ...initialState,
              user: {
                ...userData,
                // Conditionally add calculated values
                ...(currentMacros && { currentMacros }),
                userGoal: userData.userGoal
                  ? {
                      ...userData.userGoal,
                      ...(dailyMacrosTarget && { dailyMacrosTarget }),
                    }
                  : null,
              },
              mealEntries: mealEntries || [],
            },
          });
        } catch (error) {
          console.error("Error initializing user state:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initializeUser();
  }, [authUser]);

  return (
    <AppContext.Provider value={{ state, dispatch, agent, loading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
