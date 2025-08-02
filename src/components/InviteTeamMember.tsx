import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Alert,
  CircularProgress,
  Checkbox,
  Box,
} from "@mui/material";
import { useTeamStore } from "@/store/teamStore";
import { useUserStore } from "@/store/userStore";
import { useAuth } from "@/hooks/useAuth";
import { Team } from "@/types/team";

interface InviteTeamMemberProps {
  open: boolean;
  onClose: () => void;
  team: Team;
}

export const InviteTeamMember: React.FC<InviteTeamMemberProps> = ({
  open,
  onClose,
  team,
}) => {
  const { user } = useAuth();
  const { inviteMember, isLoading, error, clearError } = useTeamStore();
  const { friends, fetchFriends } = useUserStore();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);

  // コンポーネントが開かれたときにフレンドデータを取得
  useEffect(() => {
    if (open && user) {
      fetchFriends(user.uid);
    }
  }, [open, user, fetchFriends]);

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleInvite = async () => {
    if (selectedFriends.length === 0) return;

    const promises = selectedFriends.map((friendId) =>
      inviteMember(team.id, friendId)
    );

    await Promise.all(promises);

    if (!error) {
      setInvitedFriends((prev) => [...prev, ...selectedFriends]);
      setSelectedFriends([]);
      onClose();
    }
  };

  const handleClose = () => {
    clearError();
    setSelectedFriends([]);
    onClose();
  };

  // 既に招待済みのフレンドを除外
  const availableFriends = friends.filter(
    (friend) => !invitedFriends.includes(friend.id)
  );

  // デバッグ用ログ
  console.log("Friends from useUserStore:", friends);
  console.log("Available friends:", availableFriends);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>チームメンバーを招待</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {team.name}に招待するフレンドを選択してください。
        </Typography>

        {availableFriends.length === 0 ? (
          <Typography variant="body1" sx={{ mt: 2, textAlign: "center" }}>
            招待可能なフレンドがいません。
          </Typography>
        ) : (
          <List sx={{ mt: 2 }}>
            {availableFriends.map((friend) => (
              <ListItem
                key={friend.id}
                dense
                onClick={() => handleFriendToggle(friend.id)}
              >
                <Checkbox
                  edge="start"
                  checked={selectedFriends.includes(friend.id)}
                  tabIndex={-1}
                  disableRipple
                />
                <ListItemAvatar>
                  <Avatar
                    src={friend.photoURL}
                    alt={friend.displayName || friend.username}
                  >
                    {(friend.displayName || friend.username)
                      .charAt(0)
                      .toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={friend.displayName || friend.username}
                  secondary={friend.email}
                />
              </ListItem>
            ))}
          </List>
        )}

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
          onClick={handleInvite}
          variant="contained"
          color="primary"
          disabled={isLoading || selectedFriends.length === 0}
        >
          {isLoading ? (
            <CircularProgress size={24} />
          ) : (
            `${selectedFriends.length}人を招待`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
