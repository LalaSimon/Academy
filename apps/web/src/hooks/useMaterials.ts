import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

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
      const { data } = await axios.get<MaterialsPage>(`/api/v1/materials?${params}`);
      return data;
    },
  });
}

export function useClassMaterials(classId: string) {
  return useQuery<Material[]>({
    queryKey: ['materials', 'class', classId],
    queryFn: async () => {
      const { data } = await axios.get<Material[]>(`/api/v1/materials/class/${classId}`);
      return data;
    },
    enabled: !!classId,
  });
}

export function useUploadMaterial() {
  const queryClient = useQueryClient();
  return useMutation<Material, Error, FormData>({
    mutationFn: async (formData) => {
      const { data } = await axios.post<Material>('/api/v1/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useCreateLinkMaterial() {
  const queryClient = useQueryClient();
  return useMutation<Material, Error, CreateLinkPayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.post<Material>('/api/v1/materials', payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await axios.delete(`/api/v1/materials/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export function useAssignMaterial() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { materialId: string; classId: string }>({
    mutationFn: async ({ materialId, classId }) => {
      await axios.post(`/api/v1/materials/${materialId}/classes/${classId}`);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'class', vars.classId] });
    },
  });
}

export function useUnassignMaterial() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { materialId: string; classId: string }>({
    mutationFn: async ({ materialId, classId }) => {
      await axios.delete(`/api/v1/materials/${materialId}/classes/${classId}`);
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['materials', 'class', vars.classId] });
    },
  });
}

export function useDownloadUrl(id: string) {
  return useQuery<{ url: string }>({
    queryKey: ['materials', id, 'download'],
    queryFn: async () => {
      const { data } = await axios.get<{ url: string }>(`/api/v1/materials/${id}/download`);
      return data;
    },
    enabled: false,
  });
}
