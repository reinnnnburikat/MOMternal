'use client';

import { useEffect } from 'react';
import { useAppStore, AppView } from '@/store/app-store';
import { LoginView } from '@/components/layout/login-view';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { PatientListView } from '@/components/patients/patient-list-view';
import { PatientProfileView } from '@/components/patients/patient-profile-view';
import { NewPatientView } from '@/components/patients/new-patient-view';
import { ConsultationView } from '@/components/consultations/consultation-view';
import { MapView } from '@/components/map/map-view';
import { AuditView } from '@/components/audit/audit-view';
import { AnimatePresence, motion } from 'framer-motion';

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
      return <MapView />;
    case 'audit':
      return <AuditView />;
    default:
      return <DashboardView />;
  }
}

export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isSessionExpired = useAppStore((s) => s.isSessionExpired);
  const logout = useAppStore((s) => s.logout);
  const updateActivity = useAppStore((s) => s.updateActivity);

  // Session timeout check
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        logout();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isSessionExpired, logout]);

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
