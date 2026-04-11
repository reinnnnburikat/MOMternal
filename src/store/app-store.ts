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

  // Filter state (for cross-view navigation)
  filterRisk: string;
  setFilterRisk: (risk: string) => void;
  filterReferralPending: boolean;
  setFilterReferralPending: (pending: boolean) => void;

  // Notifications
  notificationCount: number;
  setNotificationCount: (count: number) => void;

  // Offline state
  isOffline: boolean;
  setIsOffline: (status: boolean) => void;
  pendingSyncCount: number;
  setPendingSyncCount: (count: number) => void;

  // Hydration state — true once client-side zustand persist has rehydrated
  _hasHydrated: boolean;
  _setHasHydrated: () => void;
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
      // Use 0 instead of Date.now() to avoid SSR/client hydration mismatch
      lastActivity: 0,
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
        if (state.lastActivity === 0) return false; // Not yet initialized
        return Date.now() - state.lastActivity > SESSION_TIMEOUT;
      },

      // Patient context
      selectedPatientId: null,
      setSelectedPatientId: (id) => set({ selectedPatientId: id }),

      // Consultation context
      selectedConsultationId: null,
      setSelectedConsultationId: (id) => set({ selectedConsultationId: id }),

      // Filter state
      filterRisk: 'all',
      setFilterRisk: (risk) => set({ filterRisk: risk }),
      filterReferralPending: false,
      setFilterReferralPending: (pending) => set({ filterReferralPending: pending }),

      // Notifications
      notificationCount: 0,
      setNotificationCount: (count) => set({ notificationCount: count }),

      // Offline state
      isOffline: false,
      setIsOffline: (status) => set({ isOffline: status }),
      pendingSyncCount: 0,
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

      // Hydration
      _hasHydrated: false,
      _setHasHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: 'momternal-app-state',
      skipHydration: true,
      partialize: (state) => ({
        currentView: state.currentView,
        isAuthenticated: state.isAuthenticated,
        currentNurse: state.currentNurse,
        // lastActivity intentionally excluded — changes frequently
        selectedPatientId: state.selectedPatientId,
        selectedConsultationId: state.selectedConsultationId,
        filterRisk: state.filterRisk,
        filterReferralPending: state.filterReferralPending,
      }),
      // Ensure _hasHydrated is never overwritten by persisted state
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        _hasHydrated: true, // Always mark as hydrated after merge
      }),
      onRehydrateStorage: () => {
        return (state) => {
          state?._setHasHydrated();
        };
      },
    }
  )
);
