import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { THEME_KEY } from '@/constants';

type Theme = 'light' | 'dark';

interface UIStore {
  theme: Theme;
  selectedTableId: string | null;
  selectedEdgeId: string | null;
  selectedTableIds: string[];
  isPropertiesOpen: boolean;
  isCommandPaletteOpen: boolean;

  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  selectTable: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setSelectedTableIds: (ids: string[]) => void;
  setPropertiesOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'light',
      selectedTableId: null,
      selectedEdgeId: null,
      selectedTableIds: [],
      isPropertiesOpen: true,
      isCommandPaletteOpen: false,

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
      selectTable: (id) =>
        set({ selectedTableId: id, selectedEdgeId: null, isPropertiesOpen: id !== null }),
      selectEdge: (id) =>
        set({ selectedEdgeId: id, selectedTableId: null, isPropertiesOpen: id !== null }),
      setSelectedTableIds: (ids) => set({ selectedTableIds: ids }),
      setPropertiesOpen: (open) => set({ isPropertiesOpen: open }),
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
    }),
    {
      name: THEME_KEY,
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Partial<UIStore>;
        if (version < 1) {
          return { ...state, theme: 'light' as Theme };
        }
        return state;
      },
    }
  )
);
