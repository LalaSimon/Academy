import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ClassStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface ClassGroup {
  id: string;
  name: string;
  language: string | null;
  level: string | null;
  teacher: { id: string; firstName: string | null; lastName: string | null };
}

export interface ClassTeacher {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface Class {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMin: number;
  meetLink: string | null;
  status: ClassStatus;
  cancelReason: string | null;
  createdAt: string;
  group: ClassGroup;
  teacher: ClassTeacher | null;
  batchId: string | null;
  _count: { attendances: number };
}

export interface ClassDetail extends Class {
  attendances: {
    id: string;
    status: string;
    student: { id: string; firstName: string | null; lastName: string | null };
  }[];
}

export interface ClassesResponse {
  data: Class[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClassQuery {
  groupId?: string;
  status?: ClassStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateClassPayload {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMin?: number;
  meetLink?: string;
  groupId: string;
  teacherId?: string;
}

export interface UpdateClassPayload extends Partial<Omit<CreateClassPayload, 'groupId'>> {
  status?: ClassStatus;
  cancelReason?: string;
}

const CLASSES_KEY = 'classes';

export function useClasses(query: ClassQuery = {}) {
  return useQuery<ClassesResponse>({
    queryKey: [CLASSES_KEY, query],
    queryFn: () => api.get<ClassesResponse>('/classes', { params: query }).then((r) => r.data),
  });
}

export function useClass(id: string) {
  return useQuery<ClassDetail>({
    queryKey: [CLASSES_KEY, id],
    queryFn: () => api.get<ClassDetail>(`/classes/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClassPayload) =>
      api.post<Class>('/classes', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLASSES_KEY] }),
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateClassPayload & { id: string }) =>
      api.patch<Class>(`/classes/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLASSES_KEY] }),
  });
}

export function useUpdateClassStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, cancelReason }: { id: string; status: ClassStatus; cancelReason?: string }) =>
      api.patch<Class>(`/classes/${id}/status`, { status, cancelReason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLASSES_KEY] }),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => api.delete(`/classes/batch/${batchId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLASSES_KEY] }),
  });
}

export function useCreateBulkClasses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: CreateClassPayload[]) =>
      api.post<Class[]>('/classes/bulk', { items }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLASSES_KEY] }),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLASSES_KEY] }),
  });
}
