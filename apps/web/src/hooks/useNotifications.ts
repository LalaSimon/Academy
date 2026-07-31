import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type NotificationType =
  | 'CLASS_REMINDER'
  | 'PAYMENT_REMINDER'
  | 'CLASS_CANCELLED'
  | 'ATTENDANCE_ALERT'
  | 'GENERAL';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

const NOTIFICATIONS_KEY = 'notifications';

/** Odpytywanie licznika nieprzeczytanych co 45 s (polling). */
export function useUnreadCount() {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: () =>
      api
        .get<{ count: number }>('/notifications/unread-count')
        .then((r) => r.data.count),
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications(
  { unread, page, limit }: { unread?: boolean; page?: number; limit?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, 'list', { unread, page, limit }],
    queryFn: () =>
      api
        .get<NotificationsResponse>('/notifications', {
          params: { unread, page, limit },
        })
        .then((r) => r.data),
    enabled,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
  });
}
