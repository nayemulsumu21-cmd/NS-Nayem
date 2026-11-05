import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  ThumbsUp,
  Layers,
  Wrench,
  Edit3,
  Tag,
  X,
  Maximize2,
  FileEdit,
} from 'lucide-react';
import { ProjectItem, getProjectBlocks } from '../data/projects';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { ProjectCard } from './ProjectCard';
import { ResponsiveProjectImage } from './ResponsiveProjectImage';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
  onSelectProject: (project: ProjectItem) => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onBack,
  onSelectProject,
}) => {
  const {
    siteConfig,
    projects,
    publishedProjects,
    isOwnerMode,
    likedProjectIds,
    appreciatedProjectIds,
    recordProjectView,
    toggleProjectLike,
    toggleProjectAppreciation,
    openProjectBuilder,
  } = usePortfolioCMS();

  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    caption: string;
  } | null>(null);

  const sourceList = isOwnerMode ? projects : publishedProjects;

  const project = useMemo(
    () => sourceList.find((p) => p.id === projectId) || null,
    [sourceList, projectId]
  );

  const currentIndex = useMemo(
    () => publishedProjects.findIndex((p) => p.id === projectId),
    [publishedProjects, projectId]
  );

  // Record a unique project view when a visitor opens this project detail page
  useEffect(() => {
    if (project?.id) {
      recordProjectView(project.id);
      setLightboxImage(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [project?.id, recordProjectView]);

  if (!project) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center bg-obsidian px-4 pt-28 pb-20 text-center text-cream">
        <p className="font-display text-xl font-bold uppercase text-cream">
          Project Not Found
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cream/20 bg-charcoal px-5 py-3 font-display text-xs font-bold uppercase tracking-widest text-cream transition hover:border-[#a9cbff]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Portfolio</span>
        </button>
      </section>
    );
  }

  const isLiked = likedProjectIds.includes(project.id);
  const isAppreciated = appreciatedProjectIds.includes(project.id);
  const viewsCount = project.views ?? 0;
  const likesCount = project.likes ?? 0;
  const appreciationsCount = project.appreciations ?? 0;

  const contentBlocks = getProjectBlocks(project);
  const canvasStyle = project.canvasStyle ?? {
    backgroundColor: '#0b0a10',
    blockSpacing: 0,
    maxWidth: 'wide',
  };

  // Normalize legacy default spacing (20) to 0 for seamless Behance vertical stacking unless custom spacing was chosen
  const effectiveBlockSpacing =
    typeof canvasStyle.blockSpacing === 'number' &&
    canvasStyle.blockSpacing !== 20
      ? canvasStyle.blockSpacing
      : 0;

  const maxWidthClass =
    canvasStyle.maxWidth === 'full'
      ? 'max-w-full'
      : canvasStyle.maxWidth === 'wide'
        ? 'max-w-[1440px]'
        : 'max-w-[1120px]';

  const isLightCanvas =
    canvasStyle.backgroundColor.toLowerCase() === '#f5f2eb';

  const handlePrevProject = () => {
    if (publishedProjects.length === 0) return;
    const baseIdx = currentIndex >= 0 ? currentIndex : 0;
    const prevIdx =
      (baseIdx - 1 + publishedProjects.length) % publishedProjects.length;
    onSelectProject(publishedProjects[prevIdx]);
  };

  const handleNextProject = () => {
    if (publishedProjects.length === 0) return;
    const baseIdx = currentIndex >= 0 ? currentIndex : 0;
    const nextIdx = (baseIdx + 1) % publishedProjects.length;
    onSelectProject(publishedProjects[nextIdx]);
  };

  const relatedProjects = publishedProjects
    .filter((p) => p.id !== project.id)
    .slice(0, 5);

  return (
    <section className="min-h-screen w-full bg-obsidian pt-24 pb-20 text-cream lg:pt-28">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        {/* Owner Staged Draft Notice Banner (if unpublished edits were saved via "Save Changes") */}
        {isOwnerMode && project.unpublishedDraft && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ffd8be]/40 bg-[#1b1628] px-5 py-3.5 text-xs">
            <div className="flex items-center gap-2.5">
              <FileEdit className="h-4 w-4 shrink-0 text-[#ffd8be]" />
              <span className="font-medium text-cream/90">
                You have saved unpublished edits for this project (saved{' '}
                {new Date(
                  project.unpublishedDraft.savedAt
                ).toLocaleTimeString()}
                ). Public visitors currently see the live published version
                below.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openProjectBuilder(project.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-105"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Resume Editing &amp; Publish</span>
            </button>
          </div>
        )}

        {/* Top Action & Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cream/10 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-cream/15 bg-charcoal px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#a9cbff] hover:text-[#a9cbff]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Gallery</span>
            </button>

            <span className="rounded-full border border-cream/15 bg-[#161322] px-3.5 py-1 font-display text-[11px] font-bold uppercase tracking-widest text-[#ffd8be]">
              {project.categoryLabel}
            </span>

            {isOwnerMode && (
              <span
                className={`rounded-full px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-widest ${
                  project.status === 'draft' || project.visible === false
                    ? 'border border-[#ffd8be]/40 bg-[#ffd8be]/15 text-[#ffd8be]'
                    : 'border border-emerald-400/30 bg-emerald-400/15 text-emerald-300'
                }`}
              >
                {project.status === 'draft' || project.visible === false
                  ? 'Draft (Private)'
                  : 'Published'}
              </span>
            )}
          </div>

          {/* Right: Owner Edit Button + Engagement Bar + Next/Prev */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Prominent Owner Edit Project Button */}
            {isOwnerMode && (
              <button
                type="button"
                onClick={() => openProjectBuilder(project.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-4 py-2 font-display text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Project</span>
              </button>
            )}

            {/* Appreciate Button */}
            <button
              type="button"
              onClick={() => toggleProjectAppreciation(project.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition ${
                isAppreciated
                  ? 'border-[#a9cbff] bg-[#a9cbff]/15 text-[#a9cbff]'
                  : 'border-cream/15 bg-charcoal text-cream/85 hover:border-[#a9cbff] hover:text-[#a9cbff]'
              }`}
            >
              <ThumbsUp
                className={`h-3.5 w-3.5 ${
                  isAppreciated ? 'fill-[#a9cbff]/30 text-[#a9cbff]' : ''
                }`}
              />
              <span>Appreciate</span>
              <span className="rounded-md bg-obsidian/70 px-2 py-0.5 text-[11px]">
                {appreciationsCount.toLocaleString()}
              </span>
            </button>

            {/* Like Button */}
            <button
              type="button"
              onClick={() => toggleProjectLike(project.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition ${
                isLiked
                  ? 'border-[#f694ff] bg-[#f694ff]/15 text-[#f694ff]'
                  : 'border-cream/15 bg-charcoal text-cream/85 hover:border-[#f694ff] hover:text-[#f694ff]'
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  isLiked ? 'fill-[#f694ff] text-[#f694ff]' : ''
                }`}
              />
              <span>Like</span>
              <span className="rounded-md bg-obsidian/70 px-2 py-0.5 text-[11px]">
                {likesCount.toLocaleString()}
              </span>
            </button>

            {/* Views Indicator */}
            <div className="inline-flex items-center gap-2 rounded-xl border border-cream/12 bg-[#13111c] px-3.5 py-2 font-display text-xs font-bold text-cream/75">
              <Eye className="h-3.5 w-3.5 text-[#ffd8be]" />
              <span>{viewsCount.toLocaleString()} Views</span>
            </div>

            {/* Prev / Next Project */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevProject}
                aria-label="Previous project"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream/15 bg-charcoal text-cream transition hover:border-[#a9cbff] hover:text-[#a9cbff]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextProject}
                aria-label="Next project"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream/15 bg-charcoal text-cream transition hover:border-[#a9cbff] hover:text-[#a9cbff]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Project Header Metadata Block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mt-8 grid grid-cols-1 gap-8 rounded-3xl border border-cream/10 bg-[#13111c] p-6 sm:p-8 lg:grid-cols-12"
        >
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-xs font-bold uppercase tracking-widest text-[#ffd8be]">
                {siteConfig.name} &bull; {project.categoryLabel}
              </p>

              {isOwnerMode && (
                <button
                  type="button"
                  onClick={() => openProjectBuilder(project.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#a9cbff]/35 bg-[#1b182c] px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-[#a9cbff] transition hover:border-[#a9cbff] hover:bg-[#a9cbff] hover:text-obsidian"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit Project Content &amp; Images</span>
                </button>
              )}
            </div>

            <h1 className="mt-2 font-display text-2xl font-extrabold uppercase leading-tight text-cream sm:text-4xl">
              {project.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-cream/80 sm:text-base">
              {project.description}
            </p>

            {/* Project Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-cream/50" />
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-cream/12 bg-obsidian px-3 py-1 text-[11px] font-medium text-cream/75"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-5 border-t border-cream/10 pt-5 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-editorial text-[#ffd8be]">
                <Layers className="h-3.5 w-3.5" />
                <span>DELIVERABLES</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.deliverables.map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-cream/12 bg-obsidian px-2.5 py-1 text-xs text-cream/85"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-editorial text-[#a9cbff]">
                <Wrench className="h-3.5 w-3.5" />
                <span>TOOLS USED</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-lg border border-[#a9cbff]/30 bg-[#1b2238] px-2.5 py-1 font-display text-xs font-semibold text-cream"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/*
         * BEHANCE-STYLE FULL-WIDTH CONTINUOUS VERTICAL PRESENTATION
         * - Preserves original uploaded image dimensions, proportions, and complete height
         * - Zero automatic object-fit: cover, zero fixed-height containers, zero max-h shrinking
         * - Continuous vertical stack without unnecessary padding or gaps between consecutive slides
         */}
        <div
          style={{
            backgroundColor: canvasStyle.backgroundColor,
            gap: `${effectiveBlockSpacing}px`,
          }}
          className={`mx-auto mt-8 flex w-full ${maxWidthClass} flex-col overflow-hidden rounded-2xl border border-cream/10 ${
            isLightCanvas ? 'text-obsidian' : 'text-cream'
          }`}
        >
          {contentBlocks.map((block, idx) => {
            if (block.type === 'image') {
              return (
                <div
                  key={block.id}
                  className={`group/slide relative leading-none ${
                    block.layout === 'contained'
                      ? 'mx-auto w-full max-w-[1120px]'
                      : 'w-full'
                  }`}
                >
                  <ResponsiveProjectImage
                    src={block.imageUrl || ''}
                    alt={block.caption || project.title}
                    mode="detail"
                    loading={idx < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                    onClick={() =>
                      block.imageUrl &&
                      setLightboxImage({
                        url: block.imageUrl,
                        caption: block.caption || project.title,
                      })
                    }
                    className="block h-auto w-full max-w-full cursor-zoom-in select-none"
                  />

                  {/* Subtle Fullscreen Inspect Button on Hover (Does not affect image size or layout) */}
                  {block.imageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          url: block.imageUrl!,
                          caption: block.caption || project.title,
                        })
                      }
                      title="Inspect full-resolution image"
                      className=" absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-obsidian/80 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-cream opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover/slide:opacity-100 hover:border-[#a9cbff] hover:text-[#a9cbff]"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Full View</span>
                    </button>
                  )}
                </div>
              );
            }

            if (block.type === 'heading') {
              return (
                <div
                  key={block.id}
                  className={`px-6 py-8 sm:px-12 sm:py-10 ${
                    block.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight sm:text-4xl">
                    {block.text}
                  </h2>
                  {block.subtext && (
                    <p className="mt-1.5 font-display text-xs font-bold uppercase tracking-widest text-[#ffd8be]">
                      {block.subtext}
                    </p>
                  )}
                </div>
              );
            }

            if (block.type === 'text') {
              return (
                <div
                  key={block.id}
                  className={`px-6 py-6 sm:px-12 ${
                    block.align === 'center'
                      ? 'mx-auto max-w-3xl text-center'
                      : 'max-w-4xl text-left'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed opacity-85 sm:text-base">
                    {block.text}
                  </p>
                </div>
              );
            }

            if (block.type === 'photo-grid') {
              return (
                <div key={block.id} className="w-full">
                  <div
                    className={`grid grid-cols-1 gap-0 ${
                      block.columns === 3
                        ? 'sm:grid-cols-3'
                        : 'sm:grid-cols-2'
                    }`}
                  >
                    {(block.gridImages || []).map((gi) => (
                      <div key={gi.id} className="w-full leading-none">
                        <img
                          src={gi.url}
                          alt={gi.caption || project.title}
                          loading="lazy"
                          decoding="async"
                          onClick={() =>
                            setLightboxImage({
                              url: gi.url,
                              caption: gi.caption || project.title,
                            })
                          }
                          className="block h-auto w-full max-w-full cursor-zoom-in"
                        />
                      </div>
                    ))}
                  </div>
                  {block.caption && (
                    <p className="py-3 text-center text-xs opacity-65">
                      {block.caption}
                    </p>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Behance-Style Bottom Appreciation & Engagement Module */}
        <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-cream/10 bg-[#13111c] px-6 py-10 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-[#ffd8be]">
            {project.categoryLabel}
          </p>
          <h2 className="mt-2 font-display text-xl font-extrabold uppercase text-cream sm:text-2xl">
            {project.title}
          </h2>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => toggleProjectAppreciation(project.id)}
              className={`inline-flex items-center gap-2.5 rounded-2xl border px-6 py-3.5 font-display text-xs font-extrabold uppercase tracking-widest transition-all ${
                isAppreciated
                  ? 'border-[#a9cbff] bg-[#a9cbff] text-obsidian'
                  : 'border-cream/20 bg-obsidian text-cream hover:border-[#a9cbff] hover:text-[#a9cbff]'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>
                {isAppreciated ? 'Appreciated' : 'Appreciate Project'} (
                {appreciationsCount.toLocaleString()})
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleProjectLike(project.id)}
              className={`inline-flex items-center gap-2.5 rounded-2xl border px-6 py-3.5 font-display text-xs font-extrabold uppercase tracking-widest transition-all ${
                isLiked
                  ? 'border-[#f694ff] bg-[#f694ff] text-obsidian'
                  : 'border-cream/20 bg-obsidian text-cream hover:border-[#f694ff] hover:text-[#f694ff]'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${isLiked ? 'fill-obsidian' : ''}`}
              />
              <span>
                {isLiked ? 'Liked' : 'Like Project'} (
                {likesCount.toLocaleString()})
              </span>
            </button>

            {isOwnerMode && (
              <button
                type="button"
                onClick={() => openProjectBuilder(project.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#ffd8be]/40 bg-[#1a1528] px-6 py-3.5 font-display text-xs font-extrabold uppercase tracking-widest text-[#ffd8be] transition-all hover:border-[#ffd8be] hover:bg-[#ffd8be] hover:text-obsidian"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Project</span>
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center gap-5 text-xs font-semibold text-cream/60">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-[#ffd8be]" />
              {viewsCount.toLocaleString()} Views
            </span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5 text-[#a9cbff]" />
              {appreciationsCount.toLocaleString()} Appreciations
            </span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-[#f694ff]" />
              {likesCount.toLocaleString()} Likes
            </span>
          </div>
        </div>

        {/* More Projects Section (Uniform 5-Column Grid) */}
        {relatedProjects.length > 0 && (
          <div className="mt-16 border-t border-cream/10 pt-12">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wider text-cream">
                More Projects by {siteConfig.name}
              </h3>
              <button
                type="button"
                onClick={onBack}
                className="font-display text-xs font-bold uppercase tracking-widest text-[#a9cbff] transition hover:text-cream"
              >
                View All Projects &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 items-stretch gap-x-5 gap-y-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1200px]:grid-cols-5">
              {relatedProjects.map((rel) => (
                <ProjectCard
                  key={rel.id}
                  project={rel}
                  onSelect={(selected) => onSelectProject(selected)}
                  onEdit={(proj) => openProjectBuilder(proj.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-Resolution Natural Aspect Ratio Lightbox Inspector */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-obsidian/95 p-4 backdrop-blur-xl sm:p-10"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close full resolution view"
            className="fixed right-6 top-6 z-[96] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-charcoal text-cream shadow-lg transition hover:border-[#a9cbff] hover:text-[#a9cbff]"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-[1600px]"
          >
            <ResponsiveProjectImage
              src={lightboxImage.url}
              alt={lightboxImage.caption}
              mode="fullscreen"
              loading="eager"
              decoding="sync"
              className="mx-auto block h-auto max-w-full"
            />
          </div>
        </div>
      )}
    </section>
  );
};
