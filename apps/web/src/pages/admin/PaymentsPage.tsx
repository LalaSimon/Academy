import { useState, useEffect } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekuje',
  PAID: 'Zapłacone',
  OVERDUE: 'Zaległe',
  REFUNDED: 'Zwrot',
  CANCELLED: 'Anulowane',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  OVERDUE: 'bg-red-500/15 text-red-400 border-red-500/20',
  REFUNDED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  CANCELLED: 'bg-muted/40 text-muted-foreground border-border',
};

const CHART_COLORS: Record<string, string> = {
  Zapłacone: '#22c55e',
  Oczekuje: '#f59e0b',
  Zaległe: '#ef4444',
};

function StatCard({ icon: Icon, label, value, sub, iconClass }: {
  icon: React.ElementType; label: string; value: string; sub?: string; iconClass: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${iconClass}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function PaymentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = usePayments({ status: statusFilter || undefined, page, limit: 25 });
  const { data: stats } = usePaymentStats();
  const updateStatus = useUpdatePaymentStatus();
  const deletePayment = useDeletePayment();
  const checkout = useCheckoutPayment();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (!status) return;

    window.history.replaceState({}, '', window.location.pathname);

    if (status === 'success') {
      toast.success('Płatność zakończona sukcesem!', {
        description: 'Status płatności zaktualizuje się za chwilę.',
      });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['payments'] }), 3000);
    } else if (status === 'cancelled') {
      toast.info('Płatność anulowana.');
    }
  }, [queryClient]);

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
    toast.info('Przekierowuję do bramki płatności...');
    const returnUrl = `${window.location.origin}/admin/payments`;
    const result = await checkout.mutateAsync({ id: payment.id, returnUrl });
    window.location.href = result.checkoutUrl;
  };

  const fmt = (amount: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pl-PL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Płatności</h2>
        <Button
          onClick={() => setModalOpen(true)}
          className="rounded-xl h-9 px-4 gap-2 text-white"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
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
            iconClass="bg-violet-500/15 text-violet-400"
          />
          <StatCard
            icon={CheckCircle2}
            label="Zapłacone"
            value={fmt(stats.paidAmount)}
            sub={`${stats.paid} płatności`}
            iconClass="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            icon={AlertCircle}
            label="Zaległe"
            value={fmt(stats.overdueAmount)}
            sub={`${stats.overdue} płatności`}
            iconClass="bg-red-500/15 text-red-400"
          />
          <StatCard
            icon={Clock}
            label="Oczekujące"
            value={fmt(stats.totalAmount - stats.paidAmount - stats.overdueAmount)}
            sub={`${stats.pending} płatności`}
            iconClass="bg-amber-500/15 text-amber-400"
          />
        </div>
      )}

      {/* Chart */}
      {chartData.some((d) => d.value > 0) && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm font-medium text-foreground mb-4">Rozkład kwot</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
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
          className="max-w-xs rounded-xl"
        />
        <Select value={statusFilter} onValueChange={(v: string | null) => { setStatusFilter(v ?? ''); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-xl">
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
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">Ładowanie...</div>
        ) : payments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">Brak płatności.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Uczeń</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Opis</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Kwota</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Termin</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground text-[13px]">
                    {p.student.firstName} {p.student.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[13px] max-w-xs truncate">{p.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    {fmt(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[13px]">{fmtDate(p.dueDate)}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={p.status}
                      onValueChange={(v: string | null) => v && handleStatusChange(p.id, v)}
                    >
                      <SelectTrigger className={`h-7 w-36 text-xs border rounded-full px-3 font-medium ${STATUS_COLORS[p.status]}`}>
                        {/* @base-ui Select.Value renderuje surową wartość, więc
                            bez tego mapowania w polu widniałoby „PAID" zamiast
                            „Zapłacone" (ten sam wzorzec co w ReportsPage). */}
                        <SelectValue>{(v: string) => STATUS_LABELS[v] ?? v}</SelectValue>
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
                          className="h-7 w-7 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                          title="Płać przez Przelewy24"
                          onClick={() => handleCheckout(p)}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
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
