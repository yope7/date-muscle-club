'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { useSettingsStore } from '@/store/settingsStore';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsDialog = ({ open, onClose }: SettingsDialogProps) => {
  const { calendarDisplayMode, setCalendarDisplayMode } = useSettingsStore();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCalendarDisplayMode(event.target.value as 'color' | 'fire');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>設定</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" sx={{ mt: 2 }}>
          <FormLabel component="legend">カレンダー表示モード</FormLabel>
          <RadioGroup
            value={calendarDisplayMode}
            onChange={handleChange}
          >
            <FormControlLabel
              value="color"
              control={<Radio />}
              label="色で表示（回数に応じて色が濃くなる）"
            />
            <FormControlLabel
              value="fire"
              control={<Radio />}
              label="炎アイコンで表示（回数に応じて大きくなる）"
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}; 