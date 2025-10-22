import AppLayout from '@/components/layout/AppLayout';
import ProfileForm from '@/components/profile/ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Profile & Goals
        </h1>
      </div>
      <p className="text-muted-foreground">
        Personalize your experience by setting your targets.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ProfileForm />
        </div>
        <div className="md:col-span-1">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Target className="w-6 h-6 text-accent"/>
                        <CardTitle className="font-headline">Why Set Goals?</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-4">
                    <p>Providing your stats allows NutriCoach AI to calculate personalized macronutrient targets just for you.</p>
                    <p>This transforms the app from a simple tracker into a personal nutrition coach, helping you reach your goals faster.</p>
                    <p>Your data is kept private and secure.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </AppLayout>
  );
}
