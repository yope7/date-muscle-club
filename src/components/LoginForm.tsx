'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Typography, Box, Container } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

export const LoginForm = () => {
  const { signInWithGoogle, signInAsGuest } = useAuth();

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        gap={3}
      >
        <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
          Date Muscle Club
        </Typography>
        
        <Button
          variant="contained"
          onClick={signInWithGoogle}
          startIcon={<GoogleIcon />}
          size="large"
          sx={{
            bgcolor: 'white',
            color: 'text.primary',
            '&:hover': {
              bgcolor: 'grey.100',
            },
            px: 4,
            py: 1.5,
          }}
        >
          Googleでログイン
        </Button>

        <Button
          variant="contained"
          onClick={signInAsGuest}
          startIcon={<PersonOutlineIcon />}
          size="large"
          sx={{
            bgcolor: 'grey.800',
            '&:hover': {
              bgcolor: 'grey.700',
            },
            px: 4,
            py: 1.5,
          }}
        >
          ゲストとして利用
        </Button>

        <Typography variant="body2" color="text.secondary" align="center">
          ※ゲストとして利用した場合でも、後からGoogleアカウントに紐付けることができます
        </Typography>
      </Box>
    </Container>
  );
}; 