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
import { SettingsDialog } from "@/components/SettingsDialog";
import { useDrawerStore } from "@/store/drawerStore";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const { user, signOut } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isDrawerOpen, setDrawerOpen } = useDrawerStore();

  const handleSignOut = async () => {
    await signOut();
    setDrawerOpen(false);
  };

  return (
    <>
      <Header onMenuClick={() => setDrawerOpen(true)} />
      <div role="main">{children}</div>
      <SwipeableDrawer
        anchor="left"
        open={isDrawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 280,
            zIndex: 1200,
          },
        }}
      >
        <List>
          {user && (
            <>
              <Link
                href="/mypage"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ListItemButton onClick={() => setDrawerOpen(false)}>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={user.displayName || user.email}
                    secondary="ログイン中"
                  />
                </ListItemButton>
              </Link>
              <Divider />
              <Typography variant="overline" sx={{ px: 2, py: 1 }}>
                設定
              </Typography>
              <ListItemButton
                onClick={() => {
                  setIsSettingsOpen(true);
                  setDrawerOpen(false);
                }}
              >
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="表示設定" />
              </ListItemButton>
              <ListItemButton>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText primary="通知設定" />
              </ListItemButton>
              <ListItemButton>
                <ListItemIcon>
                  <PaletteIcon />
                </ListItemIcon>
                <ListItemText primary="テーマ設定" />
              </ListItemButton>
              <ListItemButton>
                <ListItemIcon>
                  <LanguageIcon />
                </ListItemIcon>
                <ListItemText primary="言語設定" />
              </ListItemButton>
              <Divider />
              <Typography variant="overline" sx={{ px: 2, py: 1 }}>
                その他
              </Typography>
              <ListItemButton>
                <ListItemIcon>
                  <HelpIcon />
                </ListItemIcon>
                <ListItemText primary="ヘルプ" />
              </ListItemButton>
              <ListItemButton>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText primary="アプリについて" />
              </ListItemButton>
              <Divider />
              <ListItemButton onClick={handleSignOut}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="ログアウト" />
              </ListItemButton>
            </>
          )}
        </List>
      </SwipeableDrawer>
      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
