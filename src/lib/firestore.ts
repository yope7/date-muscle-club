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
  collectionGroup
} from 'firebase/firestore';
import { db } from './firebase';
import { Workout, WorkoutSet, WorkoutRecord } from '@/types/workout';

// ワークアウトデータの型変換
const convertWorkoutData = (doc: QueryDocumentSnapshot<DocumentData>): WorkoutRecord => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    date: data.date,
    sets: data.sets,
    memo: data.memo || '',
    tags: data.tags || [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

// ワークアウトデータの取得
export const fetchWorkouts = async (userId: string): Promise<WorkoutRecord[]> => {
  const workoutsRef = collection(db, 'users', userId, 'workouts');
  const q = query(
    workoutsRef,
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(convertWorkoutData);
};

// ワークアウトデータの追加
export const addWorkout = async (workout: WorkoutRecord): Promise<WorkoutRecord> => {
  const workoutsRef = collection(db, 'users', workout.userId, 'workouts');
  const docRef = await addDoc(workoutsRef, {
    ...workout,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...workout,
    id: docRef.id,
  };
};

// ワークアウトデータの更新
export const updateWorkout = async (workout: WorkoutRecord): Promise<void> => {
  const workoutRef = doc(db, 'users', workout.userId, 'workouts', workout.id);
  await updateDoc(workoutRef, {
    ...workout,
    updatedAt: serverTimestamp(),
  });
};

// ワークアウトデータの削除
export const deleteWorkout = async (userId: string, id: string): Promise<void> => {
  const workoutRef = doc(db, 'users', userId, 'workouts', id);
  await deleteDoc(workoutRef);
};

// ユーザーデータのリセット
export const resetUserData = async (userId: string): Promise<void> => {
  const workoutsRef = collection(db, 'users', userId, 'workouts');
  const snapshot = await getDocs(workoutsRef);

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

// 特定の日付のワークアウトを取得
export const getWorkoutByDate = async (userId: string, date: Date): Promise<WorkoutRecord | null> => {
  try {
    const workoutsRef = collection(db, 'users', userId, 'workouts');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      workoutsRef,
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay))
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return convertWorkoutData(querySnapshot.docs[0]);
  } catch (error) {
    console.error('Error fetching workout by date:', error);
    throw error;
  }
};

// テストデータの追加
export const addTestWorkout = async (userId: string): Promise<string> => {
  try {
    const workoutData: WorkoutRecord = {
      id: crypto.randomUUID(),
      userId,
      date: Timestamp.fromDate(new Date()),
      sets: [
        { weight: 60, reps: 10 },
        { weight: 70, reps: 8 },
        { weight: 80, reps: 5 },
      ],
      memo: 'テスト記録',
      tags: ['テスト'],
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const workoutsRef = collection(db, 'users', userId, 'workouts');
    const docRef = await addDoc(workoutsRef, workoutData);
    console.log('テストデータを追加しました:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('テストデータの追加に失敗しました:', error);
    throw error;
  }
}; 