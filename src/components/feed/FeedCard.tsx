import React, { useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Comment as CommentIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Group as GroupIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { WorkoutRecord, WorkoutSet } from "@/types/workout";
import { getWorkoutTypeInfo, isCardioWorkoutType } from "@/lib/workoutTypeInfo";
import { calculateIntensityForDate } from "@/lib/intensityCalculator";
import { findSystemUser } from "@/data/systemUsers";
import { FeedComment, LikeUser } from "./useFeedInteractions";

export type FeedUserInfo = {
  id: string;
  displayName: string;
  photoURL?: string;
  email: string;
};

interface FeedCardProps {
  workout: WorkoutRecord;
  userInfo: FeedUserInfo | null;
  currentUserId?: string;
  liked: boolean;
  likeUsers: LikeUser[];
  comments: FeedComment[];
  expanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  onComment: () => void;
  onDeleteComment: (commentId: string) => void;
  onProfileClick: (userId: string) => void;
  onIntensityHelp: () => void;
}

const formatWorkoutDate = (date: Date) => {
  // 時刻が00:00の記録は日付のみ（今日・昨日は相対表示）
  if (date.getHours() !== 0 || date.getMinutes() !== 0) {
    return format(date, "yyyy年M月d日 HH:mm", { locale: ja });
  }
  const key = format(date, "yyyy-MM-dd");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === format(today, "yyyy-MM-dd")) return "今日";
  if (key === format(yesterday, "yyyy-MM-dd")) return "昨日";
  return format(date, "yyyy年M月d日", { locale: ja });
};

const formatSet = (set: WorkoutSet, cardio: boolean) =>
  cardio ? `${set.weight}km / ${set.reps}分` : `${set.weight}kg × ${set.reps}回`;

const groupSetsByType = (sets: WorkoutSet[]) => {
  const groups = new Map<string, WorkoutSet[]>();
  sets.forEach((set) => {
    const type = set.workoutType || "ベンチプレス";
    groups.set(type, [...(groups.get(type) ?? []), set]);
  });
  return Array.from(groups.entries()).map(([type, typeSets]) => {
    const cardio = isCardioWorkoutType(type);
    return {
      type,
      cardio,
      sets: typeSets,
      totalReps: typeSets.reduce((sum, s) => sum + (s.reps || 0), 0),
      maxWeight: Math.max(...typeSets.map((s) => s.weight || 0)),
    };
  });
};

export const FeedCard: React.FC<FeedCardProps> = ({
  workout,
  userInfo,
  currentUserId,
  liked,
  likeUsers,
  comments,
  expanded,
  onToggleExpand,
  onLike,
  onComment,
  onDeleteComment,
  onProfileClick,
  onIntensityHelp,
}) => {
  const groupedSets = useMemo(
    () => groupSetsByType(workout.sets || []),
    [workout.sets]
  );
  // 1ユーザー1日1ドキュメントなので、この記録だけでその日の強度が求まる
  const dailyIntensity = useMemo(
    () => calculateIntensityForDate([workout], workout.date.toDate()),
    [workout]
  );
  const displayName = userInfo?.displayName || "不明なユーザー";

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: 2,
        "&:hover": { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
          <IconButton
            onClick={() => onProfileClick(workout.userId)}
            sx={{ p: 0 }}
            aria-label={`${displayName}のプロフィールを見る`}
          >
            <Avatar src={userInfo?.photoURL || undefined}>
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatWorkoutDate(workout.date.toDate())}
            </Typography>
          </Box>
          {workout.isNewRecord && (
            <Chip
              icon={<EmojiEventsIcon />}
              label="最高記録"
              color="warning"
              size="small"
            />
          )}
          {workout.isGroupWorkout && (
            <Chip
              icon={<GroupIcon />}
              label={workout.groupWorkoutName || "合同トレーニング"}
              color="info"
              size="small"
            />
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Chip
            label={`${groupedSets.length}種目`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${workout.sets?.length || 0}セット`}
            size="small"
            color="secondary"
            variant="outlined"
          />
          {dailyIntensity && dailyIntensity.totalIntensity > 0 && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Chip
                label={`強度: ${Math.round(dailyIntensity.totalIntensity * 10) / 10}`}
                size="small"
                color="success"
                variant="outlined"
              />
              <IconButton
                size="small"
                onClick={onIntensityHelp}
                aria-label="強度の説明"
              >
                <HelpIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          )}
        </Stack>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              size="small"
              onClick={onLike}
              color={liked ? "error" : "default"}
              aria-label={liked ? "いいねを取り消す" : "いいね"}
              aria-pressed={liked}
            >
              {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            {likeUsers.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {likeUsers.length}
              </Typography>
            )}
            <IconButton
              size="small"
              onClick={onComment}
              aria-label="コメントする"
              sx={{ ml: 1 }}
            >
              <CommentIcon />
            </IconButton>
            {comments.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {comments.length}
              </Typography>
            )}
          </Box>
          <Button
            size="small"
            onClick={onToggleExpand}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            aria-expanded={expanded}
          >
            {expanded ? "詳細を閉じる" : "詳細を見る"}
          </Button>
        </Box>
      </CardContent>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 0 }}>
          <Divider sx={{ mb: 2 }} />

          {groupedSets.map((group) => {
            const typeInfo = getWorkoutTypeInfo(group.type);
            return (
              <Box
                key={group.type}
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  border: 1,
                  borderColor: typeInfo.color,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      color: typeInfo.color,
                    }}
                  >
                    {group.type}
                  </Typography>
                  <Chip
                    label={typeInfo.muscleGroup}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1, borderColor: typeInfo.color, color: typeInfo.color }}
                  />
                </Box>

                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Chip
                    label={`${group.sets.length}セット`}
                    size="small"
                    variant="outlined"
                  />
                  {!group.cardio && (
                    <Chip
                      label={`${group.totalReps}回`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {!group.cardio && group.maxWeight > 0 && (
                    <Chip
                      label={`最大${group.maxWeight}kg`}
                      size="small"
                      variant="outlined"
                      color="warning"
                    />
                  )}
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {group.sets.map((set, setIndex) => (
                    <Chip
                      key={set.id ?? setIndex}
                      label={formatSet(set, group.cardio)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}

          {workout.memo && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                💭 {workout.memo}
              </Typography>
            </Box>
          )}

          {likeUsers.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                いいねしたユーザー:
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {likeUsers.slice(0, 3).map((likeUser) => (
                  <Avatar
                    key={likeUser.id}
                    src={likeUser.photoURL}
                    alt={likeUser.displayName}
                    sx={{ width: 24, height: 24 }}
                  />
                ))}
                {likeUsers.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    他{likeUsers.length - 3}人
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          {comments.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                コメント:
              </Typography>
              <Stack spacing={1}>
                {comments.map((comment) => {
                  const systemUser = findSystemUser(comment.userId);
                  const name =
                    systemUser?.displayName ||
                    comment.user.displayName ||
                    "不明なユーザー";
                  return (
                    <Box
                      key={comment.id}
                      sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
                    >
                      {systemUser ? (
                        <Avatar
                          sx={{ width: 24, height: 24, bgcolor: "primary.main" }}
                        >
                          {systemUser.icon}
                        </Avatar>
                      ) : (
                        <IconButton
                          sx={{ p: 0 }}
                          onClick={() => onProfileClick(comment.userId)}
                          aria-label={`${name}のプロフィールを見る`}
                        >
                          <Avatar
                            src={comment.user.photoURL}
                            sx={{ width: 24, height: 24 }}
                          />
                        </IconButton>
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {comment.content}
                        </Typography>
                      </Box>
                      {comment.userId === currentUserId && (
                        <IconButton
                          size="small"
                          onClick={() => onDeleteComment(comment.id)}
                          aria-label="コメントを削除"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};
