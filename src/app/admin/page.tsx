"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import {
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  FitnessCenter as FitnessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  List as ListIcon,
} from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { WorkoutRecord } from "@/types/workout";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutRecord[]>([]);
  const [unknownWorkouts, setUnknownWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [maintenanceProcessing, setMaintenanceProcessing] = useState(false);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState<string | null>(
    null
  );
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  // 管理者権限チェック
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      console.log("Checking admin status for:", user.email);

      try {
        const userDoc = await getDocs(
          query(collection(db, "users"), where("email", "==", user.email))
        );

        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          if (!userData.isAdmin) {
            setError("管理者権限がありません");
            console.warn("User is not an admin:", user.email);
          } else {
            // 管理者権限がある場合はユーザー一覧を取得
            console.log("Admin access granted for:", user.email);
            fetchUsers();
          }
        } else {
          setError("管理者権限がありません");
          console.warn("User document not found for:", user.email);
        }
      } catch (err) {
        setError("管理者権限の確認に失敗しました");
        console.error("Failed to check admin status:", err);
      }
    };

    checkAdminStatus();
  }, [user]);

  // ユーザー一覧を取得
  const fetchUsers = async () => {
    setLoading(true);
    console.log("Fetching users...");
    try {
      const usersQuery = query(collection(db, "users"), orderBy("email"));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(usersData);
      console.log("Successfully fetched users:", usersData);
    } catch (err) {
      setError("ユーザー一覧の取得に失敗しました");
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  // 全ワークアウトを取得
  const fetchAllWorkouts = async (userId: string) => {
    setLoading(true);
    console.log(`Fetching all workouts for user: ${userId}`);
    try {
      const workoutsQuery = query(
        collection(db, "users", userId, "workouts"),
        orderBy("date", "desc"),
        limit(100)
      );
      const workoutsSnapshot = await getDocs(workoutsQuery);
      const workoutsData = workoutsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkoutRecord[];
      setAllWorkouts(workoutsData);
      console.log(
        "Successfully fetched all workouts:",
        workoutsData.map((w) => ({
          sets: w.sets.map((s, i) => ({
            index: i,
            workoutType: s.workoutType || "N/A",
          })),
        }))
      );

      // 不明なワークアウトを抽出
      // workoutTypeが設定されていないセットを持つワークアウトを絞り込みます
      const unknown = workoutsData.filter((workout) =>
        workout.sets.some(
          (set) => !set.workoutType || set.workoutType === "N/A"
        )
      );
      setUnknownWorkouts(unknown);
      console.log("Found unknown workouts:", unknown);
    } catch (err) {
      setError("ワークアウトの取得に失敗しました");
      console.error("Failed to fetch workouts:", err);
    } finally {
      setLoading(false);
    }
  };

  // ベンチプレスを付与
  const assignBenchPress = async (userId: string) => {
    setProcessing(true);
    console.log(
      `Assigning bench press to unknown workouts for user: ${userId}`
    );
    try {
      const batch = writeBatch(db);

      console.log("Unknown workouts:", unknownWorkouts);

      unknownWorkouts.forEach((workout) => {
        // workout.idが存在する場合のみ処理
        if (workout.id) {
          console.log(`Processing workout ID: ${workout.id}`);
          const workoutRef = doc(db, "users", userId, "workouts", workout.id);

          // workoutTypeが設定されていないセットに「ベンチプレス」を設定
          const newSets = workout.sets.map((set) => {
            if (!set.workoutType) {
              return { ...set, workoutType: "ベンチプレス" };
            }
            return set;
          });

          // sets配列とupdatedAtのみを更新
          batch.update(workoutRef, {
            sets: newSets,
            updatedAt: new Date(),
          });
        }
      });

      await batch.commit();
      console.log("Successfully committed batch updates.");
      setSuccess(
        `${unknownWorkouts.length}件のワークアウトの不明なセットに「ベンチプレス」を付与しました`
      );
      // 更新後にデータを再取得
      await fetchAllWorkouts(userId);
    } catch (err) {
      setError("ベンチプレスの付与に失敗しました");
      console.error("Failed to assign bench press:", err);
    } finally {
      setProcessing(false);
    }
  };

  // ユーザー選択
  const handleUserSelect = (selectedUser: User) => {
    console.log("User selected:", selectedUser);
    setSelectedUser(selectedUser);
    fetchAllWorkouts(selectedUser.id);
    setUserDialogOpen(false);
  };

  // フィルタリングされたユーザー
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // ワークアウトタイプ別の統計
  const workoutTypeStats = allWorkouts.reduce((acc, workout) => {
    const type = workout.name || "不明";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 不明なワークアウトを取得（既存の関数を保持）
  const fetchUnknownWorkouts = async (userId: string) => {
    setLoading(true);
    try {
      const workoutsQuery = query(
        collection(db, "users", userId, "workouts"),
        where("name", "==", null),
        orderBy("date", "desc"),
        limit(50)
      );
      const workoutsSnapshot = await getDocs(workoutsQuery);
      const workoutsData = workoutsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkoutRecord[];
      setUnknownWorkouts(workoutsData);
    } catch (err) {
      setError("不明なワークアウトの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const addIdsToAllData = async () => {
    setMaintenanceProcessing(true);
    setMaintenanceSuccess(null);
    setMaintenanceError(null);
    console.log("Starting ID assignment process...");

    try {
      const batch = writeBatch(db);
      const usersSnapshot = await getDocs(collection(db, "users"));
      console.log(`Found ${usersSnapshot.docs.length} users.`);

      for (const userDoc of usersSnapshot.docs) {
        console.log(`Processing user: ${userDoc.id}`);
        const workoutsSnapshot = await getDocs(
          collection(db, "users", userDoc.id, "workouts")
        );
        console.log(
          `Found ${workoutsSnapshot.docs.length} workouts for user ${userDoc.id}.`
        );

        for (const workoutDoc of workoutsSnapshot.docs) {
          const workoutData = workoutDoc.data() as WorkoutRecord;
          const workoutRef = doc(
            db,
            "users",
            userDoc.id,
            "workouts",
            workoutDoc.id
          );

          const newSets = workoutData.sets.map((set) => {
            if (set.id && set.id.length > 0) {
              return set;
            }
            return {
              ...set,
              id: crypto.randomUUID(),
            };
          });

          const updateData: any = {
            id: workoutDoc.id,
            sets: newSets,
          };

          batch.update(workoutRef, updateData);
          console.log(`Staged update for workout: ${workoutDoc.id}`);
        }
      }

      await batch.commit();
      console.log("Successfully committed all ID updates.");
      setMaintenanceSuccess("すべてのワークアウトとセットにIDを付与しました。");
    } catch (err) {
      console.error("Failed during ID assignment process:", err);
      setMaintenanceError("IDの付与処理中にエラーが発生しました。");
    } finally {
      setMaintenanceProcessing(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          ログインが必要です
        </Typography>
      </Box>
    );
  }

  if (error && error.includes("管理者権限")) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: "lg", mx: "auto", p: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <AdminIcon sx={{ fontSize: 40, color: "primary.main" }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              管理者画面
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ワークアウトデータの管理
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* ユーザー選択 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            ユーザー選択
          </Typography>
          {selectedUser ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar
                src={selectedUser.photoURL}
                sx={{ width: 40, height: 40 }}
              >
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="body1">
                  {selectedUser.displayName || selectedUser.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedUser.email}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => setUserDialogOpen(true)}
                size="small"
              >
                変更
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              onClick={() => setUserDialogOpen(true)}
              startIcon={<PersonIcon />}
            >
              ユーザーを選択
            </Button>
          )}
        </Box>

        {/* ワークアウト管理 */}
        {selectedUser && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="admin tabs"
              >
                <Tab label="全ワークアウト" />
                <Tab label="不明なワークアウト" />
                <Tab label="統計" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">
                  全ワークアウト ({allWorkouts.length}件)
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => fetchAllWorkouts(selectedUser.id)}
                  disabled={loading}
                >
                  更新
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : allWorkouts.length > 0 ? (
                <List>
                  {allWorkouts.slice(0, 20).map((workout, index) => (
                    <ListItem key={workout.id || `workout-${index}`} divider>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: !workout.name
                              ? "warning.main"
                              : "success.main",
                          }}
                        >
                          {!workout.name ? <WarningIcon /> : <FitnessIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${format(
                          workout.date.toDate(),
                          "yyyy年M月d日 (E)",
                          { locale: ja }
                        )}`}
                        secondary={`${
                          workout.sets.length
                        }セット - workoutType: ${workout.name || "null"}`}
                      />
                      <ListItemText
                        secondary={`(sets: ${workout.sets
                          .map((s) => s.workoutType || "N/A")
                          .join(", ")})`}
                      />
                    </ListItem>
                  ))}
                  {allWorkouts.length > 20 && (
                    <ListItem key="more-workouts">
                      <ListItemText
                        secondary={`他 ${allWorkouts.length - 20} 件...`}
                      />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Alert severity="info">ワークアウトがありません</Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">
                  不明なワークアウト ({unknownWorkouts.length}件)
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => fetchAllWorkouts(selectedUser.id)}
                  disabled={loading}
                >
                  更新
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : unknownWorkouts.length > 0 ? (
                <>
                  <List>
                    {unknownWorkouts.slice(0, 10).map((workout, index) => (
                      <ListItem
                        key={workout.id || `unknown-workout-${index}`}
                        divider
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "warning.main" }}>
                            <WarningIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${format(
                            workout.date.toDate(),
                            "yyyy年M月d日 (E)",
                            { locale: ja }
                          )}`}
                          secondary={`${
                            workout.sets.length
                          }セット - workoutType: ${workout.name || "null"}`}
                        />
                        <ListItemText
                          secondary={`(sets: ${workout.sets
                            .map((s) => s.workoutType || "N/A")
                            .join(", ")})`}
                        />
                      </ListItem>
                    ))}
                    {unknownWorkouts.length > 10 && (
                      <ListItem key="more-unknown-workouts">
                        <ListItemText
                          secondary={`他 ${unknownWorkouts.length - 10} 件...`}
                        />
                      </ListItem>
                    )}
                  </List>

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => assignBenchPress(selectedUser.id)}
                      disabled={processing}
                      startIcon={
                        processing ? (
                          <CircularProgress size={20} />
                        ) : (
                          <FitnessIcon />
                        )
                      }
                    >
                      {processing
                        ? "処理中..."
                        : `${unknownWorkouts.length}件の不明セットにベンチプレスを付与`}
                    </Button>
                  </Box>
                </>
              ) : (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  不明なワークアウトはありません
                </Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                ワークアウトタイプ別統計
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(workoutTypeStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count], index) => (
                    <Chip
                      key={`${type}-${index}`}
                      label={`${type}: ${count}件`}
                      color={type === "不明" ? "warning" : "default"}
                      variant="outlined"
                    />
                  ))}
              </Stack>
            </TabPanel>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          データメンテナンス
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          全ユーザーの全ワークアウトデータにIDを付与します。データ量によっては時間がかかる場合があります。
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={addIdsToAllData}
          disabled={maintenanceProcessing}
        >
          {maintenanceProcessing ? "処理中..." : "全データにIDを付与"}
        </Button>
        {maintenanceSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {maintenanceSuccess}
          </Alert>
        )}
        {maintenanceError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {maintenanceError}
          </Alert>
        )}
      </Paper>

      {/* ユーザー選択ダイアログ */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ユーザーを選択</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="ユーザーを検索"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <List>
            {filteredUsers.map((user) => (
              <ListItemButton
                key={user.id}
                onClick={() => handleUserSelect(user)}
              >
                <ListItemAvatar>
                  <Avatar src={user.photoURL}>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.displayName || user.email}
                  secondary={user.email}
                />
                {user.isAdmin && (
                  <Chip
                    label="管理者"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>キャンセル</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
