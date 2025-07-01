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
  gymMachineId?: string; // 対応するジムマシンのID
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
    id: "cardio_km",
    name: "有酸素運動（距離）",
    muscleGroupId: "cardio",
    icon: "🏃",
    gymMachineId: "cardio_area",
  },
  {
    id: "cardio_time",
    name: "有酸素運動（時間）",
    muscleGroupId: "cardio",
    icon: "🏃",
    gymMachineId: "cardio_area",
  },
  {
    id: "cardio_area",
    name: "有酸素運動",
    muscleGroupId: "cardio",
    icon: "🏃",
    gymMachineId: "cardio_area",
  },
  {
    id: "smith_squat",
    name: "スミススクワット",
    muscleGroupId: "legs",
    icon: "🏋️",
    gymMachineId: "smith_machine",
  },
  {
    id: "smith_bench_press",
    name: "スミスベンチプレス",
    muscleGroupId: "chest",
    icon: "🏋️",
    gymMachineId: "smith_machine",
  },
  {
    id: "smith_deadlift",
    name: "スミスデッドリフト",
    muscleGroupId: "back",
    icon: "🏋️",
    gymMachineId: "smith_machine",
  },
  {
    id: "smith_machine",
    name: "スミスマシン",
    muscleGroupId: "legs",
    icon: "🏋️",
    gymMachineId: "smith_machine",
  },
  {
    id: "bench_press",
    name: "ベンチプレス",
    muscleGroupId: "chest",
    icon: "🏋️",
    gymMachineId: "bench_press",
  },
  {
    id: "chest_press",
    name: "チェストプレス",
    muscleGroupId: "chest",
    icon: "🏋️",
    gymMachineId: "chest_press",
  },
  {
    id: "pectoral_fly",
    name: "ペクトラルマシン",
    muscleGroupId: "chest",
    icon: "🏋️",
    gymMachineId: "pectoral_fly",
  },
  {
    id: "pull_up",
    name: "懸垂",
    muscleGroupId: "back",
    icon: "🏋️",
    gymMachineId: "pull_up",
  },
  {
    id: "lat_pulldown",
    name: "ラットプルダウン",
    muscleGroupId: "back",
    icon: "🏋️",
    gymMachineId: "lat_pulldown",
  },
  {
    id: "rowing_machine",
    name: "ローイングマシン",
    muscleGroupId: "back",
    icon: "🏋️",
    gymMachineId: "rowing_machine",
  },
  {
    id: "lower_back_machine",
    name: "ロウワーバック",
    muscleGroupId: "back",
    icon: "🏋️",
    gymMachineId: "lower_back_machine",
  },
  {
    id: "squat",
    name: "スクワット",
    muscleGroupId: "legs",
    icon: "🏋️",
    gymMachineId: "squat",
  },
  {
    id: "leg_press",
    name: "レッグプレス",
    muscleGroupId: "legs",
    icon: "🏋️",
    gymMachineId: "leg_press",
  },
  {
    id: "leg_extension",
    name: "レッグエクステンション",
    muscleGroupId: "legs",
    icon: "🏋️",
    gymMachineId: "leg_extension",
  },
  {
    id: "leg_curl",
    name: "レッグカール",
    muscleGroupId: "legs",
    icon: "🏋️",
    gymMachineId: "leg_curl",
  },
  {
    id: "abdominal_crunch",
    name: "アブドミナルクランチ",
    muscleGroupId: "abs",
    icon: "🏋️",
    gymMachineId: "abdominal_crunch",
  },
  {
    id: "shoulder_press",
    name: "ショルダープッシュ",
    muscleGroupId: "arms",
    icon: "🏋️",
    gymMachineId: "shoulder_press",
  },
  {
    id: "dumbbell_curl",
    name: "ダンベルカール",
    muscleGroupId: "arms",
    icon: "🏋️",
    gymMachineId: "dumbbell_area",
  },
  {
    id: "dumbbell_shoulder_press",
    name: "ダンベルショルダープレス",
    muscleGroupId: "arms",
    icon: "🏋️",
    gymMachineId: "dumbbell_area",
  },
  {
    id: "hammer_curl",
    name: "ハンマーカール",
    muscleGroupId: "arms",
    icon: "🏋️",
    gymMachineId: "dumbbell_area",
  },
  {
    id: "tube_resistance",
    name: "チューブ",
    muscleGroupId: "arms",
    icon: "🏋️",
    gymMachineId: "tube_resistance",
  },
  {
    id: "incline_arm_curl",
    name: "インクラインアームカール",
    muscleGroupId: "arms",
    icon: "🏋️",
    gymMachineId: "dumbbell_area",
  },
];
