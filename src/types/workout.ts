import { Timestamp } from "firebase/firestore";

export type WorkoutSet = {
  weight: number;
  reps: number;
  workoutType?: string;
};

export interface Workout {
  id: string;
  userId: string;
  date: Date;
  sets: WorkoutSet[];
  memo?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type WorkoutType = "strength" | "cardio";

export type WorkoutRecord = {
  id?: string;
  userId: string;
  date: Timestamp;
  sets: WorkoutSet[];
  memo?: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  type?: WorkoutType;
  name: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
};
