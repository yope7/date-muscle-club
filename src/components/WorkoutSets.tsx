"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { WorkoutRecord } from "@/types/workout";
import { useWorkoutStore } from "@/store/workoutStore";
import { Timestamp } from "firebase/firestore";

interface WorkoutSetsProps {
  workout: WorkoutRecord;
  onDelete?: (workout: WorkoutRecord) => void;
  onAddSet?: () => void;
}

export const WorkoutSets = ({
  workout,
  onDelete,
  onAddSet,
}: WorkoutSetsProps) => {
  const { updateWorkout, addWorkout } = useWorkoutStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setToDelete, setSetToDelete] = useState<number | null>(null);
  const [deleteWorkoutDialogOpen, setDeleteWorkoutDialogOpen] = useState(false);
  const [newSetDialogOpen, setNewSetDialogOpen] = useState(false);
  const [newSet, setNewSet] = useState({ weight: "", reps: "" });

  const totalWeight = workout.sets.reduce(
    (sum, set) => sum + set.weight * set.reps,
    0
  );
  const totalSets = workout.sets.length;
  const workoutDate = workout.date.toDate();

  const handleDeleteSet = async (indexToDelete: number) => {
    setSetToDelete(indexToDelete);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSet = async () => {
    if (setToDelete === null) return;

    const updatedSets = workout.sets.filter(
      (_, index) => index !== setToDelete
    );
    const updatedWorkout: WorkoutRecord = {
      ...workout,
      sets: updatedSets,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    await updateWorkout(updatedWorkout);
    setDeleteDialogOpen(false);
    setSetToDelete(null);
  };

  const handleDeleteWorkout = () => {
    setDeleteWorkoutDialogOpen(true);
  };

  const confirmDeleteWorkout = () => {
    if (onDelete) {
      onDelete(workout);
    }
    setDeleteWorkoutDialogOpen(false);
  };

  const handleAddSet = async () => {
    if (!newSet.weight || !newSet.reps) return;

    const updatedSets = [
      ...workout.sets,
      {
        weight: Number(newSet.weight),
        reps: Number(newSet.reps),
      },
    ];

    const updatedWorkout: WorkoutRecord = {
      ...workout,
      sets: updatedSets,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (workout.id) {
      await updateWorkout(updatedWorkout);
    } else {
      await addWorkout(updatedWorkout);
    }

    setNewSet({ weight: "", reps: "" });
    setNewSetDialogOpen(false);
  };

  return (
    <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
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
          <Stack direction="row" spacing={1}>
            <IconButton
              aria-label="セットを追加"
              onClick={onAddSet}
              size="small"
              color="primary"
            >
              <AddIcon />
            </IconButton>
            {onDelete && (
              <IconButton
                aria-label="削除"
                onClick={handleDeleteWorkout}
                size="small"
                sx={{ color: "error.main" }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Stack>
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
                gap: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flex: 1,
                }}
              >
                <Typography variant="subtitle2" color="white">
                  セット {index + 1}:
                </Typography>
                <Typography color="white">
                  {set.weight}kg × {set.reps}回
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => handleDeleteSet(index)}
                sx={{
                  color: "error.main",
                  "&:hover": {
                    backgroundColor: "error.dark",
                    color: "error.main",
                  },
                }}
                aria-label={`セット ${index + 1} を削除`}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>

        {workout.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {workout.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ bgcolor: "grey.900" }}
              />
            ))}
          </Stack>
        )}
      </Stack>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">セットの削除</DialogTitle>
        <DialogContent>
          <Typography>このセットを削除してもよろしいですか？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
          <Button onClick={confirmDeleteSet} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteWorkoutDialogOpen}
        onClose={() => setDeleteWorkoutDialogOpen(false)}
        aria-labelledby="delete-workout-dialog-title"
      >
        <DialogTitle id="delete-workout-dialog-title">
          ワークアウトの削除
        </DialogTitle>
        <DialogContent>
          <Typography>
            この日のワークアウト記録を全て削除してもよろしいですか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteWorkoutDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={confirmDeleteWorkout}
            color="error"
            variant="contained"
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
