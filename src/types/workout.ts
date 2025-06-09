import { Timestamp } from "firebase/firestore";

export interface WorkoutSet {
  weight: number;
  reps: number;
}

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

export type WorkoutRecord = {
  id: string;
  userId: string;
  date: Timestamp;
  sets: WorkoutSet[];
  memo?: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type User = {
  id: string;
  email: string;
  name: string;
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
};
