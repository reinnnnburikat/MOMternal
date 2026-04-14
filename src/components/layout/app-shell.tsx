'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, AppView } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Sun,
  Moon,
  RefreshCw,
  CloudOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/notifications/notification-panel';
import { processQueue, getQueueLength } from '@/lib/offline-queue';

const navItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'patients', label: 'Patients', icon: Users },
  { view: 'map', label: 'Risk Map', icon: MapPin },
  { view: 'audit', label: 'Audit Logs', icon: ClipboardList },
];

function SidebarContent({ onNavigate, currentView, collapsed, onToggleCollapse }: {
  onNavigate: (view: AppView) => void;
  currentView: AppView;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const currentNurse = useAppStore((s) => s.currentNurse);
  const logout = useAppStore((s) => s.logout);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleLogout = () => {
    setShowSignOutDialog(false);
    // Use setTimeout to let the dialog close before unmounting
    setTimeout(() => {
      logout();
      toast.success('You have been signed out');
    }, 100);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-rose-100 dark:border-gray-800", collapsed && "justify-center px-2")}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-rose-300/40 dark:ring-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)] dark:shadow-[0_0_16px_rgba(244,63,94,0.3)]">
          <img src="/momternal_logo.png" alt="MOMternal" className="w-full h-full object-contain p-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-rose-900 dark:text-rose-100 tracking-tight">MOMternal</h1>
            <p className="text-[10px] text-rose-400 leading-tight">Maternal Support System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          if (collapsed) {
            return (
              <Tooltip key={item.view}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'justify-center h-10 w-10 mx-auto transition-all duration-200',
                      isActive && 'bg-rose-100 dark:bg-rose-900/30 shadow-sm shadow-rose-200/60 dark:shadow-rose-900/40'
                    )}
                    onClick={() => onNavigate(item.view)}
                  >
                    <item.icon className={cn('h-4.5 w-4.5', isActive && 'text-rose-600')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p>{item.label}</p></TooltipContent>
              </Tooltip>
            );
          }
          return (
            <Button
              key={item.view}
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 h-10 px-3 text-sm font-medium transition-all duration-200 relative group',
                isActive
                  ? 'bg-gradient-to-r from-rose-100 to-rose-50 text-rose-800 hover:from-rose-100 hover:to-rose-50 dark:from-rose-900/40 dark:to-rose-900/20 dark:text-rose-200 shadow-sm shadow-rose-100/80 dark:shadow-rose-900/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-rose-50/80 dark:hover:bg-gray-800 hover:shadow-sm'
              )}
              onClick={() => onNavigate(item.view)}
            >
              <item.icon className={cn('h-4.5 w-4.5 transition-colors duration-200', isActive && 'text-rose-600')} />
              {item.label}
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose-500 rounded-r-full" />}
            </Button>
          );
        })}
      </nav>

      {/* Dark Mode Toggle */}
      <div className={cn("mx-4 border-t border-rose-100 dark:border-gray-800", collapsed && "mx-2")} />
      <div className="px-3 py-2">
        <DarkModeToggle collapsed={collapsed} />
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <>
          <div className={cn("mx-4 border-t border-rose-100 dark:border-gray-800", collapsed && "mx-2")} />
          <div className="px-3 py-2">
            <Button
              variant="ghost"
              onClick={onToggleCollapse}
              className={cn(
                "w-full justify-center gap-2 h-9 text-sm text-muted-foreground hover:text-foreground transition-all duration-200",
                collapsed ? "mx-auto w-10" : "px-3"
              )}
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
              {!collapsed && <span>Collapse</span>}
            </Button>
          </div>
        </>
      )}

      <div className={cn("mx-4 border-t border-rose-100 dark:border-gray-800", collapsed && "mx-2")} />

      {/* User */}
      <div className={cn("border-t border-rose-100 dark:border-gray-800 px-3 py-4", collapsed && "flex flex-col items-center")}>
        <Avatar className="h-9 w-9 bg-rose-100 dark:bg-rose-900/30">
          <AvatarFallback className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {currentNurse?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{currentNurse?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{currentNurse?.email}</p>
              </div>
            </div>
            <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-9 px-3 text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign Out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to sign out? Any unsaved changes will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
                    Sign Out
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        {collapsed && (
          <div className="flex flex-col items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-3 h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                  onClick={() => setShowSignOutDialog(true)}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Sign Out</p></TooltipContent>
            </Tooltip>
            <AlertDialog open={showSignOutDialog} onOpenChange={(open) => { if (!open) setShowSignOutDialog(false); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign Out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to sign out? Any unsaved changes will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
                    Sign Out
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}

function DarkModeToggle({ collapsed }: { collapsed?: boolean }) {
  const [isDark, setIsDark] = useState(false);

  // Sync dark mode from localStorage/matchMedia on mount (client-only)
  // Note: setState in effect is intentional here to avoid SSR/client hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem('momternal-theme');
    const shouldBeDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(shouldBeDark); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleDark = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('momternal-theme', newDark ? 'dark' : 'light');
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={toggleDark} className="mx-auto h-9 w-9 text-muted-foreground hover:text-foreground">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right"><p>{isDark ? 'Light Mode' : 'Dark Mode'}</p></TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleDark}
      className="w-full justify-start gap-3 h-9 px-3 text-sm text-muted-foreground hover:text-foreground dark:hover:text-foreground"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4" />
          Light Mode
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          Dark Mode
        </>
      )}
    </Button>
  );
}

// Breadcrumb path mapping
function getBreadcrumbPath(view: AppView, patientName?: string): Array<{ label: string; href?: AppView }> {
  switch (view) {
    case 'patients':
      return [
        { label: 'Home', href: 'dashboard' },
        { label: 'Patients' },
      ];
    case 'patient-new':
      return [
        { label: 'Home', href: 'dashboard' },
        { label: 'Patients', href: 'patients' },
        { label: 'New Patient' },
      ];
    case 'patient-profile':
      return [
        { label: 'Home', href: 'dashboard' },
        { label: 'Patients', href: 'patients' },
        { label: patientName || 'Patient Profile' },
      ];
    case 'consultation':
      return [
        { label: 'Home', href: 'dashboard' },
        { label: 'Patients', href: 'patients' },
        { label: patientName || 'Patient' },
        { label: 'Consultation' },
      ];
    case 'map':
      return [
        { label: 'Home', href: 'dashboard' },
        { label: 'Risk Map' },
      ];
    case 'audit':
      return [
        { label: 'Home', href: 'dashboard' },
        { label: 'Audit Logs' },
      ];
    default:
      return [];
  }
}

function BreadcrumbBar() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Don't show breadcrumbs on dashboard or login
  if (currentView === 'dashboard' || currentView === 'login') return null;

  const path = getBreadcrumbPath(currentView);

  return (
    <div className="border-b border-rose-100/60 dark:border-gray-800 px-6 py-2.5 bg-gradient-to-r from-white/70 to-rose-50/30 dark:from-gray-950/70 dark:to-gray-900/30 backdrop-blur-sm">
      <Breadcrumb className="text-sm">
        <BreadcrumbList>
          {path.map((item, idx) => {
            const isLast = idx === path.length - 1;
            if (isLast) {
              return (
                <BreadcrumbItem key={idx}>
                  <BreadcrumbPage className="text-muted-foreground dark:text-gray-400 text-sm">
                    {item.label}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              );
            }
            return (
              <span key={idx} className="flex items-center gap-1.5">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer text-sm"
                    onClick={() => item.href && setCurrentView(item.href)}
                  >
                    {item.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}



export function AppShell({ children }: { children: React.ReactNode }) {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const currentNurse = useAppStore((s) => s.currentNurse);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('momternal-sidebar-collapsed') === 'true';
    }
    return false;
  });
  const [isOnline, setIsOnline] = useState(true);
  const prevOnlineRef = useRef(true);
  const isOffline = useAppStore((s) => s.isOffline);
  const setIsOffline = useAppStore((s) => s.setIsOffline);
  const pendingSyncCount = useAppStore((s) => s.pendingSyncCount);
  const setPendingSyncCount = useAppStore((s) => s.setPendingSyncCount);

  // Sync pendingSyncCount from offline queue on mount and periodically
  useEffect(() => {
    const syncCount = () => setPendingSyncCount(getQueueLength());
    syncCount();
    const interval = setInterval(syncCount, 3000);
    return () => clearInterval(interval);
  }, [setPendingSyncCount]);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('momternal-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Track online status with toast notifications and offline queue processing
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsOffline(false);
      if (prevOnlineRef.current === false) {
        // Check if there are queued actions to sync
        const queueLen = getQueueLength();
        if (queueLen > 0) {
          toast.success('Back online! Syncing...', {
            description: `Processing ${queueLen} pending action${queueLen > 1 ? 's' : ''}.`,
            duration: 4000,
          });
          // Process queue in background
          const result = await processQueue();
          setPendingSyncCount(getQueueLength());
          if (result.processed > 0) {
            toast.success(`Synced ${result.processed} action${result.processed > 1 ? 's' : ''} successfully`, {
              duration: 3000,
            });
          }
          if (result.failed > 0) {
            toast.error(`${result.failed} action${result.failed > 1 ? 's' : ''} failed to sync`, {
              description: 'Will retry when back online.',
              duration: 4000,
            });
          }
        } else {
          toast.success('Back online!', {
            description: 'Data will be refreshed automatically.',
            duration: 3000,
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload(),
            },
          });
        }
      }
      prevOnlineRef.current = true;
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsOffline(true);
      if (prevOnlineRef.current === true) {
        toast.warning("You're offline", {
          description: 'Cached data is available. Changes will sync when online.',
          duration: 5000,
        });
      }
      prevOnlineRef.current = false;
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOffline, setPendingSyncCount]);

  // Init dark mode on mount
  useEffect(() => {
    const saved = localStorage.getItem('momternal-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

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
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-rose-200/70 dark:border-gray-700/60 bg-gradient-to-b from-white via-rose-50/30 to-white dark:from-gray-950 dark:via-gray-900/50 dark:to-gray-950 backdrop-blur-sm flex-shrink-0 sticky top-0 h-screen shadow-[2px_0_12px_-4px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_16px_-4px_rgba(0,0,0,0.4)] transition-all duration-300",
        sidebarCollapsed ? "w-[68px]" : "w-64"
      )}>
        <SidebarContent
          onNavigate={(v) => setCurrentView(v)}
          currentView={currentView}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-b border-rose-200/70 dark:border-gray-700/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_4px_-1px_rgba(0,0,0,0.3)]">
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
              {/* Notification Bell */}
              <NotificationBell />

              {/* Pending Sync Badge */}
              {pendingSyncCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 ring-1 ring-amber-200/60 dark:ring-amber-800/30 shadow-sm shadow-amber-200/40">
                  <CloudOff className="h-3 w-3" />
                  <span className="hidden sm:inline">{pendingSyncCount} pending</span>
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">{pendingSyncCount}</span>
                </div>
              )}

              {/* Online/Offline indicator */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 ring-1 ring-emerald-200/60 dark:ring-emerald-800/30'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 ring-1 ring-amber-200/60 dark:ring-amber-800/30'
              }`}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Session timer icon */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 ring-1 ring-rose-200/60 dark:ring-rose-800/30">
                <Clock className="h-3 w-3" />
                <span className="hidden sm:inline">Session Active</span>
              </div>

              {/* Mobile avatar */}
              <Avatar className="h-8 w-8 lg:hidden bg-rose-100 dark:bg-rose-900/30">
                <AvatarFallback className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {currentNurse?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Breadcrumb Bar */}
        <BreadcrumbBar />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 bg-gradient-to-b from-gray-50/80 to-gray-100/60 dark:from-gray-950/50 dark:to-gray-900/40">
          {children}
        </main>

        {/* Offline Banner — persistent bottom bar */}
        {isOffline && (
          <div className="sticky bottom-0 z-50 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-[0_-2px_10px_rgba(245,158,11,0.3)]">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">
              You're offline — cached data is available. Changes will sync when you're back online.
            </p>
            {pendingSyncCount > 0 && (
              <span className="inline-flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-full bg-white/20 text-amber-50 text-xs font-bold backdrop-blur-sm border border-white/20">
                {pendingSyncCount} pending
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-rose-200/40 dark:border-gray-700/40 bg-white/70 dark:bg-gray-950/70 mt-auto backdrop-blur-sm">
          <div className="px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground dark:text-gray-500">
              <div className="flex items-center gap-1.5">
                <Baby className="h-3.5 w-3.5 text-rose-400" />
                <span>&copy; 2025 MOMternal — Mobilized Outreach Maternal Support</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-semibold ring-1 ring-rose-200/50 dark:ring-rose-800/30">ADPIE</span>
                <span className="text-rose-200 dark:text-gray-700">·</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-semibold ring-1 ring-rose-200/50 dark:ring-rose-800/30">SOAP</span>
                <span className="text-rose-200 dark:text-gray-700">·</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-semibold ring-1 ring-rose-200/50 dark:ring-rose-800/30">NNN</span>
                <span className="text-rose-200 dark:text-gray-700">·</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-semibold ring-1 ring-rose-200/50 dark:ring-rose-800/30">ICD-10</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground dark:text-gray-500">Made with R.N.</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
