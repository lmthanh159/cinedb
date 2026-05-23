import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s — CineDB',
    default: 'CineDB — Movies & TV Shows Database',
  },
  description: 'Your comprehensive database for movies, TV shows, and the people who make them.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-900 text-white antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
