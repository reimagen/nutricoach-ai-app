
'use client';

import { ChatSidebar } from '@/components/chat/ChatSidebar';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';


// Function to get initials from the user's name or email
const getInitials = (user: any) => {
    if (user?.userProfile?.name) {
      return user.userProfile.name
        .split(' ')
        .map((n: string) => n[0])
        .join('');
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U'; // Default initial
};


export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
        <Link href="/" className="text-lg font-bold">
          NutriCoach AI
        </Link>
        {user && (
            <Link href="/profile" passHref>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                    <AvatarImage src={user.userProfile?.avatarUrl || ''} alt="User avatar" />
                    <AvatarFallback>{getInitials(user)}</AvatarFallback>
                    </Avatar>
                </Button>
            </Link>
        )}
      </header>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
        <aside className="w-full lg:w-[420px] lg:border-l lg:border-slate-200">
          <ChatSidebar />
        </aside>
      </div>
    </div>
  );
}
