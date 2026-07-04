import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { useForgotPassword } from '@/hooks/useRegister';

const EASE = [0.16, 1, 0.3, 1] as const;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const { mutate, isPending, isSuccess } = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(email);
  };

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

        {isSuccess ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-xl font-bold text-white mb-2">Sprawdź swoją skrzynkę</h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              Jeśli konto dla <strong className="text-zinc-200">{email}</strong> istnieje,
              wysłaliśmy link do resetu hasła. Link wygasa po godzinie.
            </p>
            <Link to="/login" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              ← Wróć do logowania
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Reset hasła</h1>
            <p className="text-zinc-400 text-sm mb-8">
              Podaj adres email, a wyślemy Ci link do ustawienia nowego hasła.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Adres email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jan@example.com"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors duration-150 active:scale-[0.99] mt-2"
              >
                {isPending ? 'Wysyłanie...' : 'Wyślij link resetujący'}
                {!isPending && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
              <Link to="/login" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                ← Wróć do logowania
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
