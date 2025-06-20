import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import {
  muscleGroups,
  workoutTypes,
  MuscleGroup,
  WorkoutType,
} from "@/data/workoutTypes";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
interface WorkoutTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (workoutType: WorkoutType) => void;
}

export const WorkoutTypeSelector: React.FC<WorkoutTypeSelectorProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const [selectedMuscleGroup, setSelectedMuscleGroup] =
    useState<MuscleGroup | null>(null);

  const handleMuscleGroupSelect = (muscleGroup: MuscleGroup) => {
    setSelectedMuscleGroup(muscleGroup);
  };

  const handleWorkoutTypeSelect = (workoutType: WorkoutType) => {
    onSelect(workoutType);
    onClose();
  };

  const filteredWorkoutTypes = selectedMuscleGroup
    ? workoutTypes.filter(
        (type) => type.muscleGroupId === selectedMuscleGroup.id
      )
    : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* 戻るボタンを実装 */}
      <DialogTitle>
        {selectedMuscleGroup ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              onClick={() => setSelectedMuscleGroup(null)}
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
            種目を選択
          </Box>
        ) : (
          "鍛える部位を選択"
        )}
      </DialogTitle>
      <DialogContent>
        {!selectedMuscleGroup ? (
          <Grid container spacing={2}>
            {muscleGroups.map((group) => (
              <Grid item xs={4} key={group.id}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  onClick={() => handleMuscleGroupSelect(group)}
                >
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    {group.icon}
                  </Typography>
                  <Typography variant="body1">{group.name}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2}>
            {filteredWorkoutTypes.map((type) => (
              <Grid item xs={4} key={type.id}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  onClick={() => handleWorkoutTypeSelect(type)}
                >
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    {type.icon}
                  </Typography>
                  <Typography variant="body1">{type.name}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};
