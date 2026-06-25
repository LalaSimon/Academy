import { useState } from 'react';
import { Plus, CreditCard, CheckCircle2, AlertCircle, Clock, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  usePayments,
  usePaymentStats,
  useUpdatePaymentStatus,
  useDeletePayment,
  useCheckoutPayment,
  type Payment,
} from '@/hooks/usePayments';
import { PaymentFormModal } from '@/components/payments/PaymentFormModal';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekuje',
  PAID: 'Zapłacone',
  OVERDUE: 'Zaległe',
  REFUNDED: 'Zwrot',
  CANCELLED: 'Anulowane',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const CHART_COLORS: Record<string, string> = {
  Zapłacone: '#22c55e',
  Oczekuje: '#f59e0b',
  Zaległe: '#ef4444',
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function PaymentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePayments({ status: statusFilter || undefined, page, limit: 25 });
  const { data: stats } = usePaymentStats();
  const updateStatus = useUpdatePaymentStatus();
  const deletePayment = useDeletePayment();
  const checkout = useCheckoutPayment();

  const payments = (data?.data ?? []).filter((p) => {
    if (!search) return true;
    const name = `${p.student.firstName} ${p.student.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
  });

  const chartData = stats
    ? [
        { name: 'Zapłacone', value: stats.paidAmount },
        { name: 'Oczekuje', value: stats.totalAmount - stats.paidAmount - stats.overdueAmount },
        { name: 'Zaległe', value: stats.overdueAmount },
      ]
    : [];

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    if (confirm('Usunąć tę płatność?')) deletePayment.mutate(id);
  };

  const handleCheckout = async (payment: Payment) => {
    const returnUrl = `${window.location.origin}/payments/${payment.id}/result`;
    const result = await checkout.mutateAsync({ id: payment.id, returnUrl });
    window.open(result.checkoutUrl, '_blank');
  };

  const fmt = (amount: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pl-PL');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Płatności</h2>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-9 px-4 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nowa płatność
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={CreditCard}
            label="Łącznie"
            value={fmt(stats.totalAmount)}
            sub={`${stats.total} płatności`}
            color="bg-violet-100 text-violet-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Zapłacone"
            value={fmt(stats.paidAmount)}
            sub={`${stats.paid} płatności`}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            icon={AlertCircle}
            label="Zaległe"
            value={fmt(stats.overdueAmount)}
            sub={`${stats.overdue} płatności`}
            color="bg-red-100 text-red-600"
          />
          <StatCard
            icon={Clock}
            label="Oczekujące"
            value={fmt(stats.totalAmount - stats.paidAmount - stats.overdueAmount)}
            sub={`${stats.pending} płatności`}
            color="bg-amber-100 text-amber-600"
          />
        </div>
      )}

      {/* Chart */}
      {chartData.some((d) => d.value > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-700 mb-4">Rozkład kwot</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Bar dataKey="value" radius={4}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={CHART_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Szukaj ucznia lub opisu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs rounded-xl border-gray-200"
        />
        <Select value={statusFilter} onValueChange={(v: string | null) => { setStatusFilter(v ?? ''); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-xl border-gray-200">
            <SelectValue placeholder="Wszystkie statusy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Wszystkie</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">Ładowanie...</div>
        ) : payments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400">Brak płatności.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Uczeń</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Opis</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Kwota</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Termin</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.student.firstName} {p.student.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{p.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {fmt(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(p.dueDate)}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={p.status}
                      onValueChange={(v: string | null) => v && handleStatusChange(p.id, v)}
                    >
                      <SelectTrigger className={`h-7 w-36 text-xs border-0 rounded-full px-3 font-medium ${STATUS_COLORS[p.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-violet-500 hover:text-violet-700"
                          title="Płać przez Przelewy24"
                          onClick={() => handleCheckout(p)}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-500"
                        title="Usuń"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{data.total} płatności łącznie</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Poprzednia
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page * data.limit >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Następna
              </Button>
            </div>
          </div>
        )}
      </div>

      <PaymentFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
