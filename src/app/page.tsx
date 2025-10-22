import AppLayout from '@/components/layout/AppLayout';
import MacroSummary from '@/components/dashboard/MacroSummary';
import EducationCard from '@/components/dashboard/EducationCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  // Mock data for now, would be fetched from a server action
  const dailySummary = {
    calories: { current: 1250, target: 2000 },
    protein: { current: 80, target: 150 },
    carbs: { current: 150, target: 250 },
    fat: { current: 40, target: 70 },
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Dashboard
          </h1>
          <div className="flex items-center space-x-2">
            <Link href="/log-meal">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Log Meal
              </Button>
            </Link>
          </div>
        </div>
        <div className="space-y-4">
          <MacroSummary data={dailySummary} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <EducationCard />
            </div>
            <div className="col-span-4 md:col-span-3">
              {/* Future components like Meal History can go here */}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
