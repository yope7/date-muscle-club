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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Unsubscribe } from "firebase/auth";

interface WorkoutState {
  workouts: WorkoutRecord[];
  friendWorkouts: WorkoutRecord[];
  isLoading: boolean;
  error: string | null;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  fetchWorkouts: (userId: string) => Promise<Unsubscribe | undefined>;
  fetchFriendWorkouts: (friendIds: string[]) => Promise<void>;
  addWorkout: (workout: WorkoutRecord) => Promise<void>;
  updateWorkout: (workout: WorkoutRecord) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      friendWorkouts: [],
      isLoading: false,
      error: null,
      selectedDate: null,

      setSelectedDate: (date: Date | null) => {
        set({ selectedDate: date });
        if (date) {
          get().fetchWorkouts(useAuth.getState().user?.uid || "");
        }
      },

      fetchWorkouts: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const q = query(
            collection(db, "users", userId, "workouts"),
            orderBy("date", "desc")
          );

          const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const workoutData: WorkoutRecord[] = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                workoutData.push({
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
              set({ workouts: workoutData, isLoading: false });
            },
            (error) => {
              console.error("Error fetching workouts:", error);
              set({
                error: "データの取得中にエラーが発生しました",
                isLoading: false,
              });
            }
          );

          return unsubscribe;
        } catch (error) {
          set({
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
          const workouts: WorkoutRecord[] = [];
          const promises = friendIds.map(async (friendId) => {
            const q = query(
              collection(db, "users", friendId, "workouts"),
              orderBy("date", "desc")
            );

            const snapshot = await getDocs(q);
            snapshot.forEach((doc) => {
              const data = doc.data();
              workouts.push({
                id: doc.id,
                userId: friendId,
                date: data.date,
                sets: data.sets,
                memo: data.memo || "",
                tags: data.tags || [],
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
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
          await get().fetchWorkouts(user.uid);
          set({ isLoading: false });
        } catch (error) {
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
          await get().fetchWorkouts(user.uid);
          set({ isLoading: false });
        } catch (error) {
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
          await get().fetchWorkouts(user.uid);
          set({ isLoading: false });
        } catch (error) {
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
