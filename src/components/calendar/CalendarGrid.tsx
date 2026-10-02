import React, { useMemo } from "react";
import { Box, ButtonBase, Typography, useTheme } from "@mui/material";
import { Group as GroupIcon } from "@mui/icons-material";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { eachDayOfInterval, format, isSameMonth, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { getCalendarRange } from "@/lib/calendarRange";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 活動量（回数相当）を3段階に分ける
const activityLevel = (amount: number) =>
  amount === 0 ? 0 : amount < 10 ? 1 : amount < 20 ? 2 : 3;
const LEVEL_LABELS = ["記録なし", "少なめ", "ふつう", "多め"];

interface CalendarGridProps {
  currentMonth: Date;
  selectedDateKey: string | null;
  displayMode: string;
  getActivity: (dateKey: string) => number;
  isGroupDay: (dateKey: string) => boolean;
  onSelectDate: (date: Date) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  selectedDateKey,
  displayMode,
  getActivity,
  isGroupDay,
  onSelectDate,
}) => {
  const theme = useTheme();
  const dates = useMemo(() => {
    const { start, end } = getCalendarRange(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const levelColor = [
    "transparent",
    theme.palette.success.light,
    theme.palette.success.main,
    theme.palette.success.dark,
  ];
  const fireSize = [0, 1, 1.5, 2];

  return (
    <Box
      role="group"
      aria-label={format(currentMonth, "yyyy年M月のカレンダー", { locale: ja })}
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: { xs: 1, sm: 2 },
      }}
    >
      {WEEKDAYS.map((day) => (
        <Box key={day} aria-hidden sx={{ textAlign: "center", py: { xs: 1, sm: 1.5 } }}>
          <Typography variant="body2" color="text.secondary">
            {day}
          </Typography>
        </Box>
      ))}

      {dates.map((date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const level = activityLevel(getActivity(dateKey));
        const groupDay = isGroupDay(dateKey);
        const inMonth = isSameMonth(date, currentMonth);
        const today = isToday(date);
        const selected = selectedDateKey === dateKey;

        return (
          <ButtonBase
            key={dateKey}
            aria-pressed={selected}
            aria-label={`${format(date, "M月d日(E)", { locale: ja })} 運動量: ${
              LEVEL_LABELS[level]
            }${groupDay ? "、合同トレーニング" : ""}`}
            onClick={() => onSelectDate(date)}
            sx={{
              position: "relative",
              aspectRatio: "1",
              display: "flex",
              flexDirection: "column",
              borderRadius: 1,
              bgcolor: selected ? "action.selected" : today ? "action.hover" : "transparent",
              "&:hover": { bgcolor: "action.hover" },
              "&.Mui-focusVisible": {
                outline: `2px solid ${theme.palette.primary.main}`,
              },
            }}
          >
            <Typography
              variant="body2"
              color={
                selected || today
                  ? "primary.main"
                  : inMonth
                  ? "text.primary"
                  : "text.disabled"
              }
              sx={{
                fontSize: { xs: "0.875rem", sm: "1rem" },
                fontWeight: selected || today ? "bold" : "normal",
              }}
            >
              {format(date, "d")}
            </Typography>

            {displayMode === "color" ? (
              <Box
                sx={{
                  position: "absolute",
                  bottom: { xs: 2, sm: 4 },
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: { xs: "60%", sm: "70%" },
                  height: { xs: 3, sm: 4 },
                  bgcolor: levelColor[level],
                  borderRadius: 1,
                }}
              />
            ) : (
              level > 0 && (
                <WhatshotIcon
                  sx={{
                    position: "absolute",
                    bottom: { xs: 2, sm: 4 },
                    left: "50%",
                    transform: "translateX(-50%)",
                    color: theme.palette.warning.main,
                    fontSize: {
                      xs: `${fireSize[level]}rem`,
                      sm: `${fireSize[level] * 1.2}rem`,
                    },
                  }}
                />
              )
            )}

            {groupDay && (
              <GroupIcon
                sx={{
                  position: "absolute",
                  top: { xs: 2, sm: 4 },
                  right: { xs: 2, sm: 4 },
                  color: theme.palette.info.main,
                  fontSize: { xs: "0.75rem", sm: "1rem" },
                }}
              />
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
};
