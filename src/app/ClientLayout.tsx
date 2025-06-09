"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import {
  SwipeableDrawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  ListItemButton,
  Typography,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Help as HelpIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { useUserStore } from "@/store/userStore";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const { user } = useAuth();
  const { profile } = useUserStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
