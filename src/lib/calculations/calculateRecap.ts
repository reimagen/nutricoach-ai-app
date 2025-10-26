
import { MealEntry, Macros, RecapMetrics } from "@/types";
import { eachDayOfInterval } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

// come back to this - not part of mvp and need cron jobs

/**
 * Checks if a daily total meets the defined goals within a tolerance.
 */
const didMeetTarget = (dailyTotal: { calories: number, protein: number, carbs: number, fat: number }, targets: Macros): boolean => {
  const tolerance = 0.10; // 10% tolerance

  const caloriesMet = Math.abs(dailyTotal.calories - targets.calories) <= targets.calories * tolerance;
  const proteinMet = Math.abs(dailyTotal.protein - targets.protein) <= targets.protein * tolerance;
  const carbsMet = Math.abs(dailyTotal.carbs - targets.carbs) <= targets.carbs * tolerance;
  const fatMet = Math.abs(dailyTotal.fat - targets.fat) <= targets.fat * tolerance;

  return caloriesMet && proteinMet && carbsMet && fatMet;
};

/**
 * Calculates recap metrics from a user's meal entries and targets.
 * @returns An object containing the calculated recap metrics.
 */
export const calculateRecap = (
  mealEntries: MealEntry[],
  targets: Macros,
  startDate: Date,
  endDate: Date,
  timezone: string
): RecapMetrics => {
  const interval = { start: startDate, end: endDate };
  const daysInInterval = eachDayOfInterval(interval);

  const dailyTotals = new Map<string, { calories: number, protein: number, carbs: number, fat: number }>();

  // Initialize daily totals
  daysInInterval.forEach(day => {
    dailyTotals.set(day.toISOString().split('T')[0], { calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  // Aggregate meal entries into daily totals
  mealEntries.forEach(entry => {
    const entryDate = utcToZonedTime(entry.timestamp.toDate(), timezone);
    const dayKey = entryDate.toISOString().split('T')[0];
    const dayTotal = dailyTotals.get(dayKey);

    if (dayTotal) {
      dayTotal.calories += entry.macros.calories;
      dayTotal.protein += entry.macros.protein;
      dayTotal.carbs += entry.macros.carbs;
      dayTotal.fat += entry.macros.fat;
    }
  });

  let targetMetCount = 0;
  dailyTotals.forEach(total => {
    if (didMeetTarget(total, targets)) {
      targetMetCount++;
    }
  });

  return {
    totalDays: daysInInterval.length,
    targetMetDays: {
      count: targetMetCount,
      percentage: (targetMetCount / daysInInterval.length) * 100,
    },
  };
};
