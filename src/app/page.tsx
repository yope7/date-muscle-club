"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogContent,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WorkoutRecord } from "@/types/workout";
import { WorkoutSets } from "@/components/WorkoutSets";
import WorkoutForm from "@/components/WorkoutForm";
import { Calendar } from "@/components/Calendar";
import { useWorkoutStore } from "@/store/workoutStore";
import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Add as AddIcon } from "@mui/icons-material";
import { useDrawerStore } from "@/store/drawerStore";

export default function Home() {
  const { user } = useAuth();
  const { selectedDate, workouts } = useWorkoutStore();
  const { isDrawerOpen } = useDrawerStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localWorkouts, setLocalWorkouts] = useState<WorkoutRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "workouts"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const workoutData: WorkoutRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          workoutData.push({
            id: doc.id,
            userId: data.userId,
            date: data.date,
            sets: data.sets,
            memo: data.memo || "",
            tags: data.tags || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setLocalWorkouts(workoutData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching workouts:", error);
        setError("データの取得中にエラーが発生しました");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const selectedWorkout = selectedDate
    ? localWorkouts.find((w) => {
        const workoutDate = w.date.toDate();
        return isSameDay(workoutDate, selectedDate);
      })
    : null;

  const handleDelete = async (workout: WorkoutRecord) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "workouts", workout.id));
    } catch (error) {
      console.error("Error deleting workout:", error);
      setError("削除中にエラーが発生しました");
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          ログインが必要です
        </Typography>
      </Box>
    );
  }

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
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Calendar isDrawerOpen={isDrawerOpen} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {selectedDate
                ? format(selectedDate, "yyyy年M月d日", { locale: ja })
                : "日付を選択してください"}
            </Typography>
            {selectedDate && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={() => setIsFormOpen(true)}
                  aria-label="セットを追加"
                >
                  セットを追加
                </Button>
              </Box>
            )}
            {selectedWorkout ? (
              <WorkoutSets workout={selectedWorkout} onDelete={handleDelete} />
            ) : (
              <Typography color="text.secondary">記録はありません</Typography>
            )}
          </Paper>
        </Box>
      </Box>

      <Dialog
        fullScreen={isMobile}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        disablePortal={false}
        aria-labelledby="workout-form-title"
      >
        <DialogContent sx={{ p: 0 }}>
          <WorkoutForm onComplete={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
