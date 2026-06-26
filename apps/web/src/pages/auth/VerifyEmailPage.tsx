import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useVerifyEmail, useResendVerification } from '@/hooks/useRegister';

const EASE = [0.16, 1, 0.3, 1] as const;

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = params.get('token');
  const email = (location.state as { email?: string } | null)?.email ?? '';

  const { mutate: verify, isPending, isSuccess, isError } = useVerifyEmail();
  const { mutate: resend, isPending: resending, isSuccess: resent } = useResendVerification();
  const verified = useRef(false);

  useEffect(() => {
    if (token && !verified.current) {
      verified.current = true;
      verify(token, {
        onSuccess: () => setTimeout(() => navigate('/login'), 2500),
      });
    }
  }, [token, verify, navigate]);

  // — State: token present → verify flow
  if (token) {
    return (
      <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-sm text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <GraduationCap className="w-4.5 h-4.5 text-white" strokeWidth={2} />
            </div>
            <span className="text-white font-semibold tracking-tight text-lg">Academy</span>
          </div>

          {isPending && (
            <>
              <Loader className="w-10 h-10 text-violet-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-white mb-2">Weryfikacja...</h2>
              <p className="text-zinc-400 text-sm">Potwierdzamy Twój adres email.</p>
            </>
          )}

          {isSuccess && (
            <>
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">Email potwierdzony!</h2>
              <p className="text-zinc-400 text-sm">Za chwilę zostaniesz przekierowany do logowania…</p>
            </>
          )}

          {isError && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Link nieprawidłowy lub wygasł</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Wróć do strony rejestracji i wyślij nowy link weryfikacyjny.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Przejdź do logowania
              </Link>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // — State: no token → "check your inbox" screen
  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-sm text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <GraduationCap className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-white font-semibold tracking-tight text-lg">Academy</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-violet-400" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Sprawdź swoją skrzynkę</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Wysłaliśmy link weryfikacyjny na{' '}
          {email ? <strong className="text-zinc-200">{email}</strong> : 'Twój adres email'}.
          Link wygasa po <strong className="text-zinc-200">24 godzinach</strong>.
        </p>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-left mb-6">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Nie widzisz emaila? Sprawdź folder <strong className="text-zinc-200">spam</strong> lub kliknij poniżej, żeby wysłać ponownie.
          </p>
        </div>

        {resent ? (
          <p className="text-sm text-emerald-400">Link wysłany ponownie!</p>
        ) : (
          <button
            onClick={() => email && resend(email)}
            disabled={resending || !email}
            className="text-sm text-violet-400 hover:text-violet-300 disabled:opacity-40 transition-colors"
          >
            {resending ? 'Wysyłanie...' : 'Wyślij link ponownie'}
          </button>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-800">
          <Link to="/login" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Wróć do logowania
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
