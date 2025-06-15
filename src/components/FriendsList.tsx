import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { InviteList } from "./InviteList";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  deleteDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WorkoutRecord } from "@/types/workout";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useUserStore } from "@/store/userStore";
import { WorkoutGraphs } from "./WorkoutGraphs";

interface Friend {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  workouts?: WorkoutRecord[];
  stats?: {
    totalWorkouts: number;
    totalSets: number;
    totalReps: number;
    maxWeight: number;
    lastWorkoutDate?: Date;
  };
}

interface FriendsListProps {
  onClose?: () => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { friends, profiles, fetchFriends } = useUserStore();
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [friendProfileOpen, setFriendProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadFriends = async () => {
      try {
        setLoading(true);
        console.log("友人一覧の取得を開始:", user.uid);
        await fetchFriends(user.uid);
        console.log("友人一覧の取得が完了:", friends);
        setError(null);
      } catch (err) {
        console.error("Error loading friends:", err);
        setError("友達の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [user, fetchFriends]);

  useEffect(() => {
    console.log("友人一覧の状態:", {
      friends,
      profiles,
      selectedFriend,
      friendProfileOpen,
    });
  }, [friends, profiles, selectedFriend, friendProfileOpen]);

  const handleFriendClick = (friendId: string) => {
    setSelectedFriend(friendId);
    setFriendProfileOpen(true);
  };

  const handleFriendProfileClose = () => {
    setFriendProfileOpen(false);
    setSelectedFriend(null);
  };

  if (!user) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>ログインが必要です</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const selectedProfile = selectedFriend ? profiles[selectedFriend] : null;

  return (
    <>
      <List>
        {friends.map((friend) => {
          const profile = profiles[friend.id];
          return (
            <ListItemButton
              key={friend.id}
              onClick={() => handleFriendClick(friend.id)}
            >
              <ListItemAvatar>
                <Avatar src={profile?.photoURL || undefined} />
              </ListItemAvatar>
              <ListItemText
                primary={profile?.displayName || profile?.username || "ユーザー"}
                secondary={profile?.email || friend.email}
              />
            </ListItemButton>
          );
        })}
        {friends.length === 0 && (
          <ListItem>
            <ListItemText
              primary="友達がいません"
              secondary="友達を招待して、トレーニング記録を共有しましょう"
            />
          </ListItem>
        )}
      </List>

      <Dialog
        open={friendProfileOpen}
        onClose={handleFriendProfileClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {selectedProfile?.username || "友達のプロフィール"}
            </Typography>
            <IconButton onClick={handleFriendProfileClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFriend && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <Avatar
                  src={selectedProfile?.photoURL || undefined}
                  sx={{ width: 80, height: 80 }}
                />
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {selectedProfile?.displayName || selectedProfile?.username || "ユーザー"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedProfile?.email}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" gutterBottom>
                トレーニング統計
              </Typography>
              <WorkoutGraphs userId={selectedProfile?.id} workouts={selectedProfile?.workouts || []} />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
