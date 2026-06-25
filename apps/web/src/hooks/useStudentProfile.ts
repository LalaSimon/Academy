import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { UserDetail } from './useUsers';

export function useStudentProfile() {
  const { user } = useAuthStore();
  return useQuery<UserDetail>({
    queryKey: ['users', user?.id],
    queryFn: () => api.get<UserDetail>(`/users/${user!.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });
}
