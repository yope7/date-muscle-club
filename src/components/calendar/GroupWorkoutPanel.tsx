import React, { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { Check as CheckIcon, Group as GroupIcon } from "@mui/icons-material";

export type GroupCandidate = {
  id: string;
  name: string;
  type: "team" | "friend";
};

interface GroupWorkoutPanelProps {
  members: string[]; // 保存済みの参加メンバー（空なら合同トレーニングではない）
  candidates: GroupCandidate[];
  onSave: (members: string[]) => Promise<void>;
}

const MemberAvatars: React.FC<{
  members: string[];
  nameOf: (id: string) => string;
}> = ({ members, nameOf }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
    {members.slice(0, 3).map((memberId) => (
      <Avatar
        key={memberId}
        alt={nameOf(memberId)}
        sx={{ width: 24, height: 24, fontSize: "0.75rem", bgcolor: "primary.main" }}
      >
        {nameOf(memberId).charAt(0)}
      </Avatar>
    ))}
    {members.length > 3 && (
      <Typography variant="caption" color="text.secondary">
        +{members.length - 3}
      </Typography>
    )}
  </Box>
);

export const GroupWorkoutPanel: React.FC<GroupWorkoutPanelProps> = ({
  members,
  candidates,
  onSave,
}) => {
  const [selectOpen, setSelectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isGroupWorkout = members.length > 0;

  const nameOf = (id: string) =>
    candidates.find((c) => c.id === id)?.name ?? "メンバー";

  const save = async (next: string[]) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      setSelectOpen(false);
      setCancelOpen(false);
    } catch (e) {
      console.error("Error saving group workout:", e);
      setError("合同トレーニングの保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (id: string) =>
    setSelection((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Button
          variant={isGroupWorkout ? "contained" : "outlined"}
          startIcon={<GroupIcon />}
          color={isGroupWorkout ? "primary" : "inherit"}
          onClick={() => {
            setSelection(members);
            setSelectOpen(true);
          }}
        >
          {isGroupWorkout ? "合同トレーニングのメンバー" : "合同トレーニングにする"}
        </Button>
        {isGroupWorkout && (
          <>
            <MemberAvatars members={members} nameOf={nameOf} />
            <Button size="small" color="error" onClick={() => setCancelOpen(true)}>
              解除
            </Button>
          </>
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Dialog open={selectOpen} onClose={() => setSelectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>合同トレーニングメンバーを選択</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            一緒にトレーニングしたメンバーを選択してください
          </Typography>
          <List>
            {candidates.map((candidate) => {
              const selected = selection.includes(candidate.id);
              return (
                <ListItemButton
                  key={candidate.id}
                  selected={selected}
                  onClick={() => toggleSelection(candidate.id)}
                  role="checkbox"
                  aria-checked={selected}
                >
                  <ListItemIcon>
                    <CheckIcon color={selected ? "primary" : "disabled"} />
                  </ListItemIcon>
                  <ListItemText primary={candidate.name} />
                  <Chip
                    label={candidate.type === "team" ? "チーム" : "フレンド"}
                    size="small"
                    variant="outlined"
                  />
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectOpen(false)} disabled={saving}>
            キャンセル
          </Button>
          <Button
            onClick={() => save(selection)}
            variant="contained"
            disabled={saving || selection.length === 0}
          >
            確定
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>合同トレーニングの解除</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>合同トレーニングを解除しますか？</Typography>
          <MemberAvatars members={members} nameOf={nameOf} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={saving}>
            戻る
          </Button>
          <Button
            onClick={() => save([])}
            variant="contained"
            color="error"
            disabled={saving}
          >
            解除する
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
