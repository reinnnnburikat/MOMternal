'use client';

import { useEffect, useState, Component, type ReactNode, type ErrorInfo, lazy, Suspense } from 'react';
import { useAppStore, AppView } from '@/store/app-store';
import { QueryProvider } from '@/lib/query-provider';
import { LoginView } from '@/components/layout/login-view';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { PatientListView } from '@/components/patients/patient-list-view';
import { PatientProfileView } from '@/components/patients/patient-profile-view';
import { NewPatientView } from '@/components/patients/new-patient-view';
// Lazy loaded below with MapView
import { AuditView } from '@/components/audit/audit-view';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SplashScreen } from '@/components/layout/splash-screen';

// Lazy load heavy components to reduce initial bundle size
const MapView = lazy(() => import('@/components/map/map-view').then(m => ({ default: m.MapView })));
const ConsultationView = lazy(() => import('@/components/consultations/consultation-view').then(m => ({ default: m.ConsultationView })));

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
    try {
      console.error('[MOMternal] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    } catch { /* ignore */ }
    // Store error globally so it persists across re-renders
    try {
      (window as unknown as Record<string, string>).__momternal_error = `${error.name}: ${error.message}\n${error.stack || ''}`;
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
              {/* Show error details for debugging */}
              {err && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-left">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Error Details</p>
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
  transition: { duration: 0.2, ease: 'easeInOut' as const },
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
        <img src="/loading-icon.png" alt="Loading" className="w-12 h-12 animate-spin object-contain drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]" draggable={false} />
        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
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
      return <Suspense fallback={<ViewFallback />}><ConsultationView /></Suspense>;
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
  const [showSplash, setShowSplash] = useState(true);

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
      <div className="min-h-screen flex items-center justify-center bg-rose-950">
        <div className="flex flex-col items-center gap-4">
          <img src="/loading-icon.png" alt="MOMternal" className="w-20 h-20 sm:w-24 sm:h-24 animate-spin object-contain drop-shadow-[0_0_20px_rgba(244,63,94,0.4)]" draggable={false} />
          <p className="text-sm text-rose-300/70 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Splash / Landing screen — shows on every page load */}
      <SplashScreen onComplete={() => setShowSplash(false)} />

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
    </>
  );
}

export default function Home() {
  return (
    <AppErrorBoundary>
      <QueryProvider>
        <AppContent />
      </QueryProvider>
    </AppErrorBoundary>
  );
}
