'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tabs, Tab, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WorkoutRecord } from '@/types/workout';
import { WorkoutStats } from '@/components/WorkoutStats';
import { WorkoutGraphs } from '@/components/WorkoutGraphs';
import { FriendsList } from '@/components/FriendsList';
import { InviteFriend } from '@/components/InviteFriend';
import { useWorkoutStore } from '@/store/workoutStore';
import { Delete as DeleteIcon } from '@mui/icons-material';

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function MyPage() {
  const { user } = useAuth();
  const { resetData } = useWorkoutStore();
  const [value, setValue] = React.useState(0);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleResetClick = () => {
    setIsResetDialogOpen(true);
  };

  const handleResetConfirm = async () => {
    await resetData();
    setIsResetDialogOpen(false);
  };

  const handleResetCancel = () => {
    setIsResetDialogOpen(false);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'workouts'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workoutData: WorkoutRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        workoutData.push({
          id: doc.id,
          userId: data.userId,
          date: data.date,
          sets: data.sets,
          memo: data.memo || '',
          tags: data.tags || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      setWorkouts(workoutData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching workouts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          マイページ
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleResetClick}
            disabled={loading}
          >
            データをリセット
          </Button>
          <InviteFriend />
        </Box>
      </Box>

      <Dialog
        open={isResetDialogOpen}
        onClose={handleResetCancel}
      >
        <DialogTitle>データのリセット</DialogTitle>
        <DialogContent>
          <Typography>
            すべてのトレーニング記録が削除されます。この操作は取り消せません。
            本当にリセットしますか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetCancel}>キャンセル</Button>
          <Button onClick={handleResetConfirm} color="error" variant="contained">
            リセット
          </Button>
        </DialogActions>
      </Dialog>

      <WorkoutStats workouts={workouts} />

      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
          centered
        >
          <Tab label="グラフ" />
          <Tab label="友達" />
        </Tabs>

        <TabPanel value={value} index={0}>
          <WorkoutGraphs workouts={workouts} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <FriendsList />
        </TabPanel>
      </Paper>
    </Box>
  );
} 