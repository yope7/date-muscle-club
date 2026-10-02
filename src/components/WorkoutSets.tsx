"use client";

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import { Timestamp } from "firebase/firestore";
import { WorkoutRecord, WorkoutSet } from "@/types/workout";
import { useWorkoutStore } from "@/store/workoutStore";
import { useUserStore } from "@/store/userStore";
import { useAuth } from "@/hooks/useAuth";
import { getWorkoutTypeInfo, isCardioWorkoutType } from "@/lib/workoutTypeInfo";

interface WorkoutSetsProps {
  workout: WorkoutRecord;
  onDelete?: (workout: WorkoutRecord) => void;
  onAddSet?: () => void;
  onUpdate?: (updatedWorkout: WorkoutRecord) => void;
}

type IndexedSet = WorkoutSet & { index: number };

export const WorkoutSets = ({
  workout,
  onDelete,
  onAddSet,
  onUpdate,
}: WorkoutSetsProps) => {
  const { updateWorkout } = useWorkoutStore();
  const { profiles } = useUserStore();
  const { user } = useAuth();
  const [setToDelete, setSetToDelete] = useState<number | null>(null);
  const [deleteWorkoutDialogOpen, setDeleteWorkoutDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 種目ごとにセットをまとめる（削除用に元の位置を保持）
  const groupedSets = useMemo(() => {
    const groups = new Map<string, IndexedSet[]>();
    workout.sets.forEach((set, index) => {
      const type = set.workoutType || workout.name || "不明";
      groups.set(type, [...(groups.get(type) ?? []), { ...set, index }]);
    });
    return Array.from(groups.entries());
  }, [workout.sets, workout.name]);

  const confirmDeleteSet = async () => {
    if (setToDelete === null) return;
    try {
      const updatedWorkout: WorkoutRecord = {
        ...workout,
        sets: workout.sets.filter((_, index) => index !== setToDelete),
        updatedAt: Timestamp.fromDate(new Date()),
      };
      await updateWorkout(updatedWorkout);
      setSetToDelete(null);
      onUpdate?.(updatedWorkout);
    } catch (e) {
      console.error("Error deleting set:", e);
      setSetToDelete(null);
      setError("セットの削除に失敗しました");
    }
  };

  const memberInitial = (memberId: string) =>
    memberId === user?.uid
      ? "自"
      : profiles[memberId]?.displayName?.charAt(0) || "?";

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
              {format(workout.date.toDate(), "M月d日 (E)", { locale: ja })}
            </Typography>
            {workout.isGroupWorkout && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  icon={<GroupIcon />}
                  label={workout.groupWorkoutName || "合同トレーニング"}
                  color="info"
                  size="small"
                  sx={{ mb: 1 }}
                />
                {!!workout.groupMembers?.length && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {workout.groupMembers.slice(0, 3).map((memberId) => (
                      <Avatar
                        key={memberId}
                        sx={{ width: 20, height: 20, fontSize: "0.6rem" }}
                      >
                        {memberInitial(memberId)}
                      </Avatar>
                    ))}
                    {workout.groupMembers.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{workout.groupMembers.length - 3}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
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
                aria-label="この日の記録を削除"
                onClick={() => setDeleteWorkoutDialogOpen(true)}
                size="small"
                sx={{ color: "error.main" }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {groupedSets.map(([type, sets]) => {
          const typeInfo = getWorkoutTypeInfo(type);
          const cardio = isCardioWorkoutType(type);
          return (
            <Box key={type} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                {typeInfo.muscleGroup} - {type}
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                <Stack spacing={1}>
                  {sets.map((set, typeIndex) => (
                    <Box
                      key={set.id ?? set.index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        py: 1,
                        borderBottom: typeIndex !== sets.length - 1 ? 1 : 0,
                        borderColor: "divider",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography variant="subtitle2">
                          セット {typeIndex + 1}:
                        </Typography>
                        <Typography>
                          {cardio
                            ? `${set.weight}km / ${set.reps}分`
                            : `${set.weight}kg × ${set.reps}回`}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => setSetToDelete(set.index)}
                        sx={{ color: "error.main" }}
                        aria-label={`${type}のセット ${typeIndex + 1} を削除`}
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
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
      </Stack>

      <Dialog
        open={setToDelete !== null}
        onClose={() => setSetToDelete(null)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">セットの削除</DialogTitle>
        <DialogContent>
          <Typography>このセットを削除してもよろしいですか？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetToDelete(null)}>キャンセル</Button>
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
            onClick={() => {
              onDelete?.(workout);
              setDeleteWorkoutDialogOpen(false);
            }}
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
