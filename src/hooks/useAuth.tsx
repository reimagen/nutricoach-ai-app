
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser, updateUser as updateUserData } from '@/lib/api';
import { User } from '@/types';
import { User as FirebaseUser } from 'firebase/auth';
import { AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  updateUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    return () => unsubscribe();
  }, []);

  const fetchUser = useCallback(async () => {
    if (firebaseUser) {
        try {
            const userData = await getUser(firebaseUser.uid);
            setUser({ 
                ...firebaseUser, 
                ...userData, 
                uid: firebaseUser.uid // Ensure uid is not undefined
            });
        } catch (error) {
            console.error("Error fetching user data:", error);
            setUser({ 
                ...firebaseUser, 
                uid: firebaseUser.uid, // Still provide basic user info
                userProfile: undefined,
                userGoal: undefined,
            });
        } finally {
            setLoading(false);
        }
    } else {
        setUser(null);
        setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (firebaseUser) {
      await updateUserData(firebaseUser.uid, updates);
      fetchUser(); // Refetch the user to get the latest data
    }
  }, [firebaseUser, fetchUser]);

  return (
    <AuthContext.Provider value={{ user, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
