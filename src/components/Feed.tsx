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
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { WorkoutRecord } from "@/types/workout";
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  LocalFlorist as LocalFloristIcon,
  SportsGymnastics as SportsGymnasticsIcon,
  FitnessCenter as FitnessCenterIcon,
  EmojiEvents as EmojiEventsIcon,
  SelfImprovement as SelfImprovementIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import { useUserStore } from "@/store/userStore";
import { useWorkoutStore } from "@/store/workoutStore";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  updateDoc,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FeedProps {
  workouts: WorkoutRecord[];
  onRefresh?: () => Promise<void>;
}

// システムユーザーの定義
const SYSTEM_USERS = [
  {
    id: "system_god",
    displayName: "GOD",
    icon: <AutoAwesomeIcon sx={{ fontSize: 20, color: "warning.main" }} />,
    messages: [
      "素晴らしい記録だ！",
      "その努力、認める！",
      "もっと上を目指せ！",
      "限界を超えていけ！",
      "君ならできる！",
    ],
  },
  {
    id: "system_macho",
    displayName: "マッチョマン",
    icon: <FitnessCenterIcon sx={{ fontSize: 20, color: "primary.main" }} />,
    messages: [
      "ナイスワーク！その筋肉の成長が見えるぜ！💪",
      "お前の努力が実を結んでるな！",
      "その重量、素晴らしい！もっと上げられるぞ！",
      "筋肉の神が微笑んでいる！",
      "そのフォーム、完璧だ！",
    ],
  },
  {
    id: "system_ojosama",
    displayName: "お嬢様",
    icon: <LocalFloristIcon sx={{ fontSize: 20, color: "secondary.main" }} />,
    messages: [
      "まぁ、素晴らしいわ！",
      "その努力、認めてあげるわ！",
      "私も見習わないといけないわね！",
      "素敵な記録ですわ！",
      "あなたの成長、楽しみですわ！",
      "お疲れ様ですわ！",
      "かっこいいですわ！",
    ],
  },
  {
    id: "system_coach",
    displayName: "熱血コーチ",
    icon: <EmojiEventsIcon sx={{ fontSize: 20, color: "warning.main" }} />,
    messages: [
      "いいぞ！その調子だ！",
      "限界を超えていけ！",
      "君ならできる！",
      "その努力、必ず報われる！",
      "もっと上を目指せ！",
    ],
  },
  {
    id: "system_otaku",
    displayName: "GOD",
    icon: <SportsGymnasticsIcon sx={{ fontSize: 40, color: "success.main" }} />,
    messages: ["やるのぉ", "力が欲しいか", "筋肉をやろう"],
  },
  {
    id: "system_yogini",
    displayName: "ヨガインストラクター",
    icon: <SelfImprovementIcon sx={{ fontSize: 40, color: "info.main" }} />,
    messages: [
      "素晴らしい呼吸と共に、その努力を讃えましょう！",
      "心と体の調和が感じられます！",
      "その成長、心から祝福します！",
      "では私も...",
    ],
  },
];

// ランダムな要素を選択する関数
const getRandomElement = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const Feed: React.FC<FeedProps> = ({ workouts, onRefresh }) => {
  const { user } = useAuth();
  const { profile, fetchProfile, friends, fetchFriends } = useUserStore();
  const { friendWorkouts, fetchFriendWorkouts, isLoading, error } =
    useWorkoutStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isUpdatingRecords, setIsUpdatingRecords] = useState(false);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [likes, setLikes] = useState<{ [key: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [likeUsers, setLikeUsers] = useState<{
    [key: string]: Array<{
      id: string;
      displayName: string;
      photoURL?: string;
    }>;
  }>({});
  const [comments, setComments] = useState<{
    [key: string]: Array<{
      id: string;
      content: string;
      userId: string;
      createdAt: Date;
      user: {
        displayName: string;
        photoURL?: string;
      };
    }>;
  }>({});
  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 100;
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 自分のワークアウトとフレンドのワークアウトを結合して日付順にソート
  const allWorkouts = React.useMemo(() => {
    if (isLoadingWorkouts) return [];

    return [...workouts, ...friendWorkouts].sort(
      (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
    );
  }, [workouts, friendWorkouts, isLoadingWorkouts]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && containerRef.current?.scrollTop === 0) {
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

  useEffect(() => {
    if (!user) return;

    // いいねの状態を監視
    const likesQuery = query(
      collection(db, "likes"),
      where("userId", "==", user.uid)
    );

    const unsubscribeLikes = onSnapshot(likesQuery, (snapshot) => {
      const newLikes: { [key: string]: boolean } = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        newLikes[data.workoutId] = true;
      });
      setLikes(newLikes);
    });

    return () => {
      unsubscribeLikes();
    };
  }, [user]);

  useEffect(() => {
    // 各投稿のいいね数とユーザー情報を取得
    const allWorkouts = [...workouts, ...friendWorkouts];
    allWorkouts.forEach(async (workout) => {
      const likesQuery = query(
        collection(db, "likes"),
        where("workoutId", "==", workout.id)
      );

      const unsubscribe = onSnapshot(likesQuery, (snapshot) => {
        const users: Array<{
          id: string;
          displayName: string;
          photoURL?: string;
        }> = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          users.push({
            id: data.userId,
            displayName: data.user.displayName,
            photoURL: data.user.photoURL,
          });
        });

        setLikeCounts((prev) => ({
          ...prev,
          [workout.id]: users.length,
        }));

        setLikeUsers((prev) => ({
          ...prev,
          [workout.id]: users,
        }));
      });

      return () => unsubscribe();
    });
  }, [workouts, friendWorkouts]);

  useEffect(() => {
    // 各投稿のコメントを取得
    const allWorkouts = [...workouts, ...friendWorkouts];
    allWorkouts.forEach(async (workout) => {
      const commentsQuery = query(
        collection(db, "comments"),
        where("workoutId", "==", workout.id)
      );

      const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        const comments: Array<{
          id: string;
          content: string;
          userId: string;
          createdAt: Date;
          user: {
            displayName: string;
            photoURL?: string;
          };
        }> = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          comments.push({
            id: doc.id,
            content: data.content,
            userId: data.userId,
            createdAt: data.createdAt.toDate(),
            user: data.user,
          });
        });

        // クライアント側でソート
        comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        setComments((prev) => ({
          ...prev,
          [workout.id]: comments,
        }));
      });

      return () => unsubscribe();
    });
  }, [workouts, friendWorkouts]);

  useEffect(() => {
    if (!user) return;

    const fetchWorkouts = async () => {
      setIsLoadingWorkouts(true);
      try {
        // 1秒待ってからデータを取得
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const workoutsQuery = query(
          collection(db, "workouts"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(workoutsQuery);
        const workoutData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            isNewRecord: Boolean(data.isNewRecord),
            date: data.date,
            sets: data.sets || [],
          };
        }) as WorkoutRecord[];
      } catch (error) {
        console.error("Error fetching workouts:", error);
      } finally {
        setIsLoadingWorkouts(false);
      }
    };

    fetchWorkouts();

    // クリーンアップ関数
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [user]);

  // システムコメントを投稿する関数
  const postSystemComment = async (
    workoutId: string,
    systemUser: (typeof SYSTEM_USERS)[0],
    isNewRecord: boolean = false
  ) => {
    try {
      // 最高記録の場合のメッセージ
      let message;
      if (isNewRecord) {
        switch (systemUser.id) {
          case "system_god":
            message = "最高新記録おめでとう！神の祝福がある！";
            break;
          case "system_ojosama":
            message = "まぁ、最高新記録ですわ！素晴らしいですわ！";
            break;
          case "system_macho":
            message = "最高新記録おめでとう！その筋肉、神がかってるぜ！";
            break;
          case "system_coach":
            message = "最高新記録おめでとう！その努力が実を結んだな！";
            break;
          case "system_otaku":
            message = "最高新記録おめでとう！マジでヤバすぎる！";
            break;
          case "system_yogini":
            message =
              "最高新記録おめでとう！心と体の調和が生み出した奇跡です！";
            break;
          default:
            message = "最高新記録おめでとう！";
        }
      } else {
        message = getRandomElement(systemUser.messages);
      }

      await addDoc(collection(db, "comments"), {
        workoutId,
        userId: systemUser.id,
        content: message,
        createdAt: new Date(),
        user: {
          displayName: systemUser.displayName,
          isSystemUser: true,
          systemUserId: systemUser.id,
        },
      });
    } catch (error) {
      console.error("システムコメントの投稿に失敗しました:", error);
    }
  };

  // 新しいワークアウトが追加されたときにシステムコメントを投稿
  useEffect(() => {
    const postSystemCommentForNewWorkout = async (
      workoutId: string,
      workout: WorkoutRecord
    ) => {
      try {
        // 既存のコメントをチェック
        const commentsQuery = query(
          collection(db, "comments"),
          where("workoutId", "==", workoutId)
        );
        const snapshot = await getDocs(commentsQuery);

        // コメントが0件の場合のみシステムコメントを投稿
        if (snapshot.empty) {
          // 最高重量を計算
          const maxWeight =
            workout.sets?.reduce(
              (max, set) => Math.max(max, set.weight || 0),
              0
            ) || 0;

          // 過去の最高記録を取得
          const previousWorkoutsQuery = query(
            collection(db, "workouts"),
            where("userId", "==", workout.userId),
            where("date", "<", workout.date)
          );
          const previousWorkouts = await getDocs(previousWorkoutsQuery);

          // 過去の最高重量を計算
          let previousMaxWeight = 0;
          previousWorkouts.docs.forEach((doc) => {
            const data = doc.data() as WorkoutRecord;
            const workoutMaxWeight =
              data.sets?.reduce(
                (workoutMax, set) => Math.max(workoutMax, set.weight || 0),
                0
              ) || 0;
            previousMaxWeight = Math.max(previousMaxWeight, workoutMaxWeight);
          });

          // 最高記録を更新したかチェック
          const isNewRecord = maxWeight > previousMaxWeight;

          // 最高記録の場合、ワークアウトデータを更新
          if (isNewRecord) {
            try {
              // ドキュメントの存在確認
              const workoutRef = doc(db, "workouts", workoutId);
              const workoutDoc = await getDoc(workoutRef);

              if (workoutDoc.exists()) {
                await updateDoc(workoutRef, {
                  isNewRecord: true,
                });

                // フィードを更新
                if (onRefresh) {
                  await onRefresh();
                }
              }
            } catch (error) {
              console.error("Failed to update workout:", error);
            }
          }

          // システムコメントを1件だけ投稿
          const selectedSystemUser = getRandomElement(SYSTEM_USERS);
          await postSystemComment(workoutId, selectedSystemUser, isNewRecord);
        }
      } catch (error) {
        console.error("Error in postSystemCommentForNewWorkout:", error);
      }
    };

    // 最新のワークアウトを取得
    const latestWorkout = [...workouts, ...friendWorkouts].sort(
      (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
    )[0];

    if (latestWorkout) {
      postSystemCommentForNewWorkout(latestWorkout.id, latestWorkout);
    }
  }, [workouts.length]); // 依存配列をworkouts.lengthのみに変更

  const handleLike = async (workoutId: string) => {
    if (!user) return;

    if (likes[workoutId]) {
      // いいねを削除
      const likesQuery = query(
        collection(db, "likes"),
        where("workoutId", "==", workoutId),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(likesQuery);
      snapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
    } else {
      // いいねを追加
      await addDoc(collection(db, "likes"), {
        workoutId,
        userId: user.uid,
        createdAt: new Date(),
        user: {
          displayName:
            profile?.username ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "ユーザー",
          photoURL: profile?.photoURL || user.photoURL,
        },
      });
    }
  };

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

  const handleCommentOpen = (workoutId: string) => {
    setSelectedWorkout(workoutId);
    setCommentOpen(true);
  };

  const handleCommentClose = () => {
    setCommentOpen(false);
    setSelectedWorkout(null);
    setNewComment("");
  };

  const handleCommentSubmit = async () => {
    if (!user || !selectedWorkout || !newComment.trim()) return;

    try {
      // ユーザーのコメントを投稿
      await addDoc(collection(db, "comments"), {
        workoutId: selectedWorkout,
        userId: user.uid,
        content: newComment.trim(),
        createdAt: new Date(),
        user: {
          displayName:
            profile?.username ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "ユーザー",
          photoURL: profile?.photoURL || user.photoURL,
        },
      });

      setNewComment("");
      handleCommentClose();
    } catch (error) {
      console.error("コメントの投稿に失敗しました:", error);
    }
  };

  const handleDeleteComment = async (commentId: string, userId: string) => {
    try {
      // システムコメントの場合は、同じユーザーの他のコメントも削除
      if (SYSTEM_USERS.some((user) => user.id === userId)) {
        const commentsQuery = query(
          collection(db, "comments"),
          where("userId", "==", userId)
        );
        const snapshot = await getDocs(commentsQuery);
        const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } else {
        // 通常のコメントの場合は、該当のコメントのみ削除
        await deleteDoc(doc(db, "comments", commentId));
      }
    } catch (error) {
      console.error("コメントの削除に失敗しました:", error);
    }
  };

  // システムユーザーのコメントのアイコンを更新する関数
  const updateSystemUserIcons = async () => {
    try {
      // 各システムユーザーのコメントを取得して更新
      for (const systemUser of SYSTEM_USERS) {
        const commentsQuery = query(
          collection(db, "comments"),
          where("userId", "==", systemUser.id)
        );
        const snapshot = await getDocs(commentsQuery);

        // 各コメントのユーザー情報を更新
        const updatePromises = snapshot.docs.map((doc) =>
          updateDoc(doc.ref, {
            "user.isSystemUser": true,
            "user.systemUserId": systemUser.id,
          })
        );

        await Promise.all(updatePromises);
      }
      console.log("システムユーザーのアイコンを更新しました");
    } catch (error) {
      console.error("システムユーザーのアイコン更新に失敗しました:", error);
    }
  };

  // コメントの表示を時系列順にソートする関数
  const getSortedComments = (workoutId: string) => {
    const workoutComments = comments[workoutId] || [];
    return [...workoutComments].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  };

  // 既存のフィードの最高記録を更新する関数
  const updateExistingRecords = async () => {
    setIsUpdatingRecords(true);
    try {
      // 全ユーザーのワークアウトを取得
      const workoutsRef = collection(db, "workouts");
      const workoutsSnapshot = await getDocs(workoutsRef);
      const allWorkouts = workoutsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkoutRecord[];

      // ユーザーごとに最高記録を計算
      const userMaxWeights = new Map<string, number>();
      const userWorkouts = new Map<string, WorkoutRecord[]>();

      // ユーザーごとにワークアウトをグループ化
      allWorkouts.forEach((workout) => {
        const userWorkoutsList = userWorkouts.get(workout.userId) || [];
        userWorkoutsList.push(workout);
        userWorkouts.set(workout.userId, userWorkoutsList);
      });

      // 各ユーザーの最高記録を計算
      for (const [userId, workouts] of userWorkouts) {
        let maxWeight = 0;
        workouts.forEach((workout) => {
          const workoutMaxWeight =
            workout.sets?.reduce(
              (max, set) => Math.max(max, set.weight || 0),
              0
            ) || 0;
          maxWeight = Math.max(maxWeight, workoutMaxWeight);
        });
        userMaxWeights.set(userId, maxWeight);
      }

      // 最高記録を更新
      const batch = writeBatch(db);
      for (const [userId, workouts] of userWorkouts) {
        const maxWeight = userMaxWeights.get(userId) || 0;
        workouts.forEach((workout) => {
          const workoutMaxWeight =
            workout.sets?.reduce(
              (max, set) => Math.max(max, set.weight || 0),
              0
            ) || 0;
          if (workoutMaxWeight === maxWeight) {
            batch.update(doc(db, "workouts", workout.id), {
              isNewRecord: true,
            });
          } else {
            batch.update(doc(db, "workouts", workout.id), {
              isNewRecord: false,
            });
          }
        });
      }

      await batch.commit();
      console.log("最高記録の更新が完了しました");
    } catch (error) {
      console.error("最高記録の更新に失敗しました:", error);
    } finally {
      setIsUpdatingRecords(false);
    }
  };

  // バッジの表示部分を修正
  const renderWorkoutBadge = (workout: WorkoutRecord) => {
    if (!workout.isNewRecord) return null;

    return (
      <Box sx={{ mt: 1 }}>
        <Chip
          icon={<EmojiEventsIcon />}
          label="最高記録"
          color="warning"
          size="small"
          sx={{
            backgroundColor: "warning.main",
            color: "warning.contrastText",
            "& .MuiChip-icon": {
              color: "warning.contrastText",
            },
          }}
        />
      </Box>
    );
  };

  if (isLoadingWorkouts) {
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
    <>
      <Box
        ref={containerRef}
        sx={{
          height: "100%",
          overflow: "auto",
          position: "relative",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
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
                          {userInfo?.displayName?.charAt(0).toUpperCase() ||
                            "?"}
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
                      {workout.isNewRecord && (
                        <Chip
                          icon={<EmojiEventsIcon />}
                          label="最高記録"
                          color="warning"
                          size="small"
                          sx={{
                            ml: 1,
                            backgroundColor: "warning.main",
                            color: "warning.contrastText",
                            "& .MuiChip-icon": {
                              color: "warning.contrastText",
                            },
                          }}
                        />
                      )}
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
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        {workout.sets?.map((set, setIndex) => (
                          <Chip
                            key={setIndex}
                            label={`${set.weight}kg × ${set.reps}回`}
                            size="small"
                          />
                        ))}
                      </Stack>
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
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <IconButton
                          size="small"
                          onClick={() => handleLike(workout.id)}
                          color={likes[workout.id] ? "error" : "default"}
                        >
                          {likes[workout.id] ? (
                            <FavoriteIcon />
                          ) : (
                            <FavoriteBorderIcon />
                          )}
                        </IconButton>
                        {likeCounts[workout.id] > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {likeCounts[workout.id]}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <IconButton
                          size="small"
                          onClick={() => handleCommentOpen(workout.id)}
                        >
                          <CommentIcon />
                        </IconButton>
                        {comments[workout.id]?.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {comments[workout.id].length}
                          </Typography>
                        )}
                      </Box>
                      <IconButton size="small">
                        <ShareIcon />
                      </IconButton>
                    </Box>

                    {likeUsers[workout.id]?.length > 0 && (
                      <Box sx={{ width: "100%", mt: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {likeUsers[workout.id].slice(0, 3).map((user) => (
                            <Avatar
                              key={user.id}
                              src={user.photoURL}
                              sx={{ width: 24, height: 24 }}
                            />
                          ))}
                          {likeUsers[workout.id].length > 3 && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              他{likeUsers[workout.id].length - 3}人
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}

                    {comments[workout.id]?.length > 0 && (
                      <Box sx={{ width: "100%", mt: 2, pl: 2 }}>
                        <Stack spacing={1}>
                          {getSortedComments(workout.id).map((comment) => {
                            const systemUser = SYSTEM_USERS.find(
                              (user) => user.id === comment.userId
                            );
                            return (
                              <Box
                                key={comment.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 1,
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    mt: 0.5,
                                    bgcolor: systemUser
                                      ? "transparent"
                                      : undefined,
                                  }}
                                >
                                  {systemUser ? (
                                    systemUser.icon
                                  ) : (
                                    <Typography variant="caption">
                                      {comment.user.displayName.charAt(0)}
                                    </Typography>
                                  )}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {comment.user.displayName}
                                    </Typography>
                                    {(comment.userId === user?.uid ||
                                      SYSTEM_USERS.some(
                                        (sysUser) =>
                                          sysUser.id === comment.userId
                                      )) && (
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          handleDeleteComment(
                                            comment.id,
                                            comment.userId
                                          )
                                        }
                                        sx={{ p: 0.5 }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Box>
                                  <Typography variant="body2">
                                    {comment.content}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}
                  </ListItem>
                </Paper>
                {index < allWorkouts.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      <Dialog
        open={commentOpen}
        onClose={handleCommentClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>コメントを投稿</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="コメントを入力..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCommentClose}>キャンセル</Button>
          <Button
            onClick={handleCommentSubmit}
            variant="contained"
            disabled={!newComment.trim()}
          >
            投稿
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
