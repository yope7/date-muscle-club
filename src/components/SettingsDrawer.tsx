"use client";

import React from "react";
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
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { SettingsDialog } from "./SettingsDialog";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDrawer = ({ open, onClose }: SettingsDrawerProps) => {
  const { user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

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
        <List>
          <ListItem
            secondaryAction={
              <IconButton edge="end" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            }
          >
            <ListItemText primary="設定" />
          </ListItem>
          <Divider />
          <ListItemButton
            onClick={() => {
              setIsSettingsOpen(true);
              onClose();
            }}
          >
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
            その他
          </Typography>
          <ListItemButton>
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="ヘルプ" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="アプリについて" />
          </ListItemButton>
        </List>
      </Drawer>
      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
