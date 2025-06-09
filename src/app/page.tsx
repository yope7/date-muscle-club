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

export default function Home() {
  const { user, signOut } = useAuth();
  const { selectedDate, workouts } = useWorkoutStore();
  const { isDrawerOpen } = useDrawerStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localWorkouts, setLocalWorkouts] = useState<WorkoutRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }
      if (activeTab === 0) {
        setActiveTab(1);
      }
    },
    onSwipedRight: () => {
      if (activeTab === 0 && !isSettingsOpen) {
        setIsSettingsOpen(true);
      } else if (activeTab === 1) {
        setActiveTab(0);
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
        p: 2,
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          mb: 2,
          "& .MuiTab-root": {
            fontSize: "1rem",
            fontWeight: "bold",
            minHeight: 48,
          },
          "& .Mui-selected": {
            color: "primary.main",
          },
        }}
        variant="fullWidth"
      >
        <Tab label="カレンダー" />
        <Tab label="フィード" />
      </Tabs>

      <Box
        {...handlers}
        sx={{
          position: "relative",
          minHeight: "calc(100vh - 120px)",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Slide
          direction="right"
          in={activeTab === 0}
          mountOnEnter
          unmountOnExit
        >
          <Box
            role="tabpanel"
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 3,
              position: "absolute",
              width: "100%",
              left: 0,
              right: 0,
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
                  <WorkoutSets
                    workout={selectedWorkout}
                    onDelete={handleDelete}
                  />
                ) : (
                  <Typography color="text.secondary">
                    記録はありません
                  </Typography>
                )}
              </Paper>
            </Box>
          </Box>
        </Slide>

        <Slide direction="left" in={activeTab === 1} mountOnEnter unmountOnExit>
          <Box
            role="tabpanel"
            sx={{
              position: "absolute",
              width: "100%",
              left: 0,
              right: 0,
            }}
          >
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                フィード
              </Typography>
              <Feed workouts={localWorkouts} />
            </Paper>
          </Box>
        </Slide>
      </Box>

      <SwipeableDrawer
        anchor="left"
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpen={() => setIsSettingsOpen(true)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 280,
            zIndex: 1200,
          },
        }}
      >
        <List>
          {user && (
            <>
              <Link
                href="/mypage"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <ListItemButton onClick={() => setIsSettingsOpen(false)}>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={user.displayName || user.email}
                    secondary="ログイン中"
                  />
                </ListItemButton>
              </Link>
              <Divider />
              <Typography variant="overline" sx={{ px: 2, py: 1 }}>
                設定
              </Typography>
              <ListItemButton
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsFormOpen(true);
                }}
              >
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="表示設定" />
              </ListItemButton>
              <ListItemButton>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText primary="通知設定" />
              </ListItemButton>
              <ListItemButton>
                <ListItemIcon>
                  <PaletteIcon />
                </ListItemIcon>
                <ListItemText primary="テーマ設定" />
              </ListItemButton>
              <ListItemButton>
                <ListItemIcon>
                  <LanguageIcon />
                </ListItemIcon>
                <ListItemText primary="言語設定" />
              </ListItemButton>
              <Divider />
              <Typography variant="overline" sx={{ px: 2, py: 1 }}>
                その他
              </Typography>
              <ListItemButton>
                <ListItemIcon>
                  <HelpIcon />
                </ListItemIcon>
                <ListItemText primary="ヘルプ" />
              </ListItemButton>
              <ListItemButton>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText primary="アプリについて" />
              </ListItemButton>
              <Divider />
              <ListItemButton onClick={signOut}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="ログアウト" />
              </ListItemButton>
            </>
          )}
        </List>
      </SwipeableDrawer>

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
