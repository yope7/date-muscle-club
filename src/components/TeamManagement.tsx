import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { useTeamStore } from "@/store/teamStore";
import { useUserStore } from "@/store/userStore";
import { useAuth } from "@/hooks/useAuth";
import { CreateTeam } from "./CreateTeam";
import { InviteTeamMember } from "./InviteTeamMember";
import { Team } from "@/types/team";

export const TeamManagement: React.FC = () => {
  const { user } = useAuth();
  const {
    teams,
    currentTeam,
    teamMembers,
    fetchUserTeams,
    fetchTeamMembers,
    setCurrentTeam,
    deleteTeam,
    removeMember,
    isLoading,
    error,
    clearError,
  } = useTeamStore();
  const { profiles, friends, fetchFriends } = useUserStore();

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserTeams(user.uid);
      fetchFriends(user.uid);
    }
  }, [user, fetchUserTeams, fetchFriends]);

  useEffect(() => {
    if (currentTeam) {
      fetchTeamMembers(currentTeam.id);
    }
  }, [currentTeam, fetchTeamMembers]);

  const handleTeamSelect = (team: Team) => {
    setCurrentTeam(team);
  };

  const handleDeleteTeam = async (team: Team) => {
    if (window.confirm(`「${team.name}」を削除しますか？`)) {
      await deleteTeam(team.id);
    }
    setAnchorEl(null);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentTeam) return;

    const member = teamMembers.find((m) => m.userId === userId);
    if (!member) return;

    if (
      window.confirm(
        `${
          profiles[userId]?.displayName ||
          profiles[userId]?.username ||
          "メンバー"
        }をチームから削除しますか？`
      )
    ) {
      await removeMember(currentTeam.id, userId);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, team: Team) => {
    setAnchorEl(event.currentTarget);
    setSelectedTeam(team);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTeam(null);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">チーム管理</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setCreateTeamOpen(true)}
        >
          チームを作成
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {teams.length === 0 ? (
        <Card>
          <CardContent>
            <Typography
              variant="body1"
              textAlign="center"
              color="text.secondary"
            >
              まだチームに参加していません。
              <br />
              チームを作成するか、招待を受けてチームに参加しましょう。
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", gap: 2 }}>
          {/* チーム一覧 */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              チーム一覧
            </Typography>
            {teams.map((team) => (
              <Card
                key={team.id}
                sx={{
                  mb: 1,
                  cursor: "pointer",
                  border: currentTeam?.id === team.id ? 2 : 1,
                  borderColor:
                    currentTeam?.id === team.id ? "primary.main" : "divider",
                }}
                onClick={() => handleTeamSelect(team)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="h6">{team.name}</Typography>
                      {team.description && (
                        <Typography variant="body2" color="text.secondary">
                          {team.description}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, team);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* メンバー一覧 */}
          {currentTeam && (
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle1">
                  {currentTeam.name} のメンバー
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setInviteMemberOpen(true)}
                >
                  メンバーを招待
                </Button>
              </Box>

              <List>
                {teamMembers.map((member) => {
                  const profile = profiles[member.userId];
                  return (
                    <ListItem key={member.userId} divider>
                      <ListItemAvatar>
                        <Avatar src={profile?.photoURL}>
                          {(profile?.displayName || profile?.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          profile?.displayName ||
                          profile?.username ||
                          "Unknown User"
                        }
                        secondary={profile?.email}
                      />
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Chip
                          label={
                            member.role === "owner"
                              ? "オーナー"
                              : member.role === "admin"
                              ? "管理者"
                              : "メンバー"
                          }
                          size="small"
                          color={
                            member.role === "owner"
                              ? "error"
                              : member.role === "admin"
                              ? "warning"
                              : "default"
                          }
                        />
                        {member.role !== "owner" && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            削除
                          </Button>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </Box>
      )}

      {/* ダイアログ */}
      <CreateTeam
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
      />

      {currentTeam && (
        <InviteTeamMember
          open={inviteMemberOpen}
          onClose={() => setInviteMemberOpen(false)}
          team={currentTeam}
        />
      )}

      {/* チームメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedTeam && (
          <MenuItem onClick={() => handleDeleteTeam(selectedTeam)}>
            チームを削除
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};
