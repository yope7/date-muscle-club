"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Chip,
  Paper,
} from "@mui/material";
import {
  FitnessCenter as FitnessIcon,
  Person as PersonIcon,
  Update as UpdateIcon,
  Code as CodeIcon,
  Favorite as HeartIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`about-tabpanel-${index}`}
      aria-labelledby={`about-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const [tabValue, setTabValue] = useState(0);
  const [changelogContent, setChangelogContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchChangelog();
    }
  }, [open]);

  const fetchChangelog = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/changelog");
      if (response.ok) {
        const content = await response.text();
        setChangelogContent(content);
      } else {
        setChangelogContent("# 更新ログ\n\n更新ログの読み込みに失敗しました。");
      }
    } catch (error) {
      console.error("Error fetching changelog:", error);
      setChangelogContent("# 更新ログ\n\n更新ログの読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle
        sx={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          textAlign: "center",
          pb: 1,
        }}
      >
        このアプリについて
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="about tabs"
            centered
            sx={{
              "& .MuiTab-root": {
                minHeight: 64,
                fontSize: "0.9rem",
                fontWeight: 500,
              },
            }}
          >
            <Tab
              icon={<FitnessIcon />}
              label="アプリの説明"
              iconPosition="start"
            />
            <Tab
              icon={<PersonIcon />}
              label="作者について"
              iconPosition="start"
            />
            <Tab icon={<UpdateIcon />} label="更新ログ" iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <Card elevation={2}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <FitnessIcon
                        sx={{ fontSize: 40, color: "primary.main", mr: 2 }}
                      />
                      <Typography variant="h5" component="h2" fontWeight="bold">
                        Date Muscle Club
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{ lineHeight: 1.8 }}
                    >
                      Date Muscle Clubは、筋トレ管理アプリです．
                      <br />
                      北千里体育館でのトレーニングに特化していますが，そうじゃなくても使えます．
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 3,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Card elevation={1}>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        <StarIcon sx={{ color: "warning.main", mr: 1 }} />
                        <Typography variant="h6" fontWeight="600">
                          主な機能
                        </Typography>
                      </Box>
                      <Box component="ul" sx={{ pl: 2, m: 0 }}>
                        <Typography
                          component="li"
                          variant="body2"
                          sx={{ mb: 1 }}
                        >
                          日付別のワークアウト記録
                        </Typography>
                        <Typography
                          component="li"
                          variant="body2"
                          sx={{ mb: 1 }}
                        >
                          セット数、重量、回数の詳細記録
                        </Typography>
                        <Typography
                          component="li"
                          variant="body2"
                          sx={{ mb: 1 }}
                        >
                          最大重量の推移グラフ
                        </Typography>
                        <Typography
                          component="li"
                          variant="body2"
                          sx={{ mb: 1 }}
                        >
                          カレンダー表示での進捗確認
                        </Typography>
                        <Typography
                          component="li"
                          variant="body2"
                          sx={{ mb: 1 }}
                        >
                          フレンドとの進捗共有
                        </Typography>
                        <Typography
                          component="li"
                          variant="body2"
                          sx={{ mb: 1 }}
                        >
                          チーム機能での協力トレーニング
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Card elevation={1}>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        <CodeIcon sx={{ color: "info.main", mr: 1 }} />
                        <Typography variant="h6" fontWeight="600">
                          技術仕様
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        <Chip label="Next.js 14" size="small" color="primary" />
                        <Chip
                          label="TypeScript"
                          size="small"
                          color="secondary"
                        />
                        <Chip label="Firebase" size="small" color="success" />
                        <Chip label="Material-UI" size="small" color="info" />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <Card elevation={2}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          mr: 3,
                          bgcolor: "primary.main",
                          fontSize: "2rem",
                        }}
                      >
                        N
                      </Avatar>
                      <Box>
                        <Typography
                          variant="h5"
                          component="h2"
                          fontWeight="bold"
                        >
                          開発者
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{ lineHeight: 1.8 }}
                    >
                      このアプリの説明を今後書きます．
                    </Typography>
                    <Typography
                      variant="body1"
                      paragraph
                      sx={{ lineHeight: 1.8 }}
                    >
                      フィードバックはDMかgithubまでお願いします
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
            {isLoading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 4,
                }}
              >
                <Box
                  sx={{
                    animation: "spin 1s linear infinite",
                    width: "2rem",
                    height: "2rem",
                    border: "2px solid #e5e7eb",
                    borderTop: "2px solid #374151",
                    borderRadius: "50%",
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ fontSize: "0.875rem" }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                          fontWeight: "bold",
                          mb: 2,
                          color: "#FFFFFF",
                          borderBottom: "2px solid #1976d2",
                          pb: 1,
                        }}
                      >
                        {children}
                      </Typography>
                    ),
                    h2: ({ children }) => (
                      <Typography
                        variant="h5"
                        component="h2"
                        sx={{
                          fontWeight: "600",
                          mb: 1.5,
                          mt: 3,
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <UpdateIcon sx={{ mr: 1, color: "primary.main" }} />
                        {children}
                      </Typography>
                    ),
                    h3: ({ children }) => (
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          fontWeight: "500",
                          mb: 1,
                          mt: 2,
                          color: "#FFFFFF",
                          pl: 2,
                          borderLeft: "3px solid #1976d2",
                        }}
                      >
                        {children}
                      </Typography>
                    ),
                    p: ({ children }) => (
                      <Typography
                        variant="body2"
                        sx={{
                          mb: 1,
                          color: "#FFFFFF",
                          lineHeight: 1.6,
                          pl: 2,
                        }}
                      >
                        {children}
                      </Typography>
                    ),
                    ul: ({ children }) => (
                      <Box
                        component="ul"
                        sx={{
                          listStyleType: "disc",
                          pl: 4,
                          mb: 2,
                          "& li": {
                            color: "#FFFFFF",
                            mb: 0.5,
                            lineHeight: 1.5,
                          },
                        }}
                      >
                        {children}
                      </Box>
                    ),
                    li: ({ children }) => (
                      <Typography
                        component="li"
                        variant="body2"
                        sx={{
                          color: "#FFFFFF",
                          mb: 0.5,
                          lineHeight: 1.5,
                        }}
                      >
                        {children}
                      </Typography>
                    ),
                    strong: ({ children }) => (
                      <Box
                        component="span"
                        sx={{
                          fontWeight: "600",
                          color: "#FFFFFF",
                          bgcolor: "primary.light",
                          px: 0.5,
                          borderRadius: 0.5,
                        }}
                      >
                        {children}
                      </Box>
                    ),
                    hr: () => (
                      <Divider
                        sx={{
                          my: 3,
                          borderColor: "#1976d2",
                          borderWidth: 2,
                        }}
                      />
                    ),
                  }}
                >
                  {changelogContent}
                </ReactMarkdown>
              </Box>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
