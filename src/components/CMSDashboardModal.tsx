import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  FolderKanban,
  Tags,
  User,
  Briefcase,
  Mail,
  Check,
  Edit3,
  Star,
  Image as ImageIcon,
  RotateCcw,
  Undo2,
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
  AlertCircle,
  Loader2,
  KeyRound,
  Inbox,
} from 'lucide-react';
import {
  usePortfolioCMS,
  CMSActiveTab,
} from '../context/PortfolioCMSContext';
import { ProjectItem } from '../data/projects';

export const CMSDashboardModal: React.FC = () => {
  const {
    siteConfig,
    categories,
    projects,
    isOwnerMode,
    isCMSOpen,
    cmsActiveTab,
    editingProjectId,
    openCMS,
    closeCMS,
    openProjectBuilder,
    openHeaderAvatarModal,
    updateSiteConfig,
    addProject,
    updateProject,
    deleteProject,
    reorderProject,
    toggleProjectVisibility,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategory,
    uploadAssetFile,
    replaceHeroPortraitWithBackgroundRemoval,
    restorePreviousHeroPortrait,
    hasHeroPortraitBackup,
    resetAllToDefaults,
  } = usePortfolioCMS();

  const nonAllCategories = categories.filter((c) => c.id !== 'all');

  // Project Form State (for Add or Edit)
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'new' | null>(
    null
  );
  const [projTitle, setProjTitle] = useState('');
  const [projCategory, setProjCategory] = useState(
    nonAllCategories[0]?.id || 'logo'
  );
  const [projDesc, setProjDesc] = useState('');
  const [projThumbnail, setProjThumbnail] = useState('');
  const [projFullImage, setProjFullImage] = useState('');
  const [projFeaturedCover, setProjFeaturedCover] = useState('');
  const [projFeatured, setProjFeatured] = useState(false);
  const [projVisible, setProjVisible] = useState(true);
  const [projSpan, setProjSpan] = useState<ProjectItem['editorialSpan']>('standard');
  const [projAspect, setProjAspect] = useState<ProjectItem['aspectRatio']>('1/1');
  const [projTools, setProjTools] = useState('Adobe Illustrator');
  const [projDeliverables, setProjDeliverables] = useState('Primary Mark, Vector Files');
  const [projSheets, setProjSheets] = useState<{ label: string; image: string }[]>(
    []
  );
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Category Add State
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Gmail Inquiry Delivery Configuration State
  const [gmailAddress, setGmailAddress] = useState(
    siteConfig.contact.emailPlaceholder || ''
  );
  const [emailProvider, setEmailProvider] = useState<
    'gmail-smtp' | 'formsubmit' | 'web3forms' | 'resend'
  >('gmail-smtp');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpAppPassword, setSmtpAppPassword] = useState('');
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [providerApiKey, setProviderApiKey] = useState('');
  const [senderName, setSenderName] = useState(
    `${siteConfig.name} Portfolio Inquiry`
  );
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    recipientGmail: string;
    provider: 'gmail-smtp' | 'formsubmit' | 'web3forms' | 'resend';
    hasAppPassword: boolean;
    maskedAppPassword: string;
    hasApiKey: boolean;
    maskedApiKey: string;
    lastVerifiedAt: string | null;
    lastTestStatus: 'success' | 'error' | null;
    lastTestMessage: string | null;
  } | null>(null);
  const [recentInquiries, setRecentInquiries] = useState<
    Array<{
      id: string;
      clientName: string;
      clientEmail: string;
      subject: string;
      service: string;
      budget?: string;
      message: string;
      submittedAtFormatted: string;
      deliveredVia: string;
      recipientGmail: string;
      status: 'delivered' | 'failed';
      errorMessage?: string;
    }>
  >([]);
  const [isSavingEmailConfig, setIsSavingEmailConfig] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailConfigFeedback, setEmailConfigFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 3200);
  };

  const fetchEmailConfigurationStatus = async () => {
    try {
      const [statusRes, logRes] = await Promise.all([
        fetch('/__cms/email/status', { credentials: 'include' }),
        fetch('/__cms/email/inquiries', { credentials: 'include' }),
      ]);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setEmailStatus(statusData);
        if (statusData.recipientGmail) {
          setGmailAddress(statusData.recipientGmail);
        }
        if (statusData.provider) {
          setEmailProvider(statusData.provider);
        }
        if (statusData.smtpUser) {
          setSmtpUser(statusData.smtpUser);
        }
        if (statusData.senderName) {
          setSenderName(statusData.senderName);
        }
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        if (Array.isArray(logData.inquiries)) {
          setRecentInquiries(logData.inquiries);
        }
      }
    } catch {
      // ignore if offline
    }
  };

  useEffect(() => {
    if (isCMSOpen && cmsActiveTab === 'contact') {
      fetchEmailConfigurationStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCMSOpen, cmsActiveTab]);

  const handleSaveGmailConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = gmailAddress.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailConfigFeedback({
        type: 'error',
        message: 'Please enter a valid destination Gmail address.',
      });
      return;
    }

    setIsSavingEmailConfig(true);
    setEmailConfigFeedback(null);

    try {
      // Keep public contact email synchronized with configured destination Gmail
      if (cleanEmail !== siteConfig.contact.emailPlaceholder) {
        updateSiteConfig((prev) => ({
          ...prev,
          contact: {
            ...prev.contact,
            emailPlaceholder: cleanEmail,
          },
        }));
      }

      const res = await fetch('/__cms/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientGmail: cleanEmail,
          provider: emailProvider,
          smtpUser: smtpUser.trim() || cleanEmail,
          smtpAppPassword: smtpAppPassword.trim() || undefined,
          apiKey: providerApiKey.trim() || undefined,
          senderName: senderName.trim() || `${siteConfig.name} Portfolio Inquiry`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setEmailConfigFeedback({
          type: 'error',
          message: data?.error || 'Could not save Gmail settings.',
        });
      } else {
        if (data.status) {
          setEmailStatus(data.status);
        }
        setSmtpAppPassword('');
        setProviderApiKey('');
        setEmailConfigFeedback({
          type: data.verificationWarning ? 'warning' : 'success',
          message:
            data.message ||
            `Gmail destination (${cleanEmail}) saved securely.`,
        });
        showToast('Gmail inquiry settings saved.');
      }
    } catch {
      setEmailConfigFeedback({
        type: 'error',
        message: 'Network error while saving Gmail configuration.',
      });
    } finally {
      setIsSavingEmailConfig(false);
    }
  };

  const handleSendTestGmail = async () => {
    const cleanEmail = gmailAddress.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailConfigFeedback({
        type: 'error',
        message: 'Please enter a valid destination Gmail address before testing.',
      });
      return;
    }

    setIsSendingTestEmail(true);
    setEmailConfigFeedback(null);

    try {
      // First save any pending edits so the test uses the latest settings
      await fetch('/__cms/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientGmail: cleanEmail,
          provider: emailProvider,
          smtpUser: smtpUser.trim() || cleanEmail,
          smtpAppPassword: smtpAppPassword.trim() || undefined,
          apiKey: providerApiKey.trim() || undefined,
          senderName: senderName.trim() || `${siteConfig.name} Portfolio Inquiry`,
        }),
      });
      setSmtpAppPassword('');
      setProviderApiKey('');

      const res = await fetch('/__cms/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (data?.status) {
        setEmailStatus(data.status);
      }

      if (!res.ok || !data?.ok) {
        setEmailConfigFeedback({
          type: 'error',
          message:
            data?.error ||
            'Test email failed. Please check your Gmail configuration and try again.',
        });
      } else {
        setEmailConfigFeedback({
          type: 'success',
          message:
            data.message ||
            `Test inquiry email sent to ${cleanEmail}! Check your Gmail Inbox.`,
        });
        showToast(`Test email sent to ${cleanEmail}`);
      }
    } catch {
      setEmailConfigFeedback({
        type: 'error',
        message: 'Network error while sending test email.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Sync editingProjectId when opened directly from a project card edit button
  useEffect(() => {
    if (editingProjectId) {
      const found = projects.find((p) => p.id === editingProjectId);
      if (found) {
        loadProjectIntoForm(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProjectId]);

  const loadProjectIntoForm = (proj: ProjectItem) => {
    setSelectedProjectId(proj.id);
    setProjTitle(proj.title);
    setProjCategory(proj.category);
    setProjDesc(proj.description);
    setProjThumbnail(proj.thumbnail);
    setProjFullImage(proj.fullImage);
    setProjFeaturedCover(proj.featuredCover || '');
    setProjFeatured(proj.featured);
    setProjVisible(proj.visible !== false);
    setProjSpan(proj.editorialSpan);
    setProjAspect(proj.aspectRatio);
    setProjTools(proj.tools.join(', '));
    setProjDeliverables(proj.deliverables.join(', '));
    setProjSheets(proj.sheets ? [...proj.sheets] : []);
  };

  const startNewProjectForm = () => {
    const defaultCat = nonAllCategories[0]?.id || 'logo';
    setSelectedProjectId('new');
    setProjTitle('');
    setProjCategory(defaultCat);
    setProjDesc('');
    setProjThumbnail('/images/portfolio/logos/logo-01.svg');
    setProjFullImage('/images/portfolio/logos/logo-01.svg');
    setProjFeaturedCover('');
    setProjFeatured(false);
    setProjVisible(true);
    setProjSpan('standard');
    setProjAspect('1/1');
    setProjTools('Adobe Illustrator');
    setProjDeliverables('Brand Identity Deliverable');
    setProjSheets([]);
  };

  const handleSaveProjectForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim()) return;
    const catObj =
      categories.find((c) => c.id === projCategory) || nonAllCategories[0];
    const toolsArr = projTools
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const delivArr = projDeliverables
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const derivedBlocks =
      projSheets.length > 0
        ? projSheets.map((s, idx) => ({
            id: `sheet-block-${Date.now()}-${idx}`,
            type: 'image' as const,
            imageUrl: s.image,
            caption: s.label,
            layout: 'full' as const,
          }))
        : undefined;

    const payload = {
      title: projTitle.trim(),
      category: projCategory,
      categoryLabel: catObj ? catObj.label : projCategory.toUpperCase(),
      thumbnail: projThumbnail || '/images/portfolio/logos/logo-01.svg',
      fullImage:
        projFullImage || projThumbnail || '/images/portfolio/logos/logo-01.svg',
      featuredCover: projFeaturedCover.trim() || undefined,
      sheets: projSheets.length > 0 ? projSheets : undefined,
      ...(derivedBlocks ? { contentBlocks: derivedBlocks } : {}),
      description: projDesc.trim(),
      featured: projFeatured,
      status: projVisible ? ('published' as const) : ('draft' as const),
      visible: projVisible,
      editorialSpan: projSpan,
      aspectRatio: projAspect,
      tools: toolsArr.length > 0 ? toolsArr : ['Adobe Illustrator'],
      deliverables: delivArr.length > 0 ? delivArr : ['Design Deliverable'],
    };

    if (selectedProjectId === 'new') {
      const created = addProject(payload);
      setSelectedProjectId(created.id);
      showToast(`Added "${created.title}" and saved to disk.`);
    } else if (selectedProjectId) {
      updateProject(selectedProjectId, payload);
      showToast(`Updated "${payload.title}" and saved to disk.`);
    }
  };

  const handleImageUpload = async (
    file: File | undefined,
    fieldKey: string,
    onUrl: (url: string) => void,
    targetPath?: string
  ) => {
    if (!file) return;
    setUploadingField(fieldKey);
    try {
      const url = await uploadAssetFile(file, targetPath);
      onUrl(url);
      showToast('Image uploaded and saved to project folder.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    addCategory(newCatLabel.trim(), newCatDesc.trim());
    setNewCatLabel('');
    setNewCatDesc('');
    showToast('Category added and saved.');
  };

  const TABS: { id: CMSActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderKanban className="h-4 w-4" />,
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: <Tags className="h-4 w-4" />,
    },
    {
      id: 'hero-about',
      label: 'Hero & About',
      icon: <User className="h-4 w-4" />,
    },
    {
      id: 'services',
      label: 'Services & Titles',
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      id: 'contact',
      label: 'Contact & Gmail',
      icon: <Mail className="h-4 w-4" />,
    },
  ];

  if (!isOwnerMode) {
    return null;
  }

  return (
    <AnimatePresence>
      {isCMSOpen && (
        <motion.div
          key="cms-dashboard-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-obsidian/92 p-3 backdrop-blur-2xl sm:p-6"
          onClick={closeCMS}
        >
          <motion.div
            initial={{ scale: 0.96, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 18, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-cream/15 bg-charcoal text-cream shadow-studio"
          >
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream/10 bg-obsidian px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#DF00FF] to-[#00BDFF] font-display text-xs font-bold text-white">
                  CMS
                </span>
                <div>
                  <h2 className="font-display text-base font-bold uppercase tracking-wider text-cream">
                    Portfolio Studio Manager
                  </h2>
                  <p className="text-xs text-stone">
                    All edits and image uploads save automatically and persist
                    after refreshing
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {statusBanner && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#7ca6e8]/40 bg-[#7ca6e8]/15 px-3.5 py-1.5 text-xs font-semibold text-[#f1b39c]">
                    <Check className="h-3.5 w-3.5" />
                    {statusBanner}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Reset all portfolio content and categories back to factory defaults?'
                      )
                    ) {
                      resetAllToDefaults();
                      showToast('Reset to default content.');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs font-semibold text-stone transition hover:border-cream/35 hover:text-cream"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={closeCMS}
                  aria-label="Close Studio Manager"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream/15 bg-charcoal text-cream transition hover:border-[#7ca6e8] hover:text-[#7ca6e8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-cream/10 bg-obsidian/60 px-6 py-3">
              {TABS.map((t) => {
                const active = cmsActiveTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openCMS(t.id, null)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition ${
                      active
                        ? 'bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]'
                        : 'text-cream/75 hover:bg-charcoal hover:text-cream'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: PORTFOLIO PROJECTS */}
              {cmsActiveTab === 'projects' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* Left List of Projects (5 cols) */}
                  <div className="space-y-3 lg:col-span-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#f1b39c]">
                        All Projects ({projects.length})
                      </h3>
                      <button
                        type="button"
                        onClick={startNewProjectForm}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-110"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Project</span>
                      </button>
                    </div>

                    <div className="max-h-[64vh] space-y-2.5 overflow-y-auto pr-1">
                      {projects.map((proj, idx) => {
                        const isSelected = selectedProjectId === proj.id;
                        return (
                          <div
                            key={proj.id}
                            className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition ${
                              isSelected
                                ? 'border-[#7ca6e8] bg-obsidian'
                                : 'border-cream/10 bg-obsidian/50 hover:border-cream/25'
                            }`}
                          >
                            <div
                              onClick={() => loadProjectIntoForm(proj)}
                              className="flex flex-1 cursor-pointer items-center gap-3 overflow-hidden"
                            >
                              <img
                                src={proj.thumbnail}
                                alt={proj.title}
                                className="h-12 w-12 shrink-0 rounded-lg border border-cream/10 object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate font-display text-xs font-bold text-cream">
                                    {proj.title}
                                  </span>
                                  {proj.featured && (
                                    <Star className="h-3 w-3 shrink-0 fill-[#f1b39c] text-[#f1b39c]" />
                                  )}
                                </div>
                                <span className="block text-[11px] text-[#7ca6e8]">
                                  {proj.categoryLabel}
                                </span>
                              </div>
                            </div>

                            {/* Visibility, Reorder & Delete Controls */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  toggleProjectVisibility(proj.id);
                                  if (selectedProjectId === proj.id) {
                                    setProjVisible(proj.visible === false);
                                  }
                                }}
                                title={
                                  proj.visible !== false
                                    ? 'Visible in gallery (click to hide)'
                                    : 'Hidden from gallery (click to show)'
                                }
                                className={`rounded-lg border p-1.5 transition ${
                                  proj.visible !== false
                                    ? 'border-cream/10 text-[#a9cbff] hover:border-[#a9cbff]'
                                    : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                                }`}
                              >
                                {proj.visible !== false ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => reorderProject(proj.id, 'up')}
                                title="Move Up"
                                className="rounded-lg border border-cream/10 p-1.5 text-cream/70 hover:border-[#7ca6e8] hover:text-cream disabled:opacity-30"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === projects.length - 1}
                                onClick={() => reorderProject(proj.id, 'down')}
                                title="Move Down"
                                className="rounded-lg border border-cream/10 p-1.5 text-cream/70 hover:border-[#7ca6e8] hover:text-cream disabled:opacity-30"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openProjectBuilder(proj.id)}
                                title="Edit Project in Full-Page Project Builder"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#a9cbff]/40 bg-[#191628] px-2 py-1.5 font-display text-[10px] font-bold uppercase text-[#a9cbff] hover:bg-[#a9cbff] hover:text-obsidian"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteProject(proj.id);
                                  if (selectedProjectId === proj.id) {
                                    setSelectedProjectId(null);
                                  }
                                  showToast('Project deleted.');
                                }}
                                title="Delete Project"
                                className="rounded-lg border border-red-400/20 p-1.5 text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Project Editor Form (7 cols) */}
                  <div className="rounded-2xl border border-cream/12 bg-obsidian/70 p-5 lg:col-span-7">
                    {selectedProjectId ? (
                      <form
                        onSubmit={handleSaveProjectForm}
                        className="space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream/10 pb-3">
                          <div className="flex items-center gap-2.5">
                            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-[#7ca6e8]">
                              {selectedProjectId === 'new'
                                ? 'Add New Portfolio Project'
                                : 'Edit Project Details'}
                            </h4>
                            <button
                              type="button"
                              onClick={() =>
                                openProjectBuilder(selectedProjectId)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-[#ffd8be]/40 bg-[#1d182d] px-2.5 py-1 font-display text-[10px] font-extrabold uppercase tracking-wider text-[#ffd8be] hover:bg-[#ffd8be] hover:text-obsidian"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Open in Full Builder</span>
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#a9cbff]">
                              <input
                                type="checkbox"
                                checked={projVisible}
                                onChange={(e) =>
                                  setProjVisible(e.target.checked)
                                }
                                className="h-4 w-4 accent-[#7ca6e8]"
                              />
                              <span>Visible in Gallery</span>
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#f1b39c]">
                              <input
                                type="checkbox"
                                checked={projFeatured}
                                onChange={(e) =>
                                  setProjFeatured(e.target.checked)
                                }
                                className="h-4 w-4 accent-[#b86bd4]"
                              />
                              <span>Featured Project</span>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-cream/80">
                              Project Title *
                            </label>
                            <input
                              type="text"
                              required
                              value={projTitle}
                              onChange={(e) => setProjTitle(e.target.value)}
                              placeholder="e.g., Apex Geometric Brand Mark"
                              className="mt-1.5 w-full rounded-xl border border-cream/15 bg-charcoal px-3.5 py-2.5 text-sm text-cream focus:border-[#7ca6e8] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-cream/80">
                              Category *
                            </label>
                            <select
                              value={projCategory}
                              onChange={(e) => setProjCategory(e.target.value)}
                              className="mt-1.5 w-full rounded-xl border border-cream/15 bg-charcoal px-3.5 py-2.5 text-sm text-cream focus:border-[#7ca6e8] focus:outline-none"
                            >
                              {nonAllCategories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-cream/80">
                            Description
                          </label>
                          <textarea
                            rows={2}
                            value={projDesc}
                            onChange={(e) => setProjDesc(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-cream/15 bg-charcoal px-3.5 py-2.5 text-sm text-cream focus:border-[#7ca6e8] focus:outline-none"
                          />
                        </div>

                        {/* Cover / Main Image Upload */}
                        <div className="grid grid-cols-1 gap-4 rounded-xl border border-cream/10 bg-charcoal/60 p-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#f1b39c]">
                              Project Cover &amp; Full Image
                            </label>
                            <div className="mt-2 flex items-center gap-3">
                              {projThumbnail && (
                                <img
                                  src={projThumbnail}
                                  alt="Cover preview"
                                  className="h-16 w-16 rounded-lg border border-cream/15 object-cover"
                                />
                              )}
                              <div className="flex flex-col gap-1.5">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#7ca6e8] px-3 py-1.5 font-display text-[11px] font-bold uppercase text-obsidian hover:brightness-110">
                                  <Upload className="h-3.5 w-3.5" />
                                  <span>
                                    {uploadingField === 'cover'
                                      ? 'Uploading...'
                                      : 'Upload Image'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleImageUpload(
                                        e.target.files?.[0],
                                        'cover',
                                        (url) => {
                                          setProjThumbnail(url);
                                          setProjFullImage(url);
                                        }
                                      )
                                    }
                                  />
                                </label>
                                <input
                                  type="text"
                                  value={projThumbnail}
                                  onChange={(e) => {
                                    setProjThumbnail(e.target.value);
                                    setProjFullImage(e.target.value);
                                  }}
                                  placeholder="Or paste image path"
                                  className="rounded-lg border border-cream/15 bg-obsidian px-2.5 py-1 text-xs text-cream"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Optional Wide Featured Cover */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#b86bd4]">
                              Featured Slider Cover (Optional)
                            </label>
                            <div className="mt-2 flex items-center gap-3">
                              {projFeaturedCover && (
                                <img
                                  src={projFeaturedCover}
                                  alt="Featured preview"
                                  className="h-16 w-20 rounded-lg border border-cream/15 object-cover"
                                />
                              )}
                              <div className="flex flex-col gap-1.5">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cream/20 bg-obsidian px-3 py-1.5 font-display text-[11px] font-bold uppercase text-cream hover:border-[#b86bd4]">
                                  <Upload className="h-3.5 w-3.5 text-[#b86bd4]" />
                                  <span>
                                    {uploadingField === 'featured'
                                      ? 'Uploading...'
                                      : 'Upload Wide Cover'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleImageUpload(
                                        e.target.files?.[0],
                                        'featured',
                                        (url) => setProjFeaturedCover(url)
                                      )
                                    }
                                  />
                                </label>
                                {projFeaturedCover && (
                                  <button
                                    type="button"
                                    onClick={() => setProjFeaturedCover('')}
                                    className="text-left text-[11px] text-red-300 hover:underline"
                                  >
                                    Remove Featured Cover
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Project Images / Multi-Sheet Gallery */}
                        <div className="rounded-xl border border-cream/10 bg-charcoal/60 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-cream/85">
                              Additional Project Sheets / Gallery Images (
                              {projSheets.length})
                            </span>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#7ca6e8]/40 bg-[#7ca6e8]/15 px-3 py-1 font-display text-[11px] font-bold uppercase text-[#7ca6e8] hover:bg-[#7ca6e8]/25">
                              <Plus className="h-3.5 w-3.5" />
                              <span>Upload Additional Sheet</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleImageUpload(
                                    e.target.files?.[0],
                                    'sheet',
                                    (url) =>
                                      setProjSheets((prev) => [
                                        ...prev,
                                        {
                                          label: `Sheet 0${prev.length + 1}`,
                                          image: url,
                                        },
                                      ])
                                  )
                                }
                              />
                            </label>
                          </div>

                          {projSheets.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {projSheets.map((sh, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex items-center gap-2.5 rounded-lg border border-cream/10 bg-obsidian p-2"
                                >
                                  <img
                                    src={sh.image}
                                    alt={sh.label}
                                    className="h-10 w-14 rounded object-cover"
                                  />
                                  <input
                                    type="text"
                                    value={sh.label}
                                    onChange={(e) =>
                                      setProjSheets((prev) =>
                                        prev.map((item, i) =>
                                          i === sIdx
                                            ? { ...item, label: e.target.value }
                                            : item
                                        )
                                      )
                                    }
                                    className="flex-1 rounded border border-cream/15 bg-charcoal px-2.5 py-1 text-xs text-cream"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProjSheets((prev) =>
                                        prev.filter((_, i) => i !== sIdx)
                                      )
                                    }
                                    className="p-1 text-red-300 hover:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Layout & Metadata */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-stone">
                              Aspect Ratio
                            </label>
                            <select
                              value={projAspect}
                              onChange={(e) =>
                                setProjAspect(
                                  e.target.value as ProjectItem['aspectRatio']
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-cream/15 bg-charcoal px-2.5 py-2 text-xs text-cream"
                            >
                              <option value="1/1">1:1 Square</option>
                              <option value="4/3">4:3 Landscape</option>
                              <option value="4/5">4:5 Portrait</option>
                              <option value="16/10">16:10 Wide</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-stone">
                              Grid Size
                            </label>
                            <select
                              value={projSpan}
                              onChange={(e) =>
                                setProjSpan(
                                  e.target.value as ProjectItem['editorialSpan']
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-cream/15 bg-charcoal px-2.5 py-2 text-xs text-cream"
                            >
                              <option value="standard">Standard (1/3)</option>
                              <option value="feature">Medium (1/2)</option>
                              <option value="wide">Wide (2/3)</option>
                              <option value="tall">Tall (1/3)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-stone">
                              Tools (comma-sep)
                            </label>
                            <input
                              type="text"
                              value={projTools}
                              onChange={(e) => setProjTools(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-cream/15 bg-charcoal px-2.5 py-2 text-xs text-cream"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-stone">
                              Deliverables
                            </label>
                            <input
                              type="text"
                              value={projDeliverables}
                              onChange={(e) =>
                                setProjDeliverables(e.target.value)
                              }
                              className="mt-1 w-full rounded-lg border border-cream/15 bg-charcoal px-2.5 py-2 text-xs text-cream"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProjectId(null)}
                            className="rounded-xl border border-cream/15 px-4 py-2.5 font-display text-xs font-bold uppercase text-cream/80"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]"
                          >
                            <Check className="h-4 w-4" />
                            <span>Save Project</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                        <ImageIcon className="h-10 w-10 text-[#7ca6e8]/60" />
                        <p className="mt-3 font-display text-sm font-bold uppercase text-cream">
                          Select a project on the left to edit, or click
                          &ldquo;Add Project&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={startNewProjectForm}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Create New Project</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PORTFOLIO CATEGORIES */}
              {cmsActiveTab === 'categories' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="space-y-3 lg:col-span-7">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#f1b39c]">
                      Manage Portfolio Categories
                    </h3>
                    {categories.map((cat, idx) => (
                      <div
                        key={cat.id}
                        className="flex flex-col gap-3 rounded-2xl border border-cream/12 bg-obsidian/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-[#5c4577] px-2 py-0.5 font-display text-[10px] font-bold text-cream">
                              {cat.code}
                            </span>
                            <input
                              type="text"
                              value={cat.label}
                              onChange={(e) =>
                                updateCategory(cat.id, {
                                  label: e.target.value.toUpperCase(),
                                })
                              }
                              className="flex-1 rounded-lg border border-cream/15 bg-charcoal px-3 py-1.5 font-display text-xs font-bold uppercase text-cream focus:border-[#7ca6e8] focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            value={cat.shortDesc}
                            onChange={(e) =>
                              updateCategory(cat.id, {
                                shortDesc: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-cream/10 bg-charcoal px-3 py-1.5 text-xs text-cream/85 focus:border-[#7ca6e8] focus:outline-none"
                          />
                        </div>

                        {cat.id !== 'all' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={idx <= 1}
                              onClick={() => reorderCategory(cat.id, 'up')}
                              className="rounded-lg border border-cream/15 p-2 text-cream/80 hover:border-[#7ca6e8] disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === categories.length - 1}
                              onClick={() => reorderCategory(cat.id, 'down')}
                              className="rounded-lg border border-cream/15 p-2 text-cream/80 hover:border-[#7ca6e8] disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteCategory(cat.id);
                                showToast(`Removed category "${cat.label}".`);
                              }}
                              className="rounded-lg border border-red-400/25 p-2 text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add New Category Box */}
                  <div className="lg:col-span-5">
                    <form
                      onSubmit={handleAddCategory}
                      className="rounded-2xl border border-cream/12 bg-obsidian/70 p-5 space-y-4"
                    >
                      <h4 className="font-display text-sm font-bold uppercase tracking-wider text-[#7ca6e8]">
                        Add New Category
                      </h4>
                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Category Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={newCatLabel}
                          onChange={(e) => setNewCatLabel(e.target.value)}
                          placeholder="e.g., PACKAGING DESIGN"
                          className="mt-1.5 w-full rounded-xl border border-cream/15 bg-charcoal px-3.5 py-2.5 text-sm text-cream"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Short Subtitle
                        </label>
                        <input
                          type="text"
                          value={newCatDesc}
                          onChange={(e) => setNewCatDesc(e.target.value)}
                          placeholder="e.g., Custom product boxes & labels"
                          className="mt-1.5 w-full rounded-xl border border-cream/15 bg-charcoal px-3.5 py-2.5 text-sm text-cream"
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Category</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: HERO & ABOUT CONTENT */}
              {cmsActiveTab === 'hero-about' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Hero & Profile Settings */}
                  <div className="space-y-4 rounded-2xl border border-cream/12 bg-obsidian/70 p-5">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#f1b39c]">
                      Hero Section &amp; Personal Identity
                    </h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Script Greeting
                        </label>
                        <input
                          type="text"
                          value={siteConfig.heroGreeting}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              heroGreeting: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Your Full Name
                        </label>
                        <input
                          type="text"
                          value={siteConfig.name}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Professional Title
                        </label>
                        <input
                          type="text"
                          value={siteConfig.title}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Giant Background Text
                        </label>
                        <input
                          type="text"
                          value={siteConfig.heroBackgroundText}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              heroBackgroundText: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-cream/80">
                        Hero Introduction
                      </label>
                      <textarea
                        rows={2}
                        value={siteConfig.heroIntro}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            heroIntro: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                      />
                    </div>

                    {/* Portrait Uploads */}
                    <div className="space-y-3 rounded-xl border border-cream/10 bg-charcoal/70 p-4">
                      <span className="block text-xs font-bold uppercase tracking-wider text-[#7ca6e8]">
                        Profile &amp; Portrait Images
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={openHeaderAvatarModal}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-3.5 py-2 font-display text-xs font-bold uppercase text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]"
                        >
                          <User className="h-3.5 w-3.5" />
                          <span>Header Profile Photo &amp; Crop</span>
                        </button>

                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-cream/20 bg-obsidian px-3.5 py-2 font-display text-xs font-bold uppercase text-cream hover:border-[#f1b39c]">
                          {uploadingField === 'hero-portrait' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00BDFF]" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 text-[#f1b39c]" />
                          )}
                          <span>
                            {uploadingField === 'hero-portrait'
                              ? 'Removing Background...'
                              : 'Replace Hero Portrait (Auto Cutout)'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingField !== null}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingField('hero-portrait');
                              try {
                                const res =
                                  await replaceHeroPortraitWithBackgroundRemoval(
                                    file
                                  );
                                if (res.ok) {
                                  showToast(
                                    'Hero portrait updated with transparent cutout!'
                                  );
                                } else {
                                  showToast(
                                    res.error ||
                                      'Background removal failed. Kept current portrait.'
                                  );
                                }
                              } finally {
                                setUploadingField(null);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>

                        {hasHeroPortraitBackup && (
                          <button
                            type="button"
                            onClick={async () => {
                              setUploadingField('hero-portrait-restore');
                              try {
                                const res =
                                  await restorePreviousHeroPortrait();
                                if (res.ok) {
                                  showToast(
                                    'Previous hero portrait restored!'
                                  );
                                } else {
                                  showToast(
                                    res.error ||
                                      'Failed to restore previous portrait.'
                                  );
                                }
                              } finally {
                                setUploadingField(null);
                              }
                            }}
                            disabled={uploadingField !== null}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DF00FF]/40 bg-obsidian px-3.5 py-2 font-display text-xs font-bold uppercase text-cream hover:border-[#DF00FF] hover:text-[#DF00FF] disabled:opacity-50"
                          >
                            {uploadingField === 'hero-portrait-restore' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#DF00FF]" />
                            ) : (
                              <Undo2 className="h-3.5 w-3.5 text-[#DF00FF]" />
                            )}
                            <span>Restore Previous Hero Portrait</span>
                          </button>
                        )}

                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-cream/20 bg-obsidian px-3.5 py-2 font-display text-xs font-bold uppercase text-cream hover:border-[#7ca6e8]">
                          <Upload className="h-3.5 w-3.5 text-[#7ca6e8]" />
                          <span>Replace About Portrait</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleImageUpload(
                                e.target.files?.[0],
                                'about-portrait',
                                (url) =>
                                  updateSiteConfig((prev) => ({
                                    ...prev,
                                    portraits: {
                                      ...prev.portraits,
                                      aboutPortraitPath: url,
                                    },
                                  })),
                                '/images/profile/about-portrait.png'
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* About Me Settings */}
                  <div className="space-y-4 rounded-2xl border border-cream/12 bg-obsidian/70 p-5">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#f1b39c]">
                      About Me Section Content
                    </h3>

                    <div>
                      <label className="block text-xs font-bold uppercase text-cream/80">
                        About Heading
                      </label>
                      <input
                        type="text"
                        value={siteConfig.aboutHeading}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            aboutHeading: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-cream/80">
                        About Introduction
                      </label>
                      <textarea
                        rows={4}
                        value={siteConfig.aboutIntroduction}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            aboutIntroduction: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Profession
                        </label>
                        <input
                          type="text"
                          value={siteConfig.profession}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              profession: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Experience Level
                        </label>
                        <input
                          type="text"
                          value={siteConfig.experienceLevel}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              experienceLevel: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Availability
                        </label>
                        <input
                          type="text"
                          value={siteConfig.availability}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              availability: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                        />
                      </div>
                    </div>

                    {/* My Story Fields */}
                    <div className="border-t border-cream/10 pt-4">
                      <label className="block text-xs font-bold uppercase text-[#ffd8be]">
                        My Story Heading
                      </label>
                      <input
                        type="text"
                        value={siteConfig.aboutStoryHeading || 'MY STORY'}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            aboutStoryHeading: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-cream/80">
                        My Story Lead Paragraph
                      </label>
                      <textarea
                        rows={3}
                        value={siteConfig.aboutStoryLead || ''}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            aboutStoryLead: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-cream/80">
                        My Story Narrative Body
                      </label>
                      <textarea
                        rows={4}
                        value={siteConfig.aboutStoryBody || ''}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            aboutStoryBody: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                      />
                    </div>

                    {/* Design Approach (Understand / Create / Refine) */}
                    <div className="border-t border-cream/10 pt-4">
                      <label className="block text-xs font-bold uppercase text-[#ffd8be]">
                        My Design Approach Principles
                      </label>
                      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {siteConfig.designPhilosophy.map((pillar, idx) => (
                          <div
                            key={idx}
                            className="space-y-2 rounded-xl border border-cream/10 bg-charcoal/80 p-3"
                          >
                            <input
                              type="text"
                              value={pillar.title}
                              onChange={(e) =>
                                updateSiteConfig((prev) => ({
                                  ...prev,
                                  designPhilosophy: prev.designPhilosophy.map((item, i) =>
                                    i === idx ? { ...item, title: e.target.value } : item
                                  ),
                                }))
                              }
                              className="w-full rounded-lg border border-cream/15 bg-obsidian px-2.5 py-1.5 text-xs font-bold text-cream"
                            />
                            <textarea
                              rows={3}
                              value={pillar.detail}
                              onChange={(e) =>
                                updateSiteConfig((prev) => ({
                                  ...prev,
                                  designPhilosophy: prev.designPhilosophy.map((item, i) =>
                                    i === idx ? { ...item, detail: e.target.value } : item
                                  ),
                                }))
                              }
                              className="w-full rounded-lg border border-cream/15 bg-obsidian px-2.5 py-1.5 text-[11px] text-cream/85"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom CTA Section */}
                    <div className="border-t border-cream/10 pt-4">
                      <label className="block text-xs font-bold uppercase text-[#ffd8be]">
                        Bottom CTA Heading
                      </label>
                      <input
                        type="text"
                        value={siteConfig.aboutCtaHeading || "LET'S CREATE SOMETHING MEANINGFUL."}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            aboutCtaHeading: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-cream/80">
                        Bottom CTA Supporting Text
                      </label>
                      <textarea
                        rows={2}
                        value={siteConfig.aboutCtaSubtext || ''}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            aboutCtaSubtext: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SERVICES & SECTION TITLES */}
              {cmsActiveTab === 'services' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 rounded-2xl border border-cream/12 bg-obsidian/70 p-5 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#f1b39c]">
                        Featured Works Heading
                      </label>
                      <input
                        type="text"
                        value={siteConfig.sectionHeadings.featuredHeading}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            sectionHeadings: {
                              ...prev.sectionHeadings,
                              featuredHeading: e.target.value,
                            },
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#f1b39c]">
                        Portfolio Section Heading
                      </label>
                      <input
                        type="text"
                        value={siteConfig.sectionHeadings.portfolioHeading}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            sectionHeadings: {
                              ...prev.sectionHeadings,
                              portfolioHeading: e.target.value,
                            },
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#f1b39c]">
                        Services Section Heading
                      </label>
                      <input
                        type="text"
                        value={siteConfig.sectionHeadings.servicesHeading}
                        onChange={(e) =>
                          updateSiteConfig((prev) => ({
                            ...prev,
                            sectionHeadings: {
                              ...prev.sectionHeadings,
                              servicesHeading: e.target.value,
                            },
                          }))
                        }
                        className="mt-1.5 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                      />
                    </div>
                  </div>

                  {/* Service Cards Editor */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {siteConfig.services.map((srv, idx) => (
                      <div
                        key={srv.id}
                        className="space-y-3 rounded-2xl border border-cream/12 bg-obsidian/70 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xs font-bold text-[#7ca6e8]">
                            SERVICE CARD {srv.number}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-stone">
                            Service Name
                          </label>
                          <input
                            type="text"
                            value={srv.title}
                            onChange={(e) =>
                              updateSiteConfig((prev) => ({
                                ...prev,
                                services: prev.services.map((s, i) =>
                                  i === idx
                                    ? { ...s, title: e.target.value }
                                    : s
                                ),
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 font-display text-xs font-bold uppercase text-cream"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-stone">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={srv.description}
                            onChange={(e) =>
                              updateSiteConfig((prev) => ({
                                ...prev,
                                services: prev.services.map((s, i) =>
                                  i === idx
                                    ? { ...s, description: e.target.value }
                                    : s
                                ),
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-stone">
                            Deliverables (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={srv.deliverables.join(', ')}
                            onChange={(e) =>
                              updateSiteConfig((prev) => ({
                                ...prev,
                                services: prev.services.map((s, i) =>
                                  i === idx
                                    ? {
                                        ...s,
                                        deliverables: e.target.value
                                          .split(',')
                                          .map((d) => d.trim())
                                          .filter(Boolean),
                                      }
                                    : s
                                ),
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-xs text-cream"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: CONTACT, GMAIL INQUIRY DELIVERY & SOCIAL LINKS */}
              {cmsActiveTab === 'contact' && (
                <div className="space-y-6">
                  {/* GMAIL INQUIRY DELIVERY & VERIFICATION PANEL */}
                  <div className="rounded-2xl border border-[#7ca6e8]/30 bg-obsidian/80 p-6 shadow-studio">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cream/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[#f1b39c]" />
                          <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-cream">
                            Gmail Inquiry Delivery &amp; Verification
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-stone">
                          Connect your personal Gmail address so client inquiries submitted through the{' '}
                          <span className="font-semibold text-cream">Send Inquiry</span> form are delivered directly to your Gmail Inbox with one-click{' '}
                          <span className="font-mono text-[#7ca6e8]">Reply-To</span>.
                        </p>
                      </div>

                      {/* Connection Status Badge */}
                      <div className="flex items-center gap-2">
                        {emailStatus?.lastTestStatus === 'success' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/60 px-3.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Gmail Verified &amp; Active</span>
                          </span>
                        ) : emailStatus?.configured ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7ca6e8]/40 bg-[#7ca6e8]/15 px-3.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[#f1b39c]">
                            <Check className="h-3.5 w-3.5 text-[#7ca6e8]" />
                            <span>Ready — Send Test Email</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-950/50 px-3.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-amber-300">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                            <span>Setup Needed</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleSaveGmailConfig} className="mt-5 space-y-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                        {/* Destination Gmail Address */}
                        <div className="md:col-span-5">
                          <label className="block font-display text-xs font-bold uppercase tracking-wider text-[#f1b39c]">
                            Destination Gmail Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={gmailAddress}
                            onChange={(e) => setGmailAddress(e.target.value)}
                            placeholder="yourname@gmail.com"
                            className="mt-1.5 w-full rounded-xl border border-cream/20 bg-charcoal px-3.5 py-2.5 font-mono text-sm text-cream placeholder:text-stone/60 focus:border-[#7ca6e8] focus:outline-none"
                          />
                          <p className="mt-1 text-[11px] text-stone">
                            All website inquiries and test emails are sent to this address.
                          </p>
                        </div>

                        {/* Delivery Method Selector */}
                        <div className="md:col-span-4">
                          <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/85">
                            Email Delivery Method
                          </label>
                          <select
                            value={emailProvider}
                            onChange={(e) =>
                              setEmailProvider(
                                e.target.value as
                                  | 'gmail-smtp'
                                  | 'formsubmit'
                                  | 'web3forms'
                                  | 'resend'
                              )
                            }
                            className="mt-1.5 w-full rounded-xl border border-cream/20 bg-charcoal px-3.5 py-2.5 text-sm text-cream focus:border-[#7ca6e8] focus:outline-none"
                          >
                            <option value="gmail-smtp">
                              Gmail Direct SMTP (Google App Password — Recommended)
                            </option>
                            <option value="formsubmit">
                              FormSubmit Gmail Relay (No App Password — Email Activation)
                            </option>
                            <option value="web3forms">
                              Web3Forms API (Access Key)
                            </option>
                            <option value="resend">
                              Resend Email API (API Key)
                            </option>
                          </select>
                          <p className="mt-1 text-[11px] text-stone">
                            Credentials are stored strictly on the server (never exposed in frontend code).
                          </p>
                        </div>

                        {/* Sender Display Name */}
                        <div className="md:col-span-3">
                          <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/85">
                            Sender Display Name
                          </label>
                          <input
                            type="text"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder="Nayemul Islam Portfolio"
                            className="mt-1.5 w-full rounded-xl border border-cream/20 bg-charcoal px-3.5 py-2.5 text-sm text-cream placeholder:text-stone/60 focus:border-[#7ca6e8] focus:outline-none"
                          />
                          <p className="mt-1 text-[11px] text-stone">
                            Shown in your Gmail inbox header.
                          </p>
                        </div>
                      </div>

                      {/* Provider-Specific Credentials Box */}
                      {emailProvider === 'gmail-smtp' && (
                        <div className="rounded-xl border border-cream/12 bg-charcoal/70 p-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                            <div className="md:col-span-5">
                              <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/85">
                                Gmail Account for SMTP (Optional if same)
                              </label>
                              <input
                                type="email"
                                value={smtpUser}
                                onChange={(e) => setSmtpUser(e.target.value)}
                                placeholder={gmailAddress || 'yourname@gmail.com'}
                                className="mt-1.5 w-full rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2 font-mono text-xs text-cream placeholder:text-stone/60 focus:border-[#7ca6e8] focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-7">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#7ca6e8]">
                                  <KeyRound className="h-3.5 w-3.5" />
                                  <span>Google 16-Character App Password</span>
                                </label>
                                {emailStatus?.hasAppPassword && (
                                  <span className="rounded-md border border-emerald-400/30 bg-emerald-950/50 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                                    Saved on Server ({emailStatus.maskedAppPassword})
                                  </span>
                                )}
                              </div>
                              <div className="relative mt-1.5 flex items-center">
                                <input
                                  type={showAppPassword ? 'text' : 'password'}
                                  value={smtpAppPassword}
                                  onChange={(e) => setSmtpAppPassword(e.target.value)}
                                  placeholder={
                                    emailStatus?.hasAppPassword
                                      ? '•••••••••••••••• (Leave blank to keep saved App Password)'
                                      : 'xxxx xxxx xxxx xxxx (16-letter Google App Password)'
                                  }
                                  className="w-full rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2 pr-10 font-mono text-xs text-cream placeholder:text-stone/60 focus:border-[#7ca6e8] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowAppPassword((prev) => !prev)}
                                  className="absolute right-2.5 text-stone hover:text-cream"
                                  title={showAppPassword ? 'Hide App Password' : 'Show App Password'}
                                >
                                  {showAppPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              <p className="mt-1.5 text-[11px] leading-relaxed text-stone">
                                How to get a Google App Password in 30 seconds: Open{' '}
                                <a
                                  href="https://myaccount.google.com/apppasswords"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-[#7ca6e8] underline hover:text-[#f1b39c]"
                                >
                                  myaccount.google.com/apppasswords
                                </a>{' '}
                                &rarr; create an app named <span className="text-cream">Portfolio Website</span> &rarr; paste the 16-letter code above. (Or switch method to <span className="text-cream">FormSubmit Gmail Relay</span> if you prefer zero-password email activation.)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {emailProvider === 'formsubmit' && (
                        <div className="rounded-xl border border-[#7ca6e8]/25 bg-charcoal/70 p-4 text-xs text-cream/90">
                          <p className="font-display font-bold uppercase tracking-wider text-[#f1b39c]">
                            FormSubmit Gmail Relay — Passwordless Mode
                          </p>
                          <p className="mt-1 leading-relaxed text-stone">
                            No password or API key required. Enter your Gmail address above and click{' '}
                            <span className="font-semibold text-cream">Send Test Email</span>. The very first time you use a new Gmail address, FormSubmit will email you a one-click{' '}
                            <span className="font-semibold text-[#7ca6e8]">Activate Form</span> button. Once clicked, every client inquiry arrives directly in your Gmail Inbox.
                          </p>
                        </div>
                      )}

                      {(emailProvider === 'web3forms' || emailProvider === 'resend') && (
                        <div className="rounded-xl border border-cream/12 bg-charcoal/70 p-4">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#7ca6e8]">
                              <KeyRound className="h-3.5 w-3.5" />
                              <span>
                                {emailProvider === 'web3forms'
                                  ? 'Web3Forms Access Key'
                                  : 'Resend API Key (re_...)'}
                              </span>
                            </label>
                            {emailStatus?.hasApiKey && (
                              <span className="rounded-md border border-emerald-400/30 bg-emerald-950/50 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                                Saved on Server ({emailStatus.maskedApiKey})
                              </span>
                            )}
                          </div>
                          <input
                            type="password"
                            value={providerApiKey}
                            onChange={(e) => setProviderApiKey(e.target.value)}
                            placeholder={
                              emailStatus?.hasApiKey
                                ? '•••••••••••• (Leave blank to keep saved key)'
                                : emailProvider === 'web3forms'
                                ? 'Paste your Web3Forms Access Key'
                                : 'Paste your Resend API Key (re_...)'
                            }
                            className="mt-1.5 w-full rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2 font-mono text-xs text-cream placeholder:text-stone/60 focus:border-[#7ca6e8] focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Feedback Banner */}
                      {emailConfigFeedback && (
                        <div
                          className={`rounded-xl border p-3.5 text-xs ${
                            emailConfigFeedback.type === 'success'
                              ? 'border-emerald-400/40 bg-emerald-950/40 text-emerald-100'
                              : emailConfigFeedback.type === 'warning'
                              ? 'border-amber-400/40 bg-amber-950/40 text-amber-100'
                              : 'border-red-400/40 bg-red-950/40 text-red-100'
                          }`}
                        >
                          {emailConfigFeedback.message}
                        </div>
                      )}

                      {/* Action Buttons: Save Gmail Settings & Send Test Email */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="text-[11px] text-stone">
                          {emailStatus?.lastVerifiedAt ? (
                            <span>
                              Last verified:{' '}
                              <span className="font-mono text-cream">
                                {new Date(emailStatus.lastVerifiedAt).toLocaleString()}
                              </span>
                            </span>
                          ) : (
                            <span>
                              Subject format:{' '}
                              <span className="font-mono text-cream/85">
                                New Project Inquiry — [Client Name]
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="submit"
                            disabled={isSavingEmailConfig || isSendingTestEmail}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#7ca6e8]/50 bg-charcoal px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#7ca6e8] hover:bg-obsidian disabled:opacity-60"
                          >
                            {isSavingEmailConfig ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7ca6e8]" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 text-[#7ca6e8]" />
                                <span>Save Gmail Settings</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleSendTestGmail}
                            disabled={isSendingTestEmail || isSavingEmailConfig}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-110 disabled:opacity-60"
                          >
                            {isSendingTestEmail ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Sending Test Email...</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                <span>Send Test Email to Gmail</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* PUBLIC CONTACT DETAILS & SOCIAL PROFILES */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="space-y-4 rounded-2xl border border-cream/12 bg-obsidian/70 p-5 lg:col-span-5">
                      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#f1b39c]">
                        Contact Section Text
                      </h3>
                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Contact Heading
                        </label>
                        <input
                          type="text"
                          value={siteConfig.contact.heading}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              contact: {
                                ...prev.contact,
                                heading: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Supporting Text
                        </label>
                        <input
                          type="text"
                          value={siteConfig.contact.supportingText}
                          onChange={(e) =>
                            updateSiteConfig((prev) => ({
                              ...prev,
                              contact: {
                                ...prev.contact,
                                supportingText: e.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-cream/80">
                          Displayed Public Email Address
                        </label>
                        <input
                          type="email"
                          value={siteConfig.contact.emailPlaceholder}
                          onChange={(e) => {
                            const val = e.target.value;
                            setGmailAddress(val);
                            updateSiteConfig((prev) => ({
                              ...prev,
                              contact: {
                                ...prev.contact,
                                emailPlaceholder: val,
                              },
                            }));
                          }}
                          className="mt-1 w-full rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-cream/12 bg-obsidian/70 p-5 lg:col-span-7">
                      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#7ca6e8]">
                        Social Media &amp; Freelance Profiles
                      </h3>
                      {siteConfig.contact.socialLinks.map((soc, idx) => (
                        <div
                          key={soc.id}
                          className="grid grid-cols-1 gap-2 rounded-xl border border-cream/10 bg-charcoal/70 p-3 sm:grid-cols-3"
                        >
                          <input
                            type="text"
                            value={soc.label}
                            onChange={(e) =>
                              updateSiteConfig((prev) => ({
                                ...prev,
                                contact: {
                                  ...prev.contact,
                                  socialLinks: prev.contact.socialLinks.map(
                                    (item, i) =>
                                      i === idx
                                        ? { ...item, label: e.target.value }
                                        : item
                                  ),
                                },
                              }))
                            }
                            placeholder="Platform Name"
                            className="rounded-lg border border-cream/15 bg-obsidian px-3 py-1.5 font-display text-xs font-bold text-cream"
                          />
                          <input
                            type="text"
                            value={soc.handlePlaceholder}
                            onChange={(e) =>
                              updateSiteConfig((prev) => ({
                                ...prev,
                                contact: {
                                  ...prev.contact,
                                  socialLinks: prev.contact.socialLinks.map(
                                    (item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            handlePlaceholder: e.target.value,
                                          }
                                        : item
                                  ),
                                },
                              }))
                            }
                            placeholder="Display Handle"
                            className="rounded-lg border border-cream/15 bg-obsidian px-3 py-1.5 text-xs text-cream"
                          />
                          <input
                            type="text"
                            value={soc.url}
                            onChange={(e) =>
                              updateSiteConfig((prev) => ({
                                ...prev,
                                contact: {
                                  ...prev.contact,
                                  socialLinks: prev.contact.socialLinks.map(
                                    (item, i) =>
                                      i === idx
                                        ? { ...item, url: e.target.value }
                                        : item
                                  ),
                                },
                              }))
                            }
                            placeholder="https://..."
                            className="rounded-lg border border-cream/15 bg-obsidian px-3 py-1.5 text-xs text-[#7ca6e8]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RECENT INQUIRIES LOG */}
                  <div className="rounded-2xl border border-cream/12 bg-obsidian/70 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-[#7ca6e8]" />
                        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-cream">
                          Recent Website Inquiries ({recentInquiries.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={fetchEmailConfigurationStatus}
                        className="rounded-lg border border-cream/15 bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-stone transition hover:border-cream/35 hover:text-cream"
                      >
                        Refresh Log
                      </button>
                    </div>

                    {recentInquiries.length === 0 ? (
                      <p className="mt-3 text-xs text-stone">
                        No client inquiries recorded yet. Submissions from the Contact form will appear here alongside their Gmail delivery status.
                      </p>
                    ) : (
                      <div className="mt-3 max-h-60 space-y-2.5 overflow-y-auto pr-1">
                        {recentInquiries.slice(0, 10).map((inq) => (
                          <div
                            key={inq.id}
                            className="flex flex-col justify-between gap-2 rounded-xl border border-cream/10 bg-charcoal/70 p-3.5 text-xs sm:flex-row sm:items-center"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-display font-bold text-cream">
                                  {inq.clientName}
                                </span>
                                <a
                                  href={`mailto:${inq.clientEmail}?subject=${encodeURIComponent(
                                    `Re: ${inq.subject}`
                                  )}`}
                                  className="font-mono text-[#7ca6e8] underline hover:text-[#f1b39c]"
                                >
                                  &lt;{inq.clientEmail}&gt;
                                </a>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    inq.status === 'delivered'
                                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-400/30'
                                      : 'bg-red-950/70 text-red-300 border border-red-400/30'
                                  }`}
                                >
                                  {inq.status === 'delivered'
                                    ? `Delivered (${inq.deliveredVia})`
                                    : 'Delivery Failed'}
                                </span>
                              </div>
                              <p className="font-semibold text-[#f1b39c]">
                                {inq.subject}
                                {inq.budget ? ` • Budget: ${inq.budget}` : ''}
                              </p>
                              <p className="line-clamp-2 text-cream/80">
                                {inq.message}
                              </p>
                            </div>
                            <div className="shrink-0 text-right font-mono text-[11px] text-stone">
                              {inq.submittedAtFormatted}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
