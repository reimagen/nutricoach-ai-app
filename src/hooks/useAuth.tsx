
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser, updateUser as updateUserData } from '@/lib/api';
import { User } from '@/types';
import { AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    updateUser: async () => {},
    forceReload: () => {},
    signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [loading, setLoading] = useState(true);
  
  const forceReload = useCallback(async () => {
    setLoading(true);
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        const userData = await getUser(firebaseUser.uid);
        setUser({ 
          ...firebaseUser, 
          ...userData, 
          uid: firebaseUser.uid
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser({ 
          ...firebaseUser, 
          uid: firebaseUser.uid,
          email: firebaseUser.email,
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
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await forceReload();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [forceReload]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await updateUserData(firebaseUser.uid, updates);
      await forceReload();
    }
  }, [forceReload]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, updateUser, forceReload, signOut }}>
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
