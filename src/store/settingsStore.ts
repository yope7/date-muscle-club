import { create } from "zustand";
import { persist } from "zustand/middleware";

type CalendarDisplayMode = "color" | "fire";

interface SettingsState {
  calendarDisplayMode: CalendarDisplayMode;
  setCalendarDisplayMode: (mode: CalendarDisplayMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      calendarDisplayMode: "color",
      setCalendarDisplayMode: (mode) => set({ calendarDisplayMode: mode }),
    }),
    {
      name: "settings-storage",
    }
  )
);
