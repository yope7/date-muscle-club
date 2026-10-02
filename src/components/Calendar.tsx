"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Snackbar,
  Typography,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Mic as MicIcon,
} from "@mui/icons-material";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutStore } from "@/store/workoutStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTeamStore } from "@/store/teamStore";
import { useUserStore } from "@/store/userStore";
import { WorkoutRecord, WorkoutSet } from "@/types/workout";
import { WorkoutType } from "@/data/workoutTypes";
import { AI_ALLOWED_USERS_COLLECTION } from "@/types/voiceWorkout";
import { isCardioWorkoutType } from "@/lib/workoutTypeInfo";
import { WorkoutSets } from "./WorkoutSets";
import { WorkoutTypeSelector } from "./WorkoutTypeSelector";
import { VoiceWorkoutDialog } from "./VoiceWorkoutDialog";
import { CalendarGrid } from "./calendar/CalendarGrid";
import { AddSetDialog, AddSetValues } from "./calendar/AddSetDialog";
import {
  GroupCandidate,
  GroupWorkoutPanel,
} from "./calendar/GroupWorkoutPanel";
import { useGroupWorkout } from "./calendar/useGroupWorkout";

// 有酸素運動は回数ではなく時間なので、1セットを10回相当として活動量に数える
const CARDIO_SET_ACTIVITY = 10;

const dayActivity = (workout: WorkoutRecord) =>
  (workout.sets ?? []).reduce(
    (sum, set) =>
      sum +
      (isCardioWorkoutType(set.workoutType)
        ? CARDIO_SET_ACTIVITY
        : set.reps || 0),
    0
  );

const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");

export const Calendar = () => {
  const {
    workouts,
    updateWorkout,
    addWorkout,
    deleteWorkout,
    fetchWorkoutsByMonth,
    isCalendarLoading,
  } = useWorkoutStore();
  const { user } = useAuth();
  const { calendarDisplayMode } = useSettingsStore();
  const { currentTeam, teamMembers, fetchTeamMembers } = useTeamStore();
  const { profiles, friends, fetchFriends } = useUserStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [initialized, setInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [addSetOpen, setAddSetOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [isVoiceInputAllowed, setIsVoiceInputAllowed] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    severity: "success" | "error";
  } | null>(null);

  const { getDayInfo, saveGroupWorkout } = useGroupWorkout(
    user?.uid,
    currentMonth,
    currentTeam
  );

  useEffect(() => {
    if (!user) return;
    fetchWorkoutsByMonth(user.uid, currentMonth).finally(() =>
      setInitialized(true)
    );
  }, [user, currentMonth, fetchWorkoutsByMonth]);

  useEffect(() => {
    if (user) fetchFriends(user.uid);
  }, [user, fetchFriends]);

  useEffect(() => {
    if (currentTeam) fetchTeamMembers(currentTeam.id);
  }, [currentTeam, fetchTeamMembers]);

  // 管理画面で許可されたユーザーにだけ音声入力ボタンを表示する
  useEffect(() => {
    if (!user) {
      setIsVoiceInputAllowed(false);
      return;
    }
    getDoc(doc(db, AI_ALLOWED_USERS_COLLECTION, user.uid))
      .then((snap) => setIsVoiceInputAllowed(snap.exists()))
      .catch(() => setIsVoiceInputAllowed(false));
  }, [user]);

  const workoutByDate = useMemo(
    () =>
      new Map(workouts.map((w) => [toDateKey(w.date.toDate()), w] as const)),
    [workouts]
  );

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

  // 選択中の日の記録。まだ記録がなければ保存前の仮レコードを使う
  const selectedWorkout = useMemo<WorkoutRecord | null>(() => {
    if (!selectedDate || !selectedDateKey || !user) return null;
    const existing = workoutByDate.get(selectedDateKey);
    if (existing) return existing;

    const workoutDate = new Date(selectedDate);
    const now = new Date();
    workoutDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return {
      id: `temp_${selectedDateKey}`,
      userId: user.uid,
      date: Timestamp.fromDate(workoutDate),
      sets: [],
      tags: [],
      memo: "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      name: "ワークアウト",
    };
  }, [selectedDate, selectedDateKey, workoutByDate, user]);

  const groupCandidates = useMemo<GroupCandidate[]>(() => {
    const candidates = new Map<string, GroupCandidate>();
    teamMembers
      .filter((m) => m.userId !== user?.uid)
      .forEach((m) =>
        candidates.set(m.userId, {
          id: m.userId,
          name:
            profiles[m.userId]?.displayName ||
            profiles[m.userId]?.username ||
            "チームメンバー",
          type: "team",
        })
      );
    friends.forEach((f) => {
      if (!candidates.has(f.id)) {
        candidates.set(f.id, {
          id: f.id,
          name: f.displayName || f.username || "フレンド",
          type: "friend",
        });
      }
    });
    return Array.from(candidates.values());
  }, [teamMembers, friends, profiles, user]);

  const handleAddSet = useCallback(
    async ({ weight, reps, count }: AddSetValues) => {
      if (!selectedWorkout || !selectedDateKey) return;
      const typeName = selectedType?.name || "ベンチプレス";
      const newSets: WorkoutSet[] = Array.from({ length: count }, () => ({
        id: crypto.randomUUID(),
        weight,
        reps,
        workoutType: typeName,
      }));
      const groupInfo = getDayInfo(selectedDateKey);
      const updated: WorkoutRecord = {
        ...selectedWorkout,
        sets: [...selectedWorkout.sets, ...newSets],
        name: typeName,
        updatedAt: Timestamp.now(),
        isGroupWorkout: !!groupInfo?.isGroupWorkout,
        groupMembers: groupInfo?.groupMembers ?? [],
        groupWorkoutName: groupInfo?.groupWorkoutName ?? "",
      };

      try {
        if (selectedWorkout.id.startsWith("temp_")) {
          await addWorkout(updated);
        } else {
          await updateWorkout(updated);
        }
        setAddSetOpen(false);
        setMessage({
          text: count === 1 ? "セットを追加しました" : `${count}セットを追加しました`,
          severity: "success",
        });
      } catch (error) {
        console.error("Error adding set:", error);
        setMessage({ text: "セットの追加に失敗しました", severity: "error" });
      }
    },
    [selectedWorkout, selectedDateKey, selectedType, getDayInfo, addWorkout, updateWorkout]
  );

  const handleDeleteWorkout = useCallback(
    async (workout: WorkoutRecord) => {
      if (workout.id.startsWith("temp_")) return;
      await deleteWorkout(workout.id, currentMonth);
    },
    [deleteWorkout, currentMonth]
  );

  if (!initialized) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  const dayGroupInfo = selectedDateKey ? getDayInfo(selectedDateKey) : null;
  const dayMembers = dayGroupInfo?.isGroupWorkout
    ? dayGroupInfo.groupMembers ?? []
    : [];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "600px" },
        mx: "auto",
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <IconButton
          onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
          disabled={isCalendarLoading}
          aria-label="前の月"
        >
          <ChevronLeft />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" component="h2">
            {format(currentMonth, "yyyy年M月", { locale: ja })}
          </Typography>
          {isCalendarLoading && (
            <CircularProgress size={20} aria-label="読み込み中" />
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {isVoiceInputAllowed && (
            <IconButton
              onClick={() => setVoiceDialogOpen(true)}
              color="primary"
              aria-label="音声で記録"
            >
              <MicIcon />
            </IconButton>
          )}
          <IconButton
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            disabled={isCalendarLoading}
            aria-label="次の月"
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      <CalendarGrid
        currentMonth={currentMonth}
        selectedDateKey={selectedDateKey}
        displayMode={calendarDisplayMode}
        getActivity={(dateKey) => {
          const workout = workoutByDate.get(dateKey);
          return workout ? dayActivity(workout) : 0;
        }}
        isGroupDay={(dateKey) => !!getDayInfo(dateKey)?.isGroupWorkout}
        onSelectDate={setSelectedDate}
      />

      {selectedWorkout && selectedDateKey && (
        <Box sx={{ mt: { xs: 2, sm: 3 } }}>
          {groupCandidates.length > 0 && (
            <GroupWorkoutPanel
              key={selectedDateKey}
              members={dayMembers}
              candidates={groupCandidates}
              onSave={(members) =>
                saveGroupWorkout(
                  selectedDateKey,
                  members,
                  workoutByDate.get(selectedDateKey) ?? null
                )
              }
            />
          )}

          <WorkoutSets
            workout={selectedWorkout}
            onDelete={handleDeleteWorkout}
            onAddSet={() => setTypeSelectorOpen(true)}
          />
        </Box>
      )}

      <WorkoutTypeSelector
        open={typeSelectorOpen}
        onClose={() => setTypeSelectorOpen(false)}
        onSelect={(workoutType) => {
          setSelectedType(workoutType);
          setAddSetOpen(true);
        }}
      />

      <AddSetDialog
        open={addSetOpen}
        workoutType={selectedType}
        onBack={() => {
          setAddSetOpen(false);
          setTypeSelectorOpen(true);
        }}
        onClose={() => setAddSetOpen(false)}
        onSubmit={handleAddSet}
      />

      <VoiceWorkoutDialog
        open={voiceDialogOpen}
        onClose={() => setVoiceDialogOpen(false)}
        onSaved={(date) => {
          setMessage({ text: "音声入力の内容を登録しました", severity: "success" });
          if (!user) return;
          // 登録した日の月を表示して最新データを取り直す
          if (
            date.getFullYear() !== currentMonth.getFullYear() ||
            date.getMonth() !== currentMonth.getMonth()
          ) {
            setCurrentMonth(date);
          } else {
            fetchWorkoutsByMonth(user.uid, currentMonth);
          }
        }}
      />

      <Snackbar
        open={message !== null}
        autoHideDuration={3000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setMessage(null)}
          severity={message?.severity ?? "success"}
          sx={{ width: "100%" }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};
