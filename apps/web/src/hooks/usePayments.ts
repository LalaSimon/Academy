import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Payment {
  id: string;
  studentId: string;
  amount: string;
  currency: string;
  description: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'REFUNDED' | 'CANCELLED';
  dueDate: string;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  externalId: string | null;
  paymentProvider: string | null;
  createdAt: string;
  student: { id: string; firstName: string; lastName: string; email: string };
}

export interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
}

interface PaymentsQuery {
  studentId?: string;
  groupId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

const PAYMENTS_KEY = 'payments';

export function usePayments(query: PaymentsQuery = {}) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, query],
    queryFn: () =>
      api
        .get<{ data: Payment[]; total: number; page: number; limit: number }>('/payments', { params: query })
        .then((r) => r.data),
  });
}

export function usePaymentStats(query: { from?: string; to?: string; studentId?: string } = {}) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, 'stats', query],
    queryFn: () => api.get<PaymentStats>('/payments/stats', { params: query }).then((r) => r.data),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, id],
    queryFn: () => api.get<Payment>(`/payments/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      studentId: string;
      amount: string;
      description: string;
      dueDate: string;
      currency?: string;
      periodStart?: string;
      periodEnd?: string;
    }) => api.post<Payment>('/payments', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] }),
  });
}

export function useCreateBulkPayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      groupId: string;
      amount: string;
      description: string;
      dueDate: string;
      currency?: string;
      periodStart?: string;
      periodEnd?: string;
    }) => api.post<Payment[]>('/payments/bulk', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] }),
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Payment>(`/payments/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] }),
  });
}

export function useCheckoutPayment() {
  return useMutation({
    mutationFn: ({ id, returnUrl }: { id: string; returnUrl: string }) =>
      api.post<{ checkoutUrl: string }>(`/payments/${id}/checkout`, { returnUrl }).then((r) => r.data),
  });
}
