import { DocumentData } from "firebase/firestore";
import { WorkoutRecord } from "@/types/workout";

// Firestore のワークアウトドキュメントを WorkoutRecord に変換する（全取得経路で共通）
export const toWorkoutRecord = (
  id: string,
  data: DocumentData,
  fallbackUserId?: string
): WorkoutRecord => ({
  id,
  userId: data.userId || fallbackUserId || "",
  name: data.name,
  date: data.date,
  sets: data.sets || [],
  memo: data.memo || "",
  tags: data.tags || [],
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  type: data.type,
  isNewRecord: Boolean(data.isNewRecord),
  isGroupWorkout: data.isGroupWorkout || false,
  groupMembers: data.groupMembers || [],
  groupWorkoutName: data.groupWorkoutName || "",
});
