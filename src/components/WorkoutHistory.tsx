import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Paper,
  Stack,
  Chip,
  Divider,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { WorkoutRecord } from "@/types/workout";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { workoutTypes, muscleGroups } from "@/data/workoutTypes";

interface WorkoutHistoryProps {
  workouts: WorkoutRecord[];
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ workouts }) => {
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

  // 日付でソート
  const sortedWorkouts = [...filteredWorkouts].sort(
    (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
  );

  // よく行うワークアウトタイプを取得
  const frequentWorkoutTypes = useMemo(() => {
    const typeCounts = workouts.reduce((acc, workout) => {
      const workoutTypesInSets =
        workout.sets
          ?.map((set) => set.workoutType)
          .filter((type): type is string => Boolean(type)) || [];
      workoutTypesInSets.forEach((type) => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const sortedTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

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

  // ワークアウトタイプ別の分析
  const workoutTypeAnalysis = useMemo(() => {
    const typeCounts = workouts.reduce((acc, workout) => {
      const workoutTypesInSets =
        workout.sets
          ?.map((set) => set.workoutType)
          .filter((type): type is string => Boolean(type)) || [];
      workoutTypesInSets.forEach((type) => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => {
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

  const handleWorkoutTypeClick = (workoutType: string) => {
    if (selectedWorkoutType === workoutType) {
      setSelectedWorkoutType(null); // 同じものをクリックした場合は選択解除
    } else {
      setSelectedWorkoutType(workoutType);
    }
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">過去のトレーニング記録</Typography>
          {selectedWorkoutTypeInfo && (
            <Chip
              label={`${selectedWorkoutTypeInfo.muscleGroup} - ${selectedWorkoutTypeInfo.name}`}
              color="primary"
              variant="filled"
              size="small"
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
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
                  color={
                    selectedWorkoutType === type.name ? "primary" : "default"
                  }
                  onClick={() => handleWorkoutTypeClick(type.name)}
                  sx={{ cursor: "pointer" }}
                />
              ))}
            </Stack>
          </Box>

          {/* ワークアウトタイプ分析 */}
          {workoutTypeAnalysis.length > 1 && !selectedWorkoutTypeInfo && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                ワークアウトタイプ別分析
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mb: 2 }}
              >
                {workoutTypeAnalysis.map((type) => (
                  <Chip
                    key={type.name}
                    label={`${type.name} (${type.count}回)`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          {sortedWorkouts.length === 0 ? (
            <Typography color="text.secondary" textAlign="center">
              トレーニング記録がありません
            </Typography>
          ) : (
            sortedWorkouts.map((workout, index) => {
              const workoutType = workoutTypes.find(
                (wt) => wt.name === workout.name
              );
              const muscleGroup = workoutType
                ? muscleGroups.find((mg) => mg.id === workoutType.muscleGroupId)
                : null;

              const totalVolume = workout.sets.reduce(
                (sum, set) => sum + set.weight * set.reps,
                0
              );
              const maxWeight = Math.max(
                ...workout.sets.map((set) => set.weight)
              );

              return (
                <Accordion key={workout.id || index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography>
                          {format(workout.date.toDate(), "yyyy年M月d日 (E)", {
                            locale: ja,
                          })}
                        </Typography>
                        {workout.name && (
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              {workout.name}
                            </Typography>
                            {muscleGroup && (
                              <Chip
                                label={muscleGroup.name}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        )}
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="body2" color="text.secondary">
                          {workout.sets.length}セット
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          総挙上量: {totalVolume}kg
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          最高重量: {maxWeight}kg
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {workout.sets.map((set, setIndex) => (
                        <Paper key={setIndex} sx={{ p: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography variant="body1">
                              セット {setIndex + 1}: {set.weight}kg × {set.reps}
                              回
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ({(set.weight * set.reps).toLocaleString()}kg)
                            </Typography>
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
