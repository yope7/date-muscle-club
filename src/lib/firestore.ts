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
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Workout,
  WorkoutSet,
  WorkoutRecord,
  DayGroupWorkoutInfo,
} from "@/types/workout";

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
    // 合同トレーニング情報を追加
    isGroupWorkout: data.isGroupWorkout || false,
    groupMembers: data.groupMembers || [],
    groupWorkoutName: data.groupWorkoutName || "",
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
      const newSet = workout.sets[workout.sets.length - 1];
      const newSetWithId: WorkoutSet = {
        ...newSet,
        id: newSet.id || crypto.randomUUID(), // 新しいセットにIDがなければ付与
      };

      const updatedWorkout: WorkoutRecord = {
        ...existingWorkout,
        // 既存のセットと、IDを付与した新しいセットをマージ
        sets: [...existingWorkout.sets, newSetWithId],
        memo: workout.memo || existingWorkout.memo,
        tags: [...new Set([...existingWorkout.tags, ...workout.tags])],
        // 合同トレーニング情報を保持（新しい情報がある場合は更新）
        isGroupWorkout:
          workout.isGroupWorkout !== undefined
            ? workout.isGroupWorkout
            : existingWorkout.isGroupWorkout,
        groupMembers:
          workout.groupMembers !== undefined
            ? workout.groupMembers
            : existingWorkout.groupMembers,
        groupWorkoutName:
          workout.groupWorkoutName !== undefined
            ? workout.groupWorkoutName
            : existingWorkout.groupWorkoutName,
        updatedAt: Timestamp.fromDate(new Date()),
      };
      await updateWorkout(updatedWorkout);
      return updatedWorkout;
    } else {
      // 新規作成
      const setsWithIds = workout.sets.map(
        (set) =>
          ({
            ...set,
            id: set.id || crypto.randomUUID(), // 各セットにIDがなければ付与
          } as WorkoutSet)
      );
      const workoutWithSetIds = { ...workout, sets: setsWithIds };

      const workoutsRef = collection(db, "users", workout.userId, "workouts");
      const docRef = await addDoc(workoutsRef, {
        ...workoutWithSetIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        ...workoutWithSetIds,
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
    const updateData: any = {
      name: workout.name,
      sets: workout.sets,
      memo: workout.memo,
      tags: workout.tags,
      updatedAt: serverTimestamp(),
    };

    // 合同トレーニング情報を追加（undefined値を除外）
    if (workout.isGroupWorkout !== undefined) {
      updateData.isGroupWorkout = workout.isGroupWorkout;
    }
    if (workout.groupMembers !== undefined) {
      updateData.groupMembers = workout.groupMembers;
    }
    if (
      workout.groupWorkoutName !== undefined &&
      workout.groupWorkoutName !== null
    ) {
      updateData.groupWorkoutName = workout.groupWorkoutName;
    }

    await updateDoc(workoutRef, updateData);
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

// 日付レベルの合同トレーニング情報を保存
export const saveDayGroupWorkoutInfo = async (
  userId: string,
  date: string,
  groupWorkoutInfo: Omit<DayGroupWorkoutInfo, "updatedAt">
): Promise<void> => {
  try {
    const dayGroupWorkoutRef = doc(
      db,
      "users",
      userId,
      "dayGroupWorkouts",
      date
    );

    // undefined値を除外してFirestoreに保存
    const dataToSave: any = {
      date: groupWorkoutInfo.date,
      isGroupWorkout: groupWorkoutInfo.isGroupWorkout,
      groupMembers: groupWorkoutInfo.groupMembers || [],
      updatedAt: serverTimestamp(),
    };

    // groupWorkoutNameが存在し、undefinedでない場合のみ追加
    if (
      groupWorkoutInfo.groupWorkoutName !== undefined &&
      groupWorkoutInfo.groupWorkoutName !== null
    ) {
      dataToSave.groupWorkoutName = groupWorkoutInfo.groupWorkoutName;
    }

    await setDoc(dayGroupWorkoutRef, dataToSave);
    console.log(
      `日付 ${date} の合同トレーニング情報を保存しました:`,
      dataToSave
    );
  } catch (error) {
    console.error("Error saving day group workout info:", error);
    throw error;
  }
};

// 日付レベルの合同トレーニング情報を取得
export const getDayGroupWorkoutInfo = async (
  userId: string,
  date: string
): Promise<DayGroupWorkoutInfo | null> => {
  try {
    const dayGroupWorkoutRef = doc(
      db,
      "users",
      userId,
      "dayGroupWorkouts",
      date
    );
    const docSnap = await getDoc(dayGroupWorkoutRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // データの整合性チェック: groupMembersが存在する場合は合同トレーニングとして認識
      const groupMembers = data.groupMembers || [];
      const isGroupWorkout = data.isGroupWorkout || groupMembers.length > 0;

      return {
        date: data.date,
        isGroupWorkout: isGroupWorkout,
        groupMembers: groupMembers,
        groupWorkoutName: data.groupWorkoutName,
        updatedAt: data.updatedAt,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting day group workout info:", error);
    return null;
  }
};

// 月の合同トレーニング情報を一括取得
export const getMonthGroupWorkoutInfo = async (
  userId: string,
  year: number,
  month: number
): Promise<DayGroupWorkoutInfo[]> => {
  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const dayGroupWorkoutsRef = collection(
      db,
      "users",
      userId,
      "dayGroupWorkouts"
    );
    const q = query(
      dayGroupWorkoutsRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();

      // データの整合性チェック: groupMembersが存在する場合は合同トレーニングとして認識
      const groupMembers = data.groupMembers || [];
      const isGroupWorkout = data.isGroupWorkout || groupMembers.length > 0;

      return {
        date: data.date,
        isGroupWorkout: isGroupWorkout,
        groupMembers: groupMembers,
        groupWorkoutName: data.groupWorkoutName,
        updatedAt: data.updatedAt,
      };
    });
  } catch (error) {
    console.error("Error getting month group workout info:", error);
    return [];
  }
};
