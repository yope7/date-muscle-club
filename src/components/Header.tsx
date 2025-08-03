"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTeamStore } from "@/store/teamStore";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
  Avatar,
  Chip,
} from "@mui/material";
import {
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  AdminPanelSettings as AdminIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import { SettingsDialog } from "./SettingsDialog";
import { TeamInviteList } from "./TeamInviteList";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, signIn, signOut, isGuest } = useAuth();
  const { currentTeam, teamInvites, fetchTeamInvites } = useTeamStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeamInvitesOpen, setIsTeamInvitesOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        // 認証状態を確認
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 自分のユーザードキュメントにアクセス
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.isAdmin || false);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Admin status check error:", err);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();

    // チーム招待を取得
    if (user) {
      fetchTeamInvites(user.uid);
    }
  }, [user, fetchTeamInvites]);

  return (
    <>
      <AppBar component="nav" position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={onMenuClick}
            aria-label="メニュー"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              component="h1"
              fontWeight="bold"
            >
              {user && !isGuest && currentTeam
                ? `${currentTeam.name} Muscle Club`
                : "Muscle Club"}
            </Typography>
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isAdmin && (
              <Link href="/admin" style={{ textDecoration: "none" }}>
                <Chip icon={<AdminIcon />} color="primary" variant="filled" />
              </Link>
            )}
            {user ? (
              <>
                {teamInvites.length > 0 && (
                  <IconButton
                    color="inherit"
                    onClick={() => setIsTeamInvitesOpen(true)}
                    aria-label="チーム招待"
                    sx={{ position: "relative" }}
                  >
                    <NotificationsIcon />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "error.main",
                      }}
                    />
                  </IconButton>
                )}
                <IconButton color="inherit" aria-label="マイページ">
                  <Avatar
                    src={user.photoURL || undefined}
                    alt={user.displayName || user.email || "ユーザー"}
                    sx={{ width: 32, height: 32 }}
                  />
                </IconButton>
                <IconButton
                  color="inherit"
                  onClick={signOut}
                  aria-label="ログアウト"
                >
                  <LogoutIcon />
                </IconButton>
              </>
            ) : (
              <IconButton
                color="inherit"
                onClick={signIn}
                aria-label="ログイン"
              >
                <Avatar sx={{ width: 32, height: 32 }} />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <TeamInviteList
        open={isTeamInvitesOpen}
        onClose={() => setIsTeamInvitesOpen(false)}
      />
    </>
  );
};
