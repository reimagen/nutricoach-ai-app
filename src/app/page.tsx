
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import MacroSummary from '@/components/dashboard/MacroSummary';
import WelcomeDashboard from '@/components/dashboard/WelcomeDashboard';
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
          if (aIndex === -1) return 1; // Put unknown at the end
          if (bIndex === -1) return -1;
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
      <div className="flex-1 space-y-4 pt-6">
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-3">
                 {loading ? (
                    <Card><CardContent className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent></Card>
                 ) : meals.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Today's Meals</CardTitle>
                            <CardDescription>A log of your meals for today.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {meals.map((meal) => (
                                <div key={meal.id} className="p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold capitalize">{meal.mealCategory}</h4>
                                        <Badge variant="outline">{Math.round(meal.macros.caloriesKcal)} kcal</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">{meal.description}</p>
                                    <div className="space-y-2">
                                    {meal.items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center text-xs">
                                        <p className="font-medium text-sm flex-1 truncate pr-2">{item.name}</p>
                                        <div className="grid grid-cols-4 gap-x-2 text-right text-muted-foreground w-1/2">
                                            <span>{Math.round(item.macros.caloriesKcal)}kcal</span>
                                            <span>{Math.round(item.macros.proteinG)}p</span>
                                            <span>{Math.round(item.macros.carbohydrateG)}c</span>
                                            <span>{Math.round(item.macros.fatG)}f</span>
                                        </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                 ) : (
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="font-headline">Today's Meals</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center text-center h-2/3">
                            <p className="text-muted-foreground">You haven't logged any meals yet today.</p>
                            <p className="text-sm text-muted-foreground">Use the agent in the footer to start.</p>
                        </CardContent>
                    </Card>
                 )}
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
