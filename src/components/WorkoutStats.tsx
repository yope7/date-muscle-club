import React from "react";
import { Box, Typography, Paper, Card, CardContent, IconButton } from "@mui/material";
import { WorkoutRecord } from "@/types/workout";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

interface WorkoutStatsProps {
  workouts: WorkoutRecord[];
}

export const WorkoutStats: React.FC<WorkoutStatsProps> = ({ workouts }) => {
  const totalWorkouts = workouts.length;
  const totalSets = workouts.reduce((sum, w) => sum + w.sets.length, 0);
  const totalReps = workouts.reduce(
    (sum, w) => sum + w.sets.reduce((setSum, set) => setSum + set.reps, 0),
    0
  );
  const maxWeight = Math.max(
    ...workouts.flatMap((w) => w.sets.map((s) => s.weight))
  );
  const totalVolume = workouts.reduce(
    (sum, w) => sum + w.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0),
    0
  );
  const avgWeight = totalSets > 0
    ? workouts.reduce((sum, w) => sum + w.sets.reduce((setSum, set) => setSum + set.weight, 0), 0) / totalSets
    : 0;
  const avgReps = totalSets > 0
    ? totalReps / totalSets
    : 0;
  const maxVolumeInOneDay = Math.max(
    ...workouts.map(w => w.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0))
  );

  const lastWorkout = workouts[0];
  const lastWorkoutDate = lastWorkout
    ? format(lastWorkout.date.toDate(), "yyyy年M月d日", { locale: ja })
    : "なし";

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

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left: currentScroll + (direction === 'left' ? -scrollAmount : scrollAmount),
        behavior: 'smooth'
      });
    }
  };

  return (
    <Box sx={{ position: 'relative', mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        トレーニング統計
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={() => handleScroll('left')}
          sx={{
            position: 'absolute',
            left: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'background.paper' }
          }}
        >
          <ChevronLeft />
        </IconButton>
        <Box
          ref={scrollContainerRef}
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            px: 1,
          }}
        >
          {stats.map((stat, index) => (
            <Card
              key={index}
              sx={{
                minWidth: 200,
                flexShrink: 0,
                bgcolor: 'background.paper',
                boxShadow: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CardContent sx={{ textAlign: 'center', width: '100%' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography variant="h4" component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          onClick={() => handleScroll('right')}
          sx={{
            position: 'absolute',
            right: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'background.paper' }
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
