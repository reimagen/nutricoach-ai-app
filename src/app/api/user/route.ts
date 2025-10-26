
import { NextResponse } from 'next/server';
import { User } from '@/types';

// This is a mock API endpoint. In a real application, you would fetch this data from a database.
const mockUser: User = {
  userProfile: {
    name: 'Alex Doe',
    age: 30,
    gender: 'male',
    units: 'imperial', // Let's test the conversion logic!
    height: 70, // inches
    weight: 180, // pounds
    activityLevel: 'light',
  },
  userGoal: {
    type: 'weight-loss',
  },
  mealEntries: [
    {
      id: '1',
      name: 'Morning Coffee',
      timestamp: new Date().toISOString(),
      macros: { calories: 5, protein: 0, carbs: 1, fat: 0 },
    },
    {
      id: '2',
      name: 'Chicken Salad',
      timestamp: new Date().toISOString(),
      macros: { calories: 350, protein: 40, carbs: 10, fat: 18 },
    },
  ],
};

/**
 * Handles GET requests to /api/user.
 * @returns A JSON response with the mock user data.
 */
export async function GET() {
  // In a real app, you might have authentication and database logic here.
  return NextResponse.json(mockUser);
}
