import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { useResetPassword } from '@/hooks/useRegister';

const EASE = [0.16, 1, 0.3, 1] as const;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isPending, isSuccess, error } = useResetPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    mutate({ token, password });
  };

  // Po sukcesie przekieruj do logowania
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => navigate('/login'), 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  const apiError = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  const tokenInvalid = apiError === 'INVALID_TOKEN' || apiError === 'TOKEN_EXPIRED';

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <GraduationCap className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <span className="text-white font-semibold tracking-tight text-lg">Academy</span>
        </div>

        {!token ? (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Brak tokenu</h1>
            <p className="text-zinc-400 text-sm mb-6">
              Link jest niekompletny. Poproś o nowy link resetujący.
            </p>
            <Link to="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Wyślij nowy link →
            </Link>
          </div>
        ) : isSuccess ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-xl font-bold text-white mb-2">Hasło zmienione!</h1>
            <p className="text-zinc-400 text-sm">Za chwilę przekierujemy Cię do logowania…</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Ustaw nowe hasło</h1>
            <p className="text-zinc-400 text-sm mb-8">
              Wpisz nowe hasło dla swojego konta (min. 8 znaków).
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nowe hasło</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 znaków"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {tokenInvalid && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  Link jest nieprawidłowy lub wygasł.{' '}
                  <Link to="/forgot-password" className="underline hover:text-red-300">
                    Wyślij nowy
                  </Link>
                  .
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors duration-150 active:scale-[0.99] mt-2"
              >
                {isPending ? 'Zapisywanie...' : 'Ustaw nowe hasło'}
                {!isPending && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
