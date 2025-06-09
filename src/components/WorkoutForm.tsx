"use client";

import React from "react";
import { useState, useEffect } from "react";
import { format, isValid } from "date-fns";
import { ja } from "date-fns/locale";
import { useWorkoutStore } from "@/store/workoutStore";
import { useAuth } from "@/hooks/useAuth";
import { WorkoutRecord, WorkoutSet } from "@/types/workout";
import { WeightPicker } from "./WeightPicker";
import { RepsPicker } from "./RepsPicker";
import dynamic from "next/dynamic";
import { Timestamp } from "firebase/firestore";
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Chip,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Fab,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  LocalOffer as TagIcon,
  Notes as NotesIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

const DEFAULT_TAGS = ["新記録更新", "筋肉痛あり", "回数重視"];

interface Props {
  onComplete?: () => void;
}

const WorkoutForm = ({ onComplete }: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const { selectedDate, addWorkout, workouts, updateWorkout, fetchWorkouts } =
    useWorkoutStore();
  const [sets, setSets] = useState<WorkoutSet[]>([{ weight: 25, reps: 0 }]);
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isMemoDialogOpen, setIsMemoDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 日付が変更された時にデータを再取得
  useEffect(() => {
    if (selectedDate && user) {
      fetchWorkouts();
    }
  }, [selectedDate, user, fetchWorkouts]);

  if (!selectedDate || !user || !isMounted) return null;

  // 既存のワークアウトを取得
  const existingWorkout = workouts.find(
    (w) =>
      w.date instanceof Timestamp &&
      isValid(w.date.toDate()) &&
      isValid(selectedDate) &&
      format(w.date.toDate(), "yyyy-MM-dd") ===
        format(selectedDate, "yyyy-MM-dd")
  );

  const handleAddSet = () => {
    const newSet = { weight: sets[sets.length - 1]?.weight || 25, reps: 0 };
    setSets([...sets, newSet]);
  };

  const handleSetChange = (
    index: number,
    field: keyof WorkoutSet,
    value: number
  ) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSaveSet = async () => {
    if (!isValid(selectedDate)) {
      alert("日付が無効です");
      return;
    }

    // 既存のワークアウトを取得または新規作成
    const workout: WorkoutRecord = {
      id: existingWorkout?.id || crypto.randomUUID(),
      userId: user.uid,
      date: Timestamp.fromDate(selectedDate),
      sets: [...(existingWorkout?.sets || []), ...sets],
      memo: existingWorkout?.memo || "",
      tags: existingWorkout?.tags || [],
      createdAt: existingWorkout?.createdAt || Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // 既存のワークアウトがある場合は更新、ない場合は新規作成
    if (existingWorkout) {
      await updateWorkout(workout);
    } else {
      await addWorkout(workout);
    }

    // セットの入力フォームをリセット
    setSets([{ weight: 25, reps: 0 }]);

    if (onComplete) {
      onComplete();
    }
  };

  const handleSaveMemo = () => {
    if (!isValid(selectedDate)) {
      console.error("Invalid date:", selectedDate);
      return;
    }

    const workout: WorkoutRecord = {
      id: existingWorkout?.id || crypto.randomUUID(),
      userId: user.uid,
      date: Timestamp.fromDate(selectedDate),
      sets: existingWorkout?.sets || [],
      memo,
      tags: existingWorkout?.tags || [],
      createdAt: existingWorkout?.createdAt || Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (existingWorkout) {
      updateWorkout(workout);
    } else {
      addWorkout(workout);
    }
    setIsMemoDialogOpen(false);
  };

  const handleSaveTags = () => {
    if (!isValid(selectedDate)) {
      console.error("Invalid date:", selectedDate);
      return;
    }

    const workout: WorkoutRecord = {
      id: existingWorkout?.id || crypto.randomUUID(),
      userId: user.uid,
      date: Timestamp.fromDate(selectedDate),
      sets: existingWorkout?.sets || [],
      memo: existingWorkout?.memo || "",
      tags,
      createdAt: existingWorkout?.createdAt || Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (existingWorkout) {
      updateWorkout(workout);
    } else {
      addWorkout(workout);
    }
    setIsTagDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDate) return;

    const workout: WorkoutRecord = {
      id: "",
      userId: user.uid,
      date: Timestamp.fromDate(selectedDate),
      sets,
      memo,
      tags,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    await addWorkout(workout);
    setSets([{ weight: 25, reps: 0 }]);
    setMemo("");
    setTags([]);
  };

  const handleDeleteSet = async (indexToDelete: number) => {
    if (!existingWorkout) return;

    // 指定されたインデックスのセットを除外した新しいセット配列を作成
    const updatedSets = existingWorkout.sets.filter(
      (_, index) => index !== indexToDelete
    );

    // ワークアウトを更新
    const workout: WorkoutRecord = {
      ...existingWorkout,
      sets: updatedSets,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    await updateWorkout(workout);
  };

  return (
    <div role="dialog" aria-modal="true">
      <AppBar position="sticky" color="inherit" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {isValid(selectedDate)
              ? format(selectedDate, "yyyy年M月d日", { locale: ja })
              : "日付が無効です"}
          </Typography>
          <IconButton edge="end" onClick={onComplete} aria-label="閉じる">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Stack spacing={2}>
          {existingWorkout && (
            <Box>
              <Typography variant="h6" gutterBottom>
                記録済みのセット
              </Typography>
              <Stack spacing={1}>
                {existingWorkout.sets.map((set, index) => (
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
              {existingWorkout.memo && (
                <Box mt={2}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    メモ
                  </Typography>
                  <Typography variant="body2">
                    {existingWorkout.memo}
                  </Typography>
                </Box>
              )}
              {existingWorkout.tags.length > 0 && (
                <Box mt={2}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    タグ
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {existingWorkout.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" sx={{ mt: 1 }} />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          <Box>
            <Typography variant="h6" gutterBottom>
              新しいセット
            </Typography>
            <Stack spacing={2}>
              {sets.map((set, index) => (
                <Box
                  key={index}
                  sx={{
                    p: isMobile ? 1.5 : 2,
                    bgcolor: "grey.900",
                    borderRadius: 1,
                    position: "relative",
                  }}
                >
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        重量
                      </Typography>
                      <WeightPicker
                        value={set.weight}
                        onChange={(value) =>
                          handleSetChange(index, "weight", value)
                        }
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        回数
                      </Typography>
                      <RepsPicker
                        value={set.reps}
                        onChange={(value) =>
                          handleSetChange(index, "reps", value)
                        }
                      />
                    </Box>
                  </Box>
                </Box>
              ))}
              <Stack direction="row" spacing={2}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddSet}
                  variant="outlined"
                  fullWidth
                  aria-label="セットを追加"
                >
                  セットを追加
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleSaveSet}
                  aria-label="セットを保存"
                >
                  保存
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>

      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Fab
          color="primary"
          aria-label="メモを追加"
          onClick={() => setIsMemoDialogOpen(true)}
        >
          <NotesIcon />
        </Fab>
        <Fab
          color="secondary"
          aria-label="タグを追加"
          onClick={() => setIsTagDialogOpen(true)}
        >
          <TagIcon />
        </Fab>
      </Box>

      <Dialog
        open={isMemoDialogOpen}
        onClose={() => setIsMemoDialogOpen(false)}
      >
        <DialogTitle>メモを追加</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモを入力..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsMemoDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleSaveMemo} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isTagDialogOpen} onClose={() => setIsTagDialogOpen(false)}>
        <DialogTitle>タグを追加</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              よく使うタグ
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {DEFAULT_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onClick={() => toggleTag(tag)}
                  color={tags.includes(tag) ? "primary" : "default"}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTagDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleSaveTags} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default dynamic(() => Promise.resolve(WorkoutForm), { ssr: false });
