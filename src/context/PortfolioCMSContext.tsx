import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  SITE_CONFIG,
  SiteConfigData,
  HeaderAvatarConfig,
  PortraitAdjustments,
} from '../config/site';
import {
  CATEGORY_TABS,
  CategoryTabItem,
  ORDERED_PROJECTS,
  ProjectItem,
} from '../data/projects';

export interface QuickEditFieldConfig {
  title: string;
  description?: string;
  value: string;
  multiline?: boolean;
  type?: 'text' | 'textarea' | 'number';
  onSave: (newValue: string) => void | Promise<void>;
}

export interface PortraitAdjusterConfig {
  isOpen: boolean;
  imageUrl: string;
  initialAdjustments?: PortraitAdjustments;
  onSave: (adj: PortraitAdjustments) => void | Promise<void>;
  onCancel?: () => void;
}

export interface CMSStorePayload {
  version: number;
  siteConfig: SiteConfigData;
  categories: CategoryTabItem[];
  projects: ProjectItem[];
  profileViews: number;
}

export type CMSActiveTab =
  | 'projects'
  | 'categories'
  | 'hero-about'
  | 'services'
  | 'contact';

export interface OwnerAuthStatus {
  isOwner: boolean;
  configured: boolean;
  username: string | null;
}

interface PortfolioCMSContextValue {
  siteConfig: SiteConfigData;
  categories: CategoryTabItem[];
  projects: ProjectItem[];
  visibleProjects: ProjectItem[];
  publishedProjects: ProjectItem[];
  draftProjects: ProjectItem[];
  featuredProjects: ProjectItem[];
  profileViews: number;
  updateProfileViews: (count: number) => void;
  likedProjectIds: string[];
  appreciatedProjectIds: string[];
  isOwnerMode: boolean;
  setIsOwnerMode: (val: boolean) => void;
  authStatus: OwnerAuthStatus;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  setupOwner: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  builderProjectId: string | 'new' | null;
  openProjectBuilder: (projectId?: string | 'new' | null) => void;
  closeProjectBuilder: () => void;
  isCMSOpen: boolean;
  cmsActiveTab: CMSActiveTab;
  editingProjectId: string | null;
  isHeaderAvatarModalOpen: boolean;
  openCMS: (tab?: CMSActiveTab, projectId?: string | null) => void;
  closeCMS: () => void;
  openHeaderAvatarModal: () => void;
  closeHeaderAvatarModal: () => void;
  updateSiteConfig: (updater: (prev: SiteConfigData) => SiteConfigData) => void;
  updateHeaderAvatar: (avatar: HeaderAvatarConfig) => void;
  saveProjects: (nextProjects: ProjectItem[]) => void;
  addProject: (project: Omit<ProjectItem, 'id' | 'displayOrder'>) => ProjectItem;
  updateProject: (id: string, updated: Partial<ProjectItem>) => void;
  deleteProject: (id: string) => void;
  reorderProject: (id: string, direction: 'up' | 'down') => void;
  toggleProjectVisibility: (id: string) => void;
  recordProjectView: (id: string) => void;
  toggleProjectLike: (id: string) => void;
  toggleProjectAppreciation: (id: string) => void;
  saveCategories: (nextCategories: CategoryTabItem[]) => void;
  addCategory: (label: string, shortDesc: string) => CategoryTabItem;
  updateCategory: (id: string, updated: Partial<CategoryTabItem>) => void;
  deleteCategory: (id: string) => void;
  reorderCategory: (id: string, direction: 'up' | 'down') => void;
  uploadAssetFile: (file: File, targetPath?: string) => Promise<string>;
  replaceHeroPortraitWithBackgroundRemoval: (
    file: File
  ) => Promise<{ ok: boolean; url?: string; error?: string }>;
  restorePreviousHeroPortrait: () => Promise<{
    ok: boolean;
    url?: string;
    error?: string;
  }>;
  hasHeroPortraitBackup: boolean;
  quickEditConfig: QuickEditFieldConfig | null;
  openQuickEdit: (config: QuickEditFieldConfig) => void;
  closeQuickEdit: () => void;
  portraitAdjusterConfig: PortraitAdjusterConfig | null;
  openPortraitAdjuster: (
    imageUrl: string,
    onSave: (adj: PortraitAdjustments) => void | Promise<void>,
    initialAdjustments?: PortraitAdjustments,
    onCancel?: () => void
  ) => void;
  closePortraitAdjuster: () => void;
  updateHeroAdjustments: (adj: PortraitAdjustments) => void;
  resetAllToDefaults: () => void;
}

const STORAGE_KEY = 'nayemul_portfolio_cms_v1';
const LIKED_PROJECTS_KEY = 'nayemul_visitor_liked_projects_v1';
const APPRECIATED_PROJECTS_KEY = 'nayemul_visitor_appreciated_projects_v1';
const VIEWED_PROJECTS_SESSION_KEY = 'nayemul_viewed_projects_session_v1';
const PROFILE_VISIT_SESSION_KEY = 'nayemul_profile_visit_session_v1';
const OWNER_MODE_KEY = 'nayemul_owner_mode_v1';
const CURRENT_STORE_VERSION = 1;

function normalizeProjectDefaults(proj: ProjectItem, index: number): ProjectItem {
  return {
    ...proj,
    displayOrder: proj.displayOrder ?? index + 1,
    status: proj.status ?? (proj.visible === false ? 'draft' : 'published'),
    visible: proj.status === 'draft' ? false : proj.visible ?? true,
    views: typeof proj.views === 'number' && proj.views >= 0 ? proj.views : 0,
    likes: typeof proj.likes === 'number' && proj.likes >= 0 ? proj.likes : 0,
    appreciations:
      typeof proj.appreciations === 'number' && proj.appreciations >= 0
        ? proj.appreciations
        : 0,
  };
}

function normalizeSiteConfigDefaults(
  raw: Partial<SiteConfigData>
): SiteConfigData {
  const merged: SiteConfigData = {
    ...SITE_CONFIG,
    ...raw,
  };
  if (
    merged.designPhilosophy &&
    merged.designPhilosophy[0]?.title === 'Clarity Before Ornament'
  ) {
    merged.designPhilosophy = SITE_CONFIG.designPhilosophy;
  }
  if (
    !merged.heroBackgroundText ||
    merged.heroBackgroundText.trim().toUpperCase() === 'BRAND IDENTITY'
  ) {
    merged.heroBackgroundText = SITE_CONFIG.heroBackgroundText;
  }
  if (!merged.logoUrl) {
    merged.logoUrl = SITE_CONFIG.logoUrl;
  }
  merged.portraits = {
    ...SITE_CONFIG.portraits,
    ...(raw.portraits || {}),
    heroPortraitPath:
      raw.portraits?.heroPortraitPath || SITE_CONFIG.portraits.heroPortraitPath,
    heroPlaceholderPath:
      raw.portraits?.heroPlaceholderPath ||
      SITE_CONFIG.portraits.heroPlaceholderPath,
    heroPortraitBackupPath:
      raw.portraits?.heroPortraitBackupPath ||
      SITE_CONFIG.portraits.heroPortraitBackupPath,
    heroAdjustments: {
      scale:
        typeof raw.portraits?.heroAdjustments?.scale === 'number'
          ? raw.portraits.heroAdjustments.scale
          : SITE_CONFIG.portraits.heroAdjustments?.scale ?? 1,
      offsetX:
        typeof raw.portraits?.heroAdjustments?.offsetX === 'number'
          ? raw.portraits.heroAdjustments.offsetX
          : SITE_CONFIG.portraits.heroAdjustments?.offsetX ?? 0,
      offsetY:
        typeof raw.portraits?.heroAdjustments?.offsetY === 'number'
          ? raw.portraits.heroAdjustments.offsetY
          : SITE_CONFIG.portraits.heroAdjustments?.offsetY ?? 0,
      cropTop:
        typeof raw.portraits?.heroAdjustments?.cropTop === 'number'
          ? raw.portraits.heroAdjustments.cropTop
          : SITE_CONFIG.portraits.heroAdjustments?.cropTop ?? 0,
      cropBottom:
        typeof raw.portraits?.heroAdjustments?.cropBottom === 'number'
          ? raw.portraits.heroAdjustments.cropBottom
          : SITE_CONFIG.portraits.heroAdjustments?.cropBottom ?? 0,
    },
    aboutPortraitPath:
      raw.portraits?.aboutPortraitPath ||
      SITE_CONFIG.portraits.aboutPortraitPath,
    aboutPlaceholderPath:
      raw.portraits?.aboutPlaceholderPath ||
      SITE_CONFIG.portraits.aboutPlaceholderPath,
  };
  // Never let a stale/empty stored avatar cause the "NI" monogram to appear
  const avatarFallback =
    merged.portraits?.heroPortraitPath ||
    SITE_CONFIG.headerAvatar.imageUrl ||
    '/images/profile/hero-portrait.png';
  merged.headerAvatar = {
    ...SITE_CONFIG.headerAvatar,
    ...(merged.headerAvatar || {}),
    imageUrl: merged.headerAvatar?.imageUrl || avatarFallback,
  };
  return merged;
}

const DEFAULT_STORE: CMSStorePayload = {
  version: CURRENT_STORE_VERSION,
  siteConfig: SITE_CONFIG,
  categories: CATEGORY_TABS,
  projects: ORDERED_PROJECTS.map(normalizeProjectDefaults),
  profileViews: 0,
};

const PortfolioCMSContext = createContext<PortfolioCMSContextValue | null>(
  null
);

let pendingPersistTimer: ReturnType<typeof setTimeout> | null = null;
let latestPendingPayload: CMSStorePayload | null = null;

async function writePayloadToStorageAndServer(payload: CMSStorePayload) {
  const serialized = JSON.stringify(payload);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota errors
  }

  try {
    await fetch('/__cms/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: serialized,
    });
  } catch {
    // Ignore when running on static hosting without dev server
  }
}

function persistStoreToDisk(payload: CMSStorePayload, immediate = false) {
  latestPendingPayload = payload;
  if (pendingPersistTimer) {
    clearTimeout(pendingPersistTimer);
    pendingPersistTimer = null;
  }
  if (immediate) {
    void writePayloadToStorageAndServer(payload);
    return;
  }
  pendingPersistTimer = setTimeout(() => {
    pendingPersistTimer = null;
    if (latestPendingPayload) {
      const toWrite = latestPendingPayload;
      latestPendingPayload = null;
      void writePayloadToStorageAndServer(toWrite);
    }
  }, 90);
}

function readStringArrayFromStorage(
  storage: Storage,
  key: string
): string[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export const PortfolioCMSProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [store, setStore] = useState<CMSStorePayload>(() => {
    try {
      const localRaw = localStorage.getItem(STORAGE_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw) as Partial<CMSStorePayload>;
        if (parsed && parsed.siteConfig && parsed.projects && parsed.categories) {
          return {
            version: CURRENT_STORE_VERSION,
            siteConfig: normalizeSiteConfigDefaults(parsed.siteConfig),
            categories: parsed.categories,
            projects: parsed.projects.map(normalizeProjectDefaults),
            profileViews:
              typeof parsed.profileViews === 'number' && parsed.profileViews >= 0
                ? parsed.profileViews
                : 0,
          };
        }
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_STORE;
  });

  const [likedProjectIds, setLikedProjectIds] = useState<string[]>(() =>
    readStringArrayFromStorage(localStorage, LIKED_PROJECTS_KEY)
  );
  const [appreciatedProjectIds, setAppreciatedProjectIds] = useState<string[]>(
    () => readStringArrayFromStorage(localStorage, APPRECIATED_PROJECTS_KEY)
  );

  const [isCMSOpen, setIsCMSOpen] = useState(false);
  const [cmsActiveTab, setCmsActiveTab] = useState<CMSActiveTab>('projects');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isHeaderAvatarModalOpen, setIsHeaderAvatarModalOpen] = useState(false);

  // Secure Server-Side Owner Authentication State (defaults to false for all visitors)
  const [authStatus, setAuthStatus] = useState<OwnerAuthStatus>({
    isOwner: false,
    configured: false,
    username: null,
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isOwnerMode, setIsOwnerModeState] = useState<boolean>(false);

  const openLoginModal = useCallback(() => {
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  const [builderProjectId, setBuilderProjectId] = useState<
    string | 'new' | null
  >(null);

  const logout = useCallback(async () => {
    try {
      await fetch('/__cms/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore
    }
    setIsOwnerModeState(false);
    setAuthStatus((prev) => ({ ...prev, isOwner: false }));
    setBuilderProjectId(null);
    setIsCMSOpen(false);
    setIsHeaderAvatarModalOpen(false);
    setQuickEditConfig(null);
    setPortraitAdjusterConfig(null);
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (rawHash === 'create-project' || rawHash.startsWith('edit-project/')) {
      window.history.pushState(null, '', '#/home');
    }
  }, []);

  const setIsOwnerMode = useCallback(
    (val: boolean) => {
      if (!val) {
        void logout();
      } else {
        setIsOwnerModeState(true);
      }
    },
    [logout]
  );

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/__cms/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setIsOwnerModeState(true);
        setAuthStatus({
          isOwner: true,
          configured: true,
          username: data.username,
        });
        return { ok: true };
      }
      return {
        ok: false,
        error: data?.error || 'Invalid username or password.',
      };
    } catch {
      return { ok: false, error: 'Connection error while authenticating.' };
    }
  }, []);

  const setupOwner = useCallback(
    async (username: string, password: string) => {
      try {
        const res = await fetch('/__cms/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setIsOwnerModeState(true);
          setAuthStatus({
            isOwner: true,
            configured: true,
            username: data.username,
          });
          return { ok: true };
        }
        return {
          ok: false,
          error: data?.error || 'Failed to initialize owner account.',
        };
      } catch {
        return { ok: false, error: 'Connection error during setup.' };
      }
    },
    []
  );

  // Validate owner session with backend on initial load
  useEffect(() => {
    let active = true;
    fetch('/__cms/auth/status', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data?.ok) {
          const isOwner = Boolean(data.isOwner);
          setAuthStatus({
            isOwner,
            configured: Boolean(data.configured),
            username: data.username || null,
          });
          setIsOwnerModeState(isOwner);
        }
      })
      .catch(() => {
        if (!active) return;
        setIsOwnerModeState(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Reject unauthorized access to admin/builder routes for non-owners
  useEffect(() => {
    if (!isOwnerMode) {
      setBuilderProjectId(null);
      setIsCMSOpen(false);
      setIsHeaderAvatarModalOpen(false);
      setQuickEditConfig(null);
      setPortraitAdjusterConfig(null);
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (rawHash === 'create-project' || rawHash.startsWith('edit-project/')) {
        window.history.pushState(null, '', '#/home');
      }
    }
  }, [isOwnerMode]);

  const [quickEditConfig, setQuickEditConfig] =
    useState<QuickEditFieldConfig | null>(null);
  const [portraitAdjusterConfig, setPortraitAdjusterConfig] =
    useState<PortraitAdjusterConfig | null>(null);

  const openQuickEdit = useCallback(
    (config: QuickEditFieldConfig) => {
      if (!isOwnerMode) return;
      setQuickEditConfig(config);
    },
    [isOwnerMode]
  );

  const closeQuickEdit = useCallback(() => {
    setQuickEditConfig(null);
  }, []);

  const openPortraitAdjuster = useCallback(
    (
      imageUrl: string,
      onSave: (adj: PortraitAdjustments) => void | Promise<void>,
      initialAdjustments?: PortraitAdjustments,
      onCancel?: () => void
    ) => {
      if (!isOwnerMode) return;
      setPortraitAdjusterConfig({
        isOpen: true,
        imageUrl,
        initialAdjustments,
        onSave,
        onCancel,
      });
    },
    [isOwnerMode]
  );

  const closePortraitAdjuster = useCallback(() => {
    setPortraitAdjusterConfig(null);
  }, []);

  const openProjectBuilder = useCallback(
    (projectId: string | 'new' | null = 'new') => {
      if (!isOwnerMode) return;
      const resolvedId = projectId ?? 'new';
      setIsCMSOpen(false);
      setBuilderProjectId(resolvedId);
      const targetHash =
        resolvedId === 'new'
          ? '#/create-project'
          : `#/edit-project/${resolvedId}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isOwnerMode]
  );

  const closeProjectBuilder = useCallback(() => {
    setBuilderProjectId(null);
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (rawHash === 'create-project' || rawHash.startsWith('edit-project/')) {
      window.history.pushState(null, '', '#/home');
    }
  }, []);

  useEffect(() => {
    const syncBuilderFromHash = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (!isOwnerMode) {
        if (
          rawHash === 'create-project' ||
          rawHash.startsWith('edit-project/')
        ) {
          setBuilderProjectId(null);
          window.history.replaceState(null, '', '#/home');
        }
        return;
      }
      if (rawHash === 'create-project') {
        setBuilderProjectId('new');
      } else if (rawHash.startsWith('edit-project/')) {
        setBuilderProjectId(
          rawHash.slice('edit-project/'.length).trim() || 'new'
        );
      } else {
        setBuilderProjectId(null);
      }
    };
    window.addEventListener('hashchange', syncBuilderFromHash);
    window.addEventListener('popstate', syncBuilderFromHash);
    return () => {
      window.removeEventListener('hashchange', syncBuilderFromHash);
      window.removeEventListener('popstate', syncBuilderFromHash);
    };
  }, [isOwnerMode]);

  // Hydrate from public/data/cms-store.json on mount and record a genuine profile visit once per session
  useEffect(() => {
    let active = true;

    const recordSessionProfileVisit = (basePayload: CMSStorePayload) => {
      try {
        const alreadyRecorded = sessionStorage.getItem(
          PROFILE_VISIT_SESSION_KEY
        );
        if (!alreadyRecorded) {
          sessionStorage.setItem(PROFILE_VISIT_SESSION_KEY, '1');
          const updated: CMSStorePayload = {
            ...basePayload,
            profileViews: (basePayload.profileViews ?? 0) + 1,
          };
          setStore(updated);
          persistStoreToDisk(updated);
          return;
        }
      } catch {
        // Ignore sessionStorage errors
      }
      setStore(basePayload);
      persistStoreToDisk(basePayload);
    };

    fetch(`/data/cms-store.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error('No disk store yet');
        return res.json();
      })
      .then((diskData: Partial<CMSStorePayload>) => {
        if (!active) return;
        if (
          diskData &&
          diskData.siteConfig &&
          Array.isArray(diskData.projects) &&
          Array.isArray(diskData.categories)
        ) {
          // Safely merge disk projects with any locally saved projects
          const diskProjectMap = new Map(
            diskData.projects.map((p) => [p.id, p])
          );
          const localOnlyProjects = (store.projects || []).filter(
            (lp) => !diskProjectMap.has(lp.id)
          );
          const mergedProjectsList = [
            ...diskData.projects.map((dp) => {
              const localMatch = (store.projects || []).find((lp) => lp.id === dp.id);
              if (
                localMatch &&
                localMatch.updatedAt &&
                dp.updatedAt &&
                new Date(localMatch.updatedAt) > new Date(dp.updatedAt)
              ) {
                return localMatch;
              }
              return dp;
            }),
            ...localOnlyProjects,
          ].map(normalizeProjectDefaults);

          const merged: CMSStorePayload = {
            version: CURRENT_STORE_VERSION,
            siteConfig: normalizeSiteConfigDefaults(diskData.siteConfig),
            categories: diskData.categories,
            projects: mergedProjectsList,
            profileViews:
              typeof diskData.profileViews === 'number' &&
              diskData.profileViews >= 0
                ? diskData.profileViews
                : store.profileViews ?? 0,
          };
          recordSessionProfileVisit(merged);
        } else {
          recordSessionProfileVisit(store);
        }
      })
      .catch(() => {
        if (!active) return;
        recordSessionProfileVisit(store);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitStore = useCallback(
    (updater: (prev: CMSStorePayload) => CMSStorePayload) => {
      setStore((prev) => {
        const next = updater(prev);
        persistStoreToDisk(next);
        return next;
      });
    },
    []
  );

  const openCMS = useCallback(
    (tab: CMSActiveTab = 'projects', projectId: string | null = null) => {
      if (!isOwnerMode) return;
      setCmsActiveTab(tab);
      setEditingProjectId(projectId);
      setIsCMSOpen(true);
    },
    [isOwnerMode]
  );

  const closeCMS = useCallback(() => {
    setIsCMSOpen(false);
    setEditingProjectId(null);
  }, []);

  const openHeaderAvatarModal = useCallback(() => {
    if (!isOwnerMode) return;
    setIsHeaderAvatarModalOpen(true);
  }, [isOwnerMode]);

  const closeHeaderAvatarModal = useCallback(() => {
    setIsHeaderAvatarModalOpen(false);
  }, []);

  const updateSiteConfig = useCallback(
    (updater: (prev: SiteConfigData) => SiteConfigData) => {
      commitStore((prev) => ({
        ...prev,
        siteConfig: updater(prev.siteConfig),
      }));
    },
    [commitStore]
  );

  const updateHeaderAvatar = useCallback(
    (avatar: HeaderAvatarConfig) => {
      updateSiteConfig((prev) => ({
        ...prev,
        headerAvatar: avatar,
      }));
    },
    [updateSiteConfig]
  );

  const updateHeroAdjustments = useCallback(
    (adj: PortraitAdjustments) => {
      updateSiteConfig((prev) => ({
        ...prev,
        portraits: {
          ...prev.portraits,
          heroAdjustments: adj,
        },
      }));
    },
    [updateSiteConfig]
  );

  const updateProfileViews = useCallback(
    (count: number) => {
      commitStore((prev) => ({
        ...prev,
        profileViews: Math.max(0, count),
      }));
    },
    [commitStore]
  );

  const saveProjects = useCallback(
    (nextProjects: ProjectItem[]) => {
      const normalized = [...nextProjects]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((p, i) => normalizeProjectDefaults({ ...p, displayOrder: i + 1 }, i));
      commitStore((prev) => ({
        ...prev,
        projects: normalized,
      }));
    },
    [commitStore]
  );

  const addProject = useCallback(
    (projectInput: Omit<ProjectItem, 'id' | 'displayOrder'>): ProjectItem => {
      const newProject: ProjectItem = normalizeProjectDefaults(
        {
          ...projectInput,
          id: `project-${Date.now()}`,
          displayOrder: 1,
          visible: projectInput.visible ?? true,
          views: 0,
          likes: 0,
          appreciations: 0,
        },
        0
      );
      commitStore((prev) => {
        const nextProjects = [
          newProject,
          ...prev.projects.map((p, idx) => ({ ...p, displayOrder: idx + 2 })),
        ];
        return {
          ...prev,
          projects: nextProjects,
        };
      });
      return newProject;
    },
    [commitStore]
  );

  const updateProject = useCallback(
    (id: string, updated: Partial<ProjectItem>) => {
      commitStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === id ? { ...p, ...updated } : p
        ),
      }));
    },
    [commitStore]
  );

  const deleteProject = useCallback(
    (id: string) => {
      commitStore((prev) => {
        const remaining = prev.projects
          .filter((p) => p.id !== id)
          .map((p, idx) => ({ ...p, displayOrder: idx + 1 }));
        return {
          ...prev,
          projects: remaining,
        };
      });
    },
    [commitStore]
  );

  const reorderProject = useCallback(
    (id: string, direction: 'up' | 'down') => {
      commitStore((prev) => {
        const sorted = [...prev.projects].sort(
          (a, b) => a.displayOrder - b.displayOrder
        );
        const index = sorted.findIndex((p) => p.id === id);
        if (index === -1) return prev;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sorted.length) return prev;
        const temp = sorted[index];
        sorted[index] = sorted[targetIndex];
        sorted[targetIndex] = temp;
        const reindexed = sorted.map((p, idx) => ({
          ...p,
          displayOrder: idx + 1,
        }));
        return {
          ...prev,
          projects: reindexed,
        };
      });
    },
    [commitStore]
  );

  const toggleProjectVisibility = useCallback(
    (id: string) => {
      commitStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== id) return p;
          const currentlyPublished =
            p.status !== 'draft' && p.visible !== false;
          return {
            ...p,
            status: currentlyPublished ? 'draft' : 'published',
            visible: !currentlyPublished,
          };
        }),
      }));
    },
    [commitStore]
  );

  // Record a unique project view once per visitor session when opening a project
  const recordProjectView = useCallback(
    (id: string) => {
      try {
        const viewed = readStringArrayFromStorage(
          sessionStorage,
          VIEWED_PROJECTS_SESSION_KEY
        );
        if (viewed.includes(id)) {
          return;
        }
        const nextViewed = [...viewed, id];
        sessionStorage.setItem(
          VIEWED_PROJECTS_SESSION_KEY,
          JSON.stringify(nextViewed)
        );
      } catch {
        // Proceed even if sessionStorage is restricted
      }

      commitStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p
        ),
      }));
    },
    [commitStore]
  );

  // Toggle project Like (prevents unlimited repeated likes from the same visitor)
  const toggleProjectLike = useCallback(
    (id: string) => {
      setLikedProjectIds((prevLiked) => {
        const alreadyLiked = prevLiked.includes(id);
        const nextLiked = alreadyLiked
          ? prevLiked.filter((item) => item !== id)
          : [...prevLiked, id];

        try {
          localStorage.setItem(LIKED_PROJECTS_KEY, JSON.stringify(nextLiked));
        } catch {
          // Ignore
        }

        commitStore((prevStore) => ({
          ...prevStore,
          projects: prevStore.projects.map((p) => {
            if (p.id !== id) return p;
            const currentLikes = p.likes ?? 0;
            return {
              ...p,
              likes: alreadyLiked
                ? Math.max(0, currentLikes - 1)
                : currentLikes + 1,
            };
          }),
        }));

        return nextLiked;
      });
    },
    [commitStore]
  );

  // Toggle project Appreciation (prevents unlimited repeated appreciations from the same visitor)
  const toggleProjectAppreciation = useCallback(
    (id: string) => {
      setAppreciatedProjectIds((prevAppreciated) => {
        const alreadyAppreciated = prevAppreciated.includes(id);
        const nextAppreciated = alreadyAppreciated
          ? prevAppreciated.filter((item) => item !== id)
          : [...prevAppreciated, id];

        try {
          localStorage.setItem(
            APPRECIATED_PROJECTS_KEY,
            JSON.stringify(nextAppreciated)
          );
        } catch {
          // Ignore
        }

        commitStore((prevStore) => ({
          ...prevStore,
          projects: prevStore.projects.map((p) => {
            if (p.id !== id) return p;
            const currentAppreciations = p.appreciations ?? 0;
            return {
              ...p,
              appreciations: alreadyAppreciated
                ? Math.max(0, currentAppreciations - 1)
                : currentAppreciations + 1,
            };
          }),
        }));

        return nextAppreciated;
      });
    },
    [commitStore]
  );

  const renumberCategories = (cats: CategoryTabItem[]): CategoryTabItem[] => {
    return cats.map((cat, idx) => ({
      ...cat,
      code: String(idx + 1).padStart(2, '0'),
    }));
  };

  const saveCategories = useCallback(
    (nextCategories: CategoryTabItem[]) => {
      commitStore((prev) => ({
        ...prev,
        categories: renumberCategories(nextCategories),
      }));
    },
    [commitStore]
  );

  const addCategory = useCallback(
    (label: string, shortDesc: string): CategoryTabItem => {
      const slug =
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `category-${Date.now()}`;
      const newCat: CategoryTabItem = {
        id: slug,
        code: '00',
        label: label.toUpperCase(),
        shortDesc: shortDesc || 'Custom portfolio category',
      };
      commitStore((prev) => {
        const nextCats = renumberCategories([...prev.categories, newCat]);
        return {
          ...prev,
          categories: nextCats,
        };
      });
      return newCat;
    },
    [commitStore]
  );

  const updateCategory = useCallback(
    (id: string, updated: Partial<CategoryTabItem>) => {
      commitStore((prev) => {
        const nextCats = prev.categories.map((c) =>
          c.id === id ? { ...c, ...updated } : c
        );
        const targetCat = nextCats.find((c) => c.id === id);
        const nextProjects = targetCat
          ? prev.projects.map((p) =>
              p.category === id
                ? { ...p, categoryLabel: targetCat.label }
                : p
            )
          : prev.projects;
        return {
          ...prev,
          categories: nextCats,
          projects: nextProjects,
        };
      });
    },
    [commitStore]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      if (id === 'all') return;
      commitStore((prev) => {
        const remainingCats = renumberCategories(
          prev.categories.filter((c) => c.id !== id)
        );
        const fallbackCat =
          remainingCats.find((c) => c.id !== 'all') || remainingCats[0];
        const nextProjects = prev.projects.map((p) =>
          p.category === id && fallbackCat
            ? {
                ...p,
                category: fallbackCat.id,
                categoryLabel: fallbackCat.label,
              }
            : p
        );
        return {
          ...prev,
          categories: remainingCats,
          projects: nextProjects,
        };
      });
    },
    [commitStore]
  );

  const reorderCategory = useCallback(
    (id: string, direction: 'up' | 'down') => {
      commitStore((prev) => {
        const list = [...prev.categories];
        const index = list.findIndex((c) => c.id === id);
        if (index <= 0 && direction === 'up') return prev;
        if (id === 'all') return prev;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex <= 0 || targetIndex >= list.length) return prev;
        const temp = list[index];
        list[index] = list[targetIndex];
        list[targetIndex] = temp;
        return {
          ...prev,
          categories: renumberCategories(list),
        };
      });
    },
    [commitStore]
  );

  const uploadAssetFile = useCallback(
    async (file: File, targetPath?: string): Promise<string> => {
      // 1. Fast binary streaming upload directly to /__cms/upload (zero Base64 overhead, preserves 100% original image quality and dimensions)
      try {
        const headers: Record<string, string> = {
          'Content-Type': file.type || 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name || 'asset.png'),
        };
        if (targetPath) {
          headers['x-target-path'] = encodeURIComponent(targetPath);
        }
        const binaryRes = await fetch('/__cms/upload', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: file,
        });
        if (binaryRes.ok) {
          const json = (await binaryRes.json()) as {
            ok: boolean;
            url?: string;
          };
          if (json.ok && json.url) {
            return json.url;
          }
        }
      } catch {
        // Fallback to dataUrl if running without Node dev server
      }

      // 2. Fallback to dataUrl if running in a static-only environment
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      try {
        const res = await fetch('/__cms/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            filename: file.name,
            dataUrl,
            targetPath,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { ok: boolean; url?: string };
          if (json.ok && json.url) {
            return json.url;
          }
        }
      } catch {
        // Fallback to dataUrl
      }
      return dataUrl;
    },
    []
  );

  const [hasHeroPortraitBackup, setHasHeroPortraitBackup] = useState<boolean>(
    () => Boolean(store.siteConfig.portraits?.heroPortraitBackupPath)
  );

  // Synchronize backup status with server on mount
  useEffect(() => {
    fetch('/__cms/portrait/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.hasBackup === 'boolean') {
          setHasHeroPortraitBackup(data.hasBackup);
          if (data.hasBackup && data.backupUrl) {
            updateSiteConfig((prev) => ({
              ...prev,
              portraits: {
                ...prev.portraits,
                heroPortraitBackupPath: data.backupUrl,
              },
            }));
          }
        }
      })
      .catch(() => {});
  }, [updateSiteConfig]);

  const replaceHeroPortraitWithBackgroundRemoval = useCallback(
    async (
      file: File
    ): Promise<{ ok: boolean; url?: string; error?: string }> => {
      try {
        const res = await fetch('/__cms/portrait/replace-hero', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'x-file-name': encodeURIComponent(file.name || 'hero-portrait.png'),
          },
          credentials: 'include',
          body: file,
        });

        const json = await res.json();
        if (res.ok && json.ok && json.url) {
          updateSiteConfig((prev) => ({
            ...prev,
            portraits: {
              ...prev.portraits,
              heroPortraitPath: json.url,
              heroPortraitBackupPath:
                json.backupUrl || '/images/profile/hero-portrait-backup.png',
            },
          }));
          setHasHeroPortraitBackup(true);
          return { ok: true, url: json.url };
        } else if (json.error) {
          return { ok: false, error: json.error };
        }
      } catch (serverErr) {
        // Fallback to client-side browser background removal if backend route is unavailable
        try {
          const { removeBackground } = await import(
            '@imgly/background-removal'
          );
          const transparentBlob = await removeBackground(file);
          const transparentFile = new File(
            [transparentBlob],
            'hero-portrait.png',
            { type: 'image/png' }
          );
          const newUrl = await uploadAssetFile(
            transparentFile,
            '/images/profile/hero-portrait.png'
          );
          updateSiteConfig((prev) => ({
            ...prev,
            portraits: {
              ...prev.portraits,
              heroPortraitPath: newUrl,
              heroPortraitBackupPath:
                prev.portraits.heroPortraitBackupPath ||
                prev.portraits.heroPortraitPath,
            },
          }));
          setHasHeroPortraitBackup(true);
          return { ok: true, url: newUrl };
        } catch (clientErr) {
          return {
            ok: false,
            error:
              clientErr instanceof Error
                ? clientErr.message
                : String(clientErr),
          };
        }
      }
      return {
        ok: false,
        error: 'Background removal failed. Portrait was not replaced.',
      };
    },
    [updateSiteConfig, uploadAssetFile]
  );

  const restorePreviousHeroPortrait = useCallback(
    async (): Promise<{ ok: boolean; url?: string; error?: string }> => {
      try {
        const res = await fetch('/__cms/portrait/restore-hero', {
          method: 'POST',
          credentials: 'include',
        });
        const json = await res.json();
        if (res.ok && json.ok && json.url) {
          updateSiteConfig((prev) => ({
            ...prev,
            portraits: {
              ...prev.portraits,
              heroPortraitPath: json.url,
            },
          }));
          return { ok: true, url: json.url };
        } else if (json.error) {
          return { ok: false, error: json.error };
        }
      } catch (err) {
        const backupUrl =
          store.siteConfig.portraits.heroPortraitBackupPath ||
          '/images/profile/hero-portrait-backup.png';
        const timestampedUrl = `${backupUrl}?t=${Date.now()}`;
        updateSiteConfig((prev) => ({
          ...prev,
          portraits: {
            ...prev.portraits,
            heroPortraitPath: timestampedUrl,
          },
        }));
        return { ok: true, url: timestampedUrl };
      }
      return { ok: false, error: 'Failed to restore previous portrait.' };
    },
    [updateSiteConfig, store.siteConfig.portraits.heroPortraitBackupPath]
  );

  const resetAllToDefaults = useCallback(() => {
    commitStore((prev) => ({
      ...DEFAULT_STORE,
      profileViews: prev.profileViews ?? 1,
    }));
  }, [commitStore]);

  const sortedProjects = useMemo(
    () => [...store.projects].sort((a, b) => a.displayOrder - b.displayOrder),
    [store.projects]
  );

  const publishedProjects = useMemo(
    () =>
      sortedProjects.filter(
        (p) => p.status !== 'draft' && p.visible !== false
      ),
    [sortedProjects]
  );

  const draftProjects = useMemo(
    () =>
      sortedProjects.filter(
        (p) => p.status === 'draft' || p.visible === false
      ),
    [sortedProjects]
  );

  const visibleProjects = publishedProjects;

  const featuredProjects = useMemo(() => {
    const feat = publishedProjects.filter((p) => p.featured);
    return feat.length > 0 ? feat : publishedProjects.slice(0, 4);
  }, [publishedProjects]);

  const value = useMemo<PortfolioCMSContextValue>(
    () => ({
      siteConfig: store.siteConfig,
      categories: store.categories,
      projects: sortedProjects,
      visibleProjects,
      publishedProjects,
      draftProjects,
      featuredProjects,
      profileViews: store.profileViews ?? 0,
      updateProfileViews,
      likedProjectIds,
      appreciatedProjectIds,
      isOwnerMode,
      setIsOwnerMode,
      authStatus,
      isLoginModalOpen,
      openLoginModal,
      closeLoginModal,
      login,
      logout,
      setupOwner,
      builderProjectId,
      openProjectBuilder,
      closeProjectBuilder,
      isCMSOpen,
      cmsActiveTab,
      editingProjectId,
      isHeaderAvatarModalOpen,
      openCMS,
      closeCMS,
      openHeaderAvatarModal,
      closeHeaderAvatarModal,
      updateSiteConfig,
      updateHeaderAvatar,
      saveProjects,
      addProject,
      updateProject,
      deleteProject,
      reorderProject,
      toggleProjectVisibility,
      recordProjectView,
      toggleProjectLike,
      toggleProjectAppreciation,
      saveCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      reorderCategory,
      uploadAssetFile,
      replaceHeroPortraitWithBackgroundRemoval,
      restorePreviousHeroPortrait,
      hasHeroPortraitBackup,
      quickEditConfig,
      openQuickEdit,
      closeQuickEdit,
      portraitAdjusterConfig,
      openPortraitAdjuster,
      closePortraitAdjuster,
      updateHeroAdjustments,
      resetAllToDefaults,
    }),
    [
      store.siteConfig,
      store.categories,
      sortedProjects,
      visibleProjects,
      publishedProjects,
      draftProjects,
      featuredProjects,
      store.profileViews,
      updateProfileViews,
      likedProjectIds,
      appreciatedProjectIds,
      isOwnerMode,
      setIsOwnerMode,
      authStatus,
      isLoginModalOpen,
      openLoginModal,
      closeLoginModal,
      login,
      logout,
      setupOwner,
      builderProjectId,
      openProjectBuilder,
      closeProjectBuilder,
      isCMSOpen,
      cmsActiveTab,
      editingProjectId,
      isHeaderAvatarModalOpen,
      openCMS,
      closeCMS,
      openHeaderAvatarModal,
      closeHeaderAvatarModal,
      updateSiteConfig,
      updateHeaderAvatar,
      saveProjects,
      addProject,
      updateProject,
      deleteProject,
      reorderProject,
      toggleProjectVisibility,
      recordProjectView,
      toggleProjectLike,
      toggleProjectAppreciation,
      saveCategories,
      addCategory,
      updateCategory,
      deleteCategory,
      reorderCategory,
      uploadAssetFile,
      replaceHeroPortraitWithBackgroundRemoval,
      restorePreviousHeroPortrait,
      hasHeroPortraitBackup,
      quickEditConfig,
      openQuickEdit,
      closeQuickEdit,
      portraitAdjusterConfig,
      openPortraitAdjuster,
      closePortraitAdjuster,
      updateHeroAdjustments,
      resetAllToDefaults,
    ]
  );

  return (
    <PortfolioCMSContext.Provider value={value}>
      {children}
    </PortfolioCMSContext.Provider>
  );
};

export function usePortfolioCMS(): PortfolioCMSContextValue {
  const ctx = useContext(PortfolioCMSContext);
  if (!ctx) {
    throw new Error(
      'usePortfolioCMS must be used inside a PortfolioCMSProvider'
    );
  }
  return ctx;
}
