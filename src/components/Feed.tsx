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
  DirectionsBike as DirectionsBikeIcon,
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
    icon: "🌟",
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
    icon: "💪",
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
    icon: "🌸",
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
    icon: "🏆",
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
    icon: "🎮",
    messages: ["やるのぉ", "力が欲しいか", "筋肉をやろう"],
  },
  {
    id: "system_yogini",
    displayName: "ヨガインストラクター",
    icon: "🧘‍♀️",
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
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
  const [isUpdatingRecords, setIsUpdatingRecords] = useState(false);
  const [cachedWorkouts, setCachedWorkouts] = useState<WorkoutRecord[]>([]);
  const [cachedLikes, setCachedLikes] = useState<{ [key: string]: boolean }>({});
  const [cachedLikeCounts, setCachedLikeCounts] = useState<{ [key: string]: number }>({});
  const [cachedLikeUsers, setCachedLikeUsers] = useState<{
    [key: string]: Array<{
      id: string;
      displayName: string;
      photoURL?: string;
    }>;
  }>({});
  const [cachedComments, setCachedComments] = useState<{
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
  const containerRef = useRef<HTMLDivElement>(null);

  // workoutsとfriendWorkoutsの変更を監視してキャッシュを更新
  useEffect(() => {
    if (workouts.length > 0 || friendWorkouts.length > 0) {
      const updatedWorkouts = [...workouts, ...friendWorkouts].sort(
        (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
      );
      setCachedWorkouts(updatedWorkouts);
      setCachedLikes(likes);
      setCachedLikeCounts(likeCounts);
      setCachedLikeUsers(likeUsers);
      setCachedComments(comments);
    }
  }, [workouts, friendWorkouts, likes, likeCounts, likeUsers, comments]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      // 0.5秒待機
      await new Promise(resolve => setTimeout(resolve, 500));
      await onRefresh();
      // 更新後にデータをキャッシュに保存
      const updatedWorkouts = [...workouts, ...friendWorkouts].sort(
        (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
      );
      setCachedWorkouts(updatedWorkouts);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchWorkouts = async () => {
      // キャッシュにデータがない場合のみデータを取得
      if (cachedWorkouts.length === 0) {
        setIsLoadingWorkouts(true);
        try {
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

          // データをキャッシュに保存
          setCachedWorkouts([...workoutData, ...friendWorkouts].sort(
            (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
          ));
        } catch (error) {
          console.error("Error fetching workouts:", error);
        } finally {
          setIsLoadingWorkouts(false);
        }
      }
    };

    fetchWorkouts();
  }, [user, friendWorkouts]);

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

  // いいねの状態を監視
  useEffect(() => {
    if (!user) return;

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
      setCachedLikes(newLikes);
    });

    return () => {
      unsubscribeLikes();
    };
  }, [user]);

  // 各投稿のいいね数とユーザー情報を取得
  useEffect(() => {
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
        setCachedLikeCounts((prev) => ({
          ...prev,
          [workout.id]: users.length,
        }));

        setLikeUsers((prev) => ({
          ...prev,
          [workout.id]: users,
        }));
        setCachedLikeUsers((prev) => ({
          ...prev,
          [workout.id]: users,
        }));
      });

      return () => unsubscribe();
    });
  }, [workouts, friendWorkouts]);

  // 各投稿のコメントを取得
  useEffect(() => {
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
        setCachedComments((prev) => ({
          ...prev,
          [workout.id]: comments,
        }));
      });

      return () => unsubscribe();
    });
  }, [workouts, friendWorkouts]);

  // 自分のワークアウトとフレンドのワークアウトを結合して日付順にソート
  const allWorkouts = React.useMemo(() => {
    if (cachedWorkouts.length > 0) {
      return cachedWorkouts;
    }
    return [...workouts, ...friendWorkouts].sort(
      (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
    );
  }, [workouts, friendWorkouts, cachedWorkouts]);

  // いいねとコメントの情報を取得
  const getWorkoutInteractions = (workoutId: string) => {
    return {
      likes: cachedLikes[workoutId] || false,
      likeCount: cachedLikeCounts[workoutId] || 0,
      likeUsers: cachedLikeUsers[workoutId] || [],
      comments: cachedComments[workoutId] || [],
    };
  };

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

      // 更新後にキャッシュを更新
      const updatedWorkouts = [...workouts, ...friendWorkouts].sort(
        (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
      );
      setCachedWorkouts(updatedWorkouts);
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
          touchAction: "pan-x pan-y",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Box
          onClick={handleRefresh}
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 1,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            position: "relative",
            overflow: "hidden",
            height: "60px",
          }}
        >
          <Button
            disabled={isRefreshing}
            sx={{
              color: "text.secondary",
              "&:hover": {
                bgcolor: "action.hover",
              },
              minWidth: "100px",
              zIndex: 1,
            }}
          >
            {isRefreshing ? "更新中..." : "更新"}
          </Button>
          {isRefreshing && (
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: "100%",
                height: "40px",
                backgroundColor: "divider",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: "100%",
                  animation: "bikeRide 2s forwards",
                  "@keyframes bikeRide": {
                    "0%": {
                      transform: "translateX(-100%)",
                    },
                    "100%": {
                      transform: "translateX(100%)",
                    },
                  },
                }}
              >
                <DirectionsBikeIcon
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "primary.main",
                    fontSize: "2rem",
                    filter: "drop-shadow(0 0 2px rgba(0,0,0,0.2))",
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>

        <List>
          {allWorkouts.map((workout, index) => {
            const userInfo = getUserInfo(workout.userId);
            const interactions = getWorkoutInteractions(workout.id);
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
                          />
                        ))}
                      </Stack>
                    </Box>

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
                          color={interactions.likes ? "error" : "default"}
                        >
                          {interactions.likes ? (
                            <FavoriteIcon />
                          ) : (
                            <FavoriteBorderIcon />
                          )}
                        </IconButton>
                        {interactions.likeCount > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {interactions.likeCount}
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
                        {interactions.comments.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {interactions.comments.length}
                          </Typography>
                        )}
                      </Box>
                      <IconButton size="small">
                        <ShareIcon />
                      </IconButton>
                    </Box>

                    {interactions.likeUsers.length > 0 && (
                      <Box sx={{ width: "100%", mt: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {interactions.likeUsers.slice(0, 3).map((user) => (
                            <Avatar
                              key={user.id}
                              src={user.photoURL}
                              sx={{ width: 24, height: 24 }}
                            />
                          ))}
                          {interactions.likeUsers.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              他{interactions.likeUsers.length - 3}人
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}

                    {interactions.comments.length > 0 && (
                      <Box sx={{ width: "100%", mt: 2, pl: 2 }}>
                        <Stack spacing={1}>
                          {interactions.comments.map((comment) => {
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
                                <ListItemAvatar>
                                  <Avatar
                                    sx={{
                                      width: 24,
                                      height: 24,
                                      bgcolor: systemUser ? "primary.main" : "grey.500",
                                    }}
                                  >
                                    {systemUser?.icon || "?"}
                                  </Avatar>
                                </ListItemAvatar>
                                <Box>
                                  <Typography variant="body2">
                                    {systemUser?.displayName || "不明なユーザー"}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
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

      <Dialog open={commentOpen} onClose={handleCommentClose}>
        <DialogTitle>コメントを入力</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCommentClose}>キャンセル</Button>
          <Button onClick={handleCommentSubmit}>投稿</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};