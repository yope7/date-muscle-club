"use client";

import React, { useState, useRef, useEffect } from "react";
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
  onRefresh?: () => Promise<void>;
}

export const Feed: React.FC<FeedProps> = ({ workouts, onRefresh }) => {
  const { user } = useAuth();
  const { profile, fetchProfile, friends, fetchFriends } = useUserStore();
  const { friendWorkouts, fetchFriendWorkouts, isLoading, error } =
    useWorkoutStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance * 0.5, PULL_THRESHOLD));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = null;
  };

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
    <Box
      ref={containerRef}
      sx={{
        height: "100%",
        overflow: "auto",
        position: "relative",
        touchAction: "pan-y",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: pullDistance,
          transform: `translateY(${pullDistance}px)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        {isRefreshing ? (
          <CircularProgress size={24} />
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              opacity: pullDistance / PULL_THRESHOLD,
            }}
          >
            引っ張って更新
          </Typography>
        )}
      </Box>

      <List sx={{ pt: pullDistance }}>
        {allWorkouts.map((workout, index) => {
          const userInfo = getUserInfo(workout.userId);
          return (
            <React.Fragment key={workout.id}>
              <Paper
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
                      {workout.sets?.reduce(
                        (sum, set) => sum + (set.reps || 0),
                        0
                      )}
                      回
                    </Typography>
                    {workout.sets?.map((set, setIndex) => (
                      <Chip
                        key={setIndex}
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
              {index < allWorkouts.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
};
