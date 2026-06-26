import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { UserDetail } from './useUsers';

export interface ChildSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export function useParentProfile() {
  const { user } = useAuthStore();
  return useQuery<UserDetail>({
    queryKey: ['users', user?.id],
    queryFn: () => api.get<UserDetail>(`/users/${user!.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });
}

export function useChildProfile(childId: string | undefined) {
  return useQuery<UserDetail>({
    queryKey: ['users', childId],
    queryFn: () => api.get<UserDetail>(`/users/${childId}`).then((r) => r.data),
    enabled: !!childId,
  });
}
