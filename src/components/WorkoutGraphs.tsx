import React, { useEffect, useState, useMemo, useCallback } from "react";
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

  // ワークアウトタイプの情報を取得するヘルパー関数（メモ化）
  const getWorkoutTypeInfo = useCallback((typeName: string) => {
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
  }, []);

  // ワークアウトデータのハッシュを生成（メモ化の依存関係として使用）
  const workoutsHash = useMemo(() => {
    if (workouts.length === 0) return "empty";
    return workouts.map((w) => `${w.id}-${w.updatedAt.toMillis()}`).join(",");
  }, [workouts]);

  // よく行うワークアウトタイプを取得（最適化版）
  const frequentWorkoutTypes = useMemo(() => {
    if (workouts.length === 0) return [];

    const typeCounts = new Map<string, number>();

    // 最適化された計算：一度のループでカウント
    for (const workout of workouts) {
      for (const set of workout.sets) {
        const type = set.workoutType || workout.name || "不明";
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
    }

    // 上位5つを取得
    const sortedTypes = Array.from(typeCounts.entries())
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
  }, [workouts, getWorkoutTypeInfo]);

  // 筋肉グループ別の分析（最適化版）
  const muscleGroupAnalysis = useMemo(() => {
    if (workouts.length === 0) return [];

    const groupCounts = new Map<string, number>();

    // 最適化された計算
    for (const workout of workouts) {
      for (const set of workout.sets) {
        const type = set.workoutType || workout.name || "不明";
        const typeInfo = getWorkoutTypeInfo(type);
        const muscleGroup = typeInfo.muscleGroup;
        groupCounts.set(muscleGroup, (groupCounts.get(muscleGroup) || 0) + 1);
      }
    }

    return Array.from(groupCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([group, count]) => ({ group, count }));
  }, [workouts, getWorkoutTypeInfo]);

  // 月別のワークアウト回数（最適化版）
  const monthlyWorkouts = useMemo(() => {
    if (workouts.length === 0) return [];

    const monthlyData = new Map<string, number>();

    // 最適化された計算
    for (const workout of workouts) {
      const month = format(workout.date.toDate(), "yyyy-MM");
      monthlyData.set(month, (monthlyData.get(month) || 0) + 1);
    }

    return Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: format(new Date(month + "-01"), "M月"),
        count,
      }));
  }, [workouts]);

  // 選択されたワークアウトタイプのハッシュ
  const selectedWorkoutTypeHash = useMemo(() => {
    return selectedWorkoutType || "none";
  }, [selectedWorkoutType]);

  // グラフデータの計算（最適化版）
  const processedGraphData = useMemo(() => {
    if (workouts.length === 0) return [];

    const rawData = workouts
      .map((workout) => {
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
          date: workout.date.toDate(),
          totalSets: filteredSets.length,
          totalReps: filteredSets.reduce(
            (sum: number, set: any) => sum + set.reps,
            0
          ),
          maxWeight: Math.max(...filteredSets.map((set: any) => set.weight)),
          totalVolume: filteredSets.reduce(
            (sum: number, set: any) => sum + set.weight * set.reps,
            0
          ),
          workoutType: selectedWorkoutType || workout.name || "不明",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // 最大重量を単調増加にする（各時点での最高重量を計算）
    let currentMaxWeight = 0;
    return rawData.map((item) => {
      currentMaxWeight = Math.max(currentMaxWeight, item.maxWeight);
      return {
        ...item,
        date: item.date.toLocaleDateString("ja-JP"),
        maxWeight: currentMaxWeight, // 現在までの最高重量
      };
    });
  }, [workouts, selectedWorkoutTypeHash]);

  // データ取得の最適化
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
        // データ処理はprocessedGraphDataで行うため、ここでは最小限の処理のみ
        setWorkoutData(processedGraphData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching workouts:", err);
        setError("トレーニングデータの取得に失敗しました");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, userId, processedGraphData]);

  // タブ変更ハンドラー（メモ化）
  const handleTabChange = useCallback(
    (event: React.SyntheticEvent, newValue: number) => {
      setTabValue(newValue);
    },
    []
  );

  // ワークアウトタイプクリックハンドラー（メモ化）
  const handleWorkoutTypeClick = useCallback((workoutType: string) => {
    setSelectedWorkoutType((prev) =>
      prev === workoutType ? null : workoutType
    );
  }, []);

  // グラフレンダリング関数（メモ化）
  const renderGraph = useCallback(
    (dataKey: string, color: string, name: string) => (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={workoutData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            name={name}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    ),
    [workoutData]
  );

  // ワークアウトタイプチャートのレンダリング（メモ化）
  const renderWorkoutTypeChart = useCallback(
    () => (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={frequentWorkoutTypes}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" name="回数" />
        </BarChart>
      </ResponsiveContainer>
    ),
    [frequentWorkoutTypes]
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        トレーニング分析
      </Typography>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="進捗グラフ" />
        <Tab label="ワークアウト別" />
        <Tab label="筋肉グループ別" />
        <Tab label="月別統計" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          <Card>
            <CardHeader title="最大重量の推移" />
            <CardContent>
              {renderGraph("maxWeight", "#ff7300", "最大重量 (kg)")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="総ボリュームの推移" />
            <CardContent>
              {renderGraph("totalVolume", "#82ca9d", "総ボリューム (kg)")}
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            よく行うワークアウト
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {frequentWorkoutTypes.map((type) => (
              <Chip
                key={type.name}
                label={`${type.name} (${type.count}回)`}
                onClick={() => handleWorkoutTypeClick(type.name)}
                color={
                  selectedWorkoutType === type.name ? "primary" : "default"
                }
                sx={{ m: 0.5 }}
              />
            ))}
          </Stack>
        </Box>
        {renderWorkoutTypeChart()}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={muscleGroupAnalysis}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="group" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#82ca9d" name="回数" />
          </BarChart>
        </ResponsiveContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyWorkouts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="月別回数" />
          </BarChart>
        </ResponsiveContainer>
      </TabPanel>
    </Paper>
  );
};
