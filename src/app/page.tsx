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
import SwipeableViews from "react-swipeable-views";

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export default function Home() {
  const { user, signOut } = useAuth();
  const { workouts, fetchWorkouts, selectedDate } = useWorkoutStore();
  const { isDrawerOpen } = useDrawerStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localWorkouts, setLocalWorkouts] = useState<WorkoutRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [value, setValue] = useState(0);
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

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index: number) => {
    setValue(index);
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <SettingsDrawer open={isDrawerOpen} onClose={() => {}} />
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              minWidth: 0,
              flex: 1,
            },
          }}
        >
          <Tab label="カレンダー" />
          <Tab label="フィード" />
          <Tab label="マイページ" />
        </Tabs>
      </Box>
      <SwipeableViews
        axis={theme.direction === "rtl" ? "x-reverse" : "x"}
        index={value}
        onChangeIndex={handleChangeIndex}
        enableMouseEvents
        resistance
        hysteresis={0.3}
        // style={{ touchAction: "pan-y" }}
      >
        <TabPanel value={value} index={0}>
          <Calendar isDrawerOpen={isDrawerOpen} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <Feed
            workouts={workouts}
            onRefresh={async () => {
              if (user) {
                await fetchWorkouts(user.uid);
              }
            }}
          />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <MyPage />
        </TabPanel>
      </SwipeableViews>

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
