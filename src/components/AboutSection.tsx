import React, { useEffect, useMemo, useCallback } from 'react';
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Compass,
  Layers,
  Sparkles,
  Edit3,
  ArrowUpRight,
  CheckCircle2,
  PenTool,
  BookOpen,
  Share2,
  Mail,
} from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { PortraitFrame } from './PortraitFrame';
import { NavSectionId } from './Navbar';
import { OwnerEditButton } from './OwnerEditButton';

interface AboutSectionProps {
  onNavigate?: (sectionId: NavSectionId) => void;
}

const TOOL_BADGE_STYLES: Record<
  string,
  {
    border: string;
    bg: string;
    text: string;
    glow: string;
    tag: string;
    logoBorder: string;
  }
> = {
  Ps: {
    border: 'border-[#31A8FF]/45 group-hover:border-[#31A8FF]',
    bg: 'bg-[#001E36]',
    text: 'text-[#31A8FF]',
    glow: 'from-[#31A8FF]/15 to-transparent',
    tag: 'RASTER & MOCKUP ARCHITECTURE',
    logoBorder: 'border-[#31A8FF]/35',
  },
  Ai: {
    border: 'border-[#FF9A00]/45 group-hover:border-[#FF9A00]',
    bg: 'bg-[#331A00]',
    text: 'text-[#FF9A00]',
    glow: 'from-[#FF9A00]/15 to-transparent',
    tag: 'VECTOR & LOGO PRECISION',
    logoBorder: 'border-[#FF9A00]/35',
  },
  Id: {
    border: 'border-[#FF3366]/45 group-hover:border-[#FF3366]',
    bg: 'bg-[#33001A]',
    text: 'text-[#FF3366]',
    glow: 'from-[#FF3366]/15 to-transparent',
    tag: 'EDITORIAL & STYLE SYSTEMS',
    logoBorder: 'border-[#FF3366]/35',
  },
};

export const AboutSection: React.FC<AboutSectionProps> = ({ onNavigate }) => {
  const { siteConfig, openCMS, isOwnerMode, updateSiteConfig } =
    usePortfolioCMS();
  const shouldReduceMotion = useReducedMotion() ?? false;

  // Damped physical spring physics for ultra-smooth About portrait parallax without re-renders
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 28, stiffness: 90, mass: 0.6 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateY = useTransform(smoothX, [-1, 1], [-7, 7]);
  const rotateX = useTransform(smoothY, [-1, 1], [6, -6]);

  const aboutMotionValues = useMemo(
    () => ({
      rotateX,
      rotateY,
    }),
    [rotateX, rotateY]
  );

  useEffect(() => {
    if (shouldReduceMotion) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const section = document.getElementById('about');
      if (!section) return;
      const rect = section.getBoundingClientRect();
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

  const getServiceIcon = (index: number) => {
    if (index === 0) return <PenTool className="h-5 w-5 text-[#ffd8be]" />;
    if (index === 1) return <BookOpen className="h-5 w-5 text-[#f694ff]" />;
    return <Share2 className="h-5 w-5 text-[#a9cbff]" />;
  };

  return (
    <section
      id="about"
      className="relative overflow-hidden bg-obsidian py-20 text-cream studio-grid-dark sm:py-24 lg:py-28"
    >
      {/* Subtle Portrait-Inspired Ambient Dark Studio Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-12 h-[480px] w-[480px] rounded-full bg-[#DF00FF]/10 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-[#00BDFF]/10 blur-[150px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-1/3 h-[420px] w-[420px] rounded-full bg-[#DF00FF]/8 blur-[140px]"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =================================================================
            1. ABOUT HERO SECTION — PERSONAL BRAND INTRODUCTION
           ================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#f694ff]/30 bg-[#1a1528] font-display text-xs font-extrabold text-[#ffd8be]">
              01
            </span>
            <span className="font-display text-xs font-extrabold uppercase tracking-[0.22em] text-[#ffd8be]">
              {siteConfig.sectionHeadings.aboutEyebrow || 'ABOUT — PERSONAL BRAND PROFILE'}
            </span>
            <OwnerEditButton
              title="About Section Tag"
              description="Top section tag for About page"
              value={siteConfig.sectionHeadings.aboutEyebrow || 'ABOUT — PERSONAL BRAND PROFILE'}
              onSave={(val) =>
                updateSiteConfig((prev) => ({
                  ...prev,
                  sectionHeadings: { ...prev.sectionHeadings, aboutEyebrow: val },
                }))
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#141122]/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cream/90">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              {siteConfig.availability}
            </span>

            {isOwnerMode && (
              <button
                type="button"
                onClick={() => openCMS('hero-about')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#f694ff]/35 bg-[#1b162a] px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#ffd8be] transition hover:border-[#ffd8be] hover:bg-[#251d38] hover:text-white"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit About Page</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Hero Editorial Grid */}
        <div className="mt-12 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Portrait + Personal Identity Card (5 Columns) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Subtle Gradient Frame Halo */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-[#DF00FF]/25 to-[#00BDFF]/25 opacity-75 blur-xl"
              />
              {/* Decorative offset frame: same size as the portrait card, nudged up & right so it is evenly aligned with the card's top edge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 translate-x-3 -translate-y-3 rounded-[1.85rem] border border-cream/20 bg-charcoal/40"
              />
              <div className="relative rounded-[1.85rem] border border-white/12 bg-[#12101b]/95 p-3 shadow-[0_28px_70px_rgba(0,0,0,0.65)]">
                <PortraitFrame
                  primaryPath={siteConfig.portraits.aboutPortraitPath}
                  placeholderPath={siteConfig.portraits.aboutPlaceholderPath}
                  storageKey="nayemul_about_portrait_preview"
                  variant="about"
                  motionValues={aboutMotionValues}
                  reducedMotion={shouldReduceMotion}
                />

                {/* Bottom Studio Caption Bar inside Portrait Card */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d0b14]/95 px-4 py-3.5">
                  <div>
                    <p className="font-display text-base font-extrabold uppercase tracking-tight text-white">
                      {siteConfig.name}
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffd8be]">
                      {siteConfig.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-[#a9cbff]">
                      {siteConfig.profession}
                    </span>
                    <OwnerEditButton
                      title="Profession / Discipline"
                      value={siteConfig.profession}
                      onSave={(val) =>
                        updateSiteConfig((prev) => ({
                          ...prev,
                          profession: val,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Name, Title, Headline & Introduction (7 Columns) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="lg:col-span-7"
          >
            {/* Elegant, Prominent Script Greeting Displaying "HELLO, I'M" */}
            <div className="inline-flex items-center rounded-full border border-cream/20 bg-charcoal/80 px-4 py-2 shadow-sm backdrop-blur-md">
              <span className="font-script text-xl leading-none tracking-wide text-[#ffd8be] sm:text-2xl">
                Hello, I&apos;m
              </span>
            </div>

            {/* Main Name Heading: NAYEMUL ISLAM (no dot) */}
            <div className="mt-4 flex items-center gap-2.5">
              <h1 className="font-hero text-3xl font-normal uppercase leading-[1.04] tracking-[0.01em] text-white sm:text-4xl lg:text-5xl xl:text-6xl">
                {siteConfig.name}
              </h1>
              <OwnerEditButton
                title="Display Name"
                value={siteConfig.name}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({ ...prev, name: val }))
                }
              />
            </div>

            {/* Professional Title: BRAND IDENTITY DESIGNER */}
            <div className="mt-2 flex items-center gap-2">
              <p
                className="font-display text-sm font-extrabold uppercase tracking-[0.24em] sm:text-base"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #DF00FF 0%, #00BDFF 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {siteConfig.title}
              </p>
              <OwnerEditButton
                title="Professional Title"
                value={siteConfig.title}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({ ...prev, title: val }))
                }
              />
            </div>

            <div className="mt-6 flex items-start gap-2.5">
              <h2 className="font-display text-2xl font-extrabold uppercase leading-[1.15] tracking-tight text-cream/95 sm:text-3xl lg:text-4xl">
                {siteConfig.aboutHeading}
              </h2>
              <OwnerEditButton
                title="About Headline"
                description="Headline in the personal profile introduction"
                value={siteConfig.aboutHeading}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({
                    ...prev,
                    aboutHeading: val,
                  }))
                }
              />
            </div>

            <div className="mt-5 flex flex-col items-start gap-1">
              <p className="max-w-2xl text-base leading-relaxed text-cream/80 sm:text-lg">
                {siteConfig.aboutIntroduction}
              </p>
              <OwnerEditButton
                title="About Introduction"
                description="Introductory summary in the About section"
                value={siteConfig.aboutIntroduction}
                multiline
                onSave={(val) =>
                  updateSiteConfig((prev) => ({
                    ...prev,
                    aboutIntroduction: val,
                  }))
                }
              />
            </div>

            {/* Quick Identity Pillars */}
            <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#13101e]/90 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream/50">
                    DISCIPLINE
                  </p>
                  <OwnerEditButton
                    title="Discipline"
                    value={siteConfig.profession}
                    onSave={(val) =>
                      updateSiteConfig((prev) => ({
                        ...prev,
                        profession: val,
                      }))
                    }
                  />
                </div>
                <p className="mt-1.5 font-display text-sm font-extrabold uppercase text-white">
                  {siteConfig.profession}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#13101e]/90 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream/50">
                    SPECIALIZATION
                  </p>
                  <OwnerEditButton
                    title="Specialization"
                    value={siteConfig.experienceLevel}
                    onSave={(val) =>
                      updateSiteConfig((prev) => ({
                        ...prev,
                        experienceLevel: val,
                      }))
                    }
                  />
                </div>
                <p className="mt-1.5 font-display text-sm font-extrabold uppercase text-[#ffd8be]">
                  {siteConfig.experienceLevel}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#13101e]/90 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream/50">
                    STATUS
                  </p>
                  <OwnerEditButton
                    title="Availability Status"
                    value={siteConfig.availability}
                    onSave={(val) =>
                      updateSiteConfig((prev) => ({
                        ...prev,
                        availability: val,
                      }))
                    }
                  />
                </div>
                <p className="mt-1.5 font-display text-sm font-extrabold uppercase text-[#00BDFF]">
                  {siteConfig.availability}
                </p>
              </div>
            </div>

            {/* Hero Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              {onNavigate && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('portfolio')}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-6 py-3.5 font-display text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_12px_30px_rgba(223,0,255,0.25)] transition hover:brightness-105"
                  >
                    <span>Explore Portfolio</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('contact')}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#151221] px-6 py-3.5 font-display text-xs font-extrabold uppercase tracking-wider text-cream transition hover:border-[#ffd8be]/60 hover:bg-[#1e1930] hover:text-white"
                  >
                    <Mail className="h-4 w-4 text-[#ffd8be]" />
                    <span>Get In Touch</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* =================================================================
            2. MY STORY SECTION — CONCISE, AUTHENTIC NARRATIVE
           ================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="mt-20 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#151224]/95 via-[#110e1b]/95 to-[#161326]/95 p-7 shadow-[0_24px_60px_rgba(0,0,0,0.5)] sm:p-10 lg:mt-24 lg:p-12"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
            {/* Story Section Header (4 Columns) */}
            <div className="lg:col-span-4">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#ffd8be]">
                <span className="h-2 w-2 rounded-full bg-[#f694ff]" />
                <span>{siteConfig.aboutStoryHeading || 'MY STORY'}</span>
                <OwnerEditButton
                  title="Story Heading Tag"
                  value={siteConfig.aboutStoryHeading || 'MY STORY'}
                  onSave={(val) =>
                    updateSiteConfig((prev) => ({
                      ...prev,
                      aboutStoryHeading: val,
                    }))
                  }
                />
              </div>
              <h3 className="mt-3 font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-white sm:text-3xl">
                PURPOSEFUL DESIGN BUILT ON CLARITY &amp; CONSISTENCY.
              </h3>
              <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#FFD8BE] via-[#F5F2EB] to-[#C7A77D]" />
            </div>

            {/* Story Narrative Content (8 Columns) */}
            <div className="space-y-5 lg:col-span-8">
              <div className="flex flex-col items-start gap-1">
                <p className="text-base font-medium leading-relaxed text-white/95 sm:text-lg">
                  {siteConfig.aboutStoryLead ||
                    'My journey into graphic design began with a deep curiosity for how visual symbols, typography, and color systems shape the way people remember a brand.'}
                </p>
                <OwnerEditButton
                  title="Story Lead Paragraph"
                  description="Lead sentence of your design journey"
                  value={
                    siteConfig.aboutStoryLead ||
                    'My journey into graphic design began with a deep curiosity for how visual symbols, typography, and color systems shape the way people remember a brand.'
                  }
                  multiline
                  onSave={(val) =>
                    updateSiteConfig((prev) => ({
                      ...prev,
                      aboutStoryLead: val,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col items-start gap-1">
                <p className="text-sm leading-relaxed text-cream/75 sm:text-base">
                  {siteConfig.aboutStoryBody ||
                    'Focusing on visual identity and branding, I approach every project with clarity, structure, and purpose. My goal is to create meaningful and visually consistent designs—from distinctive logos and brand guidelines to cohesive social media graphics—that help businesses communicate their true identity with confidence.'}
                </p>
                <OwnerEditButton
                  title="Story Body Paragraph"
                  description="Detailed story and design approach narrative"
                  value={
                    siteConfig.aboutStoryBody ||
                    'Focusing on visual identity and branding, I approach every project with clarity, structure, and purpose. My goal is to create meaningful and visually consistent designs—from distinctive logos and brand guidelines to cohesive social media graphics—that help businesses communicate their true identity with confidence.'
                  }
                  multiline
                  onSave={(val) =>
                    updateSiteConfig((prev) => ({
                      ...prev,
                      aboutStoryBody: val,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-3">
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs font-semibold text-cream/90">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#ffd8be]" />
                  <span>Distinctive Brand Identity</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs font-semibold text-cream/90">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#f694ff]" />
                  <span>Consistent Visual Systems</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs font-semibold text-cream/90">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#a9cbff]" />
                  <span>Clear Brand Communication</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* =================================================================
            3. WHAT I DO — MY SERVICES
           ================================================================= */}
        <div className="mt-20 lg:mt-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
            className="flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#ffd8be]">
                <Layers className="h-4 w-4 text-[#f694ff]" />
                <span>MY SERVICES</span>
              </div>
              <h3 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
                WHAT I DO
              </h3>
            </div>

            {isOwnerMode && (
              <button
                type="button"
                onClick={() => openCMS('services')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-[#161324] px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-cream/85 transition hover:border-[#ffd8be]/50 hover:text-white"
              >
                <Edit3 className="h-3.5 w-3.5 text-[#ffd8be]" />
                <span>Edit Services</span>
              </button>
            )}
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-8">
            {siteConfig.services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#13101f]/95 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#f694ff]/40 hover:bg-[#171327] hover:shadow-[0_22px_50px_rgba(0,0,0,0.55)] sm:p-9 ${
                  index === 2 && siteConfig.services.length % 2 === 1
                    ? 'md:col-span-2 lg:col-span-1'
                    : ''
                }`}
              >
                {/* Top Subtle Gradient Bar */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] opacity-75 transition-opacity duration-300 group-hover:opacity-100"
                />

                {/* Header: number + icon */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-sm font-extrabold tracking-[0.2em] text-[#ffd8be]">
                    0{index + 1}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    {getServiceIcon(index)}
                  </div>
                </div>

                {/* Title + description (grows so every card's list starts on the same line) */}
                <div className="mt-8 flex-1">
                  <h4 className="font-display text-xl font-extrabold uppercase leading-snug tracking-tight text-white">
                    {service.title}
                  </h4>
                  <p className="mt-4 text-sm leading-7 text-cream/70 sm:text-[15px] sm:leading-7">
                    {service.description}
                  </p>
                </div>

                {/* Deliverables as a clean list */}
                {service.deliverables && service.deliverables.length > 0 && (
                  <ul
                    className={`mt-8 grid gap-x-8 gap-y-3.5 border-t border-white/10 pt-7 ${
                      index === 2 && siteConfig.services.length % 2 === 1
                        ? 'md:grid-cols-2 lg:grid-cols-1'
                        : ''
                    }`}
                  >
                    {service.deliverables.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-[13px] font-medium leading-6 text-cream/80"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffd8be]"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* =================================================================
            4. MY DESIGN TOOLS — TOOLS I WORK WITH
           ================================================================= */}
        <div className="mt-20 lg:mt-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
            className="flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#a9cbff]">
                <Sparkles className="h-4 w-4 text-[#ffd8be]" />
                <span>MY DESIGN TOOLS</span>
              </div>
              <h3 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
                TOOLS I WORK WITH
              </h3>
            </div>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {siteConfig.software.map((tool, index) => {
              const badgeStyle = TOOL_BADGE_STYLES[tool.shortCode] || {
                border: 'border-[#DF00FF]/35 group-hover:border-[#DF00FF]/70',
                bg: 'bg-[#1e162e]',
                text: 'text-[#DF00FF]',
                glow: 'from-[#DF00FF]/16 to-transparent',
                tag: 'CREATIVE SUITE',
              };

              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  className={`group relative overflow-hidden rounded-[1.75rem] border bg-[#13101f]/95 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.5)] ${badgeStyle.border}`}
                >
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${badgeStyle.glow} opacity-75 transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  <div className="relative z-10 flex items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${badgeStyle.logoBorder} ${badgeStyle.bg} font-display text-xl font-black ${badgeStyle.text} shadow-inner transition-transform duration-300 group-hover:scale-105`}
                    >
                      {tool.shortCode}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-cream/55">
                        {badgeStyle.tag}
                      </span>
                      <div className="mt-1 flex items-center justify-between">
                        <h4 className="font-display text-lg font-extrabold text-white">
                          {tool.name}
                        </h4>
                        <OwnerEditButton
                          title={`${tool.name} Description`}
                          value={tool.focus}
                          onSave={(val) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              software: prev.software.map((s, sIdx) =>
                                sIdx === index ? { ...s, focus: val } : s
                              ),
                            }))
                          }
                        />
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-cream/75 sm:text-sm">
                        {tool.focus}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* =================================================================
            5. MY DESIGN APPROACH — UNDERSTAND / CREATE / REFINE
           ================================================================= */}
        <div className="mt-20 lg:mt-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
          >
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#ffd8be]">
              <Compass className="h-4 w-4 text-[#f694ff]" />
              <span>WORKFLOW &amp; METHODOLOGY</span>
            </div>
            <h3 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              MY DESIGN APPROACH
            </h3>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {siteConfig.designPhilosophy.map((pillar, idx) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: idx * 0.08 }}
                className="group relative rounded-[1.75rem] border border-white/10 bg-[#13101f]/95 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#ffd8be]/40 hover:bg-[#171326]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-display text-3xl font-black tracking-tight"
                    style={{
                      backgroundImage:
                        'linear-gradient(135deg, #FFFFFF 0%, #FFD8BE 50%, #D4AF37 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    0{idx + 1}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent ml-4" />
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <h4 className="font-display text-xl font-extrabold uppercase tracking-wide text-white">
                    {pillar.title}
                  </h4>
                  <OwnerEditButton
                    title={`Approach Step ${idx + 1}`}
                    description="Edit approach step explanation"
                    value={pillar.detail}
                    multiline
                    onSave={(val) =>
                      updateSiteConfig((prev) => ({
                        ...prev,
                        designPhilosophy: prev.designPhilosophy.map((p, pIdx) =>
                          pIdx === idx ? { ...p, detail: val } : p
                        ),
                      }))
                    }
                  />
                </div>

                <p className="mt-3 text-sm leading-relaxed text-cream/75">
                  {pillar.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* =================================================================
            6. LET'S WORK TOGETHER SECTION — CALL TO ACTION
           ================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="relative mt-20 overflow-hidden rounded-[2.25rem] border border-white/12 bg-gradient-to-br from-[#19142b] via-[#120f1d] to-[#141b2d] p-8 sm:p-12 lg:mt-24 lg:p-14"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#f694ff]/15 blur-[100px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#a9cbff]/15 blur-[100px]"
          />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd8be]/30 bg-white/[0.04] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#ffd8be]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffd8be]" />
                LET&apos;S WORK TOGETHER
              </span>

              <div className="mt-4 flex items-start gap-2.5">
                <h3 className="font-display text-3xl font-black uppercase leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {siteConfig.aboutCtaHeading || "LET'S CREATE SOMETHING MEANINGFUL."}
                </h3>
                <OwnerEditButton
                  title="CTA Heading"
                  value={siteConfig.aboutCtaHeading || "LET'S CREATE SOMETHING MEANINGFUL."}
                  onSave={(val) =>
                    updateSiteConfig((prev) => ({
                      ...prev,
                      aboutCtaHeading: val,
                    }))
                  }
                />
              </div>

              <div className="mt-4 flex flex-col items-start gap-1">
                <p className="text-base leading-relaxed text-cream/80 sm:text-lg">
                  {siteConfig.aboutCtaSubtext ||
                    "Have a project in mind? Let's work together to build a strong and memorable visual identity for your brand."}
                </p>
                <OwnerEditButton
                  title="CTA Subtext"
                  value={
                    siteConfig.aboutCtaSubtext ||
                    "Have a project in mind? Let's work together to build a strong and memorable visual identity for your brand."
                  }
                  multiline
                  onSave={(val) =>
                    updateSiteConfig((prev) => ({
                      ...prev,
                      aboutCtaSubtext: val,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('contact');
                  } else {
                    window.location.hash = '#/contact';
                  }
                }}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-7 py-4 font-display text-xs font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_14px_35px_rgba(223,0,255,0.25)] transition hover:scale-[1.02] hover:brightness-105"
              >
                <span>Start A Conversation</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              {/* Social Profile Links */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {siteConfig.contact.socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-wider text-cream/85 transition hover:border-[#ffd8be]/50 hover:bg-white/[0.08] hover:text-white"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#ffd8be]" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
