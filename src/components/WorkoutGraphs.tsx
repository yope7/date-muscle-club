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
            return {
              date: workout.date.toDate().toLocaleDateString("ja-JP"),
              totalSets: workout.sets.length,
              totalReps: workout.sets.reduce(
                (sum: number, set: any) => sum + set.reps,
                0
              ),
              maxWeight: Math.max(
                ...workout.sets.map((set: any) => set.weight)
              ),
              totalVolume: workout.sets.reduce(
                (sum: number, set: any) => sum + set.weight * set.reps,
                0
              ),
              workoutType: workout.name || "不明",
            };
          })
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
  }, [user, userId]);

  // フィルタリングされたグラフデータ
  const filteredWorkoutData = useMemo(() => {
    if (!selectedWorkoutType) {
      return workoutData;
    }
    return workoutData.filter(
      (data) => data.workoutType === selectedWorkoutType
    );
  }, [workoutData, selectedWorkoutType]);

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
        <LineChart data={filteredWorkoutData}>
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
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderWorkoutTypeChart = () => (
    <Box sx={{ height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={workoutTypeAnalysis}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
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
          <Bar dataKey="count" fill="#8884d8" name="実施回数" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="トレーニング記録"
        titleTypographyProps={{ variant: "h6" }}
        action={
          selectedWorkoutTypeInfo && (
            <Chip
              label={`${selectedWorkoutTypeInfo.muscleGroup} - ${selectedWorkoutTypeInfo.name}`}
              color="primary"
              variant="filled"
            />
          )
        }
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
          {workoutTypeAnalysis.length > 1 && <Tab label="ワークアウト別" />}
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        {renderGraph("totalSets", "#8884d8", "セット数")}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {renderGraph("totalReps", "#82ca9d", "レップ数")}
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        {renderGraph("maxWeight", "#ff7300", "最大重量")}
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        {renderGraph("totalVolume", "#ffc658", "総挙上量")}
      </TabPanel>
      {workoutTypeAnalysis.length > 1 && (
        <TabPanel value={tabValue} index={4}>
          {renderWorkoutTypeChart()}
        </TabPanel>
      )}
    </Card>
  );
};
