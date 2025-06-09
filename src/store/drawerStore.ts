import { create } from "zustand";

interface DrawerState {
  isDrawerOpen: boolean;
  setDrawerOpen: (isOpen: boolean) => void;
}

export const useDrawerStore = create<DrawerState>((set) => ({
  isDrawerOpen: false,
  setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),
}));
