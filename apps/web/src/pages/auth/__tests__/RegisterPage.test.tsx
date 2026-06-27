import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';

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
  useRegister: () => ({ mutate: mockMutate, isPending: mockIsPending, error: mockError }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const renderPage = () => render(<MemoryRouter><RegisterPage /></MemoryRouter>);

const populateForm = () => {
  fireEvent.change(screen.getByPlaceholderText('Jan'), { target: { value: 'Jan' } });
  fireEvent.change(screen.getByPlaceholderText('Kowalski'), { target: { value: 'Kowalski' } });
  fireEvent.change(screen.getByPlaceholderText('jan@example.com'), {
    target: { value: 'jan@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('Min. 8 znaków'), {
    target: { value: 'Password1!' },
  });
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockError = null;
    mockIsPending = false;
  });

  it('renders registration form', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Załóż konto' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Jan')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Kowalski')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('jan@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Min. 8 znaków')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /załóż konto/i })).toBeInTheDocument();
  });

  it('defaults to "student" account type', () => {
    renderPage();
    const studentCard = screen.getByText('Uczeń dorosły').closest('button')!;
    expect(studentCard).toHaveClass('border-violet-500');
  });

  it('switches to parent account type on click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Rodzic').closest('button')!);
    const parentCard = screen.getByText('Rodzic').closest('button')!;
    expect(parentCard).toHaveClass('border-violet-500');
  });

  it('shows parent info box when parent type is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Rodzic').closest('button')!);
    expect(screen.getByText(/Jako rodzic/i)).toBeInTheDocument();
  });

  it('hides parent info box when student type is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Rodzic').closest('button')!);
    await user.click(screen.getByText('Uczeń dorosły').closest('button')!);
    expect(screen.queryByText(/Jako rodzic/i)).not.toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderPage();
    const input = screen.getByPlaceholderText('Min. 8 znaków');
    expect(input).toHaveAttribute('type', 'password');
    const toggleBtn = input.parentElement!.querySelector('button[type="button"]')!;
    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('calls register mutation with correct payload on submit', () => {
    renderPage();
    populateForm();
    fireEvent.submit(screen.getByRole('button', { name: /załóż konto/i }).closest('form')!);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'jan@example.com',
        password: 'Password1!',
        accountType: 'student',
      }),
      expect.any(Object),
    );
  });

  it('calls register with parent accountType when parent selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Rodzic').closest('button')!);
    populateForm();
    fireEvent.submit(screen.getByRole('button', { name: /załóż konto/i }).closest('form')!);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ accountType: 'parent' }),
      expect.any(Object),
    );
  });

  it('shows EMAIL_TAKEN error message', () => {
    mockError = { response: { data: { message: 'EMAIL_TAKEN' } } };
    renderPage();
    expect(screen.getByText('Ten adres email jest już zajęty.')).toBeInTheDocument();
  });

  it('shows generic error for unknown errors', () => {
    mockError = { response: { data: { message: 'SERVER_ERROR' } } };
    renderPage();
    expect(screen.getByText('Coś poszło nie tak. Spróbuj ponownie.')).toBeInTheDocument();
  });

  it('navigates to /verify-email with email state after successful registration', async () => {
    const capturedCallback: { onSuccess?: () => void } = {};
    mockMutate.mockImplementation((_data: unknown, opts: { onSuccess: () => void }) => {
      capturedCallback.onSuccess = opts.onSuccess;
    });

    renderPage();
    populateForm();
    fireEvent.submit(screen.getByRole('button', { name: /załóż konto/i }).closest('form')!);
    capturedCallback.onSuccess?.();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/verify-email',
        expect.objectContaining({ state: { email: 'jan@example.com' } }),
      );
    });
  });

  it('shows pending state during submission', () => {
    mockIsPending = true;
    renderPage();
    expect(screen.getByRole('button', { name: /tworzenie konta/i })).toBeDisabled();
  });

  it('has link to login page', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Zaloguj się' })).toHaveAttribute('href', '/login');
  });
});
