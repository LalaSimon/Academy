import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePayments, useCheckoutPayment } from '@/hooks/usePayments';
import { useChildProfile } from '@/hooks/useParentProfile';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekuje',
  PAID: 'Zapłacone',
  OVERDUE: 'Zaległe',
  REFUNDED: 'Zwrot',
  CANCELLED: 'Anulowane',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  PAID: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  OVERDUE: 'bg-red-500/15 text-red-400 border border-red-500/20',
  REFUNDED: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  CANCELLED: 'bg-muted/40 text-muted-foreground border border-border',
};

export default function ParentChildPaymentsPage() {
  const { childId } = useParams<{ childId: string }>();
  const queryClient = useQueryClient();
  const { data: profile } = useChildProfile(childId);
  const { data, isLoading } = usePayments({ studentId: childId, limit: 100 });
  const checkout = useCheckoutPayment();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (!status) return;

    window.history.replaceState({}, '', window.location.pathname);

    if (status === 'success') {
      toast.success('Płatność zakończona sukcesem!', {
        description: 'Stripe przetwarza potwierdzenie — status zaktualizuje się za chwilę.',
      });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['payments'] }), 3000);
    } else if (status === 'cancelled') {
      toast.info('Płatność anulowana.');
    }
  }, [queryClient]);

  const payments = data?.data ?? [];
  const pending = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
  const paid = payments.filter((p) => p.status === 'PAID');

  const pendingAmount = pending.reduce((s, p) => s + Number(p.amount), 0);
  const paidAmount = paid.reduce((s, p) => s + Number(p.amount), 0);

  const fmt = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pl-PL');

  const childName = profile ? `${profile.firstName} ${profile.lastName}` : '...';
  const returnUrl = `${window.location.origin}/parent/children/${childId}/payments`;

  const handleCheckout = async (paymentId: string) => {
    try {
      toast.info('Przekierowuję do bramki płatności...');
      const result = await checkout.mutateAsync({ id: paymentId, returnUrl });
      window.location.href = result.checkoutUrl;
    } catch {
      toast.error('Nie udało się otworzyć bramki płatności');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Płatności</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{childName}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/15">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Do opłacenia</p>
            <p className="text-xl font-bold text-foreground">{fmt(pendingAmount)}</p>
            <p className="text-xs text-muted-foreground">{pending.length} płatności</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Zapłacone</p>
            <p className="text-xl font-bold text-foreground">{fmt(paidAmount)}</p>
            <p className="text-xs text-muted-foreground">{paid.length} płatności</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Ładowanie...</div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CreditCard className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Brak płatności</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
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
                  <td className="px-4 py-3 text-[13px] text-foreground max-w-xs truncate">{p.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground text-[13px]">
                    {fmt(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[13px]">
                    <div>{fmtDate(p.dueDate)}</div>
                    {p.paidAt && <div className="text-[11px] text-emerald-400">Zapł. {fmtDate(p.paidAt)}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(p.status === 'PENDING' || p.status === 'OVERDUE') && (
                      <button
                        onClick={() => handleCheckout(p.id)}
                        disabled={checkout.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-xl disabled:opacity-50 transition-opacity hover:opacity-90 ml-auto"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Zapłać
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
