import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  IconButton,
  Chip,
  Stack,
} from "@mui/material";
import { WorkoutRecord } from "@/types/workout";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { workoutTypes, muscleGroups } from "@/data/workoutTypes";

interface WorkoutStatsProps {
  workouts: WorkoutRecord[];
}

export const WorkoutStats: React.FC<WorkoutStatsProps> = ({ workouts }) => {
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<string | null>(
    null
  );

  // フィルタリングされたワークアウト
  const filteredWorkouts = useMemo(() => {
    if (!selectedWorkoutType) {
      return workouts;
    }
    return workouts.filter((workout) => workout.name === selectedWorkoutType);
  }, [workouts, selectedWorkoutType]);

  const totalWorkouts = filteredWorkouts.length;
  const totalSets = filteredWorkouts.reduce((sum, w) => sum + w.sets.length, 0);
  const totalReps = filteredWorkouts.reduce(
    (sum, w) => sum + w.sets.reduce((setSum, set) => setSum + set.reps, 0),
    0
  );
  const maxWeight = Math.max(
    ...filteredWorkouts.flatMap((w) => w.sets.map((s) => s.weight))
  );
  const totalVolume = filteredWorkouts.reduce(
    (sum, w) =>
      sum + w.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0),
    0
  );
  const avgWeight =
    totalSets > 0
      ? filteredWorkouts.reduce(
          (sum, w) =>
            sum + w.sets.reduce((setSum, set) => setSum + set.weight, 0),
          0
        ) / totalSets
      : 0;
  const avgReps = totalSets > 0 ? totalReps / totalSets : 0;
  const maxVolumeInOneDay = Math.max(
    ...filteredWorkouts.map((w) =>
      w.sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
    )
  );

  const lastWorkout = filteredWorkouts[0];
  const lastWorkoutDate = lastWorkout
    ? format(lastWorkout.date.toDate(), "yyyy年M月d日", { locale: ja })
    : "なし";

  // よく行うワークアウトタイプを取得
  const frequentWorkoutTypes = useMemo(() => {
    const typeCounts = workouts.reduce((acc, workout) => {
      // workout.setsからworkoutTypeを取得
      const workoutTypesInSets =
        workout.sets
          ?.map((set) => set.workoutType)
          .filter((type): type is string => Boolean(type)) || [];

      // 各ワークアウトタイプをカウント
      workoutTypesInSets.forEach((type) => {
        acc[type] = (acc[type] || 0) + 1;
      });

      return acc;
    }, {} as Record<string, number>);

    const sortedTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // 上位5つを表示

    return sortedTypes.map(([type, count]) => {
      const workoutType = workoutTypes.find((wt) => wt.name === type);
      const muscleGroup = workoutType
        ? muscleGroups.find((mg) => mg.id === workoutType.muscleGroupId)
        : null;

      return {
        name: type,
        count,
        muscleGroup: muscleGroup?.name || "不明",
      };
    });
  }, [workouts]);

  // 選択されたワークアウトタイプの情報を取得
  const selectedWorkoutTypeInfo = useMemo(() => {
    if (!selectedWorkoutType) return null;

    const workoutType = workoutTypes.find(
      (wt) => wt.name === selectedWorkoutType
    );
    const muscleGroup = workoutType
      ? muscleGroups.find((mg) => mg.id === workoutType.muscleGroupId)
      : null;

    return {
      name: selectedWorkoutType,
      muscleGroup: muscleGroup?.name || "不明",
    };
  }, [selectedWorkoutType]);

  const stats = [
    {
      title: "トレーニング日数",
      value: totalWorkouts,
      unit: "日",
    },
    {
      title: "総セット数",
      value: totalSets,
      unit: "セット",
    },
    {
      title: "総レップ数",
      value: totalReps,
      unit: "回",
    },
    {
      title: "最高重量",
      value: maxWeight,
      unit: "kg",
    },
    {
      title: "総挙上量",
      value: totalVolume,
      unit: "kg",
    },
    {
      title: "平均重量",
      value: Math.round(avgWeight * 10) / 10,
      unit: "kg",
    },
    {
      title: "平均レップ数",
      value: Math.round(avgReps * 10) / 10,
      unit: "回",
    },
    {
      title: "1日の最高挙上量",
      value: maxVolumeInOneDay,
      unit: "kg",
    },
  ];

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left:
          currentScroll + (direction === "left" ? -scrollAmount : scrollAmount),
        behavior: "smooth",
      });
    }
  };

  const handleWorkoutTypeClick = (workoutType: string) => {
    if (selectedWorkoutType === workoutType) {
      setSelectedWorkoutType(null); // 同じものをクリックした場合は選択解除
    } else {
      setSelectedWorkoutType(workoutType);
    }
  };

  return (
    <Box sx={{ position: "relative", mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        トレーニング統計
      </Typography>

      {/* よく行うワークアウトタイプの一覧 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          よく行うワークアウト:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label="すべて"
            size="small"
            variant={selectedWorkoutType === null ? "filled" : "outlined"}
            color={selectedWorkoutType === null ? "primary" : "default"}
            onClick={() => setSelectedWorkoutType(null)}
            sx={{ cursor: "pointer" }}
          />
          {frequentWorkoutTypes.map((type) => (
            <Chip
              key={type.name}
              label={`${type.name} (${type.count}回)`}
              size="small"
              variant={
                selectedWorkoutType === type.name ? "filled" : "outlined"
              }
              color={selectedWorkoutType === type.name ? "primary" : "default"}
              onClick={() => handleWorkoutTypeClick(type.name)}
              sx={{ cursor: "pointer" }}
            />
          ))}
        </Stack>
      </Box>

      {/* 選択されたワークアウトタイプの表示 */}
      {selectedWorkoutTypeInfo && (
        <Box sx={{ mb: 2 }}>
          <Chip
            // icon={<span>{selectedWorkoutTypeInfo.icon}</span>}
            label={`${selectedWorkoutTypeInfo.muscleGroup} - ${selectedWorkoutTypeInfo.name}`}
            color="primary"
            variant="filled"
            sx={{ mb: 1 }}
          />
        </Box>
      )}

      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={() => handleScroll("left")}
          sx={{
            position: "absolute",
            left: -20,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            bgcolor: "background.paper",
            boxShadow: 1,
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <ChevronLeft />
        </IconButton>
        <Box
          ref={scrollContainerRef}
          sx={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            scrollBehavior: "smooth",
            "&::-webkit-scrollbar": { display: "none" },
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            px: 1,
          }}
        >
          {stats.map((stat, index) => (
            <Card
              key={index}
              sx={{
                minWidth: 200,
                flexShrink: 0,
                bgcolor: "background.paper",
                boxShadow: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CardContent sx={{ textAlign: "center", width: "100%" }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  {stat.title}
                </Typography>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {stat.value}
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 0.5 }}
                  >
                    {stat.unit}
                  </Typography>
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
        <IconButton
          onClick={() => handleScroll("right")}
          sx={{
            position: "absolute",
            right: -20,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            bgcolor: "background.paper",
            boxShadow: 1,
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <ChevronRight />
        </IconButton>
      </Box>
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          最終トレーニング: {lastWorkoutDate}
        </Typography>
      </Box>
    </Box>
  );
};
