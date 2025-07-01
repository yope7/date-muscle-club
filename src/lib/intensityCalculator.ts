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

/**
 * ワークアウトタイプごとの最大重量を計算
 */
export const calculateMaxWeights = (workouts: WorkoutRecord[]): MaxWeights => {
  const maxWeights: MaxWeights = {};

  workouts.forEach((workout) => {
    workout.sets.forEach((set) => {
      const workoutType = set.workoutType || workout.name || "不明";
      if (!maxWeights[workoutType]) {
        maxWeights[workoutType] = 0;
      }
      maxWeights[workoutType] = Math.max(maxWeights[workoutType], set.weight);
    });
  });

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
 * ワークアウト全体の強度を計算
 */
export const calculateWorkoutIntensity = (
  workout: WorkoutRecord,
  maxWeights: MaxWeights
): IntensityResult[] => {
  return workout.sets.map((set) => {
    const workoutType = set.workoutType || workout.name || "不明";
    return calculateSetIntensity(set, workoutType, maxWeights);
  });
};

/**
 * 日別の強度合計を計算
 */
export const calculateDailyIntensities = (
  workouts: WorkoutRecord[]
): DailyIntensity[] => {
  const maxWeights = calculateMaxWeights(workouts);
  const dailyIntensities: { [date: string]: DailyIntensity } = {};

  workouts.forEach((workout) => {
    const dateKey = workout.date.toDate().toDateString();
    const workoutIntensities = calculateWorkoutIntensity(workout, maxWeights);

    if (!dailyIntensities[dateKey]) {
      dailyIntensities[dateKey] = {
        date: workout.date.toDate(),
        totalIntensity: 0,
        workoutTypes: [],
        details: [],
      };
    }

    const dailyIntensity = dailyIntensities[dateKey];
    dailyIntensity.totalIntensity += workoutIntensities.reduce(
      (sum, intensity) => sum + intensity.intensity,
      0
    );
    dailyIntensity.details.push(...workoutIntensities);

    // ユニークなワークアウトタイプを追加
    workoutIntensities.forEach((intensity) => {
      if (!dailyIntensity.workoutTypes.includes(intensity.workoutType)) {
        dailyIntensity.workoutTypes.push(intensity.workoutType);
      }
    });
  });

  return Object.values(dailyIntensities).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
};

/**
 * 特定の日付の最大重量を計算
 */
export const calculateMaxWeightsForDate = (
  workouts: WorkoutRecord[],
  targetDate: Date
): MaxWeights => {
  const maxWeights: MaxWeights = {};
  const targetDateKey = targetDate.toDateString();

  const dayWorkouts = workouts.filter(
    (workout) => workout.date.toDate().toDateString() === targetDateKey
  );

  dayWorkouts.forEach((workout) => {
    workout.sets.forEach((set) => {
      const workoutType = set.workoutType || workout.name || "不明";
      if (!maxWeights[workoutType]) {
        maxWeights[workoutType] = 0;
      }
      maxWeights[workoutType] = Math.max(maxWeights[workoutType], set.weight);
    });
  });

  return maxWeights;
};

/**
 * 特定の日付の強度を計算（その日の最大重量のみを使用）
 */
export const calculateIntensityForDate = (
  workouts: WorkoutRecord[],
  targetDate: Date
): DailyIntensity | null => {
  const targetDateKey = targetDate.toDateString();

  const dayWorkouts = workouts.filter(
    (workout) => workout.date.toDate().toDateString() === targetDateKey
  );

  if (dayWorkouts.length === 0) {
    return null;
  }

  // その日の最大重量を計算
  const dayMaxWeights = calculateMaxWeightsForDate(workouts, targetDate);

  const totalIntensity = dayWorkouts.reduce((sum, workout) => {
    const workoutIntensities = calculateWorkoutIntensity(
      workout,
      dayMaxWeights
    );
    return (
      sum +
      workoutIntensities.reduce(
        (workoutSum, intensity) => workoutSum + intensity.intensity,
        0
      )
    );
  }, 0);

  const details = dayWorkouts.flatMap((workout) =>
    calculateWorkoutIntensity(workout, dayMaxWeights)
  );

  const workoutTypes = [...new Set(details.map((d) => d.workoutType))];

  return {
    date: targetDate,
    totalIntensity,
    workoutTypes,
    details,
  };
};

/**
 * 強度の合計を取得（全期間）
 */
export const getTotalIntensity = (workouts: WorkoutRecord[]): number => {
  const maxWeights = calculateMaxWeights(workouts);

  return workouts.reduce((total, workout) => {
    const workoutIntensities = calculateWorkoutIntensity(workout, maxWeights);
    return (
      total +
      workoutIntensities.reduce(
        (sum, intensity) => sum + intensity.intensity,
        0
      )
    );
  }, 0);
};

/**
 * 平均強度を取得
 */
export const getAverageIntensity = (workouts: WorkoutRecord[]): number => {
  const totalIntensity = getTotalIntensity(workouts);
  const totalSets = workouts.reduce(
    (sum, workout) => sum + workout.sets.length,
    0
  );

  return totalSets > 0 ? totalIntensity / totalSets : 0;
};

/**
 * 日別強度を考慮した平均強度を取得（nullの日を除外）
 */
export const getAverageIntensityExcludingNullDays = (
  workouts: WorkoutRecord[]
): number => {
  if (workouts.length === 0) return 0;

  // 日別の強度を計算
  const dailyIntensities = calculateDailyIntensities(workouts);

  // 強度が0より大きい日のみをフィルタリング
  const validDays = dailyIntensities.filter((day) => day.totalIntensity > 0);

  if (validDays.length === 0) return 0;

  // 有効な日の平均強度を計算
  const totalDailyIntensity = validDays.reduce(
    (sum, day) => sum + day.totalIntensity,
    0
  );
  return totalDailyIntensity / validDays.length;
};

/**
 * 初回トレーニングからの経過日数を計算
 */
export const getDaysSinceFirstWorkout = (workouts: WorkoutRecord[]): number => {
  if (workouts.length === 0) return 0;

  // 最も古いトレーニング日を取得
  const oldestWorkout = workouts.reduce((oldest, workout) => {
    return workout.date.toDate() < oldest.date.toDate() ? workout : oldest;
  });

  const firstWorkoutDate = oldestWorkout.date.toDate();
  const today = new Date();

  // 日付の差分を計算（時間を無視）
  const timeDiff = today.getTime() - firstWorkoutDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

  return daysDiff;
};
