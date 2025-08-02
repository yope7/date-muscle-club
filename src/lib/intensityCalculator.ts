import { WorkoutRecord, WorkoutSet } from "@/types/workout";

// 各ワークアウトタイプの最大重量を管理する型
export type MaxWeights = {
  [workoutType: string]: number;
};

// 強度計算結果の型
export type IntensityResult = {
  workoutType: string;
  intensity: number;
  currentWeight: number;
  maxWeight: number;
  reps: number;
  percentage: number;
};

// 日別の強度合計の型
export type DailyIntensity = {
  date: Date;
  totalIntensity: number;
  workoutTypes: string[];
  details: IntensityResult[];
};

// キャッシュ管理用の型
export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  hash: string;
};

export type IntensityCache = {
  maxWeights: CacheEntry<MaxWeights> | null;
  dailyIntensities: CacheEntry<DailyIntensity[]> | null;
  totalIntensity: CacheEntry<number> | null;
  averageIntensity: CacheEntry<number> | null;
};

// キャッシュの有効期限（ミリ秒）
const CACHE_DURATION = 5 * 60 * 1000; // 5分

// グローバルキャッシュインスタンス
let globalCache: IntensityCache = {
  maxWeights: null,
  dailyIntensities: null,
  totalIntensity: null,
  averageIntensity: null,
};

/**
 * データのハッシュを生成（キャッシュキーとして使用）
 */
const generateHash = (workouts: WorkoutRecord[]): string => {
  if (workouts.length === 0) return "empty";

  // ワークアウトのIDと更新日時を組み合わせてハッシュを生成
  const hashData = workouts.map((workout) => ({
    id: workout.id,
    updatedAt: workout.updatedAt.toMillis(),
    setsCount: workout.sets.length,
  }));

  return JSON.stringify(hashData);
};

/**
 * キャッシュが有効かどうかをチェック
 */
const isCacheValid = <T>(entry: CacheEntry<T> | null): boolean => {
  if (!entry) return false;
  const now = Date.now();
  return now - entry.timestamp < CACHE_DURATION;
};

/**
 * キャッシュをクリア
 */
export const clearIntensityCache = (): void => {
  globalCache = {
    maxWeights: null,
    dailyIntensities: null,
    totalIntensity: null,
    averageIntensity: null,
  };
};

/**
 * ワークアウトタイプごとの最大重量を計算（キャッシュ付き）
 */
export const calculateMaxWeights = (workouts: WorkoutRecord[]): MaxWeights => {
  const hash = generateHash(workouts);

  // キャッシュが有効な場合はキャッシュから返す
  if (
    isCacheValid(globalCache.maxWeights) &&
    globalCache.maxWeights?.hash === hash
  ) {
    return globalCache.maxWeights.data;
  }

  const maxWeights: MaxWeights = {};

  // 最適化された計算：一度のループで最大重量を計算
  for (const workout of workouts) {
    for (const set of workout.sets) {
      const workoutType = set.workoutType || workout.name || "不明";
      if (!maxWeights[workoutType]) {
        maxWeights[workoutType] = set.weight;
      } else {
        maxWeights[workoutType] = Math.max(maxWeights[workoutType], set.weight);
      }
    }
  }

  // キャッシュに保存
  globalCache.maxWeights = {
    data: maxWeights,
    timestamp: Date.now(),
    hash,
  };

  return maxWeights;
};

/**
 * 単一セットの強度を計算
 * 強度 = (現在の重量 / 最大重量) × リップ数
 */
export const calculateSetIntensity = (
  set: WorkoutSet,
  workoutType: string,
  maxWeights: MaxWeights
): IntensityResult => {
  const maxWeight = maxWeights[workoutType] || 1; // 0除算を防ぐため1をデフォルト値に
  const percentage = maxWeight > 0 ? (set.weight / maxWeight) * 100 : 0;
  const intensity = (set.weight / maxWeight) * set.reps;

  return {
    workoutType,
    intensity,
    currentWeight: set.weight,
    maxWeight,
    reps: set.reps,
    percentage,
  };
};

/**
 * ワークアウト全体の強度を計算（最適化版）
 */
export const calculateWorkoutIntensity = (
  workout: WorkoutRecord,
  maxWeights: MaxWeights
): IntensityResult[] => {
  const results: IntensityResult[] = [];

  for (const set of workout.sets) {
    const workoutType = set.workoutType || workout.name || "不明";
    results.push(calculateSetIntensity(set, workoutType, maxWeights));
  }

  return results;
};

/**
 * 日別の強度合計を計算（キャッシュ付き、最適化版）
 */
export const calculateDailyIntensities = (
  workouts: WorkoutRecord[]
): DailyIntensity[] => {
  const hash = generateHash(workouts);

  // キャッシュが有効な場合はキャッシュから返す
  if (
    isCacheValid(globalCache.dailyIntensities) &&
    globalCache.dailyIntensities?.hash === hash
  ) {
    return globalCache.dailyIntensities.data;
  }

  const maxWeights = calculateMaxWeights(workouts);
  const dailyIntensitiesMap = new Map<string, DailyIntensity>();

  // 最適化された計算：一度のループで日別データを構築
  for (const workout of workouts) {
    const dateKey = workout.date.toDate().toDateString();
    const workoutIntensities = calculateWorkoutIntensity(workout, maxWeights);

    if (!dailyIntensitiesMap.has(dateKey)) {
      dailyIntensitiesMap.set(dateKey, {
        date: workout.date.toDate(),
        totalIntensity: 0,
        workoutTypes: [],
        details: [],
      });
    }

    const dailyIntensity = dailyIntensitiesMap.get(dateKey)!;

    // 強度の合計を計算
    let workoutTotalIntensity = 0;
    for (const intensity of workoutIntensities) {
      workoutTotalIntensity += intensity.intensity;
      dailyIntensity.details.push(intensity);

      // ユニークなワークアウトタイプを追加（Setを使用して効率化）
      if (!dailyIntensity.workoutTypes.includes(intensity.workoutType)) {
        dailyIntensity.workoutTypes.push(intensity.workoutType);
      }
    }

    dailyIntensity.totalIntensity += workoutTotalIntensity;
  }

  const result = Array.from(dailyIntensitiesMap.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  // キャッシュに保存
  globalCache.dailyIntensities = {
    data: result,
    timestamp: Date.now(),
    hash,
  };

  return result;
};

/**
 * 特定の日付の最大重量を計算（最適化版）
 */
export const calculateMaxWeightsForDate = (
  workouts: WorkoutRecord[],
  targetDate: Date
): MaxWeights => {
  const maxWeights: MaxWeights = {};
  const targetDateKey = targetDate.toDateString();

  // フィルタリングと計算を一度に行う
  for (const workout of workouts) {
    if (workout.date.toDate().toDateString() === targetDateKey) {
      for (const set of workout.sets) {
        const workoutType = set.workoutType || workout.name || "不明";
        if (!maxWeights[workoutType]) {
          maxWeights[workoutType] = set.weight;
        } else {
          maxWeights[workoutType] = Math.max(
            maxWeights[workoutType],
            set.weight
          );
        }
      }
    }
  }

  return maxWeights;
};

/**
 * 特定の日付の強度を計算（その日の最大重量のみを使用、最適化版）
 */
export const calculateIntensityForDate = (
  workouts: WorkoutRecord[],
  targetDate: Date
): DailyIntensity | null => {
  const targetDateKey = targetDate.toDateString();
  const dayWorkouts: WorkoutRecord[] = [];
  const dayMaxWeights: MaxWeights = {};

  // 一度のループでフィルタリングと最大重量計算を行う
  for (const workout of workouts) {
    if (workout.date.toDate().toDateString() === targetDateKey) {
      dayWorkouts.push(workout);

      for (const set of workout.sets) {
        const workoutType = set.workoutType || workout.name || "不明";
        if (!dayMaxWeights[workoutType]) {
          dayMaxWeights[workoutType] = set.weight;
        } else {
          dayMaxWeights[workoutType] = Math.max(
            dayMaxWeights[workoutType],
            set.weight
          );
        }
      }
    }
  }

  if (dayWorkouts.length === 0) {
    return null;
  }

  let totalIntensity = 0;
  const details: IntensityResult[] = [];
  const workoutTypesSet = new Set<string>();

  // 強度計算
  for (const workout of dayWorkouts) {
    const workoutIntensities = calculateWorkoutIntensity(
      workout,
      dayMaxWeights
    );

    for (const intensity of workoutIntensities) {
      totalIntensity += intensity.intensity;
      details.push(intensity);
      workoutTypesSet.add(intensity.workoutType);
    }
  }

  return {
    date: targetDate,
    totalIntensity,
    workoutTypes: Array.from(workoutTypesSet),
    details,
  };
};

/**
 * 強度の合計を取得（全期間、キャッシュ付き）
 */
export const getTotalIntensity = (workouts: WorkoutRecord[]): number => {
  const hash = generateHash(workouts);

  // キャッシュが有効な場合はキャッシュから返す
  if (
    isCacheValid(globalCache.totalIntensity) &&
    globalCache.totalIntensity?.hash === hash
  ) {
    return globalCache.totalIntensity.data;
  }

  const maxWeights = calculateMaxWeights(workouts);
  let totalIntensity = 0;

  // 最適化された計算
  for (const workout of workouts) {
    const workoutIntensities = calculateWorkoutIntensity(workout, maxWeights);
    for (const intensity of workoutIntensities) {
      totalIntensity += intensity.intensity;
    }
  }

  // キャッシュに保存
  globalCache.totalIntensity = {
    data: totalIntensity,
    timestamp: Date.now(),
    hash,
  };

  return totalIntensity;
};

/**
 * 平均強度を取得（キャッシュ付き）
 */
export const getAverageIntensity = (workouts: WorkoutRecord[]): number => {
  const hash = generateHash(workouts);

  // キャッシュが有効な場合はキャッシュから返す
  if (
    isCacheValid(globalCache.averageIntensity) &&
    globalCache.averageIntensity?.hash === hash
  ) {
    return globalCache.averageIntensity.data;
  }

  const totalIntensity = getTotalIntensity(workouts);
  let totalSets = 0;

  // セット数の計算を最適化
  for (const workout of workouts) {
    totalSets += workout.sets.length;
  }

  const averageIntensity = totalSets > 0 ? totalIntensity / totalSets : 0;

  // キャッシュに保存
  globalCache.averageIntensity = {
    data: averageIntensity,
    timestamp: Date.now(),
    hash,
  };

  return averageIntensity;
};

/**
 * 日別強度を考慮した平均強度を取得（nullの日を除外、最適化版）
 */
export const getAverageIntensityExcludingNullDays = (
  workouts: WorkoutRecord[]
): number => {
  if (workouts.length === 0) return 0;

  // 日別の強度を計算（キャッシュ付き）
  const dailyIntensities = calculateDailyIntensities(workouts);

  // 強度が0より大きい日のみをフィルタリング
  let totalDailyIntensity = 0;
  let validDaysCount = 0;

  for (const day of dailyIntensities) {
    if (day.totalIntensity > 0) {
      totalDailyIntensity += day.totalIntensity;
      validDaysCount++;
    }
  }

  return validDaysCount > 0 ? totalDailyIntensity / validDaysCount : 0;
};

/**
 * 初回トレーニングからの経過日数を計算（最適化版）
 */
export const getDaysSinceFirstWorkout = (workouts: WorkoutRecord[]): number => {
  if (workouts.length === 0) return 0;

  // 最も古いトレーニング日を取得（最適化版）
  let oldestDate = workouts[0].date.toDate();

  for (let i = 1; i < workouts.length; i++) {
    const workoutDate = workouts[i].date.toDate();
    if (workoutDate < oldestDate) {
      oldestDate = workoutDate;
    }
  }

  const today = new Date();
  const timeDiff = today.getTime() - oldestDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

  return daysDiff;
};

// 後方互換性のため、既存の関数をエクスポート
export {
  calculateMaxWeights as calculateMaxWeightsLegacy,
  calculateDailyIntensities as calculateDailyIntensitiesLegacy,
  getTotalIntensity as getTotalIntensityLegacy,
  getAverageIntensity as getAverageIntensityLegacy,
};
