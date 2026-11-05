import React, { useState, useEffect, useCallback } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { Navbar, NavSectionId } from './components/Navbar';
import { FallingParticles } from './components/FallingParticles';
import { HeroSection } from './components/HeroSection';
import { AboutSection } from './components/AboutSection';
import { ProjectGallery } from './components/ProjectGallery';
import { ServicesSection } from './components/ServicesSection';
import { ContactSection } from './components/ContactSection';
import { MinimalFooter } from './components/MinimalFooter';
import { ProjectDetailPage } from './components/ProjectDetailPage';
import { BehanceProjectBuilder } from './components/BehanceProjectBuilder';
import { CMSDashboardModal } from './components/CMSDashboardModal';
import { HeaderAvatarModal } from './components/HeaderAvatarModal';
import { QuickEditModal } from './components/QuickEditModal';
import { HeroPortraitAdjusterModal } from './components/HeroPortraitAdjusterModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { FilterCategory, ProjectItem } from './data/projects';
import { PortfolioCMSProvider, usePortfolioCMS } from './context/PortfolioCMSContext';

const VALID_SECTIONS: NavSectionId[] = [
  'home',
  'about',
  'portfolio',
  'categories',
  'services',
  'contact',
];

function parseRouteFromHash(): {
  section: NavSectionId;
  projectId: string | null;
} {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  const [routePath = ''] = raw.split('?');
  const cleanPath = routePath.trim();
  if (!cleanPath || cleanPath === 'home') {
    return { section: 'home', projectId: null };
  }
  if (cleanPath.startsWith('project/')) {
    const pid = cleanPath.slice('project/'.length).trim();
    if (pid) {
      return { section: 'portfolio', projectId: pid };
    }
  }
  const matched = VALID_SECTIONS.find((sec) => sec === cleanPath);
  if (matched) {
    return { section: matched, projectId: null };
  }
  return { section: 'home', projectId: null };
}

function PortfolioContent() {
  const { isOwnerMode, isLoginModalOpen, closeLoginModal } = usePortfolioCMS();
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSectionId>(
    () => parseRouteFromHash().section
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => parseRouteFromHash().projectId
  );
  const [previousSection, setPreviousSection] = useState<NavSectionId>('home');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  // Centrally disable right-click context menu and Developer Tools shortcuts for public visitors.
  // Restrictions automatically lift when authenticated in Owner Mode.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isOwnerMode) return; // Do not restrict authenticated website owner

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;

      // Ctrl + Shift + I (Inspect), Ctrl + Shift + J (Console), Ctrl + Shift + C (Element Inspector)
      if (
        isModifier &&
        e.shiftKey &&
        (e.key === 'I' ||
          e.key === 'i' ||
          e.key === 'J' ||
          e.key === 'j' ||
          e.key === 'C' ||
          e.key === 'c' ||
          e.keyCode === 73 ||
          e.keyCode === 74 ||
          e.keyCode === 67)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl + U (View Page Source)
      if (
        isModifier &&
        (e.key === 'u' || e.key === 'U' || e.keyCode === 85) &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, {
        capture: true,
      });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOwnerMode]);

  // Ensure every full page refresh or reload starts at the very top (0, 0)
  // across all pages while preserving the active route and URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetToTop = () => {
      try {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        if (document.body) {
          document.body.scrollTop = 0;
        }
      } catch (_) {}
    };

    // Immediate scroll reset
    resetToTop();

    // Secondary resets across animation frame and browser load lifecycle to defeat late scroll restoration
    const r1 = requestAnimationFrame(resetToTop);
    const t1 = setTimeout(resetToTop, 50);
    const t2 = setTimeout(resetToTop, 180);

    const onWindowLoad = () => resetToTop();
    const onBeforeUnload = () => resetToTop();

    window.addEventListener('load', onWindowLoad);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('load', onWindowLoad);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setIsLoaded(true);
    try {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      if (document.body) {
        document.body.scrollTop = 0;
      }
      requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = '';
      });
    } catch (_) {}
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseRouteFromHash();
      setActiveSection((prevSection) => {
        if (prevSection !== parsed.section) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return parsed.section;
      });
      setSelectedProjectId((prevProjectId) => {
        if (prevProjectId !== parsed.projectId) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return parsed.projectId;
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = useCallback((sectionId: NavSectionId) => {
    setSelectedProjectId(null);
    setActiveSection(sectionId);
    const nextHash = sectionId === 'home' ? '#/home' : `#/${sectionId}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectProject = useCallback(
    (project: ProjectItem) => {
      setPreviousSection(activeSection);
      setSelectedProjectId(project.id);
      const nextHash = `#/project/${project.id}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', nextHash);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeSection]
  );

  const handleBackFromProject = useCallback(() => {
    const targetSection = previousSection || 'home';
    setSelectedProjectId(null);
    setActiveSection(targetSection);
    const nextHash =
      targetSection === 'home' ? '#/home' : `#/${targetSection}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [previousSection]);

  const handleExploreServiceCategory = useCallback(
    (category: FilterCategory) => {
      setActiveCategory(category);
      setSelectedProjectId(null);
      setActiveSection('portfolio');
      window.history.pushState(null, '', '#/portfolio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  return (
    <div className="relative min-h-screen bg-obsidian text-cream selection:bg-[#a9cbff] selection:text-obsidian">
      {/* Initial Studio Loading Animation */}
      {!isLoaded && <LoadingScreen onComplete={handleLoadingComplete} />}

      {/* Full-Website Continuous Falling Particle Atmosphere */}
      <FallingParticles />

      {/* Floating Header & Navigation (Includes Profile Picture Upload & CMS Trigger) */}
      <Navbar activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Main Page Router */}
      <main>
        {selectedProjectId ? (
          /* DEDICATED PROJECT DETAIL PAGE */
          <>
            <ProjectDetailPage
              projectId={selectedProjectId}
              onBack={handleBackFromProject}
              onSelectProject={handleSelectProject}
            />
            <MinimalFooter onNavigate={handleNavigate} />
          </>
        ) : activeSection === 'home' ? (
          /*
           * HOMEPAGE: PURE BEHANCE-STYLE PORTFOLIO SHOWCASE
           * 1. Existing Hero Section (with subtle Profile Views counter below introduction)
           * 2. Complete Portfolio Gallery showing ALL visible projects (4–5 per row on desktop)
           * 3. Minimal Footer
           */
          <>
            <HeroSection onNavigate={handleNavigate} ready={isLoaded} />
            <ProjectGallery
              mode="homepage"
              activeCategory="all"
              onCategoryChange={setActiveCategory}
              onSelectProject={(proj) => handleSelectProject(proj)}
            />
            <MinimalFooter onNavigate={handleNavigate} />
          </>
        ) : activeSection === 'about' ? (
          /* DEDICATED ABOUT PAGE */
          <div className="pt-14">
            <AboutSection onNavigate={handleNavigate} />
            <MinimalFooter onNavigate={handleNavigate} />
          </div>
        ) : activeSection === 'portfolio' ? (
          /* DEDICATED PORTFOLIO PAGE (With Category Filtering) */
          <>
            <ProjectGallery
              mode="portfolio"
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              onSelectProject={(proj) => handleSelectProject(proj)}
            />
            <MinimalFooter onNavigate={handleNavigate} />
          </>
        ) : activeSection === 'categories' ? (
          /* DEDICATED CATEGORIES BROWSING PAGE */
          <>
            <ProjectGallery
              mode="categories"
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              onSelectProject={(proj) => handleSelectProject(proj)}
            />
            <MinimalFooter onNavigate={handleNavigate} />
          </>
        ) : activeSection === 'services' ? (
          /* DEDICATED SERVICES PAGE */
          <div className="pt-14">
            <ServicesSection onExploreCategory={handleExploreServiceCategory} />
            <MinimalFooter onNavigate={handleNavigate} />
          </div>
        ) : (
          /* DEDICATED CONTACT PAGE */
          <div className="pt-14">
            <ContactSection />
          </div>
        )}
      </main>

      {/* Header Profile Picture Upload, Preview & Crop Modal */}
      <HeaderAvatarModal />

      {/* Full-Page Behance-Inspired Project Builder (Create / Edit Project) */}
      <BehanceProjectBuilder
        onPublishedOrClosed={(publishedProj) => {
          if (publishedProj) {
            handleSelectProject(publishedProj);
          }
        }}
      />

      {/* Full Content Management Dashboard Modal */}
      <CMSDashboardModal />

      {/* Universal Quick Edit Modal for All Dashboard Content */}
      <QuickEditModal />

      {/* Main Hero Portrait Sizing, Positioning & Crop Adjuster Modal */}
      <HeroPortraitAdjusterModal />

      {/* Secure Studio Owner Login / Initialization Modal */}
      <OwnerLoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
      />
    </div>
  );
}

export function App() {
  return (
    <PortfolioCMSProvider>
      <PortfolioContent />
    </PortfolioCMSProvider>
  );
}

export default App;
