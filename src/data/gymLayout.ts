export type GymMachine = {
  id: string;
  name: string;
  muscleGroupId: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  icon: string;
  color: string;
  isMultiSelect?: boolean; // 複数選択可能なマシン（ダンベルエリアなど）
};

export type GymLayout = {
  id: string;
  name: string;
  width: number;
  height: number;
  machines: GymMachine[];
};

// 筋肉グループごとの色マッピング (シックなスタイル)
export const muscleGroupColors: Record<string, string> = {
  cardio: "#4DB6AC", // Muted Teal
  chest: "#7986CB", // Muted Indigo
  back: "#FF8A65", // Muted Deep Orange
  legs: "#9575CD", // Muted Deep Purple
  abs: "#F06292", // Muted Pink
  arms: "#A1887F", // Muted Brown
};

export const gymLayout: GymLayout = {
  id: "main_gym",
  name: "メインジム",
  width: 670,
  height: 570,
  machines: [
    {
      id: "cardio_area",
      name: "有酸素運動",
      muscleGroupId: "cardio",
      position: { x: 560, y: 170, width: 100, height: 270 },
      icon: "🏃",
      color: muscleGroupColors.cardio,
      isMultiSelect: true, // 距離と時間を選択可能
    },
    {
      id: "leg_press",
      name: "レッグプレス",
      muscleGroupId: "legs",
      position: { x: 560, y: 40, width: 100, height: 80 },
      icon: "🦵",
      color: muscleGroupColors.legs,
    },
    {
      id: "leg_extension",
      name: "レッグエクステンション",
      muscleGroupId: "legs",
      position: { x: 460, y: 40, width: 90, height: 80 },
      icon: "🦵",
      color: muscleGroupColors.legs,
    },
    {
      id: "leg_curl",
      name: "レッグカール",
      muscleGroupId: "legs",
      position: { x: 359, y: 40, width: 90, height: 80 },
      icon: "🦵",
      color: muscleGroupColors.legs,
    },
    {
      id: "pull_up",
      name: "懸垂",
      muscleGroupId: "back",
      position: { x: 260, y: 40, width: 90, height: 80 },
      icon: "🏋️",
      color: muscleGroupColors.back,
    },
    {
      id: "rowing_machine",
      name: "ローイングマシン",
      muscleGroupId: "back",
      position: { x: 160, y: 40, width: 90, height: 80 },
      icon: "🏋️",
      color: muscleGroupColors.back,
    },
    {
      id: "dumbbell_area",
      name: "ダンベル",
      muscleGroupId: "arms",
      position: { x: 10, y: 40, width: 140, height: 80 },
      icon: "💪",
      color: muscleGroupColors.arms,
      isMultiSelect: true,
    },
    {
      id: "smith_machine",
      name: "スミスマシン",
      muscleGroupId: "legs", // 代表してlegsに
      position: { x: 10, y: 170, width: 140, height: 80 },
      icon: "🏋️",
      color: muscleGroupColors.legs,
      isMultiSelect: true, // スクワット、ベンチプレス、デッドリフトを選択可能
    },
    {
      id: "bench_press",
      name: "ベンチプレス",
      muscleGroupId: "chest",
      position: { x: 10, y: 320, width: 140, height: 80 },
      icon: "🏋️",
      color: muscleGroupColors.chest,
    },
    {
      id: "squat",
      name: "スクワット",
      muscleGroupId: "legs",
      position: { x: 10, y: 470, width: 140, height: 80 },
      icon: "🦵",
      color: muscleGroupColors.legs,
    },
    {
      id: "tube_resistance",
      name: "チューブ",
      muscleGroupId: "arms", // 代表してarmsに
      position: { x: 170, y: 160, width: 70, height: 50 },
      icon: "💪",
      color: muscleGroupColors.arms,
    },
    {
      id: "shoulder_press",
      name: "ショルダープッシュ",
      muscleGroupId: "arms",
      position: { x: 210, y: 230, width: 110, height: 80 },
      icon: "💪",
      color: muscleGroupColors.arms,
    },
    {
      id: "pectoral_fly",
      name: "ペクトラルマシン",
      muscleGroupId: "chest",
      position: { x: 210, y: 330, width: 110, height: 80 },
      icon: "🏋️",
      color: muscleGroupColors.chest,
    },
    {
      id: "chest_press",
      name: "チェストプレス",
      muscleGroupId: "chest",
      position: { x: 210, y: 430, width: 110, height: 80 },
      icon: "🏋️",
      color: muscleGroupColors.chest,
    },
    {
      id: "lat_pulldown",
      name: "ラットプルダウン",
      muscleGroupId: "back",
      position: { x: 359, y: 230, width: 110, height: 80 },
      icon: "🏋️",
      color: muscleGroupColors.back,
    },
    {
      id: "lower_back_machine",
      name: "ロウワーバック",
      muscleGroupId: "back",
      position: { x: 359, y: 330, width: 110, height: 80 },
      icon: "🏋️",
      color: muscleGroupColors.back,
    },
    {
      id: "abdominal_crunch",
      name: "アブドミナルクランチ",
      muscleGroupId: "abs",
      position: { x: 359, y: 430, width: 110, height: 80 },
      icon: "🏋️‍♂️",
      color: muscleGroupColors.abs,
    },
  ],
};
