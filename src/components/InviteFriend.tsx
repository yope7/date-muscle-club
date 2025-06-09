import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/store/userStore";

interface InviteFriendProps {
  onClose?: () => void;
  isDialog?: boolean;
}

export const InviteFriend: React.FC<InviteFriendProps> = ({
  onClose,
  isDialog = false,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setEmail("");
    setError(null);
    setSuccess(false);
    if (onClose) {
      onClose();
    }
  };

  const handleInvite = async () => {
    if (!user) return;
    if (!email) {
      setError("メールアドレスを入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 招待データをFirestoreに保存
      await addDoc(collection(db, "invites"), {
        fromUserId: user.uid,
        fromUserEmail: user.email,
        toEmail: email,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error("Invite error:", err);
      setError("招待の送信中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body1" gutterBottom>
        共有したい友達のメールアドレスを入力してください。
        招待が承認されると、あなたのトレーニング記録を閲覧できるようになります。
      </Typography>
      <TextField
        fullWidth
        label="メールアドレス"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        margin="normal"
        error={!!error}
        helperText={error}
      />
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          招待を送信しました！
        </Alert>
      )}
    </Box>
  );

  if (isDialog) {
    return (
      <>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(true)}
          sx={{ mb: 2 }}
        >
          友達を招待
        </Button>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>友達を招待</DialogTitle>
          <DialogContent>{content}</DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              キャンセル
            </Button>
            <Button
              onClick={handleInvite}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "招待を送信"}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <DialogTitle>友達を招待</DialogTitle>
      <DialogContent>{content}</DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={handleInvite}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "招待を送信"}
        </Button>
      </DialogActions>
    </Box>
  );
};
