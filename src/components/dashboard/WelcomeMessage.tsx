
'use client';

import Link from 'next/link';
import { Mic, UserPlus } from 'lucide-react';

import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { Button } from '@/components/ui/button';

interface WelcomeMessageProps {
  isFirstVisit: boolean;
}

export const WelcomeMessage = ({ isFirstVisit }: WelcomeMessageProps) => {
  const { connect } = useVoiceAgent();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 rounded-lg shadow-inner">
      <h2 className="text-2xl font-bold font-headline mb-2">
        {isFirstVisit ? 'Welcome to NutriCoach AI!' : 'Welcome Back!'}
      </h2>

      <p className="text-muted-foreground mb-6 max-w-md">
        {isFirstVisit
          ? 'Start your health journey today. Use our voice agent to log your first meal, or set up your profile for personalized targets.'
          : 'Ready to continue your health journey? Log today\'s meals to stay on track.'}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Button size="lg" onClick={() => connect().catch(console.error)}>
          <Mic className="mr-2 h-4 w-4" />
          {isFirstVisit ? 'Log Your First Meal' : 'Log a Meal'}
        </Button>

        <Link href="/profile">
          <Button size="lg" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            {isFirstVisit ? 'Personalize Your Targets' : 'Complete Profile'}
          </Button>
        </Link>
      </div>
    </div>
  );
};
