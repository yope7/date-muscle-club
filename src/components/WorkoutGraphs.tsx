import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { WorkoutRecord } from '@/types/workout';
import { format, subDays, subMonths, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type Period = '1week' | '1month' | '3months';

interface WorkoutGraphsProps {
  workouts: WorkoutRecord[];
}

export const WorkoutGraphs: React.FC<WorkoutGraphsProps> = ({ workouts }) => {
  const [period, setPeriod] = useState<Period>('1month');

  const filteredWorkouts = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1week':
        startDate = subDays(now, 7);
        break;
      case '1month':
        startDate = subMonths(now, 1);
        break;
      case '3months':
        startDate = subMonths(now, 3);
        break;
      default:
        return workouts;
    }

    const filtered = workouts.filter(workout => {
      const workoutDate = workout.date.toDate();
      if (!isValid(workoutDate)) {
        console.warn('Invalid date found:', workoutDate);
        return false;
      }
      return workoutDate >= startDate;
    }).sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

    return filtered;
  }, [workouts, period]);

  const chartData = useMemo(() => {
    const data = filteredWorkouts.map(workout => {
      const workoutDate = workout.date.toDate();
      if (!isValid(workoutDate)) {
        console.warn('Invalid date in chart data:', workoutDate);
        return null;
      }

      const maxWeight = Math.max(...workout.sets.map(set => set.weight));
      const totalVolume = workout.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
      const totalSets = workout.sets.length;
      const avgReps = workout.sets.reduce((sum, set) => sum + set.reps, 0) / totalSets;

      return {
        date: format(workoutDate, 'M/d', { locale: ja }),
        maxWeight,
        totalVolume,
        totalSets,
        avgReps
      };
    }).filter(Boolean);

    return data;
  }, [filteredWorkouts]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        トレーニンググラフ
      </Typography>

      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, value) => value && setPeriod(value)}
          size="small"
        >
          <ToggleButton value="1week">1週間</ToggleButton>
          <ToggleButton value="1month">1ヶ月</ToggleButton>
          <ToggleButton value="3months">3ヶ月</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>最高重量の推移</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="maxWeight"
              stroke="#8884d8"
              name="最高重量 (kg)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>総挙上量の推移</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalVolume"
              stroke="#82ca9d"
              name="総挙上量 (kg)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>セット数と平均回数</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalSets"
              stroke="#ffc658"
              name="セット数"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgReps"
              stroke="#ff8042"
              name="平均回数"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}; 