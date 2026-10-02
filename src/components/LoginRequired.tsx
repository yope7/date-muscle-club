import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";

// ゲストログイン中に、ログインが必要な画面の代わりに表示する
export const LoginRequired: React.FC<{ description: string }> = ({
  description,
}) => {
  const { signInWithGoogle } = useAuth();
  return (
    <Box sx={{ textAlign: "center", py: 4 }}>
      <Typography variant="h6" gutterBottom>
        ログインが必要です
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {description}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => signInWithGoogle()}
        sx={{ mt: 2 }}
      >
        Googleでログイン
      </Button>
    </Box>
  );
};
