
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import MacroSummary from '@/components/dashboard/MacroSummary';
import WelcomeDashboard from '@/components/dashboard/WelcomeDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhotoLogging from '@/components/logging/PhotoLogging';
import VoiceLogging from '@/components/logging/VoiceLogging';
import ConversationalAgent from '@/components/logging/ConversationalAgent';
import { Mic, Camera, MessageCircle } from 'lucide-react';
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
        <p className="text-muted-foreground">
          Log your meal for today using one of the methods below.
        </p>

        {loading ? (
           <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hasMeals ? (
          <div className="space-y-4">
            <MacroSummary data={dailySummary} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No meals logged yet today. Let's get started!</p>
        )}
        
        <div className="mt-6">
            <Tabs defaultValue="conversation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="conversation">
                <MessageCircle className="mr-2 h-4 w-4" />
                Conversation
                </TabsTrigger>
                <TabsTrigger value="voice">
                <Mic className="mr-2 h-4 w-4" />
                Text / Voice
                </TabsTrigger>
                <TabsTrigger value="photo">
                <Camera className="mr-2 h-4 w-4" />
                Photo
                </TabsTrigger>
            </TabsList>
            <TabsContent value="conversation">
                <ConversationalAgent />
            </TabsContent>
            <TabsContent value="voice">
                <VoiceLogging />
            </TabsContent>
            <TabsContent value="photo">
                <PhotoLogging />
            </TabsContent>
            </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
