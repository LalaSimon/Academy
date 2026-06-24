import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { accessToken, user, setAccessToken, logout } = useAuthStore();

  useEffect(() => {
    // Mamy token w pamięci — app gotowa
    if (accessToken) { setReady(true); return; }

    // Mamy zapisanego usera (persist), ale brak tokenu (po odświeżeniu strony)
    // Próbujemy odświeżyć token przez httpOnly cookie
    if (user) {
      axios
        .post<{ accessToken: string }>('/api/v1/auth/refresh', {}, { withCredentials: true })
        .then(({ data }) => setAccessToken(data.accessToken))
        .catch(() => logout())
        .finally(() => setReady(true));
      return;
    }

    // Brak usera — gość niezalogowany
    setReady(true);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
