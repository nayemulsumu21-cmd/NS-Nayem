import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Hexagon,
  BookOpen,
  Share2,
  ArrowUpRight,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { ServiceItem } from '../config/site';
import { FilterCategory } from '../data/projects';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { OwnerEditButton } from './OwnerEditButton';

interface ServicesSectionProps {
  onExploreCategory: (category: FilterCategory) => void;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  'logo-design': <Hexagon className="h-6 w-6 text-[#FF9A00]" />,
  'brand-style-guide': <BookOpen className="h-6 w-6 text-[#00BDFF]" />,
  'social-media-design': <Share2 className="h-6 w-6 text-[#DF00FF]" />,
};

interface ServiceCard3DProps {
  service: ServiceItem;
  index: number;
  reducedMotion: boolean;
  onExplore: (category: FilterCategory) => void;
}

const ServiceCard3D: React.FC<ServiceCard3DProps> = ({
  service,
  index,
  reducedMotion,
  onExplore,
}) => {
  const { updateSiteConfig } = usePortfolioCMS();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -ny * 9, y: nx * 9 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: index * 0.1 }}
      className="perspective-1000 h-full"
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        style={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          transformStyle: 'preserve-3d',
        }}
        className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-cream/15 bg-charcoal/95 p-8 shadow-studio transition-colors duration-300 hover:border-[#7ca6e8]"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

        <div>
          {/* Top Row: Card Number & Minimal Icon */}
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-extrabold uppercase tracking-widest text-[#ffd8be]">
              SERVICE {service.number}
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cream/15 bg-obsidian shadow-gold transition-transform duration-300 group-hover:scale-110">
              {SERVICE_ICONS[service.id] ?? (
                <Hexagon className="h-6 w-6 text-[#ffd8be]" />
              )}
            </div>
          </div>

          {/* Clear, High-Contrast Solid-Filled Service Title */}
          <div className="mt-7 flex items-center justify-between">
            <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide text-cream sm:text-3xl">
              {service.title}
            </h3>
            <OwnerEditButton
              title={`Service ${service.number} Title`}
              value={service.title}
              onSave={(val) =>
                updateSiteConfig((prev) => ({
                  ...prev,
                  services: prev.services.map((s) =>
                    s.id === service.id ? { ...s, title: val } : s
                  ),
                }))
              }
            />
          </div>

          {/* Service Description */}
          <div className="mt-4 flex flex-col items-start gap-1">
            <p className="text-sm leading-relaxed text-cream/85 sm:text-base">
              {service.description}
            </p>
            <OwnerEditButton
              title={`Service ${service.number} Description`}
              value={service.description}
              multiline
              onSave={(val) =>
                updateSiteConfig((prev) => ({
                  ...prev,
                  services: prev.services.map((s) =>
                    s.id === service.id ? { ...s, description: val } : s
                  ),
                }))
              }
            />
          </div>

          {/* Key Deliverables List */}
          <ul className="mt-6 space-y-2.5 border-t border-cream/10 pt-6">
            {service.deliverables.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-xs font-medium text-cream/85"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#00BDFF]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Filter Portfolio to this Service Category */}
        <div className="mt-8 pt-4">
          <button
            type="button"
            onClick={() => onExplore(service.categoryFilter)}
            className="inline-flex w-full items-center justify-between rounded-xl border border-cream/15 bg-obsidian px-4 py-3 font-display text-xs font-bold uppercase tracking-widest text-cream transition-all duration-300 group-hover:border-[#00BDFF] group-hover:bg-gradient-to-r group-hover:from-[#DF00FF] group-hover:to-[#00BDFF] group-hover:text-white"
          >
            <span>View {service.title}</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  onExploreCategory,
}) => {
  const { siteConfig, isOwnerMode, openCMS, updateSiteConfig } =
    usePortfolioCMS();
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-obsidian py-24 text-cream studio-grid-dark lg:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header + Edit Action */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#ffd8be]/30 bg-[#1a1528] font-display text-xs font-bold text-[#ffd8be]">
                04
              </span>
              <span className="font-display text-xs font-extrabold uppercase tracking-widest text-[#ffd8be]">
                {siteConfig.sectionHeadings.servicesEyebrow}
              </span>
              <OwnerEditButton
                title="Services Eyebrow"
                value={siteConfig.sectionHeadings.servicesEyebrow}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({
                    ...prev,
                    sectionHeadings: {
                      ...prev.sectionHeadings,
                      servicesEyebrow: val,
                    },
                  }))
                }
              />
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <h2 className="font-display text-3xl font-extrabold uppercase tracking-tight text-cream sm:text-5xl">
                {siteConfig.sectionHeadings.servicesHeading}
              </h2>
              <OwnerEditButton
                title="Services Heading"
                value={siteConfig.sectionHeadings.servicesHeading}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({
                    ...prev,
                    sectionHeadings: {
                      ...prev.sectionHeadings,
                      servicesHeading: val,
                    },
                  }))
                }
              />
            </div>
          </div>

          {isOwnerMode && (
            <button
              type="button"
              onClick={() => openCMS('services')}
              className="inline-flex items-center gap-1.5 self-start rounded-xl border border-cream/15 bg-charcoal px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#7ca6e8] transition hover:border-[#7ca6e8] md:self-auto"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Services</span>
            </button>
          )}
        </div>

        {/* Three 3D Interactive Service Cards */}
        <div className="mt-12 grid grid-cols-1 gap-7 lg:grid-cols-3">
          {siteConfig.services.map((service, index) => (
            <ServiceCard3D
              key={service.id}
              service={service}
              index={index}
              reducedMotion={shouldReduceMotion}
              onExplore={onExploreCategory}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
