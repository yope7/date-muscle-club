import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useTeamStore } from "@/store/teamStore";

interface CreateTeamProps {
  open: boolean;
  onClose: () => void;
}

export const CreateTeam: React.FC<CreateTeamProps> = ({ open, onClose }) => {
  const { createTeam, isLoading, error, clearError } = useTeamStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createTeam(name.trim(), description.trim() || undefined);

    if (!error) {
      setName("");
      setDescription("");
      onClose();
    }
  };

  const handleClose = () => {
    clearError();
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>チームを作成</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            新しいチームを作成して、友達を招待しましょう。
          </Typography>

          <TextField
            fullWidth
            label="チーム名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            required
            disabled={isLoading}
            autoFocus
          />

          <TextField
            fullWidth
            label="説明（任意）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            disabled={isLoading}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? <CircularProgress size={24} /> : "チームを作成"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
