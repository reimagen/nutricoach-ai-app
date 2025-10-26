
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { getAllUsers, getUserAdmin, updateUserAdmin } from '../../server/user'; // Correctly import from the server-side file
import { getMealEntriesForDateRange } from '../meals/day'; 
import { calculateRecap } from '../../calculations/calculateRecap';
import { calculateTargetMacros } from '../../calculations/calculateTargetMacros';

/**
 * A scheduled function to be run daily after midnight to calculate the previous day's recap for all users.
 */
export const onDailyRecap = async () => {
  const allUsers = await getAllUsers();
  const yesterday = subDays(new Date(), 1);

  for (const basicUserInfo of allUsers) {
    const user = await getUserAdmin(basicUserInfo.uid); // Fetch the full user object with subcollections

    if (!user.userGoal || !user.userProfile?.timezone) {
      console.log(`Skipping daily recap for user ${user.uid}: not enough data.`);
      continue;
    }

    const timezone = user.userProfile.timezone;
    const startDate = startOfDay(yesterday);
    const endDate = endOfDay(yesterday);

    const [mealEntries, targets] = await Promise.all([
      getMealEntriesForDateRange(user.uid, startDate, endDate, timezone),
      calculateTargetMacros(user)
    ]);

    if (mealEntries.length === 0 || !targets) {
      console.log(`Skipping daily recap for user ${user.uid}: no meals or targets.`);
      continue;
    }

    const recapMetrics = calculateRecap(mealEntries, targets, startDate, endDate, timezone);

    await updateUserAdmin(user.uid, {
      cachedRecaps: {
        daily: {
          metrics: recapMetrics,
          lastUpdated: Timestamp.now()
        }
      }
    });
  }
};
