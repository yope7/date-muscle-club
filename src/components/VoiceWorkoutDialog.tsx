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
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useWorkoutStore } from "@/store/workoutStore";
import { getWorkoutByDate } from "@/lib/firestore";
import { MAX_VOICE_TEXT_LENGTH, ParsedWorkout } from "@/types/voiceWorkout";
import { WorkoutRecord, WorkoutSet } from "@/types/workout";

interface VoiceWorkoutDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (date: Date) => void;
}

const isCardio = (name: string) => name.startsWith("有酸素運動");

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
      if (!user) throw new Error("not signed in");
      const res = await fetch("/api/voice-workout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "解析に失敗しました");
        return;
      }
      const result = data.workout as ParsedWorkout;
      if (result.exercises.length === 0) {
        setError("種目を読み取れませんでした。種目名・重量・回数を話してみてください");
      }
      setParsed(result);
    } catch (e) {
      console.error("Error parsing voice workout:", e);
      setError("解析に失敗しました。時間をおいて再度お試しください");
    } finally {
      setIsParsing(false);
    }
  }, [text, user, stopListening]);

  const handleRemoveExercise = useCallback((index: number) => {
    setParsed((prev) =>
      prev
        ? { ...prev, exercises: prev.exercises.filter((_, i) => i !== index) }
        : prev
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || !parsed || parsed.exercises.length === 0) return;

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
  }, [user, parsed, addWorkout, updateWorkout, onSaved, onClose]);

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

        {parsed && parsed.exercises.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              {parsed.date.replace(/-/g, "/")} に登録する内容
            </Typography>
            <List dense>
              {parsed.exercises.map((e, i) => (
                <ListItem
                  key={i}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveExercise(i)}
                      aria-label={`${e.name}を削除`}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={e.name}
                    secondary={
                      isCardio(e.name)
                        ? `${e.weight}km / ${e.reps}分 × ${e.sets}セット`
                        : `${e.weight}kg × ${e.reps}回 × ${e.sets}セット`
                    }
                  />
                </ListItem>
              ))}
            </List>
            {parsed.memo && (
              <Typography variant="body2" color="text.secondary">
                メモ: {parsed.memo}
              </Typography>
            )}
            {parsed.unrecognized.length > 0 && (
              <Typography variant="body2" color="warning.main">
                読み取れなかった部分: {parsed.unrecognized.join("、")}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          キャンセル
        </Button>
        {parsed && parsed.exercises.length > 0 ? (
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
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
    </Dialog>
  );
};
