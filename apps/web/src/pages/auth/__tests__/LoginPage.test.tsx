import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

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

vi.mock('@/hooks/useAuth', () => ({
  useLogin: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
    isError: Boolean(mockError),
    error: mockError,
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const renderPage = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

const submitForm = (email = 'jan@example.com', password = 'Password1!') => {
  fireEvent.change(screen.getByPlaceholderText('jan@example.com'), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: password } });
  fireEvent.submit(screen.getByPlaceholderText('jan@example.com').closest('form')!);
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockError = null;
    mockIsPending = false;
  });

  it('renders login form', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Zaloguj się' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('jan@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zaloguj się/i })).toBeInTheDocument();
  });

  it('has link to register page', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Zarejestruj się' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('calls login mutation with credentials on submit', () => {
    renderPage();
    submitForm('jan@example.com', 'Password1!');

    expect(mockMutate).toHaveBeenCalledWith(
      { email: 'jan@example.com', password: 'Password1!' },
      expect.any(Object),
    );
  });

  it('toggles password visibility', () => {
    renderPage();
    const input = screen.getByPlaceholderText('••••••••');
    expect(input).toHaveAttribute('type', 'password');
    const toggleBtn = input.parentElement!.querySelector('button[type="button"]')!;
    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('shows generic error message on invalid credentials', () => {
    mockError = { response: { data: { message: 'INVALID_CREDENTIALS' } } };
    renderPage();
    expect(screen.getByText('Nieprawidłowy email lub hasło.')).toBeInTheDocument();
  });

  it('shows EMAIL_NOT_VERIFIED warning with resend link', async () => {
    const capturedCallback: { onError?: (err: unknown) => void } = {};
    mockMutate.mockImplementation(
      (_data: unknown, opts: { onError: (e: unknown) => void }) => {
        capturedCallback.onError = opts.onError;
      },
    );

    renderPage();
    submitForm('unverified@example.com');

    await act(async () => {
      capturedCallback.onError?.({ response: { data: { message: 'EMAIL_NOT_VERIFIED' } } });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Adres email nie został jeszcze potwierdzony/i),
      ).toBeInTheDocument();
    });

    const resendLink = screen.getByRole('link', { name: /wyślij link weryfikacyjny/i });
    expect(resendLink).toHaveAttribute('href', '/verify-email');
  });

  it('does not show generic error when EMAIL_NOT_VERIFIED', async () => {
    const capturedCallback: { onError?: (err: unknown) => void } = {};
    mockMutate.mockImplementation(
      (_data: unknown, opts: { onError: (e: unknown) => void }) => {
        capturedCallback.onError = opts.onError;
      },
    );

    renderPage();
    submitForm('test@test.com');

    await act(async () => {
      capturedCallback.onError?.({ response: { data: { message: 'EMAIL_NOT_VERIFIED' } } });
    });

    await waitFor(() => {
      expect(screen.queryByText('Nieprawidłowy email lub hasło.')).not.toBeInTheDocument();
    });
  });

  it('shows loading state while pending', () => {
    mockIsPending = true;
    renderPage();
    expect(screen.getByRole('button', { name: /logowanie/i })).toBeDisabled();
  });
});
