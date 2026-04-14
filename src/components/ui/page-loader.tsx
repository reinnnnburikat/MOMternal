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
      <div className="animate-spin">
        <svg
          className={cn('text-rose-500', sizeClasses[size])}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          role="status"
          aria-label="Loading"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>

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
      <svg
        className="w-4 h-4 animate-spin text-rose-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message && <span className="text-xs font-medium">{message}</span>}
    </div>
  );
}
