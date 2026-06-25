import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends User {
  studentGroups: { group: { id: string; name: string; language: string } }[];
  asParent: { student: { id: string; firstName: string; lastName: string } }[];
  asStudent: { parent: { id: string; firstName: string; lastName: string } }[];
}

export interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserQuery {
  role?: User['role'];
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  phone?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: User['role'];
  phone?: string;
  isActive?: boolean;
}

const USERS_KEY = 'users';

export function useUsers(query: UserQuery = {}) {
  return useQuery<UsersResponse>({
    queryKey: [USERS_KEY, query],
    queryFn: () =>
      api.get<UsersResponse>('/users', { params: query }).then((r) => r.data),
  });
}

export function useUser(id: string) {
  return useQuery<UserDetail>({
    queryKey: [USERS_KEY, id],
    queryFn: () => api.get<UserDetail>(`/users/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export interface TeacherStats {
  overall: { total: number; completed: number; cancelled: number; scheduled: number; hours: number };
  byMonth: { year: number; month: number; total: number; completed: number; hours: number }[];
  byGroup: { group: { id: string; name: string; language: string | null; level: string | null }; total: number; completed: number; hours: number }[];
  classes: { id: string; title: string; scheduledAt: string; durationMin: number; status: string; group: { id: string; name: string } }[];
}

export function useTeacherStats(teacherId: string, range?: { from?: string; to?: string }) {
  return useQuery<TeacherStats>({
    queryKey: [USERS_KEY, teacherId, 'stats', range],
    queryFn: () =>
      api
        .get<TeacherStats>(`/users/${teacherId}/stats`, { params: { from: range?.from, to: range?.to } })
        .then((r) => r.data),
    enabled: !!teacherId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      api.post<User>('/users', payload).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateUserPayload & { id: string }) =>
      api.patch<User>(`/users/${id}`, payload).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}
