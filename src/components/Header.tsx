"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
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
} from "@mui/icons-material";
import { SettingsDialog } from "./SettingsDialog";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, signIn, signOut } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const userDoc = await getDocs(
          query(collection(db, "users"), where("email", "==", user.email))
        );

        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setIsAdmin(userData.isAdmin || false);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

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
              Date Muscle Club
            </Typography>
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isAdmin && (
              <Link href="/admin" style={{ textDecoration: "none" }}>
                <Chip
                  icon={<AdminIcon />}
                  label="管理者"
                  color="primary"
                  variant="filled"
                  sx={{ cursor: "pointer" }}
                />
              </Link>
            )}
            <IconButton
              color="inherit"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="設定"
            >
              {/* <SettingsIcon /> */}
            </IconButton>
            {user ? (
              <>
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
    </>
  );
};
