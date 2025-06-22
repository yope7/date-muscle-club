import { Timestamp } from "firebase/firestore";

export type WorkoutSet = {
  id?: string;
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
  id: string;
  userId: string;
  name?: string;
  date: Timestamp;
  sets: WorkoutSet[];
  memo?: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  type?: WorkoutType;
  isNewRecord?: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string;
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
};
