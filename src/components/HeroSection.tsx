import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
} from 'react';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Eye, Layers, Sparkles } from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { PortraitFrame } from './PortraitFrame';
import { NavSectionId } from './Navbar';
import { OwnerEditButton } from './OwnerEditButton';

interface HeroSectionProps {
  onNavigate: (section: NavSectionId) => void;
  /** True once the initial loading screen has finished; the entrance plays then. */
  ready?: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate,
  ready = true,
}) => {
  const {
    siteConfig,
    profileViews,
    isOwnerMode,
    updateSiteConfig,
  } = usePortfolioCMS();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [animCycle, setAnimCycle] = useState(0);
  const [isInView, setIsInView] = useState(() => ready);
  const hasExitedRef = useRef(false);
  const heroSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ready) {
      setIsInView(true);
    }
  }, [ready]);

  const [isMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );

  /** Builds entrance props: element starts hidden at `from`, settles at its natural position. */
  const enter = (
    delay: number,
    from: { x?: number | string; y?: number; scale?: number } = { y: 16 },
    duration = 0.85
  ) => {
    if (shouldReduceMotion) {
      return {
        initial: false,
        animate: { opacity: 1, x: 0, y: 0, scale: 1 },
        transition: { duration: 0 },
      };
    }
    const go = ready && isInView;
    return {
      initial: { opacity: 0, ...from },
      animate: go
        ? { opacity: 1, x: 0, y: 0, scale: 1 }
        : { opacity: 0, ...from },
      transition: go
        ? { duration, delay, ease: EASE }
        : { duration: 0 },
    };
  };
  const slide = isMobile ? 14 : 22;
  const slideX = isMobile ? 24 : 40;

  // Damped physical spring physics for ultra-smooth, continuous mouse parallax without re-renders
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 28, stiffness: 90, mass: 0.6 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Background text: moves opposite to cursor with soft boundaries
  const bgX = useTransform(smoothX, [-1, 1], [24, -24]);
  const bgY = useTransform(smoothY, [-1, 1], [12, -12]);

  // Main name heading in left column: subtle parallax
  const headingX = useTransform(smoothX, [-1, 1], [-8, 8]);
  const headingY = useTransform(smoothY, [-1, 1], [-5, 5]);

  // Center portrait: moves slightly in cursor direction + 3D perspective tilt
  const portraitX = useTransform(smoothX, [-1, 1], [-16, 16]);
  const portraitY = useTransform(smoothY, [-1, 1], [-10, 10]);
  const portraitRotateY = useTransform(smoothX, [-1, 1], [-4.5, 4.5]);
  const portraitRotateX = useTransform(smoothY, [-1, 1], [3.5, -3.5]);

  const portraitMotionValues = useMemo(
    () => ({
      x: portraitX,
      y: portraitY,
      rotateX: portraitRotateX,
      rotateY: portraitRotateY,
    }),
    [portraitX, portraitY, portraitRotateX, portraitRotateY]
  );

  const gridRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const [rightOffset, setRightOffset] = useState<number | null>(null);

  // Align the top of the right-side block with the top of "HELLO, I'M"
  // (the greeting is the first child of the left column, so its top == column top)
  useLayoutEffect(() => {
    const measure = () => {
      const grid = gridRef.current;
      const leftCol = leftColRef.current;
      if (!grid || !leftCol || window.innerWidth < 1024) {
        setRightOffset(null);
        return;
      }
      const offset =
        leftCol.getBoundingClientRect().top - grid.getBoundingClientRect().top;
      setRightOffset(Math.max(0, Math.round(offset)));
    };
    measure();
    window.addEventListener('resize', measure);
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) {
      if (gridRef.current) ro.observe(gridRef.current);
      if (leftColRef.current) ro.observe(leftColRef.current);
    }
    const t = window.setTimeout(measure, 400);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  // Window-level smooth cursor tracking (immune to hovering interactive elements or boundary drops)
  useEffect(() => {
    if (shouldReduceMotion) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const hero = document.getElementById('home');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      targetX = Math.max(-1.15, Math.min(1.15, nx));
      targetY = Math.max(-1.15, Math.min(1.15, ny));

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          mouseX.set(targetX);
          mouseY.set(targetY);
        });
      }
    };

    const onMouseLeave = () => {
      targetX = 0;
      targetY = 0;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [shouldReduceMotion, mouseX, mouseY]);

  // Replay hero entrance sequence when visitor scrolls down past the hero and scrolls back up
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const heroEl = heroSectionRef.current;
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        // When hero scrolls past the top of the viewport and is essentially out of view
        if (entry.intersectionRatio < 0.05 || entry.boundingClientRect.bottom < 50) {
          if (!hasExitedRef.current) {
            hasExitedRef.current = true;
            setIsInView(false);
          }
        } else if (
          hasExitedRef.current &&
          (entry.intersectionRatio >= 0.25 || entry.boundingClientRect.bottom >= 300)
        ) {
          // Re-entering hero section from below
          hasExitedRef.current = false;
          setAnimCycle((prev) => prev + 1);
          setIsInView(true);
        }
      },
      {
        threshold: [0, 0.05, 0.25, 0.5, 0.75, 1.0],
      }
    );

    observer.observe(heroEl);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={heroSectionRef}
      id="home"
      className="relative isolate flex min-h-screen w-full items-center overflow-x-clip bg-transparent pt-24 pb-10 text-cream lg:pt-28 lg:pb-12"
    >
      {/* Subtle Bottom Vignette Grounding */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 z-[1] h-36 bg-gradient-to-t from-obsidian via-obsidian/65 to-transparent"
        aria-hidden="true"
      />

      {/*
       * LAYER 1: OVERSIZED SOLID PORTRAIT-GRADIENT "BRAND IDENTITY" TYPOGRAPHY
       * - Zero background shapes, blobs, panels, or geometric elements behind the text.
       * - Complete unclipped vertical & horizontal rendering (overflow-visible + generous line-height & padding).
       * - Lighter, richer, colorful portrait-inspired gradient.
       * - Positioned strictly at z-0 so it NEVER renders on top of the portrait.
       */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[18%] z-0 -translate-y-1/2 select-none overflow-visible sm:top-[22%] lg:top-[26%]"
        aria-hidden="true"
      >
        {/* Entrance: the complete name slides in from the left as one unit */}
        <motion.div
          key={`bg-text-${animCycle}`}
          {...enter(0, { x: isMobile ? '-40vw' : '-28vw' }, 1.35)}
          className="w-full"
        >
          <motion.div
            style={
              shouldReduceMotion
                ? undefined
                : {
                    x: bgX,
                    y: bgY,
                  }
            }
            className="mx-auto flex w-full max-w-[1860px] flex-col items-center justify-center overflow-visible px-3 text-center"
          >
            <div className="group relative flex flex-col items-center">
              <span className="hero-brand-identity-gradient font-impact block w-full overflow-visible py-6 text-[12.2vw] font-normal uppercase leading-[1.22] tracking-[0.018em] whitespace-nowrap sm:py-8 sm:text-[12.5vw] lg:py-10 lg:text-[12.6vw]">
                {siteConfig.heroBackgroundText}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/*
       * Background Typography Owner Edit Control:
       * Positioned at the upper-right side of the large background name,
       * strictly outside the central portrait area with z-40 so it is never
       * blocked by the portrait or foreground columns. Hidden for public visitors.
       */}
      {isOwnerMode && (
        <div className="pointer-events-auto absolute right-4 top-24 z-40 sm:right-8 sm:top-28 lg:right-12 lg:top-28">
          <OwnerEditButton
            title="Hero Background Typography"
            description="Large background typography running behind your portrait"
            value={siteConfig.heroBackgroundText}
            tooltip="Edit large background name"
            onSave={(val) =>
              updateSiteConfig((prev) => ({
                ...prev,
                heroBackgroundText: val,
              }))
            }
          />
        </div>
      )}

      {/* LAYER 2: FOREGROUND — LARGE CENTRAL PORTRAIT + EDITORIAL LEFT & RIGHT COLUMNS */}
      <div className="relative z-10 isolate mx-auto w-full max-w-[1540px] px-4 sm:px-6 lg:px-10">
        <div
          ref={gridRef}
          className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-2"
        >
          {/* LEFT EDITORIAL COLUMN: Moved slightly downward so it has clean spacing below the hero background name */}
          <div
            ref={leftColRef}
            className="order-2 relative z-30 mt-6 flex flex-col items-start text-left sm:mt-8 lg:order-1 lg:col-span-4 lg:mt-48 xl:mt-52"
          >
            {/* Elegant Script-Style Greeting Positioned Above Name */}
            <motion.div
              key={`greeting-${animCycle}`}
              {...enter(0.38, { y: slide }, 0.65)}
              className="mb-2 flex items-center gap-2"
            >
              <p className="font-script text-2xl tracking-wide text-[#ffd8be] drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)] sm:text-3xl">
                {siteConfig.heroGreeting}
              </p>
              <OwnerEditButton
                title="Hero Greeting"
                description="The greeting displayed above your name"
                value={siteConfig.heroGreeting}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({ ...prev, heroGreeting: val }))
                }
              />
            </motion.div>

            {/* Bold Single-Line Display Name: "NAYEMUL ISLAM" */}
            <motion.div
              key={`name-wrap-${animCycle}`}
              {...enter(0.48, { y: slide }, 0.65)}
              className="flex items-center gap-2.5"
            >
              <motion.h1
                style={
                  shouldReduceMotion
                    ? undefined
                    : {
                        x: headingX,
                        y: headingY,
                      }
                }
                className="font-hero text-[1.9rem] font-normal uppercase leading-[1.04] tracking-[0.01em] text-cream whitespace-nowrap drop-shadow-[0_12px_30px_rgba(0,0,0,0.95)] sm:text-4xl lg:text-[2.25rem] xl:text-[2.65rem] 2xl:text-[3.05rem]"
              >
                {siteConfig.name}
              </motion.h1>
              <OwnerEditButton
                title="Display Name"
                description="Your name heading displayed in the hero"
                value={siteConfig.name}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({ ...prev, name: val }))
                }
              />
            </motion.div>

            {/* Professional Title: "BRAND IDENTITY DESIGNER" */}
            <motion.div
              key={`title-${animCycle}`}
              {...enter(0.58, { y: slide }, 0.65)}
              className="mt-3.5 flex items-center gap-2.5"
            >
              <span
                className="h-[3px] w-9 rounded-full bg-gradient-to-r from-[#DF00FF] to-[#00BDFF]"
                aria-hidden="true"
              />
              <h2 className="font-display text-xs font-extrabold uppercase tracking-[0.18em] text-[#00BDFF] sm:text-sm xl:text-base">
                {siteConfig.title.toUpperCase()}
              </h2>
              <OwnerEditButton
                title="Professional Title"
                description="Your primary professional title"
                value={siteConfig.title}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({ ...prev, title: val }))
                }
              />
            </motion.div>

            {/* Concise Professional Introduction */}
            <motion.div
              key={`intro-${animCycle}`}
              {...enter(0.68, { y: slide }, 0.65)}
              className="mt-4 flex flex-col items-start gap-1"
            >
              <p className="max-w-md text-sm font-normal leading-relaxed text-cream/85 drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] sm:text-base">
                {siteConfig.heroIntro}
              </p>
              <OwnerEditButton
                title="Hero Introduction"
                description="Brief introduction bio text in the hero"
                value={siteConfig.heroIntro}
                multiline
                onSave={(val) =>
                  updateSiteConfig((prev) => ({ ...prev, heroIntro: val }))
                }
              />
            </motion.div>

            {/* Two Primary CTA Buttons */}
            <motion.div
              key={`cta-${animCycle}`}
              {...enter(0.78, { y: slide }, 0.65)}
              className="mt-7 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row"
            >
              {/* CTA 1: EXPLORE MY WORK */}
              <a
                href="#homepage-portfolio-showcase"
                onClick={(e) => {
                  e.preventDefault();
                  const showcaseEl = document.getElementById(
                    'homepage-portfolio-showcase'
                  );
                  if (showcaseEl) {
                    showcaseEl.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  } else {
                    onNavigate('portfolio');
                  }
                }}
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-6 py-3.5 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_8px_25px_rgba(223,0,255,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,189,255,0.45)] hover:brightness-110"
              >
                <span>EXPLORE MY WORK</span>
                <ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
              </a>

              {/* CTA 2: LET'S WORK TOGETHER */}
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('contact');
                }}
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl border border-cream/20 bg-obsidian/85 px-6 py-3.5 font-display text-xs font-bold uppercase tracking-widest text-cream backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00BDFF] hover:text-[#00BDFF]"
              >
                <span>LET&apos;S WORK TOGETHER</span>
                <ArrowUpRight className="h-4 w-4 text-[#00BDFF] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </motion.div>

            {/* Real-Time Live Profile Views Counter */}
            <motion.div
              key={`views-${animCycle}`}
              {...enter(0.88, { y: slide }, 0.65)}
              className="mt-6 inline-flex items-center"
            >
              <div className="group relative inline-flex items-center gap-3.5 rounded-2xl border border-white/20 bg-gradient-to-r from-obsidian/95 via-[#13111c]/90 to-obsidian/95 px-4 sm:px-5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-xl ring-1 ring-white/10 transition-all duration-300 hover:border-white/35 hover:shadow-[0_12px_40px_rgba(0,189,255,0.22)]">
                {/* Visual Status Indicator / Icon */}
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white shadow-inner ring-1 ring-white/20">
                  <Eye className="h-4 w-4 text-white" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                </div>

                {/* Counter Label and Prominent Number */}
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                  <span className="font-display text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                    PROFILE VIEWS
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.4)]">
                      {profileViews.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      Live
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CENTER COLUMN: LARGE TRANSPARENT PORTRAIT OVERLAPPING "NAYEMUL ISLAM" IN FOREGROUND (5 cols + negative margin expansion) */}
          <motion.div
            key={`portrait-${animCycle}`}
            {...enter(0.24, { y: 22, scale: 0.94 }, 1.0)}
            className="order-1 relative z-20 isolate flex items-center justify-center lg:order-2 lg:col-span-5 lg:-mx-10 xl:-mx-14"
          >
            <PortraitFrame
              primaryPath={siteConfig.portraits.heroPortraitPath}
              placeholderPath={siteConfig.portraits.heroPlaceholderPath}
              storageKey="nayemul_hero_portrait_preview"
              variant="hero"
              motionValues={portraitMotionValues}
              reducedMotion={shouldReduceMotion}
            />
          </motion.div>

          {/* RIGHT EDITORIAL COLUMN: Concise Studio Callouts (3 cols on desktop) */}
          <div
            className="order-3 relative z-30 flex flex-col items-start justify-center gap-5 lg:col-span-3 lg:items-end lg:self-start lg:pl-2 lg:text-right"
            style={rightOffset !== null ? { marginTop: rightOffset } : undefined}
          >
            {/* Availability Indicator */}
            <motion.div
              key={`avail-${animCycle}`}
              {...enter(0.55, { x: slideX, y: 0 }, 0.7)}
              className="flex items-center gap-2"
            >
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#00BDFF]/40 bg-obsidian/85 px-4 py-1.5 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00BDFF] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00BDFF]" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-editorial text-cream">
                  {siteConfig.availability}
                </span>
              </div>
              <OwnerEditButton
                title="Availability Status"
                description="Your availability badge status"
                value={siteConfig.availability}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({ ...prev, availability: val }))
                }
              />
            </motion.div>

            {/* Concise Numbered Service Callouts */}
            <motion.div
              key={`services-${animCycle}`}
              {...enter(0.68, { x: slideX, y: 0 }, 0.7)}
              className="w-full space-y-3.5 border-t border-cream/12 pt-4 lg:max-w-[235px]"
            >
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-cream/40">
                  SERVICES
                </span>
                <OwnerEditButton
                  openTab="services"
                  tooltip="Manage Services in CMS"
                />
              </div>
              {siteConfig.services.map((srv) => (
                <div
                  key={srv.id}
                  className="flex items-baseline justify-between gap-3 border-b border-cream/10 pb-2.5 lg:flex-row-reverse"
                >
                  <span className="font-hero text-lg text-[#ffd8be]">
                    {srv.number}.
                  </span>
                  <p className="font-display text-xs font-extrabold uppercase tracking-wider text-cream">
                    {srv.title}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Design Software Suite Callout — Official Recognizable Application Icons with Authentic Colors */}
            <motion.div
              key={`tools-${animCycle}`}
              {...enter(0.82, { x: slideX, y: 0 }, 0.7)}
              className="flex items-center gap-2.5 rounded-xl border border-cream/15 bg-obsidian/85 px-3.5 py-2 backdrop-blur-md"
              aria-label="Software Tools: Adobe Photoshop, Adobe Illustrator, Adobe InDesign"
            >
              <div className="flex items-center gap-2">
                {/* Adobe Photoshop Official Icon */}
                <div
                  title="Adobe Photoshop"
                  aria-label="Adobe Photoshop"
                  className="group relative flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#31A8FF] bg-[#001E36] shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-[0_0_12px_rgba(49,168,255,0.45)] cursor-default select-none"
                >
                  <span className="font-sans text-[11px] font-black leading-none tracking-tight text-[#31A8FF]">
                    Ps
                  </span>
                </div>

                {/* Adobe Illustrator Official Icon */}
                <div
                  title="Adobe Illustrator"
                  aria-label="Adobe Illustrator"
                  className="group relative flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#FF9A00] bg-[#330000] shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-[0_0_12px_rgba(255,154,0,0.45)] cursor-default select-none"
                >
                  <span className="font-sans text-[11px] font-black leading-none tracking-tight text-[#FF9A00]">
                    Ai
                  </span>
                </div>

                {/* Adobe InDesign Official Icon */}
                <div
                  title="Adobe InDesign"
                  aria-label="Adobe InDesign"
                  className="group relative flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#FF3366] bg-[#49021F] shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-[0_0_12px_rgba(255,51,102,0.45)] cursor-default select-none"
                >
                  <span className="font-sans text-[11px] font-black leading-none tracking-tight text-[#FF3366]">
                    Id
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
