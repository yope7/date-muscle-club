import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/store/userStore";

export type LikeUser = { id: string; displayName: string; photoURL?: string };

export type FeedComment = {
  id: string;
  content: string;
  userId: string;
  createdAt: Date;
  user: { displayName: string; photoURL?: string };
};

// Firestore の "in" クエリは最大30件
const IN_QUERY_LIMIT = 30;

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size)
  );

// フィードに表示中のワークアウトのいいね・コメントを購読する。
// ワークアウトIDの集合が変わるたびに、30件ずつの "in" クエリで張り直す
export const useFeedInteractions = (workoutIds: string[]) => {
  const { user } = useAuth();
  const { profile } = useUserStore();
  const [likeUsers, setLikeUsers] = useState<Record<string, LikeUser[]>>({});
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});

  const idsKey = useMemo(
    () => Array.from(new Set(workoutIds)).sort().join(","),
    [workoutIds]
  );

  useEffect(() => {
    if (!user || !idsKey) return;

    const unsubscribes = chunk(idsKey.split(","), IN_QUERY_LIMIT).flatMap(
      (ids) => {
        const emptyMap = <T,>() =>
          Object.fromEntries(ids.map((id) => [id, [] as T[]]));

        const unsubscribeLikes = onSnapshot(
          query(collection(db, "likes"), where("workoutId", "in", ids)),
          (snapshot) => {
            const byWorkout = emptyMap<LikeUser>();
            snapshot.forEach((d) => {
              const data = d.data();
              byWorkout[data.workoutId]?.push({
                id: data.userId,
                displayName: data.user?.displayName || "ユーザー",
                photoURL: data.user?.photoURL,
              });
            });
            setLikeUsers((prev) => ({ ...prev, ...byWorkout }));
          },
          (error) => console.error("Error subscribing likes:", error)
        );

        const unsubscribeComments = onSnapshot(
          query(collection(db, "comments"), where("workoutId", "in", ids)),
          (snapshot) => {
            const byWorkout = emptyMap<FeedComment>();
            snapshot.forEach((d) => {
              const data = d.data();
              byWorkout[data.workoutId]?.push({
                id: d.id,
                content: data.content,
                userId: data.userId,
                // 投稿直後はサーバー時刻が未確定なので現在時刻で表示する
                createdAt: data.createdAt?.toDate?.() ?? new Date(),
                user: data.user ?? { displayName: "ユーザー" },
              });
            });
            Object.values(byWorkout).forEach((list) =>
              list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            );
            setComments((prev) => ({ ...prev, ...byWorkout }));
          },
          (error) => console.error("Error subscribing comments:", error)
        );

        return [unsubscribeLikes, unsubscribeComments];
      }
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [user, idsKey]);

  const currentUserInfo = useCallback(
    () => ({
      displayName:
        profile?.displayName ||
        user?.displayName ||
        user?.email?.split("@")[0] ||
        "ユーザー",
      photoURL: profile?.photoURL || user?.photoURL || null,
    }),
    [profile, user]
  );

  const isLikedByMe = useCallback(
    (workoutId: string) =>
      !!user && (likeUsers[workoutId] ?? []).some((u) => u.id === user.uid),
    [likeUsers, user]
  );

  const toggleLike = useCallback(
    async (workoutId: string) => {
      if (!user) return;
      if (isLikedByMe(workoutId)) {
        // 以前はランダムIDで保存していたため、条件で探して削除する
        const snapshot = await getDocs(
          query(
            collection(db, "likes"),
            where("workoutId", "==", workoutId),
            where("userId", "==", user.uid)
          )
        );
        await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
      } else {
        // IDを固定して二重いいねを防ぐ
        await setDoc(doc(db, "likes", `${workoutId}_${user.uid}`), {
          workoutId,
          userId: user.uid,
          createdAt: serverTimestamp(),
          user: currentUserInfo(),
        });
      }
    },
    [user, isLikedByMe, currentUserInfo]
  );

  const addComment = useCallback(
    async (workoutId: string, content: string) => {
      if (!user) return;
      await addDoc(collection(db, "comments"), {
        workoutId,
        userId: user.uid,
        content,
        createdAt: serverTimestamp(),
        user: currentUserInfo(),
      });
    },
    [user, currentUserInfo]
  );

  const deleteComment = useCallback(async (commentId: string) => {
    await deleteDoc(doc(db, "comments", commentId));
  }, []);

  return {
    likeUsers,
    comments,
    isLikedByMe,
    toggleLike,
    addComment,
    deleteComment,
  };
};
