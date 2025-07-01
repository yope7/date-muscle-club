import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Slide,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  muscleGroups,
  workoutTypes,
  MuscleGroup,
  WorkoutType,
} from "@/data/workoutTypes";
import { gymLayout, muscleGroupColors, GymMachine } from "@/data/gymLayout";
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedMuscleGroup, setSelectedMuscleGroup] =
    useState<MuscleGroup | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const dialogPaperRef = useRef<HTMLDivElement>(null);

  const [dialogHeight, setDialogHeight] = useState<string | number>("auto");
  const [mapRenderDimensions, setMapRenderDimensions] = useState({
    width: 0,
    height: 0,
    scale: 1,
  });

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setSelectedMuscleGroup(null);
    }, 300); // Wait for animation to finish
  }, [onClose]);

  const handleMuscleGroupSelect = (muscleGroup: MuscleGroup) => {
    setSelectedMuscleGroup(muscleGroup);
  };

  const handleWorkoutTypeSelect = (workoutType: WorkoutType) => {
    onSelect(workoutType);
    handleClose();
  };

  const handleMachineClick = (machine: GymMachine) => {
    if (machine.isMultiSelect) {
      // 複数選択可能なマシンの場合、そのマシンに関連する種目を直接表示
      const relatedWorkoutTypes = workoutTypes.filter(
        (type) => type.gymMachineId === machine.id
      );

      if (relatedWorkoutTypes.length > 0) {
        // 複数の種目がある場合は、最初の種目の筋肉グループを選択して種目選択画面を表示
        const firstWorkoutType = relatedWorkoutTypes[0];
        const muscleGroup = muscleGroups.find(
          (group) => group.id === firstWorkoutType.muscleGroupId
        );
        if (muscleGroup) {
          setSelectedMuscleGroup(muscleGroup);
        }
      }
      return;
    }

    const workoutType = workoutTypes.find(
      (type) => type.gymMachineId === machine.id
    );
    if (workoutType) {
      handleWorkoutTypeSelect(workoutType);
    } else {
      const muscleGroup = muscleGroups.find(
        (group) => group.id === machine.muscleGroupId
      );
      if (muscleGroup) {
        setSelectedMuscleGroup(muscleGroup);
      }
    }
  };

  const filteredWorkoutTypes = selectedMuscleGroup
    ? workoutTypes.filter((type) => {
        // 筋肉グループでフィルタリング
        const matchesMuscleGroup =
          type.muscleGroupId === selectedMuscleGroup.id;

        // 複数選択可能なマシンの場合、そのマシンに関連する種目も含める
        const isMultiSelectMachine = gymLayout.machines.find(
          (machine) =>
            machine.isMultiSelect &&
            machine.muscleGroupId === selectedMuscleGroup.id
        );

        if (isMultiSelectMachine) {
          return (
            matchesMuscleGroup || type.gymMachineId === isMultiSelectMachine.id
          );
        }

        return matchesMuscleGroup;
      })
    : [];

  const updateDimensions = useCallback(() => {
    if (!dialogPaperRef.current) return;

    const paperWidth = dialogPaperRef.current.clientWidth;

    const horizontalPadding = isMobile ? 16 : 32;
    const contentWidth = paperWidth - horizontalPadding;
    const titleHeight = isMobile ? 100 : 110;
    const verticalPadding = isMobile ? 16 : 32;

    if (contentWidth <= 0) return;

    const availableHeight =
      window.innerHeight * 0.95 - titleHeight - verticalPadding;
    const scaleByHeight = availableHeight / gymLayout.height;
    const scaleByWidth = contentWidth / gymLayout.width;
    const scale = Math.min(scaleByHeight, scaleByWidth);

    const scaledMapWidth = gymLayout.width * scale;
    const scaledMapHeight = gymLayout.height * scale;

    setMapRenderDimensions({
      width: scaledMapWidth,
      height: scaledMapHeight,
      scale: scale,
    });

    const totalHeight = scaledMapHeight + titleHeight + verticalPadding;

    const maxHeight = window.innerHeight * 0.95;
    setDialogHeight(Math.min(totalHeight, maxHeight));
  }, [isMobile]);

  useEffect(() => {
    if (open && viewMode === "map" && !selectedMuscleGroup) {
      window.addEventListener("resize", updateDimensions);
      return () => {
        window.removeEventListener("resize", updateDimensions);
      };
    }
  }, [open, viewMode, selectedMuscleGroup, updateDimensions]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setDialogHeight("auto");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        ref: dialogPaperRef,
        sx: {
          height:
            viewMode === "map" ? dialogHeight : isMobile ? "90vh" : "80vh",
          maxHeight: "95vh",
          transition: "height 0.3s ease-in-out",
          // bgcolor: "#263238", // Chic dark color
          color: "#FFFFFF", // Light text color for contrast
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, px: isMobile ? 2 : 3 }}>
        <Slide
          direction="right"
          in={!selectedMuscleGroup}
          mountOnEnter
          unmountOnExit
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              鍛える部位を選択
            </Typography>
            <Tabs
              value={viewMode}
              onChange={(_, newValue) => setViewMode(newValue)}
              textColor="inherit"
              indicatorColor="primary"
              sx={{
                minHeight: 40,
                "& .MuiTabs-indicator": {
                  backgroundColor: "#80DEEA",
                },
              }}
              variant={isMobile ? "fullWidth" : "standard"}
            >
              <Tab label="ジムマップ" value="map" />
              <Tab label="リスト" value="list" />
            </Tabs>
          </Box>
        </Slide>
        <Slide
          direction="left"
          in={!!selectedMuscleGroup}
          mountOnEnter
          unmountOnExit
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              onClick={() => setSelectedMuscleGroup(null)}
              sx={{ mr: 2, color: "inherit" }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">
              {selectedMuscleGroup?.name}の種目を選択
            </Typography>
          </Box>
        </Slide>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        <Box sx={{ position: "relative", height: "100%" }}>
          {/* 筋肉グループ選択画面 */}
          <Slide
            direction="right"
            in={!selectedMuscleGroup}
            mountOnEnter
            unmountOnExit
            onEntered={updateDimensions}
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: "hidden",
              }}
            >
              {viewMode === "map" ? (
                // ジムマップ表示
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    p: isMobile ? 1 : 2,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      width: mapRenderDimensions.width,
                      height: mapRenderDimensions.height,
                      bgcolor: "#333333", // Slightly lighter dark color for the map
                      borderRadius: 2,
                      boxShadow: "inset 0 0 10px rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* マシンの配置 */}
                    {gymLayout.machines.map((machine) => {
                      const scaledX =
                        machine.position.x * mapRenderDimensions.scale;
                      const scaledY =
                        machine.position.y * mapRenderDimensions.scale;
                      const scaledWidth =
                        machine.position.width * mapRenderDimensions.scale;
                      const scaledHeight =
                        machine.position.height * mapRenderDimensions.scale;

                      const fontSize = Math.max(
                        Math.min(
                          scaledWidth / 8,
                          scaledHeight / 3,
                          isMobile ? 11 : 16
                        ),
                        isMobile ? 7 : 9
                      );

                      return (
                        <Box
                          key={machine.id}
                          onClick={() => handleMachineClick(machine)}
                          sx={{
                            position: "absolute",
                            left: scaledX,
                            top: scaledY,
                            width: scaledWidth,
                            height: scaledHeight,
                            bgcolor: machine.color,
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            "&:hover": {
                              transform: "scale(1.05)",
                              boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: `${fontSize}px`,
                              textAlign: "center",
                              color: "white",
                              fontWeight: "bold",
                              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                              lineHeight: 1.1,
                              p: 0.5,
                              wordBreak: "break-word",
                            }}
                          >
                            {machine.name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ) : (
                // リスト表示
                <List sx={{ p: 0 }}>
                  {muscleGroups.map((group, index) => (
                    <ListItem disablePadding key={group.id}>
                      <ListItemButton
                        onClick={() => handleMuscleGroupSelect(group)}
                        sx={{
                          py: 2,
                          px: isMobile ? 2 : 3,
                          transition: "all 0.2s ease",
                          animationDelay: `${index * 100}ms`,
                          animation: "fadeIn 0.3s ease forwards",
                          opacity: 0,
                          "&:hover": {
                            bgcolor: "rgba(255, 255, 255, 0.08)",
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 500, color: "inherit" }}
                            >
                              {group.name}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                            >
                              {
                                workoutTypes.filter(
                                  (w) => w.muscleGroupId === group.id
                                ).length
                              }
                              種目のワークアウト
                            </Typography>
                          }
                        />
                      </ListItemButton>
                      {index < muscleGroups.length - 1 && (
                        <Divider
                          sx={{ bgcolor: "rgba(255, 255, 255, 0.12)" }}
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Slide>

          {/* 種目選択画面 */}
          <Slide
            direction="left"
            in={!!selectedMuscleGroup}
            mountOnEnter
            unmountOnExit
          >
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: "auto",
              }}
            >
              <List sx={{ p: 0 }}>
                {filteredWorkoutTypes.map((type, index) => (
                  <ListItem disablePadding key={type.id}>
                    <ListItemButton
                      onClick={() => handleWorkoutTypeSelect(type)}
                      sx={{
                        py: 2,
                        px: isMobile ? 2 : 3,
                        transition: "all 0.2s ease",
                        animationDelay: `${index * 50}ms`,
                        animation: "fadeIn 0.2s ease forwards",
                        opacity: 0,
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.08)",
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 500, color: "inherit" }}
                          >
                            {type.name}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                          >
                            この種目を選択
                          </Typography>
                        }
                      />
                    </ListItemButton>
                    {index < filteredWorkoutTypes.length - 1 && (
                      <Divider sx={{ bgcolor: "rgba(255, 255, 255, 0.12)" }} />
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          </Slide>
        </Box>
      </DialogContent>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Dialog>
  );
};
