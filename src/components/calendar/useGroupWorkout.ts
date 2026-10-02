import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { DayGroupWorkoutInfo, WorkoutRecord } from "@/types/workout";
import {
  getGroupWorkoutInfoInRange,
  saveDayGroupWorkoutInfo,
} from "@/lib/firestore";
import { getCalendarRange } from "@/lib/calendarRange";
import { useWorkoutStore } from "@/store/workoutStore";
import { Team } from "@/types/team";

export const groupWorkoutNameFor = (team: Team | null) =>
  team ? `${team.name}合同トレーニング` : "フレンド合同トレーニング";

// 合同トレーニング情報は「日付ごとの情報(dayGroupWorkouts)」が正で、
// その日のワークアウトにも同じ内容を複製している（フィードの表示用）。
// 両方の更新は必ず saveGroupWorkout を通して行う
export const useGroupWorkout = (
  userId: string | undefined,
  currentMonth: Date,
  currentTeam: Team | null
) => {
  const { updateWorkout } = useWorkoutStore();
  const [infoByDate, setInfoByDate] = useState<
    Record<string, DayGroupWorkoutInfo>
  >({});

  // 表示期間の情報を1回のクエリで取得する（以前は1日ずつ約40回読んでいた）
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const { start, end } = getCalendarRange(currentMonth);
    getGroupWorkoutInfoInRange(
      userId,
      format(start, "yyyy-MM-dd"),
      format(end, "yyyy-MM-dd")
    ).then((infos) => {
      if (cancelled) return;
      setInfoByDate(Object.fromEntries(infos.map((info) => [info.date, info])));
    });
    return () => {
      cancelled = true;
    };
  }, [userId, currentMonth]);

  const getDayInfo = useCallback(
    (dateKey: string) => infoByDate[dateKey] ?? null,
    [infoByDate]
  );

  // members が空なら合同トレーニングを解除する
  const saveGroupWorkout = useCallback(
    async (
      dateKey: string,
      members: string[],
      dayWorkout: WorkoutRecord | null
    ) => {
      if (!userId) return;
      const isGroupWorkout = members.length > 0;
      const groupWorkoutName = isGroupWorkout
        ? groupWorkoutNameFor(currentTeam)
        : "";

      await saveDayGroupWorkoutInfo(userId, dateKey, {
        date: dateKey,
        isGroupWorkout,
        groupMembers: members,
        groupWorkoutName,
      });

      if (dayWorkout && !dayWorkout.id.startsWith("temp_")) {
        await updateWorkout({
          ...dayWorkout,
          isGroupWorkout,
          groupMembers: members,
          groupWorkoutName,
        });
      }

      setInfoByDate((prev) => {
        const next = { ...prev };
        if (isGroupWorkout) {
          next[dateKey] = {
            date: dateKey,
            isGroupWorkout,
            groupMembers: members,
            groupWorkoutName,
            updatedAt: prev[dateKey]?.updatedAt,
          } as DayGroupWorkoutInfo;
        } else {
          delete next[dateKey];
        }
        return next;
      });
    },
    [userId, currentTeam, updateWorkout]
  );

  return { infoByDate, getDayInfo, saveGroupWorkout };
};
