
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProfileForm from '@/components/profile/ProfileForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {AppLayout} from '@/components/layout/AppLayout';

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="font-headline">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm />
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
            <Button variant="destructive" onClick={signOut}>
              Sign Out
            </Button>
        </div>
      </div>
    </AppLayout>
  );
}
