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
  TextField,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Add as AddIcon,
  ArrowBack,
} from "@mui/icons-material";
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
import { NumberPicker } from "./NumberPicker";
import { WorkoutTypeSelector } from "./WorkoutTypeSelector";
import { WorkoutType } from "@/data/workoutTypes";

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
  const [workoutTypeSelectorOpen, setWorkoutTypeSelectorOpen] = useState(false);
  const [selectedWorkoutType, setSelectedWorkoutType] =
    useState<WorkoutType | null>(null);

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
        name: "ワークアウト",
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
        workoutType: selectedWorkoutType?.name || "ベンチプレス",
      },
    ];

    const updatedWorkout: WorkoutRecord = {
      ...selectedWorkout,
      sets: updatedSets,
      updatedAt: Timestamp.fromDate(new Date()),
      name: selectedWorkoutType?.name || "ベンチプレス",
    };

    if (selectedWorkout.id) {
      await updateWorkout(updatedWorkout);
    } else {
      await addWorkout(updatedWorkout);
    }

    setSelectedWorkout(updatedWorkout);
    setSnackbarOpen(true);
    setSelectedWorkoutType(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleWorkoutTypeSelect = (workoutType: WorkoutType) => {
    setSelectedWorkoutType(workoutType);
    setAddSetDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "600px" },
        mx: "auto",
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: { xs: 1, sm: 2 },
        }}
      >
        {days.map((day) => (
          <Box key={day} sx={{ textAlign: "center", py: { xs: 1, sm: 1.5 } }}>
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
            <Box
              key={index}
              onClick={() => !isDrawerOpen && handleDateClick(date)}
              sx={{
                position: "relative",
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: isDrawerOpen ? "default" : "pointer",
                bgcolor: isSelected
                  ? "action.selected"
                  : isCurrentDay
                  ? "action.hover"
                  : "transparent",
                borderRadius: 1,
                "&:hover": {
                  bgcolor: isDrawerOpen ? "transparent" : "action.hover",
                },
              }}
            >
              <Typography
                variant="body2"
                color={
                  isSelected
                    ? "primary.main"
                    : isCurrentDay
                    ? "primary.main"
                    : "text.primary"
                }
                sx={{
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  fontWeight: isSelected || isCurrentDay ? "bold" : "normal",
                }}
              >
                {format(date, "d")}
              </Typography>

              {calendarDisplayMode === "color" ? (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: { xs: 2, sm: 4 },
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: { xs: "60%", sm: "70%" },
                    height: { xs: 3, sm: 4 },
                    bgcolor: getDayColor(reps),
                    borderRadius: 1,
                  }}
                />
              ) : (
                reps > 0 && (
                  <WhatshotIcon
                    sx={{
                      position: "absolute",
                      bottom: { xs: 2, sm: 4 },
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: theme.palette.warning.main,
                      fontSize: {
                        xs: `${getFireSize(reps)}rem`,
                        sm: `${getFireSize(reps) * 1.2}rem`,
                      },
                    }}
                  />
                )
              )}
            </Box>
          );
        })}
      </Box>

      {selectedWorkout && (
        <Box sx={{ mt: { xs: 2, sm: 3 } }}>
          <WorkoutSets
            workout={selectedWorkout}
            onDelete={async (workout) => {
              if (workout.id) {
                await useWorkoutStore.getState().deleteWorkout(workout.id);
              }
              setSelectedWorkout(null);
            }}
            onAddSet={() => setWorkoutTypeSelectorOpen(true)}
          />
        </Box>
      )}

      <WorkoutTypeSelector
        open={workoutTypeSelectorOpen}
        onClose={() => setWorkoutTypeSelectorOpen(false)}
        onSelect={handleWorkoutTypeSelect}
      />

      <Dialog
        open={addSetDialogOpen}
        onClose={() => {
          setAddSetDialogOpen(false);
          setSelectedWorkoutType(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              onClick={() => {
                setAddSetDialogOpen(false);
                setWorkoutTypeSelectorOpen(true);
              }}
              sx={{ mr: 1 }}
            >
              <ArrowBack />
            </IconButton>
            {selectedWorkoutType
              ? `${selectedWorkoutType.name}のセットを追加`
              : "新しいセットを追加"}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedWorkoutType?.id === "running" ? (
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  時間（分）
                </Typography>
                <NumberPicker
                  value={newSet.reps}
                  onChange={(value) => setNewSet({ ...newSet, reps: value })}
                  min={0}
                  max={300}
                  step={1}
                  unit="分"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  距離（km）
                </Typography>
                <NumberPicker
                  value={newSet.weight}
                  onChange={(value) => setNewSet({ ...newSet, weight: value })}
                  min={0}
                  max={100}
                  step={0.1}
                  unit="km"
                />
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  重量
                </Typography>
                <NumberPicker
                  value={newSet.weight}
                  onChange={(value) => setNewSet({ ...newSet, weight: value })}
                  min={0}
                  max={150}
                  step={2.5}
                  unit="kg"
                  allowEmpty
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  回数
                </Typography>
                <NumberPicker
                  value={newSet.reps}
                  onChange={(value) => setNewSet({ ...newSet, reps: value })}
                  min={0}
                  max={100}
                  step={1}
                  unit="回"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddSetDialogOpen(false);
              setSelectedWorkoutType(null);
            }}
          >
            キャンセル
          </Button>
          <Button onClick={handleAddSet} variant="contained">
            追加
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
          セットを追加しました
        </Alert>
      </Snackbar>
    </Box>
  );
};
