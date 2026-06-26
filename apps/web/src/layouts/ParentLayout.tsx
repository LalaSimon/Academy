import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
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
  Users,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { useThemeStore } from '@/store/theme.store';
import { useParentProfile } from '@/hooks/useParentProfile';

const CHILD_NAV = [
  { to: 'classes', label: 'Zajęcia', icon: Calendar },
  { to: 'attendance', label: 'Frekwencja', icon: ClipboardList },
  { to: 'groups', label: 'Grupy', icon: BookOpen },
  { to: 'materials', label: 'Materiały', icon: FolderOpen },
  { to: 'payments', label: 'Płatności', icon: CreditCard },
];

function ChildNav({ childId }: { childId: string }) {
  return (
    <div className="space-y-0.5">
      {CHILD_NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={`/parent/children/${childId}/${to}`} className="block">
          {({ isActive }) => (
            <div
              className={`relative flex items-center gap-3 px-3 py-[8px] pl-8 rounded-xl text-[13px] font-medium transition-colors duration-150 group cursor-pointer ${
                isActive
                  ? 'text-violet-600 dark:text-violet-300'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="parent-child-nav-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(139,92,246,0.08)' }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.38 }}
                />
              )}
              <Icon className={`relative z-10 w-[13px] h-[13px] flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-muted-foreground group-hover:text-foreground'}`} />
              <span className="relative z-10">{label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function ParentLayout() {
  const { user } = useAuthStore();
  const { data: profile } = useParentProfile();
  const logout = useLogout();
  const location = useLocation();
  const { isDark, toggle } = useThemeStore();
  const params = useParams<{ childId?: string }>();
  const activeChildId = params.childId;

  const children = profile?.asParent?.map((p) => p.student) ?? [];

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
        className="w-[220px] flex-shrink-0 flex flex-col border-r border-border h-screen sticky top-0 overflow-y-auto"
        style={{ background: 'var(--sidebar)' }}
      >
        {/* Logo */}
        <div className="px-5 py-[18px] border-b border-border flex-shrink-0">
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
        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* Dashboard link */}
          <NavLink to="/parent/dashboard" className="block">
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
                    layoutId="parent-nav-bg"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: isDark ? 'rgba(139,92,246,0.14)' : 'rgba(139,92,246,0.08)' }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.38 }}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="parent-nav-bar"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full"
                    style={{ background: 'linear-gradient(to bottom, #a78bfa, #818cf8)' }}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.38 }}
                  />
                )}
                <LayoutDashboard className={`relative z-10 w-[15px] h-[15px] flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span className="relative z-10">Dashboard</span>
              </div>
            )}
          </NavLink>

          {/* Children section */}
          <div className="pt-2">
            <div className="flex items-center gap-2 px-3 mb-1">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Moje dzieci</span>
            </div>
            {children.length === 0 && (
              <p className="px-3 py-2 text-[12px] text-muted-foreground">Brak przypisanych dzieci</p>
            )}
            {children.map((child) => (
              <div key={child.id} className="space-y-0.5">
                <NavLink to={`/parent/children/${child.id}/classes`} className="block">
                  {({ isActive: _ia }) => {
                    const isChildActive = activeChildId === child.id;
                    return (
                      <div
                        className={`flex items-center gap-2 px-3 py-[8px] rounded-xl text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
                          isChildActive
                            ? 'text-foreground bg-accent'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                        >
                          {child.firstName[0]}{child.lastName[0]}
                        </div>
                        <span className="flex-1 truncate">{child.firstName} {child.lastName}</span>
                        <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isChildActive ? 'rotate-90' : ''}`} />
                      </div>
                    );
                  }}
                </NavLink>
                {activeChildId === child.id && <ChildNav childId={child.id} />}
              </div>
            ))}
          </div>
        </nav>

        {/* Theme toggle + User + Logout */}
        <div className="px-3 py-4 border-t border-border space-y-1 flex-shrink-0">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="flex">
                  <Sun className="w-3.5 h-3.5" />
                </motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }} className="flex">
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
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{user?.firstName} {user?.lastName}</p>
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
