import React, { useEffect } from "react";
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
  Box,
  Chip,
} from "@mui/material";
import { useTeamStore } from "@/store/teamStore";
import { useUserStore } from "@/store/userStore";
import { useAuth } from "@/hooks/useAuth";

interface TeamInviteListProps {
  open: boolean;
  onClose: () => void;
}

export const TeamInviteList: React.FC<TeamInviteListProps> = ({
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const {
    teamInvites,
    fetchTeamInvites,
    acceptInvite,
    rejectInvite,
    isLoading,
    error,
    clearError,
  } = useTeamStore();
  const { profiles } = useUserStore();

  useEffect(() => {
    if (open && user) {
      fetchTeamInvites(user.uid);
    }
  }, [open, user, fetchTeamInvites]);

  const handleAccept = async (inviteId: string) => {
    await acceptInvite(inviteId);
    if (!error) {
      onClose();
    }
  };

  const handleReject = async (inviteId: string) => {
    await rejectInvite(inviteId);
  };

  const handleClose = () => {
    clearError();
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>チーム招待</DialogTitle>
      <DialogContent>
        {teamInvites.length === 0 ? (
          <Typography variant="body1" sx={{ mt: 2, textAlign: "center" }}>
            保留中のチーム招待はありません
          </Typography>
        ) : (
          <List>
            {teamInvites.map((invite) => {
              const fromUser = profiles[invite.fromUserId];
              return (
                <ListItem key={invite.id} divider>
                  <ListItemAvatar>
                    <Avatar src={fromUser?.photoURL}>
                      {fromUser?.displayName?.charAt(0).toUpperCase() || "U"}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body1">
                          {fromUser?.displayName ||
                            fromUser?.username ||
                            "Unknown User"}
                        </Typography>
                        <Chip label="チーム招待" size="small" color="primary" />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {fromUser?.email} があなたをチームに招待しています
                      </Typography>
                    }
                  />
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleReject(invite.id)}
                    >
                      拒否
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={() => handleAccept(invite.id)}
                    >
                      参加
                    </Button>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};
