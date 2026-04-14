'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  Clock,
  AlertTriangle,
  UserCheck,
  CalendarClock,
  CheckCircle2,
  Inbox,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

interface NotificationAction {
  type: 'resume_consultation' | 'view_patient';
  consultationId?: string;
  patientId: string;
}

interface Notification {
  id: string;
  type: 'paused_consultation' | 'high_risk' | 'follow_up';
  title: string;
  message: string;
  description: string;
  timestamp: string;
  action: NotificationAction;
}

// ── Constants ────────────────────────────────────────────────────────

const NOTIFICATION_CONFIG = {
  paused_consultation: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-l-amber-400',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    dotColor: 'bg-amber-400',
  },
  high_risk: {
    icon: AlertTriangle,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-l-rose-400',
    badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    dotColor: 'bg-rose-500',
  },
  follow_up: {
    icon: CalendarClock,
    color: 'text-sky-500',
    bgColor: 'bg-sky-50 dark:bg-sky-950/40',
    borderColor: 'border-l-sky-400',
    badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    dotColor: 'bg-sky-400',
  },
} as const;

const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes

// ── Helpers ──────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

function getSessionExpiryNotification(): Notification | null {
  const state = useAppStore.getState();
  if (!state.isAuthenticated || state.lastActivity === 0) return null;

  const remaining = SESSION_TIMEOUT - (Date.now() - state.lastActivity);
  if (remaining <= 0) return null;
  if (remaining > 5 * 60 * 1000) return null; // Only warn when < 5 min left

  const minutesLeft = Math.ceil(remaining / 60000);

  return {
    id: 'session-expiry',
    type: 'paused_consultation', // reuse amber style
    title: 'Session Expiring Soon',
    message: `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} remaining`,
    description: 'Your session will expire due to inactivity',
    timestamp: new Date(Date.now()).toISOString(),
    action: { type: 'view_patient', patientId: '' }, // no-op action
  };
}

// ── Single Notification Item ─────────────────────────────────────────

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: (n: Notification) => void;
}) {
  const config = NOTIFICATION_CONFIG[notification.type];
  const Icon = config.icon;

  return (
    <button
      onClick={() => onClick(notification)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-xl border-l-[3px] group',
        config.borderColor,
        'hover:bg-accent/50 hover:shadow-sm transition-all duration-200 text-left cursor-pointer'
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5 p-1.5 rounded-lg ring-1 ring-black/5 dark:ring-white/5', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-foreground truncate">
            {notification.title}
          </span>
        </div>
        <p className="text-sm text-foreground truncate">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {notification.description}
        </p>
        <span className="text-[11px] text-muted-foreground/70 mt-1.5 inline-block">
          {formatTimeAgo(notification.timestamp)}
        </span>
      </div>

      {/* Unread dot */}
      <div className={cn('flex-shrink-0 w-2 h-2 rounded-full mt-2 opacity-70', config.dotColor)} />
    </button>
  );
}

// ── Empty State ──────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="relative mb-4">
        <div className="absolute -inset-2 rounded-full border-2 border-dashed border-rose-200/50 dark:border-rose-800/30" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 flex items-center justify-center">
          <Inbox className="h-7 w-7 text-rose-300 dark:text-rose-500" />
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground">All caught up!</p>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px] leading-relaxed">
        No new notifications right now. We&apos;ll let you know when something needs your attention.
      </p>
    </div>
  );
}

// ── Notification Bell (God Mode) ─────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedConsultationId = useAppStore((s) => s.setSelectedConsultationId);
  const setSelectedPatientId = useAppStore((s) => s.setSelectedPatientId);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const lastActivity = useAppStore((s) => s.lastActivity);

  // Compute session expiry notification reactively
  const sessionNotification = (() => {
    if (!isAuthenticated || lastActivity === 0) return null;
    const remaining = SESSION_TIMEOUT - (Date.now() - lastActivity);
    if (remaining <= 0 || remaining > 5 * 60 * 1000) return null;
    const minutesLeft = Math.ceil(remaining / 60000);
    return {
      id: 'session-expiry',
      type: 'paused_consultation' as const,
      title: 'Session Expiring Soon',
      message: `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} remaining`,
      description: 'Your session will expire due to inactivity',
      timestamp: new Date(Date.now()).toISOString(),
      action: { type: 'view_patient' as const, patientId: '' },
    };
  })();

  // Combine API notifications + session warning
  const allNotifications = sessionNotification
    ? [sessionNotification, ...notifications]
    : notifications;

  const unreadCount = allNotifications.length;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // silent — don't spam console on network errors
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Poll every 15 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    const store = useAppStore.getState();

    switch (notification.action.type) {
      case 'resume_consultation':
        if (notification.action.patientId) {
          store.setSelectedPatientId(notification.action.patientId);
        }
        if (notification.action.consultationId) {
          store.setSelectedConsultationId(notification.action.consultationId);
        }
        store.setCurrentView('consultation');
        break;
      case 'view_patient':
        if (notification.action.patientId) {
          store.setSelectedPatientId(notification.action.patientId);
          store.setCurrentView('patient-profile');
        }
        break;
    }

    setOpen(false);
  };

  // Group counts for the header
  const pausedCount = allNotifications.filter((n) => n.type === 'paused_consultation' && n.id !== 'session-expiry').length;
  const highRiskCount = allNotifications.filter((n) => n.type === 'high_risk').length;
  const followUpCount = allNotifications.filter((n) => n.type === 'follow_up').length;
  const sessionWarning = sessionNotification !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        >
          <Bell
            className={cn(
              'h-4.5 w-4.5 text-muted-foreground transition-transform duration-200',
              unreadCount > 0 && 'text-rose-500'
            )}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-[pulse_2s_ease-in-out_infinite]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-rose-50/30 to-transparent dark:from-rose-950/10 dark:to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
              <Bell className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="h-5 min-w-5 px-1.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 hover:bg-rose-100"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Type filter pills */}
            {pausedCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 ring-1 ring-amber-200/60 dark:ring-amber-800/30">
                <Clock className="h-2.5 w-2.5" /> {pausedCount}
              </span>
            )}
            {highRiskCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 ring-1 ring-rose-200/60 dark:ring-rose-800/30">
                <AlertTriangle className="h-2.5 w-2.5" /> {highRiskCount}
              </span>
            )}
            {followUpCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 ring-1 ring-sky-200/60 dark:ring-sky-800/30">
                <CalendarClock className="h-2.5 w-2.5" /> {followUpCount}
              </span>
            )}
          </div>
        </div>

        {/* Session warning banner */}
        {sessionWarning && sessionNotification && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-800 dark:text-amber-200 truncate">
              Session expires in {sessionNotification.message.replace(' remaining', '')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-[10px] text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              onClick={() => {
                useAppStore.getState().updateActivity();
              }}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        )}

        {/* Notification list */}
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="h-7 w-7 rounded-full border-2 border-rose-300/60 dark:border-rose-600/40 border-t-rose-500 animate-spin" />
            <span className="text-xs text-muted-foreground mt-3">Loading notifications…</span>
          </div>
        ) : allNotifications.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea className="h-[340px]">
            <div className="px-2 py-2 space-y-1">
              {allNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {allNotifications.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2.5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setOpen(false);
                  setCurrentView('dashboard');
                }}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                View Dashboard
              </Button>
              <span className="text-[11px] text-muted-foreground/60">
                Auto-refreshes every 15s
              </span>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
