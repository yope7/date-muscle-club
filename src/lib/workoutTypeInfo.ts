import { muscleGroups, workoutTypes } from "@/data/workoutTypes";

export type WorkoutTypeInfo = {
  name: string;
  muscleGroup: string; // 部位の表示名（不明な場合は「不明」）
  muscleGroupId: string; // 部位ID（不明な場合は "unknown"）
  color: string; // MUIのテーマカラー名
};

const MUSCLE_GROUP_KEYWORDS: { [key: string]: string } = {
  胸: "chest",
  背中: "back",
  足: "legs",
  腹筋: "abs",
  腕: "arms",
  肩: "arms",
  有酸素: "cardio",
  カーディオ: "cardio",
};

const MUSCLE_GROUP_COLORS: { [key: string]: string } = {
  chest: "error.main",
  back: "info.main",
  legs: "success.main",
  abs: "warning.main",
  arms: "secondary.main",
  cardio: "primary.main",
};

export const getMuscleGroupColor = (muscleGroupId: string) =>
  MUSCLE_GROUP_COLORS[muscleGroupId] || "primary.main";

const findMuscleGroupId = (typeName: string): string => {
  // 完全一致 → 部分一致 → 名前に含まれる部位キーワード の順で推測する
  const workoutType =
    workoutTypes.find((wt) => wt.name === typeName) ??
    workoutTypes.find(
      (wt) => wt.name.includes(typeName) || typeName.includes(wt.name)
    );
  if (workoutType) return workoutType.muscleGroupId;

  const keyword = Object.keys(MUSCLE_GROUP_KEYWORDS).find((key) =>
    typeName.includes(key)
  );
  return keyword ? MUSCLE_GROUP_KEYWORDS[keyword] : "unknown";
};

export const getWorkoutTypeInfo = (typeName: string): WorkoutTypeInfo => {
  const muscleGroupId = findMuscleGroupId(typeName);
  return {
    name: typeName,
    muscleGroup:
      muscleGroups.find((mg) => mg.id === muscleGroupId)?.name || "不明",
    muscleGroupId,
    color: getMuscleGroupColor(muscleGroupId),
  };
};

// 有酸素運動のセットは weight=距離(km)、reps=時間(分) で保存されている
export const isCardioWorkoutType = (typeName?: string) =>
  !!typeName && findMuscleGroupId(typeName) === "cardio";
