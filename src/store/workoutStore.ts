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

interface WorkoutState {
  workouts: WorkoutRecord[];
  loading: boolean;
  error: string | null;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  fetchWorkouts: () => Promise<void>;
  addWorkout: (workout: WorkoutRecord) => Promise<void>;
  updateWorkout: (workout: WorkoutRecord) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  resetData: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workouts: [],
      loading: false,
      error: null,
      selectedDate: null,

      setSelectedDate: (date: Date | null) => {
        set({ selectedDate: date });
        if (date) {
          get().fetchWorkouts();
        }
      },

      fetchWorkouts: async () => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ loading: true, error: null });
        try {
          const workouts = await fetchWorkouts(user.uid);
          set({ workouts, loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch workouts",
            loading: false,
          });
        }
      },

      addWorkout: async (workout: WorkoutRecord) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ loading: true, error: null });
        try {
          const newWorkout = await addWorkout(workout);
          await get().fetchWorkouts();
          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to add workout",
            loading: false,
          });
        }
      },

      updateWorkout: async (workout: WorkoutRecord) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ loading: true, error: null });
        try {
          await updateWorkout(workout);
          await get().fetchWorkouts();
          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to update workout",
            loading: false,
          });
        }
      },

      deleteWorkout: async (id: string) => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ loading: true, error: null });
        try {
          await deleteWorkout(user.uid, id);
          await get().fetchWorkouts();
          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to delete workout",
            loading: false,
          });
        }
      },

      resetData: async () => {
        const user = useAuth.getState().user;
        if (!user) return;

        set({ loading: true, error: null });
        try {
          await resetUserData(user.uid);
          set({ workouts: [], loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : "Failed to reset data",
            loading: false,
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
