"use client";

import React, { useState } from "react";
import { Alert, Box, Tab, Tabs } from "@mui/material";
import { useSwipeable } from "react-swipeable";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/Calendar";
import { Feed } from "@/components/Feed";
import { MyPage } from "@/components/MyPage";
import { LoginForm } from "@/components/LoginForm";
import { LoginRequired } from "@/components/LoginRequired";

const TAB_COUNT = 3;

export default function Home() {
  const { user, isGuest } = useAuth();
  const [tab, setTab] = useState(0);

  const handlers = useSwipeable({
    onSwipedLeft: () => setTab((t) => Math.min(t + 1, TAB_COUNT - 1)),
    onSwipedRight: () => setTab((t) => Math.max(t - 1, 0)),
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 50, // px
  });

  if (!user) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <LoginForm />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
        overflow: "auto",
        touchAction: "pan-x pan-y",
      }}
    >
      {isGuest && (
        <Alert severity="info" sx={{ mb: 2 }}>
          ゲストログイン中です。記録は保存されません。
        </Alert>
      )}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          aria-label="画面の切り替え"
          variant="fullWidth"
          sx={{ "& .MuiTab-root": { minWidth: 0, flex: 1 } }}
        >
          <Tab label="カレンダー" />
          <Tab label="フィード" />
          <Tab label="マイページ" />
        </Tabs>
      </Box>
      <Box
        {...handlers}
        sx={{
          overflow: "auto",
          touchAction: "pan-x pan-y",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100vh - 48px)",
        }}
      >
        <Box sx={{ p: 2, flex: 1 }}>
          {tab === 0 && <Calendar />}
          {tab === 1 &&
            (isGuest ? (
              <LoginRequired description="フレンドの投稿を見るにはログインしてください" />
            ) : (
              <Feed />
            ))}
          {tab === 2 &&
            (isGuest ? (
              <LoginRequired description="マイページを利用するにはログインしてください" />
            ) : (
              <MyPage />
            ))}
        </Box>
      </Box>
    </Box>
  );
}
