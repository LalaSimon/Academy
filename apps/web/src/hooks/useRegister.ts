import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  accountType: 'student' | 'parent';
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterPayload) =>
      api.post<{ message: string }>('/auth/register', data).then((r) => r.data),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post('/auth/resend-verification', { email }).then((r) => r.data),
  });
}

// Weryfikacja jako QUERY, nie mutacja — query jest keszowany po kluczu
// `['verify-email', token]`, więc dedupuje się i przeżywa podwójny mount
// React StrictMode (mutacja w useEffect gubiła obserwatora przy remoncie →
// strona zawisała na „Weryfikacja..." mimo 200 z backendu).
export function useVerifyEmail(token: string | null) {
  return useQuery({
    queryKey: ['verify-email', token],
    queryFn: () =>
      api
        .get<{ message: string }>(`/auth/verify-email?token=${token}`)
        .then((r) => r.data),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSetupChild() {
  return useMutation({
    mutationFn: (data: { firstName: string; lastName: string; password: string }) =>
      api
        .post<{ id: string; email: string; firstName: string; lastName: string }>(
          '/auth/setup-child',
          data,
        )
        .then((r) => r.data),
  });
}
