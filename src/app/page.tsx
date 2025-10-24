'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import MacroSummary from '@/components/dashboard/MacroSummary';
import WelcomeDashboard from '@/components/dashboard/WelcomeDashboard';
import ConversationalAgent from '@/components/logging/ConversationalAgent';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MealEntry } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [dailySummary, setDailySummary] = useState({
    calories: { current: 0, target: 2000 },
    protein: { current: 0, target: 150 },
    carbs: { current: 0, target: 250 },
    fat: { current: 0, target: 70 },
  });
  const [meals, setMeals] = useState<MealEntry[]>([]);
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
      where('createdAt', '>=', today),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        const mealDocs: MealEntry[] = [];
        const categoryOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

        setHasMeals(!querySnapshot.empty);

        querySnapshot.forEach((doc) => {
          const data = doc.data() as MealEntry;
          mealDocs.push({ ...data, id: doc.id });

          const macros = data.macros || data.totalMacros; // Handle legacy data
          if (macros) {
            totalCalories += macros.caloriesKcal || 0;
            totalProtein += macros.proteinG || 0;
            totalCarbs += macros.carbohydrateG || 0;
            totalFat += macros.fatG || 0;
          }
        });

        // Sort meals on the client-side
        mealDocs.sort((a, b) => {
          const aIndex = categoryOrder.indexOf(a.mealCategory);
          const bIndex = categoryOrder.indexOf(b.mealCategory);
          return aIndex - bIndex;
        });

        setMeals(mealDocs);
        
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
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-headline mt-6">Today's Meals</h2>
               {meals.map((meal) => (
                <Card key={meal.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize font-headline">{meal.mealCategory}</CardTitle>
                      <Badge variant="outline">{Math.round(meal.macros.caloriesKcal)} kcal</Badge>
                    </div>
                    <CardDescription>{meal.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {meal.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                          <p className="font-medium text-sm">{item.name}</p>
                          <div className="grid grid-cols-4 gap-x-3 text-xs text-right text-muted-foreground">
                            <span>{Math.round(item.macros.caloriesKcal)}kcal</span>
                            <span>{Math.round(item.macros.proteinG)}g P</span>
                            <span>{Math.round(item.macros.carbohydrateG)}g C</span>
                            <span>{Math.round(item.macros.fatG)}g F</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
