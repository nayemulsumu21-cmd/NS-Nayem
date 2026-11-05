import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Tags,
  FileEdit,
  CheckCircle2,
  FolderKanban,
  Trash2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { FilterCategory, ProjectItem } from '../data/projects';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { CategoryFilter } from './CategoryFilter';
import { ProjectCard } from './ProjectCard';
import { OwnerEditButton } from './OwnerEditButton';

/** Maximum number of published projects displayed per page */
const PROJECTS_PER_PAGE = 20;

interface ProjectGalleryProps {
  mode?: 'homepage' | 'portfolio' | 'categories';
  activeCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
  onSelectProject: (project: ProjectItem, currentList: ProjectItem[]) => void;
}

type PaginationToken = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * Generates a clean Behance-style pagination token list:
 * e.g. [1, 2, 3, 4, 'ellipsis-end', 10]
 */
function buildPaginationTokens(
  currentPage: number,
  totalPages: number
): PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis-start',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    'ellipsis-start',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-end',
    totalPages,
  ];
}

/**
 * Reads the initial `page` query parameter from either `window.location.search`
 * or the hash query string (e.g. `#/home?page=2`). Defaults to 1.
 */
function readPageFromLocation(): number {
  if (typeof window === 'undefined') return 1;

  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = Number.parseInt(searchParams.get('page') || '', 10);
  if (Number.isFinite(fromSearch) && fromSearch >= 1) {
    return fromSearch;
  }

  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  if (queryIndex !== -1) {
    const hashParams = new URLSearchParams(hash.slice(queryIndex + 1));
    const fromHash = Number.parseInt(hashParams.get('page') || '', 10);
    if (Number.isFinite(fromHash) && fromHash >= 1) {
      return fromHash;
    }
  }

  return 1;
}

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({
  mode = 'homepage',
  activeCategory,
  onCategoryChange,
  onSelectProject,
}) => {
  const {
    siteConfig,
    categories,
    publishedProjects,
    draftProjects,
    isOwnerMode,
    openCMS,
    openProjectBuilder,
    updateProject,
    deleteProject,
    updateSiteConfig,
  } = usePortfolioCMS();

  const galleryTopRef = useRef<HTMLElement | null>(null);

  const [ownerViewTab, setOwnerViewTab] = useState<'published' | 'drafts'>(
    'published'
  );

  const [currentPage, setCurrentPage] = useState<number>(() =>
    readPageFromLocation()
  );

  const counts = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {
      all: publishedProjects.length,
    };
    for (const cat of categories) {
      if (cat.id !== 'all') {
        result[cat.id] = publishedProjects.filter(
          (p) =>
            p.category === cat.id ||
            ((cat.id === 'social-media' || cat.id === 'social-media-boost') &&
              (p.category === 'social-media' || p.category === 'social-media-boost'))
        ).length;
      }
    }
    return result;
  }, [publishedProjects, categories]);

  // Only published projects appear in the public gallery; drafts remain hidden unless owner explicitly views the Drafts tab
  const activeSourceProjects =
    isOwnerMode && ownerViewTab === 'drafts'
      ? draftProjects
      : publishedProjects;

  const displayedProjects = useMemo(() => {
    if (mode === 'homepage' || activeCategory === 'all') {
      return activeSourceProjects;
    }
    return activeSourceProjects.filter(
      (proj) =>
        proj.category === activeCategory ||
        ((activeCategory === 'social-media' || activeCategory === 'social-media-boost') &&
          (proj.category === 'social-media' || proj.category === 'social-media-boost'))
    );
  }, [mode, activeCategory, activeSourceProjects]);

  // Calculate total pages dynamically (20 projects per page, minimum 1 page, no unnecessary empty pages)
  const totalProjectsCount = displayedProjects.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalProjectsCount / PROJECTS_PER_PAGE)
  );

  // Clamp active page to valid range [1, totalPages]
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Synchronize URL when page changes so the selected page can be refreshed or shared
  const updateUrlPageParam = useCallback(
    (page: number) => {
      if (typeof window === 'undefined') return;
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      const [baseRouteRaw] = rawHash.split('?');
      const baseRoute =
        baseRouteRaw || (mode === 'homepage' ? 'home' : mode);
      const nextHash =
        page > 1 ? `#/${baseRoute}?page=${page}` : `#/${baseRoute}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    },
    [mode]
  );

  // Keep state clamped if totalPages shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      updateUrlPageParam(totalPages);
    }
  }, [currentPage, totalPages, updateUrlPageParam]);

  // Listen for browser back/forward or hash changes that include ?page=
  useEffect(() => {
    const syncFromUrl = () => {
      const urlPage = readPageFromLocation();
      setCurrentPage(Math.min(Math.max(1, urlPage), totalPages));
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, [totalPages]);

  // Slice the exact 20 projects for the active page:
  // Page 1: indices 0–19 (Projects 1–20)
  // Page 2: indices 20–39 (Projects 21–40)
  // Page 3: indices 40–59 (Projects 41–60)
  const startIndex = (safeCurrentPage - 1) * PROJECTS_PER_PAGE;
  const endIndex = Math.min(startIndex + PROJECTS_PER_PAGE, totalProjectsCount);

  const paginatedProjects = useMemo(
    () => displayedProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE),
    [displayedProjects, startIndex]
  );

  const paginationTokens = useMemo(
    () => buildPaginationTokens(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages]
  );

  const handlePageSelect = useCallback(
    (targetPage: number) => {
      const clamped = Math.min(Math.max(1, targetPage), totalPages);
      if (clamped === safeCurrentPage) return;
      setCurrentPage(clamped);
      updateUrlPageParam(clamped);

      // Smoothly scroll to the top of the project gallery section
      if (galleryTopRef.current) {
        const rect = galleryTopRef.current.getBoundingClientRect();
        const scrollTop = window.scrollY + rect.top - 84;
        window.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        });
      }
    },
    [safeCurrentPage, totalPages, updateUrlPageParam]
  );

  const handleSwitchOwnerTab = (tab: 'published' | 'drafts') => {
    setOwnerViewTab(tab);
    setCurrentPage(1);
    updateUrlPageParam(1);
  };

  const handleCategoryFilterSelect = (category: FilterCategory) => {
    onCategoryChange(category);
    setCurrentPage(1);
    updateUrlPageParam(1);
  };

  return (
    <section
      ref={galleryTopRef}
      id={mode === 'homepage' ? 'homepage-portfolio-showcase' : 'portfolio'}
      className={`relative w-full bg-obsidian text-cream ${
        mode === 'homepage'
          ? 'pt-6 pb-20 lg:pt-8 lg:pb-28'
          : 'pt-28 pb-24 lg:pt-32 lg:pb-28'
      }`}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-10">
        {/* STUDIO BAR ON HOMEPAGE: Prominent "CREATE PROJECT" Button + Published / Drafts Switcher (Owner Only) */}
        {mode === 'homepage' && isOwnerMode && (
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-cream/10 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSwitchOwnerTab('published')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-extrabold uppercase tracking-wider transition ${
                  ownerViewTab === 'published'
                    ? 'bg-[#1a1728] text-cream ring-1 ring-[#a9cbff]/50'
                    : 'text-cream/60 hover:text-cream'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#a9cbff]" />
                <span>Published Works ({publishedProjects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchOwnerTab('drafts')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-extrabold uppercase tracking-wider transition ${
                  ownerViewTab === 'drafts'
                    ? 'bg-[#1a1728] text-[#ffd8be] ring-1 ring-[#ffd8be]/50'
                    : 'text-cream/60 hover:text-cream'
                }`}
              >
                <FileEdit className="h-3.5 w-3.5 text-[#ffd8be]" />
                <span>Draft Projects ({draftProjects.length})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => openCMS('projects')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cream/15 bg-charcoal px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cream/85 transition hover:border-[#a9cbff] hover:text-cream"
              >
                <FolderKanban className="h-3.5 w-3.5 text-[#a9cbff]" />
                <span>Manage All</span>
              </button>

              <button
                type="button"
                onClick={() => openProjectBuilder('new')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-2.5 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>CREATE PROJECT</span>
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Portfolio / Categories Page Header & Filter Controls */}
        {mode !== 'homepage' && (
          <div className="mb-10">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-extrabold uppercase tracking-widest text-[#ffd8be]">
                    {mode === 'categories'
                      ? 'BROWSE BY CATEGORY'
                      : siteConfig.sectionHeadings.portfolioEyebrow}
                  </span>
                  {mode !== 'categories' && (
                    <OwnerEditButton
                      title="Portfolio Eyebrow"
                      value={siteConfig.sectionHeadings.portfolioEyebrow}
                      onSave={(val) =>
                        updateSiteConfig((prev) => ({
                          ...prev,
                          sectionHeadings: {
                            ...prev.sectionHeadings,
                            portfolioEyebrow: val,
                          },
                        }))
                      }
                    />
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2.5">
                  <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-cream sm:text-5xl">
                    {mode === 'categories'
                      ? 'PORTFOLIO CATEGORIES'
                      : siteConfig.sectionHeadings.portfolioHeading}
                  </h1>
                  {mode !== 'categories' && (
                    <OwnerEditButton
                      title="Portfolio Heading"
                      value={siteConfig.sectionHeadings.portfolioHeading}
                      onSave={(val) =>
                        updateSiteConfig((prev) => ({
                          ...prev,
                          sectionHeadings: {
                            ...prev.sectionHeadings,
                            portfolioHeading: val,
                          },
                        }))
                      }
                    />
                  )}
                </div>
              </div>

              {isOwnerMode && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => openCMS('categories')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cream/15 bg-charcoal px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#a9cbff] hover:text-[#a9cbff]"
                  >
                    <Tags className="h-3.5 w-3.5" />
                    <span>Edit Categories</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openProjectBuilder('new')}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-2.5 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-105"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>CREATE PROJECT</span>
                  </button>
                </div>
              )}
            </div>

            {/* Category Filter Tabs on Dedicated Portfolio & Categories Pages */}
            <div className="mt-8">
              <CategoryFilter
                categories={categories}
                activeCategory={activeCategory}
                counts={counts}
                onSelectCategory={handleCategoryFilterSelect}
              />
            </div>
          </div>
        )}

        {/* Empty State for Drafts */}
        {isOwnerMode &&
          ownerViewTab === 'drafts' &&
          displayedProjects.length === 0 && (
            <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-cream/10 bg-[#13111c] px-6 py-16 text-center">
              <p className="font-display text-base font-bold uppercase tracking-wider text-cream/85">
                No Draft Projects Yet
              </p>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-cream/60">
                When you start building a project and click &ldquo;Save as
                Draft&rdquo;, it will stay here privately until you publish it.
              </p>
              <button
                type="button"
                onClick={() => openProjectBuilder('new')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-2.5 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Project</span>
              </button>
            </div>
          )}

        {/*
         * STRICT UNIFORM 5-COLUMN BEHANCE PROJECT GRID
         * - Displays up to 20 published projects per page (4 rows of 5 on desktop)
         * - Standard & Large Desktop (>= 1200px): Exactly 5 equal-width & equal-height cards per row
         * - Smaller Desktop (1024px–1199px): 4 equal cards per row
         * - Tablet (768px–1023px): 3 equal cards per row
         * - Small Tablet / Large Mobile (640px–767px): 2 equal cards per row
         * - Mobile (< 640px): 1 card per row
         */}
        <motion.div
          layout
          className="grid grid-cols-1 items-stretch gap-x-5 gap-y-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1200px]:grid-cols-5"
        >
          <AnimatePresence mode="popLayout">
            {paginatedProjects.map((project) => (
              <div key={project.id} className="relative flex flex-col">
                <ProjectCard
                  project={project}
                  activeFilter={mode === 'homepage' ? 'all' : activeCategory}
                  onSelect={(selected) =>
                    onSelectProject(selected, displayedProjects)
                  }
                  onEdit={(proj) => openProjectBuilder(proj.id)}
                />

                {/* Draft Management Action Bar when viewing Drafts */}
                {isOwnerMode && ownerViewTab === 'drafts' && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#ffd8be]/30 bg-[#171422] px-3 py-2 text-[11px]">
                    <span className="font-display font-bold uppercase tracking-wider text-[#ffd8be]">
                      Draft
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openProjectBuilder(project.id)}
                        className="rounded-lg bg-charcoal px-2.5 py-1 font-display font-bold uppercase text-cream hover:text-[#a9cbff]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateProject(project.id, {
                            status: 'published',
                            visible: true,
                          });
                          handleSwitchOwnerTab('published');
                        }}
                        className="rounded-lg bg-[#a9cbff] px-2.5 py-1 font-display font-bold uppercase text-obsidian hover:brightness-110"
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProject(project.id)}
                        title="Delete Draft"
                        className="rounded-lg p-1 text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* =================================================================
            PAGINATION NAVIGATION BAR BELOW THE PROJECT GRID
            - Automatically calculates pages based on published projects (20 per page)
            - Page 1: Projects 1–20 | Page 2: Projects 21–40 | Page 3: Projects 41–60 ...
            - Disables Previous on Page 1 and Next on the last page
           ================================================================= */}
        {totalProjectsCount > 0 && (
          <div className="mt-14 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-8 sm:flex-row">
            {/* Project Range & Page Summary */}
            <div className="flex items-center gap-2.5 text-xs font-medium text-cream/65">
              <span>
                Showing{' '}
                <strong className="font-display font-bold text-white">
                  {startIndex + 1}&ndash;{endIndex}
                </strong>{' '}
                of{' '}
                <strong className="font-display font-bold text-white">
                  {totalProjectsCount}
                </strong>{' '}
                {ownerViewTab === 'drafts'
                  ? 'draft projects'
                  : 'published projects'}
              </span>
              <span className="text-white/20">&bull;</span>
              <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[#ffd8be]">
                Page {safeCurrentPage} of {totalPages}
              </span>
            </div>

            {/* Pagination Controls: ← Previous   1   2   3   4   ...   Next → */}
            <nav
              aria-label="Portfolio project pagination"
              className="flex flex-wrap items-center justify-center gap-2"
            >
              {/* ← Previous Button */}
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => handlePageSelect(safeCurrentPage - 1)}
                aria-label="Previous page"
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                  safeCurrentPage <= 1
                    ? 'cursor-not-allowed border-white/8 bg-[#12101b]/50 text-cream/30'
                    : 'border-white/14 bg-[#151221] text-cream hover:-translate-y-0.5 hover:border-[#00BDFF]/60 hover:bg-[#1c182c] hover:text-white'
                }`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>

              {/* Page Numbers */}
              <div className="flex flex-wrap items-center gap-1.5">
                {paginationTokens.map((token) => {
                  if (
                    token === 'ellipsis-start' ||
                    token === 'ellipsis-end'
                  ) {
                    return (
                      <span
                        key={token}
                        aria-hidden="true"
                        className="inline-flex h-10 w-9 items-center justify-center font-display text-xs font-bold text-cream/45 select-none"
                      >
                        &hellip;
                      </span>
                    );
                  }

                  const isActive = token === safeCurrentPage;
                  return (
                    <button
                      key={token}
                      type="button"
                      onClick={() => handlePageSelect(token)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={`Page ${token}`}
                      className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl px-3 font-display text-xs font-extrabold transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] text-white shadow-[0_8px_24px_rgba(223,0,255,0.35)]'
                          : 'border border-white/12 bg-[#151221] text-cream/80 hover:-translate-y-0.5 hover:border-[#00BDFF]/50 hover:bg-[#1d182d] hover:text-white'
                      }`}
                    >
                      {token}
                    </button>
                  );
                })}
              </div>

              {/* Next → Button */}
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => handlePageSelect(safeCurrentPage + 1)}
                aria-label="Next page"
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                  safeCurrentPage >= totalPages
                    ? 'cursor-not-allowed border-white/8 bg-[#12101b]/50 text-cream/30'
                    : 'border-white/14 bg-[#151221] text-cream hover:-translate-y-0.5 hover:border-[#00BDFF]/60 hover:bg-[#1c182c] hover:text-white'
                }`}
              >
                <span>Next</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </section>
  );
};
