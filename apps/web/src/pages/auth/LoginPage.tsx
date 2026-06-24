import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-violet-500 rounded-2xl shadow-lg shadow-violet-200 mb-4"
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900">Witaj z powrotem!</h1>
            <p className="text-gray-500 mt-1">Zaloguj się do platformy Academy</p>
          </div>

          {/* Karta logowania */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Adres email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="jan@example.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-violet-400"
                    required
                    disabled={login.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Hasło
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-violet-400"
                    required
                    disabled={login.isPending}
                  />
                </div>
              </div>

              {login.isError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl"
                >
                  Nieprawidłowy email lub hasło
                </motion.p>
              )}

              <Button
                type="submit"
                disabled={login.isPending}
                className="w-full h-11 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-medium shadow-md shadow-violet-200 transition-all"
              >
                {login.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Zaloguj się'
                )}
              </Button>
            </form>
          </motion.div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Nie masz konta? Skontaktuj się z administratorem szkoły.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
