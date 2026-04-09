import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Navigation views
export type AppView =
  | 'login'
  | 'dashboard'
  | 'patients'
  | 'patient-profile'
  | 'patient-new'
  | 'consultation'
  | 'map'
  | 'audit';

interface AppState {
  // Navigation
  currentView: AppView;
  navigationHistory: AppView[];
  setCurrentView: (view: AppView) => void;
  goBack: () => void;

  // Auth
  isAuthenticated: boolean;
  currentNurse: {
    id: string;
    email: string;
    name: string;
    licenseNo: string | null;
  } | null;
  lastActivity: number;
  login: (nurse: { id: string; email: string; name: string; licenseNo: string | null }) => void;
  logout: () => void;
  updateActivity: () => void;
  isSessionExpired: () => boolean;

  // Patient context
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;

  // Consultation context
  selectedConsultationId: string | null;
  setSelectedConsultationId: (id: string | null) => void;

  // Data refresh trigger — bumped when consultation data changes
  // so dependent views (map, patient profile) can re-fetch
  refreshTrigger: number;
  bumpRefresh: () => void;
}

const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentView: 'login',
      navigationHistory: [],
      setCurrentView: (view) =>
        set((state) => ({
          currentView: view,
          navigationHistory: [...state.navigationHistory, state.currentView].slice(-20),
        })),
      goBack: () =>
        set((state) => {
          const history = [...state.navigationHistory];
          const prev = history.pop();
          return {
            currentView: prev || 'dashboard',
            navigationHistory: history,
          };
        }),

      // Auth
      isAuthenticated: false,
      currentNurse: null,
      lastActivity: Date.now(),
      login: (nurse) =>
        set({
          isAuthenticated: true,
          currentNurse: nurse,
          lastActivity: Date.now(),
          currentView: 'dashboard',
          navigationHistory: [],
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          currentNurse: null,
          lastActivity: 0,
          currentView: 'login',
          navigationHistory: [],
          selectedPatientId: null,
          selectedConsultationId: null,
        }),
      updateActivity: () => set({ lastActivity: Date.now() }),
      isSessionExpired: () => {
        const state = get();
        if (!state.isAuthenticated) return true;
        return Date.now() - state.lastActivity > SESSION_TIMEOUT;
      },

      // Patient context
      selectedPatientId: null,
      setSelectedPatientId: (id) => set({ selectedPatientId: id }),

      // Consultation context
      selectedConsultationId: null,
      setSelectedConsultationId: (id) => set({ selectedConsultationId: id }),

      // Data refresh
      refreshTrigger: 0,
      bumpRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
    }),
    {
      name: 'momternal-app-state',
      partialize: (state) => ({
        currentView: state.currentView,
        isAuthenticated: state.isAuthenticated,
        currentNurse: state.currentNurse,
        // lastActivity is intentionally excluded — it changes frequently and
        // persisting it on every update causes excessive localStorage writes and
        // re-renders that steal input focus.
        selectedPatientId: state.selectedPatientId,
        selectedConsultationId: state.selectedConsultationId,
        // refreshTrigger is intentionally excluded — it's ephemeral, only used
        // to trigger re-fetches within the same session. Persisting it causes
        // unnecessary localStorage writes on every consultation save.
      }),
    }
  )
);
