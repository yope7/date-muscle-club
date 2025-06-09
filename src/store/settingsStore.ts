import { create } from "zustand";
import { persist } from "zustand/middleware";

type CalendarDisplayMode = "color" | "fire";

interface SettingsState {
  calendarDisplayMode: CalendarDisplayMode;
  isDrawerOpen: boolean;
  setCalendarDisplayMode: (mode: CalendarDisplayMode) => void;
  setIsDrawerOpen: (isOpen: boolean) => void;
  displayMode: "color" | "fire";
  setDisplayMode: (mode: "color" | "fire") => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      calendarDisplayMode: "color",
      isDrawerOpen: false,
      setCalendarDisplayMode: (mode) => set({ calendarDisplayMode: mode }),
      setIsDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),
      displayMode: "color",
      setDisplayMode: (mode) => set({ displayMode: mode }),
    }),
    {
      name: "settings-storage",
    }
  )
);
