import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, User, Users, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useRegister } from '@/hooks/useRegister';

type AccountType = 'student' | 'parent';

const EASE = [0.16, 1, 0.3, 1] as const;

export function RegisterPage() {
  const navigate = useNavigate();
  const { mutate: register, isPending, error } = useRegister();

  const [accountType, setAccountType] = useState<AccountType>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(
      { ...form, accountType },
      {
        onSuccess: () =>
          navigate('/verify-email', { state: { email: form.email } }),
      },
    );
  };

  const apiError = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;

  const errorMsg =
    apiError === 'EMAIL_TAKEN'
      ? 'Ten adres email jest już zajęty.'
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
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <GraduationCap className="w-4.5 h-4.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-white font-semibold tracking-tight text-lg">Academy</span>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Załóż konto</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Masz już konto?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
            Zaloguj się
          </Link>
        </p>

        {/* Account type selector */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {([
            { type: 'student' as const, icon: User, label: 'Uczeń dorosły', sub: 'Rejestruję siebie' },
            { type: 'parent' as const, icon: Users, label: 'Rodzic', sub: 'Mam niepełnoletnie dziecko' },
          ] as const).map(({ type, icon: Icon, label, sub }) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={`relative p-4 rounded-xl border text-left transition-all duration-150 ${
                accountType === type
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
              }`}
            >
              {accountType === type && (
                <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
              )}
              <Icon className={`w-5 h-5 mb-2 ${accountType === type ? 'text-violet-400' : 'text-zinc-500'}`} strokeWidth={1.5} />
              <p className={`text-sm font-semibold ${accountType === type ? 'text-white' : 'text-zinc-300'}`}>{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Imię</label>
              <input
                required
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="Jan"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nazwisko</label>
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
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Adres email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={set('email')}
              placeholder="jan@example.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Telefon <span className="text-zinc-600">(opcjonalnie)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+48 123 456 789"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Hasło</label>
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
          </div>

          <AnimatePresence>
            {accountType === 'parent' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <span className="text-violet-400 font-medium">Jako rodzic</span> — po weryfikacji emaila i pierwszym logowaniu poprosisz o dane dziecka i skonfigurujesz mu konto. Dziecko będzie logować się osobnymi danymi.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {errorMsg && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
              >
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors duration-150 active:scale-[0.99] mt-2"
          >
            {isPending ? 'Tworzenie konta...' : 'Załóż konto'}
            {!isPending && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
          </button>
        </form>

        <p className="text-xs text-zinc-600 text-center mt-6 leading-relaxed">
          Zakładając konto, akceptujesz warunki korzystania z usługi.
          Po rejestracji skontaktujemy się w sprawie grupy i harmonogramu.
        </p>
      </motion.div>
    </div>
  );
}
