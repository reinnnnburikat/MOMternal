'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Cloud,
  CloudOff,
  Check,
  X,
  ArrowRight,
  Clock,
} from 'lucide-react';
import type { OfflineAction } from '@/lib/offline-queue';
import { resolveConflict, removeAction } from '@/lib/offline-queue';
import { toast } from 'sonner';

interface ConflictResolutionDialogProps {
  conflicts: OfflineAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatActionType(type: string): string {
  switch (type) {
    case 'create-patient': return 'Create Patient';
    case 'update-patient': return 'Update Patient';
    case 'delete-patient': return 'Delete Patient';
    case 'create-consultation': return 'Create Consultation';
    case 'update-consultation': return 'Update Consultation';
    case 'update-consultation-step': return 'Save Consultation Step';
    case 'ai-suggest': return 'AI Suggestions';
    case 'generate-referral': return 'Generate Referral';
    case 'update-evaluation': return 'Update Evaluation';
    case 'delete-consultation': return 'Delete Consultation';
    default: return type;
  }
}

function formatActionTypeColor(type: string): string {
  if (type.includes('patient')) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
  if (type.includes('consultation')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  if (type.includes('ai')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (type.includes('referral')) return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}

function ConflictCard({
  conflict,
  onKeepLocal,
  onKeepServer,
  onDiscard,
}: {
  conflict: OfflineAction;
  onKeepLocal: () => void;
  onKeepServer: () => void;
  onDiscard: () => void;
}) {
  const [resolved, setResolved] = useState(false);

  const handleKeepLocal = () => {
    onKeepLocal();
    setResolved(true);
  };

  const handleKeepServer = () => {
    onKeepServer();
    setResolved(true);
  };

  const handleDiscard = () => {
    onDiscard();
    setResolved(true);
  };

  if (resolved) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          <Check className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Resolved</p>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 truncate">
            {conflict.description || formatActionType(conflict.type)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={formatActionTypeColor(conflict.type)} variant="outline">
            {formatActionType(conflict.type)}
          </Badge>
          {conflict.entityId && (
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              {conflict.entityId.slice(0, 8)}...
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground">
          {conflict.description || formatActionType(conflict.type)}
        </p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Changed {formatTimestamp(conflict.timestamp)}
        </p>
      </div>

      {/* Conflict visualization */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Local version */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <CloudOff className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Your Changes (Offline)</span>
            </div>
            <div className="rounded-lg border border-amber-200/70 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10 p-2.5">
              <pre className="text-[11px] text-foreground/80 whitespace-pre-wrap break-all max-h-24 overflow-y-auto font-mono">
                {conflict.conflictData?.localVersion
                  ? JSON.stringify(conflict.conflictData.localVersion, null, 2).slice(0, 500)
                  : '(No local data)'}
              </pre>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center pt-6">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Server version */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Cloud className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">Server Version</span>
            </div>
            <div className="rounded-lg border border-sky-200/70 dark:border-sky-800/30 bg-sky-50/30 dark:bg-sky-950/10 p-2.5">
              <pre className="text-[11px] text-foreground/80 whitespace-pre-wrap break-all max-h-24 overflow-y-auto font-mono">
                {conflict.conflictData?.serverVersion
                  ? JSON.stringify(conflict.conflictData.serverVersion, null, 2).slice(0, 500)
                  : '(No server data)'}
              </pre>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            size="sm"
            className="flex-1 h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
            onClick={handleKeepLocal}
          >
            <CloudOff className="h-3 w-3 mr-1.5" />
            Keep Mine
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={handleKeepServer}
          >
            <Cloud className="h-3 w-3 mr-1.5" />
            Keep Server&apos;s
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground hover:text-red-600"
            onClick={handleDiscard}
          >
            <X className="h-3 w-3 mr-1" />
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConflictResolutionDialog({
  conflicts,
  open,
  onOpenChange,
  onResolved,
}: ConflictResolutionDialogProps) {
  const [localConflicts, setLocalConflicts] = useState(conflicts);
  const allResolved = localConflicts.length === 0;

  const handleKeepLocal = (actionId: string) => {
    resolveConflict(actionId, true);
    setLocalConflicts(prev => prev.filter(c => c.id !== actionId));
    toast.success('Local version will be applied on next sync');
  };

  const handleKeepServer = (actionId: string) => {
    resolveConflict(actionId, false);
    setLocalConflicts(prev => prev.filter(c => c.id !== actionId));
    toast.info('Server version kept. Your changes were discarded.');
  };

  const handleDiscard = (actionId: string) => {
    removeAction(actionId);
    setLocalConflicts(prev => prev.filter(c => c.id !== actionId));
    toast.info('Change discarded.');
  };

  const handleClose = () => {
    onOpenChange(false);
    if (allResolved) {
      onResolved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            Sync Conflicts Found
          </DialogTitle>
          <DialogDescription>
            {localConflicts.length === 1
              ? 'One of your offline changes conflicts with the server. Please choose which version to keep.'
              : `${localConflicts.length} of your offline changes conflict with the server. Please resolve each conflict below.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {localConflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onKeepLocal={() => handleKeepLocal(conflict.id)}
                onKeepServer={() => handleKeepServer(conflict.id)}
                onDiscard={() => handleDiscard(conflict.id)}
              />
            ))}

            {localConflicts.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-foreground">All conflicts resolved!</p>
                <p className="text-xs text-muted-foreground">Your changes will sync automatically.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter>
          <Button onClick={handleClose} className="bg-rose-600 hover:bg-rose-700 text-white">
            {allResolved ? 'Done' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
