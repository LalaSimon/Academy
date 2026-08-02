import React from 'react';
import { render, screen } from '@testing-library/react';
import { TodaySchedule } from '../TodaySchedule';
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
  materials: {} as Record<string, unknown[]>,
  lastArg: [] as string[],
}));

vi.mock('@/hooks/useMaterials', () => ({
  useClassesMaterials: (ids: string[]) => {
    h.lastArg = ids;
    return { data: h.materials };
  },
}));

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));

// ── Fixtures ───────────────────────────────────────────────────────────────

const NOW = new Date('2026-09-10T09:00:00.000Z');

function makeClass(over: Partial<Class> = {}): Class {
  return {
    id: 'c1',
    title: 'Angielski B2',
    description: null,
    scheduledAt: '2026-09-10T17:00:00.000Z',
    durationMin: 60,
    meetLink: null,
    status: 'SCHEDULED',
    cancelReason: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    group: null,
    student: null,
    teacher: null,
    batchId: null,
    _count: { attendances: 0 },
    ...over,
  };
}

describe('TodaySchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    h.materials = {};
    h.lastArg = [];
  });

  afterEach(() => vi.useRealTimers());

  describe('co trafia na listę', () => {
    it('pokazuje dzisiejsze zajęcia', () => {
      render(<TodaySchedule classes={[makeClass()]} />);
      expect(screen.getByText('Angielski B2')).toBeInTheDocument();
    });

    it('pomija zajęcia z innych dni', () => {
      render(
        <TodaySchedule
          classes={[makeClass({ scheduledAt: '2026-09-12T17:00:00.000Z' })]}
        />,
      );
      expect(screen.queryByText('Angielski B2')).not.toBeInTheDocument();
    });

    it('pomija zajęcia odwołane', () => {
      render(<TodaySchedule classes={[makeClass({ status: 'CANCELLED' })]} />);
      expect(screen.queryByText('Angielski B2')).not.toBeInTheDocument();
    });

    // Lekcja, która już się zaczęła, musi zostać — wtedy link jest najbardziej
    // potrzebny.
    it('zostawia zajęcia, które właśnie trwają', () => {
      render(
        <TodaySchedule
          classes={[
            makeClass({ scheduledAt: '2026-09-10T08:30:00.000Z', status: 'ONGOING' }),
          ]}
        />,
      );
      expect(screen.getByText('Angielski B2')).toBeInTheDocument();
      expect(screen.getByText('trwa')).toBeInTheDocument();
    });

    it('pomija minione zajęcia, które się nie odbywają', () => {
      render(
        <TodaySchedule
          classes={[makeClass({ scheduledAt: '2026-09-10T07:00:00.000Z' })]}
        />,
      );
      expect(screen.queryByText('Angielski B2')).not.toBeInTheDocument();
    });

    it('sortuje po godzinie rozpoczęcia', () => {
      render(
        <TodaySchedule
          classes={[
            makeClass({ id: 'late', title: 'Późne', scheduledAt: '2026-09-10T18:00:00.000Z' }),
            makeClass({ id: 'early', title: 'Wczesne', scheduledAt: '2026-09-10T10:00:00.000Z' }),
          ]}
        />,
      );
      const titles = screen.getAllByText(/Późne|Wczesne/).map((e) => e.textContent);
      expect(titles).toEqual(['Wczesne', 'Późne']);
    });

    it('informuje, gdy nie ma nic na dziś', () => {
      render(<TodaySchedule classes={[]} emptyText="Brak zajęć." />);
      expect(screen.getByText('Brak zajęć.')).toBeInTheDocument();
    });
  });

  describe('link do spotkania', () => {
    it('pokazuje „Dołącz", gdy lekcja ma link', () => {
      render(
        <TodaySchedule
          classes={[makeClass({ meetLink: 'https://meet.google.com/abc' })]}
        />,
      );
      expect(screen.getByRole('link', { name: /dołącz/i })).toHaveAttribute(
        'href',
        'https://meet.google.com/abc',
      );
    });

    it('nie pokazuje przycisku, gdy linku brak', () => {
      render(<TodaySchedule classes={[makeClass({ meetLink: null })]} />);
      expect(screen.queryByRole('link', { name: /dołącz/i })).not.toBeInTheDocument();
    });
  });

  describe('materiały', () => {
    // Sedno optymalizacji: JEDNO zapytanie dla wszystkich lekcji naraz.
    it('pyta o materiały wszystkich dzisiejszych lekcji jednym wywołaniem', () => {
      render(
        <TodaySchedule
          classes={[
            makeClass({ id: 'a', scheduledAt: '2026-09-10T10:00:00.000Z' }),
            makeClass({ id: 'b', scheduledAt: '2026-09-10T12:00:00.000Z' }),
          ]}
        />,
      );
      expect(h.lastArg).toEqual(['a', 'b']);
    });

    it('renderuje materiały przypięte do lekcji', () => {
      h.materials = {
        c1: [
          { id: 'm1', title: 'Ćwiczenia', type: 'LINK', url: 'https://x.pl', fileKey: null },
        ],
      };
      render(<TodaySchedule classes={[makeClass()]} />);

      expect(screen.getByText('Materiały na te zajęcia')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ćwiczenia/ })).toHaveAttribute(
        'href',
        'https://x.pl',
      );
    });

    it('plik renderuje jako przycisk pobierania, nie link', () => {
      h.materials = {
        c1: [
          { id: 'm2', title: 'Karta pracy.pdf', type: 'PDF', url: '/x', fileKey: 'k' },
        ],
      };
      render(<TodaySchedule classes={[makeClass()]} />);

      expect(screen.getByRole('button', { name: /Karta pracy/ })).toBeInTheDocument();
    });

    it('nie pokazuje sekcji materiałów, gdy lekcja ich nie ma', () => {
      h.materials = {};
      render(<TodaySchedule classes={[makeClass()]} />);
      expect(screen.queryByText('Materiały na te zajęcia')).not.toBeInTheDocument();
    });

    it('przypisuje materiały właściwej lekcji', () => {
      h.materials = {
        a: [{ id: 'm1', title: 'Tylko dla A', type: 'LINK', url: 'https://a.pl', fileKey: null }],
      };
      render(
        <TodaySchedule
          classes={[
            makeClass({ id: 'a', title: 'Lekcja A', scheduledAt: '2026-09-10T10:00:00.000Z' }),
            makeClass({ id: 'b', title: 'Lekcja B', scheduledAt: '2026-09-10T12:00:00.000Z' }),
          ]}
        />,
      );

      // Materiał należy do jednej lekcji, więc może pojawić się dokładnie raz —
      // gdyby mapowanie classId → materiały było błędne, trafiłby do obu kart.
      expect(screen.getAllByText('Tylko dla A')).toHaveLength(1);
      expect(screen.getAllByText('Materiały na te zajęcia')).toHaveLength(1);
    });
  });
});
