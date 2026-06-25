import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  BookOpen,
  FolderOpen,
  CreditCard,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { useThemeStore } from '@/store/theme.store';

const NAV_ITEMS = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/classes', label: 'Moje zajęcia', icon: Calendar },
  { to: '/student/attendance', label: 'Frekwencja', icon: ClipboardList },
  { to: '/student/groups', label: 'Moje grupy', icon: BookOpen },
  { to: '/student/materials', label: 'Materiały', icon: FolderOpen },
  { to: '/student/payments', label: 'Płatności', icon: CreditCard },
];

export function StudentLayout() {
  const { user } = useAuthStore();
  const logout = useLogout();
  const location = useLocation();
  const { isDark, toggle } = useThemeStore();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [isDark]);

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className="w-[220px] flex-shrink-0 flex flex-col border-r border-border h-screen sticky top-0"
        style={{ background: 'var(--sidebar)' }}
      >
        {/* Logo */}
        <div className="px-5 py-[18px] border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                boxShadow: isDark ? '0 0 16px rgba(139,92,246,0.35)' : '0 0 12px rgba(139,92,246,0.2)',
              }}
            >
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground tracking-tight text-[15px]">Academy</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="block">
              {({ isActive }) => (
                <div
                  className={`relative flex items-center gap-3 px-3 py-[9px] rounded-xl text-[13.5px] font-medium transition-colors duration-150 group cursor-pointer ${
                    isActive
                      ? 'text-violet-600 dark:text-violet-300'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="student-nav-bg"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: isDark ? 'rgba(139,92,246,0.14)' : 'rgba(139,92,246,0.08)',
                      }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.38 }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="student-nav-bar"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full"
                      style={{ background: 'linear-gradient(to bottom, #a78bfa, #818cf8)' }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.38 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 w-[15px] h-[15px] flex-shrink-0 transition-colors ${
                      isActive
                        ? 'text-violet-500 dark:text-violet-400'
                        : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />
                  <span className="relative z-10">{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle + User + Logout */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.span
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  <Sun className="w-3.5 h-3.5" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex"
                >
                  <Moon className="w-3.5 h-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
            {isDark ? 'Tryb jasny' : 'Tryb ciemny'}
          </button>

          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => logout.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Wyloguj
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <AnimatePresence initial={false}>
          <motion.div
            key={location.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="p-8 max-w-5xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
