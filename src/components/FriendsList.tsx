import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { InviteList } from "./InviteList";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  deleteDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WorkoutRecord } from "@/types/workout";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 友達リストを取得
    const friendsQuery = query(
      collection(db, "friends"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      friendsQuery,
      (snapshot) => {
        const friendList: Friend[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          friendList.push({
            id: data.friendId,
            email: data.friendEmail,
            displayName: data.friendDisplayName,
            photoURL: data.friendPhotoURL,
          });
        });
        console.log("友達リスト:", friendList);
        setFriends(friendList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching friends:", err);
        setError("友達の取得に失敗しました");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  const fetchFriendWorkouts = async (friendId: string) => {
    try {
      const workoutsQuery = query(
        collection(db, "users", friendId, "workouts"),
        orderBy("date", "desc"),
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
            memo: data.memo || "",
            tags: data.tags || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });

        // 統計情報を計算
        const stats = {
          totalWorkouts: workoutList.length,
          totalSets: workoutList.reduce((sum, w) => sum + w.sets.length, 0),
          totalReps: workoutList.reduce(
            (sum, w) =>
              sum + w.sets.reduce((setSum, set) => setSum + set.reps, 0),
            0
          ),
          maxWeight: Math.max(
            ...workoutList.flatMap((w) => w.sets.map((s) => s.weight))
          ),
          lastWorkoutDate: workoutList[0]?.date.toDate(),
        };

        setFriends((prev) =>
          prev.map((friend) =>
            friend.id === friendId
              ? { ...friend, workouts: workoutList, stats }
              : friend
          )
        );
      });

      return () => snapshot();
    } catch (err) {
      console.error("Error fetching friend workouts:", err);
      setError("友達のトレーニング記録の取得に失敗しました");
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

  const handleDeleteClick = (friend: Friend) => {
    setFriendToDelete(friend);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !friendToDelete) return;

    setDeleteLoading(true);
    try {
      // 友達関係を相互に削除
      const batch = writeBatch(db);

      // 自分から相手への友達関係を削除
      const myFriendQuery = query(
        collection(db, "friends"),
        where("userId", "==", user.uid),
        where("friendId", "==", friendToDelete.id)
      );

      // 相手から自分への友達関係を削除
      const theirFriendQuery = query(
        collection(db, "friends"),
        where("userId", "==", friendToDelete.id),
        where("friendId", "==", user.uid)
      );

      const [myFriendSnapshot, theirFriendSnapshot] = await Promise.all([
        getDocs(myFriendQuery),
        getDocs(theirFriendQuery),
      ]);

      // 友達関係を削除
      myFriendSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      theirFriendSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // ローカルの友達リストから削除
      setFriends((prev) => prev.filter((f) => f.id !== friendToDelete.id));
      setDeleteDialogOpen(false);
      setFriendToDelete(null);
    } catch (err) {
      console.error("Error deleting friend:", err);
      setError("友達の削除に失敗しました");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setFriendToDelete(null);
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
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {friends.map((friend) => (
              <Paper
                key={friend.id}
                sx={{
                  p: 2,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    boxShadow: 3,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      src={friend.photoURL || undefined}
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: friend.photoURL
                          ? "transparent"
                          : "primary.main",
                      }}
                    >
                      {friend.displayName?.[0] || friend.email[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bold" }}
                      >
                        {friend.displayName || friend.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <IconButton
                      onClick={() => handleExpandClick(friend.id)}
                      sx={{
                        transition: "transform 0.2s ease-in-out",
                        transform:
                          expandedFriend === friend.id
                            ? "rotate(180deg)"
                            : "none",
                      }}
                    >
                      {expandedFriend === friend.id ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(friend)}
                      sx={{
                        "&:hover": {
                          backgroundColor: "error.light",
                          color: "white",
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Collapse in={expandedFriend === friend.id}>
                  {friend.stats ? (
                    <Box
                      sx={{
                        mt: 2,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 2,
                        p: 2,
                        bgcolor: "background.default",
                        borderRadius: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          総トレーニング回数
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {friend.stats.totalWorkouts}回
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          総セット数
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {friend.stats.totalSets}セット
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          総レップ数
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {friend.stats.totalReps}回
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          最高重量
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {friend.stats.maxWeight}kg
                        </Typography>
                      </Box>
                      {friend.stats.lastWorkoutDate && (
                        <Box sx={{ gridColumn: "1 / -1" }}>
                          <Typography variant="body2" color="text.secondary">
                            最終トレーニング
                          </Typography>
                          <Typography variant="body1" color="primary">
                            {friend.stats.lastWorkoutDate.toLocaleDateString(
                              "ja-JP"
                            )}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", p: 2 }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  )}
                </Collapse>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>友達の削除</DialogTitle>
        <DialogContent>
          <Typography>
            {friendToDelete?.displayName || friendToDelete?.email}
            さんとの共有を解除しますか？ この操作は取り消せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteLoading}>
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : "削除"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
