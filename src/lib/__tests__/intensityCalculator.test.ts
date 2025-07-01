import {
  calculateMaxWeights,
  calculateSetIntensity,
  getTotalIntensity,
  getAverageIntensity,
  getAverageIntensityExcludingNullDays,
  getDaysSinceFirstWorkout,
  calculateIntensityForDate,
} from "../intensityCalculator";
import { WorkoutRecord } from "@/types/workout";
import { Timestamp } from "firebase/firestore";

describe("Intensity Calculator", () => {
  const mockWorkouts: WorkoutRecord[] = [
    {
      id: "1",
      userId: "user1",
      name: "ベンチプレス",
      date: Timestamp.fromDate(new Date("2024-01-01")),
      sets: [
        { weight: 60, reps: 10, workoutType: "ベンチプレス" },
        { weight: 70, reps: 8, workoutType: "ベンチプレス" },
        { weight: 80, reps: 5, workoutType: "ベンチプレス" },
      ],
      memo: "",
      tags: [],
      createdAt: Timestamp.fromDate(new Date("2024-01-01")),
      updatedAt: Timestamp.fromDate(new Date("2024-01-01")),
      type: "strength",
    },
    {
      id: "2",
      userId: "user1",
      name: "スクワット",
      date: Timestamp.fromDate(new Date("2024-01-02")),
      sets: [
        { weight: 100, reps: 8, workoutType: "スクワット" },
        { weight: 120, reps: 6, workoutType: "スクワット" },
        { weight: 140, reps: 4, workoutType: "スクワット" },
      ],
      memo: "",
      tags: [],
      createdAt: Timestamp.fromDate(new Date("2024-01-02")),
      updatedAt: Timestamp.fromDate(new Date("2024-01-02")),
      type: "strength",
    },
    {
      id: "3",
      userId: "user1",
      name: "ベンチプレス",
      date: Timestamp.fromDate(new Date("2024-01-01")),
      sets: [
        { weight: 85, reps: 3, workoutType: "ベンチプレス" }, // 同じ日の新記録
      ],
      memo: "",
      tags: [],
      createdAt: Timestamp.fromDate(new Date("2024-01-01")),
      updatedAt: Timestamp.fromDate(new Date("2024-01-01")),
      type: "strength",
    },
  ];

  describe("calculateMaxWeights", () => {
    it("should calculate max weights for each workout type", () => {
      const maxWeights = calculateMaxWeights(mockWorkouts);

      expect(maxWeights["ベンチプレス"]).toBe(80);
      expect(maxWeights["スクワット"]).toBe(140);
    });
  });

  describe("calculateSetIntensity", () => {
    it("should calculate intensity for a single set", () => {
      const maxWeights = { ベンチプレス: 80, スクワット: 140 };
      const set = { weight: 60, reps: 10, workoutType: "ベンチプレス" };

      const intensity = calculateSetIntensity(set, "ベンチプレス", maxWeights);

      expect(intensity.intensity).toBe((60 / 80) * 10); // 0.75 * 10 = 7.5
      expect(intensity.percentage).toBe(75); // 60/80 * 100
      expect(intensity.currentWeight).toBe(60);
      expect(intensity.maxWeight).toBe(80);
      expect(intensity.reps).toBe(10);
    });

    it("should handle workout type not in maxWeights", () => {
      const maxWeights = { ベンチプレス: 80 };
      const set = { weight: 50, reps: 8, workoutType: "デッドリフト" };

      const intensity = calculateSetIntensity(set, "デッドリフト", maxWeights);

      expect(intensity.intensity).toBe((50 / 1) * 8); // デフォルト値1を使用
      expect(intensity.maxWeight).toBe(1);
    });
  });

  describe("getTotalIntensity", () => {
    it("should calculate total intensity for all workouts", () => {
      const totalIntensity = getTotalIntensity(mockWorkouts);

      // ベンチプレス: (60/80)*10 + (70/80)*8 + (80/80)*5 = 7.5 + 7 + 5 = 19.5
      // スクワット: (100/140)*8 + (120/140)*6 + (140/140)*4 = 5.71 + 5.14 + 4 = 14.85
      // 合計: 19.5 + 14.85 = 34.35
      expect(totalIntensity).toBeCloseTo(34.35, 1);
    });
  });

  describe("getAverageIntensity", () => {
    it("should calculate average intensity per set", () => {
      const averageIntensity = getAverageIntensity(mockWorkouts);

      // 総強度: 34.35, 総セット数: 6
      // 平均: 34.35 / 6 = 5.725
      expect(averageIntensity).toBeCloseTo(5.725, 2);
    });

    it("should return 0 for empty workouts", () => {
      const averageIntensity = getAverageIntensity([]);
      expect(averageIntensity).toBe(0);
    });
  });

  describe("calculateIntensityForDate", () => {
    it("should calculate intensity using only that day's max weights", () => {
      const targetDate = new Date("2024-01-01");
      const dailyIntensity = calculateIntensityForDate(
        mockWorkouts,
        targetDate
      );

      // 2024-01-01のベンチプレスの最大重量は85kg（新記録）
      // セット1: (60/85) * 10 = 7.06
      // セット2: (70/85) * 8 = 6.59
      // セット3: (80/85) * 5 = 4.71
      // セット4: (85/85) * 3 = 3.00
      // 合計: 7.06 + 6.59 + 4.71 + 3.00 = 21.36
      expect(dailyIntensity).not.toBeNull();
      expect(dailyIntensity!.totalIntensity).toBeCloseTo(21.36, 1);
    });

    it("should return null for date with no workouts", () => {
      const targetDate = new Date("2024-01-03");
      const dailyIntensity = calculateIntensityForDate(
        mockWorkouts,
        targetDate
      );
      expect(dailyIntensity).toBeNull();
    });
  });

  describe("getAverageIntensityExcludingNullDays", () => {
    it("should calculate average intensity excluding days with zero intensity", () => {
      const averageIntensity =
        getAverageIntensityExcludingNullDays(mockWorkouts);

      // 2024-01-01: 21.36, 2024-01-02: 14.85
      // 平均: (21.36 + 14.85) / 2 = 18.105
      expect(averageIntensity).toBeCloseTo(18.105, 1);
    });

    it("should return 0 for empty workouts", () => {
      const averageIntensity = getAverageIntensityExcludingNullDays([]);
      expect(averageIntensity).toBe(0);
    });
  });

  describe("getDaysSinceFirstWorkout", () => {
    it("should calculate days since first workout", () => {
      const daysSinceFirst = getDaysSinceFirstWorkout(mockWorkouts);

      // 2024-01-01から現在までの日数
      const firstDate = new Date("2024-01-01");
      const today = new Date();
      const expectedDays = Math.floor(
        (today.getTime() - firstDate.getTime()) / (1000 * 3600 * 24)
      );

      expect(daysSinceFirst).toBe(expectedDays);
    });

    it("should return 0 for empty workouts", () => {
      const daysSinceFirst = getDaysSinceFirstWorkout([]);
      expect(daysSinceFirst).toBe(0);
    });
  });
});
