import React, { useEffect, useState } from "react";
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/store/userStore";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Invite {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  toEmail: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: any;
  updatedAt: any;
}

interface InviteListProps {
  onClose?: () => void;
}

export const InviteList: React.FC<InviteListProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { addFriend } = useUserStore();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

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
          inviteList.push({ id: doc.id, ...doc.data() } as Invite);
        });
        setInvites(inviteList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching invites:", error);
        setError("招待の取得中にエラーが発生しました");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAcceptInvite = async (invite: Invite) => {
    if (!user) return;

    try {
      // 招待のステータスを更新
      await updateDoc(doc(db, "invites", invite.id), {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });

      // フレンド関係を追加
      await addFriend(user.uid, invite.fromUserId);

      setSuccess("招待を承認しました");
      setTimeout(() => {
        setSuccess(null);
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      console.error("Error accepting invite:", error);
      setError("招待の承認中にエラーが発生しました");
    }
  };

  const handleRejectInvite = async (invite: Invite) => {
    try {
      await updateDoc(doc(db, "invites", invite.id), {
        status: "rejected",
        updatedAt: serverTimestamp(),
      });

      setSuccess("招待を拒否しました");
      setTimeout(() => {
        setSuccess(null);
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      console.error("Error rejecting invite:", error);
      setError("招待の拒否中にエラーが発生しました");
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
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (invites.length === 0) {
    return (
      <Typography variant="body1" sx={{ mt: 2, textAlign: "center" }}>
        保留中の招待はありません
      </Typography>
    );
  }

  return (
    <Box>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      <List>
        {invites.map((invite) => (
          <ListItem
            key={invite.id}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              mb: 1,
            }}
          >
            <ListItemAvatar>
              <Avatar>{invite.fromUserEmail[0].toUpperCase()}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={invite.fromUserEmail}
              secondary={`招待日時: ${new Date(
                invite.createdAt?.toDate()
              ).toLocaleString()}`}
            />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleRejectInvite(invite)}
              >
                拒否
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleAcceptInvite(invite)}
              >
                承認
              </Button>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
