"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { useUserStore } from "@/store/userStore";
import { useAuth } from "@/hooks/useAuth";

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { profile, friends } = useUserStore();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          ログインが必要です
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar
            src={profile?.photoURL || undefined}
            alt={profile?.displayName || "ユーザー"}
            sx={{ width: 80, height: 80, mr: 2 }}
          />
          <Box>
            <Typography variant="h5" gutterBottom>
              {profile?.displayName || "ユーザー"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profile?.email || user.email}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          フレンド一覧
        </Typography>
        <List>
          {friends.map((friend) => (
            <React.Fragment key={friend.id}>
              <ListItem>
                <ListItemText
                  primary={friend.displayName}
                  secondary={friend.email}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};
