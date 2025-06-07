import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Invite {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export const InviteList: React.FC = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'invites'),
      where('toEmail', '==', user.email),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inviteList: Invite[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        inviteList.push({
          id: doc.id,
          fromUserId: data.fromUserId,
          fromUserEmail: data.fromUserEmail,
          toEmail: data.toEmail,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      setInvites(inviteList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching invites:', err);
      setError('招待の取得に失敗しました');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.email]);

  const handleInvite = async (inviteId: string, accept: boolean) => {
    if (!user) return;

    try {
      const inviteRef = doc(db, 'invites', inviteId);
      const inviteDoc = await getDoc(inviteRef);
      
      if (!inviteDoc.exists()) {
        throw new Error('招待が見つかりません');
      }

      const inviteData = inviteDoc.data();
      await updateDoc(inviteRef, {
        status: accept ? 'accepted' : 'rejected',
        updatedAt: serverTimestamp()
      });

      if (accept) {
        // 共有設定を追加
        await addDoc(collection(db, 'shares'), {
          fromUserId: inviteData.fromUserId,
          toUserId: user.uid,
          fromUserEmail: inviteData.fromUserEmail,
          toUserEmail: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        setSuccess('招待を承認しました');
      } else {
        setSuccess('招待を拒否しました');
      }

      // 招待リストから該当の招待を削除
      setInvites(prevInvites => prevInvites.filter(invite => invite.id !== inviteId));

      // 3秒後にメッセージを消す
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error handling invite:', err);
      setError('招待の処理に失敗しました');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (invites.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary">
          保留中の招待はありません
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Paper sx={{ mt: 2 }}>
        <List>
          {invites.map((invite) => (
            <ListItem
              key={invite.id}
              secondaryAction={
                <Box>
                  <Button
                    color="primary"
                    onClick={() => handleInvite(invite.id, true)}
                    sx={{ mr: 1 }}
                  >
                    承認
                  </Button>
                  <Button
                    color="error"
                    onClick={() => handleInvite(invite.id, false)}
                  >
                    拒否
                  </Button>
                </Box>
              }
            >
              <ListItemAvatar>
                <Avatar>{invite.fromUserEmail[0].toUpperCase()}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${invite.fromUserEmail}からの招待`}
                secondary={`送信日時: ${invite.createdAt.toLocaleString('ja-JP')}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </>
  );
}; 