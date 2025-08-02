"use client";

import React, { useState, useEffect } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  ListItemButton,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Switch,
  Avatar,
  ListItemAvatar,
  Badge,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  People as PeopleIcon,
  Mail as MailIcon,
  Groups as GroupsIcon,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { SettingsDialog } from "./SettingsDialog";
import { AboutDialog } from "./AboutDialog";
import { useWorkoutStore } from "@/store/workoutStore";
import { InviteFriend } from "./InviteFriend";
import { useUserStore } from "@/store/userStore";
import { FriendsList } from "./FriendsList";
import { InviteList } from "./InviteList";
import { TeamManagement } from "./TeamManagement";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  open,
  onClose,
}) => {
  const { user, isGuest, signOut } = useAuth();
  const { profile } = useUserStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [inviteListOpen, setInviteListOpen] = useState(false);
  const [teamManagementOpen, setTeamManagementOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hasPendingInvites, setHasPendingInvites] = useState(false);
  const { resetData } = useWorkoutStore();

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleResetOpen = () => {
    setResetOpen(true);
  };

  const handleResetClose = () => {
    setResetOpen(false);
  };

  const handleInviteOpen = () => {
    if (isGuest) {
      alert("ゲストユーザーは招待機能を利用できません。");
      return;
    }
    setInviteOpen(true);
  };

  const handleInviteClose = () => {
    setInviteOpen(false);
  };

  const handleFriendsOpen = () => {
    if (isGuest) {
      alert("ゲストユーザーは友達機能を利用できません。");
      return;
    }
    setFriendsOpen(true);
  };

  const handleFriendsClose = () => {
    setFriendsOpen(false);
  };

  const handleInviteListOpen = () => {
    if (isGuest) {
      alert("ゲストユーザーは招待機能を利用できません。");
      return;
    }
    setInviteListOpen(true);
  };

  const handleInviteListClose = () => {
    setInviteListOpen(false);
  };

  const handleTeamManagementOpen = () => {
    if (isGuest) {
      alert("ゲストユーザーはチーム機能を利用できません。");
      return;
    }
    setTeamManagementOpen(true);
  };

  const handleTeamManagementClose = () => {
    setTeamManagementOpen(false);
  };

  const handleReset = async () => {
    await resetData();
    handleResetClose();
  };

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, "invites"),
      where("toEmail", "==", user.email),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasPendingInvites(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <>
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: 280,
            zIndex: 1200,
          },
        }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            設定
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          <ListItemButton onClick={handleSettingsOpen}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="表示設定" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <NotificationsIcon />
            </ListItemIcon>
            <ListItemText primary="通知設定" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <PaletteIcon />
            </ListItemIcon>
            <ListItemText primary="テーマ設定" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <LanguageIcon />
            </ListItemIcon>
            <ListItemText primary="言語設定" />
          </ListItemButton>
          <Divider />
          <Typography variant="overline" sx={{ px: 2, py: 1 }}>
            友達
          </Typography>
          <ListItemButton onClick={handleFriendsOpen}>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="友達一覧" />
          </ListItemButton>
          <ListItemButton onClick={handleInviteListOpen}>
            <ListItemIcon>
              <Badge color="error" variant="dot" invisible={!hasPendingInvites}>
                <MailIcon />
              </Badge>
            </ListItemIcon>
            <ListItemText primary="招待一覧" />
          </ListItemButton>
          <ListItemButton onClick={handleInviteOpen}>
            <ListItemIcon>
              <PersonAddIcon />
            </ListItemIcon>
            <ListItemText primary="友達を招待" />
          </ListItemButton>
          <Divider />
          <Typography variant="overline" sx={{ px: 2, py: 1 }}>
            チーム
          </Typography>
          <ListItemButton onClick={handleTeamManagementOpen}>
            <ListItemIcon>
              <GroupsIcon />
            </ListItemIcon>
            <ListItemText primary="チーム管理" />
          </ListItemButton>
          <Divider />

          <Typography variant="overline" sx={{ px: 2, py: 1 }}>
            その他
          </Typography>
          <ListItemButton>
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="ヘルプ" />
          </ListItemButton>
          <ListItemButton onClick={() => setChangelogOpen(true)}>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="アプリについて" />
          </ListItemButton>
          <Divider />
          <Typography variant="overline" sx={{ px: 2, py: 1 }}>
            データ管理
          </Typography>
          <ListItemButton onClick={handleResetOpen}>
            <ListItemIcon>
              <DeleteIcon sx={{ color: "red" }} />
            </ListItemIcon>
            <ListItemText primary="データをリセット" sx={{ color: "red" }} />
          </ListItemButton>
        </List>
      </Drawer>
      <SettingsDialog open={settingsOpen} onClose={handleSettingsClose} />
      <Dialog open={resetOpen} onClose={handleResetClose}>
        <DialogTitle>データのリセット</DialogTitle>
        <DialogContent>
          <Typography>
            すべてのトレーニング記録が削除されます。この操作は取り消せません。
            本当にリセットしますか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetClose}>キャンセル</Button>
          <Button onClick={handleReset} color="error" variant="contained">
            リセット
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={inviteOpen}
        onClose={handleInviteClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <InviteFriend onClose={handleInviteClose} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={friendsOpen}
        onClose={handleFriendsClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>友達一覧</DialogTitle>
        <DialogContent>
          <FriendsList onClose={handleFriendsClose} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={inviteListOpen}
        onClose={handleInviteListClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>招待一覧</DialogTitle>
        <DialogContent>
          <InviteList onClose={handleInviteListClose} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={teamManagementOpen}
        onClose={handleTeamManagementClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>チーム管理</DialogTitle>
        <DialogContent>
          <TeamManagement />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTeamManagementClose}>閉じる</Button>
        </DialogActions>
      </Dialog>
      <AboutDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </>
  );
};
