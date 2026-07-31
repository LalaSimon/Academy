import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentsPage } from '../PaymentsPage';
import type { Payment } from '@/hooks/usePayments';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => {
  const cache: Record<string, unknown> = {};
  return {
    motion: new Proxy(
      {},
      {
        get: (_t: object, tag: string) => {
          if (!cache[tag]) {
            const Tag = tag as keyof JSX.IntrinsicElements;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cache[tag] = ({ children, ...rest }: any) => <Tag {...rest}>{children}</Tag>;
          }
          return cache[tag];
        },
      },
    ),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

// Recharts mierzy kontener przez ResizeObserver, którego jsdom nie ma —
// zastępujemy wykres lekkim stubem wypisującym serie, żeby dało się
// zweryfikować przekazane wartości.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ data, children }: { data?: { name: string; value: number }[]; children?: React.ReactNode }) => (
    <div data-testid="chart">
      {(data ?? []).map((d) => (
        <span key={d.name} data-testid={`chart-${d.name}`}>
          {d.value}
        </span>
      ))}
      {children}
    </div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

vi.mock('@/components/payments/PaymentFormModal', () => ({
  PaymentFormModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="payment-modal" /> : null,
}));

// `vi.mock` jest hoistowany ponad deklaracje zmiennych, więc wszystko, czego
// używają fabryki, musi powstać w `vi.hoisted`.
const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
  invalidate: vi.fn(),
  updateStatus: vi.fn(),
  remove: vi.fn(),
  checkout: vi.fn(),
  // Mutowalny kontener — testy podmieniają zawartość przed renderem.
  state: {
    payments: [] as unknown[],
    stats: undefined as unknown,
  },
}));

vi.mock('sonner', () => ({ toast: h.toast }));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: h.invalidate }),
}));

vi.mock('@/hooks/usePayments', () => ({
  usePayments: () => ({
    data: {
      data: h.state.payments,
      total: h.state.payments.length,
      page: 1,
      limit: 25,
      totalPages: 1,
    },
    isLoading: false,
  }),
  usePaymentStats: () => ({ data: h.state.stats }),
  useUpdatePaymentStatus: () => ({ mutate: h.updateStatus }),
  useDeletePayment: () => ({ mutate: h.remove }),
  useCheckoutPayment: () => ({ mutateAsync: h.checkout }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

function makePayment(over: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    studentId: 's1',
    amount: '150.00',
    currency: 'PLN',
    description: 'Kurs angielskiego',
    status: 'PENDING',
    dueDate: '2026-08-10T00:00:00.000Z',
    paidAt: null,
    periodStart: null,
    periodEnd: null,
    externalId: null,
    paymentProvider: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    student: { id: 's1', firstName: 'Anna', lastName: 'Nowak', email: 'anna@test.pl' },
    ...over,
  };
}

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.state.payments = [];
    h.state.stats = undefined;
    window.history.replaceState({}, '', '/admin/payments');
  });

  it('renderuje listę płatności', () => {
    h.state.payments = [
      makePayment(),
      makePayment({ id: 'p2', description: 'Materiały', student: { id: 's2', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.pl' } }),
    ];
    render(<PaymentsPage />);

    expect(screen.getByText('Kurs angielskiego')).toBeInTheDocument();
    expect(screen.getByText('Materiały')).toBeInTheDocument();
  });

  describe('wyszukiwarka', () => {
    beforeEach(() => {
      h.state.payments = [
        makePayment({ id: 'p1', description: 'Kurs angielskiego' }),
        makePayment({
          id: 'p2',
          description: 'Materiały dodatkowe',
          student: { id: 's2', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.pl' },
        }),
      ];
    });

    it('filtruje po nazwisku ucznia', () => {
      render(<PaymentsPage />);
      fireEvent.change(screen.getByPlaceholderText(/szukaj/i), { target: { value: 'Kowalski' } });

      expect(screen.queryByText('Kurs angielskiego')).not.toBeInTheDocument();
      expect(screen.getByText('Materiały dodatkowe')).toBeInTheDocument();
    });

    it('filtruje po opisie płatności', () => {
      render(<PaymentsPage />);
      fireEvent.change(screen.getByPlaceholderText(/szukaj/i), { target: { value: 'angielskiego' } });

      expect(screen.getByText('Kurs angielskiego')).toBeInTheDocument();
      expect(screen.queryByText('Materiały dodatkowe')).not.toBeInTheDocument();
    });

    it('ignoruje wielkość liter', () => {
      render(<PaymentsPage />);
      fireEvent.change(screen.getByPlaceholderText(/szukaj/i), { target: { value: 'kOwAlSkI' } });

      expect(screen.getByText('Materiały dodatkowe')).toBeInTheDocument();
    });
  });

  describe('wykres — podział kwot', () => {
    it('liczy „Oczekuje" jako resztę po zapłaconych i zaległych', () => {
      // 10000 łącznie, 6000 zapłacone, 1500 zaległe → 2500 oczekujące
      h.state.stats = {
        total: 10, paid: 6, pending: 3, overdue: 1,
        totalAmount: 10000, paidAmount: 6000, overdueAmount: 1500,
      };
      render(<PaymentsPage />);

      expect(screen.getByTestId('chart-Zapłacone')).toHaveTextContent('6000');
      expect(screen.getByTestId('chart-Zaległe')).toHaveTextContent('1500');
      expect(screen.getByTestId('chart-Oczekuje')).toHaveTextContent('2500');
    });

    it('nie renderuje wykresu, dopóki nie ma statystyk', () => {
      h.state.stats = undefined;
      render(<PaymentsPage />);
      expect(screen.queryByTestId('chart-Zapłacone')).not.toBeInTheDocument();
    });
  });

  describe('usuwanie płatności', () => {
    beforeEach(() => {
      h.state.payments = [makePayment()];
    });

    it('usuwa po potwierdzeniu', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(<PaymentsPage />);

      fireEvent.click(screen.getByTitle('Usuń'));
      expect(h.remove).toHaveBeenCalledWith('p1');
    });

    it('NIE usuwa, gdy użytkownik anuluje potwierdzenie', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<PaymentsPage />);

      fireEvent.click(screen.getByTitle('Usuń'));
      expect(h.remove).not.toHaveBeenCalled();
    });
  });

  // Powrót z bramki Stripe — parametr `?status=` w URL-u. Regresja z Fazy 2.1:
  // status musi zniknąć z adresu, żeby odświeżenie strony nie powtórzyło toastu.
  describe('powrót ze Stripe', () => {
    it('pokazuje sukces i czyści parametr z URL-a', () => {
      window.history.replaceState({}, '', '/admin/payments?status=success');
      render(<PaymentsPage />);

      expect(h.toast.success).toHaveBeenCalled();
      expect(window.location.search).toBe('');
    });

    it('pokazuje informację o anulowaniu', () => {
      window.history.replaceState({}, '', '/admin/payments?status=cancelled');
      render(<PaymentsPage />);

      expect(h.toast.info).toHaveBeenCalledWith('Płatność anulowana.');
      expect(window.location.search).toBe('');
    });

    it('nie pokazuje nic, gdy wracamy bez parametru', () => {
      render(<PaymentsPage />);

      expect(h.toast.success).not.toHaveBeenCalled();
      expect(h.toast.info).not.toHaveBeenCalled();
    });
  });

  describe('modal tworzenia płatności', () => {
    it('otwiera się po kliknięciu przycisku', async () => {
      render(<PaymentsPage />);
      expect(screen.queryByTestId('payment-modal')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /nowa płatność/i }));
      await waitFor(() => expect(screen.getByTestId('payment-modal')).toBeInTheDocument());
    });
  });
});
