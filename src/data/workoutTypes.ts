export type MuscleGroup = {
  id: string;
  name: string;
  icon: string;
};

export type WorkoutType = {
  id: string;
  name: string;
  muscleGroupId: string;
  icon: string;
};

export const muscleGroups: MuscleGroup[] = [
  { id: "cardio", name: "有酸素運動", icon: "🏃" },
  { id: "chest", name: "胸", icon: "💪" },
  { id: "back", name: "背中", icon: "🏋️" },
  { id: "legs", name: "足", icon: "🦵" },
  { id: "abs", name: "腹筋", icon: "🏋️‍♂️" },
  { id: "arms", name: "腕・肩", icon: "💪" },
];

export const workoutTypes: WorkoutType[] = [
  {
    id: "running",
    name: "ランニング",
    muscleGroupId: "cardio",
    icon: "🏃",
  },
  {
    id: "bench_press",
    name: "ベンチプレス",
    muscleGroupId: "chest",
    icon: "🏋️",
  },
  {
    id: "chest_press",
    name: "チェストプレス",
    muscleGroupId: "chest",
    icon: "🏋️",
  },
  {
    id: "pectoral_fly",
    name: "ペクトラルフライ",
    muscleGroupId: "chest",
    icon: "🏋️",
  },
  { id: "pull_up", name: "懸垂", muscleGroupId: "back", icon: "🏋️" },
  {
    id: "lat_pulldown",
    name: "ラットプルダウン",
    muscleGroupId: "back",
    icon: "🏋️",
  },
  { id: "squat", name: "スクワット", muscleGroupId: "legs", icon: "🏋️" },
  { id: "leg_press", name: "レッグプレス", muscleGroupId: "legs", icon: "🏋️" },
  { id: "crunch", name: "クランチ", muscleGroupId: "abs", icon: "🏋️" },
  {
    id: "bicep_curl",
    name: "バイセップカール",
    muscleGroupId: "arms",
    icon: "🏋️",
  },
  {
    id: "shoulder_press",
    name: "ショルダープレス",
    muscleGroupId: "arms",
    icon: "🏋️",
  },
];
