import './globals.css';
import type { Metadata } from 'next';
import { Lato, Source_Code_Pro } from 'next/font/google';

import { AuthProvider } from '@/hooks/useAuth';
import { VoiceAgentProvider } from '@/hooks/useVoiceAgentProvider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const lato = Lato({ 
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-headline',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-code',
});

export const metadata: Metadata = {
  title: 'Next.js Starter',
  description: 'Next.js Starter',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'font-body',
          lato.variable,
          sourceCodePro.variable
        )}
      >
        <AuthProvider>
          <VoiceAgentProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <main>{children}</main>
              <Toaster />
            </ThemeProvider>
          </VoiceAgentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
