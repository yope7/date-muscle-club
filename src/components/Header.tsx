'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AppBar, Toolbar, Typography, IconButton, Box, useTheme, useMediaQuery, Avatar } from '@mui/material';
import { Logout as LogoutIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { SettingsDialog } from './SettingsDialog';

export const Header = () => {
  const { user, signIn, signOut } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('ユーザー情報:', {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
    }
  }, [user]);

  return (
    <>
      <AppBar component="nav" position="static">
        <Toolbar>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant={isMobile ? "h6" : "h5"} component="h1" fontWeight="bold">
              Date Muscle Club
            </Typography>
          </Link>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="設定"
            >
              <SettingsIcon />
            </IconButton>
            {user ? (
              <>
                <Link href="/mypage" style={{ color: 'inherit' }}>
                  <IconButton
                    color="inherit"
                    aria-label="マイページ"
                  >
                    <Avatar
                      src={user.photoURL || undefined}
                      alt={user.displayName || user.email || 'ユーザー'}
                      sx={{ width: 32, height: 32 }}
                    />
                  </IconButton>
                </Link>
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