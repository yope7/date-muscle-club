import React from 'react';
import { Button, CircularProgress, Alert, Snackbar } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

export const LoginButton: React.FC = () => {
  const { signInWithGoogle, loading, error, clearError } = useAuth();

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={signInWithGoogle}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {loading ? 'ログイン中...' : 'Googleでログイン'}
      </Button>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={clearError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}; 