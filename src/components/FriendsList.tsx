import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Avatar, CircularProgress, Alert, Collapse, IconButton } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { InviteList } from './InviteList';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WorkoutRecord } from '@/types/workout';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';

interface Friend {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  workouts?: WorkoutRecord[];
  stats?: {
    totalWorkouts: number;
    totalSets: number;
    totalReps: number;
    maxWeight: number;
    lastWorkoutDate?: Date;
  };
}

export const FriendsList: React.FC = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 自分が共有されている友達を取得
    const sharedWithMeQuery = query(
      collection(db, 'shares'),
      where('toUserId', '==', user.uid)
    );

    // 自分が共有している友達を取得
    const sharedByMeQuery = query(
      collection(db, 'shares'),
      where('fromUserId', '==', user.uid)
    );

    const unsubscribe1 = onSnapshot(sharedWithMeQuery, (snapshot) => {
      const friendList: Friend[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        friendList.push({
          id: data.fromUserId,
          email: data.fromUserEmail,
        });
      });
      setFriends(prev => [...prev, ...friendList]);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching friends:', err);
      setError('友達の取得に失敗しました');
      setLoading(false);
    });

    const unsubscribe2 = onSnapshot(sharedByMeQuery, (snapshot) => {
      const friendList: Friend[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        friendList.push({
          id: data.toUserId,
          email: data.toUserEmail,
        });
      });
      setFriends(prev => [...prev, ...friendList]);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching friends:', err);
      setError('友達の取得に失敗しました');
      setLoading(false);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  const fetchFriendWorkouts = async (friendId: string) => {
    try {
      const workoutsQuery = query(
        collection(db, 'users', friendId, 'workouts'),
        orderBy('date', 'desc'),
        limit(30) // 直近30件のトレーニングを取得
      );

      const snapshot = await onSnapshot(workoutsQuery, (snapshot) => {
        const workoutList: WorkoutRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          workoutList.push({
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

        // 統計情報を計算
        const stats = {
          totalWorkouts: workoutList.length,
          totalSets: workoutList.reduce((sum, w) => sum + w.sets.length, 0),
          totalReps: workoutList.reduce((sum, w) => 
            sum + w.sets.reduce((setSum, set) => setSum + set.reps, 0), 0
          ),
          maxWeight: Math.max(...workoutList.flatMap(w => w.sets.map(s => s.weight))),
          lastWorkoutDate: workoutList[0]?.date.toDate()
        };

        setFriends(prev => prev.map(friend => 
          friend.id === friendId 
            ? { ...friend, workouts: workoutList, stats }
            : friend
        ));
      });

      return () => snapshot();
    } catch (err) {
      console.error('Error fetching friend workouts:', err);
      setError('友達のトレーニング記録の取得に失敗しました');
    }
  };

  const handleExpandClick = (friendId: string) => {
    if (expandedFriend === friendId) {
      setExpandedFriend(null);
    } else {
      setExpandedFriend(friendId);
      fetchFriendWorkouts(friendId);
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary">
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

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        保留中の招待
      </Typography>
      <InviteList />

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        友達リスト
      </Typography>
      <Paper sx={{ p: 2 }}>
        {friends.length === 0 ? (
          <Typography color="text.secondary">
            友達がいません。友達を招待して共有しましょう！
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {friends.map((friend) => (
              <Paper key={friend.id} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={friend.photoURL || undefined}>
                      {friend.displayName?.[0] || friend.email[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        {friend.displayName || friend.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {friend.email}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton onClick={() => handleExpandClick(friend.id)}>
                    {expandedFriend === friend.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                <Collapse in={expandedFriend === friend.id}>
                  {friend.stats ? (
                    <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          総トレーニング回数
                        </Typography>
                        <Typography variant="h6">
                          {friend.stats.totalWorkouts}回
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          総セット数
                        </Typography>
                        <Typography variant="h6">
                          {friend.stats.totalSets}セット
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          総レップ数
                        </Typography>
                        <Typography variant="h6">
                          {friend.stats.totalReps}回
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          最高重量
                        </Typography>
                        <Typography variant="h6">
                          {friend.stats.maxWeight}kg
                        </Typography>
                      </Box>
                      {friend.stats.lastWorkoutDate && (
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography variant="body2" color="text.secondary">
                            最終トレーニング
                          </Typography>
                          <Typography variant="body1">
                            {friend.stats.lastWorkoutDate.toLocaleDateString('ja-JP')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                </Collapse>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}; 