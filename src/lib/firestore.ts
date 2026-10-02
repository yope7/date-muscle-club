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
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  WorkoutSet,
  WorkoutRecord,
  DayGroupWorkoutInfo,
} from "@/types/workout";
import { toWorkoutRecord } from "./workoutConverter";

const convertWorkoutData = (doc: QueryDocumentSnapshot<DocumentData>) =>
  toWorkoutRecord(doc.id, doc.data());

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
      // 既存のワークアウトがある場合は、まだ保存されていないセットをすべて追加する
      // （以前は最後の1セットだけを追加していたため、まとめて追加すると取りこぼしていた）
      const existingIds = new Set(
        existingWorkout.sets.map((set) => set.id).filter(Boolean)
      );
      const newSets: WorkoutSet[] = workout.sets
        .filter((set) => !set.id || !existingIds.has(set.id))
        .map((set) => ({ ...set, id: set.id || crypto.randomUUID() }));

      const updatedWorkout: WorkoutRecord = {
        ...existingWorkout,
        sets: [...existingWorkout.sets, ...newSets],
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

      // undefined値を除外してFirestoreに保存
      const workoutData: any = {
        userId: workoutWithSetIds.userId,
        name: workoutWithSetIds.name,
        date: workoutWithSetIds.date,
        sets: workoutWithSetIds.sets,
        memo: workoutWithSetIds.memo || "",
        tags: workoutWithSetIds.tags || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 合同トレーニング情報を追加（undefined値を除外）
      if (workoutWithSetIds.isGroupWorkout !== undefined) {
        workoutData.isGroupWorkout = workoutWithSetIds.isGroupWorkout;
      }
      if (
        workoutWithSetIds.groupMembers !== undefined &&
        workoutWithSetIds.groupMembers !== null
      ) {
        workoutData.groupMembers = workoutWithSetIds.groupMembers;
      }
      if (
        workoutWithSetIds.groupWorkoutName !== undefined &&
        workoutWithSetIds.groupWorkoutName !== null
      ) {
        workoutData.groupWorkoutName = workoutWithSetIds.groupWorkoutName;
      }

      const docRef = await addDoc(workoutsRef, workoutData);

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
    if (workout.groupMembers !== undefined && workout.groupMembers !== null) {
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
  try {
    const workoutRef = doc(db, "users", userId, "workouts", id);
    await deleteDoc(workoutRef);
  } catch (error) {
    console.error("Error deleting workout:", error);
    throw error;
  }
};

// ユーザーデータのリセット（ワークアウトと合同トレーニング情報を削除）
const BATCH_LIMIT = 500;

export const resetUserData = async (userId: string): Promise<void> => {
  const snapshots = await Promise.all([
    getDocs(collection(db, "users", userId, "workouts")),
    getDocs(collection(db, "users", userId, "dayGroupWorkouts")),
  ]);
  const refs = snapshots.flatMap((snapshot) => snapshot.docs.map((d) => d.ref));

  // 1回のバッチは500件までなので分割してコミットする
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
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

// 期間内（YYYY-MM-DD 文字列の範囲）の合同トレーニング情報を一括取得
export const getGroupWorkoutInfoInRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<DayGroupWorkoutInfo[]> => {
  try {
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
