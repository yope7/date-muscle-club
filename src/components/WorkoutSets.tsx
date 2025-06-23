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
  Slider,
  Snackbar,
  Alert,
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
  onUpdate?: (updatedWorkout: WorkoutRecord) => void;
}

export const WorkoutSets = ({
  workout,
  onDelete,
  onAddSet,
  onUpdate,
}: WorkoutSetsProps) => {
  const { updateWorkout, addWorkout } = useWorkoutStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setToDelete, setSetToDelete] = useState<number | null>(null);
  const [deleteWorkoutDialogOpen, setDeleteWorkoutDialogOpen] = useState(false);
  const [newSetDialogOpen, setNewSetDialogOpen] = useState(false);
  const [newSet, setNewSet] = useState({ weight: "", reps: "" });
  const [bulkSetCount, setBulkSetCount] = useState(1);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // よく使う重量・回数のプリセット
  const weightRepsPresets = [
    { weight: 20, reps: 15, label: "軽め" },
    { weight: 25, reps: 12, label: "標準" },
    { weight: 30, reps: 10, label: "やや重め" },
    { weight: 40, reps: 8, label: "重め" },
    { weight: 50, reps: 6, label: "かなり重め" },
    { weight: 60, reps: 5, label: "最大重量" },
  ];

  const totalVolume = workout.sets.reduce(
    (sum, set) => sum + set.weight * set.reps,
    0
  );
  const totalSets = workout.sets.length;
  const workoutDate = workout.date.toDate();

  // ワークアウトタイプの情報を取得するヘルパー関数
  const getWorkoutTypeInfo = (typeName: string) => {
    // まず完全一致で検索
    let workoutType = workoutTypes.find((wt) => wt.name === typeName);

    // 完全一致が見つからない場合、部分一致で検索
    if (!workoutType) {
      workoutType = workoutTypes.find(
        (wt) => wt.name.includes(typeName) || typeName.includes(wt.name)
      );
    }

    // それでも見つからない場合、筋肉グループを推測
    if (!workoutType) {
      const muscleGroupMap: { [key: string]: string } = {
        胸: "chest",
        背中: "back",
        足: "legs",
        腹筋: "abs",
        腕: "arms",
        肩: "arms",
        有酸素: "cardio",
        カーディオ: "cardio",
      };

      const matchedMuscleGroup = Object.entries(muscleGroupMap).find(([key]) =>
        typeName.includes(key)
      );

      if (matchedMuscleGroup) {
        return {
          name: typeName,
          muscleGroup:
            muscleGroups.find((mg) => mg.id === matchedMuscleGroup[1])?.name ||
            "不明",
          muscleGroupId: matchedMuscleGroup[1],
        };
      }
    }

    if (workoutType) {
      const muscleGroup = muscleGroups.find(
        (mg) => mg.id === workoutType.muscleGroupId
      );
      return {
        name: typeName,
        muscleGroup: muscleGroup?.name || "不明",
        muscleGroupId: workoutType.muscleGroupId,
      };
    }

    return {
      name: typeName,
      muscleGroup: "不明",
      muscleGroupId: "unknown",
    };
  };

  // ワークアウトタイプの情報を取得
  const workoutTypeInfo = getWorkoutTypeInfo(workout.name || "不明");

  // ワークアウトタイプごとにセットをグループ化
  const groupedSets = workout.sets.reduce((acc, set, index) => {
    // セットのworkoutTypeを使用してグループ化
    const type = set.workoutType || workoutTypeInfo.muscleGroupId || "strength";
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
    // console.log("削除を実行");
    // console.log("削除対象：", setToDelete);
    // console.log("更新されたセット：", updatedSets);
    await updateWorkout(updatedWorkout);
    setDeleteDialogOpen(false);
    setSetToDelete(null);
    if (onUpdate) {
      onUpdate(updatedWorkout);
    }
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
      let newSets = [];

      // 常に一括追加モード（セット数が1の場合は単一セット）
      for (let i = 0; i < bulkSetCount; i++) {
        newSets.push({
          weight: Number(newSet.weight),
          reps: Number(newSet.reps),
        });
      }

      const updatedSets = [...workout.sets, ...newSets];

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
      setBulkSetCount(1);
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error adding set:", error);
      alert("セットの追加に失敗しました");
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
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
          const typeInfo = getWorkoutTypeInfo(type);
          const workoutTypeName = sets[0]?.workoutType || type;
          return (
            <Box key={type} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                {typeInfo.muscleGroup} - {workoutTypeName}
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

      <Dialog
        open={newSetDialogOpen}
        onClose={() => setNewSetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新しいセットを追加</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              label="重量 (kg)"
              type="number"
              value={newSet.weight}
              onChange={(e) => setNewSet({ ...newSet, weight: e.target.value })}
              fullWidth
              inputProps={{ min: 0, step: 0.5 }}
            />
            <TextField
              label="回数"
              type="number"
              value={newSet.reps}
              onChange={(e) => setNewSet({ ...newSet, reps: e.target.value })}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Box>

          {/* プリセットボタン */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              よく使う設定
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {weightRepsPresets.map((preset) => (
                <Chip
                  key={preset.label}
                  label={`${preset.weight}kg × ${preset.reps}回`}
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setNewSet({
                      weight: preset.weight.toString(),
                      reps: preset.reps.toString(),
                    })
                  }
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* セット数選択（常に表示） */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              セット数: {bulkSetCount}セット
            </Typography>
            <Slider
              value={bulkSetCount}
              onChange={(_, value) => setBulkSetCount(value as number)}
              min={1}
              max={5}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSetDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleAddSet} variant="contained">
            {bulkSetCount === 1 ? "追加" : `${bulkSetCount}セット追加`}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ width: "100%" }}
        >
          {bulkSetCount === 1
            ? "セットを追加しました"
            : `${bulkSetCount}セットを追加しました`}
        </Alert>
      </Snackbar>
    </Box>
  );
};
