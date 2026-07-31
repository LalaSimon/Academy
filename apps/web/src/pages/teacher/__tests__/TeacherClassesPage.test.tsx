import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { TeacherClassesPage } from '../TeacherClassesPage';
import type { Class } from '@/hooks/useClasses';

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

const h = vi.hoisted(() => ({
  updateStatus: vi.fn(),
  state: { classes: [] as unknown[] },
}));

vi.mock('@/hooks/useClasses', () => ({
  useClasses: () => ({
    data: { data: h.state.classes, total: h.state.classes.length, page: 1, limit: 200, totalPages: 1 },
    isLoading: false,
  }),
  useUpdateClassStatus: () => ({ mutate: h.updateStatus, isPending: false }),
}));

vi.mock('@/components/attendance/AttendanceModal', () => ({
  AttendanceModal: ({ open, classTitle }: { open: boolean; classTitle: string }) =>
    open ? <div data-testid="attendance-modal">{classTitle}</div> : null,
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const NOW = new Date('2026-07-15T12:00:00.000Z');

function makeClass(over: Partial<Class> = {}): Class {
  return {
    id: 'c1',
    title: 'Angielski A1',
    description: null,
    scheduledAt: '2026-07-20T10:00:00.000Z',
    durationMin: 60,
    meetLink: null,
    status: 'SCHEDULED',
    cancelReason: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    group: null,
    student: null,
    teacher: null,
    batchId: null,
    _count: { attendances: 0 },
    ...over,
  };
}

describe('TeacherClassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    h.state.classes = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('podział na zakładki', () => {
    beforeEach(() => {
      h.state.classes = [
        makeClass({ id: 'future', title: 'Przyszłe zajęcia', scheduledAt: '2026-07-20T10:00:00.000Z' }),
        makeClass({ id: 'past', title: 'Minione zajęcia', scheduledAt: '2026-07-10T10:00:00.000Z' }),
        makeClass({
          id: 'done',
          title: 'Zakończone w przyszłości',
          scheduledAt: '2026-07-25T10:00:00.000Z',
          status: 'COMPLETED',
        }),
      ];
    });

    it('„Nadchodzące" pokazuje tylko przyszłe i niezakończone', () => {
      render(<TeacherClassesPage />);

      expect(screen.getByText('Przyszłe zajęcia')).toBeInTheDocument();
      expect(screen.queryByText('Minione zajęcia')).not.toBeInTheDocument();
      // Zajęcia zakończone wypadają z „Nadchodzących" nawet z przyszłą datą —
      // nie ma już czego poprowadzić.
      expect(screen.queryByText('Zakończone w przyszłości')).not.toBeInTheDocument();
    });

    it('„Poprzednie" pokazuje minione oraz zakończone', () => {
      render(<TeacherClassesPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Poprzednie' }));

      expect(screen.getByText('Minione zajęcia')).toBeInTheDocument();
      expect(screen.getByText('Zakończone w przyszłości')).toBeInTheDocument();
      expect(screen.queryByText('Przyszłe zajęcia')).not.toBeInTheDocument();
    });

    it('„Wszystkie" pokazuje komplet', () => {
      render(<TeacherClassesPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Wszystkie' }));

      expect(screen.getByText('Przyszłe zajęcia')).toBeInTheDocument();
      expect(screen.getByText('Minione zajęcia')).toBeInTheDocument();
      expect(screen.getByText('Zakończone w przyszłości')).toBeInTheDocument();
    });
  });

  describe('zmiana statusu', () => {
    it('zaplanowane można rozpocząć', () => {
      h.state.classes = [makeClass({ status: 'SCHEDULED' })];
      render(<TeacherClassesPage />);

      fireEvent.click(screen.getByRole('button', { name: /rozpocznij/i }));
      expect(h.updateStatus).toHaveBeenCalledWith({ id: 'c1', status: 'ONGOING' });
    });

    it('trwające można zakończyć', () => {
      h.state.classes = [makeClass({ status: 'ONGOING' })];
      render(<TeacherClassesPage />);

      fireEvent.click(screen.getByRole('button', { name: /zakończ/i }));
      expect(h.updateStatus).toHaveBeenCalledWith({ id: 'c1', status: 'COMPLETED' });
    });

    it('zakończone nie mają już przycisku akcji', () => {
      h.state.classes = [makeClass({ status: 'COMPLETED' })];
      render(<TeacherClassesPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Wszystkie' }));

      expect(screen.queryByRole('button', { name: /rozpocznij/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /zakończ/i })).not.toBeInTheDocument();
    });
  });

  describe('zajęcia odwołane', () => {
    beforeEach(() => {
      h.state.classes = [
        makeClass({
          status: 'CANCELLED',
          cancelReason: 'Choroba lektora',
          meetLink: 'https://meet.example.com/abc',
        }),
      ];
    });

    it('pokazują powód odwołania', () => {
      render(<TeacherClassesPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Wszystkie' }));

      expect(screen.getByText(/Choroba lektora/)).toBeInTheDocument();
    });

    it('nie oferują obecności ani linku do spotkania', () => {
      render(<TeacherClassesPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Wszystkie' }));

      expect(screen.queryByRole('button', { name: /obecność/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /dołącz/i })).not.toBeInTheDocument();
    });
  });

  describe('modal obecności', () => {
    it('otwiera się dla wybranych zajęć', () => {
      h.state.classes = [makeClass({ title: 'Niemiecki B2' })];
      render(<TeacherClassesPage />);

      expect(screen.queryByTestId('attendance-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /obecność/i }));

      const modal = screen.getByTestId('attendance-modal');
      expect(within(modal).getByText('Niemiecki B2')).toBeInTheDocument();
    });
  });

  describe('stan pusty', () => {
    it('informuje o braku nadchodzących zajęć', () => {
      h.state.classes = [];
      render(<TeacherClassesPage />);

      expect(screen.getByText('Brak nadchodzących zajęć.')).toBeInTheDocument();
    });
  });

  it('pokazuje link do spotkania, gdy zajęcia go mają', () => {
    h.state.classes = [makeClass({ meetLink: 'https://meet.example.com/xyz' })];
    render(<TeacherClassesPage />);

    const link = screen.getByRole('link', { name: /dołącz/i });
    expect(link).toHaveAttribute('href', 'https://meet.example.com/xyz');
  });
});
