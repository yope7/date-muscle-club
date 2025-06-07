import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ThemeRegistry from '@/lib/registry';
import { AuthProvider } from '@/providers/AuthProvider';
import { WorkoutStoreProvider } from '@/providers/WorkoutStoreProvider';
import { Header } from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Date Muscle Club - ベンチプレス記録アプリ',
  description: 'あなたのベンチプレストレーニングを記録・可視化するアプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ThemeRegistry>
          <AuthProvider>
            <WorkoutStoreProvider>
              <Header />
              <div role="main">
                {children}
              </div>
            </WorkoutStoreProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
