import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/store/userStore";
import { WorkoutGraphs } from "./WorkoutGraphs";

export const FriendsList: React.FC = () => {
  const { user } = useAuth();
  const { friends, profiles, fetchFriends, loadFriendWorkouts } =
    useUserStore();
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchFriends(user.uid)
      .then(() => setError(null))
      .catch((err) => {
        console.error("Error loading friends:", err);
        setError("友達の取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, [user, fetchFriends]);

  const handleFriendClick = (friendId: string) => {
    setSelectedFriend(friendId);
    loadFriendWorkouts(friendId);
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
        open={selectedFriend !== null}
        onClose={() => setSelectedFriend(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {selectedProfile?.username || "友達のプロフィール"}
            </Typography>
            <IconButton
              onClick={() => setSelectedFriend(null)}
              aria-label="閉じる"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFriend && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Avatar
                  src={selectedProfile?.photoURL || undefined}
                  sx={{ width: 80, height: 80 }}
                />
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {selectedProfile?.displayName ||
                      selectedProfile?.username ||
                      "ユーザー"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedProfile?.email}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" gutterBottom>
                トレーニング統計
              </Typography>
              <WorkoutGraphs workouts={selectedProfile?.workouts || []} />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
