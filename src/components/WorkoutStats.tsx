import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { WorkoutRecord } from '@/types/workout';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface WorkoutStatsProps {
  workouts: WorkoutRecord[];
}

export const WorkoutStats: React.FC<WorkoutStatsProps> = ({ workouts }) => {
  const totalWorkouts = workouts.length;
  const totalSets = workouts.reduce((sum, w) => sum + w.sets.length, 0);
  const totalReps = workouts.reduce((sum, w) => 
    sum + w.sets.reduce((setSum, set) => setSum + set.reps, 0), 0
  );
  const maxWeight = Math.max(...workouts.flatMap(w => w.sets.map(s => s.weight)));

  const lastWorkout = workouts[0];
  const lastWorkoutDate = lastWorkout 
    ? format(lastWorkout.date.toDate(), 'yyyy年M月d日', { locale: ja })
    : 'なし';

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        トレーニング統計
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        gap: 2 
      }}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            総トレーニング回数
          </Typography>
          <Typography variant="h4">
            {totalWorkouts}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            総セット数
          </Typography>
          <Typography variant="h4">
            {totalSets}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            総レップ数
          </Typography>
          <Typography variant="h4">
            {totalReps}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            最高重量
          </Typography>
          <Typography variant="h4">
            {maxWeight}kg
          </Typography>
        </Paper>
      </Box>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          最終トレーニング: {lastWorkoutDate}
        </Typography>
      </Box>
    </Box>
  );
}; 