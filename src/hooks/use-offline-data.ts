import { useState, useEffect, useCallback, useRef } from 'react';
import { getCache, setCache } from '@/lib/offline-cache';

interface UseOfflineDataOptions {
  staleTime?: number;
  enabled?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isFromCache: boolean;
  error: string | null;
  isOnline: boolean;
  refetch: () => void;
}

export function useOfflineData<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  options?: UseOfflineDataOptions
): UseOfflineDataResult<T> {
  const { staleTime = 30000, enabled = true } = options || {};

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const lastFetchTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // Track online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled || !mountedRef.current) return;

    // Skip fetch if data is fresh (unless forced)
    if (!force && data && Date.now() - lastFetchTimeRef.current < staleTime) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      if (!mountedRef.current) return;
      setData(result);
      setIsFromCache(false);
      lastFetchTimeRef.current = Date.now();
      setCache(cacheKey, result);
    } catch {
      if (!mountedRef.current) return;
      // Try cache
      const cached = getCache<T>(cacheKey);
      if (cached) {
        setData(cached);
        setIsFromCache(true);
        setError(null);
      } else {
        setError('No cached data available');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, fetchFn, staleTime, enabled, data]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    // Load cached data immediately for instant UI
    const cached = getCache<T>(cacheKey);
    if (cached && enabled) {
      setData(cached);
      setIsFromCache(true);
      setIsLoading(false);
    }

    // Then fetch fresh data
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [cacheKey, enabled]);

  // Re-fetch when coming back online
  useEffect(() => {
    if (isOnline && isFromCache) {
      fetchData(true);
    }
  }, [isOnline, isFromCache, fetchData]);

  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { data, isLoading, isFromCache, error, isOnline, refetch };
}
