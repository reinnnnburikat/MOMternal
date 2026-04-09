'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorFallback({ error, resetErrorBoundary }: { error: Error & { digest?: string }; resetErrorBoundary: () => void }) {
  useEffect(() => {
    console.error('MOMternal Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2">
            An unexpected error occurred. This has been logged for review. Please try refreshing the page.
          </p>
          {error?.message && process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-red-500 mt-2 font-mono bg-red-50 dark:bg-red-950/20 p-2 rounded">{error.message}</p>
          )}
        </div>
        <Button onClick={resetErrorBoundary} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
