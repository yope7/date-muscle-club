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
  Tabs,
  Tab,
  Slide,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  ListItemButton,
  IconButton,
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
import { Feed } from "@/components/Feed";
import { useSwipeable } from "react-swipeable";
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { useUserStore } from "@/store/userStore";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { MyPage } from "@/components/MyPage";

export default function Home() {
  const { user, signOut } = useAuth();
  const { workouts, fetchWorkouts, selectedDate } = useWorkoutStore();
  const { isDrawerOpen } = useDrawerStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localWorkouts, setLocalWorkouts] = useState<WorkoutRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { profile, fetchProfile, friends } = useUserStore();

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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchProfile(user.uid);
    fetchWorkouts(user.uid);
  }, [user, fetchProfile, fetchWorkouts]);

  useEffect(() => {
    // コンソール出力を削除
  }, [friends, profile, user]);

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

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }
      if (activeTab < 2) {
        setActiveTab(activeTab + 1);
      }
    },
    onSwipedRight: () => {
      if (activeTab === 0 && !isSettingsOpen) {
        setIsSettingsOpen(true);
      } else if (activeTab > 0) {
        setActiveTab(activeTab - 1);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 10,
    swipeDuration: 500,
    touchEventOptions: { passive: false },
  });

  // 設定メニューの状態をグローバルに管理
  useEffect(() => {
    if (isSettingsOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isSettingsOpen]);

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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Box
        {...handlers}
        sx={{
          position: "relative",
          minHeight: "calc(100vh - 120px)",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tab label="カレンダー" />
          <Tab label="フィード" />
          <Tab label="マイページ" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === 0 ? (
            <Calendar />
          ) : activeTab === 1 ? (
            <Feed workouts={workouts} />
          ) : (
            <MyPage />
          )}
        </Box>
      </Box>

      <SettingsDrawer
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

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
