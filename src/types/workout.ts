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
  // 合同トレーニング関連のフィールド（日付レベルで管理）
  isGroupWorkout?: boolean;
  groupMembers?: string[]; // 一緒にトレーニングしたメンバーのユーザーID配列
  groupWorkoutName?: string; // 合同トレーニングの名前（例：「チームA合同トレーニング」）
};

// 日付レベルの合同トレーニング情報
export type DayGroupWorkoutInfo = {
  date: string; // YYYY-MM-DD形式
  isGroupWorkout: boolean;
  groupMembers: string[];
  groupWorkoutName?: string;
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
