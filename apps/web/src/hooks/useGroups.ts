import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface GroupTeacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface GroupStudent {
  id: string;
  joinedAt: string;
  student: { id: string; firstName: string; lastName: string; email: string };
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  level: string | null;
  maxStudents: number;
  isActive: boolean;
  createdAt: string;
  teacher: GroupTeacher;
  _count: { students: number };
}

export interface GroupDetail extends Group {
  students: GroupStudent[];
}

export interface GroupsResponse {
  data: Group[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GroupQuery {
  search?: string;
  language?: string;
  teacherId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  language?: string;
  level?: string;
  maxStudents?: number;
  teacherId: string;
}

export interface UpdateGroupPayload extends Partial<CreateGroupPayload> {
  isActive?: boolean;
}

const GROUPS_KEY = 'groups';

export function useGroups(query: GroupQuery = {}) {
  return useQuery<GroupsResponse>({
    queryKey: [GROUPS_KEY, query],
    queryFn: () => api.get<GroupsResponse>('/groups', { params: query }).then((r) => r.data),
  });
}

export function useGroup(id: string) {
  return useQuery<GroupDetail>({
    queryKey: [GROUPS_KEY, id],
    queryFn: () => api.get<GroupDetail>(`/groups/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) =>
      api.post<Group>('/groups', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GROUPS_KEY] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateGroupPayload & { id: string }) =>
      api.patch<Group>(`/groups/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [GROUPS_KEY] });
      // Classes embed group name and teacher — stale without this
      void qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [GROUPS_KEY] }),
  });
}

export function useAddStudentToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, studentId }: { groupId: string; studentId: string }) =>
      api.post(`/groups/${groupId}/students/${studentId}`),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: [GROUPS_KEY] });
      // Student's profile includes studentGroups — must refresh after membership change
      void qc.invalidateQueries({ queryKey: ['users', vars.studentId] });
    },
  });
}

export function useRemoveStudentFromGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, studentId }: { groupId: string; studentId: string }) =>
      api.delete(`/groups/${groupId}/students/${studentId}`),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: [GROUPS_KEY] });
      void qc.invalidateQueries({ queryKey: ['users', vars.studentId] });
    },
  });
}
