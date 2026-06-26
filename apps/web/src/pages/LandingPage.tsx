import { useState, useEffect, useRef } from 'react';
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
  Globe,
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

const LANGUAGES_MARQUEE = [
  'Angielski', 'Niemiecki', 'Hiszpański', 'Włoski', 'Francuski',
  'Portugalski', 'Rosyjski', 'Niderlandzki', 'Szwedzki', 'Japoński',
];

const TESTIMONIALS = [
  {
    name: 'Joanna Marek',
    role: 'Mama Anki, 15 lat',
    quote:
      'Ania zdała egzamin FCE po roku nauki w Academy. Poprzednia szkoła nie dała takich efektów przez trzy lata nauki.',
    avatar: 'https://picsum.photos/seed/joanna-language-parent/64/64',
    stars: 5,
  },
  {
    name: 'Tomasz Nowakowski',
    role: 'Inzynier, Orange Polska',
    quote:
      'Potrzebowalem angielskiego do pracy z klientami z UK. Po 8 miesiacach prowadze spotkania bez zadnych problemow.',
    avatar: 'https://picsum.photos/seed/tomasz-engineer-student/64/64',
    stars: 5,
  },
  {
    name: 'Zuzanna Wieczorek',
    role: 'Studentka, Politechnika Warszawska',
    quote:
      'Zdalam egzamin B2 z Niemieckiego na pierwszym podejsciu. Lektorzy sa naprawde zaangazowani i cierpliwi.',
    avatar: 'https://picsum.photos/seed/zuzanna-university-student/64/64',
    stars: 5,
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

// ── Marquee ─────────────────────────────────────────────────────────────────

function LanguageMarquee() {
  const shouldReduce = useReducedMotion();
  const items = [...LANGUAGES_MARQUEE, ...LANGUAGES_MARQUEE];

  if (shouldReduce) {
    return (
      <div className="flex flex-wrap gap-4 justify-center">
        {LANGUAGES_MARQUEE.map((lang) => (
          <span key={lang} className="text-zinc-300 font-medium text-lg">
            {lang}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex gap-12 w-max"
        animate={{ x: '-50%' }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
      >
        {items.map((lang, i) => (
          <span key={i} className="flex items-center gap-3 text-zinc-300 font-medium text-xl whitespace-nowrap">
            <Globe className="w-4 h-4 text-violet-400 flex-shrink-0" strokeWidth={1.5} />
            {lang}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

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
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const shouldReduce = useReducedMotion();

  return (
    <section id="jak-to-dziala" ref={ref} className="bg-zinc-950 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-[0.18em] mb-3">
            Jak to dziala
          </p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white max-w-xl">
            Od zerowego poziomu do pewnej rozmowy
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.n}
                initial={shouldReduce ? false : { opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%-8px)] w-full h-px bg-gradient-to-r from-zinc-700 to-transparent z-0" />
                )}
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-violet-400" strokeWidth={1.5} />
                    </div>
                    <span className="text-zinc-600 font-mono text-sm font-bold">{step.n}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{step.body}</p>
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

function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shouldReduce = useReducedMotion();

  return (
    <section id="oferta" ref={ref} className="bg-zinc-900 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl lg:text-5xl font-bold tracking-tighter text-white mb-12 max-w-lg"
        >
          Wszystko, czego potrzebujesz do nauki
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-2 relative rounded-2xl overflow-hidden min-h-[280px] group"
          >
            <img
              src="https://picsum.photos/seed/small-group-video-call-learning/800/500"
              alt="Zajecia w malej grupie"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
                <span className="text-violet-300 text-xs font-semibold uppercase tracking-wider">Male grupy</span>
              </div>
              <h3 className="text-xl font-bold text-white">Maksymalnie 6 osob</h3>
              <p className="text-zinc-400 text-sm mt-1 max-w-xs">Kazdy uczen dostaje uwage lektora. Zero anonimowosci w 30-osobowej klasie.</p>
            </div>
          </motion.div>

          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-zinc-800 border border-zinc-700 p-6 flex flex-col justify-between min-h-[280px]"
          >
            <div className="w-11 h-11 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-violet-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Elastyczne godziny</h3>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">Zajecia rano, po poludniu lub wieczorem. Wybierasz termin, ktory pasuje do Twojego zycia.</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {['Rano', 'Po poludniu', 'Wieczor', 'Weekend'].map((t) => (
                <span key={t} className="text-xs text-zinc-300 bg-zinc-700 rounded-full px-3 py-1">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-violet-950 border border-violet-800/40 p-6 flex flex-col justify-between min-h-[220px]"
          >
            <div className="w-11 h-11 rounded-2xl bg-violet-600/25 flex items-center justify-center">
              <Video className="w-5 h-5 text-violet-300" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Nagrania z zajec</h3>
              <p className="text-violet-200/70 text-sm mt-2 leading-relaxed">Kazda lekcja jest nagrywana. Wracaj do materialow kiedy chcesz.</p>
            </div>
          </motion.div>

          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-2 relative rounded-2xl overflow-hidden min-h-[220px] group"
          >
            <img
              src="https://picsum.photos/seed/study-materials-books-laptop/800/400"
              alt="Materialy do nauki"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/50 to-transparent" />
            <div className="absolute left-0 top-0 h-full flex flex-col justify-center p-6 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
                <span className="text-violet-300 text-xs font-semibold uppercase tracking-wider">Materialy</span>
              </div>
              <h3 className="text-xl font-bold text-white">Certyfikowane materialy</h3>
              <p className="text-zinc-400 text-sm mt-1">Pracujemy na sprawdzonych podrecznikach dostosowanych do Twojego poziomu i celu nauki.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Languages marquee ─────────────────────────────────────────────────────────

function LanguagesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const shouldReduce = useReducedMotion();

  return (
    <section ref={ref} className="bg-zinc-950 py-20 border-y border-zinc-800">
      <motion.div
        initial={shouldReduce ? false : { opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <p className="text-zinc-500 text-sm">Oferujemy nauke jezykow z calego swiata</p>
      </motion.div>
      <motion.div
        initial={shouldReduce ? false : { opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <LanguageMarquee />
      </motion.div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const shouldReduce = useReducedMotion();

  return (
    <section id="opinie" ref={ref} className="bg-zinc-900 py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-[0.18em] mb-3">
            Opinie uczniow
          </p>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-white">
            Co mowia nasi uczniowie
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={shouldReduce ? false : { opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" strokeWidth={0} />
                ))}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed flex-1">"{t.quote}"</p>
              <div className="flex items-center gap-3 pt-2 border-t border-zinc-700">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover bg-zinc-700"
                />
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-zinc-500 text-xs">{t.role}</p>
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

function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const shouldReduce = useReducedMotion();

  return (
    <section ref={ref} className="bg-zinc-900 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl overflow-hidden bg-violet-600 px-8 py-16 text-center"
          style={{
            background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #6d28d9 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 60% 80% at 50% -10%, rgba(255,255,255,0.12) 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tighter text-white mb-4 max-w-2xl mx-auto">
              Gotowy na pierwsza lekcje?
            </h2>
            <p className="text-violet-200 text-lg mb-8 max-w-md mx-auto">
              Dolacz do ponad 500 uczniow, ktorzy juz ucza sie z Academy.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-violet-700 font-bold rounded-xl hover:bg-violet-50 transition-colors duration-200 active:scale-[0.98] text-base"
            >
              Zaloguj sie i zacznij
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </Link>
          </div>
        </motion.div>
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
      <FeaturesSection />
      <LanguagesSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
