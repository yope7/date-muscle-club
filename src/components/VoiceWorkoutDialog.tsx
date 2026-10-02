"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutStore } from "@/store/workoutStore";
import { getWorkoutByDate } from "@/lib/firestore";
import {
  MAX_VOICE_TEXT_LENGTH,
  ParsedExercise,
  ParsedWorkout,
} from "@/types/voiceWorkout";
import { WorkoutType } from "@/data/workoutTypes";
import { postApi } from "@/lib/apiClient";
import { WorkoutTypeSelector } from "./WorkoutTypeSelector";
import { WorkoutRecord, WorkoutSet } from "@/types/workout";

interface VoiceWorkoutDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (date: Date) => void;
}

const isCardio = (name: string) => name.startsWith("有酸素運動");

// 種目選択の対象: 既存の行の種目を差し替えるか、読み取れなかった断片から行を追加するか
type PickerTarget =
  | { mode: "replace"; index: number }
  | { mode: "add"; fragment: string };

// 重量は自重の0を許可、回数・セット数は1以上
const isValidField = (key: "weight" | "reps" | "sets", value: number) => {
  if (key === "weight") return Number.isFinite(value) && value >= 0;
  if (key === "reps") return Number.isFinite(value) && value > 0;
  return Number.isInteger(value) && value > 0;
};

const isValidExercise = (e: ParsedExercise) =>
  isValidField("weight", e.weight) &&
  isValidField("reps", e.reps) &&
  isValidField("sets", e.sets);

const getSpeechRecognition = (): any => {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const VoiceWorkoutDialog: React.FC<VoiceWorkoutDialogProps> = ({
  open,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const { addWorkout, updateWorkout } = useWorkoutStore();
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechSupported = getSpeechRecognition() !== null;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopListening();
      setText("");
      setParsed(null);
      setError(null);
    }
  }, [open, stopListening]);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    // 録音開始前に入力済みのテキストへ追記する
    const baseText = text ? `${text} ` : "";
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(baseText + transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError("音声認識でエラーが発生しました。マイクの許可を確認してください");
      }
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setError(null);
    setParsed(null);
    recognition.start();
    setIsListening(true);
  }, [text]);

  const handleParse = useCallback(async () => {
    stopListening();
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_VOICE_TEXT_LENGTH) {
      setError(`${MAX_VOICE_TEXT_LENGTH}文字以内で入力してください`);
      return;
    }

    setIsParsing(true);
    setError(null);
    try {
      const { workout: result } = await postApi<{ workout: ParsedWorkout }>(
        "/api/voice-workout",
        { text: trimmed }
      );
      if (result.exercises.length === 0 && result.unrecognized.length === 0) {
        setError("種目を読み取れませんでした。種目名・重量・回数を話してみてください");
      }
      setParsed(result);
    } catch (e) {
      console.error("Error parsing voice workout:", e);
      setError(
        e instanceof Error ? e.message : "解析に失敗しました。時間をおいて再度お試しください"
      );
    } finally {
      setIsParsing(false);
    }
  }, [text, stopListening]);

  const handleRemoveExercise = useCallback((index: number) => {
    setParsed((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.filter((_, i) => i !== index) }
        : prev
    );
  }, []);

  const handleUpdateExercise = useCallback(
    (index: number, patch: Partial<ParsedExercise>) => {
      setParsed((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((e, i) =>
                i === index ? { ...e, ...patch } : e
              ),
            }
          : prev
      );
    },
    []
  );

  const handleSelectWorkoutType = useCallback(
    (workoutType: WorkoutType) => {
      if (!pickerTarget) return;
      if (pickerTarget.mode === "replace") {
        handleUpdateExercise(pickerTarget.index, {
          name: workoutType.name,
          uncertain: false,
        });
      } else {
        const { fragment } = pickerTarget;
        setParsed((prev) =>
          prev
            ? {
                ...prev,
                exercises: [
                  ...prev.exercises,
                  {
                    name: workoutType.name,
                    weight: 0,
                    reps: 0,
                    sets: 1,
                    spokenName: fragment,
                    uncertain: false,
                  },
                ],
                unrecognized: prev.unrecognized.filter((u) => u !== fragment),
              }
            : prev
        );
      }
      setPickerTarget(null);
    },
    [pickerTarget, handleUpdateExercise]
  );

  const canSave =
    !!parsed &&
    parsed.exercises.length > 0 &&
    parsed.exercises.every(isValidExercise);

  const handleSave = useCallback(async () => {
    if (!user || !parsed || !canSave) return;

    setIsSaving(true);
    setError(null);
    try {
      const [y, m, d] = parsed.date.split("-").map(Number);
      const date = new Date(y, m - 1, d);

      const newSets: WorkoutSet[] = parsed.exercises.flatMap((e) =>
        Array.from({ length: e.sets }, () => ({
          id: crypto.randomUUID(),
          weight: e.weight,
          reps: e.reps,
          workoutType: e.name,
        }))
      );

      const existing = await getWorkoutByDate(user.uid, date);
      if (existing) {
        await updateWorkout({
          ...existing,
          sets: [...existing.sets, ...newSets],
          memo: [existing.memo, parsed.memo].filter(Boolean).join("\n"),
          updatedAt: Timestamp.now(),
        });
      } else {
        const now = Timestamp.now();
        const workout: WorkoutRecord = {
          id: "",
          userId: user.uid,
          name: parsed.exercises[0].name,
          date: Timestamp.fromDate(date),
          sets: newSets,
          memo: parsed.memo,
          tags: [],
          createdAt: now,
          updatedAt: now,
        };
        await addWorkout(workout);
      }

      onSaved(date);
      onClose();
    } catch (e) {
      console.error("Error saving voice workout:", e);
      setError("登録に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [user, parsed, canSave, addWorkout, updateWorkout, onSaved, onClose]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>音声でトレーニングを記録</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          例:「ベンチプレス60キロ10回3セット、スクワット80キロ8回を2セット」
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <IconButton
            onClick={isListening ? stopListening : startListening}
            disabled={!speechSupported || isParsing || isSaving}
            color={isListening ? "error" : "primary"}
            sx={{ width: 72, height: 72, border: 2, borderColor: "currentColor" }}
            aria-label={isListening ? "録音を停止" : "録音を開始"}
          >
            {isListening ? (
              <StopIcon fontSize="large" />
            ) : (
              <MicIcon fontSize="large" />
            )}
          </IconButton>
        </Box>
        {!speechSupported && (
          <Alert severity="info" sx={{ mb: 2 }}>
            このブラウザは音声入力に対応していません。キーボードの音声入力などでテキストを入力してください
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          minRows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setParsed(null);
          }}
          placeholder={isListening ? "聞き取り中..." : "話した内容がここに入ります（編集もできます）"}
        />

        {error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {parsed &&
          (parsed.exercises.length > 0 || parsed.unrecognized.length > 0) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {parsed.date.replace(/-/g, "/")} に登録する内容（タップで修正できます）
              </Typography>
              <Stack spacing={1}>
                {parsed.exercises.map((e, i) => {
                  const cardio = isCardio(e.name);
                  const numberField = (
                    label: string,
                    key: "weight" | "reps" | "sets",
                    step: number
                  ) => (
                    <TextField
                      label={label}
                      type="number"
                      size="small"
                      value={Number.isFinite(e[key]) ? e[key] : ""}
                      onChange={(ev) =>
                        handleUpdateExercise(i, {
                          [key]:
                            ev.target.value === ""
                              ? NaN
                              : key === "sets"
                              ? Math.floor(Number(ev.target.value))
                              : Number(ev.target.value),
                        })
                      }
                      error={!isValidField(key, e[key])}
                      slotProps={{ htmlInput: { min: 0, step, inputMode: "decimal" } }}
                      sx={{ flex: 1 }}
                    />
                  );
                  return (
                    <Paper
                      key={i}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderColor: e.uncertain ? "warning.main" : undefined,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Button
                          onClick={() => setPickerTarget({ mode: "replace", index: i })}
                          endIcon={<EditIcon fontSize="small" />}
                          sx={{ flex: 1, justifyContent: "flex-start", textTransform: "none" }}
                          aria-label={`${e.name}の種目を変更`}
                        >
                          {e.name}
                        </Button>
                        <IconButton
                          onClick={() => handleRemoveExercise(i)}
                          aria-label={`${e.name}を削除`}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      {e.uncertain && (
                        <Typography variant="caption" color="warning.main" sx={{ display: "block", mb: 1 }}>
                          「{e.spokenName}」から推測しました。違う場合は種目名をタップして変更してください
                        </Typography>
                      )}
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        {numberField(cardio ? "距離(km)" : "重量(kg)", "weight", cardio ? 0.1 : 0.5)}
                        {numberField(cardio ? "時間(分)" : "回数", "reps", 1)}
                        {numberField("セット", "sets", 1)}
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
              {parsed.memo && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  メモ: {parsed.memo}
                </Typography>
              )}
              {parsed.unrecognized.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="warning.main">
                    読み取れなかった部分（種目を選ぶと追加できます）
                  </Typography>
                  {parsed.unrecognized.map((fragment) => (
                    <Button
                      key={fragment}
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setPickerTarget({ mode: "add", fragment })}
                      sx={{ mr: 1, mt: 0.5, textTransform: "none" }}
                    >
                      {fragment}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          キャンセル
        </Button>
        {parsed && parsed.exercises.length > 0 ? (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !canSave}
          >
            {isSaving ? <CircularProgress size={20} /> : "登録する"}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleParse}
            disabled={!text.trim() || isParsing}
          >
            {isParsing ? <CircularProgress size={20} /> : "解析する"}
          </Button>
        )}
      </DialogActions>
      <WorkoutTypeSelector
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleSelectWorkoutType}
      />
    </Dialog>
  );
};
