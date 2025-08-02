import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeRegistry from "@/lib/registry";
import { AuthProvider } from "@/providers/AuthProvider";
import { WorkoutStoreProvider } from "@/providers/WorkoutStoreProvider";
import { ClientLayout } from "./ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Muscle Club - 筋トレ記録アプリ",
  description: "トレーニングを記録・可視化するアプリ",
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
              <ClientLayout>{children}</ClientLayout>
            </WorkoutStoreProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
