import React from "react";
import { Box, Typography, Paper, Avatar, Grid, Divider } from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/store/userStore";
import { WorkoutGraphs } from "./WorkoutGraphs";
import { useWorkoutStore } from "@/store/workoutStore";
import { WorkoutStats } from "./WorkoutStats";

export const MyPage: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useUserStore();
  const { workouts } = useWorkoutStore();

  if (!user) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          ログインが必要です
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: "md", mx: "auto" }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Avatar
            src={user.photoURL || undefined}
            sx={{ width: 80, height: 80 }}
          />
          <Box>
            <Typography variant="h5" gutterBottom>
              {profile?.username || user.displayName || user.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ flexGrow: 1 }}>
          <WorkoutStats workouts={workouts} />
          <WorkoutGraphs workouts={workouts} />
        </Box>
      </Paper>
    </Box>
  );
};
