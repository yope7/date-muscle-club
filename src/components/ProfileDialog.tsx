"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
} from "@mui/material";
import { useUserStore } from "@/store/userStore";
import { useAuth } from "@/hooks/useAuth";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileDialog = ({ open, onClose }: ProfileDialogProps) => {
  const { user } = useAuth();
  const { profile, updateProfile } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      await updateProfile({
        id: user.uid,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
      });
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>プロフィール設定</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              mt: 2,
            }}
          >
            <Avatar
              src={user?.photoURL || undefined}
              sx={{ width: 100, height: 100 }}
            />
            <Typography variant="h6">{user?.displayName}</Typography>
            <Typography variant="body2" color="text.secondary">
              Googleアカウントの情報を使用します
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>キャンセル</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            保存
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
