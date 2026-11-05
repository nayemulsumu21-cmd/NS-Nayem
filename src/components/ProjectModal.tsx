import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  Wrench,
  Edit3,
} from 'lucide-react';
import { ProjectItem } from '../data/projects';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';

interface ProjectModalProps {
  project: ProjectItem | null;
  projectList: ProjectItem[];
  onClose: () => void;
  onSelectProject: (project: ProjectItem) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  projectList,
  onClose,
  onSelectProject,
}) => {
  const { openCMS } = usePortfolioCMS();
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  useEffect(() => {
    setIsZoomed(false);
    setActiveSheetIndex(0);
  }, [project?.id]);

  const currentIndex = project
    ? projectList.findIndex((p) => p.id === project.id)
    : -1;

  const handlePrev = useCallback(() => {
    if (!project || projectList.length === 0) return;
    const prevIdx =
      (currentIndex - 1 + projectList.length) % projectList.length;
    onSelectProject(projectList[prevIdx]);
  }, [project, projectList, currentIndex, onSelectProject]);

  const handleNext = useCallback(() => {
    if (!project || projectList.length === 0) return;
    const nextIdx = (currentIndex + 1) % projectList.length;
    onSelectProject(projectList[nextIdx]);
  }, [project, projectList, currentIndex, onSelectProject]);

  useEffect(() => {
    if (!project) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [project, onClose, handlePrev, handleNext]);

  const activeImageSrc =
    project?.sheets && project.sheets[activeSheetIndex]
      ? project.sheets[activeSheetIndex].image
      : project?.fullImage;

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          key="project-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-project-title"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-obsidian/92 p-3 backdrop-blur-2xl sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-cream/15 bg-charcoal text-cream shadow-studio"
          >
            {/* Top Modal Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream/10 bg-obsidian/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[#7ca6e8]/45 bg-[#344975]/40 px-3.5 py-1 font-display text-[11px] font-bold uppercase tracking-widest text-[#f1b39c]">
                  {project.categoryLabel}
                </span>
                <span className="text-xs font-medium text-stone">
                  {currentIndex + 1} / {projectList.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = project.id;
                    onClose();
                    openCMS('projects', targetId);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cream/15 bg-charcoal px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#7ca6e8] transition hover:border-[#7ca6e8]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider transition ${
                    isZoomed
                      ? 'border-[#7ca6e8] bg-[#7ca6e8] text-obsidian'
                      : 'border-cream/15 bg-charcoal text-cream hover:border-[#7ca6e8] hover:text-[#7ca6e8]'
                  }`}
                >
                  {isZoomed ? (
                    <>
                      <ZoomOut className="h-4 w-4" />
                      <span>Fit</span>
                    </>
                  ) : (
                    <>
                      <ZoomIn className="h-4 w-4" />
                      <span>Zoom</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous project"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream/15 bg-charcoal text-cream transition hover:border-[#7ca6e8] hover:text-[#7ca6e8]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next project"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream/15 bg-charcoal text-cream transition hover:border-[#7ca6e8] hover:text-[#7ca6e8]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close project preview"
                  className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl border border-cream/20 bg-obsidian text-cream transition hover:border-[#7ca6e8] hover:bg-[#7ca6e8] hover:text-obsidian"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Main Body */}
            <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
              <div className="relative flex flex-col items-center justify-center overflow-auto bg-obsidian p-4 sm:p-8 lg:col-span-8">
                <div
                  className={`transition-all duration-300 ${
                    isZoomed
                      ? 'w-[185%] max-w-none cursor-zoom-out'
                      : 'flex max-h-[68vh] w-full items-center justify-center cursor-zoom-in'
                  }`}
                  onClick={() => setIsZoomed((prev) => !prev)}
                >
                  <img
                    src={activeImageSrc}
                    alt={project.title}
                    className={`rounded-xl border border-cream/10 shadow-studio ${
                      isZoomed
                        ? 'h-auto w-full object-contain'
                        : 'max-h-[64vh] w-auto max-w-full object-contain'
                    }`}
                  />
                </div>

                {project.sheets && project.sheets.length > 1 && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {project.sheets.map((sheet, idx) => (
                      <button
                        key={sheet.label}
                        type="button"
                        onClick={() => setActiveSheetIndex(idx)}
                        className={`rounded-xl border px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider transition ${
                          activeSheetIndex === idx
                            ? 'border-[#7ca6e8] bg-[#7ca6e8] text-obsidian'
                            : 'border-cream/15 bg-charcoal text-cream/80 hover:border-[#7ca6e8]'
                        }`}
                      >
                        {sheet.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Details Column */}
              <div className="flex flex-col justify-between border-t border-cream/10 bg-charcoal p-6 sm:p-8 lg:col-span-4 lg:border-l lg:border-t-0">
                <div>
                  <h2
                    id="modal-project-title"
                    className="font-display text-2xl font-extrabold uppercase leading-tight text-cream"
                  >
                    {project.title}
                  </h2>

                  <p className="mt-4 text-sm leading-relaxed text-cream/85">
                    {project.description}
                  </p>

                  {/* Deliverables */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-editorial text-[#f1b39c]">
                      <Layers className="h-3.5 w-3.5" />
                      <span>DELIVERABLES</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {project.deliverables.map((item) => (
                        <span
                          key={item}
                          className="rounded-lg border border-cream/12 bg-obsidian px-3 py-1.5 text-xs text-cream/90"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Software Used */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-editorial text-[#7ca6e8]">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>DESIGN SOFTWARE</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {project.tools.map((tool) => (
                        <span
                          key={tool}
                          className="rounded-lg border border-[#7ca6e8]/35 bg-[#344975]/35 px-3 py-1.5 font-display text-xs font-semibold text-cream"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Footer */}
                <div className="mt-8 flex items-center justify-between border-t border-cream/10 pt-5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-cream/85 transition hover:text-[#f1b39c]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-cream/85 transition hover:text-[#f1b39c]"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
