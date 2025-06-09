import React, { useEffect, useState } from "react";
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

interface WorkoutGraphsProps {
  userId?: string;
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

export const WorkoutGraphs: React.FC<WorkoutGraphsProps> = ({ userId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutData, setWorkoutData] = useState<any[]>([]);
  const [tabValue, setTabValue] = useState(0);

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
          />
        </LineChart>
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
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="workout tabs"
          variant="fullWidth"
        >
          <Tab label="セット数" />
          <Tab label="レップ数" />
          <Tab label="最大重量" />
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
    </Card>
  );
};
