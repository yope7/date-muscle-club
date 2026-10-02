"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Typography,
} from "@mui/material";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useUserStore } from "@/store/userStore";
import { useWorkoutStore } from "@/store/workoutStore";
import { useAuth } from "@/hooks/useAuth";
import { FeedCard, FeedUserInfo } from "./feed/FeedCard";
import {
  CommentDialog,
  IntensityDialog,
  ProfileDialog,
} from "./feed/FeedDialogs";
import { useFeedInteractions } from "./feed/useFeedInteractions";

export const Feed: React.FC = () => {
  const { user } = useAuth();
  const { profile, fetchProfile, friends, fetchFriends } = useUserStore();
  const {
    feedWorkouts,
    friendWorkouts,
    fetchFriendWorkouts,
    fetchWorkouts,
    isFeedLoading,
    isLoadingMore,
    hasMoreWorkouts,
    loadMoreWorkouts,
    error,
  } = useWorkoutStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [intensityDialogOpen, setIntensityDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 自分とフレンドのワークアウトを日付順に結合（重複除去）
  const allWorkouts = useMemo(() => {
    const byId = new Map(
      [...feedWorkouts, ...friendWorkouts].map((w) => [w.id, w])
    );
    return Array.from(byId.values()).sort(
      (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
    );
  }, [feedWorkouts, friendWorkouts]);

  const workoutIds = useMemo(
    () => allWorkouts.map((w) => w.id),
    [allWorkouts]
  );
  const {
    likeUsers,
    comments,
    isLikedByMe,
    toggleLike,
    addComment,
    deleteComment,
  } = useFeedInteractions(workoutIds);

  useEffect(() => {
    if (!user) return;
    fetchWorkouts(user.uid);
    fetchProfile(user.uid);
    fetchFriends(user.uid);
  }, [user, fetchWorkouts, fetchProfile, fetchFriends]);

  const friendIdsKey = friends.map((f) => f.id).join(",");
  useEffect(() => {
    if (friendIdsKey) fetchFriendWorkouts(friendIdsKey.split(","));
  }, [friendIdsKey, fetchFriendWorkouts]);

  const handleRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchWorkouts(user.uid),
        friendIdsKey
          ? fetchFriendWorkouts(friendIdsKey.split(","))
          : Promise.resolve(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getUserInfo = useCallback(
    (userId: string): FeedUserInfo | null => {
      if (userId === user?.uid) {
        return {
          id: user.uid,
          displayName:
            profile?.username || user.email?.split("@")[0] || "ユーザー",
          photoURL: profile?.photoURL || user.photoURL || undefined,
          email: user.email || "",
        };
      }
      const friend = friends.find((f) => f.id === userId);
      if (!friend) return null;
      return {
        id: friend.id,
        displayName:
          friend.username || friend.email?.split("@")[0] || "ユーザー",
        photoURL: friend.photoURL,
        email: friend.email || "",
      };
    },
    [user, profile, friends]
  );

  // 操作の失敗はスナックバーで知らせる
  const runAction = async (action: () => Promise<void>, message: string) => {
    try {
      await action();
    } catch (e) {
      console.error(message, e);
      setActionError(message);
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const isInitialLoading = isFeedLoading && allWorkouts.length === 0;

  return (
    <>
      <Box sx={{ height: "100%", overflow: "auto" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            startIcon={
              isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            sx={{ color: "text.secondary" }}
          >
            {isRefreshing ? "更新中..." : "更新"}
          </Button>
        </Box>

        {isInitialLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : allWorkouts.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
            <Typography variant="h6" gutterBottom>
              まだ投稿がありません
            </Typography>
            <Typography variant="body2" color="text.secondary">
              カレンダーからトレーニングを記録するか、設定からフレンドを招待すると、ここに表示されます（直近2週間分）
            </Typography>
          </Box>
        ) : (
          allWorkouts.map((workout) => (
            <FeedCard
              key={workout.id}
              workout={workout}
              userInfo={getUserInfo(workout.userId)}
              currentUserId={user?.uid}
              liked={isLikedByMe(workout.id)}
              likeUsers={likeUsers[workout.id] ?? []}
              comments={comments[workout.id] ?? []}
              expanded={!!expanded[workout.id]}
              onToggleExpand={() =>
                setExpanded((prev) => ({
                  ...prev,
                  [workout.id]: !prev[workout.id],
                }))
              }
              onLike={() =>
                runAction(
                  () => toggleLike(workout.id),
                  "いいねの操作に失敗しました"
                )
              }
              onComment={() => setCommentTarget(workout.id)}
              onDeleteComment={(commentId) =>
                runAction(
                  () => deleteComment(commentId),
                  "コメントの削除に失敗しました"
                )
              }
              onProfileClick={setProfileUserId}
              onIntensityHelp={() => setIntensityDialogOpen(true)}
            />
          ))
        )}

        {hasMoreWorkouts && allWorkouts.length > 0 && user && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <Button
              variant="outlined"
              onClick={() => loadMoreWorkouts(user.uid)}
              disabled={isLoadingMore}
              startIcon={
                isLoadingMore ? (
                  <CircularProgress size={16} />
                ) : (
                  <KeyboardArrowDownIcon />
                )
              }
              sx={{ minWidth: 200 }}
            >
              {isLoadingMore ? "読み込み中..." : "さらに読み込む"}
            </Button>
          </Box>
        )}
      </Box>

      <CommentDialog
        open={commentTarget !== null}
        onClose={() => setCommentTarget(null)}
        onSubmit={async (content) => {
          if (commentTarget) await addComment(commentTarget, content);
        }}
      />

      <ProfileDialog
        userId={profileUserId}
        userInfo={profileUserId ? getUserInfo(profileUserId) : null}
        workouts={allWorkouts.filter((w) => w.userId === profileUserId)}
        onClose={() => setProfileUserId(null)}
      />

      <IntensityDialog
        open={intensityDialogOpen}
        onClose={() => setIntensityDialogOpen(false)}
      />

      <Snackbar
        open={actionError !== null}
        autoHideDuration={4000}
        onClose={() => setActionError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      </Snackbar>
    </>
  );
};
