import { create } from "zustand";
import { WorkoutRecord } from "@/types/workout";
import { useAuth } from "@/hooks/useAuth";
import {
  addWorkout,
  updateWorkout,
  deleteWorkout,
  resetUserData,
} from "@/lib/firestore";
import {
  collection,
  query,
  orderBy,
  where,
  Timestamp,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toWorkoutRecord } from "@/lib/workoutConverter";
import { notifyWorkoutSaved } from "@/lib/apiClient";
import { getCalendarRange } from "@/lib/calendarRange";

const FEED_PAGE_SIZE = 50;
const FEED_DAYS = 14;

interface WorkoutState {
  workouts: WorkoutRecord[]; // カレンダーで表示中の月のデータ
  feedWorkouts: WorkoutRecord[]; // フィード専用のデータ
  myPageWorkouts: WorkoutRecord[]; // マイページ専用のデータ（全期間）
  friendWorkouts: WorkoutRecord[];
  // 画面ごとに別のローディング状態を持つ（共有すると他画面の取得でスピナーが出る）
  isFeedLoading: boolean;
  isMyPageLoading: boolean;
  isCalendarLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMoreWorkouts: boolean;
  lastWorkoutDoc: QueryDocumentSnapshot | null;
  myPageLoadedFor: string | null;
  fetchWorkouts: (userId: string, loadMore?: boolean) => Promise<void>;
  fetchWorkoutsByMonth: (userId: string, date: Date) => Promise<void>;
  // 全期間を読むため、取得済みなら force しない限り再取得しない
  fetchMyPageWorkouts: (
    userId: string,
    options?: { force?: boolean }
  ) => Promise<void>;
  fetchFriendWorkouts: (friendIds: string[]) => Promise<void>;
  loadMoreWorkouts: (userId: string) => Promise<void>;
  addWorkout: (workout: WorkoutRecord) => Promise<WorkoutRecord | undefined>;
  updateWorkout: (workout: WorkoutRecord) => Promise<void>;
  // monthDate: 削除後に取り直すカレンダーの表示月
  deleteWorkout: (id: string, monthDate: Date) => Promise<void>;
  resetData: () => Promise<void>;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// 保存した記録を各画面の一覧へ反映する（同じ日の記録があれば置き換え）
const upsertByDay = (list: WorkoutRecord[], workout: WorkoutRecord) => {
  const day = workout.date.toDate();
  const index = list.findIndex(
    (w) => w.id === workout.id || isSameDay(w.date.toDate(), day)
  );
  if (index >= 0) {
    const next = [...list];
    next[index] = workout;
    return next;
  }
  return [workout, ...list].sort(
    (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
  );
};

// 月を素早く切り替えた時に古いレスポンスで上書きしないよう、最新リクエストのみ反映する
let monthRequestSeq = 0;

export const useWorkoutStore = create<WorkoutState>()((set, get) => ({
  workouts: [],
  feedWorkouts: [],
  myPageWorkouts: [],
  friendWorkouts: [],
  isFeedLoading: false,
  isMyPageLoading: false,
  isCalendarLoading: false,
  isLoadingMore: false,
  error: null,
  hasMoreWorkouts: true,
  lastWorkoutDoc: null,
  myPageLoadedFor: null,

  fetchWorkouts: async (userId: string, loadMore: boolean = false) => {
    if (loadMore) {
      set({ isLoadingMore: true, error: null });
    } else {
      set({ isFeedLoading: true, error: null });
    }

    try {
      const workoutsRef = collection(db, "users", userId, "workouts");
      const lastDoc = get().lastWorkoutDoc;
      // 1件多く取得して、続きがあるかを判定する
      const q =
        loadMore && lastDoc
          ? query(
              workoutsRef,
              orderBy("date", "desc"),
              startAfter(lastDoc),
              limit(FEED_PAGE_SIZE + 1)
            )
          : query(
              workoutsRef,
              where(
                "date",
                ">=",
                Timestamp.fromDate(
                  new Date(Date.now() - FEED_DAYS * 24 * 60 * 60 * 1000)
                )
              ),
              orderBy("date", "desc"),
              limit(FEED_PAGE_SIZE + 1)
            );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.slice(0, FEED_PAGE_SIZE);
      const workoutData = docs.map((d) => toWorkoutRecord(d.id, d.data()));
      const pageHasMore = snapshot.docs.length > FEED_PAGE_SIZE;

      if (loadMore) {
        set((state) => ({
          feedWorkouts: [...state.feedWorkouts, ...workoutData],
          lastWorkoutDoc: docs[docs.length - 1] ?? state.lastWorkoutDoc,
          hasMoreWorkouts: pageHasMore,
          isLoadingMore: false,
        }));
      } else {
        set({
          feedWorkouts: workoutData,
          lastWorkoutDoc: docs[docs.length - 1] ?? null,
          // 初回は2週間分に絞っているので、それより古い記録は「さらに読み込む」で取得する
          hasMoreWorkouts: true,
          isFeedLoading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching workouts:", error);
      set({
        error: "データの取得中にエラーが発生しました",
        isFeedLoading: false,
        isLoadingMore: false,
      });
    }
  },

  loadMoreWorkouts: async (userId: string) => {
    if (get().isLoadingMore || !get().hasMoreWorkouts) return;
    await get().fetchWorkouts(userId, true);
  },

  fetchMyPageWorkouts: async (userId: string, options) => {
    if (!options?.force && get().myPageLoadedFor === userId) return;
    set({ isMyPageLoading: true, error: null });
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "users", userId, "workouts"),
          orderBy("date", "desc")
        )
      );
      set({
        myPageWorkouts: snapshot.docs.map((d) =>
          toWorkoutRecord(d.id, d.data())
        ),
        myPageLoadedFor: userId,
        isMyPageLoading: false,
      });
    } catch (error) {
      console.error("Error fetching my page workouts:", error);
      set({
        myPageWorkouts: [],
        error: "データの取得中にエラーが発生しました",
        isMyPageLoading: false,
      });
    }
  },

  fetchWorkoutsByMonth: async (userId: string, date: Date) => {
    const requestId = ++monthRequestSeq;
    set({ isCalendarLoading: true, error: null });
    try {
      const { start: startDate, end: endDate } = getCalendarRange(date);

      const snapshot = await getDocs(
        query(
          collection(db, "users", userId, "workouts"),
          where("date", ">=", Timestamp.fromDate(startDate)),
          where("date", "<=", Timestamp.fromDate(endDate)),
          orderBy("date", "desc")
        )
      );

      if (requestId !== monthRequestSeq) return;
      set({
        workouts: snapshot.docs.map((d) => toWorkoutRecord(d.id, d.data())),
        isCalendarLoading: false,
      });
    } catch (error) {
      console.error("Error fetching workouts by month:", error);
      if (requestId !== monthRequestSeq) return;
      set({
        workouts: [],
        error: "データの取得中にエラーが発生しました",
        isCalendarLoading: false,
      });
    }
  },

  fetchFriendWorkouts: async (friendIds: string[]) => {
    if (friendIds.length === 0) {
      set({ friendWorkouts: [] });
      return;
    }

    try {
      const since = Timestamp.fromDate(
        new Date(Date.now() - FEED_DAYS * 24 * 60 * 60 * 1000)
      );
      const perFriend = await Promise.all(
        friendIds.map(async (friendId) => {
          try {
            const snapshot = await getDocs(
              query(
                collection(db, "users", friendId, "workouts"),
                where("date", ">=", since),
                orderBy("date", "desc"),
                limit(FEED_PAGE_SIZE)
              )
            );
            return snapshot.docs.map((d) =>
              toWorkoutRecord(d.id, d.data(), friendId)
            );
          } catch (error) {
            // 相手にフレンド解除されている場合などは読めないのでスキップ
            console.error(`Error fetching workouts of ${friendId}:`, error);
            return [];
          }
        })
      );
      set({
        friendWorkouts: perFriend
          .flat()
          .sort(
            (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
          ),
      });
    } catch (error) {
      console.error("Error fetching friend workouts:", error);
    }
  },

  addWorkout: async (workout: WorkoutRecord) => {
    const user = useAuth.getState().user;
    if (!user) return;

    set({ error: null });
    try {
      const saved = await addWorkout(workout);
      set((state) => ({
        workouts: upsertByDay(state.workouts, saved),
        feedWorkouts: state.feedWorkouts.some((w) => w.id === saved.id)
          ? upsertByDay(state.feedWorkouts, saved)
          : state.feedWorkouts,
        myPageLoadedFor: null,
      }));
      notifyWorkoutSaved(saved.id);
      return saved;
    } catch (error) {
      console.error("Error adding workout:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to add workout",
      });
      throw error;
    }
  },

  updateWorkout: async (workout: WorkoutRecord) => {
    const user = useAuth.getState().user;
    if (!user) return;

    const prevWorkouts = get().workouts;
    // 楽観的にローカル状態を先に反映（体感即応）
    set({
      workouts: prevWorkouts.map((w) => (w.id === workout.id ? workout : w)),
      error: null,
    });
    try {
      await updateWorkout(workout);
      set((state) => ({
        feedWorkouts: state.feedWorkouts.map((w) =>
          w.id === workout.id ? workout : w
        ),
        myPageLoadedFor: null,
      }));
      notifyWorkoutSaved(workout.id);
    } catch (error) {
      console.error("Error updating workout:", error);
      // 失敗時はロールバック
      set({
        workouts: prevWorkouts,
        error:
          error instanceof Error ? error.message : "Failed to update workout",
      });
      throw error;
    }
  },

  deleteWorkout: async (id: string, monthDate: Date) => {
    const user = useAuth.getState().user;
    if (!user) return;

    set({ error: null });
    try {
      await deleteWorkout(user.uid, id);
      set((state) => ({
        feedWorkouts: state.feedWorkouts.filter((w) => w.id !== id),
        myPageLoadedFor: null,
      }));
      await get().fetchWorkoutsByMonth(user.uid, monthDate);
    } catch (error) {
      console.error("Error deleting workout:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete workout",
      });
    }
  },

  resetData: async () => {
    const user = useAuth.getState().user;
    if (!user) return;

    set({ error: null });
    try {
      await resetUserData(user.uid);
      set({
        workouts: [],
        feedWorkouts: [],
        myPageWorkouts: [],
        friendWorkouts: [],
        myPageLoadedFor: null,
        lastWorkoutDoc: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to reset data",
      });
    }
  },
}));
