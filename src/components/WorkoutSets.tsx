"use client";

import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Box, Typography, Stack, Chip, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { WorkoutRecord } from "@/types/workout";

interface WorkoutSetsProps {
  workout: WorkoutRecord;
  onDelete?: (workout: WorkoutRecord) => void;
}

export const WorkoutSets = ({ workout, onDelete }: WorkoutSetsProps) => {
  const totalWeight = workout.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
  const totalSets = workout.sets.length;
  const workoutDate = workout.date.toDate();

  return (
    <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {format(workoutDate, "M月d日 (E)", { locale: ja })}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" component="div">
                {totalSets}セット
              </Typography>
              <Typography variant="body2" color="text.secondary">
                総重量 {totalWeight}kg
              </Typography>
            </Stack>
          </Box>
          {onDelete && (
            <IconButton aria-label="削除" onClick={() => onDelete(workout)} size="small" sx={{ color: "error.main" }}>
              <DeleteIcon />
            </IconButton>
          )}
        </Box>

        <Stack spacing={1}>
          {workout.sets.map((set, index) => (
            <Box
              key={index}
              sx={{
                p: 1.5,
                bgcolor: "grey.900",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                {set.weight}kg × {set.reps}回
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {set.weight * set.reps}kg
              </Typography>
            </Box>
          ))}
        </Stack>

        {workout.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {workout.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ bgcolor: "grey.900" }} />
            ))}
          </Stack>
        )}

        {workout.memo && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              bgcolor: "grey.900",
              p: 1.5,
              borderRadius: 1,
              whiteSpace: "pre-wrap",
            }}
          >
            {workout.memo}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
