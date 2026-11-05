import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Eye,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { ProjectItem } from '../data/projects';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';

interface FeaturedSliderProps {
  onSelectProject: (project: ProjectItem) => void;
}

const AUTOPLAY_INTERVAL_MS = 4800;

export const FeaturedSlider: React.FC<FeaturedSliderProps> = ({
  onSelectProject,
}) => {
  const { siteConfig, featuredProjects, openCMS } = usePortfolioCMS();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [isHoveredOrFocused, setIsHoveredOrFocused] = useState(false);
  const [progress, setProgress] = useState(0);

  const total = featuredProjects.length;
  const safeIndex = total > 0 ? currentIndex % total : 0;
  const activeProject = featuredProjects[safeIndex] ?? featuredProjects[0];

  const goToIndex = useCallback(
    (nextIdx: number, dir?: 1 | -1) => {
      if (total === 0) return;
      const normalized = ((nextIdx % total) + total) % total;
      setDirection(dir ?? (normalized > safeIndex ? 1 : -1));
      setCurrentIndex(normalized);
      setProgress(0);
    },
    [safeIndex, total]
  );

  const handleNext = useCallback(() => {
    goToIndex(safeIndex + 1, 1);
  }, [safeIndex, goToIndex]);

  const handlePrev = useCallback(() => {
    goToIndex(safeIndex - 1, -1);
  }, [safeIndex, goToIndex]);

  const isRunning =
    isAutoplayEnabled && !isHoveredOrFocused && !shouldReduceMotion && total > 1;

  useEffect(() => {
    if (!isRunning) return;

    const tickMs = 50;
    const step = (tickMs / AUTOPLAY_INTERVAL_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [isRunning, handleNext]);

  if (!activeProject) return null;

  return (
    <section
      aria-label="Featured Works Showcase"
      className="relative overflow-hidden bg-obsidian py-24 text-cream studio-grid-dark lg:py-32"
    >
      {/* Portrait-Matched Ambient Spotlight */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5c4577]/20 blur-[160px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header + Controls */}
        <div className="flex flex-col justify-between gap-6 border-b border-cream/10 pb-8 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#5c4577] font-display text-xs font-bold text-cream">
                02
              </span>
              <span className="font-display text-xs font-extrabold uppercase tracking-widest text-[#f1b39c]">
                {siteConfig.sectionHeadings.featuredEyebrow}
              </span>
            </div>
            <h2 className="mt-4 font-display text-3xl font-extrabold uppercase tracking-tight text-cream sm:text-5xl">
              {siteConfig.sectionHeadings.featuredHeading}
            </h2>
          </div>

          {/* Interactive Transport Controls: Pause/Resume + Prev/Next */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openCMS('projects', activeProject.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cream/15 bg-charcoal px-3.5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#7ca6e8] transition hover:border-[#7ca6e8]"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Slide</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAutoplayEnabled((prev) => !prev)}
              aria-pressed={!isAutoplayEnabled}
              className="inline-flex items-center gap-2 rounded-xl border border-cream/15 bg-charcoal px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#f1b39c] hover:text-[#f1b39c]"
            >
              {isAutoplayEnabled ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-[#f1b39c]" />
                  <span>{isHoveredOrFocused ? 'Paused' : 'Pause'}</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-[#f1b39c]" />
                  <span>Resume</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous featured project"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-cream/15 bg-charcoal text-cream transition hover:border-[#7ca6e8] hover:bg-[#7ca6e8] hover:text-obsidian"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next featured project"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-cream/15 bg-charcoal text-cream transition hover:border-[#7ca6e8] hover:bg-[#7ca6e8] hover:text-obsidian"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Interactive 3D Showcase Stage */}
        <div
          onMouseEnter={() => setIsHoveredOrFocused(true)}
          onMouseLeave={() => setIsHoveredOrFocused(false)}
          onFocusCapture={() => setIsHoveredOrFocused(true)}
          onBlurCapture={() => setIsHoveredOrFocused(false)}
          className="perspective-1600 mt-10"
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeProject.id}
              custom={direction}
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      x: direction > 0 ? 70 : -70,
                      scale: 0.96,
                      rotateY: direction > 0 ? -8 : 8,
                    }
              }
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                rotateY: 0,
              }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      x: direction > 0 ? -70 : 70,
                      scale: 0.96,
                      rotateY: direction > 0 ? 8 : -8,
                    }
              }
              transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-cream/12 bg-charcoal/90 p-5 shadow-studio backdrop-blur-xl sm:p-8 lg:grid-cols-12 lg:gap-10"
            >
              {/* Featured Project Visual (7 Columns) */}
              <div className="lg:col-span-7">
                <div
                  onClick={() => onSelectProject(activeProject)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectProject(activeProject);
                    }
                  }}
                  aria-label={`Inspect ${activeProject.title}`}
                  className="group relative aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-2xl border border-cream/10 bg-obsidian"
                >
                  <img
                    src={activeProject.featuredCover ?? activeProject.fullImage}
                    alt={activeProject.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />

                  <div className="absolute inset-0 flex items-center justify-center bg-obsidian/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-3 font-display text-xs font-bold uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]">
                      <Eye className="h-4 w-4" />
                      <span>View Project</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Featured Project Editorial Details (5 Columns) */}
              <div className="flex flex-col justify-between lg:col-span-5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd8be]/30 bg-white/[0.04] px-3.5 py-1 font-display text-xs font-bold uppercase tracking-wider text-[#ffd8be]">
                      <Sparkles className="h-3 w-3 text-[#ffd8be]" />
                      {activeProject.categoryLabel}
                    </span>
                    <span className="font-display text-xs font-bold tracking-widest text-cream/70">
                      <span className="text-[#ffd8be]">0{safeIndex + 1}</span> / 0{total}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-cream sm:text-3xl">
                    {activeProject.title}
                  </h3>

                  <p className="mt-4 text-sm leading-relaxed text-cream/85 sm:text-base">
                    {activeProject.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {activeProject.deliverables.map((item) => (
                      <span
                        key={item}
                        className="rounded-lg border border-cream/12 bg-obsidian/80 px-3 py-1.5 text-xs font-medium text-cream/90"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* View Project Button */}
                <div className="mt-8 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onSelectProject(activeProject)}
                    className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-6 py-3.5 font-display text-xs font-bold uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <Eye className="h-4 w-4" />
                    <span>VIEW PROJECT</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Pagination Indicators */}
          <div className="mt-8 flex items-center justify-center sm:justify-start">
            <div
              role="tablist"
              aria-label="Featured project slides"
              className="flex items-center gap-2.5"
            >
              {featuredProjects.map((proj, idx) => {
                const isCurrent = idx === safeIndex;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    aria-label={`Show featured project ${idx + 1}: ${proj.title}`}
                    onClick={() => goToIndex(idx)}
                    className={`group relative h-2.5 overflow-hidden rounded-full transition-all duration-300 ${
                      isCurrent
                        ? 'w-14 bg-slate'
                        : 'w-3 bg-slate hover:bg-[#00BDFF]/60'
                    }`}
                  >
                    {isCurrent && (
                      <span
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] transition-all duration-75"
                        style={{ width: `${isAutoplayEnabled ? progress : 100}%` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
