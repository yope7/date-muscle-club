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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WorkoutGraphs } from "./WorkoutGraphs";
import { WorkoutStats } from "./WorkoutStats";
import { WorkoutHistory } from "./WorkoutHistory";
import { workoutTypes, muscleGroups } from "@/data/workoutTypes";

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
  const [cachedLikes, setCachedLikes] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [cachedLikeCounts, setCachedLikeCounts] = useState<{
    [key: string]: number;
  }>({});
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
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

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
      await new Promise((resolve) => setTimeout(resolve, 500));
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
              userId: data.userId,
              name: data.name,
              date: data.date,
              sets: data.sets || [],
              memo: data.memo || "",
              tags: data.tags || [],
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              type: data.type,
              isNewRecord: Boolean(data.isNewRecord),
            } as WorkoutRecord;
          });

          // データをキャッシュに保存
          setCachedWorkouts(
            [...workoutData, ...friendWorkouts].sort(
              (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
            )
          );
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

    try {
      // ユーザーのプロフィール情報を取得
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : null;

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
              userData?.displayName ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "ユーザー",
            photoURL: userData?.photoURL || user.photoURL,
          },
        });
      }
    } catch (error) {
      console.error("いいねの操作に失敗しました:", error);
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
        email: user.email || "",
      };
    }
    const friend = friends.find((friend) => friend.id === userId);
    if (friend) {
      return {
        id: friend.id,
        displayName:
          friend.username || friend.email?.split("@")[0] || "ユーザー",
        photoURL: friend.photoURL,
        email: friend.email || "",
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
      // ユーザーのプロフィール情報を取得
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : null;

      // ユーザーのコメントを投稿
      await addDoc(collection(db, "comments"), {
        workoutId: selectedWorkout,
        userId: user.uid,
        content: newComment.trim(),
        createdAt: new Date(),
        user: {
          displayName:
            userData?.displayName ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "ユーザー",
          photoURL: userData?.photoURL || user.photoURL,
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

  // 既存のワークアウトの時刻を修正する関数
  const fixWorkoutTimes = async () => {
    setIsUpdatingRecords(true);
    try {
      // 全ユーザーのワークアウトを取得
      const workoutsRef = collection(db, "workouts");
      const workoutsSnapshot = await getDocs(workoutsRef);
      const allWorkouts = workoutsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkoutRecord[];

      const batch = writeBatch(db);
      let updateCount = 0;

      allWorkouts.forEach((workout) => {
        const workoutDate = workout.date.toDate();
        const hours = workoutDate.getHours();
        const minutes = workoutDate.getMinutes();

        // 時刻が00:00の場合は現在の時刻に修正
        if (hours === 0 && minutes === 0) {
          const fixedDate = new Date(workoutDate);
          fixedDate.setHours(
            new Date().getHours(),
            new Date().getMinutes(),
            new Date().getSeconds(),
            new Date().getMilliseconds()
          );

          batch.update(doc(db, "workouts", workout.id), {
            date: Timestamp.fromDate(fixedDate),
          });
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`${updateCount}件のワークアウトの時刻を修正しました`);

        // 更新後にフィードをリフレッシュ
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        console.log("修正が必要なワークアウトはありませんでした");
      }
    } catch (error) {
      console.error("ワークアウト時刻の修正に失敗しました:", error);
    } finally {
      setIsUpdatingRecords(false);
    }
  };

  const handleProfileClick = (userId: string) => {
    setSelectedProfile(userId);
    setProfileDialogOpen(true);
  };

  const handleProfileClose = () => {
    setProfileDialogOpen(false);
    setSelectedProfile(null);
  };

  // ワークアウトタイプ別にセットをグループ化する関数
  const groupSetsByWorkoutType = (sets: any[]) => {
    const grouped = sets.reduce((acc, set) => {
      const workoutType = set.workoutType || "ベンチプレス"; // デフォルト値
      if (!acc[workoutType]) {
        acc[workoutType] = [];
      }
      acc[workoutType].push(set);
      return acc;
    }, {});

    return Object.entries(grouped).map(([type, sets]) => ({
      type,
      sets: sets as any[],
      totalReps: (sets as any[]).reduce((sum, set) => sum + (set.reps || 0), 0),
      maxWeight: Math.max(...(sets as any[]).map((set) => set.weight || 0)),
    }));
  };

  // ワークアウトタイプの情報を取得
  const getWorkoutTypeInfo = (typeName: string) => {
    // まず完全一致で検索
    let workoutType = workoutTypes.find((wt) => wt.name === typeName);

    // 完全一致が見つからない場合、部分一致で検索
    if (!workoutType) {
      workoutType = workoutTypes.find(
        (wt) => wt.name.includes(typeName) || typeName.includes(wt.name)
      );
    }

    // それでも見つからない場合、筋肉グループを推測
    if (!workoutType) {
      const muscleGroupMap: { [key: string]: string } = {
        胸: "chest",
        背中: "back",
        足: "legs",
        腹筋: "abs",
        腕: "arms",
        肩: "arms",
        有酸素: "cardio",
        カーディオ: "cardio",
      };

      const matchedMuscleGroup = Object.entries(muscleGroupMap).find(([key]) =>
        typeName.includes(key)
      );

      if (matchedMuscleGroup) {
        return {
          muscleGroup:
            muscleGroups.find((mg) => mg.id === matchedMuscleGroup[1])?.name ||
            "不明",
          color: getMuscleGroupColor(matchedMuscleGroup[1]),
        };
      }
    }

    if (workoutType) {
      const muscleGroup = muscleGroups.find(
        (mg) => mg.id === workoutType.muscleGroupId
      );
      return {
        muscleGroup: muscleGroup?.name || "不明",
        color: getMuscleGroupColor(workoutType.muscleGroupId),
      };
    }

    return {
      muscleGroup: "不明",
      color: "primary.main",
    };
  };

  // 筋肉グループ別の色を取得
  const getMuscleGroupColor = (muscleGroupId: string) => {
    const colorMap: { [key: string]: string } = {
      chest: "error.main",
      back: "info.main",
      legs: "success.main",
      abs: "warning.main",
      arms: "secondary.main",
      cardio: "primary.main",
    };
    return colorMap[muscleGroupId] || "primary.main";
  };

  // ワークアウトの総合的な統計を計算
  const calculateWorkoutStats = (workout: WorkoutRecord) => {
    const groupedSets = groupSetsByWorkoutType(workout.sets || []);
    const totalSets = workout.sets?.length || 0;
    const totalReps =
      workout.sets?.reduce((sum, set) => sum + (set.reps || 0), 0) || 0;
    const maxWeight = Math.max(
      ...(workout.sets?.map((set) => set.weight || 0) || [0])
    );
    const totalWeight =
      workout.sets?.reduce((sum, set) => sum + (set.weight || 0), 0) || 0;

    return {
      groupedSets,
      totalSets,
      totalReps,
      maxWeight,
      totalWeight,
      workoutTypes: groupedSets.length,
    };
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
                        <Avatar
                          src={userInfo?.photoURL || undefined}
                          onClick={() => handleProfileClick(workout.userId)}
                          sx={{ cursor: "pointer" }}
                        >
                          {userInfo?.displayName?.charAt(0).toUpperCase() ||
                            "?"}
                        </Avatar>
                      </ListItemAvatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {userInfo?.displayName || "不明なユーザー"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(() => {
                            const workoutDate = workout.date.toDate();
                            const hours = workoutDate.getHours();
                            const minutes = workoutDate.getMinutes();

                            // 時刻が00:00の場合は「今日」または「昨日」を表示
                            if (hours === 0 && minutes === 0) {
                              const today = new Date();
                              const yesterday = new Date(today);
                              yesterday.setDate(yesterday.getDate() - 1);

                              if (
                                format(workoutDate, "yyyy-MM-dd") ===
                                format(today, "yyyy-MM-dd")
                              ) {
                                return "今日";
                              } else if (
                                format(workoutDate, "yyyy-MM-dd") ===
                                format(yesterday, "yyyy-MM-dd")
                              ) {
                                return "昨日";
                              } else {
                                return format(workoutDate, "yyyy年M月d日", {
                                  locale: ja,
                                });
                              }
                            } else {
                              return format(workoutDate, "yyyy年M月d日 HH:mm", {
                                locale: ja,
                              });
                            }
                          })()}
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
                      {(() => {
                        const stats = calculateWorkoutStats(workout);

                        return (
                          <Box>
                            {/* ワークアウト概要 */}
                            <Box sx={{ mb: 2 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <Chip
                                  label={`${stats.workoutTypes}種目`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                                <Chip
                                  label={`${stats.totalSets}セット`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              </Stack>
                            </Box>

                            {/* ワークアウトタイプ別の詳細 */}
                            {stats.groupedSets.map((group, groupIndex) => {
                              const typeInfo = getWorkoutTypeInfo(group.type);
                              return (
                                <Box
                                  key={groupIndex}
                                  sx={{
                                    mb: 2,
                                    p: 2,
                                    borderRadius: 2,
                                    border: `1px solid`,
                                    borderColor: `${typeInfo.color}20`,
                                    bgcolor: `${typeInfo.color}08`,
                                    position: "relative",
                                    overflow: "hidden",
                                  }}
                                >
                                  {/* 背景装飾 */}
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      top: -10,
                                      right: -10,
                                      fontSize: "3rem",
                                      opacity: 0.1,
                                      color: typeInfo.color,
                                    }}
                                  >
                                    🏋️
                                  </Box>

                                  {/* ヘッダー */}
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      mb: 1,
                                    }}
                                  >
                                    <Typography
                                      variant="h6"
                                      sx={{
                                        fontSize: "1.1rem",
                                        fontWeight: "bold",
                                        color: typeInfo.color,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <span style={{ fontSize: "1.5rem" }}>
                                        🏋️
                                      </span>
                                      {group.type}
                                    </Typography>
                                    <Chip
                                      label={typeInfo.muscleGroup}
                                      size="small"
                                      sx={{
                                        ml: 1,
                                        bgcolor: `${typeInfo.color}20`,
                                        color: typeInfo.color,
                                        fontWeight: "bold",
                                      }}
                                    />
                                  </Box>

                                  {/* 統計情報 */}
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ mb: 1 }}
                                  >
                                    <Chip
                                      label={`${group.sets.length}セット`}
                                      size="small"
                                      variant="outlined"
                                    />
                                    <Chip
                                      label={`${group.totalReps}回`}
                                      size="small"
                                      variant="outlined"
                                    />
                                    {group.maxWeight > 0 && (
                                      <Chip
                                        label={`最大${group.maxWeight}kg`}
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                      />
                                    )}
                                  </Stack>

                                  {/* セット詳細 */}
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mb: 1, display: "block" }}
                                    >
                                      セット詳細:
                                    </Typography>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      flexWrap="wrap"
                                      useFlexGap
                                    >
                                      {group.sets.map((set, setIndex) => (
                                        <Chip
                                          key={setIndex}
                                          label={`${set.weight}kg × ${set.reps}回`}
                                          size="small"
                                          sx={{
                                            bgcolor: "background.paper",
                                            border: `1px solid ${typeInfo.color}40`,
                                            color: "text.primary",
                                            fontWeight: "medium",
                                            "&:hover": {
                                              bgcolor: `${typeInfo.color}10`,
                                            },
                                          }}
                                        />
                                      ))}
                                    </Stack>
                                  </Box>
                                </Box>
                              );
                            })}

                            {/* メモがある場合 */}
                            {/* {workout.memo && (
                              <Box
                                sx={{
                                  mt: 2,
                                  p: 2,
                                  bgcolor: "grey.50",
                                  borderRadius: 1,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  💭 {workout.memo}
                                </Typography>
                              </Box>
                            )} */}
                          </Box>
                        );
                      })()}
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
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
                                  {systemUser ? (
                                    <Avatar
                                      sx={{
                                        width: 24,
                                        height: 24,
                                        bgcolor: "primary.main",
                                      }}
                                    >
                                      {systemUser.icon}
                                    </Avatar>
                                  ) : (
                                    <Avatar
                                      src={comment.user.photoURL}
                                      sx={{
                                        width: 24,
                                        height: 24,
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        handleProfileClick(comment.userId)
                                      }
                                    />
                                  )}
                                </ListItemAvatar>
                                <Box>
                                  <Typography variant="body2">
                                    {systemUser?.displayName ||
                                      comment.user.displayName ||
                                      "不明なユーザー"}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
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

      <Dialog
        open={profileDialogOpen}
        onClose={handleProfileClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {selectedProfile && (
              <>
                <Avatar
                  src={getUserInfo(selectedProfile)?.photoURL}
                  sx={{ width: 80, height: 80 }}
                />
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {getUserInfo(selectedProfile)?.displayName ||
                      "不明なユーザー"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getUserInfo(selectedProfile)?.email}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProfile && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ flexGrow: 1 }}>
                <WorkoutStats
                  workouts={allWorkouts.filter(
                    (workout) => workout.userId === selectedProfile
                  )}
                />
                <WorkoutGraphs
                  workouts={allWorkouts.filter(
                    (workout) => workout.userId === selectedProfile
                  )}
                  userId={selectedProfile}
                />
                <WorkoutHistory
                  workouts={allWorkouts.filter(
                    (workout) => workout.userId === selectedProfile
                  )}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProfileClose}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
