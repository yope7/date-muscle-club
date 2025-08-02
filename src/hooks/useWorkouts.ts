import { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Workout, WorkoutRecord } from "@/types/workout";

// ページネーション設定
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface UseWorkoutsOptions {
  pageSize?: number;
  enablePagination?: boolean;
  enableRealTime?: boolean;
  maxPages?: number;
}

export interface UseWorkoutsReturn {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clearCache: () => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
  };
}

// キャッシュ管理
interface WorkoutCache {
  data: Workout[];
  timestamp: number;
  userId: string;
  pageSize: number;
}

let workoutCache: WorkoutCache | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2分

const isCacheValid = (
  cache: WorkoutCache | null,
  userId: string,
  pageSize: number
): boolean => {
  if (!cache) return false;
  if (cache.userId !== userId || cache.pageSize !== pageSize) return false;
  const now = Date.now();
  return now - cache.timestamp < CACHE_DURATION;
};

const clearWorkoutCache = (): void => {
  workoutCache = null;
};

export const useWorkouts = (
  options: UseWorkoutsOptions = {}
): UseWorkoutsReturn => {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    enablePagination = true,
    enableRealTime = true,
    maxPages = 5,
  } = options;

  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // メモ化されたクエリ設定
  const queryConfig = useMemo(() => {
    if (!user) return null;

    const workoutsRef = collection(db, "users", user.uid, "workouts");
    const baseQuery = query(
      workoutsRef,
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    if (enablePagination) {
      return query(baseQuery, limit(pageSize));
    }

    return query(baseQuery, limit(MAX_PAGE_SIZE));
  }, [user, enablePagination, pageSize]);

  // データ変換のメモ化
  const transformWorkoutData = useCallback(
    (doc: QueryDocumentSnapshot<DocumentData>): Workout => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        date: data.date.toDate(),
        sets: data.sets,
        memo: data.memo,
        tags: data.tags,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Workout;
    },
    []
  );

  // ワークアウトデータの取得（最適化版）
  const fetchWorkouts = useCallback(
    async (isInitial = true) => {
      if (!user || !queryConfig) return;

      setLoading(true);
      setError(null);

      try {
        // キャッシュチェック
        if (isInitial && isCacheValid(workoutCache, user.uid, pageSize)) {
          setWorkouts(workoutCache!.data);
          setLoading(false);
          return;
        }

        let currentQuery = queryConfig;

        // ページネーションの場合、前回のドキュメントから開始
        if (!isInitial && lastDoc && enablePagination) {
          currentQuery = query(queryConfig, startAfter(lastDoc));
        }

        let snapshot: any;
        let unsubscribe: (() => void) | null = null;

        if (enableRealTime) {
          // リアルタイム更新の場合
          snapshot = await new Promise((resolve, reject) => {
            unsubscribe = onSnapshot(currentQuery, resolve, reject);
          });
        } else {
          // 一度だけ取得の場合
          const { getDocs } = await import("firebase/firestore");
          snapshot = await getDocs(currentQuery);
        }

        const newWorkouts = snapshot.docs.map(transformWorkoutData);

        if (isInitial) {
          setWorkouts(newWorkouts);
          setCurrentPage(1);
        } else {
          setWorkouts((prev) => [...prev, ...newWorkouts]);
          setCurrentPage((prev) => prev + 1);
        }

        // ページネーション情報の更新
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === pageSize && currentPage < maxPages);
        setTotalItems((prev) =>
          isInitial ? newWorkouts.length : prev + newWorkouts.length
        );

        // キャッシュに保存
        if (isInitial) {
          workoutCache = {
            data: newWorkouts,
            timestamp: Date.now(),
            userId: user.uid,
            pageSize,
          };
        }
      } catch (err) {
        console.error("Error fetching workouts:", err);
        setError("ワークアウトデータの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      queryConfig,
      lastDoc,
      enablePagination,
      pageSize,
      maxPages,
      currentPage,
      enableRealTime,
      transformWorkoutData,
    ]
  );

  // 初期データ取得
  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setLoading(false);
      setHasMore(false);
      setCurrentPage(1);
      setTotalItems(0);
      return;
    }

    fetchWorkouts(true);
  }, [user, fetchWorkouts]);

  // より多くのデータを読み込む
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await fetchWorkouts(false);
  }, [loading, hasMore, fetchWorkouts]);

  // データをリフレッシュ
  const refresh = useCallback(async () => {
    clearWorkoutCache();
    setLastDoc(null);
    setCurrentPage(1);
    setHasMore(true);
    setTotalItems(0);
    await fetchWorkouts(true);
  }, [fetchWorkouts]);

  // キャッシュをクリア
  const clearCache = useCallback(() => {
    clearWorkoutCache();
  }, []);

  // ページネーション情報の計算
  const pagination = useMemo(
    () => ({
      currentPage,
      totalPages: Math.ceil(totalItems / pageSize),
      pageSize,
      totalItems,
    }),
    [currentPage, totalItems, pageSize]
  );

  // メモ化されたワークアウトデータ
  const memoizedWorkouts = useMemo(() => workouts, [workouts]);

  return {
    workouts: memoizedWorkouts,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    clearCache,
    pagination,
  };
};

// 後方互換性のため、既存のシンプルなバージョンも提供
export const useWorkoutsSimple = () => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const workoutsRef = collection(db, "users", user.uid, "workouts");
      const q = query(
        workoutsRef,
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        limit(100)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const workoutData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId,
              date: data.date.toDate(),
              sets: data.sets,
              memo: data.memo,
              tags: data.tags,
              createdAt: data.createdAt.toDate(),
              updatedAt: data.updatedAt.toDate(),
            } as Workout;
          });

          setWorkouts(workoutData);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching workouts:", error);
          setError("ワークアウトデータの取得に失敗しました");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up workouts listener:", error);
      setError("ワークアウトデータの取得に失敗しました");
      setLoading(false);
    }
  }, [user]);

  return { workouts, loading, error };
};
