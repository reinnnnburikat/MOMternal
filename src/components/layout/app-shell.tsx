'use client';

import { useState, useEffect } from 'react';
import { useAppStore, AppView } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
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
  Bell,
  Sun,
  Moon,
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
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleLogout = () => {
    logout();
    toast.info('You have been logged out');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-rose-100 dark:border-gray-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 flex items-center justify-center overflow-hidden flex-shrink-0">
          <img src="/momternal_logo.png" alt="MOMternal" className="w-full h-full object-contain p-1" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-rose-900 dark:text-rose-100 tracking-tight">MOMternal</h1>
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
                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200'
                  : 'text-muted-foreground hover:text-foreground hover:bg-rose-50 dark:hover:bg-gray-800'
              )}
              onClick={() => onNavigate(item.view)}
            >
              <item.icon className={cn('h-4.5 w-4.5', isActive && 'text-rose-600')} />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* Dark Mode Toggle */}
      <Separator className="mx-3 bg-rose-100 dark:bg-gray-800" />
      <div className="px-3 py-2">
        <DarkModeToggle />
      </div>

      <Separator className="mx-3 bg-rose-100 dark:bg-gray-800" />

      {/* User */}
      <div className="border-t border-rose-100 dark:border-gray-800 px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <Avatar className="h-9 w-9 bg-rose-100 dark:bg-rose-900/30">
            <AvatarFallback className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {currentNurse?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{currentNurse?.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{currentNurse?.email}</p>
          </div>
        </div>
        <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-9 px-3 text-sm text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('momternal-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleDark = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('momternal-theme', newDark ? 'dark' : 'light');
  };

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
    <div className="border-b border-rose-100 dark:border-gray-800 px-6 py-2">
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

function NotificationBell() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [pausedCount] = useState(0); // Could be wired to real data

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          onClick={() => setCurrentView('dashboard')}
        >
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {pausedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {pausedCount > 9 ? '9+' : pausedCount}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Notifications{pausedCount > 0 ? ` (${pausedCount})` : ''}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const currentNurse = useAppStore((s) => s.currentNurse);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      <aside className="hidden lg:flex w-64 flex-col border-r border-rose-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm flex-shrink-0 sticky top-0 h-screen">
        <SidebarContent onNavigate={(v) => setCurrentView(v)} currentView={currentView} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-rose-100 dark:border-gray-800">
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

              {/* Online/Offline indicator */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
              }`}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Session timer icon */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
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
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-rose-100 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 mt-auto">
          <div className="px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground dark:text-gray-500">
              <div className="flex items-center gap-1.5">
                <Baby className="h-3.5 w-3.5 text-rose-400" />
                <span>&copy; 2025 MOMternal — Mobilized Outreach Maternal Support</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[10px] font-medium">ADPIE</span>
                <span className="text-rose-300 dark:text-gray-700">&middot;</span>
                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[10px] font-medium">SOAP</span>
                <span className="text-rose-300 dark:text-gray-700">&middot;</span>
                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[10px] font-medium">NNN</span>
                <span className="text-rose-300 dark:text-gray-700">&middot;</span>
                <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[10px] font-medium">ICD-10</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Made with ❤ for UMAK</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
