import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Grid,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  Stack,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WorkoutRecord } from "@/types/workout";
import { workoutTypes, muscleGroups } from "@/data/workoutTypes";
import { format } from "date-fns";

interface WorkoutGraphsProps {
  userId?: string;
  workouts: WorkoutRecord[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workout-tabpanel-${index}`}
      aria-labelledby={`workout-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const WorkoutGraphs: React.FC<WorkoutGraphsProps> = ({
  userId,
  workouts,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutData, setWorkoutData] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState(0);
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

  // よく行うワークアウトタイプを取得
  const frequentWorkoutTypes = useMemo(() => {
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

  // 筋肉グループ別の分析
  const muscleGroupAnalysis = useMemo(() => {
    const groupCounts = workouts.reduce((acc, workout) => {
      const workoutTypesInSets =
        workout.sets
          ?.map((set) => set.workoutType || workout.name || "不明")
          .filter((type): type is string => Boolean(type)) || [];
      workoutTypesInSets.forEach((type) => {
        const typeInfo = getWorkoutTypeInfo(type);
        const muscleGroup = typeInfo.muscleGroup;
        acc[muscleGroup] = (acc[muscleGroup] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(groupCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([group, count]) => ({ group, count }));
  }, [workouts]);

  // 月別のワークアウト回数
  const monthlyWorkouts = useMemo(() => {
    const monthlyData = workouts.reduce((acc, workout) => {
      const month = format(workout.date.toDate(), "yyyy-MM");
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: format(new Date(month + "-01"), "M月"),
        count,
      }));
  }, [workouts]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const targetUserId = userId || user.uid;
    const workoutsQuery = query(
      collection(db, "users", targetUserId, "workouts"),
      orderBy("date", "desc"),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      workoutsQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => {
            const workout = doc.data();

            // 選択されたワークアウトタイプに基づいてフィルタリング
            let filteredSets = workout.sets;
            if (selectedWorkoutType) {
              filteredSets = workout.sets.filter(
                (set: any) =>
                  (set.workoutType || workout.name || "不明") ===
                  selectedWorkoutType
              );
            }

            // フィルタリングされたセットが存在する場合のみデータを返す
            if (filteredSets.length === 0) {
              return null;
            }

            return {
              date: workout.date.toDate().toLocaleDateString("ja-JP"),
              totalSets: filteredSets.length,
              totalReps: filteredSets.reduce(
                (sum: number, set: any) => sum + set.reps,
                0
              ),
              maxWeight: Math.max(
                ...filteredSets.map((set: any) => set.weight)
              ),
              totalVolume: filteredSets.reduce(
                (sum: number, set: any) => sum + set.weight * set.reps,
                0
              ),
              workoutType: selectedWorkoutType || workout.name || "不明",
            };
          })
          .filter(Boolean) // null値を除外
          .reverse();

        setWorkoutData(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching workouts:", err);
        setError("トレーニングデータの取得に失敗しました");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, userId, selectedWorkoutType]); // selectedWorkoutTypeを依存配列に追加

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleWorkoutTypeClick = (workoutType: string) => {
    if (selectedWorkoutType === workoutType) {
      setSelectedWorkoutType(null); // 同じものをクリックした場合は選択解除
    } else {
      setSelectedWorkoutType(workoutType);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (workoutData.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          トレーニングデータがありません
        </Typography>
      </Box>
    );
  }

  const renderGraph = (dataKey: string, color: string, name: string) => (
    <Box sx={{ height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={workoutData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.split("/").slice(1).join("/")}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            name={name}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            animationBegin={0}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderWorkoutTypeChart = () => (
    <Box sx={{ height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={muscleGroupAnalysis}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="group"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          />
          <Legend />
          <Bar
            dataKey="count"
            fill="#8884d8"
            name="実施回数"
            animationBegin={0}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="トレーニング記録"
        titleTypographyProps={{ variant: "h6" }}
      />
      <Divider />

      {/* よく行うワークアウトタイプの一覧 */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
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
              label={`${type.name}`}
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

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="workout tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="セット数" />
          <Tab label="レップ数" />
          <Tab label="最大重量" />
          <Tab label="総挙上量" />
          {muscleGroupAnalysis.length > 1 && <Tab label="ワークアウト別" />}
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <Box key={`sets-${selectedWorkoutType || "all"}`}>
          {renderGraph("totalSets", "#8884d8", "セット数")}
        </Box>
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <Box key={`reps-${selectedWorkoutType || "all"}`}>
          {renderGraph("totalReps", "#82ca9d", "レップ数")}
        </Box>
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <Box key={`weight-${selectedWorkoutType || "all"}`}>
          {renderGraph("maxWeight", "#ff7300", "最大重量")}
        </Box>
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <Box key={`volume-${selectedWorkoutType || "all"}`}>
          {renderGraph("totalVolume", "#ffc658", "総挙上量")}
        </Box>
      </TabPanel>
      {muscleGroupAnalysis.length > 1 && (
        <TabPanel value={tabValue} index={4}>
          <Box key={`workout-type-${selectedWorkoutType || "all"}`}>
            {renderWorkoutTypeChart()}
          </Box>
        </TabPanel>
      )}
    </Card>
  );
};
