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
  Slider,
  Chip,
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
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";

interface CalendarProps {
  isDrawerOpen?: boolean;
}

export const Calendar = ({ isDrawerOpen = false }: CalendarProps) => {
  const theme = useTheme();
  const {
    workouts,
    updateWorkout,
    addWorkout,
    fetchWorkoutsByMonth,
    isLoading,
  } = useWorkoutStore();
  const { user } = useAuth();
  const { calendarDisplayMode } = useSettingsStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [monthWorkouts, setMonthWorkouts] = useState<{ [key: string]: number }>(
    {}
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutRecord | null>(
    null
  );
  const [addSetDialogOpen, setAddSetDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [workoutTypeSelectorOpen, setWorkoutTypeSelectorOpen] = useState(false);
  const [selectedWorkoutType, setSelectedWorkoutType] =
    useState<WorkoutType | null>(null);
  const [dialogValues, setDialogValues] = useState({ weight: 25, reps: 10 });
  const [bulkSetCount, setBulkSetCount] = useState(1);

  // Riveアニメーションの設定
  const { RiveComponent, rive } = useRive({
    src: "/untitled.riv",
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    autoplay: true,
    onStateChange: (event) => {
      console.log("State changed:", event);
    },
    onRiveReady: (rive) => {
      console.log("=== RIVE READY EVENT ===");
      console.log("Rive object:", rive);
      console.log(
        "Available methods:",
        Object.getOwnPropertyNames(Object.getPrototypeOf(rive))
      );
    },
  });

  // Riveオブジェクトが利用可能になった時の処理
  useEffect(() => {
    if (rive) {
      console.log("=== RIVE FILE DETAILED INFO ===");
      console.log("Rive object is ready");
      console.log("State machines:", rive.stateMachineNames);

      // 利用可能なステートマシンの情報を表示
      rive.stateMachineNames.forEach((name, index) => {
        try {
          const inputs = rive.stateMachineInputs(name);
          if (inputs && inputs.length > 0) {
            console.log(
              `State machine ${index}: ${name}`,
              inputs.map((input) => input.name)
            );
          } else {
            console.log(`State machine ${index}: ${name} - No inputs`);
          }
        } catch (error) {
          console.log(`Error getting inputs for ${name}:`, error);
        }
      });
    }
  }, [rive]);

  // クリックハンドラー
  const handleRiveClick = () => {
    console.log("Rive click event triggered");
    if (rive) {
      try {
        // 利用可能なステートマシンを確認
        const stateMachines = rive.stateMachineNames;
        console.log("Available state machines:", stateMachines);

        if (stateMachines.length > 0) {
          const inputs = rive.stateMachineInputs(stateMachines[0]);

          if (inputs && inputs.length > 0) {
            console.log(
              "Available inputs:",
              inputs.map((input) => input.name)
            );

            // クリック関連の入力を見つける
            const clickInput = inputs.find(
              (input) =>
                input.name === "click" ||
                input.name === "Click" ||
                input.name === "pressed" ||
                input.name === "Pressed"
            );

            if (clickInput) {
              clickInput.fire();
              console.log("Click input fired:", clickInput.name);
            } else {
              console.log("No click input found");
            }
          } else {
            console.log(
              "No inputs found in state machine - trying alternative methods"
            );
            // 入力がない場合の代替手段
            try {
              // アニメーションを一時停止して再開
              rive.pause();
              setTimeout(() => {
                rive.play();
              }, 100);
              console.log("Animation restarted as click effect");
            } catch (animError) {
              console.log("Could not control animation:", animError);
            }
          }
        } else {
          console.log("No state machines found");
        }
      } catch (error) {
        console.error("Error in click handler:", error);
      }
    } else {
      console.log("Rive object not available");
    }
  };

  // ホバーハンドラー
  const handleRiveHover = () => {
    if (rive) {
      try {
        const stateMachines = rive.stateMachineNames;
        if (stateMachines.length > 0) {
          const inputs = rive.stateMachineInputs(stateMachines[0]);
          if (inputs && inputs.length > 0) {
            const hoverInput = inputs.find((input) => input.name === "hover");
            if (hoverInput) {
              hoverInput.fire();
              console.log("Hover input fired:", hoverInput.name);
            }
          }
        }
      } catch (error) {
        console.log("Rive animation hovered");
      }
    }
  };

  // ホバーアウトハンドラー
  const handleRiveHoverOut = () => {
    if (rive) {
      try {
        const stateMachines = rive.stateMachineNames;
        if (stateMachines.length > 0) {
          const inputs = rive.stateMachineInputs(stateMachines[0]);
          if (inputs && inputs.length > 0) {
            const hoverInput = inputs.find((input) => input.name === "hover");
            if (hoverInput) {
              hoverInput.fire();
              console.log("Hover out input fired:", hoverInput.name);
            }
          }
        }
      } catch (error) {
        console.log("Rive animation hover out");
      }
    }
  };

  // よく使う重量・回数のプリセット
  const weightRepsPresets = [
    { weight: 20, reps: 15, label: "軽め" },
    { weight: 25, reps: 12, label: "標準" },
    { weight: 30, reps: 10, label: "やや重め" },
    { weight: 40, reps: 8, label: "重め" },
    { weight: 50, reps: 6, label: "かなり重め" },
    { weight: 60, reps: 5, label: "最大重量" },
  ];

  // デフォルト値を取得する関数
  const getDefaultValues = () => {
    if (selectedWorkoutType?.id === "running") {
      return { weight: 5, reps: 30 }; // 距離5km、時間30分
    }
    return { weight: 25, reps: 10 }; // 重量25kg、回数10回
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 初期化時に現在の月のデータを取得
    const initializeMonthData = async () => {
      await fetchWorkoutsByMonth(user.uid, currentMonth);
      setLoading(false);
    };

    initializeMonthData();
  }, [user, fetchWorkoutsByMonth]);

  // workoutStoreのデータから月別データを生成
  useEffect(() => {
    if (!user || !workouts) return;

    const workoutMap: { [key: string]: number } = {};

    workouts.forEach((workout) => {
      if (workout.date instanceof Timestamp) {
        const date = workout.date.toDate();
        const dateKey = format(date, "yyyy-MM-dd");
        const totalReps =
          workout.sets?.reduce(
            (sum: number, set: any) => sum + (set.reps || 0),
            0
          ) || 0;
        workoutMap[dateKey] = totalReps;
      }
    });

    setMonthWorkouts(workoutMap);
  }, [user, workouts, currentMonth]);

  // データの整合性チェックと自動再取得
  useEffect(() => {
    if (!user || !workouts) return;

    // 現在の月の開始日と終了日を計算
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    // 前月の一部も含める（カレンダー表示用）
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - 7);

    // 現在の月のデータが不足しているかチェック
    const currentMonthWorkouts = workouts.filter((workout) => {
      if (workout.date instanceof Timestamp) {
        const workoutDate = workout.date.toDate();
        return workoutDate >= startDate && workoutDate <= endOfMonth;
      }
      return false;
    });

    // データが不足している場合（0件または予想より少ない場合）は再取得
    const shouldRefetch =
      currentMonthWorkouts.length === 0 ||
      (currentMonthWorkouts.length < 5 && workouts.length > 10); // 月のデータが少ないが全体のデータは多い場合

    if (shouldRefetch) {
      fetchWorkoutsByMonth(user.uid, currentMonth);
    }
  }, [user, workouts, currentMonth, fetchWorkoutsByMonth]);

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

  const handlePrevMonth = async () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    if (user) {
      console.log("=== Prev Month Debug ===");
      await fetchWorkoutsByMonth(user.uid, newMonth);
    }
  };

  const handleNextMonth = async () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    if (user) {
      console.log("=== Next Month Debug ===");
      await fetchWorkoutsByMonth(user.uid, newMonth);
    }
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

    // データの整合性チェック
    if (!workout && user) {
      // クリックした日付のデータが見つからない場合、データが不足している可能性がある
      const clickedMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const currentMonthData = workouts.filter((w) => {
        if (w.date instanceof Timestamp) {
          const workoutDate = w.date.toDate();
          return (
            workoutDate.getFullYear() === clickedMonth.getFullYear() &&
            workoutDate.getMonth() === clickedMonth.getMonth()
          );
        }
        return false;
      });

      // 月のデータが少ない場合は再取得を試行
      if (currentMonthData.length < 3 && workouts.length > 5) {
        await fetchWorkoutsByMonth(user.uid, clickedMonth);

        // 少し待ってから再度検索
        setTimeout(() => {
          const updatedWorkout = workouts.find(
            (w) =>
              w.date instanceof Timestamp &&
              isValid(w.date.toDate()) &&
              format(w.date.toDate(), "yyyy-MM-dd") === dateKey
          );
          if (updatedWorkout) {
            setSelectedWorkout(updatedWorkout);
          }
        }, 1000);
      }
    }

    if (workout) {
      setSelectedWorkout(workout);
    } else {
      // ワークアウトが存在しない場合は新しいワークアウトを作成
      // 選択した日付に現在の時刻を設定
      const workoutDate = new Date(date);
      workoutDate.setHours(
        new Date().getHours(),
        new Date().getMinutes(),
        new Date().getSeconds(),
        new Date().getMilliseconds()
      );

      const newWorkout: WorkoutRecord = {
        id: `temp_${Date.now()}`, // 一時的なIDを設定
        userId: user?.uid || "",
        date: Timestamp.fromDate(workoutDate),
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

  // 選択されたワークアウトを常に最新の状態に保つ
  useEffect(() => {
    if (!selectedDate || !workouts.length) return;

    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const currentWorkout = workouts.find(
      (w) =>
        w.date instanceof Timestamp &&
        isValid(w.date.toDate()) &&
        format(w.date.toDate(), "yyyy-MM-dd") === dateKey
    );

    if (
      currentWorkout &&
      (!selectedWorkout || selectedWorkout.id !== currentWorkout.id)
    ) {
      setSelectedWorkout(currentWorkout);
    }
  }, [selectedDate, workouts]);

  // 定期的なデータ整合性チェック（5秒ごと）
  useEffect(() => {
    if (!user || !workouts.length) return;

    const interval = setInterval(() => {
      const currentMonthData = workouts.filter((w) => {
        if (w.date instanceof Timestamp) {
          const workoutDate = w.date.toDate();
          return (
            workoutDate.getFullYear() === currentMonth.getFullYear() &&
            workoutDate.getMonth() === currentMonth.getMonth()
          );
        }
        return false;
      });

      // データが不足している場合は再取得
      if (currentMonthData.length === 0 && workouts.length > 0) {
        fetchWorkoutsByMonth(user.uid, currentMonth);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, workouts, currentMonth, fetchWorkoutsByMonth]);

  const handleAddSet = async () => {
    if (!selectedWorkout) return;

    let newSets = [];

    // 常に一括追加モード（セット数が1の場合は単一セット）
    for (let i = 0; i < bulkSetCount; i++) {
      newSets.push({
        weight: dialogValues.weight,
        reps: dialogValues.reps,
        workoutType: selectedWorkoutType?.name || "ベンチプレス",
      });
    }

    const updatedSets = [...selectedWorkout.sets, ...newSets];

    const updatedWorkout: WorkoutRecord = {
      ...selectedWorkout,
      sets: updatedSets,
      updatedAt: Timestamp.fromDate(new Date()),
      name: selectedWorkoutType?.name || "ベンチプレス",
    };

    // 一時的なIDの場合は新規作成、そうでなければ更新
    if (selectedWorkout.id && !selectedWorkout.id.startsWith("temp_")) {
      await updateWorkout(updatedWorkout);
    } else {
      await addWorkout(updatedWorkout);
    }

    setSelectedWorkout(updatedWorkout);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleWorkoutTypeSelect = (workoutType: WorkoutType) => {
    setSelectedWorkoutType(workoutType);
    setAddSetDialogOpen(true);
  };

  if (loading || isLoading) {
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
        <IconButton onClick={handlePrevMonth} disabled={isLoading}>
          <ChevronLeft />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6">
            {format(currentMonth, "yyyy年M月", { locale: ja })}
          </Typography>
          {isLoading && <CircularProgress size={20} />}
        </Box>
        <IconButton onClick={handleNextMonth} disabled={isLoading}>
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
            onUpdate={(updatedWorkout) => {
              setSelectedWorkout(updatedWorkout);
            }}
            allWorkouts={workouts}
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
                  value={dialogValues.reps}
                  onChange={(value) =>
                    setDialogValues({ ...dialogValues, reps: value })
                  }
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
                  value={dialogValues.weight}
                  onChange={(value) =>
                    setDialogValues({ ...dialogValues, weight: value })
                  }
                  min={0}
                  max={100}
                  step={0.1}
                  unit="km"
                />
              </Box>
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    重量
                  </Typography>
                  <NumberPicker
                    value={dialogValues.weight}
                    onChange={(value) =>
                      setDialogValues({ ...dialogValues, weight: value })
                    }
                    min={0}
                    max={150}
                    step={2.5}
                    unit="kg"
                    allowEmpty
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
                  <NumberPicker
                    value={dialogValues.reps}
                    onChange={(value) =>
                      setDialogValues({ ...dialogValues, reps: value })
                    }
                    min={0}
                    max={100}
                    step={1}
                    unit="回"
                  />
                </Box>
              </Box>

              {/* プリセットボタン */}
              <Box sx={{ mt: 2 }}>
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
                        setDialogValues({
                          weight: preset.weight,
                          reps: preset.reps,
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
            </>
          )}

          {/* セット数選択（常に表示） */}
          <Box sx={{ mt: 3 }}>
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
          <Button
            onClick={() => {
              setAddSetDialogOpen(false);
            }}
          >
            キャンセル
          </Button>
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
