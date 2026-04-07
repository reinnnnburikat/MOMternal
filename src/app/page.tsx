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

function ViewRouter() {
  const currentView = useAppStore((s) => s.currentView);

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
  const currentView = useAppStore((s) => s.currentView);

  // Session timeout check
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        logout();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isSessionExpired, logout]);

  // Activity tracking
  useEffect(() => {
    const handleActivity = () => updateActivity();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [updateActivity]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
        <LoginView />
      </div>
    );
  }

  return <AppShell>{isAuthenticated ? <ViewRouter /> : <LoginView />}</AppShell>;
}
