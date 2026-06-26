import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ParentSetupPage } from '../ParentSetupPage';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('framer-motion', () => {
  const cache: Record<string, unknown> = {};
  return {
    motion: new Proxy({}, {
      get: (_t: object, tag: string) => {
        if (!cache[tag]) {
          const Tag = tag as keyof JSX.IntrinsicElements;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cache[tag] = ({ children, initial: _i, animate: _a, exit: _e, transition: _tr, variants: _v, whileHover: _wh, whileTap: _wt, layout: _l, layoutId: _lid, ...rest }: any) =>
            <Tag {...rest}>{children}</Tag>;
        }
        return cache[tag];
      },
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

const mockMutate = vi.fn();
let mockError: unknown = null;
let mockIsPending = false;

vi.mock('@/hooks/useRegister', () => ({
  useSetupChild: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
    error: mockError,
  }),
}));

const mockSetUser = vi.fn();
const mockUser = {
  id: 'parent-1',
  email: 'parent@example.com',
  role: 'PARENT',
  firstName: 'Anna',
  lastName: 'Rodzic',
  isMinor: false,
  needsChildSetup: true,
};

vi.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    user: mockUser,
    setUser: mockSetUser,
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const renderPage = () => render(<MemoryRouter><ParentSetupPage /></MemoryRouter>);

const populateForm = (firstName = 'Maks', lastName = 'Nowak', password = 'ChildPass1!') => {
  fireEvent.change(screen.getByPlaceholderText('Jan'), { target: { value: firstName } });
  fireEvent.change(screen.getByPlaceholderText('Kowalski'), { target: { value: lastName } });
  fireEvent.change(screen.getByPlaceholderText('Min. 8 znaków'), { target: { value: password } });
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ParentSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockError = null;
    mockIsPending = false;
  });

  it('renders setup form with parent first name', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Skonfiguruj konto dziecka' })).toBeInTheDocument();
    expect(screen.getByText(/Anna/)).toBeInTheDocument();
  });

  it('shows child email format hint', () => {
    renderPage();
    expect(screen.getByText(/imie\.nazwisko@academy\.pl/i)).toBeInTheDocument();
  });

  it('renders input fields for child data', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Jan')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Kowalski')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Min. 8 znaków')).toBeInTheDocument();
  });

  it('calls setupChild mutation with form data on submit', () => {
    renderPage();
    populateForm();
    fireEvent.submit(screen.getByPlaceholderText('Jan').closest('form')!);

    expect(mockMutate).toHaveBeenCalledWith(
      { firstName: 'Maks', lastName: 'Nowak', password: 'ChildPass1!' },
      expect.any(Object),
    );
  });

  it('toggles child password visibility', () => {
    renderPage();
    const input = screen.getByPlaceholderText('Min. 8 znaków');
    expect(input).toHaveAttribute('type', 'password');
    const toggleBtn = input.parentElement!.querySelector('button[type="button"]')!;
    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('updates store and navigates to parent dashboard on success', async () => {
    const capturedCallback: { onSuccess?: (data: unknown) => void } = {};
    mockMutate.mockImplementation(
      (_data: unknown, opts: { onSuccess: (d: unknown) => void }) => {
        capturedCallback.onSuccess = opts.onSuccess;
      },
    );

    renderPage();
    populateForm();
    fireEvent.submit(screen.getByPlaceholderText('Jan').closest('form')!);

    capturedCallback.onSuccess?.({
      id: 'child-1',
      email: 'maks.nowak@academy.pl',
      firstName: 'Maks',
      lastName: 'Nowak',
    });

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ needsChildSetup: false }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        '/parent/dashboard',
        expect.objectContaining({
          state: { childEmail: 'maks.nowak@academy.pl', childName: 'Maks Nowak' },
        }),
      );
    });
  });

  it('shows CHILD_ALREADY_SET error message', () => {
    mockError = { response: { data: { message: 'CHILD_ALREADY_SET' } } };
    renderPage();
    expect(screen.getByText('Konto dziecka zostało już skonfigurowane.')).toBeInTheDocument();
  });

  it('shows generic error message for unknown API errors', () => {
    mockError = { response: { data: { message: 'UNKNOWN_ERROR' } } };
    renderPage();
    expect(screen.getByText('Coś poszło nie tak. Spróbuj ponownie.')).toBeInTheDocument();
  });

  it('disables submit button while pending', () => {
    mockIsPending = true;
    renderPage();
    expect(screen.getByRole('button', { name: /tworzenie konta/i })).toBeDisabled();
  });
});
