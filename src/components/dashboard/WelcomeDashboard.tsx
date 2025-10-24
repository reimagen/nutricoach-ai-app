
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
        It looks like you're new here. Log your first meal below to get started on your health journey.
      </p>
      <div className="flex gap-4">
        <Link href="/profile">
          <Button size="lg" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Or, Start with Personalization
          </Button>
        </Link>
      </div>
    </div>
  );
}
