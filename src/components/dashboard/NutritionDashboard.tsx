
'use client';

import { useState, useMemo } from 'react';

import { useDailyLog } from '@/hooks/useDailyLog';
import { useAuth } from '@/hooks/useAuth';
import { DateSelector } from './DateSelector';
import { DailyLogTable } from './DailyLogTable';
import MacroSummary from './MacroSummary';
import { WelcomeMessage } from './WelcomeMessage';
import { Macros } from '@/types';

export const NutritionDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { log, isLoading } = useDailyLog(selectedDate);
  const { user } = useAuth();

  const isProfileComplete = !!user?.userProfile && !!user?.userGoal;
  const isFirstVisit = !user?.userProfile;

  const currentMacros = useMemo(() => {
    const totals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    if (!log) return totals;

    log.forEach(entry => {
      entry.items.forEach(item => {
        totals.calories += item.calories;
        totals.protein += item.protein;
        totals.carbs += item.carbs;
        totals.fat += item.fat;
      });
    });

    return totals;
  }, [log]);

  if (!isProfileComplete) {
    return <WelcomeMessage isFirstVisit={isFirstVisit} />;
  }

  const targets = user?.userGoal?.targets;

  return (
    <div className="space-y-6">
      <DateSelector date={selectedDate} setDate={setSelectedDate} />
      <MacroSummary current={currentMacros} targets={targets} />
      <DailyLogTable logEntries={log} isLoading={isLoading} />
    </div>
  );
};
