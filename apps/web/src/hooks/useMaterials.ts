import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export type MaterialType = 'PDF' | 'VIDEO' | 'AUDIO' | 'IMAGE' | 'LINK' | 'OTHER';

export interface Material {
  id: string;
  title: string;
  description: string | null;
  type: MaterialType;
  url: string;
  fileKey: string | null;
  isPublic: boolean;
  createdAt: string;
  uploader: { id: string; firstName: string; lastName: string };
}

export interface MaterialsPage {
  data: Material[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MaterialQuery {
  type?: MaterialType;
  search?: string;
  classId?: string;
  page?: number;
  limit?: number;
}

interface CreateLinkPayload {
  title: string;
  description?: string;
  type: MaterialType;
  url: string;
}

export function useMaterials(query: MaterialQuery = {}) {
  return useQuery<MaterialsPage>({
    queryKey: ['materials', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.type) params.set('type', query.type);
      if (query.search) params.set('search', query.search);
      if (query.classId) params.set('classId', query.classId);
      if (query.page) params.set('page', String(query.page));
      if (query.limit) params.set('limit', String(query.limit));
      const { data } = await api.get<MaterialsPage>(`/materials?${params}`);
      return data;
    },
  });
}

export function useClassMaterials(classId: string) {
  return useQuery<Material[]>({
    queryKey: ['materials', 'class', classId],
    queryFn: async () => {
      const { data } = await api.get<Material[]>(`/materials/class/${classId}`);
      return data;
    },
    enabled: !!classId,
  });
}

export function useUploadMaterial() {
  const queryClient = useQueryClient();
  return useMutation<Material, Error, FormData>({
    mutationFn: async (formData) => {
      const { data } = await api.post<Material>('/materials/upload', formData);
      return data;
    },
    onSuccess: (m) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success(`"${m.title}" wgrano pomyślnie`);
    },
    onError: (e) => toast.error(`Błąd uploadu: ${e.message}`),
  });
}

export function useCreateLinkMaterial() {
  const queryClient = useQueryClient();
  return useMutation<Material, Error, CreateLinkPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Material>('/materials', payload);
      return data;
    },
    onSuccess: (m) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success(`Link "${m.title}" dodany`);
    },
    onError: (e) => toast.error(`Błąd: ${e.message}`),
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Materiał usunięty');
    },
    onError: (e) => toast.error(`Błąd usuwania: ${e.message}`),
  });
}

export function useAssignMaterialToClass() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { materialId: string; classId: string }>({
    mutationFn: async ({ materialId, classId }) => {
      await api.post(`/materials/${materialId}/classes/${classId}`);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'class', vars.classId] });
      // assignToClass also creates a GroupMaterial (cascade) — invalidate all group material caches
      queryClient.invalidateQueries({ queryKey: ['materials', 'group'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Materiał przypisany do zajęć');
    },
    onError: (e) => toast.error(`Błąd: ${e.message}`),
  });
}

export function useUnassignMaterialFromClass() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { materialId: string; classId: string }>({
    mutationFn: async ({ materialId, classId }) => {
      await api.delete(`/materials/${materialId}/classes/${classId}`);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'class', vars.classId] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (e) => toast.error(`Błąd: ${e.message}`),
  });
}

export function useAssignMaterialToGroup() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { materialId: string; groupId: string }>({
    mutationFn: async ({ materialId, groupId }) => {
      await api.post(`/materials/${materialId}/groups/${groupId}`);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'group', vars.groupId] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Materiał przypisany do grupy');
    },
    onError: (e) => toast.error(`Błąd: ${e.message}`),
  });
}

export function useUnassignMaterialFromGroup() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { materialId: string; groupId: string }>({
    mutationFn: async ({ materialId, groupId }) => {
      await api.delete(`/materials/${materialId}/groups/${groupId}`);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'group', vars.groupId] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (e) => toast.error(`Błąd: ${e.message}`),
  });
}

/**
 * Materiały dla wielu lekcji naraz — JEDNO zapytanie zamiast osobnego na każdą
 * pozycję widoku „Dzisiaj". Zwraca mapę `classId → materiały`; lekcje bez
 * materiałów po prostu nie mają klucza.
 *
 * Backend przecina listę z zajęciami dostępnymi dla zalogowanego użytkownika,
 * więc podanie cudzego `classId` nic nie da.
 */
export function useClassesMaterials(classIds: string[]) {
  // Sortowanie stabilizuje klucz cache — kolejność lekcji nie ma znaczenia,
  // a bez tego każde przetasowanie tworzyłoby nowy wpis w cache.
  const key = [...classIds].sort().join(',');

  return useQuery<Record<string, Material[]>>({
    queryKey: ['materials', 'by-classes', key],
    queryFn: async () => {
      const { data } = await api.get<Record<string, Material[]>>(
        '/materials/by-classes',
        { params: { classIds: key } },
      );
      return data;
    },
    enabled: classIds.length > 0,
  });
}

export function useGroupMaterials(groupId: string) {
  return useQuery<Material[]>({
    queryKey: ['materials', 'group', groupId],
    queryFn: async () => {
      const { data } = await api.get<Material[]>(`/materials/group/${groupId}`);
      return data;
    },
    enabled: !!groupId,
  });
}
