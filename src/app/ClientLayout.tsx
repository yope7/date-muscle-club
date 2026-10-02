"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { SettingsDrawer } from "@/components/SettingsDrawer";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <Header onMenuClick={() => setIsSettingsOpen(true)} />
      <div role="main">{children}</div>
      <SettingsDrawer
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
