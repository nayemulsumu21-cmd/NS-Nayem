import React from 'react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { NavSectionId } from './Navbar';
import { ProfilePhoto } from './ProfilePhoto';
import { OwnerEditButton } from './OwnerEditButton';

interface MinimalFooterProps {
  onNavigate: (section: NavSectionId) => void;
}

export const MinimalFooter: React.FC<MinimalFooterProps> = ({ onNavigate }) => {
  const { siteConfig } = usePortfolioCMS();

  return (
    <footer className="relative z-10 border-t border-cream/10 bg-obsidian py-8 text-xs text-cream/60">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="block h-7 w-7 shrink-0 overflow-hidden rounded-full border border-cream/15 bg-charcoal">
            <ProfilePhoto />
          </span>
          <span className="font-display font-bold uppercase tracking-wider text-cream/90">
            {siteConfig.name} &mdash; {siteConfig.title}
          </span>
          <OwnerEditButton
            title="Profile & Identity"
            openTab="hero-about"
            tooltip="Edit Profile Info"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 font-display text-[11px] font-bold uppercase tracking-wider text-cream/65">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="transition hover:text-cream"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate('about')}
            className="transition hover:text-cream"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => onNavigate('portfolio')}
            className="transition hover:text-cream"
          >
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => onNavigate('categories')}
            className="transition hover:text-cream"
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="transition hover:text-cream"
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="transition hover:text-cream"
          >
            Contact
          </button>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-center sm:text-right">
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </p>
        </div>
      </div>
    </footer>
  );
};
