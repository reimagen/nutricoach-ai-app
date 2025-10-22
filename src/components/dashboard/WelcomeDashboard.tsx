
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

export default function WelcomeDashboard() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 rounded-lg shadow-inner">
      <h2 className="text-2xl font-bold font-headline mb-2">
        Welcome to NutriCoach AI!
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        It looks like you're new here. Let's get started on your health journey. What would you like to do first?
      </p>
      <div className="flex gap-4">
        <Link href="/log-meal">
          <Button size="lg">
            <LogIn className="mr-2 h-4 w-4" />
            Log Your First Meal
          </Button>
        </Link>
        <Link href="/profile">
          <Button size="lg" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Start with Personalization
          </Button>
        </Link>
      </div>
    </div>
  );
}
