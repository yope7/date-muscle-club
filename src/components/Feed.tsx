"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from "@mui/material";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { WorkoutRecord } from "@/types/workout";

interface FeedProps {
  workouts: WorkoutRecord[];
}

export const Feed = ({ workouts }: FeedProps) => {
  return (
    <List>
      {workouts.map((workout) => (
        <ListItem
          key={workout.id}
          component={Paper}
          sx={{ mb: 2, borderRadius: 1 }}
        >
          <ListItemAvatar>
            <Avatar>{workout.userId?.charAt(0).toUpperCase()}</Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={format(workout.date.toDate(), "yyyy年M月d日", {
              locale: ja,
            })}
            secondary={
              <Box>
                <Typography variant="body2" color="text.secondary">
                  合計:{" "}
                  {workout.sets?.reduce((sum, set) => sum + (set.reps || 0), 0)}
                  回
                </Typography>
                {workout.memo && (
                  <Typography variant="body2" color="text.secondary">
                    {workout.memo}
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};
