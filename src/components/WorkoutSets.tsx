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
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { WorkoutRecord } from "@/types/workout";
import { useWorkoutStore } from "@/store/workoutStore";
import { Timestamp } from "firebase/firestore";
import { workoutTypes, muscleGroups } from "@/data/workoutTypes";

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

  // ワークアウトタイプの情報を取得
  console.log("Current workout name:", workout.name);
  console.log("Workout sets:", workout.sets);
  const workoutTypeInfo = workoutTypes.find(
    (type) => type.name === workout.name
  );
  console.log("Found workout type:", workoutTypeInfo);
  const muscleGroupInfo = workoutTypeInfo
    ? muscleGroups.find((group) => group.id === workoutTypeInfo.muscleGroupId)
    : null;
  console.log("Found muscle group:", muscleGroupInfo);

  // ワークアウトタイプごとにセットをグループ化
  const groupedSets = workout.sets.reduce((acc, set, index) => {
    // セットのworkoutTypeを使用してグループ化
    const type =
      set.workoutType || workoutTypeInfo?.muscleGroupId || "strength";
    console.log("Grouping set with type:", type, "for set:", set);
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push({ ...set, index });
    return acc;
  }, {} as { [key: string]: ((typeof workout.sets)[0] & { index: number })[] });

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

    try {
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
    } catch (error) {
      console.error("Error adding set:", error);
      alert("セットの追加に失敗しました");
    }
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
              {muscleGroupInfo && (
                <Typography variant="body2" color="text.secondary">
                  {muscleGroupInfo.icon} {muscleGroupInfo.name}
                </Typography>
              )}
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

        <Divider />

        {Object.entries(groupedSets).map(([type, sets]) => {
          const muscleGroup = muscleGroups.find((group) => group.id === type);
          const workoutTypeName = sets[0]?.workoutType || type;
          return (
            <Box key={type} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                {muscleGroup?.icon} {muscleGroup?.name} - {workoutTypeName}
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "grey.900",
                  borderRadius: 1,
                }}
              >
                <Stack spacing={1}>
                  {sets.map((set, typeIndex) => (
                    <Box
                      key={set.index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        py: 1,
                        borderBottom:
                          typeIndex !== sets.length - 1
                            ? "1px solid rgba(255, 255, 255, 0.1)"
                            : "none",
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
                          セット {typeIndex + 1}:
                        </Typography>
                        <Typography color="white">
                          {type === "cardio"
                            ? `${set.reps}分`
                            : `${set.weight}kg × ${set.reps}回`}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSet(set.index)}
                        sx={{
                          color: "error.main",
                          "&:hover": {
                            backgroundColor: "error.dark",
                            color: "error.main",
                          },
                        }}
                        aria-label={`セット ${typeIndex + 1} を削除`}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          );
        })}

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
