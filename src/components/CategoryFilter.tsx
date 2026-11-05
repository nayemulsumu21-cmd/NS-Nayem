import React from 'react';
import { motion } from 'framer-motion';
import { CategoryTabItem, FilterCategory } from '../data/projects';

interface CategoryFilterProps {
  categories: CategoryTabItem[];
  activeCategory: FilterCategory;
  counts: Record<string, number>;
  onSelectCategory: (category: FilterCategory) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  counts,
  onSelectCategory,
}) => {
  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Portfolio Categories"
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {categories.map((tab) => {
          const isSelected = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectCategory(tab.id)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                isSelected
                  ? 'border-[#00BDFF]/60 bg-[#181526] text-cream shadow-studio'
                  : 'border-cream/10 bg-[#12101b] text-cream/85 hover:-translate-y-0.5 hover:border-cream/25'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCategoryAccent"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#DF00FF] to-[#00BDFF]"
                />
              )}

              <div className="flex w-full items-center justify-between">
                <span
                  className={`font-display text-xs font-extrabold uppercase tracking-widest ${
                    isSelected
                      ? 'text-[#ffd8be]'
                      : 'text-cream/55 group-hover:text-cream/80'
                  }`}
                >
                  CATEGORY {tab.code}
                </span>
                <span
                  className={`inline-flex h-6 min-w-[28px] items-center justify-center rounded-full px-2 font-display text-xs font-bold ${
                    isSelected
                      ? 'bg-[#a9cbff] text-obsidian'
                      : 'bg-cream/10 text-cream/85'
                  }`}
                >
                  {counts[tab.id] ?? 0}
                </span>
              </div>

              <div className="mt-4">
                <h3
                  className={`font-display text-base font-extrabold uppercase tracking-wide sm:text-lg ${
                    isSelected ? 'text-cream' : 'text-cream/90'
                  }`}
                >
                  {tab.label}
                </h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-cream/60">
                  {tab.shortDesc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
