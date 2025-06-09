"use client";

import React, { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  isValid,
} from "date-fns";
import { ja } from "date-fns/locale";
import {
  Box,
  Typography,
  Grid,
  IconButton,
  useTheme,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { ChevronLeft, ChevronRight, Add as AddIcon } from "@mui/icons-material";
import { useWorkoutStore } from "@/store/workoutStore";
import { useSettingsStore } from "@/store/settingsStore";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { WorkoutRecord } from "@/types/workout";
import { Timestamp } from "firebase/firestore";
import { WorkoutSets } from "./WorkoutSets";
import { WeightPicker } from "./WeightPicker";
import { RepsPicker } from "./RepsPicker";

interface CalendarProps {
  isDrawerOpen?: boolean;
}

export const Calendar = ({ isDrawerOpen = false }: CalendarProps) => {
  const theme = useTheme();
  const { selectedDate, setSelectedDate, workouts, updateWorkout, addWorkout } =
    useWorkoutStore();
  const { user } = useAuth();
  const { calendarDisplayMode } = useSettingsStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [monthWorkouts, setMonthWorkouts] = useState<{ [key: string]: number }>(
    {}
  );
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutRecord | null>(
    null
  );
  const [addSetDialogOpen, setAddSetDialogOpen] = useState(false);
  const [newSet, setNewSet] = useState({ weight: 25, reps: 0 });
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);

    const q = query(
      collection(db, "users", user.uid, "workouts"),
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const workoutMap: { [key: string]: number } = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const date = data.date?.toDate();
          if (date) {
            const dateKey = format(date, "yyyy-MM-dd");
            const totalReps =
              data.sets?.reduce(
                (sum: number, set: any) => sum + (set.reps || 0),
                0
              ) || 0;
            workoutMap[dateKey] = totalReps;
          }
        });
        setMonthWorkouts(workoutMap);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching workouts:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, currentMonth]);

  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const dates = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayReps = (date: Date) => {
    if (!isValid(date)) return 0;
    const dateKey = format(date, "yyyy-MM-dd");
    return monthWorkouts[dateKey] || 0;
  };

  const getDayColor = (reps: number) => {
    if (reps === 0) return "transparent";
    if (reps < 10) return theme.palette.success.light;
    if (reps < 20) return theme.palette.success.main;
    return theme.palette.success.dark;
  };

  const getFireSize = (reps: number) => {
    if (reps === 0) return 0;
    if (reps < 10) return 1;
    if (reps < 20) return 1.5;
    return 2;
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    const dateKey = format(date, "yyyy-MM-dd");

    // 選択した日付のワークアウトを検索
    const workout = workouts.find(
      (w) =>
        w.date instanceof Timestamp &&
        isValid(w.date.toDate()) &&
        format(w.date.toDate(), "yyyy-MM-dd") === dateKey
    );

    if (workout) {
      setSelectedWorkout(workout);
    } else {
      // ワークアウトが存在しない場合は新しいワークアウトを作成
      const newWorkout: WorkoutRecord = {
        id: "",
        userId: user?.uid || "",
        date: Timestamp.fromDate(date),
        sets: [],
        tags: [],
        memo: "",
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };
      setSelectedWorkout(newWorkout);
    }
  };

  const handleAddSet = async () => {
    if (!selectedWorkout) return;

    const updatedSets = [
      ...selectedWorkout.sets,
      {
        weight: newSet.weight,
        reps: newSet.reps,
      },
    ];

    const updatedWorkout: WorkoutRecord = {
      ...selectedWorkout,
      sets: updatedSets,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (selectedWorkout.id) {
      await updateWorkout(updatedWorkout);
    } else {
      await addWorkout(updatedWorkout);
    }

    // 状態を更新
    setSelectedWorkout(updatedWorkout);
    // スナックバーを表示
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <IconButton onClick={handlePrevMonth}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h6">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </Typography>
        <IconButton onClick={handleNextMonth}>
          <ChevronRight />
        </IconButton>
      </Box>

      <Box
        sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}
      >
        {days.map((day) => (
          <Box key={day} sx={{ textAlign: "center", py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {day}
            </Typography>
          </Box>
        ))}

        {dates.map((date, index) => {
          const reps = getDayReps(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isCurrentDay = isToday(date);
          const isSelected =
            selectedDate &&
            format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");

          return (
            <Box key={index}>
              <Box
                onClick={() => !isDrawerOpen && handleDateClick(date)}
                sx={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isDrawerOpen ? "default" : "pointer",
                  position: "relative",
                  bgcolor: isSelected
                    ? "action.selected"
                    : isCurrentDay
                    ? "action.hover"
                    : "transparent",
                  opacity: isCurrentMonth ? 1 : 0.5,
                  "&:hover": {
                    bgcolor: isDrawerOpen ? "transparent" : "action.hover",
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: isSelected
                      ? "primary.main"
                      : isCurrentDay
                      ? "primary.main"
                      : "text.primary",
                    fontWeight: isSelected || isCurrentDay ? "bold" : "normal",
                  }}
                >
                  {format(date, "d")}
                </Typography>

                {calendarDisplayMode === "color" ? (
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "80%",
                      height: 4,
                      bgcolor: getDayColor(reps),
                      borderRadius: 1,
                    }}
                  />
                ) : (
                  reps > 0 && (
                    <WhatshotIcon
                      sx={{
                        position: "absolute",
                        bottom: 2,
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: theme.palette.warning.main,
                        fontSize: `${getFireSize(reps)}rem`,
                      }}
                    />
                  )
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {selectedWorkout && (
        <Box sx={{ mt: 2 }}>
          <WorkoutSets
            workout={selectedWorkout}
            onDelete={async (workout) => {
              await useWorkoutStore.getState().deleteWorkout(workout.id);
              setSelectedWorkout(null);
            }}
            onAddSet={() => setAddSetDialogOpen(true)}
          />
        </Box>
      )}

      <Dialog
        open={addSetDialogOpen}
        onClose={() => setAddSetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>セットを追加</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  重量
                </Typography>
                <WeightPicker
                  value={newSet.weight}
                  onChange={(value) => setNewSet({ ...newSet, weight: value })}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  回数
                </Typography>
                <RepsPicker
                  value={newSet.reps}
                  onChange={(value) => setNewSet({ ...newSet, reps: value })}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSetDialogOpen(false)}>閉じる</Button>
          <Button
            onClick={handleAddSet}
            variant="contained"
            color="primary"
            disabled={newSet.reps === 0}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          セットを追加しました
        </Alert>
      </Snackbar>
    </Box>
  );
};
