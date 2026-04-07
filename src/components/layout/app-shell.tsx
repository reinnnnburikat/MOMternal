'use client';

import { useState } from 'react';
import { useAppStore, AppView } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Users,
  MapPin,
  ClipboardList,
  LogOut,
  Menu,
  Baby,
  ChevronLeft,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

const navItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'patients', label: 'Patients', icon: Users },
  { view: 'map', label: 'Risk Map', icon: MapPin },
  { view: 'audit', label: 'Audit Logs', icon: ClipboardList },
];

function SidebarContent({ onNavigate, currentView }: {
  onNavigate: (view: AppView) => void;
  currentView: AppView;
}) {
  const currentNurse = useAppStore((s) => s.currentNurse);
  const logout = useAppStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-rose-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img src="/momternal_logo.png" alt="MOMternal" className="w-full h-full object-contain p-1" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-rose-900 tracking-tight">MOMternal</h1>
          <p className="text-[10px] text-rose-400 leading-tight">Maternal Support System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <Button
              key={item.view}
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 h-10 px-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                  : 'text-muted-foreground hover:text-foreground hover:bg-rose-50'
              )}
              onClick={() => onNavigate(item.view)}
            >
              <item.icon className={cn('h-4.5 w-4.5', isActive && 'text-rose-600')} />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-rose-100 px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <Avatar className="h-9 w-9 bg-rose-100">
            <AvatarFallback className="bg-rose-100 text-rose-700 text-xs font-semibold">
              {currentNurse?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{currentNurse?.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{currentNurse?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-9 px-3 text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const currentNurse = useAppStore((s) => s.currentNurse);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Track online status
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'patients': return 'Patient Management';
      case 'patient-profile': return 'Patient Profile';
      case 'patient-new': return 'New Patient';
      case 'consultation': return 'Consultation';
      case 'map': return 'Community Risk Map';
      case 'audit': return 'Audit Logs';
      default: return 'MOMternal';
    }
  };

  const canGoBack = ['patient-profile', 'consultation'].includes(currentView);
  const goBack = useAppStore((s) => s.goBack);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-rose-100 bg-white/80 backdrop-blur-sm flex-shrink-0 sticky top-0 h-screen">
        <SidebarContent onNavigate={(v) => setCurrentView(v)} currentView={currentView} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-rose-100">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SidebarContent
                    onNavigate={(v) => {
                      setCurrentView(v);
                      setSidebarOpen(false);
                    }}
                    currentView={currentView}
                  />
                </SheetContent>
              </Sheet>

              {/* Back button */}
              {canGoBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={goBack}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}

              <div>
                <h1 className="text-lg font-semibold text-foreground">{getTitle()}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Online/Offline indicator */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Session timer icon */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600">
                <Clock className="h-3 w-3" />
                <span className="hidden sm:inline">Session Active</span>
              </div>

              {/* Mobile avatar */}
              <Avatar className="h-8 w-8 lg:hidden bg-rose-100">
                <AvatarFallback className="bg-rose-100 text-rose-700 text-xs font-semibold">
                  {currentNurse?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-rose-100 bg-white/50 px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Baby className="h-3.5 w-3.5 text-rose-400" />
              <span>MOMternal v1.0 — Mobilized Outreach Maternal Support</span>
            </div>
            <div className="flex items-center gap-3">
              <span>ADPIE Framework</span>
              <span>•</span>
              <span>SOAP Format</span>
              <span>•</span>
              <span>NNN Linkages</span>
              <span>•</span>
              <span>ICD-10</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
