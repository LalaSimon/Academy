import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TeacherGroupDetailPage } from '../TeacherGroupDetailPage';
import type { GroupDetail } from '@/hooks/useGroups';

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

vi.mock('@/components/materials/MaterialsPanel', () => ({
  MaterialsPanel: ({ assigned }: { assigned: { id: string }[] }) => (
    <div data-testid="materials-panel">materiałów: {assigned.length}</div>
  ),
}));

const h = vi.hoisted(() => ({
  state: {
    group: undefined as unknown,
    isLoading: false,
    isError: false,
    materials: [] as unknown[],
  },
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroup: () => ({
    data: h.state.group,
    isLoading: h.state.isLoading,
    isError: h.state.isError,
  }),
}));

vi.mock('@/hooks/useMaterials', () => ({
  useGroupMaterials: () => ({ data: h.state.materials }),
  useAssignMaterialToGroup: () => ({ mutate: vi.fn() }),
  useUnassignMaterialFromGroup: () => ({ mutate: vi.fn(), isPending: false }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeGroup(over: Partial<GroupDetail> = {}): GroupDetail {
  return {
    id: 'g1',
    name: 'Angielski B2',
    description: null,
    language: 'EN',
    level: 'B2',
    maxStudents: 10,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    teacher: { id: 't1', firstName: 'Anna', lastName: 'Kowalska' },
    _count: { students: 2 },
    schedules: [],
    students: [
      {
        id: 'gs1',
        joinedAt: '2026-01-02T00:00:00.000Z',
        student: { id: 's1', firstName: 'Jan', lastName: 'Nowak', email: 'jan@test.pl' },
      },
      {
        id: 'gs2',
        joinedAt: '2026-01-03T00:00:00.000Z',
        student: { id: 's2', firstName: 'Ewa', lastName: 'Wójcik', email: 'ewa@test.pl' },
      },
    ],
    ...over,
  } as GroupDetail;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/teacher/groups/g1']}>
      <Routes>
        <Route path="/teacher/groups/:groupId" element={<TeacherGroupDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeacherGroupDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.state = { group: undefined, isLoading: false, isError: false, materials: [] };
  });

  it('pokazuje listę uczniów grupy', () => {
    h.state.group = makeGroup();
    renderPage();

    expect(screen.getByText('Jan Nowak')).toBeInTheDocument();
    expect(screen.getByText('Ewa Wójcik')).toBeInTheDocument();
    expect(screen.getByText('jan@test.pl')).toBeInTheDocument();
  });

  it('pokazuje licznik uczniów wobec limitu', () => {
    h.state.group = makeGroup({ maxStudents: 10 });
    renderPage();
    expect(screen.getByText('2 / 10')).toBeInTheDocument();
  });

  it('informuje, gdy grupa jest pusta', () => {
    h.state.group = makeGroup({ students: [] });
    renderPage();
    expect(
      screen.getByText('Do tej grupy nie zapisano jeszcze żadnego ucznia.'),
    ).toBeInTheDocument();
  });

  it('renderuje harmonogram z nazwą dnia', () => {
    h.state.group = makeGroup({
      schedules: [
        {
          id: 'sch1',
          dayOfWeek: 1,
          startTime: '17:00',
          durationMin: 60,
          pricePerClass: '80.00',
          effectiveFrom: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    renderPage();
    expect(screen.getByText(/Poniedziałek 17:00 · 60 min/)).toBeInTheDocument();
  });

  it('przekazuje materiały grupy do panelu', () => {
    h.state.group = makeGroup();
    h.state.materials = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }];
    renderPage();
    expect(screen.getByTestId('materials-panel')).toHaveTextContent('materiałów: 3');
  });

  // Backend zwraca 403 na cudzą grupę — strona nie może pokazać pustego szkieletu,
  // tylko czytelny komunikat.
  it('pokazuje komunikat, gdy backend odmówi dostępu', () => {
    h.state.isError = true;
    renderPage();

    expect(
      screen.getByText('Nie masz dostępu do tej grupy albo ona nie istnieje.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('materials-panel')).not.toBeInTheDocument();
  });

  it('pokazuje stan ładowania', () => {
    h.state.isLoading = true;
    renderPage();
    expect(screen.getByText('Ładowanie…')).toBeInTheDocument();
  });
});
