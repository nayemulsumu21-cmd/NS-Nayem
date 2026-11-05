import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Heart, ThumbsUp, Edit3 } from 'lucide-react';
import { FilterCategory, ProjectItem } from '../data/projects';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { ResponsiveProjectImage } from './ResponsiveProjectImage';

interface ProjectCardProps {
  project: ProjectItem;
  activeFilter?: FilterCategory;
  onSelect: (project: ProjectItem) => void;
  onEdit?: (project: ProjectItem) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onEdit,
}) => {
  const {
    isOwnerMode,
    likedProjectIds,
    appreciatedProjectIds,
    toggleProjectLike,
    toggleProjectAppreciation,
  } = usePortfolioCMS();

  const isLiked = likedProjectIds.includes(project.id);
  const isAppreciated = appreciatedProjectIds.includes(project.id);

  const viewsCount = project.views ?? 0;
  const likesCount = project.likes ?? 0;
  const appreciationsCount = project.appreciations ?? 0;

  const crop = project.coverCrop ?? { zoom: 1, offsetX: 0, offsetY: 0 };
  const hasCustomCrop =
    crop.zoom !== 1 || crop.offsetX !== 0 || crop.offsetY !== 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full w-full flex-col"
    >
      {/*
       * STRICT UNIFORM THUMBNAIL CONTAINER (Behance 4:3 Standard Aspect Ratio)
       * Every card in the row has the exact same width and height.
       */}
      <div
        onClick={() => onSelect(project)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(project);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Open project details for ${project.title}`}
        className="relative aspect-[4/3] w-full shrink-0 cursor-pointer overflow-hidden rounded-xl bg-[#13111c] ring-1 ring-cream/10 transition-all duration-300 group-hover:ring-cream/30 focus:outline-none focus:ring-2 focus:ring-[#a9cbff]"
      >
        <ResponsiveProjectImage
          src={project.thumbnail}
          alt={project.title}
          mode="thumbnail"
          loading="lazy"
          decoding="async"
          style={
            hasCustomCrop
              ? {
                  transform: `translate(${crop.offsetX}%, ${crop.offsetY}%) scale(${crop.zoom})`,
                }
              : undefined
          }
          className={`block h-full w-full object-cover object-center transition-transform duration-500 ease-out ${
            hasCustomCrop ? '' : 'group-hover:scale-[1.03]'
          }`}
        />

        {/* Owner Quick-Edit Trigger (Hidden for Public Visitors) */}
        {isOwnerMode && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project);
            }}
            title="Edit Project in Studio Builder"
            aria-label={`Edit ${project.title}`}
            className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-lg border border-cream/25 bg-obsidian/90 px-2.5 py-1 font-display text-[10px] font-extrabold uppercase tracking-wider text-cream/95 shadow-md backdrop-blur-md transition duration-200 hover:border-[#a9cbff] hover:bg-[#a9cbff] hover:text-obsidian"
          >
            <Edit3 className="h-3 w-3" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* Fixed-Height Uniform Card Footer: Title, Category & Engagement Stats */}
      <div className="mt-2.5 flex h-[42px] shrink-0 items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <h3
            onClick={() => onSelect(project)}
            className="cursor-pointer truncate font-display text-[13px] font-bold leading-tight text-cream transition-colors group-hover:text-[#ffd8be]"
            title={project.title}
          >
            {project.title}
          </h3>
          <p className="mt-1 truncate text-[11px] font-medium leading-none text-cream/50">
            {project.categoryLabel}
          </p>
        </div>

        {/* Engagement Stats: Appreciation, Likes & Views */}
        <div className="flex shrink-0 items-center gap-2.5 pt-0.5 text-[11px] font-semibold text-cream/65">
          {/* Appreciation Interaction */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleProjectAppreciation(project.id);
            }}
            title={
              isAppreciated
                ? 'Appreciated (click to undo)'
                : 'Appreciate this project'
            }
            aria-label={`Appreciate ${project.title}`}
            className={`inline-flex items-center gap-1 transition-colors ${
              isAppreciated
                ? 'text-[#a9cbff]'
                : 'text-cream/65 hover:text-cream'
            }`}
          >
            <ThumbsUp
              className={`h-3.5 w-3.5 ${
                isAppreciated ? 'fill-[#a9cbff]/25 text-[#a9cbff]' : ''
              }`}
            />
            <span>{appreciationsCount.toLocaleString()}</span>
          </button>

          {/* Like Interaction */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleProjectLike(project.id);
            }}
            title={isLiked ? 'Liked (click to undo)' : 'Like this project'}
            aria-label={`Like ${project.title}`}
            className={`inline-flex items-center gap-1 transition-colors ${
              isLiked ? 'text-[#f694ff]' : 'text-cream/65 hover:text-cream'
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                isLiked ? 'fill-[#f694ff] text-[#f694ff]' : ''
              }`}
            />
            <span>{likesCount.toLocaleString()}</span>
          </button>

          {/* Views Counter */}
          <span
            className="inline-flex items-center gap-1 text-cream/55"
            title={`${viewsCount.toLocaleString()} project views`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{viewsCount.toLocaleString()}</span>
          </span>
        </div>
      </div>
    </motion.article>
  );
};
