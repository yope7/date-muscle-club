// カレンダーに表示する期間（月初を含む週の日曜〜月末を含む週の土曜）
export const getCalendarRange = (month: Date) => {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
  end.setDate(end.getDate() + (6 - end.getDay()));
  return { start, end };
};
