import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import { WorkoutRecord } from "@/types/workout";
import { WorkoutGraphs } from "../WorkoutGraphs";
import { WorkoutStats } from "../WorkoutStats";
import { WorkoutHistory } from "../WorkoutHistory";
import { FeedUserInfo } from "./FeedCard";

const MAX_COMMENT_LENGTH = 500;

export const CommentDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}> = ({ open, onClose, onSubmit }) => {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setContent("");
      setError(null);
    }
  }, [open]);

  const trimmed = content.trim();

  const handleSubmit = async () => {
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (e) {
      console.error("Error posting comment:", e);
      setError("コメントの投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>コメントを入力</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          error={content.length > MAX_COMMENT_LENGTH}
          helperText={`${content.length} / ${MAX_COMMENT_LENGTH}`}
          slotProps={{ htmlInput: { "aria-label": "コメント" } }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !trimmed || content.length > MAX_COMMENT_LENGTH || submitting
          }
        >
          投稿
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ProfileDialog: React.FC<{
  userInfo: FeedUserInfo | null;
  userId: string | null;
  workouts: WorkoutRecord[];
  onClose: () => void;
}> = ({ userInfo, userId, workouts, onClose }) => (
  <Dialog open={!!userId} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar src={userInfo?.photoURL} sx={{ width: 80, height: 80 }} />
        <Box>
          <Typography variant="h5" gutterBottom>
            {userInfo?.displayName || "不明なユーザー"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userInfo?.email}
          </Typography>
        </Box>
      </Box>
    </DialogTitle>
    <DialogContent>
      {userId && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ my: 2 }} />
          <WorkoutStats workouts={workouts} />
          <WorkoutGraphs workouts={workouts} />
          <WorkoutHistory workouts={workouts} />
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>閉じる</Button>
    </DialogActions>
  </Dialog>
);

export const IntensityDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>トレーニング強度について</DialogTitle>
    <DialogContent>
      <Typography variant="body1" gutterBottom>
        強度は以下の計算式で算出されます：
      </Typography>
      <Box
        sx={{
          p: 2,
          bgcolor: "action.hover",
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          mb: 2,
        }}
      >
        <Typography variant="body1" fontFamily="monospace">
          強度 = (重量 / その日の最大重量) × レップ数
        </Typography>
      </Box>
      <Typography variant="body2">
        有酸素運動は重量ではないため、強度の計算には含めません。
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>閉じる</Button>
    </DialogActions>
  </Dialog>
);
