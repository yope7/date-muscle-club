"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import { WorkoutRecord } from "@/types/workout";

interface WorkoutStoreContextType {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  workouts: WorkoutRecord[];
  addWorkout: (workout: WorkoutRecord) => void;
}

const WorkoutStoreContext = createContext<WorkoutStoreContextType>({
  selectedDate: null,
  setSelectedDate: () => {},
  workouts: [],
  addWorkout: () => {},
});

export const useWorkoutStore = () => useContext(WorkoutStoreContext);

export const WorkoutStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      return;
    }

    const q = query(
      collection(db, "workouts"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workoutData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...doc.data(),
          id: doc.id,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }) as WorkoutRecord[];

      setWorkouts(workoutData);
    });

    return () => unsubscribe();
  }, [user]);

  const addWorkout = async (workout: WorkoutRecord) => {
    // Firestoreへの保存処理は別途実装
  };

  return (
    <WorkoutStoreContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        workouts,
        addWorkout,
      }}
    >
      {children}
    </WorkoutStoreContext.Provider>
  );
};
