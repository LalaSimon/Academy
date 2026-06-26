import { useState, useEffect, useRef } from 'react';
import screenshotStudentDashboard from '@/assets/screenshots/student-dashboard.png';
import screenshotStudentClasses from '@/assets/screenshots/student-classes.png';
import screenshotStudentAttendance from '@/assets/screenshots/student-attendance.png';
import screenshotStudentMaterials from '@/assets/screenshots/student-materials.png';
import screenshotStudentPayments from '@/assets/screenshots/student-payments.png';
import screenshotStudentGroups from '@/assets/screenshots/student-groups.png';
import { Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
  useMotionValue,
  useTransform,
  useSpring,
  animate,
} from 'framer-motion';
import {
  Users,
  Clock,
  Video,
  BookOpen,
  Star,
  ArrowRight,
  ChevronDown,
  GraduationCap,
  CheckCircle,
  Menu,
  X,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────

const ROTATING_LANGUAGES = ['Angielskiego', 'Niemieckiego', 'Hiszpańskiego', 'Włoskiego', 'Francuskiego'];

const STATS = [
  { num: 500, suffix: '+', label: 'Aktywnych uczniów' },
  { num: 8,   suffix: '',  label: 'Języków w ofercie' },
  { num: 4,   suffix: '',  label: 'Lata na rynku' },
  { num: 97,  suffix: '%', label: 'Poleca nas znajomym' },
];

const STEPS = [
  {
    n: '01',
    title: 'Oceń swój poziom',
    body: 'Krótki test online lub rozmowa z lektorem. Dobieramy odpowiednią grupę lub plan indywidualny.',
    icon: GraduationCap,
  },
  {
    n: '02',
    title: 'Zarezerwuj miejsce',
    body: 'Wybierz godziny pasujące do Twojego harmonogramu. Zajęcia raz lub dwa razy w tygodniu.',
    icon: Clock,
  },
  {
    n: '03',
    title: 'Zacznij mówić',
    body: 'Pierwsza lekcja w ciągu tygodnia. Efekty widoczne już od pierwszego miesiąca nauki.',
    icon: CheckCircle,
  },
];

const LANGUAGES = [
  { name: 'Angielski',   greeting: 'Hello',      flagCode: 'gb', border: 'rgba(56,189,248,0.25)'  },
  { name: 'Niemecki',    greeting: 'Hallo',       flagCode: 'de', border: 'rgba(251,191,36,0.25)'  },
  { name: 'Hiszpanski',  greeting: 'Hola',        flagCode: 'es', border: 'rgba(239,68,68,0.25)'   },
  { name: 'Wloski',      greeting: 'Ciao',        flagCode: 'it', border: 'rgba(74,222,128,0.25)'  },
  { name: 'Francuski',   greeting: 'Bonjour',     flagCode: 'fr', border: 'rgba(96,165,250,0.25)'  },
  { name: 'Portugalski', greeting: 'Olá',         flagCode: 'pt', border: 'rgba(52,211,153,0.25)'  },
  { name: 'Rosyjski',    greeting: 'Привет',      flagCode: 'ru', border: 'rgba(248,113,113,0.25)' },
  { name: 'Japonski',    greeting: 'こんにちは',  flagCode: 'jp', border: 'rgba(251,113,133,0.25)' },
];

const TEACHERS = [
  {
    name: 'Sarah K.',
    title: 'Lektor angielskiego',
    photo: 'https://picsum.photos/seed/teacher-sarah-british-woman/400/500',
    languages: [{ name: 'Angielski', flagCode: 'gb' }],
    levels: 'B1 – C2',
    experience: '9 lat',
    students: 134,
    cert: 'Cambridge CELTA',
    bio: 'Absolwentka Oxfordu. Specjalizuje sie w przygotowaniu do egzaminow Cambridge i IELTS.',
  },
  {
    name: 'Klaus M.',
    title: 'Lektor niemieckiego i hiszpanskiego',
    photo: 'https://picsum.photos/seed/teacher-klaus-german-male/400/500',
    languages: [
      { name: 'Niemecki', flagCode: 'de' },
      { name: 'Hiszpanski', flagCode: 'es' },
    ],
    levels: 'A1 – C1',
    experience: '11 lat',
    students: 89,
    cert: 'DSH / DELE B2',
    bio: 'Doktor lingwistyki z Berlina. Specjalizuje sie w jezyku biznesowym i konwersacjach.',
  },
  {
    name: 'Yuki T.',
    title: 'Lektor japonskiego',
    photo: 'https://picsum.photos/seed/teacher-yuki-japanese-woman/400/500',
    languages: [
      { name: 'Japonski', flagCode: 'jp' },
      { name: 'Angielski', flagCode: 'gb' },
    ],
    levels: 'A1 – B2',
    experience: '6 lat',
    students: 67,
    cert: 'JLPT N1',
    bio: 'Pochodzi z Tokio. Uczy jezyka mowionego, pisma i kultury japonskiej w naturalny sposob.',
  },
];

const FAQS = [
  {
    q: 'Jak przebiegaja zajecia online?',
    a: 'Zajecia odbywaja sie przez Google Meet lub Zoom. Przed zajęciami otrzymujesz link oraz materialy. Lekcje sa nagrywane, wiec mozesz wrocic do nich w dowolnym momencie.',
  },
  {
    q: 'Czy muszę miec doswiadczenie w nauce języka?',
    a: 'Nie. Przyjmujemy uczniow na wszystkich poziomach, od absolutnych poczatkujacych (A0) po zaawansowanych (C2). Przed pierwsza lekcja przeprowadzamy krotki test poziomujacy.',
  },
  {
    q: 'Co jezeli nie moge przyjsc na zajecia?',
    a: 'Zajecia sa nagrywane i dostepne w panelu ucznia przez 30 dni. Mozesz rowniez odrobić zajecia w innym terminie, jesli powiadomisz nas z 24-godzinnym wyprzedzeniem.',
  },
  {
    q: 'Ile kosztuja lekcje?',
    a: 'Ceny zaleza od języka, formatu (indywidualny / grupowy) i liczby zajec w miesiacu. Skontaktuj sie z nami lub zaloguj do panelu, aby zobaczyc aktualny cennik.',
  },
];

// ── Animation variants ──────────────────────────────────────────────────────

type BezierTuple = [number, number, number, number];
const EASE: BezierTuple = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};


// ── Nav ─────────────────────────────────────────────────────────────────────

function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-white font-semibold text-base tracking-tight">Academy</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['Oferta', 'Jak to dziala', 'Opinie', 'FAQ'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                className="text-zinc-400 hover:text-white text-sm transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-zinc-300 hover:text-white text-sm transition-colors duration-200"
            >
              Zaloguj sie
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors duration-200 active:scale-[0.98]"
            >
              Zacznij nauke
            </Link>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-zinc-950 border-b border-zinc-800 overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-4">
              {['Oferta', 'Jak to dziala', 'Opinie', 'FAQ'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  className="text-zinc-300 text-sm py-1"
                  onClick={() => setOpen(false)}
                >
                  {item}
                </a>
              ))}
              <Link
                to="/login"
                className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl text-center mt-2"
                onClick={() => setOpen(false)}
              >
                Zacznij nauke
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ── Orbital visual ───────────────────────────────────────────────────────────

type OrbitConfig = {
  code: string;
  label: string;
  initialAngle: number;
  radius: number;
  duration: number;
  direction: 1 | -1;
};

const INNER_RING: OrbitConfig[] = [
  { code: 'EN', label: 'English', initialAngle: 0, radius: 110, duration: 16, direction: 1 },
  { code: 'DE', label: 'Deutsch', initialAngle: 90, radius: 110, duration: 16, direction: 1 },
  { code: 'FR', label: 'Francais', initialAngle: 180, radius: 110, duration: 16, direction: 1 },
  { code: 'IT', label: 'Italiano', initialAngle: 270, radius: 110, duration: 16, direction: 1 },
];

const OUTER_RING: OrbitConfig[] = [
  { code: 'ES', label: 'Espanol', initialAngle: 45, radius: 168, duration: 26, direction: -1 },
  { code: 'JP', label: '日本語', initialAngle: 165, radius: 168, duration: 26, direction: -1 },
  { code: 'PT', label: 'Portugues', initialAngle: 285, radius: 168, duration: 26, direction: -1 },
];

function buildOrbitKeyframes(initialAngle: number, radius: number, direction: 1 | -1, steps = 72) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = ((initialAngle + direction * (i / steps) * 360) * Math.PI) / 180;
    xs.push(Math.cos(angle) * radius);
    ys.push(Math.sin(angle) * radius * 0.55); // compress Y → elliptical orbit
  }
  return { xs, ys };
}

function OrbitPill({ cfg, reduce }: { cfg: OrbitConfig; reduce: boolean }) {
  const { xs, ys } = buildOrbitKeyframes(cfg.initialAngle, cfg.radius, cfg.direction);
  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ translateX: '-50%', translateY: '-50%' }}
      animate={reduce ? {} : { x: xs, y: ys }}
      transition={{
        duration: cfg.duration,
        repeat: Infinity,
        ease: 'linear',
        repeatType: 'loop',
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 shadow-lg shadow-zinc-950/60 select-none whitespace-nowrap">
        <span className="text-xs font-bold text-violet-300">{cfg.code}</span>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">{cfg.label}</span>
      </div>
    </motion.div>
  );
}

function AudioWave({ reduce }: { reduce: boolean }) {
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.9, 0.65, 0.45, 0.8];
  return (
    <div className="flex items-center gap-[3px] h-5">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-violet-400 rounded-full"
          style={{ height: `${h * 20}px` }}
          animate={reduce ? {} : { scaleY: [1, 0.3 + Math.random() * 0.7, 1] }}
          transition={{
            duration: 0.6 + i * 0.07,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.06,
          }}
        />
      ))}
    </div>
  );
}

function AnimatedHeroVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 80, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 80, damping: 20 });

  const layer1X = useTransform(springX, [-0.5, 0.5], [-18, 18]);
  const layer1Y = useTransform(springY, [-0.5, 0.5], [-18, 18]);
  const layer2X = useTransform(springX, [-0.5, 0.5], [-8, 8]);
  const layer2Y = useTransform(springY, [-0.5, 0.5], [-8, 8]);
  const layer3X = useTransform(springX, [-0.5, 0.5], [-30, 30]);
  const layer3Y = useTransform(springY, [-0.5, 0.5], [-30, 30]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduce || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    rawX.set((e.clientX - rect.left - rect.width / 2) / rect.width);
    rawY.set((e.clientY - rect.top - rect.height / 2) / rect.height);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full aspect-square max-w-[460px] mx-auto select-none"
    >
      {/* Outer glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(ellipse 55% 40% at 50% 50%, rgba(124,58,237,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Orbit ring paths (decorative SVG) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ x: layer2X, y: layer2Y }}
      >
        <svg width="100%" height="100%" viewBox="-200 -200 400 400" className="absolute inset-0 w-full h-full">
          <ellipse cx="0" cy="0" rx="110" ry="61" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="1" strokeDasharray="4 6" />
          <ellipse cx="0" cy="0" rx="168" ry="92" fill="none" stroke="rgba(139,92,246,0.08)" strokeWidth="1" strokeDasharray="3 8" />
        </svg>

        {/* Orbiting pills — inner ring */}
        {INNER_RING.map((cfg) => (
          <OrbitPill key={cfg.code} cfg={cfg} reduce={reduce} />
        ))}

        {/* Orbiting pills — outer ring */}
        {OUTER_RING.map((cfg) => (
          <OrbitPill key={cfg.code} cfg={cfg} reduce={reduce} />
        ))}
      </motion.div>

      {/* Center orb with parallax (slower layer) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ x: layer2X, y: layer2Y }}
      >
        <motion.div
          className="relative w-28 h-28 rounded-full"
          animate={reduce ? {} : { scale: [1, 1.06, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 40% 35%, #a78bfa 0%, #7c3aed 45%, #4c1d95 100%)',
              boxShadow: '0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(124,58,237,0.25)',
            }}
          />
          <div
            className="absolute inset-[3px] rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25) 0%, transparent 55%)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white/90" strokeWidth={1.5} />
          </div>
        </motion.div>
      </motion.div>

      {/* Floating card: active lesson (top-right parallax layer) */}
      <motion.div
        className="absolute top-[8%] right-[2%]"
        style={{ x: layer3X, y: layer3Y }}
        animate={reduce ? {} : { y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-2xl px-4 py-3 shadow-2xl min-w-[160px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-zinc-400 font-medium">Zajecia w toku</span>
          </div>
          <p className="text-xs font-semibold text-white mb-2">Angielski B2</p>
          <AudioWave reduce={reduce} />
        </div>
      </motion.div>

      {/* Floating card: group size (bottom-left parallax layer) */}
      <motion.div
        className="absolute bottom-[12%] left-[0%]"
        style={{ x: layer1X, y: layer1Y }}
        animate={reduce ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
      >
        <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-2xl px-4 py-3 shadow-2xl">
          <p className="text-[11px] text-zinc-400 mb-1.5">Miejsca w grupie</p>
          <div className="flex items-center gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border ${i < 4 ? 'bg-violet-600 border-violet-500' : 'bg-zinc-800 border-zinc-600'}`}
              />
            ))}
            <span className="text-[11px] text-zinc-400 ml-1">4/6</span>
          </div>
        </div>
      </motion.div>

      {/* Floating rating card (bottom-right) */}
      <motion.div
        className="absolute bottom-[5%] right-[5%]"
        style={{ x: layer3X, y: layer3Y }}
        animate={reduce ? {} : { y: [0, -7, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <div className="bg-violet-700/80 backdrop-blur-sm border border-violet-500/30 rounded-xl px-3 py-2 shadow-xl">
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" strokeWidth={0} />
            <span className="text-white text-xs font-bold">4.9</span>
            <span className="text-violet-300 text-[10px]">/ 5.0</span>
          </div>
          <p className="text-violet-200 text-[10px] mt-0.5">Srednia ocena lektorow</p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  const shouldReduce = useReducedMotion();
  const [langIdx, setLangIdx] = useState(0);

  useEffect(() => {
    if (shouldReduce) return;
    const t = setInterval(() => setLangIdx((i) => (i + 1) % ROTATING_LANGUAGES.length), 2600);
    return () => clearInterval(t);
  }, [shouldReduce]);

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 65% 45%, rgba(124,58,237,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:py-0 grid grid-cols-1 lg:grid-cols-[52fr_48fr] gap-12 lg:gap-8 items-center w-full">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-6"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-600/15 border border-violet-500/25 text-violet-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Prywatna szkola jezykowa online
            </span>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter text-white leading-[1.05]">
              Naucz sie{' '}
              <span className="block">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={langIdx}
                    className="text-violet-400 inline-block"
                    initial={shouldReduce ? false : { opacity: 0, y: 20, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {ROTATING_LANGUAGES[langIdx]}.
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="text-white">Naprawde.</span>
            </h1>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-zinc-400 text-lg leading-relaxed max-w-[52ch]"
          >
            Male grupy, doswiadczeni lektorzy, elastyczny plan zajec. Efekty widoczne od pierwszej lekcji.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors duration-200 active:scale-[0.98] text-sm"
            >
              Zacznij nauke
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
            <a
              href="#jak-to-dziala"
              className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-xl transition-all duration-200 text-sm"
            >
              Jak to dziala
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-2 pt-2">
            <div className="flex -space-x-2">
              {['student-avatar-a', 'student-avatar-b', 'student-avatar-c'].map((seed, i) => (
                <img
                  key={i}
                  src={`https://picsum.photos/seed/${seed}/32/32`}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-zinc-950 object-cover"
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" strokeWidth={0} />
              ))}
            </div>
            <span className="text-zinc-400 text-sm">Zaufalo nam 500+ uczniow</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={shouldReduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex items-center justify-center"
        >
          <AnimatedHeroVisual />
        </motion.div>
      </div>
    </section>
  );
}

// ── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (reduce) { setVal(target); return; }
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 1.8,
      ease: [0, 0.55, 0.85, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {val}{suffix}
    </span>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const shouldReduce = useReducedMotion();

  return (
    <section ref={ref} className="relative bg-zinc-950 py-20 overflow-hidden">
      {/* Top neon line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      {/* Bottom neon line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 100% at 50% 50%, rgba(124,58,237,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={shouldReduce ? false : { opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12, ease: EASE }}
              className={`text-center py-6 px-4 ${i < 3 ? 'md:border-r border-zinc-800' : ''} ${i >= 2 ? 'border-t md:border-t-0 border-zinc-800' : ''}`}
            >
              <p className="text-5xl lg:text-6xl font-bold tracking-tighter text-white mb-2">
                <AnimatedNumber target={s.num} suffix={s.suffix} />
              </p>
              <p className="text-zinc-500 text-sm">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shouldReduce = useReducedMotion();

  return (
    <section id="jak-to-dziala" ref={ref} className="bg-zinc-900 py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-14"
        >
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white">
            Jak to dziala
          </h2>
          <p className="text-zinc-500 text-base mt-3 max-w-md">
            Trzy kroki dzielace Cie od pewnej rozmowy w obcym jezyku.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.n}
                initial={shouldReduce ? false : { opacity: 0, y: 28 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: 0.1 + i * 0.13, ease: EASE }}
                className="relative p-8 lg:p-10 overflow-hidden group"
              >
                {/* Hover fill */}
                <div className="absolute inset-0 bg-zinc-800/0 group-hover:bg-zinc-800/40 transition-colors duration-300" />

                {/* Giant ghost number */}
                <div
                  className="absolute -bottom-4 -right-2 text-[9rem] leading-none font-black select-none pointer-events-none text-white/[0.04]"
                  aria-hidden
                >
                  {step.n}
                </div>

                {/* Violet top accent */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-600/0 via-violet-500/60 to-violet-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10 flex flex-col gap-6">
                  {/* Step badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-violet-500/70 tracking-widest">
                      KROK {step.n}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2.5 leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Features bento ────────────────────────────────────────────────────────────

const VIDEO_AVATARS = [
  { seed: 'teacher-sarah-english-online', name: 'Sarah K.', isTeacher: true },
  { seed: 'student-piotr-language-class', name: 'Piotr W.', isTeacher: false },
  { seed: 'student-anna-online-lesson',   name: 'Anna M.',  isTeacher: false },
  { seed: 'student-tomek-video-call',     name: 'Tomek L.', isTeacher: false },
];

const SCHEDULE_SLOTS = [
  { time: '16:00', lang: 'Hiszpanski A2', active: false },
  { time: '18:00', lang: 'Angielski B2',  active: true  },
  { time: '19:30', lang: 'Niemicki A1',   active: false },
  { time: '21:00', lang: 'Wloski B1',     active: false },
];

const WAVE_BARS = [22, 48, 72, 38, 85, 58, 32, 68, 52, 78, 42, 62, 28, 74, 44];

function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const shouldReduce = useReducedMotion();
  const [speakingIdx, setSpeakingIdx] = useState(0);

  useEffect(() => {
    if (shouldReduce) return;
    const t = setInterval(() => setSpeakingIdx((i) => (i + 1) % VIDEO_AVATARS.length), 2600);
    return () => clearInterval(t);
  }, [shouldReduce]);

  // Recording playback loop
  const playProgress = useMotionValue(0);
  const barWidth = useTransform(playProgress, [0, 100], ['0%', '100%']);
  const [playTime, setPlayTime] = useState('0:00');

  useEffect(() => {
    if (shouldReduce) return;
    const totalSecs = 42 * 60 + 17;
    let alive = true;

    const run = () => {
      playProgress.set(0);
      setPlayTime('0:00');
      let lastSecond = -1;
      const ctrl = animate(playProgress, 100, {
        duration: totalSecs,
        ease: 'linear',
        onUpdate: (v) => {
          const s = Math.floor((v / 100) * totalSecs);
          if (s !== lastSecond) {
            lastSecond = s;
            setPlayTime(`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`);
          }
        },
        onComplete: () => { if (alive) run(); },
      });
      return ctrl;
    };

    const ctrl = run();
    return () => { alive = false; ctrl.stop(); };
  }, [shouldReduce]);

  return (
    <section id="oferta" ref={ref} className="bg-zinc-900 pt-12 pb-24 lg:pt-16 lg:pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-4xl lg:text-5xl font-bold tracking-tighter text-white mb-12 max-w-lg"
        >
          Wszystko, czego potrzebujesz do nauki
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* CELL A: Live video classroom */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
            className="md:col-span-2 bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col"
          >
            {/* Topbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <motion.span
                  className="block w-2 h-2 rounded-full bg-emerald-400"
                  animate={shouldReduce ? {} : { opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.3, repeat: Infinity }}
                />
                <span className="text-sm font-semibold text-white">Angielski B2</span>
                <span className="text-xs text-zinc-500 hidden sm:inline">Lekcja w toku</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
            </div>

            {/* 2×2 avatar grid */}
            <div className="grid grid-cols-2 gap-2 p-3 flex-1 min-h-[240px]">
              {VIDEO_AVATARS.map((av, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden bg-zinc-800 aspect-video">
                  <img
                    src={`https://picsum.photos/seed/${av.seed}/320/200`}
                    alt={av.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Dim non-speakers so only the active speaker pops */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{ backgroundColor: speakingIdx === i ? 'rgba(9,9,11,0.2)' : 'rgba(9,9,11,0.55)' }}
                    transition={{ duration: 0.5 }}
                  />

                  {/* Speaking border ring — always mounted, opacity drives show/hide */}
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-emerald-400 pointer-events-none"
                    animate={
                      speakingIdx === i
                        ? { opacity: [0.5, 1, 0.5] }
                        : { opacity: 0 }
                    }
                    transition={
                      speakingIdx === i
                        ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0.25 }
                    }
                  />

                  {/* Mic bars (active speaker) */}
                  {speakingIdx === i && !shouldReduce && (
                    <div className="absolute top-2 right-2 flex items-end gap-[2px]">
                      {[...Array(4)].map((_, b) => (
                        <motion.div
                          key={b}
                          className="w-[3px] bg-emerald-400 rounded-full"
                          animate={{ height: ['3px', `${8 + b * 4}px`, '3px'] }}
                          transition={{ duration: 0.3 + b * 0.09, repeat: Infinity, ease: 'easeInOut', delay: b * 0.07 }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Name tag */}
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/65 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                    <span className="text-[10px] text-white font-medium leading-none">{av.name}</span>
                    {av.isTeacher && (
                      <span className="text-[9px] text-violet-300 leading-none">lektor</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
                <span className="text-xs text-zinc-500">4 z 6 uczestnikow</span>
              </div>
              <span className="text-xs font-medium text-violet-400">Maks. 6 osob w grupie</span>
            </div>
          </motion.div>

          {/* CELL B: Flexible schedule */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.16, ease: EASE }}
            className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-white">Plan na dzis</p>
              <Clock className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {SCHEDULE_SLOTS.map((slot) => (
                <div
                  key={slot.time}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                    slot.active
                      ? 'bg-violet-600/20 border border-violet-500/30'
                      : 'border border-zinc-700/60 opacity-55'
                  }`}
                >
                  {slot.active ? (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0"
                      animate={shouldReduce ? {} : { opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1.3, repeat: Infinity }}
                    />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-mono flex-shrink-0 ${slot.active ? 'text-violet-300 font-bold' : 'text-zinc-500'}`}>
                    {slot.time}
                  </span>
                  <span className={`text-xs truncate ${slot.active ? 'text-white font-medium' : 'text-zinc-500'}`}>
                    {slot.lang}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-zinc-500 pt-1">
              Rano, po poludniu lub wieczorem. Twoj wybor.
            </p>
          </motion.div>

          {/* CELL C: Recording / audio player */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.22, ease: EASE }}
            className="bg-violet-950 border border-violet-800/40 rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Nagranie z lekcji</p>
              <Video className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
            </div>

            <div>
              <p className="text-base font-bold text-white leading-snug">Lekcja 14 - Present Perfect</p>
              <p className="text-xs text-violet-300/80 mt-0.5">Sarah K. - Angielski B2</p>
            </div>

            {/* Animated waveform */}
            <div className="flex items-center gap-[3px] h-10">
              {WAVE_BARS.map((h, i) => (
                <motion.div
                  key={i}
                  className={`flex-1 rounded-full ${i < 8 ? 'bg-violet-400' : 'bg-violet-800/50'}`}
                  style={{ height: h }}
                  animate={!shouldReduce && i < 8 ? { scaleY: [1, 0.4 + (i % 3) * 0.3, 1] } : {}}
                  transition={{
                    duration: 0.38 + (i % 5) * 0.09,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.045,
                  }}
                />
              ))}
            </div>

            {/* Progress */}
            <div className="space-y-1.5 mt-2">
              <div className="h-1 bg-violet-900 rounded-full overflow-hidden">
                <motion.div className="h-full bg-violet-400 rounded-full" style={{ width: barWidth }} />
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-violet-400 font-mono tabular-nums">{playTime}</span>
                <span className="text-xs text-violet-700 font-mono">42:17</span>
              </div>
            </div>
          </motion.div>

          {/* CELL D: Photo + achievement unlock */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.28, ease: EASE }}
            className="md:col-span-2 relative rounded-2xl overflow-hidden min-h-[220px] group"
          >
            <img
              src="https://picsum.photos/seed/woman-studying-coffee-laptop/800/420"
              alt="Nauka z materialami"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/55 to-zinc-950/10" />

            <div className="relative h-full min-h-[220px] flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
                  <span className="text-violet-300 text-xs font-semibold uppercase tracking-wider">Materialy</span>
                </div>
                <h3 className="text-xl font-bold text-white max-w-xs leading-snug">
                  Certyfikowane materialy do kazdego poziomu
                </h3>
              </div>

              {/* Achievement card — animates in when section visible */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.65, duration: 0.5, ease: EASE }}
                className="self-start"
              >
                <div className="bg-zinc-900/90 backdrop-blur-sm border border-violet-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-[18px] h-[18px] text-white" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-400 leading-none mb-1">Osiagnieto poziom</p>
                    <p className="text-sm font-bold text-white leading-none">Cambridge B2</p>
                  </div>
                  <div className="w-14 flex-shrink-0">
                    <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-violet-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={inView ? { width: '100%' } : {}}
                        transition={{ delay: 0.95, duration: 1.3, ease: EASE }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-0.5 text-right font-mono">100%</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ── Languages grid ────────────────────────────────────────────────────────────

function LanguagesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shouldReduce = useReducedMotion();

  return (
    <section ref={ref} className="bg-zinc-950 py-24 lg:py-32 border-y border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12"
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-[0.18em] mb-3">
            8 jezykow w ofercie
          </p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white">
            Ktory chcesz opanowac?
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {LANGUAGES.map((lang, i) => (
            <motion.div
              key={lang.name}
              initial={shouldReduce ? false : { opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.06 + i * 0.07, ease: EASE }}
              whileHover={shouldReduce ? {} : { y: -4, transition: { duration: 0.2 } }}
              style={{ borderColor: lang.border }}
              className="border rounded-2xl overflow-hidden relative cursor-default group bg-zinc-950"
            >
              {/* Flag as full-card background */}
              <img
                src={`https://flagcdn.com/w320/${lang.flagCode}.png`}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-[0.30] group-hover:opacity-[0.45] transition-opacity duration-500 select-none pointer-events-none"
              />
              {/* Dark gradient so text stays readable */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/70 via-zinc-950/40 to-zinc-950/20 pointer-events-none" />

              {/* Content */}
              <div className="relative z-10 p-5 lg:p-6 flex flex-col min-h-[140px]">
                {/* Corner flag */}
                <div className="self-end mb-3">
                  <img
                    src={`https://flagcdn.com/w40/${lang.flagCode}.png`}
                    alt={lang.name}
                    className="w-8 h-auto rounded-sm shadow-md opacity-90"
                  />
                </div>

                <p className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-none mt-auto">
                  {lang.greeting}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-zinc-400 font-medium">{lang.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">A1 → C2</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

// ── Platform showcase ─────────────────────────────────────────────────────────

const PLATFORM_FEATURES = [
  'Nadchodzace zajecia i pelna historia lekcji',
  'Nagrania z kazdej lekcji dostepne o kazdej porze',
  'Frekwencja i platnosci zawsze aktualne',
  'Oddzielny panel dla rodzica z wgladem w postepy',
];

const PLATFORM_SLIDES = [
  { label: 'Dashboard',     url: 'student',            screenshot: screenshotStudentDashboard  },
  { label: 'Moje zajecia',  url: 'student/classes',    screenshot: screenshotStudentClasses    },
  { label: 'Moje grupy',    url: 'student/groups',     screenshot: screenshotStudentGroups     },
  { label: 'Materialy',     url: 'student/materials',  screenshot: screenshotStudentMaterials  },
  { label: 'Frekwencja',    url: 'student/attendance', screenshot: screenshotStudentAttendance },
  { label: 'Platnosci',     url: 'student/payments',   screenshot: screenshotStudentPayments   },
];

const SLIDE_INTERVAL = 3500;

function PlatformSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shouldReduce = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (idx: number) => {
    setDirection(idx > slide ? 1 : -1);
    setSlide(idx);
  };

  // Auto-advance
  useEffect(() => {
    if (shouldReduce) return;
    timerRef.current = setTimeout(() => {
      const next = (slide + 1) % PLATFORM_SLIDES.length;
      setDirection(1);
      setSlide(next);
    }, SLIDE_INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [slide, shouldReduce]);

  const variants = {
    enter: (d: number) => ({ x: d * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d * -40, opacity: 0 }),
  };

  return (
    <section ref={ref} className="bg-zinc-900 py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: text */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, x: -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="text-violet-400 text-xs font-semibold uppercase tracking-[0.18em] mb-4">
              Platforma Academy
            </p>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white leading-[1.05] mb-5">
              Wszystko w jednym miejscu
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed mb-10 max-w-md">
              Jeden panel dla ucznia, lektora i rodzica. Zajecia, materialy, frekwencja i platnosci — poukladane, jasne i zawsze aktualne.
            </p>
            <ul className="flex flex-col gap-4">
              {PLATFORM_FEATURES.map((feat, i) => (
                <motion.li
                  key={i}
                  initial={shouldReduce ? false : { opacity: 0, x: -16 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.25 + i * 0.09, ease: EASE }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="text-zinc-300 text-sm">{feat}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: animated browser */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, x: 32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className="relative"
          >
            {/* Glow */}
            <div className="absolute -inset-6 bg-violet-600/10 rounded-3xl blur-2xl pointer-events-none" />

            {/* Browser frame */}
            <div className="relative rounded-xl overflow-hidden border border-zinc-700 shadow-2xl shadow-black/70 ring-1 ring-white/[0.04]">

              {/* Chrome bar */}
              <div className="bg-zinc-800 px-4 py-2.5 flex items-center gap-3 border-b border-zinc-700">
                <div className="flex gap-1.5 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-zinc-600" />
                  <div className="w-3 h-3 rounded-full bg-zinc-600" />
                  <div className="w-3 h-3 rounded-full bg-zinc-600" />
                </div>
                <div className="flex-1 flex justify-center overflow-hidden">
                  <div className="bg-zinc-700/70 rounded-md px-3 py-1 flex items-center gap-1.5 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={slide}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-[11px] text-zinc-400 font-mono truncate"
                      >
                        app.academy.pl/{PLATFORM_SLIDES[slide].url}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Screenshot area */}
              <div className="relative overflow-hidden bg-zinc-950" style={{ aspectRatio: '1440/900' }}>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.img
                    key={slide}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: EASE }}
                    src={PLATFORM_SLIDES[slide].screenshot}
                    alt={PLATFORM_SLIDES[slide].label}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    draggable={false}
                  />
                </AnimatePresence>
              </div>

              {/* Progress bar */}
              <div className="h-[2px] bg-zinc-800 overflow-hidden">
                <motion.div
                  key={slide}
                  className="h-full bg-violet-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: SLIDE_INTERVAL / 1000, ease: 'linear' }}
                />
              </div>

              {/* Tab nav */}
              <div className="bg-zinc-800/80 px-4 py-2.5 flex items-center gap-1 border-t border-zinc-700 overflow-x-auto">
                {PLATFORM_SLIDES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                      i === slide
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ── Teachers ──────────────────────────────────────────────────────────────────

function TeachersSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const shouldReduce = useReducedMotion();

  return (
    <section id="lektorzy" ref={ref} className="bg-zinc-900 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-14"
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-[0.18em] mb-3">
            Nasz zespol
          </p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white">
            Poznaj swoich lektorow
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TEACHERS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={shouldReduce ? false : { opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.08 + i * 0.12, ease: EASE }}
              className="bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden flex flex-col group"
            >
              {/* Photo */}
              <div className="relative overflow-hidden aspect-[4/3]">
                <img
                  src={t.photo}
                  alt={t.name}
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-800 via-transparent to-transparent" />

                {/* Cert badge */}
                <div className="absolute top-3 left-3 bg-zinc-900/85 backdrop-blur-sm border border-zinc-700 rounded-lg px-2.5 py-1">
                  <span className="text-[10px] text-violet-300 font-semibold">{t.cert}</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div>
                  <h3 className="text-lg font-bold text-white">{t.name}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{t.title}</p>
                </div>

                {/* Languages */}
                <div className="flex flex-wrap gap-2">
                  {t.languages.map((lang) => (
                    <div
                      key={lang.name}
                      className="flex items-center gap-1.5 bg-zinc-700/60 border border-zinc-600/50 rounded-full px-2.5 py-1"
                    >
                      <img
                        src={`https://flagcdn.com/w20/${lang.flagCode}.png`}
                        alt={lang.name}
                        className="w-4 h-auto rounded-sm"
                      />
                      <span className="text-[11px] text-zinc-300 font-medium">{lang.name}</span>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed flex-1">{t.bio}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-3 border-t border-zinc-700">
                  <div>
                    <p className="text-base font-bold text-white">{t.experience}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">doswiadczenia</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-700" />
                  <div>
                    <p className="text-base font-bold text-white">{t.students}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">uczniow</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-700" />
                  <div>
                    <p className="text-base font-bold text-white">{t.levels}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">poziomy</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FAQSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shouldReduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" ref={ref} className="bg-zinc-950 py-24 lg:py-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white">
            Czesto zadawane pytania
          </h2>
        </motion.div>

        <div className="flex flex-col divide-y divide-zinc-800">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              >
                <span className="text-white font-medium text-base group-hover:text-violet-300 transition-colors">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180 text-violet-400' : ''}`}
                  strokeWidth={2}
                />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="text-zinc-400 text-sm leading-relaxed pb-5">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

const TRIAL_LANGS = ['Angielski', 'Niemecki', 'Hiszpanski'];

const TRIAL_SLOTS = [
  { time: '16:00', taken: false },
  { time: '17:00', taken: true  },
  { time: '18:00', taken: false },
  { time: '19:00', taken: false },
  { time: '20:00', taken: true  },
  { time: '21:00', taken: false },
];

function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shouldReduce = useReducedMotion();
  const [lang, setLang] = useState(0);
  const [slot, setSlot] = useState(2);

  return (
    <section ref={ref} className="bg-zinc-950 py-24 lg:py-32 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — headline */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, x: -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.18em] mb-6">
              Prywatna szkola jezykowa online
            </p>
            <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter text-white leading-[0.95] mb-6">
              Zacznij<br />
              mowic.<br />
              <span className="text-violet-400">Dzisiaj.</span>
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed mb-10 max-w-sm">
              Male grupy, certyfikowani lektorzy, elastyczne godziny. Pierwsza lekcja probna bezplatna.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors duration-200 active:scale-[0.98] text-sm"
              >
                Zaloguj sie i zacznij
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
              <a
                href="mailto:kontakt@academy.pl"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-3.5"
              >
                Masz pytania? Napisz do nas
              </a>
            </div>
          </motion.div>

          {/* Right — trial booking widget */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, x: 32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          >
            <div className="border border-zinc-700 rounded-2xl p-6 bg-zinc-900">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-white font-semibold text-base">Lekcja probna</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Bezplatna · 45 minut · Online</p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1">
                  0 zl
                </span>
              </div>

              {/* Language picker */}
              <div className="mb-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2.5">Jezyk</p>
                <div className="flex gap-2 flex-wrap">
                  {TRIAL_LANGS.map((l, i) => (
                    <button
                      key={l}
                      onClick={() => setLang(i)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        lang === i
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              <div className="mb-6">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2.5">Godzina — najblizszy wtorek</p>
                <div className="grid grid-cols-3 gap-2">
                  {TRIAL_SLOTS.map((s, i) => (
                    <button
                      key={s.time}
                      disabled={s.taken}
                      onClick={() => !s.taken && setSlot(i)}
                      className={`py-2.5 rounded-xl text-sm font-mono font-medium transition-all duration-150 ${
                        s.taken
                          ? 'bg-zinc-800/40 text-zinc-700 cursor-not-allowed border border-zinc-800/40'
                          : slot === i
                          ? 'bg-violet-600 text-white border border-violet-600'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {s.taken ? <span className="text-[10px] text-zinc-700">zajete</span> : s.time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-800 mb-5" />

              {/* Summary + CTA */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-zinc-500 leading-relaxed">
                  <p className="text-white text-sm font-medium">
                    {TRIAL_LANGS[lang]} · {TRIAL_SLOTS[slot]?.time}
                  </p>
                  <p className="mt-0.5">Wtorek, 8 lipca 2025</p>
                </div>
              </div>

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-100 transition-colors duration-150 active:scale-[0.99] text-sm"
              >
                Zarezerwuj lekcje probna
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
              <p className="text-center text-[11px] text-zinc-600 mt-3">
                Bez zobowiazan. Mozesz odwolac w dowolnej chwili.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className="text-white font-semibold tracking-tight">Academy</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              Prywatna szkola jezykowa online. Uczymy skutecznie, w malych grupach, z pasja.
            </p>
          </div>

          <div>
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Nawigacja</p>
            <div className="flex flex-col gap-2.5">
              {['Oferta', 'Jak to dziala', 'Opinie', 'FAQ'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Kontakt</p>
            <div className="flex flex-col gap-2.5">
              <a href="mailto:kontakt@academy.pl" className="text-zinc-500 hover:text-white text-sm transition-colors">
                kontakt@academy.pl
              </a>
              <a href="tel:+48123456789" className="text-zinc-500 hover:text-white text-sm transition-colors">
                +48 123 456 789
              </a>
              <Link to="/login" className="text-violet-400 hover:text-violet-300 text-sm transition-colors mt-2">
                Panel ucznia
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-600 text-xs">© 2026 Academy. Wszelkie prawa zastrzezone.</p>
          <div className="flex gap-6">
            <a href="#" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">Polityka prywatnosci</a>
            <a href="#" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">Regulamin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-zinc-950 font-[Geist_Variable,sans-serif]">
      <LandingNav />
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <LanguagesSection />
      <PlatformSection />
      <FeaturesSection />
      <TeachersSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
