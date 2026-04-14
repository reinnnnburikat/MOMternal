'use client';

import { cn } from '@/lib/utils';

interface PageLoaderProps {
  /** Optional message to show below the spinner */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
  /** Full page mode (centered in viewport with min-height) */
  fullPage?: boolean;
}

export function PageLoader({
  message = 'Loading...',
  size = 'md',
  className,
  fullPage = false,
}: PageLoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        fullPage ? 'min-h-[50vh] py-12' : 'py-12',
        className,
      )}
    >
      {/* Spinner loading icon */}
      <img
        src="/loading-icon.png"
        alt="Loading"
        className={cn('animate-spin object-contain drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]', sizeClasses[size])}
        draggable={false}
      />

      {/* Loading message */}
      {message && (
        <p
          className={cn(
            'mt-3 text-muted-foreground font-medium',
            textClasses[size],
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Inline loader — smaller version for embedding within cards or panels.
 */
export function InlineLoader({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <img
        src="/loading-icon.png"
        alt=""
        className="w-4 h-4 animate-spin object-contain"
        draggable={false}
        aria-hidden="true"
      />
      {message && <span className="text-xs font-medium">{message}</span>}
    </div>
  );
}
