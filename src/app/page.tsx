'use client';

import { useEffect, useState, Component, type ReactNode, type ErrorInfo, lazy, Suspense } from 'react';
import { useAppStore, AppView } from '@/store/app-store';
import { LoginView } from '@/components/layout/login-view';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { PatientListView } from '@/components/patients/patient-list-view';
import { PatientProfileView } from '@/components/patients/patient-profile-view';
import { NewPatientView } from '@/components/patients/new-patient-view';
import { ConsultationView } from '@/components/consultations/consultation-view';
import { AuditView } from '@/components/audit/audit-view';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Lazy load heavy components to reduce initial bundle size
const MapView = lazy(() => import('@/components/map/map-view').then(m => ({ default: m.MapView })));

// ---------------------------------------------------------------------------
// Global Error Boundary — catches client-side exceptions on Vercel
// ---------------------------------------------------------------------------
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MOMternal] ErrorBoundary caught:', error);
    console.error('[MOMternal] Component stack:', errorInfo.componentStack);
    // Try to send error details to console for Vercel logging
    try {
      console.error('[MOMternal] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    } catch { /* ignore */ }
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-lg w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              {/* Show error details only in development for debugging */}
              {err && process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-left">
                  <p className="text-xs font-mono text-red-700 dark:text-red-400 break-all">
                    {err.name}: {err.message}
                  </p>
                  {err.stack && (
                    <pre className="mt-2 text-[10px] font-mono text-red-600 dark:text-red-500 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {err.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// View routing — lazy loaded to prevent SSR issues with heavy components
// ---------------------------------------------------------------------------
const viewTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: 'easeInOut' },
};

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={viewTransition.initial}
        animate={viewTransition.animate}
        exit={viewTransition.exit}
        transition={viewTransition.transition}
      >
        {switchView(currentView)}
      </motion.div>
    </AnimatePresence>
  );
}

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function switchView(currentView: AppView) {
  switch (currentView) {
    case 'login':
      return <LoginView />;
    case 'dashboard':
      return <DashboardView />;
    case 'patients':
      return <PatientListView />;
    case 'patient-profile':
      return <PatientProfileView />;
    case 'patient-new':
      return <NewPatientView />;
    case 'consultation':
      return <ConsultationView />;
    case 'map':
      return <Suspense fallback={<ViewFallback />}><MapView /></Suspense>;
    case 'audit':
      return <AuditView />;
    default:
      return <DashboardView />;
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function AppContent() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isSessionExpired = useAppStore((s) => s.isSessionExpired);
  const logout = useAppStore((s) => s.logout);
  const updateActivity = useAppStore((s) => s.updateActivity);
  const hasHydrated = useAppStore((s) => s._hasHydrated);

  // Rehydrate zustand persist on mount (client-only) — guarded for safety
  useEffect(() => {
    try {
      if (
        useAppStore.persist &&
        typeof useAppStore.persist.rehydrate === 'function'
      ) {
        useAppStore.persist.rehydrate();
      }
    } catch (e) {
      console.warn('[MOMternal] Zustand rehydrate failed:', e);
    }
  }, []);

  // Session timeout check
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasHydrated && isSessionExpired()) {
        logout();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isSessionExpired, logout, hasHydrated]);

  // Activity tracking — only non-input events to avoid re-renders on keystrokes
  useEffect(() => {
    const handleActivity = () => updateActivity();
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [updateActivity]);

  // Don't render until zustand has rehydrated from localStorage
  // This prevents hydration flash (login → dashboard) on returning users
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading MOMternal...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div
          key="login-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <LoginView />
        </motion.div>
      ) : (
        <motion.div
          key="app-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <AppShell>
            <ViewRouter />
          </AppShell>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Home() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
