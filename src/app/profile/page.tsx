'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import ProfileForm from '@/components/profile/ProfileForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // If loading, show the skeleton screen
  if (loading) {
    return (
      <AppLayout>
        <ProfileSkeleton />
      </AppLayout>
    );
  }

  // If user is loaded and exists, show the profile
  if (user) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <Card className="mt-4 relative">
            <Link href="/" passHref>
              <Button variant="ghost" size="icon" className="absolute top-3 right-3">
                <X className="h-6 w-6" />
              </Button>
            </Link>
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

  // Fallback in case of an unexpected state (e.g., not loading, no user, but no redirect yet)
  return null;
}
