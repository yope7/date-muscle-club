import React, { useState } from 'react';
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
  CircularProgress
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const InviteFriend: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setError(null);
    setSuccess(false);
  };

  const handleInvite = async () => {
    if (!user) return;
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 招待データをFirestoreに保存
      await addDoc(collection(db, 'invites'), {
        fromUserId: user.uid,
        fromUserEmail: user.email,
        toEmail: email,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError('招待の送信に失敗しました。もう一度お試しください。');
      console.error('Invite error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpen}
        sx={{ mb: 2 }}
      >
        友達を招待
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>友達を招待</DialogTitle>
        <DialogContent>
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
        </DialogContent>
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
            {loading ? <CircularProgress size={24} /> : '招待を送信'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 