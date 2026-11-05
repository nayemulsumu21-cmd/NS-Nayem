import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ArrowUpRight,
  Camera,
  SlidersHorizontal,
  Plus,
  Lock,
  LogOut,
} from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { OwnerEditButton } from './OwnerEditButton';

export type NavSectionId =
  | 'home'
  | 'about'
  | 'portfolio'
  | 'categories'
  | 'services'
  | 'contact';

interface NavbarProps {
  activeSection: NavSectionId;
  onNavigate: (sectionId: NavSectionId) => void;
}

const NAV_ITEMS: { id: NavSectionId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'categories', label: 'Categories' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeSection, onNavigate }) => {
  const {
    siteConfig,
    isOwnerMode,
    openCMS,
    openProjectBuilder,
    openHeaderAvatarModal,
    openLoginModal,
    logout,
  } = usePortfolioCMS();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 36);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (id: NavSectionId) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  const { imageUrl, zoom, offsetX, offsetY } = siteConfig.headerAvatar;
  const effectiveAvatarUrl =
    imageUrl ||
    siteConfig.portraits.heroPortraitPath ||
    '/images/profile/hero-portrait.png';
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    setAvatarLoaded(false);
    const probe = new Image();
    probe.src = effectiveAvatarUrl;
    if (probe.complete) setAvatarLoaded(true);
  }, [effectiveAvatarUrl]);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'py-2.5' : 'py-3.5'
        }`}
      >
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10">
          <nav
            aria-label="Primary Navigation"
            className="flex items-center justify-between gap-4"
          >
            {/*
             * 1. LEFT SECTION: Small, Compact Container with Profile Image & Brand Logo
             */}
            <div
              className={`pointer-events-auto inline-flex items-center gap-2.5 rounded-full py-1 pl-1.5 pr-3.5 transition-all duration-300 ${
                scrolled
                  ? 'border border-cream/12 bg-obsidian/85 shadow-studio backdrop-blur-xl'
                  : 'border border-cream/10 bg-obsidian/55 backdrop-blur-md'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (isOwnerMode) {
                    openHeaderAvatarModal();
                  } else {
                    handleLinkClick('home');
                  }
                }}
                title={
                  isOwnerMode
                    ? 'Upload or adjust header profile photo'
                    : siteConfig.name
                }
                aria-label={
                  isOwnerMode
                    ? 'Upload or adjust header profile photo'
                    : siteConfig.name
                }
                className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#b86bd4]/70 bg-charcoal transition-transform duration-300 hover:scale-105 hover:border-[#7ca6e8] focus:outline-none"
              >
                <span className="relative block h-full w-full overflow-hidden rounded-full bg-charcoal">
                  {!avatarLoaded && (
                    <span
                      className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#2a2236] to-[#16131f]"
                      aria-hidden="true"
                    />
                  )}
                  <img
                    src={effectiveAvatarUrl}
                    alt={siteConfig.name}
                    {...({ fetchpriority: 'high' } as Record<string, string>)}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setAvatarLoaded(true)}
                    style={{
                      transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`,
                      opacity: avatarLoaded ? 1 : 0,
                    }}
                    className="h-full w-full object-cover object-top transition-opacity duration-200"
                  />
                </span>
                {isOwnerMode && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-obsidian bg-[#7ca6e8] text-obsidian shadow transition-transform group-hover:scale-110">
                    <Camera className="h-2 w-2" />
                  </span>
                )}
              </button>

              <a
                href="#/home"
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('home');
                }}
                className="flex flex-col leading-none focus:outline-none"
              >
                <span className="font-display text-xs font-extrabold tracking-wider text-cream">
                  {siteConfig.name}
                </span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#ffd8be]">
                  {siteConfig.title}
                </span>
              </a>

              <OwnerEditButton
                title="Brand & Settings"
                openTab="hero-about"
                tooltip="Edit Brand & Profile Settings"
                className="ml-0.5"
              />
            </div>

            {/*
             * 2. CENTER SECTION: Intentionally Empty Open Space
             */}
            <div className="flex-1" aria-hidden="true" />

            {/*
             * 3. RIGHT SECTION: Compact Navigation Links & Relevant Actions
             */}
            <div
              className={`pointer-events-auto inline-flex items-center gap-1 rounded-full px-2 py-1 transition-all duration-300 ${
                scrolled
                  ? 'border border-cream/12 bg-obsidian/85 shadow-studio backdrop-blur-xl'
                  : 'border border-cream/10 bg-obsidian/55 backdrop-blur-md'
              }`}
            >
              {/* Desktop Navigation Links */}
              <div className="hidden items-center gap-0.5 md:flex">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#/${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick(item.id);
                      }}
                      className={`relative rounded-full px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                        isActive
                          ? 'text-white font-extrabold'
                          : 'text-cream/80 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="activeNavPill"
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 32,
                          }}
                          className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] shadow-[0_4px_16px_rgba(223,0,255,0.35)]"
                        />
                      )}
                      {item.label}
                    </a>
                  );
                })}

                {/* Secure Owner Login / Logout Option beside Contact */}
                {!isOwnerMode ? (
                  <button
                    type="button"
                    onClick={openLoginModal}
                    title="Owner Login"
                    className="relative ml-1 inline-flex items-center gap-1.5 rounded-full border border-[#00BDFF]/30 bg-obsidian/70 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[#00BDFF] transition-all duration-200 hover:border-[#00BDFF] hover:bg-[#00BDFF]/10 hover:text-white"
                  >
                    <Lock className="h-3 w-3 text-[#00BDFF]" />
                    <span>Login</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => logout()}
                    title="Log out of Owner Mode"
                    className="relative ml-1 inline-flex items-center gap-1.5 rounded-full border border-[#DF00FF]/40 bg-obsidian/70 px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[#ffd8be] transition-all duration-200 hover:border-[#FF3366] hover:bg-[#FF3366]/10 hover:text-white"
                  >
                    <LogOut className="h-3 w-3 text-[#DF00FF]" />
                    <span>Logout</span>
                  </button>
                )}
              </div>

              {/* Compact Owner Actions on Right */}
              {isOwnerMode && (
                <div className="hidden items-center gap-1.5 pl-1 md:flex">
                  <button
                    type="button"
                    onClick={() => openProjectBuilder('new')}
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-3.5 py-1.5 font-display text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-110"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                    <span>Create Project</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCMS('projects')}
                    title="Manage Site"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-cream/15 bg-charcoal text-[#a9cbff] transition hover:border-[#a9cbff] hover:text-cream"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Mobile Actions: Create Project (Owner Only) + Compact Hamburger */}
              <div className="flex items-center gap-1.5 md:hidden">
                {isOwnerMode && (
                  <button
                    type="button"
                    onClick={() => openProjectBuilder('new')}
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-2.5 py-1 font-display text-[10px] font-extrabold uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(223,0,255,0.3)]"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                    <span>Create</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-expanded={mobileMenuOpen}
                  aria-label={
                    mobileMenuOpen
                      ? 'Close navigation menu'
                      : 'Open navigation menu'
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 bg-charcoal text-cream transition-colors hover:border-[#a9cbff]"
                >
                  {mobileMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-x-0 top-16 z-40 mx-4 rounded-2xl border border-cream/15 bg-obsidian/95 p-5 shadow-studio backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item, idx) => {
                const isActive = activeSection === item.id;
                return (
                  <motion.a
                    key={item.id}
                    href={`#/${item.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(item.id);
                    }}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 font-display text-xs font-bold uppercase tracking-widest transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]'
                        : 'text-cream/85 hover:bg-charcoal hover:text-[#00BDFF]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] opacity-60">0{idx + 1}</span>
                  </motion.a>
                );
              })}

              <div className="mt-3 flex flex-col gap-2 border-t border-cream/10 pt-3">
                {isOwnerMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openProjectBuilder('new');
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>CREATE PROJECT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openCMS('projects');
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#a9cbff]/40 bg-charcoal px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-[#a9cbff]"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>MANAGE SITE</span>
                    </button>
                  </>
                )}
                <a
                  href="#/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick('contact');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-cream/15 bg-obsidian px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-cream"
                >
                  <span>LET&apos;S TALK</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>

                {/* Mobile Owner Login / Logout */}
                {!isOwnerMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openLoginModal();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00BDFF]/40 bg-[#12101b] px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-[#00BDFF] transition hover:border-[#00BDFF] hover:bg-[#00BDFF]/10"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>OWNER LOGIN</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF3366]/40 bg-[#12101b] px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-[#FF3366] transition hover:border-[#FF3366] hover:bg-[#FF3366]/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>LOGOUT</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
