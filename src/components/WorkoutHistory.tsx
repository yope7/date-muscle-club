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
      };
    }

    return {
      name: typeName,
      muscleGroup: "不明",
    };
  };

  // フィルタリングされたワークアウト
  const filteredWorkouts = useMemo(() => {
    if (!selectedWorkoutType) {
      return workouts;
    }

    // 選択されたワークアウトタイプを含むセットがあるワークアウトのみを返す
    return workouts.filter((workout) => {
      return workout.sets.some(
        (set) =>
          (set.workoutType || workout.name || "不明") === selectedWorkoutType
      );
    });
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
          ?.map((set) => set.workoutType || workout.name || "不明")
          .filter((type): type is string => Boolean(type)) || [];

      // デバッグ: セットデータの構造を確認
      console.log("Workout sets:", workout.sets);
      console.log("WorkoutTypesInSets:", workoutTypesInSets);

      workoutTypesInSets.forEach((type) => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const sortedTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return sortedTypes.map(([type, count]) => {
      const typeInfo = getWorkoutTypeInfo(type);
      return {
        name: type,
        count,
        muscleGroup: typeInfo.muscleGroup,
      };
    });
  }, [workouts]);

  // 選択されたワークアウトタイプの情報を取得
  const selectedWorkoutTypeInfo = useMemo(() => {
    if (!selectedWorkoutType) return null;
    return getWorkoutTypeInfo(selectedWorkoutType);
  }, [selectedWorkoutType]);

  // ワークアウトタイプ別の分析
  const workoutTypeAnalysis = useMemo(() => {
    const typeCounts = workouts.reduce((acc, workout) => {
      const workoutTypesInSets =
        workout.sets
          ?.map((set) => set.workoutType || workout.name || "不明")
          .filter((type): type is string => Boolean(type)) || [];
      workoutTypesInSets.forEach((type) => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => {
        const typeInfo = getWorkoutTypeInfo(type);
        return {
          name: type,
          count,
          muscleGroup: typeInfo.muscleGroup,
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
                  label={`${type.name} `}
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

          {sortedWorkouts.length === 0 ? (
            <Typography color="text.secondary" textAlign="center">
              トレーニング記録がありません
            </Typography>
          ) : (
            sortedWorkouts.map((workout, index) => {
              const workoutTypeInfo = getWorkoutTypeInfo(
                workout.name || "不明"
              );

              // 選択されたワークアウトタイプがある場合、そのセットのみをフィルタリング
              const filteredSets = selectedWorkoutType
                ? workout.sets.filter(
                    (set) =>
                      (set.workoutType || workout.name || "不明") ===
                      selectedWorkoutType
                  )
                : workout.sets;

              const totalVolume = filteredSets.reduce(
                (sum, set) => sum + set.weight * set.reps,
                0
              );
              const maxWeight = Math.max(
                ...filteredSets.map((set) => set.weight)
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
                        {workout.name && !selectedWorkoutType && (
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              {workout.name}
                            </Typography>
                            <Chip
                              label={workoutTypeInfo.muscleGroup}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        )}
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="body2" color="text.secondary">
                          {filteredSets.length}セット
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {/* 種目ごとにセットをグループ化 */}
                      {(() => {
                        const groupedByType = filteredSets.reduce(
                          (acc, set) => {
                            const type =
                              set.workoutType || workout.name || "不明";
                            if (!acc[type]) {
                              acc[type] = [];
                            }
                            acc[type].push(set);
                            return acc;
                          },
                          {} as Record<string, typeof filteredSets>
                        );

                        return Object.entries(groupedByType).map(
                          ([type, sets]) => (
                            <Box key={type}>
                              <Typography
                                variant="h6"
                                sx={{
                                  mb: 1,
                                  color: "primary.main",
                                  fontWeight: "bold",
                                  borderBottom: "2px solid",
                                  borderColor: "primary.main",
                                  pb: 0.5,
                                }}
                              >
                                {type}
                              </Typography>
                              <Stack spacing={1}>
                                {sets.map((set, setIndex) => {
                                  // デバッグ: 各セットの構造を確認
                                  console.log(`Set ${setIndex}:`, set);

                                  return (
                                    <Paper key={setIndex} sx={{ p: 2 }}>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                        }}
                                      >
                                        <Box>
                                          <Typography variant="body1">
                                            セット{setIndex + 1}：{set.weight}kg
                                            × {set.reps}回
                                          </Typography>
                                          {(set.workoutType ||
                                            workout.name) && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              種目:{" "}
                                              {set.workoutType || workout.name}
                                            </Typography>
                                          )}
                                        </Box>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          {/* ({(set.weight * set.reps).toLocaleString()}kg) */}
                                        </Typography>
                                      </Box>
                                    </Paper>
                                  );
                                })}
                              </Stack>
                            </Box>
                          )
                        );
                      })()}
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
