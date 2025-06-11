import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Paper,
  Stack,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { WorkoutRecord } from "@/types/workout";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface WorkoutHistoryProps {
  workouts: WorkoutRecord[];
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ workouts }) => {
  // 日付でソート
  const sortedWorkouts = [...workouts].sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">
          過去のトレーニング記録
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
          {sortedWorkouts.map((workout, index) => (
            <Accordion key={workout.id || index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography>
                    {format(workout.date.toDate(), "yyyy年M月d日 (E)", { locale: ja })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {workout.sets.length}セット
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {workout.sets.map((set, setIndex) => (
                    <Paper key={setIndex} sx={{ p: 2 }}>
                      <Typography variant="body1">
                        セット {setIndex + 1}: {set.weight}kg × {set.reps}回
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}; 