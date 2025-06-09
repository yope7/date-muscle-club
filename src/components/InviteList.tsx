import React, { useEffect, useState } from "react";
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
  Snackbar,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Invite {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  toEmail: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  fromUserDisplayName: string;
  fromUserPhotoURL: string;
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
      collection(db, "invites"),
      where("toEmail", "==", user.email),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
            updatedAt: data.updatedAt?.toDate() || new Date(),
            fromUserDisplayName: data.fromUserDisplayName,
            fromUserPhotoURL: data.fromUserPhotoURL,
          });
        });
        setInvites(inviteList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching invites:", err);
        setError("招待の取得に失敗しました");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.email]);

  const handleInvite = async (invite: Invite) => {
    if (!user) return;

    try {
      // 招待を承認
      await updateDoc(doc(db, "invites", invite.id), {
        status: "accepted",
      });

      // 友達関係を相互に作成
      const batch = writeBatch(db);

      // 自分から相手への友達関係
      const myFriendRef = doc(collection(db, "friends"));
      batch.set(myFriendRef, {
        userId: user.uid,
        friendId: invite.fromUserId,
        friendEmail: invite.fromUserEmail,
        friendDisplayName:
          invite.fromUserDisplayName || invite.fromUserEmail.split("@")[0],
        friendPhotoURL: invite.fromUserPhotoURL || null,
        createdAt: serverTimestamp(),
      });

      // 相手から自分への友達関係
      const theirFriendRef = doc(collection(db, "friends"));
      batch.set(theirFriendRef, {
        userId: invite.fromUserId,
        friendId: user.uid,
        friendEmail: user.email || "",
        friendDisplayName:
          user.displayName || user.email?.split("@")[0] || "ユーザー",
        friendPhotoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      setSuccess("招待を承認しました");
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("招待の承認に失敗しました");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
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
                    onClick={() => handleInvite(invite)}
                    sx={{ mr: 1 }}
                  >
                    承認
                  </Button>
                </Box>
              }
            >
              <ListItemAvatar>
                <Avatar>{invite.fromUserEmail[0].toUpperCase()}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${invite.fromUserEmail}からの招待`}
                secondary={`送信日時: ${invite.createdAt.toLocaleString(
                  "ja-JP"
                )}`}
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
