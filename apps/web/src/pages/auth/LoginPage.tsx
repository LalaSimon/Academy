import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useLogin } from '@/hooks/useAuth';

const EASE = [0.16, 1, 0.3, 1] as const;

export function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUnverifiedEmail('');
    login.mutate(
      { email, password },
      {
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message;
          if (msg === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(email);
        },
      },
    );
  };

  const isUnverified = unverifiedEmail !== '';

  const errorMsg = login.isError && !isUnverified
    ? 'Nieprawidłowy email lub hasło.'
    : null;

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

        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Zaloguj się</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Nie masz konta?{' '}
          <Link to="/register" className="text-violet-400 hover:text-violet-300 transition-colors">
            Zarejestruj się
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Adres email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-400">Hasło</label>
              <Link
                to="/forgot-password"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Zapomniałeś hasła?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <AnimatePresence mode="wait">
            {isUnverified && (
              <motion.div
                key="unverified"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-amber-400 mb-2">
                    Adres email nie został jeszcze potwierdzony.
                  </p>
                  <Link
                    to="/verify-email"
                    state={{ email: unverifiedEmail }}
                    className="text-xs text-amber-300 hover:text-amber-200 transition-colors underline"
                  >
                    Wyślij link weryfikacyjny ponownie →
                  </Link>
                </div>
              </motion.div>
            )}
            {errorMsg && (
              <motion.p
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 overflow-hidden"
              >
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors duration-150 active:scale-[0.99] mt-2"
          >
            {login.isPending ? 'Logowanie...' : 'Zaloguj się'}
            {!login.isPending && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
