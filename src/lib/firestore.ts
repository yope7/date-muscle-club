import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  writeBatch,
  collectionGroup,
} from "firebase/firestore";
import { db } from "./firebase";
import { Workout, WorkoutSet, WorkoutRecord } from "@/types/workout";

// ワークアウトデータの型変換
const convertWorkoutData = (
  doc: QueryDocumentSnapshot<DocumentData>
): WorkoutRecord => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    name: data.name,
    date: data.date,
    sets: data.sets,
    memo: data.memo || "",
    tags: data.tags || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

// ワークアウトデータの取得
export const fetchWorkouts = async (
  userId: string
): Promise<WorkoutRecord[]> => {
  const workoutsRef = collection(db, "users", userId, "workouts");
  const q = query(workoutsRef, orderBy("date", "desc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertWorkoutData);
};

// ワークアウトデータの追加
export const addWorkout = async (
  workout: WorkoutRecord
): Promise<WorkoutRecord> => {
  try {
    // 同じ日付の既存のワークアウトを確認
    const existingWorkout = await getWorkoutByDate(
      workout.userId,
      workout.date.toDate()
    );

    if (existingWorkout) {
      // 既存のワークアウトがある場合は更新
      const updatedWorkout: WorkoutRecord = {
        ...existingWorkout,
        // 最後の1セットだけを追加
        sets: [...existingWorkout.sets, workout.sets[workout.sets.length - 1]],
        memo: workout.memo || existingWorkout.memo,
        tags: [...new Set([...existingWorkout.tags, ...workout.tags])],
        updatedAt: Timestamp.fromDate(new Date()),
      };
      await updateWorkout(updatedWorkout);
      return updatedWorkout;
    } else {
      // 新規作成
      const workoutsRef = collection(db, "users", workout.userId, "workouts");
      const docRef = await addDoc(workoutsRef, {
        ...workout,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...workout,
        id: docRef.id,
      };
    }
  } catch (error) {
    console.error("Error adding workout:", error);
    throw error;
  }
};

// ワークアウトデータの更新
export const updateWorkout = async (workout: WorkoutRecord): Promise<void> => {
  if (!workout.id) {
    throw new Error("Workout ID is missing");
  }
  try {
    const workoutRef = doc(db, "users", workout.userId, "workouts", workout.id);
    await updateDoc(workoutRef, {
      name: workout.name,
      sets: workout.sets,
      memo: workout.memo,
      tags: workout.tags,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating workout:", error);
    throw error;
  }
};

// ワークアウトデータの削除
export const deleteWorkout = async (
  userId: string,
  id: string
): Promise<void> => {
  const workoutRef = doc(db, "users", userId, "workouts", id);
  await deleteDoc(workoutRef);
};

// ユーザーデータのリセット
export const resetUserData = async (userId: string): Promise<void> => {
  const workoutsRef = collection(db, "users", userId, "workouts");
  const snapshot = await getDocs(workoutsRef);

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

// 特定の日付のワークアウトを取得
export const getWorkoutByDate = async (
  userId: string,
  date: Date
): Promise<WorkoutRecord | null> => {
  try {
    const workoutsRef = collection(db, "users", userId, "workouts");
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      workoutsRef,
      where("date", ">=", Timestamp.fromDate(startOfDay)),
      where("date", "<=", Timestamp.fromDate(endOfDay))
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    // 同じ日付の最新のワークアウトを取得
    const latestWorkout = querySnapshot.docs[0];
    return convertWorkoutData(latestWorkout);
  } catch (error) {
    console.error("Error fetching workout by date:", error);
    throw error;
  }
};

// テストデータの追加
export const addTestWorkout = async (userId: string): Promise<string> => {
  try {
    const workoutData: WorkoutRecord = {
      id: crypto.randomUUID(),
      userId,
      name: "テストワークアウト",
      date: Timestamp.fromDate(new Date()),
      sets: [
        { weight: 60, reps: 10, workoutType: "テスト" },
        { weight: 70, reps: 8, workoutType: "テスト" },
        { weight: 80, reps: 5, workoutType: "テスト" },
      ],
      memo: "テスト記録",
      tags: ["テスト"],
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const workoutsRef = collection(db, "users", userId, "workouts");
    const docRef = await addDoc(workoutsRef, workoutData);
    console.log("テストデータを追加しました:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("テストデータの追加に失敗しました:", error);
    throw error;
  }
};
