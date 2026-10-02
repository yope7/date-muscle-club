import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { WorkoutType } from "@/data/workoutTypes";
import { isCardioWorkoutType } from "@/lib/workoutTypeInfo";
import { NumberPicker } from "../NumberPicker";

// よく使う重量・回数のプリセット
const WEIGHT_REPS_PRESETS = [
  { weight: 20, reps: 15, label: "軽め" },
  { weight: 25, reps: 12, label: "標準" },
  { weight: 30, reps: 10, label: "やや重め" },
  { weight: 40, reps: 8, label: "重め" },
  { weight: 50, reps: 6, label: "かなり重め" },
  { weight: 60, reps: 5, label: "最大重量" },
];

const STRENGTH_DEFAULTS = { weight: 25, reps: 10 };
// 有酸素運動は weight=距離(km)、reps=時間(分)
const CARDIO_DEFAULTS = { weight: 5, reps: 30 };

export type AddSetValues = { weight: number; reps: number; count: number };

interface AddSetDialogProps {
  open: boolean;
  workoutType: WorkoutType | null;
  onBack: () => void;
  onClose: () => void;
  onSubmit: (values: AddSetValues) => Promise<void>;
}

export const AddSetDialog: React.FC<AddSetDialogProps> = ({
  open,
  workoutType,
  onBack,
  onClose,
  onSubmit,
}) => {
  const cardio = isCardioWorkoutType(workoutType?.name);
  const [values, setValues] = useState(STRENGTH_DEFAULTS);
  const [count, setCount] = useState(1);
  const [saving, setSaving] = useState(false);

  // 種目を選び直したら、有酸素かどうかに応じて初期値を入れ直す
  useEffect(() => {
    if (open) setValues(cardio ? CARDIO_DEFAULTS : STRENGTH_DEFAULTS);
  }, [open, cardio, workoutType?.id]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({ ...values, count });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={onBack} sx={{ mr: 1 }} aria-label="種目選択に戻る">
            <ArrowBack />
          </IconButton>
          {workoutType
            ? `${workoutType.name}のセットを追加`
            : "新しいセットを追加"}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {cardio ? "距離（km）" : "重量"}
            </Typography>
            <NumberPicker
              value={values.weight}
              onChange={(weight) => setValues((v) => ({ ...v, weight }))}
              min={0}
              max={cardio ? 100 : 150}
              step={cardio ? 0.1 : 2.5}
              unit={cardio ? "km" : "kg"}
              allowEmpty={!cardio}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {cardio ? "時間（分）" : "回数"}
            </Typography>
            <NumberPicker
              value={values.reps}
              onChange={(reps) => setValues((v) => ({ ...v, reps }))}
              min={0}
              max={cardio ? 300 : 100}
              step={1}
              unit={cardio ? "分" : "回"}
            />
          </Box>
        </Box>

        {!cardio && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              よく使う設定
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {WEIGHT_REPS_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={`${preset.weight}kg × ${preset.reps}回`}
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    setValues({ weight: preset.weight, reps: preset.reps })
                  }
                />
              ))}
            </Stack>
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
            id="set-count-label"
          >
            セット数: {count}セット
          </Typography>
          <Slider
            value={count}
            onChange={(_, value) => setCount(value as number)}
            min={1}
            max={5}
            step={1}
            marks
            valueLabelDisplay="auto"
            aria-labelledby="set-count-label"
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? "保存中..." : count === 1 ? "追加" : `${count}セット追加`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
