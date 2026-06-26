import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VerifyEmailPage } from '../VerifyEmailPage';

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

const mockVerify = vi.fn();
const mockResend = vi.fn();

// State that can be overridden per test
let verifyState = { isPending: false, isSuccess: false, isError: false };
let resendState = { isPending: false, isSuccess: false };

vi.mock('@/hooks/useRegister', () => ({
  useVerifyEmail: () => ({ mutate: mockVerify, ...verifyState }),
  useResendVerification: () => ({ mutate: mockResend, ...resendState }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const renderAtPath = (search: string, state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/verify-email', search, state }]}
    >
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// ── Tests ──────────────────────────────────────────────────────────────────

describe('VerifyEmailPage — no token (inbox prompt)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyState = { isPending: false, isSuccess: false, isError: false };
    resendState = { isPending: false, isSuccess: false };
  });

  it('shows "check inbox" screen when no token in URL', () => {
    renderAtPath('', { email: 'jan@example.com' });
    expect(screen.getByRole('heading', { name: 'Sprawdź swoją skrzynkę' })).toBeInTheDocument();
    expect(screen.getByText('jan@example.com')).toBeInTheDocument();
  });

  it('shows generic text when no email in state', () => {
    renderAtPath('');
    expect(screen.getByText(/Twój adres email/i)).toBeInTheDocument();
  });

  it('calls resend when button clicked', async () => {
    const user = userEvent.setup();
    renderAtPath('', { email: 'jan@example.com' });
    await user.click(screen.getByRole('button', { name: /wyślij link ponownie/i }));
    expect(mockResend).toHaveBeenCalledWith('jan@example.com');
  });

  it('resend button is disabled when no email in state', () => {
    renderAtPath('');
    expect(screen.getByRole('button', { name: /wyślij link ponownie/i })).toBeDisabled();
  });

  it('has back to login link', () => {
    renderAtPath('');
    expect(screen.getByRole('link', { name: /wróć do logowania/i })).toHaveAttribute('href', '/login');
  });

  it('shows "link sent" after successful resend', () => {
    resendState = { isPending: false, isSuccess: true };
    renderAtPath('', { email: 'jan@example.com' });
    expect(screen.getByText('Link wysłany ponownie!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /wyślij link/i })).not.toBeInTheDocument();
  });
});

describe('VerifyEmailPage — with token (verification flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyState = { isPending: false, isSuccess: false, isError: false };
  });

  it('calls verify mutation with token from URL', () => {
    renderAtPath('?token=abc123');
    expect(mockVerify).toHaveBeenCalledWith('abc123', expect.any(Object));
  });

  it('does not call verify twice (StrictMode guard)', () => {
    renderAtPath('?token=abc123');
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it('shows loading state while verifying', () => {
    verifyState = { isPending: true, isSuccess: false, isError: false };
    renderAtPath('?token=abc');
    expect(screen.getByText('Weryfikacja...')).toBeInTheDocument();
  });

  it('shows success state after verification', () => {
    verifyState = { isPending: false, isSuccess: true, isError: false };
    renderAtPath('?token=abc');
    expect(screen.getByText('Email potwierdzony!')).toBeInTheDocument();
    expect(screen.getByText(/Za chwilę zostaniesz przekierowany/i)).toBeInTheDocument();
  });

  it('shows error state for invalid token', () => {
    verifyState = { isPending: false, isSuccess: false, isError: true };
    renderAtPath('?token=bad-token');
    expect(screen.getByText('Link nieprawidłowy lub wygasł')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Przejdź do logowania' })).toBeInTheDocument();
  });

  it('navigates to /login after successful verification (2500ms delay)', () => {
    vi.useFakeTimers();
    const capturedCallback: { onSuccess?: () => void } = {};
    mockVerify.mockImplementation((_token: unknown, opts: { onSuccess: () => void }) => {
      capturedCallback.onSuccess = opts.onSuccess;
    });

    renderAtPath('?token=abc');

    act(() => {
      capturedCallback.onSuccess?.();
      vi.advanceTimersByTime(2500);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login');
    vi.useRealTimers();
  });
});
