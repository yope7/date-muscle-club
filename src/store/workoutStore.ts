import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Workout, WorkoutSet, WorkoutRecord } from "@/types/workout";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchWorkouts,
  addWorkout,
  updateWorkout,
  deleteWorkout,
  resetUserData,
} from "@/lib/firestore";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  Timestamp,
  getDocs,
  QuerySnapshot,
  DocumentData,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Unsubscribe } from "firebase/auth";

interface WorkoutState {
  workouts: WorkoutRecord[];
  feedWorkouts: WorkoutRecord[]; // フィード専用のデータ
  myPageWorkouts: WorkoutRecord[]; // マイページ専用のデータ（全期間）
  friendWorkouts: WorkoutRecord[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  selectedDate: Date | null;
  hasMoreWorkouts: boolean;
  lastWorkoutDoc: QueryDocumentSnapshot | null;
  setSelectedDate: (date: Date | null) => void;
  fetchWorkouts: (
    userId: string,
    loadMore?: boolean
  ) => Promise<Unsubscribe | undefined>;
  fetchWorkoutsByMonth: (userId: string, date: Date) => Promise<void>;
  fetchMyPageWorkouts: (userId: string) => Promise<void>; // マイページ用の全データ取得
  fetchFriendWorkouts: (friendIds: string[]) => Promise<void>;
  loadMoreWorkouts: (userId: string) => Promise<void>;
  addWorkout: (workout: WorkoutRecord) => Promise<void>;
  updateWorkout: (workout: WorkoutRecord) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      feedWorkouts: [], // フィード専用のデータ
      myPageWorkouts: [], // マイページ専用のデータ（全期間）
      friendWorkouts: [],
      isLoading: false,
      isLoadingMore: false,
      error: null,
      selectedDate: null,
      hasMoreWorkouts: true,
      lastWorkoutDoc: null,

      setSelectedDate: (date: Date | null) => {
        set({ selectedDate: date });
        // カレンダーでの日付選択時はfetchWorkoutsを呼び出さない
        // カレンダーはfetchWorkoutsByMonthでデータを管理する
      },

      fetchWorkouts: async (userId: string, loadMore: boolean = false) => {
        if (loadMore) {
          set({ isLoadingMore: true, error: null });
        } else {
          set({ isLoading: true, error: null });
        }

        try {
          let q;
          if (loadMore && get().lastWorkoutDoc) {
            // 追加読み込みの場合：最後のドキュメントからさらに古いデータを取得
            q = query(
              collection(db, "users", userId, "workouts"),
              orderBy("date", "desc"),
              startAfter(get().lastWorkoutDoc),
              limit(50)
            );
          } else {
            // 初回読み込みの場合：2週間前の日付を計算
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

            q = query(
              collection(db, "users", userId, "workouts"),
              where("date", ">=", Timestamp.fromDate(twoWeeksAgo)),
              orderBy("date", "desc"),
              limit(50)
            );
          }

          const snapshot = await getDocs(q);
          const workoutData: WorkoutRecord[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            workoutData.push({
              id: doc.id,
              userId: data.userId,
              name: data.name,
              date: data.date,
              sets: data.sets,
              memo: data.memo || "",
              tags: data.tags || [],
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              type: data.type,
              isNewRecord: Boolean(data.isNewRecord),
            });
          });

          // 最後のドキュメントを保存
          const lastDoc = snapshot.docs[snapshot.docs.length - 1];

          // さらに古いデータが存在するかチェック
          let hasMoreData = false;
          if (lastDoc) {
            try {
              const olderDataQuery = query(
                collection(db, "users", userId, "workouts"),
                where("date", "<", lastDoc.data().date),
                orderBy("date", "desc"),
                limit(1)
              );
              const olderSnapshot = await getDocs(olderDataQuery);
              hasMoreData = !olderSnapshot.empty;
            } catch (error) {
              console.log("Older data check failed:", error);
              hasMoreData = workoutData.length > 0; // フォールバック
            }
          }

          if (loadMore) {
            // 追加読み込みの場合、既存のデータに追加
            set((state) => ({
              feedWorkouts: [...state.feedWorkouts, ...workoutData],
              lastWorkoutDoc: lastDoc,
              hasMoreWorkouts: hasMoreData,
              isLoadingMore: false,
            }));
          } else {
            // 初回読み込みの場合、データを置き換え
            set({
              feedWorkouts: workoutData,
              lastWorkoutDoc: lastDoc,
              hasMoreWorkouts: hasMoreData,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error("Error fetching workouts:", error);
          set({
            error: "データの取得中にエラーが発生しました",
            isLoading: false,
            isLoadingMore: false,
          });
        }

        return undefined;
      },

      loadMoreWorkouts: async (userId: string) => {
        if (get().isLoadingMore || !get().hasMoreWorkouts) return;
        await get().fetchWorkouts(userId, true);
      },

      fetchMyPageWorkouts: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          // 全期間のデータを取得（日付順でソート）
          const q = query(
            collection(db, "users", userId, "workouts"),
            orderBy("date", "desc")
          );

          const snapshot = await getDocs(q);
          const workoutData: WorkoutRecord[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            const workoutRecord = {
              id: doc.id,
              userId: data.userId,
              name: data.name,
              date: data.date,
              sets: data.sets,
              memo: data.memo || "",
              tags: data.tags || [],
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              type: data.type,
              isNewRecord: Boolean(data.isNewRecord),
            };
            workoutData.push(workoutRecord);
          });

          set({
            myPageWorkouts: workoutData,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching my page workouts:", error);
          set({
            myPageWorkouts: [],
            error: "データの取得中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      fetchWorkoutsByMonth: async (userId: string, date: Date) => {
        set({ isLoading: true, error: null });
        try {
          // 指定された月の開始日と終了日を計算
          const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
          const endOfMonth = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );

          // カレンダー表示に必要な全期間を計算
          // 前月の一部（月の最初の日曜日まで）
          const startDate = new Date(startOfMonth);
          startDate.setDate(startDate.getDate() - startDate.getDay());

          // 翌月の一部（月の最後の土曜日まで）
          const endDate = new Date(endOfMonth);
          endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

          const q = query(
            collection(db, "users", userId, "workouts"),
            where("date", ">=", Timestamp.fromDate(startDate)),
            where("date", "<=", Timestamp.fromDate(endDate)),
            orderBy("date", "desc")
          );

          const snapshot = await getDocs(q);
          const workoutData: WorkoutRecord[] = [];

          snapshot.forEach((doc) => {
            const data = doc.data();
            const workoutRecord = {
              id: doc.id,
              userId: data.userId,
              name: data.name,
              date: data.date,
              sets: data.sets,
              memo: data.memo || "",
              tags: data.tags || [],
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              type: data.type,
              isNewRecord: Boolean(data.isNewRecord),
            };
            workoutData.push(workoutRecord);
          });

          // データの整合性チェック
          const currentState = get();
          const hasDataLoss =
            currentState.workouts.length > 0 && workoutData.length === 0;

          if (hasDataLoss) {
            console.log("=== Data Loss Detected in fetchWorkoutsByMonth ===");
            console.log(
              "Previous workouts count:",
              currentState.workouts.length
            );
            console.log("New workouts count:", workoutData.length);
            console.log("Attempting to recover data...");

            // データが消えた場合は、より広い範囲で再取得を試行
            setTimeout(() => {
              get().fetchWorkoutsByMonth(userId, date);
            }, 2000);
          }

          set({
            workouts: workoutData,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching workouts by month:", error);
          // エラーが発生した場合でも空の配列を設定
          set({
            workouts: [],
            error: "データの取得中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      fetchFriendWorkouts: async (friendIds: string[]) => {
        if (friendIds.length === 0) {
          set({ friendWorkouts: [] });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          // 2週間前の日付を計算
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

          const workouts: WorkoutRecord[] = [];
          const promises = friendIds.map(async (friendId) => {
            const q = query(
              collection(db, "users", friendId, "workouts"),
              where("date", ">=", Timestamp.fromDate(twoWeeksAgo)),
              orderBy("date", "desc"),
              limit(50)
            );

            const snapshot = await getDocs(q);
            snapshot.forEach((doc) => {
              const data = doc.data();
              workouts.push({
                id: doc.id,
                userId: friendId,
                name: data.name,
                date: data.date,
                sets: data.sets,
                memo: data.memo || "",
                tags: data.tags || [],
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                type: data.type,
                isNewRecord: Boolean(data.isNewRecord),
              });
            });
          });

          await Promise.all(promises);
          set({
            friendWorkouts: workouts.sort(
              (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime()
            ),
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching friend workouts:", error);
          set({
            error: "フレンドのデータの取得中にエラーが発生しました",
            isLoading: false,
          });
        }
      },

      addWorkout: async (workout: WorkoutRecord) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          const newWorkout = await addWorkout(workout);

          // 追加後に現在の月のデータを再取得
          const currentDate = new Date();
          await get().fetchWorkoutsByMonth(user.uid, currentDate);

          set({ isLoading: false });
        } catch (error) {
          console.error("Error adding workout:", error);
          set({
            error:
              error instanceof Error ? error.message : "Failed to add workout",
            isLoading: false,
          });
        }
      },

      updateWorkout: async (workout: WorkoutRecord) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          await updateWorkout(workout);

          // 更新後に現在の月のデータを再取得
          const currentDate = new Date();
          await get().fetchWorkoutsByMonth(user.uid, currentDate);

          set({ isLoading: false });
        } catch (error) {
          console.error("Error updating workout:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update workout",
            isLoading: false,
          });
        }
      },

      deleteWorkout: async (id: string) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          await deleteWorkout(user.uid, id);

          // 削除後に現在の月のデータを再取得
          const currentDate = new Date();
          await get().fetchWorkoutsByMonth(user.uid, currentDate);

          set({ isLoading: false });
        } catch (error) {
          console.error("Error deleting workout:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to delete workout",
            isLoading: false,
          });
        }
      },

      resetData: async () => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          await resetUserData(user.uid);
          set({ workouts: [], friendWorkouts: [], isLoading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to reset data",
            isLoading: false,
          });
        }
      },
    }),
    {
      name: "workout-storage",
      partialize: (state) => ({
        selectedDate: state.selectedDate,
      }),
    }
  )
);
