import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { setAccessToken, logout } = useAuthStore();

  useEffect(() => {
    const tryRefresh = (user: ReturnType<typeof useAuthStore.getState>['user']) => {
      if (!user) { setReady(true); return; }

      axios
        .post<{ accessToken: string }>('/api/v1/auth/refresh', {}, { withCredentials: true })
        .then(({ data }) => setAccessToken(data.accessToken))
        .catch(() => logout())
        .finally(() => setReady(true));
    };

    // Jeśli Zustand już skończył hydratację z localStorage
    if (useAuthStore.persist.hasHydrated()) {
      const { accessToken, user } = useAuthStore.getState();
      if (accessToken) { setReady(true); return; }
      tryRefresh(user);
      return;
    }

    // Czekamy na zakończenie hydratacji, dopiero potem sprawdzamy stan
    const unsub = useAuthStore.persist.onFinishHydration((state) => {
      if (state.accessToken) { setReady(true); return; }
      tryRefresh(state.user);
    });

    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
