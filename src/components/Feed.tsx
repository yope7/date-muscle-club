"use client";

import React, { useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { WorkoutRecord } from "@/types/workout";
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { useUserStore } from "@/store/userStore";
import { useWorkoutStore } from "@/store/workoutStore";
import { useAuth } from "@/hooks/useAuth";

interface FeedProps {
  workouts: WorkoutRecord[];
}

export const Feed = ({ workouts }: FeedProps) => {
  const { user } = useAuth();
  const { profile, fetchProfile, friends, fetchFriends } = useUserStore();
  const { friendWorkouts, fetchFriendWorkouts, isLoading, error } =
    useWorkoutStore();

  useEffect(() => {
    if (user) {
      // 自分のプロフィールを取得
      fetchProfile(user.uid);
      // フレンドリストを取得
      fetchFriends(user.uid);
    }
  }, [user, fetchProfile, fetchFriends]);

  useEffect(() => {
    // フレンドのワークアウトを取得
    if (friends.length > 0) {
      const friendIds = friends.map((friend) => friend.id);
      fetchFriendWorkouts(friendIds);
    }
  }, [friends, fetchFriendWorkouts]);

  // ワークアウトのユーザー情報を取得
  const getUserInfo = (userId: string) => {
    if (userId === user?.uid) {
      return {
        id: user.uid,
        displayName:
          profile?.username || user.email?.split("@")[0] || "ユーザー",
        photoURL: profile?.photoURL || user.photoURL || undefined,
      };
    }
    const friend = friends.find((friend) => friend.id === userId);
    if (friend) {
      return {
        id: friend.id,
        displayName:
          friend.username || friend.email?.split("@")[0] || "ユーザー",
        photoURL: friend.photoURL,
      };
    }
    return null;
  };

  if (isLoading) {
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

  // 自分のワークアウトとフレンドのワークアウトを結合して日付順にソート
  const allWorkouts = [...workouts, ...friendWorkouts].sort(
    (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
  );

  return (
    <List>
      {allWorkouts.map((workout) => {
        const userInfo = getUserInfo(workout.userId);
        return (
          <Paper
            key={workout.id}
            sx={{
              mb: 2,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <ListItem
              alignItems="flex-start"
              sx={{
                display: "flex",
                flexDirection: "column",
                p: 2,
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <ListItemAvatar>
                  <Avatar src={userInfo?.photoURL || undefined}>
                    {userInfo?.displayName?.charAt(0).toUpperCase() || "?"}
                  </Avatar>
                </ListItemAvatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {userInfo?.displayName || "不明なユーザー"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(workout.date.toDate(), "yyyy年M月d日 HH:mm", {
                      locale: ja,
                    })}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ width: "100%", mb: 2 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  ベンチプレス{" "}
                  {workout.sets?.reduce((sum, set) => sum + (set.reps || 0), 0)}
                  回
                </Typography>
                {workout.sets?.map((set, index) => (
                  <Chip
                    key={index}
                    label={`${set.weight}kg × ${set.reps}回`}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
                {workout.memo && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {workout.memo}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ width: "100%", mb: 1 }} />

              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-around",
                }}
              >
                <IconButton size="small">
                  <FavoriteBorderIcon />
                </IconButton>
                <IconButton size="small">
                  <CommentIcon />
                </IconButton>
                <IconButton size="small">
                  <ShareIcon />
                </IconButton>
              </Box>
            </ListItem>
          </Paper>
        );
      })}
    </List>
  );
};
