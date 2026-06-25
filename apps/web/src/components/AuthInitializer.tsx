import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

type Status = 'hydrating' | 'refreshing' | 'done';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(() =>
    useAuthStore.persist.hasHydrated() ? 'refreshing' : 'hydrating',
  );

  useEffect(() => {
    if (status === 'hydrating') {
      return useAuthStore.persist.onFinishHydration(() => setStatus('refreshing'));
    }

    if (status === 'refreshing') {
      const { user, setAccessToken, logout } = useAuthStore.getState();
      if (!user) {
        setStatus('done');
        return;
      }
      // User is persisted — try to get a fresh access token silently
      axios
        .post<{ accessToken: string }>('/api/v1/auth/refresh', {}, { withCredentials: true })
        .then(({ data }) => {
          setAccessToken(data.accessToken);
        })
        .catch(() => {
          // Refresh token expired or invalid — clear stale user state
          logout();
        })
        .finally(() => setStatus('done'));
    }
  }, [status]);

  if (status !== 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
