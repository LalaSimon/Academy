import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, ArrowRight, Users } from 'lucide-react';
import { useSetupChild } from '@/hooks/useRegister';
import { useAuthStore } from '@/store/auth.store';

const EASE = [0.16, 1, 0.3, 1] as const;

export function ParentSetupPage() {
  const navigate = useNavigate();
  const { mutate: setupChild, isPending, error } = useSetupChild();
  const { user, setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '' });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setupChild(form, {
      onSuccess: (child) => {
        if (user) setUser({ ...user, needsChildSetup: false });
        navigate('/parent/dashboard', {
          state: { childEmail: child.email, childName: `${child.firstName} ${child.lastName}` },
        });
      },
    });
  };

  const apiError = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  const errorMsg =
    apiError === 'CHILD_ALREADY_SET'
      ? 'Konto dziecka zostało już skonfigurowane.'
      : apiError
        ? 'Coś poszło nie tak. Spróbuj ponownie.'
        : null;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <GraduationCap className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-white font-semibold tracking-tight text-lg">Academy</span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Skonfiguruj konto dziecka</h1>
            <p className="text-zinc-500 text-sm">Krok jednorazowy</p>
          </div>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed mb-8 mt-4">
          Cześć, <strong className="text-zinc-200">{user?.firstName}</strong>! Podaj dane swojego dziecka.
          Stworzymy mu konto z loginiem w formacie <span className="text-violet-400 font-mono text-xs">imie.nazwisko@academy.pl</span> — będzie się nim logować samodzielnie.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Imię dziecka</label>
              <input
                required
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="Jan"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nazwisko dziecka</label>
              <input
                required
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Kowalski"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Hasło dla dziecka
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={form.password}
                onChange={set('password')}
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
            <p className="text-xs text-zinc-600 mt-1.5">
              Zapamiętaj to hasło — dziecko będzie go używać do logowania.
            </p>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors duration-150 active:scale-[0.99] mt-2"
          >
            {isPending ? 'Tworzenie konta...' : 'Utwórz konto dziecka'}
            {!isPending && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
