import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

// Czeka na zakończenie asynchronicznej hydratacji Zustand persist z localStorage.
// Nie próbuje refreshować tokenu — tym zajmuje się interceptor Axios (api.ts)
// gdy pierwsze chronione zapytanie dostanie 401.
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
