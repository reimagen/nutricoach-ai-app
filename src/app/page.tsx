
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import MacroSummary from '@/components/dashboard/MacroSummary';
import WelcomeDashboard from '@/components/dashboard/WelcomeDashboard';
import ConversationalAgent from '@/components/logging/ConversationalAgent';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [dailySummary, setDailySummary] = useState({
    calories: { current: 0, target: 2000 },
    protein: { current: 0, target: 150 },
    carbs: { current: 0, target: 250 },
    fat: { current: 0, target: 70 },
  });
  const [hasMeals, setHasMeals] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mealsCollection = collection(db, 'meals');
    const q = query(
      mealsCollection,
      where('userId', '==', user.uid),
      where('createdAt', '>=', today)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        setHasMeals(!querySnapshot.empty);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.macros) {
            totalCalories += data.macros.caloriesKcal || 0;
            totalProtein += data.macros.proteinG || 0;
            totalCarbs += data.macros.carbohydrateG || 0;
            totalFat += data.macros.fatG || 0;
          } else if (data.totalMacros) { // Legacy check
             totalCalories += data.totalMacros.caloriesKcal || 0;
            totalProtein += data.totalMacros.proteinG || 0;
            totalCarbs += data.totalMacros.carbohydrateG || 0;
            totalFat += data.totalMacros.fatG || 0;
          }
        });
        
        setDailySummary(prev => ({
          ...prev, // Keep target values
          calories: { ...prev.calories, current: totalCalories },
          protein: { ...prev.protein, current: totalProtein },
          carbs: { ...prev.carbs, current: totalCarbs },
          fat: { ...prev.fat, current: totalFat },
        }));
        
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching meals:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Welcome Back!
          </h1>
        </div>
        
        {loading ? (
           <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hasMeals ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Here's your macro summary for today.
            </p>
            <MacroSummary data={dailySummary} />
          </div>
        ) : (
           <WelcomeDashboard />
        )}
        
        <div className="mt-6">
            <ConversationalAgent />
        </div>
      </div>
    </AppLayout>
  );
}
