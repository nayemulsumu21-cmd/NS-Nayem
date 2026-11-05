import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Image as ImageIcon,
  Type,
  Heading as HeadingIcon,
  LayoutGrid,
  Sliders,
  Settings,
  Eye,
  Save,
  Send,
  Upload,
  Maximize2,
  Minimize2,
  GripVertical,
  Check,
  Plus,
  X,
  AlignLeft,
  AlignCenter,
  Sparkles,
  EyeOff,
  RefreshCw,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import {
  ProjectItem,
  ProjectContentBlock,
  ProjectCoverCrop,
  ProjectCanvasStyle,
  ProjectDraftSnapshot,
  getProjectBlocks,
} from '../data/projects';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';

const PRESET_TOOLS = [
  'Adobe Illustrator',
  'Adobe Photoshop',
  'Adobe InDesign',
  'Figma',
];

const CANVAS_BG_PRESETS = [
  { label: 'Obsidian Dark', value: '#0b0a10' },
  { label: 'Studio Charcoal', value: '#13111c' },
  { label: 'Pure Black', value: '#050507' },
  { label: 'Deep Slate Violet', value: '#1a1628' },
  { label: 'Editorial Cream', value: '#f5f2eb' },
];

interface BehanceProjectBuilderProps {
  onPublishedOrClosed: (publishedProject?: ProjectItem) => void;
}

export const BehanceProjectBuilder: React.FC<BehanceProjectBuilderProps> = ({
  onPublishedOrClosed,
}) => {
  const {
    categories,
    projects,
    isOwnerMode,
    builderProjectId,
    openProjectBuilder,
    closeProjectBuilder,
    addProject,
    updateProject,
    deleteProject,
    uploadAssetFile,
  } = usePortfolioCMS();

  const nonAllCategories = useMemo(
    () => categories.filter((c) => c.id !== 'all'),
    [categories]
  );

  const existingProject = useMemo(
    () =>
      builderProjectId && builderProjectId !== 'new'
        ? projects.find((p) => p.id === builderProjectId) || null
        : null,
    [builderProjectId, projects]
  );

  // Track which project ID has been loaded into local editor state so background updates don't reset the editor
  const loadedBuilderKeyRef = useRef<string | null>(null);

  // Track in-flight uploads so we can show accurate progress and await before final save if needed
  const activeUploadTasksRef = useRef<Set<Promise<void>>>(new Set());

  // Active workspace step: 'canvas' | 'settings' | 'preview'
  const [activeStep, setActiveStep] = useState<
    'canvas' | 'settings' | 'preview'
  >('canvas');

  // Right sidebar panel tab in Canvas mode
  const [sidebarTab, setSidebarTab] = useState<'add' | 'reorder' | 'styles'>(
    'add'
  );

  // Project State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(
    nonAllCategories[0]?.id || 'logo'
  );
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([
    'Brand Identity',
    'Visual System',
  ]);
  const [tagInput, setTagInput] = useState('');
  const [tools, setTools] = useState<string[]>(['Adobe Illustrator']);
  const [customToolInput, setCustomToolInput] = useState('');
  const [deliverables, setDeliverables] = useState(
    'Primary Logomark, Brand Guidelines, Vector Master Files'
  );
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'published' | 'draft'>('draft');
  const [hasLoadedUnpublishedDraft, setHasLoadedUnpublishedDraft] =
    useState(false);

  // Cover & Cropping State
  const [coverUrl, setCoverUrl] = useState('');
  const [coverCrop, setCoverCrop] = useState<ProjectCoverCrop>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Canvas Style State (blockSpacing defaults to 0 for seamless Behance vertical stack)
  const [canvasStyle, setCanvasStyle] = useState<ProjectCanvasStyle>({
    backgroundColor: '#0b0a10',
    blockSpacing: 0,
    maxWidth: 'wide',
  });

  // Content Blocks State
  const [blocks, setBlocks] = useState<ProjectContentBlock[]>([]);

  // Drag-and-drop state (only active when initiated from drag handle)
  const [dragArmedBlockId, setDragArmedBlockId] = useState<string | null>(null);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(
    null
  );
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState<number | null>(
    null
  );

  // Upload & Save progress indicators
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [isSavingAction, setIsSavingAction] = useState<
    'save-changes' | 'draft' | 'publish' | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

  // Hidden file inputs
  const multiImageInputRef = useRef<HTMLInputElement>(null);
  const fullWidthImageInputRef = useRef<HTMLInputElement>(null);
  const photoGridInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3400);
  }, []);

  // Helper to populate editor fields from either a ProjectItem or its staged unpublishedDraft
  const populateEditorFromProject = useCallback(
    (proj: ProjectItem, preferStagedDraft = true) => {
      const staged = preferStagedDraft ? proj.unpublishedDraft : undefined;
      const source = staged || proj;

      setTitle(source.title);
      setCategory(source.category);
      setDescription(source.description);
      setTags(
        source.tags && source.tags.length > 0
          ? source.tags
          : [source.categoryLabel, 'Brand Identity']
      );
      setTools(
        source.tools && source.tools.length > 0
          ? source.tools
          : ['Adobe Illustrator']
      );
      setDeliverables((source.deliverables || []).join(', '));
      setFeatured(Boolean(source.featured));
      setStatus(proj.status ?? 'published');
      setCoverUrl(source.thumbnail);
      setCoverCrop(source.coverCrop ?? { zoom: 1, offsetX: 0, offsetY: 0 });

      const rawCanvasStyle = source.canvasStyle ?? {
        backgroundColor: '#0b0a10',
        blockSpacing: 0,
        maxWidth: 'wide',
      };
      setCanvasStyle({
        ...rawCanvasStyle,
        blockSpacing:
          typeof rawCanvasStyle.blockSpacing === 'number' &&
          rawCanvasStyle.blockSpacing !== 20
            ? rawCanvasStyle.blockSpacing
            : 0,
      });

      const resolvedBlocks =
        staged?.contentBlocks && staged.contentBlocks.length > 0
          ? staged.contentBlocks.map((b) =>
              b.type === 'image' ? { ...b, layout: b.layout || 'full' } : b
            )
          : getProjectBlocks(proj);

      setBlocks(resolvedBlocks);
      setHasLoadedUnpublishedDraft(Boolean(staged));
    },
    []
  );

  // Initialize editor state ONLY when builderProjectId changes
  useEffect(() => {
    if (!builderProjectId) {
      loadedBuilderKeyRef.current = null;
      return;
    }

    if (loadedBuilderKeyRef.current === builderProjectId) {
      return;
    }

    if (builderProjectId === 'new') {
      loadedBuilderKeyRef.current = 'new';
      setTitle('');
      setCategory(nonAllCategories[0]?.id || 'logo');
      setDescription('');
      setTags(['Brand Identity', 'Graphic Design']);
      setTools(['Adobe Illustrator']);
      setDeliverables('Brand Identity Deliverable');
      setFeatured(false);
      setStatus('draft');
      setHasLoadedUnpublishedDraft(false);
      setCoverUrl('');
      setCoverCrop({ zoom: 1, offsetX: 0, offsetY: 0 });
      setCanvasStyle({
        backgroundColor: '#0b0a10',
        blockSpacing: 0,
        maxWidth: 'wide',
      });
      setBlocks([]);
      setActiveStep('canvas');
      return;
    }

    if (existingProject) {
      loadedBuilderKeyRef.current = builderProjectId;
      populateEditorFromProject(existingProject, true);
      setActiveStep('canvas');
    }
  }, [
    builderProjectId,
    existingProject,
    nonAllCategories,
    populateEditorFromProject,
  ]);

  // Extract all image URLs currently in the project blocks (for one-click Cover Selection)
  const allCanvasImages = useMemo(() => {
    const urls: string[] = [];
    for (const b of blocks) {
      if (b.type === 'image' && b.imageUrl) {
        urls.push(b.imageUrl);
      } else if (b.type === 'photo-grid' && b.gridImages) {
        for (const gi of b.gridImages) {
          if (gi.url) urls.push(gi.url);
        }
      }
    }
    return Array.from(new Set(urls));
  }, [blocks]);

  if (!builderProjectId || !isOwnerMode) {
    return null;
  }

  // Helper to insert blocks at a specific index or at the end
  const insertBlocks = (
    newBlocks: ProjectContentBlock[],
    targetIndex: number | null = insertAtIndex
  ) => {
    setBlocks((prev) => {
      if (
        targetIndex === null ||
        targetIndex < 0 ||
        targetIndex >= prev.length
      ) {
        return [...prev, ...newBlocks];
      }
      const next = [...prev];
      next.splice(targetIndex + 1, 0, ...newBlocks);
      return next;
    });
    setInsertAtIndex(null);

    // Automatically set the project cover to the first uploaded image if cover is empty
    const firstImg = newBlocks.find(
      (b) => b.type === 'image' && b.imageUrl
    )?.imageUrl;
    const firstGridImg = newBlocks.find(
      (b) => b.type === 'photo-grid' && b.gridImages?.length
    )?.gridImages?.[0]?.url;
    const candidateCover = firstImg || firstGridImg;
    if (candidateCover && !coverUrl) {
      setCoverUrl(candidateCover);
    }
  };

  // Run an upload task with tracked progress so the editor stays non-blocking and responsive
  const registerUploadTask = (promise: Promise<void>) => {
    activeUploadTasksRef.current.add(promise);
    void promise.finally(() => {
      activeUploadTasksRef.current.delete(promise);
    });
  };

  // Upload multiple images with instant local preview + parallel binary upload
  const handleUploadMultipleImages = async (
    files: FileList | null,
    layout: 'full' | 'contained' = 'full'
  ) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const batchTimestamp = Date.now();

    // 1. Insert blocks immediately using fast object URLs so images appear with zero lag in exact order
    const stagedItems = fileArray.map((file, idx) => {
      const tempPreviewUrl = URL.createObjectURL(file);
      const cleanCaption = file.name.replace(/\.[^/.]+$/, '');
      const blockId = `block-img-${batchTimestamp}-${idx}`;
      const block: ProjectContentBlock = {
        id: blockId,
        type: 'image',
        imageUrl: tempPreviewUrl,
        caption: cleanCaption,
        layout,
      };
      return { file, blockId, tempPreviewUrl, block };
    });

    insertBlocks(stagedItems.map((item) => item.block));

    // 2. Upload files to disk in parallel batches (concurrency = 3) and swap blob URLs with permanent URLs
    const total = stagedItems.length;
    setUploadProgress({ completed: 0, total });

    const uploadTask = (async () => {
      let completedCount = 0;
      const concurrency = 3;
      const queue = [...stagedItems];

      const worker = async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          try {
            const permanentUrl = await uploadAssetFile(item.file);
            setBlocks((prev) =>
              prev.map((b) =>
                b.id === item.blockId ? { ...b, imageUrl: permanentUrl } : b
              )
            );
            setCoverUrl((prevCover) =>
              !prevCover || prevCover === item.tempPreviewUrl
                ? permanentUrl
                : prevCover
            );
          } finally {
            completedCount += 1;
            setUploadProgress({ completed: completedCount, total });
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, total) }, () => worker())
      );

      setUploadProgress(null);
      showToast(
        `Uploaded ${total} image${total > 1 ? 's' : ''} at original resolution.`
      );
    })();

    registerUploadTask(uploadTask);
  };

  // Upload multiple images into a Photo Grid block with instant preview
  const handleUploadPhotoGrid = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const batchTimestamp = Date.now();
    const gridBlockId = `block-grid-${batchTimestamp}`;

    const stagedItems = fileArray.map((file, idx) => {
      const tempUrl = URL.createObjectURL(file);
      return {
        file,
        itemId: `grid-item-${batchTimestamp}-${idx}`,
        tempUrl,
        caption: file.name.replace(/\.[^/.]+$/, ''),
      };
    });

    const initialGridBlock: ProjectContentBlock = {
      id: gridBlockId,
      type: 'photo-grid',
      columns: stagedItems.length >= 3 ? 3 : 2,
      gridImages: stagedItems.map((s) => ({
        id: s.itemId,
        url: s.tempUrl,
        caption: s.caption,
      })),
      caption: '',
    };

    insertBlocks([initialGridBlock]);

    const total = stagedItems.length;
    setUploadProgress({ completed: 0, total });

    const uploadTask = (async () => {
      let completedCount = 0;
      await Promise.all(
        stagedItems.map(async (s) => {
          try {
            const permanentUrl = await uploadAssetFile(s.file);
            setBlocks((prev) =>
              prev.map((b) =>
                b.id === gridBlockId
                  ? {
                      ...b,
                      gridImages: (b.gridImages || []).map((gi) =>
                        gi.id === s.itemId ? { ...gi, url: permanentUrl } : gi
                      ),
                    }
                  : b
              )
            );
            setCoverUrl((prevCover) =>
              !prevCover || prevCover === s.tempUrl ? permanentUrl : prevCover
            );
          } finally {
            completedCount += 1;
            setUploadProgress({ completed: completedCount, total });
          }
        })
      );
      setUploadProgress(null);
      showToast(`Added Photo Grid with ${total} images.`);
    })();

    registerUploadTask(uploadTask);
  };

  const handleAddHeadingBlock = (targetIdx: number | null = null) => {
    insertBlocks(
      [
        {
          id: `block-heading-${Date.now()}`,
          type: 'heading',
          text: 'SECTION HEADING',
          subtext: 'Brand Strategy & Visual Direction',
          align: 'left',
        },
      ],
      targetIdx
    );
  };

  const handleAddTextBlock = (targetIdx: number | null = null) => {
    insertBlocks(
      [
        {
          id: `block-text-${Date.now()}`,
          type: 'text',
          text: 'Describe the design concept, grid construction, typography choices, and visual problem-solving behind this section of the project.',
          align: 'left',
        },
      ],
      targetIdx
    );
  };

  const handleUpdateBlock = (
    blockId: string,
    patch: Partial<ProjectContentBlock>
  ) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b))
    );
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  // Optimized Drag-and-Drop Reordering Handlers
  const handleDragStart = (index: number) => {
    setDraggedBlockIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;
    if (dragOverBlockIndex !== index) {
      setDragOverBlockIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === dropIndex) {
      setDraggedBlockIndex(null);
      setDragOverBlockIndex(null);
      setDragArmedBlockId(null);
      return;
    }
    setBlocks((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedBlockIndex, 1);
      copy.splice(dropIndex, 0, moved);
      return copy;
    });
    setDraggedBlockIndex(null);
    setDragOverBlockIndex(null);
    setDragArmedBlockId(null);
  };

  // Replace single image block with instant preview
  const handleReplaceBlockImage = async (
    blockId: string,
    file: File | undefined
  ) => {
    if (!file) return;
    const tempUrl = URL.createObjectURL(file);
    handleUpdateBlock(blockId, { imageUrl: tempUrl });
    setUploadProgress({ completed: 0, total: 1 });

    const task = (async () => {
      try {
        const newUrl = await uploadAssetFile(file);
        handleUpdateBlock(blockId, { imageUrl: newUrl });
        setCoverUrl((prevCover) =>
          prevCover === tempUrl ? newUrl : prevCover
        );
        showToast('Replaced image at original resolution.');
      } finally {
        setUploadProgress(null);
      }
    })();

    registerUploadTask(task);
  };

  // Add images to existing Photo Grid block
  const handleAddImagesToGridBlock = async (
    blockId: string,
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const batchTimestamp = Date.now();

    const staged = fileArray.map((file, idx) => ({
      file,
      itemId: `grid-item-${batchTimestamp}-${idx}`,
      tempUrl: URL.createObjectURL(file),
      caption: file.name.replace(/\.[^/.]+$/, ''),
    }));

    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? {
              ...b,
              gridImages: [
                ...(b.gridImages || []),
                ...staged.map((s) => ({
                  id: s.itemId,
                  url: s.tempUrl,
                  caption: s.caption,
                })),
              ],
            }
          : b
      )
    );

    setUploadProgress({ completed: 0, total: staged.length });
    const task = (async () => {
      let done = 0;
      await Promise.all(
        staged.map(async (s) => {
          try {
            const permanentUrl = await uploadAssetFile(s.file);
            setBlocks((prev) =>
              prev.map((b) =>
                b.id === blockId
                  ? {
                      ...b,
                      gridImages: (b.gridImages || []).map((gi) =>
                        gi.id === s.itemId ? { ...gi, url: permanentUrl } : gi
                      ),
                    }
                  : b
              )
            );
          } finally {
            done += 1;
            setUploadProgress({ completed: done, total: staged.length });
          }
        })
      );
      setUploadProgress(null);
      showToast('Added images to Photo Grid.');
    })();

    registerUploadTask(task);
  };

  // Upload custom cover image
  const handleUploadCover = async (file: File | undefined) => {
    if (!file) return;
    const tempUrl = URL.createObjectURL(file);
    setCoverUrl(tempUrl);
    setUploadProgress({ completed: 0, total: 1 });

    const task = (async () => {
      try {
        const url = await uploadAssetFile(file);
        setCoverUrl(url);
        showToast('Cover image uploaded.');
      } finally {
        setUploadProgress(null);
      }
    })();

    registerUploadTask(task);
  };

  // Toggle Tool selection
  const toggleTool = (toolName: string) => {
    setTools((prev) =>
      prev.includes(toolName)
        ? prev.filter((t) => t !== toolName)
        : [...prev, toolName]
    );
  };

  const handleAddCustomTool = () => {
    const trimmed = customToolInput.trim();
    if (!trimmed) return;
    if (!tools.includes(trimmed)) {
      setTools((prev) => [...prev, trimmed]);
    }
    setCustomToolInput('');
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  // Helper to construct current project fields snapshot
  const buildSnapshotData = (): ProjectDraftSnapshot => {
    const finalTitle = title.trim() || 'Untitled Brand Identity Project';
    const catObj =
      categories.find((c) => c.id === category) || nonAllCategories[0];
    const resolvedCover =
      coverUrl ||
      allCanvasImages[0] ||
      '/images/portfolio/logos/logo-01.svg';
    const resolvedFullImage = allCanvasImages[0] || resolvedCover;

    const normalizedBlocks = blocks.map((b) =>
      b.type === 'image' ? { ...b, layout: b.layout || 'full' } : b
    );

    const derivedSheets = normalizedBlocks
      .filter((b) => b.type === 'image' && b.imageUrl)
      .map((b, idx) => ({
        label: b.caption || `0${idx + 1} / Presentation Slide`,
        image: b.imageUrl!,
      }));

    const deliverablesList = deliverables
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      title: finalTitle,
      category,
      categoryLabel: catObj ? catObj.label : category.toUpperCase(),
      thumbnail: resolvedCover,
      fullImage: resolvedFullImage,
      coverCrop,
      sheets: derivedSheets.length > 0 ? derivedSheets : undefined,
      contentBlocks: normalizedBlocks,
      canvasStyle,
      description:
        description.trim() ||
        `${finalTitle} — ${catObj ? catObj.label : 'Brand Identity'} presentation.`,
      tags,
      featured,
      tools: tools.length > 0 ? tools : ['Adobe Illustrator'],
      deliverables:
        deliverablesList.length > 0
          ? deliverablesList
          : ['Brand Identity Deliverable'],
      savedAt: new Date().toISOString(),
    };
  };

  // Wait for any in-flight image uploads before persisting
  const awaitPendingUploads = async () => {
    if (activeUploadTasksRef.current.size > 0) {
      await Promise.all(Array.from(activeUploadTasksRef.current));
    }
  };

  /**
   * ACTION 1: SAVE CHANGES
   * Saves the edited project without publishing the changes publicly.
   * - If editing an already-published project: stores edits in `unpublishedDraft` so public visitors still see the live published version until "Update & Publish" is clicked.
   * - If editing a draft or new project: saves directly as a draft in place without closing the editor.
   */
  const handleSaveChangesOnly = async () => {
    setIsSavingAction('save-changes');
    try {
      await awaitPendingUploads();
      const snapshot = buildSnapshotData();

      if (existingProject) {
        if (existingProject.status === 'published' && existingProject.visible !== false) {
          updateProject(existingProject.id, {
            unpublishedDraft: snapshot,
            updatedAt: snapshot.savedAt,
          });
          setHasLoadedUnpublishedDraft(true);
          showToast(
            'Changes saved privately! Click "Update & Publish" when ready to make them live.'
          );
        } else {
          updateProject(existingProject.id, {
            ...snapshot,
            status: 'draft',
            visible: false,
            unpublishedDraft: undefined,
            updatedAt: snapshot.savedAt,
          });
          setStatus('draft');
          showToast('Draft changes saved!');
        }
      } else {
        const created = addProject({
          ...snapshot,
          editorialSpan: 'standard',
          aspectRatio: '4/3',
          status: 'draft',
          visible: false,
          views: 0,
          likes: 0,
          appreciations: 0,
          updatedAt: snapshot.savedAt,
        });
        loadedBuilderKeyRef.current = created.id;
        openProjectBuilder(created.id);
        setStatus('draft');
        showToast('Project created & saved as draft!');
      }
    } finally {
      setIsSavingAction(null);
    }
  };

  /**
   * ACTION 2: SAVE AS DRAFT
   * Moves or saves the project in draft status (hidden from the public gallery).
   */
  const handleSaveAsDraft = async () => {
    setIsSavingAction('draft');
    try {
      await awaitPendingUploads();
      const snapshot = buildSnapshotData();

      if (existingProject) {
        updateProject(existingProject.id, {
          ...snapshot,
          status: 'draft',
          visible: false,
          unpublishedDraft: undefined,
          updatedAt: snapshot.savedAt,
          views: existingProject.views ?? 0,
          likes: existingProject.likes ?? 0,
          appreciations: existingProject.appreciations ?? 0,
        });
        setStatus('draft');
        setHasLoadedUnpublishedDraft(false);
        showToast('Saved as draft (hidden from public gallery).');
      } else {
        const created = addProject({
          ...snapshot,
          editorialSpan: 'standard',
          aspectRatio: '4/3',
          status: 'draft',
          visible: false,
          views: 0,
          likes: 0,
          appreciations: 0,
          updatedAt: snapshot.savedAt,
        });
        loadedBuilderKeyRef.current = created.id;
        openProjectBuilder(created.id);
        setStatus('draft');
        showToast('Saved as draft! You can continue editing anytime.');
      }
    } finally {
      setIsSavingAction(null);
    }
  };

  /**
   * ACTION 3: UPDATE & PUBLISH (or PUBLISH PROJECT)
   * Saves all changes and immediately updates the existing published project (or publishes a new/draft project).
   * Preserves existing project ID, URL, displayOrder, views, likes, and appreciations.
   */
  const handlePublishOrUpdate = async () => {
    setIsSavingAction('publish');
    try {
      await awaitPendingUploads();
      const snapshot = buildSnapshotData();

      const payload: Omit<ProjectItem, 'id' | 'displayOrder'> = {
        ...snapshot,
        editorialSpan: existingProject?.editorialSpan || 'standard',
        aspectRatio: existingProject?.aspectRatio || '4/3',
        status: 'published',
        visible: true,
        unpublishedDraft: undefined,
        updatedAt: snapshot.savedAt,
        views: existingProject?.views ?? 0,
        likes: existingProject?.likes ?? 0,
        appreciations: existingProject?.appreciations ?? 0,
      };

      if (existingProject) {
        updateProject(existingProject.id, payload);
        setStatus('published');
        setHasLoadedUnpublishedDraft(false);
        const updatedProj: ProjectItem = {
          ...existingProject,
          ...payload,
        };
        showToast('Project updated & published!');
        closeProjectBuilder();
        onPublishedOrClosed(updatedProj);
      } else {
        const created = addProject(payload);
        setStatus('published');
        setHasLoadedUnpublishedDraft(false);
        showToast('Project published to homepage gallery!');
        closeProjectBuilder();
        onPublishedOrClosed(created);
      }
    } finally {
      setIsSavingAction(null);
    }
  };

  // Discard unpublished staged draft and reload live published project state
  const handleDiscardUnpublishedDraft = () => {
    if (!existingProject) return;
    updateProject(existingProject.id, {
      unpublishedDraft: undefined,
    });
    populateEditorFromProject(
      { ...existingProject, unpublishedDraft: undefined },
      false
    );
    showToast('Reverted editor to live published version.');
  };

  const selectedCategoryLabel =
    categories.find((c) => c.id === category)?.label || 'Brand Identity';

  const maxWidthClass =
    canvasStyle.maxWidth === 'full'
      ? 'max-w-full'
      : canvasStyle.maxWidth === 'wide'
        ? 'max-w-[1440px]'
        : 'max-w-[1120px]';

  const isLightCanvas =
    canvasStyle.backgroundColor.toLowerCase() === '#f5f2eb';

  const isEditingPublished =
    Boolean(existingProject) && existingProject?.status === 'published';

  return (
    <div className="fixed inset-0 z-[85] flex flex-col overflow-hidden bg-[#0a0910] text-cream">
      {/* Hidden File Inputs — Both upload at full original resolution and default to full-width layout */}
      <input
        ref={multiImageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          void handleUploadMultipleImages(e.target.files, 'full');
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={fullWidthImageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          void handleUploadMultipleImages(e.target.files, 'full');
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={photoGridInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          void handleUploadPhotoGrid(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void handleUploadCover(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* TOP STUDIO WORKSPACE HEADER */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cream/10 bg-[#110f1a] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              closeProjectBuilder();
              onPublishedOrClosed(existingProject || undefined);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-cream/15 bg-charcoal px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#a9cbff] hover:text-[#a9cbff]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Exit Editor</span>
          </button>

          <span
            className={`rounded-full px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-widest ${
              status === 'published'
                ? 'bg-[#a9cbff]/20 text-[#a9cbff]'
                : 'bg-[#ffd8be]/20 text-[#ffd8be]'
            }`}
          >
            {existingProject
              ? status === 'published'
                ? 'Editing Published Project'
                : 'Editing Draft'
              : 'New Project'}
          </span>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter Project Title..."
            className="w-44 rounded-xl border border-cream/15 bg-obsidian/70 px-3 py-1.5 font-display text-sm font-extrabold text-cream placeholder:text-cream/40 hover:border-cream/30 focus:border-[#a9cbff] focus:bg-obsidian focus:outline-none sm:w-72 sm:text-base"
          />
        </div>

        {/* Center Step Switcher: 1. Project Canvas | 2. Preview | 3. Cover & Settings */}
        <div className="flex items-center gap-1 rounded-xl border border-cream/10 bg-obsidian p-1">
          <button
            type="button"
            onClick={() => setActiveStep('canvas')}
            className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition ${
              activeStep === 'canvas'
                ? 'bg-[#1e1a2e] text-[#ffd8be]'
                : 'text-cream/65 hover:text-cream'
            }`}
          >
            1. Project Canvas
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('preview')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition ${
              activeStep === 'preview'
                ? 'bg-[#1e1a2e] text-[#a9cbff]'
                : 'text-cream/65 hover:text-cream'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('settings')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition ${
              activeStep === 'settings'
                ? 'bg-[#1e1a2e] text-[#f694ff]'
                : 'text-cream/65 hover:text-cream'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>2. Cover &amp; Settings</span>
          </button>
        </div>

        {/* Right Actions: Save Changes | Save as Draft | Update & Publish */}
        <div className="flex flex-wrap items-center gap-2">
          {uploadProgress && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#a9cbff]/40 bg-[#a9cbff]/15 px-3 py-1.5 text-xs font-semibold text-[#a9cbff]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>
                Uploading {uploadProgress.completed}/{uploadProgress.total}...
              </span>
            </span>
          )}

          {toastMessage && !uploadProgress && (
            <span className="hidden items-center gap-1.5 rounded-xl border border-[#a9cbff]/40 bg-[#a9cbff]/15 px-3 py-1.5 text-xs font-semibold text-[#ffd8be] 2xl:inline-flex">
              <Check className="h-3.5 w-3.5" />
              {toastMessage}
            </span>
          )}

          {/* 1. Save Changes (Without Publishing Publicly) */}
          <button
            type="button"
            disabled={isSavingAction !== null}
            onClick={() => void handleSaveChangesOnly()}
            title="Save edited changes without publishing them publicly yet"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#a9cbff]/35 bg-[#171526] px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#a9cbff] transition hover:border-[#a9cbff] hover:bg-[#211d36] disabled:opacity-50"
          >
            {isSavingAction === 'save-changes' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Changes</span>
          </button>

          {/* 2. Save as Draft */}
          <button
            type="button"
            disabled={isSavingAction !== null}
            onClick={() => void handleSaveAsDraft()}
            title="Move or save this project in Draft status (hidden from public gallery)"
            className="inline-flex items-center gap-1.5 rounded-xl border border-cream/20 bg-charcoal px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#ffd8be] hover:text-[#ffd8be] disabled:opacity-50"
          >
            {isSavingAction === 'draft' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-[#ffd8be]" />
            )}
            <span>Save as Draft</span>
          </button>

          {/* 3. Update & Publish / Publish Project */}
          <button
            type="button"
            disabled={isSavingAction !== null}
            onClick={() => void handlePublishOrUpdate()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-4 py-2 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-105 disabled:opacity-50"
          >
            {isSavingAction === 'publish' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>
              {isEditingPublished ? 'Update & Publish' : 'Publish Project'}
            </span>
          </button>
        </div>
      </header>

      {/* Staged Unpublished Draft Notice inside Builder */}
      {hasLoadedUnpublishedDraft && existingProject?.unpublishedDraft && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#ffd8be]/25 bg-[#1b1628] px-6 py-2 text-xs text-cream/90">
          <span>
            Loaded your saved unpublished edits. Click{' '}
            <strong className="text-[#ffd8be]">Update &amp; Publish</strong> to
            make these changes live on the public project page.
          </span>
          <button
            type="button"
            onClick={handleDiscardUnpublishedDraft}
            className="inline-flex items-center gap-1 rounded-lg border border-cream/20 bg-obsidian px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-cream/80 hover:border-red-300 hover:text-red-300"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Revert to Live Version</span>
          </button>
        </div>
      )}

      {/* STEP 1: MAIN PROJECT CANVAS + RIGHT EDITING SIDEBAR */}
      {activeStep === 'canvas' && (
        <div className="flex flex-1 overflow-hidden">
          {/* A. MAIN PROJECT CANVAS */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div
              style={{ backgroundColor: canvasStyle.backgroundColor }}
              className={`mx-auto min-h-[78vh] w-full ${maxWidthClass} rounded-3xl border border-cream/10 p-3 shadow-studio transition-colors sm:p-6 ${
                isLightCanvas ? 'text-obsidian' : 'text-cream'
              }`}
            >
              {/* Empty Canvas Dropzone */}
              {blocks.length === 0 ? (
                <div className="flex min-h-[64vh] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cream/15 px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#181526] text-[#a9cbff]">
                    <Upload className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 font-display text-xl font-extrabold uppercase tracking-wide">
                    Start Building Your Project
                  </h2>
                  <p className="mt-2 max-w-md text-xs leading-relaxed opacity-70 sm:text-sm">
                    Upload full-width high-resolution design slides, headings,
                    text blocks, or multi-column photo grids. Images preserve
                    their exact natural dimensions and proportions.
                  </p>

                  {/* Quick-Start Content Triggers */}
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setInsertAtIndex(null);
                        fullWidthImageInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-3 font-display text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-105"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>Upload Project Images</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInsertAtIndex(null);
                        photoGridInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-cream/20 bg-[#151221] px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#a9cbff]"
                    >
                      <LayoutGrid className="h-4 w-4 text-[#a9cbff]" />
                      <span>Add Photo Grid</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddHeadingBlock(null)}
                      className="inline-flex items-center gap-2 rounded-xl border border-cream/20 bg-[#151221] px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#ffd8be]"
                    >
                      <HeadingIcon className="h-4 w-4 text-[#ffd8be]" />
                      <span>Add Heading</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddTextBlock(null)}
                      className="inline-flex items-center gap-2 rounded-xl border border-cream/20 bg-[#151221] px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#f694ff]"
                    >
                      <Type className="h-4 w-4 text-[#f694ff]" />
                      <span>Add Text</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ gap: `${canvasStyle.blockSpacing}px` }}
                  className="flex flex-col"
                >
                  {blocks.map((block, idx) => {
                    const isDragTarget = dragOverBlockIndex === idx;
                    const isDraggable = dragArmedBlockId === block.id;
                    return (
                      <div key={block.id} className="group/block relative">
                        <div
                          draggable={isDraggable}
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={() => {
                            setDraggedBlockIndex(null);
                            setDragOverBlockIndex(null);
                            setDragArmedBlockId(null);
                          }}
                          className={`relative overflow-hidden rounded-2xl border transition-colors ${
                            isDragTarget
                              ? 'border-2 border-[#a9cbff] ring-2 ring-[#a9cbff]/30'
                              : 'border-cream/10 hover:border-cream/30'
                          } bg-black/20`}
                        >
                          {/* Block Control Toolbar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream/10 bg-[#110f1a] px-3.5 py-2 text-xs text-cream">
                            <div
                              onMouseDown={() => setDragArmedBlockId(block.id)}
                              onMouseUp={() => setDragArmedBlockId(null)}
                              className="flex cursor-grab items-center gap-2 active:cursor-grabbing"
                              title="Drag handle to reorder block"
                            >
                              <GripVertical className="h-4 w-4 text-cream/55 hover:text-cream" />
                              <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-[#ffd8be]">
                                {idx + 1}. {block.type.replace('-', ' ')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Image-specific controls */}
                              {block.type === 'image' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateBlock(block.id, {
                                        layout:
                                          block.layout === 'contained'
                                            ? 'full'
                                            : 'contained',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-cream/15 bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-cream/85 hover:border-[#a9cbff]"
                                  >
                                    {block.layout === 'contained' ? (
                                      <>
                                        <Maximize2 className="h-3 w-3" />
                                        <span>Switch to Full-Width</span>
                                      </>
                                    ) : (
                                      <>
                                        <Minimize2 className="h-3 w-3" />
                                        <span>Full-Width (Active)</span>
                                      </>
                                    )}
                                  </button>

                                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-cream/15 bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-cream/85 hover:border-[#a9cbff]">
                                    <RefreshCw className="h-3 w-3" />
                                    <span>Replace Image</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        void handleReplaceBlockImage(
                                          block.id,
                                          e.target.files?.[0]
                                        );
                                        e.target.value = '';
                                      }}
                                      className="hidden"
                                    />
                                  </label>

                                  {block.imageUrl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCoverUrl(block.imageUrl!);
                                        showToast(
                                          'Selected as project cover thumbnail!'
                                        );
                                      }}
                                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                                        coverUrl === block.imageUrl
                                          ? 'border-[#ffd8be] bg-[#ffd8be] text-obsidian'
                                          : 'border-cream/15 bg-charcoal text-cream/80 hover:border-[#ffd8be]'
                                      }`}
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      <span>
                                        {coverUrl === block.imageUrl
                                          ? 'Active Cover'
                                          : 'Use as Cover'}
                                      </span>
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Heading / Text alignment controls */}
                              {(block.type === 'heading' ||
                                block.type === 'text') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateBlock(block.id, {
                                        align: 'left',
                                      })
                                    }
                                    className={`rounded-lg border p-1.5 ${
                                      block.align !== 'center'
                                        ? 'border-[#a9cbff] text-[#a9cbff]'
                                        : 'border-cream/10 text-cream/60'
                                    }`}
                                    title="Align Left"
                                  >
                                    <AlignLeft className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateBlock(block.id, {
                                        align: 'center',
                                      })
                                    }
                                    className={`rounded-lg border p-1.5 ${
                                      block.align === 'center'
                                        ? 'border-[#a9cbff] text-[#a9cbff]'
                                        : 'border-cream/10 text-cream/60'
                                    }`}
                                    title="Align Center"
                                  >
                                    <AlignCenter className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Photo Grid column controls */}
                              {block.type === 'photo-grid' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateBlock(block.id, {
                                        columns: block.columns === 3 ? 2 : 3,
                                      })
                                    }
                                    className="rounded-lg border border-cream/15 bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-cream/85 hover:border-[#a9cbff]"
                                  >
                                    {block.columns === 3
                                      ? '3 Columns'
                                      : '2 Columns'}
                                  </button>
                                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-cream/15 bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-[#a9cbff] hover:border-[#a9cbff]">
                                    <Plus className="h-3 w-3" />
                                    <span>Add Photos</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={(e) => {
                                        void handleAddImagesToGridBlock(
                                          block.id,
                                          e.target.files
                                        );
                                        e.target.value = '';
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </>
                              )}

                              {/* Move Up / Move Down / Delete */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveBlock(idx, 'up')}
                                title="Move Block Up"
                                className="rounded-lg border border-cream/10 p-1.5 text-cream/80 hover:border-[#a9cbff] disabled:opacity-30"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === blocks.length - 1}
                                onClick={() => handleMoveBlock(idx, 'down')}
                                title="Move Block Down"
                                className="rounded-lg border border-cream/10 p-1.5 text-cream/80 hover:border-[#a9cbff] disabled:opacity-30"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(block.id)}
                                title="Delete Block"
                                className="rounded-lg border border-red-400/25 p-1.5 text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* BLOCK BODY RENDERER — Natural Aspect Ratio, Zero Cropping/Distortion */}
                          {block.type === 'image' && (
                            <div
                              className={
                                block.layout === 'contained'
                                  ? 'mx-auto w-full max-w-[1120px]'
                                  : 'w-full'
                              }
                            >
                              <img
                                src={block.imageUrl}
                                alt={block.caption || 'Project slide'}
                                decoding="async"
                                className="block h-auto w-full max-w-full"
                              />
                              <div className="border-t border-cream/8 bg-[#0e0c16] px-3 py-1.5">
                                <input
                                  type="text"
                                  value={block.caption || ''}
                                  onChange={(e) =>
                                    handleUpdateBlock(block.id, {
                                      caption: e.target.value,
                                    })
                                  }
                                  placeholder="Optional slide label or alt description..."
                                  className="w-full rounded border border-transparent bg-transparent px-2 py-0.5 text-center text-xs text-cream/75 hover:border-cream/15 focus:border-[#a9cbff] focus:bg-obsidian focus:text-cream focus:outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {block.type === 'heading' && (
                            <div
                              className={`p-4 sm:p-6 ${
                                block.align === 'center'
                                  ? 'text-center'
                                  : 'text-left'
                              }`}
                            >
                              <input
                                type="text"
                                value={block.text || ''}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, {
                                    text: e.target.value,
                                  })
                                }
                                placeholder="Enter Section Heading..."
                                className="w-full bg-transparent font-display text-2xl font-extrabold uppercase tracking-tight focus:outline-none sm:text-3xl"
                              />
                              <input
                                type="text"
                                value={block.subtext || ''}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, {
                                    subtext: e.target.value,
                                  })
                                }
                                placeholder="Optional subheading or section eyebrow..."
                                className="mt-1.5 w-full bg-transparent font-display text-xs font-bold uppercase tracking-widest text-[#ffd8be] focus:outline-none"
                              />
                            </div>
                          )}

                          {block.type === 'text' && (
                            <div
                              className={`p-4 sm:p-6 ${
                                block.align === 'center'
                                  ? 'mx-auto max-w-3xl text-center'
                                  : 'max-w-4xl text-left'
                              }`}
                            >
                              <textarea
                                rows={4}
                                value={block.text || ''}
                                onChange={(e) =>
                                  handleUpdateBlock(block.id, {
                                    text: e.target.value,
                                  })
                                }
                                placeholder="Write project story, brand concept, or design notes..."
                                className="w-full resize-y rounded-xl border border-transparent bg-transparent p-2 text-sm leading-relaxed focus:border-[#a9cbff] focus:bg-obsidian/40 focus:outline-none sm:text-base"
                              />
                            </div>
                          )}

                          {block.type === 'photo-grid' && (
                            <div>
                              <div
                                className={`grid grid-cols-1 gap-0 ${
                                  block.columns === 3
                                    ? 'sm:grid-cols-3'
                                    : 'sm:grid-cols-2'
                                }`}
                              >
                                {(block.gridImages || []).map((gi) => (
                                  <div
                                    key={gi.id}
                                    className="group/griditem relative overflow-hidden bg-obsidian/40"
                                  >
                                    <img
                                      src={gi.url}
                                      alt={gi.caption || 'Grid image'}
                                      decoding="async"
                                      className="block h-auto w-full max-w-full"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateBlock(block.id, {
                                          gridImages: (
                                            block.gridImages || []
                                          ).filter((item) => item.id !== gi.id),
                                        })
                                      }
                                      title="Remove photo from grid"
                                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-obsidian/85 text-red-300 opacity-0 transition group-hover/griditem:opacity-100 hover:bg-red-500/20"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t border-cream/8 bg-[#0e0c16] px-3 py-1.5">
                                <input
                                  type="text"
                                  value={block.caption || ''}
                                  onChange={(e) =>
                                    handleUpdateBlock(block.id, {
                                      caption: e.target.value,
                                    })
                                  }
                                  placeholder="Optional photo grid caption..."
                                  className="w-full bg-transparent px-2 py-0.5 text-center text-xs text-cream/70 focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Between-Block Insertion Bar */}
                        <div className="my-2 flex items-center justify-center gap-2 opacity-45 transition-opacity hover:opacity-100">
                          <span className="h-px flex-1 bg-cream/10" />
                          <button
                            type="button"
                            onClick={() => {
                              setInsertAtIndex(idx);
                              fullWidthImageInputRef.current?.click();
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-cream/15 bg-[#14121f] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cream hover:border-[#a9cbff] hover:text-[#a9cbff]"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Image</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddHeadingBlock(idx)}
                            className="inline-flex items-center gap-1 rounded-full border border-cream/15 bg-[#14121f] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cream hover:border-[#ffd8be] hover:text-[#ffd8be]"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Heading</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddTextBlock(idx)}
                            className="inline-flex items-center gap-1 rounded-full border border-cream/15 bg-[#14121f] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cream hover:border-[#f694ff] hover:text-[#f694ff]"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Text</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInsertAtIndex(idx);
                              photoGridInputRef.current?.click();
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-cream/15 bg-[#14121f] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cream hover:border-[#a9cbff] hover:text-[#a9cbff]"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Grid</span>
                          </button>
                          <span className="h-px flex-1 bg-cream/10" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* B. PROJECT EDITING TOOLBAR / RIGHT SIDEBAR */}
          <aside className="flex w-80 shrink-0 flex-col border-l border-cream/10 bg-[#110f1a] sm:w-88">
            {/* Sidebar Mode Switcher */}
            <div className="grid grid-cols-3 border-b border-cream/10 p-2">
              <button
                type="button"
                onClick={() => setSidebarTab('add')}
                className={`rounded-xl py-2 font-display text-[11px] font-extrabold uppercase tracking-wider transition ${
                  sidebarTab === 'add'
                    ? 'bg-[#1f1b30] text-[#ffd8be]'
                    : 'text-cream/60 hover:text-cream'
                }`}
              >
                Add Content
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('reorder')}
                className={`rounded-xl py-2 font-display text-[11px] font-extrabold uppercase tracking-wider transition ${
                  sidebarTab === 'reorder'
                    ? 'bg-[#1f1b30] text-[#a9cbff]'
                    : 'text-cream/60 hover:text-cream'
                }`}
              >
                Reorder ({blocks.length})
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('styles')}
                className={`rounded-xl py-2 font-display text-[11px] font-extrabold uppercase tracking-wider transition ${
                  sidebarTab === 'styles'
                    ? 'bg-[#1f1b30] text-[#f694ff]'
                    : 'text-cream/60 hover:text-cream'
                }`}
              >
                Styles
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {sidebarTab === 'add' && (
                <>
                  <div>
                    <p className="font-display text-xs font-extrabold uppercase tracking-widest text-cream/60">
                      Insert Content Blocks
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setInsertAtIndex(null);
                          fullWidthImageInputRef.current?.click();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-cream/12 bg-charcoal p-3.5 text-left transition hover:border-[#a9cbff] hover:bg-[#191628]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a9cbff]/15 text-[#a9cbff]">
                          <Maximize2 className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-display text-xs font-extrabold uppercase text-cream">
                            Add Full-Width Images
                          </p>
                          <p className="text-[11px] text-cream/55">
                            Upload 1 or multiple full-size slides
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInsertAtIndex(null);
                          multiImageInputRef.current?.click();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-cream/12 bg-charcoal p-3.5 text-left transition hover:border-[#ffd8be] hover:bg-[#191628]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffd8be]/15 text-[#ffd8be]">
                          <ImageIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-display text-xs font-extrabold uppercase text-cream">
                            Upload Project Images
                          </p>
                          <p className="text-[11px] text-cream/55">
                            Preserves natural size &amp; aspect ratio
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInsertAtIndex(null);
                          photoGridInputRef.current?.click();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-cream/12 bg-charcoal p-3.5 text-left transition hover:border-[#f694ff] hover:bg-[#191628]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f694ff]/15 text-[#f694ff]">
                          <LayoutGrid className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-display text-xs font-extrabold uppercase text-cream">
                            Add Photo Grid
                          </p>
                          <p className="text-[11px] text-cream/55">
                            Multi-column visual gallery grid
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddHeadingBlock(null)}
                        className="flex items-center gap-3 rounded-2xl border border-cream/12 bg-charcoal p-3.5 text-left transition hover:border-[#ffd8be] hover:bg-[#191628]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream/10 text-cream">
                          <HeadingIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-display text-xs font-extrabold uppercase text-cream">
                            Add Heading
                          </p>
                          <p className="text-[11px] text-cream/55">
                            Section title &amp; eyebrow label
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddTextBlock(null)}
                        className="flex items-center gap-3 rounded-2xl border border-cream/12 bg-charcoal p-3.5 text-left transition hover:border-[#a9cbff] hover:bg-[#191628]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream/10 text-cream">
                          <Type className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-display text-xs font-extrabold uppercase text-cream">
                            Add Text Block
                          </p>
                          <p className="text-[11px] text-cream/55">
                            Paragraph description or notes
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Quick Jump to Project Settings */}
                  <div className="border-t border-cream/10 pt-5">
                    <button
                      type="button"
                      onClick={() => setActiveStep('settings')}
                      className="flex w-full items-center justify-between rounded-2xl border border-[#ffd8be]/35 bg-[#191628] p-4 text-left transition hover:border-[#ffd8be]"
                    >
                      <div>
                        <p className="font-display text-xs font-extrabold uppercase tracking-wider text-[#ffd8be]">
                          Project Settings &amp; Cover
                        </p>
                        <p className="mt-0.5 text-[11px] text-cream/65">
                          Crop cover, tags, tools &amp; publish
                        </p>
                      </div>
                      <Settings className="h-5 w-5 text-[#ffd8be]" />
                    </button>
                  </div>
                </>
              )}

              {sidebarTab === 'reorder' && (
                <div className="space-y-2.5">
                  <p className="font-display text-xs font-extrabold uppercase tracking-widest text-cream/60">
                    Drag or Click to Reorder Blocks
                  </p>
                  {blocks.length === 0 ? (
                    <p className="text-xs text-cream/50">
                      No blocks added yet.
                    </p>
                  ) : (
                    blocks.map((b, idx) => (
                      <div
                        key={b.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        className="flex items-center justify-between gap-2 rounded-xl border border-cream/12 bg-charcoal p-2.5 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-cream/45" />
                          {b.type === 'image' && b.imageUrl && (
                            <img
                              src={b.imageUrl}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded object-cover"
                            />
                          )}
                          <span className="truncate font-display font-bold uppercase">
                            {idx + 1}. {b.caption || b.text || b.type}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveBlock(idx, 'up')}
                            className="rounded border border-cream/10 p-1 hover:border-[#a9cbff] disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === blocks.length - 1}
                            onClick={() => handleMoveBlock(idx, 'down')}
                            className="rounded border border-cream/10 p-1 hover:border-[#a9cbff] disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {sidebarTab === 'styles' && (
                <div className="space-y-5">
                  <div>
                    <label className="block font-display text-xs font-extrabold uppercase tracking-wider text-cream/80">
                      Canvas Background
                    </label>
                    <div className="mt-2.5 grid grid-cols-1 gap-2">
                      {CANVAS_BG_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() =>
                            setCanvasStyle((prev) => ({
                              ...prev,
                              backgroundColor: preset.value,
                            }))
                          }
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                            canvasStyle.backgroundColor === preset.value
                              ? 'border-[#a9cbff] bg-[#1e1a2e] text-cream'
                              : 'border-cream/10 bg-charcoal text-cream/70'
                          }`}
                        >
                          <span>{preset.label}</span>
                          <span
                            style={{ backgroundColor: preset.value }}
                            className="h-5 w-5 rounded-full border border-cream/30"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="uppercase tracking-wider text-cream/80">
                        Vertical Slide Spacing
                      </span>
                      <span className="text-[#ffd8be]">
                        {canvasStyle.blockSpacing}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={48}
                      step={4}
                      value={canvasStyle.blockSpacing}
                      onChange={(e) =>
                        setCanvasStyle((prev) => ({
                          ...prev,
                          blockSpacing: Number(e.target.value),
                        }))
                      }
                      className="mt-2 w-full accent-[#a9cbff]"
                    />
                  </div>

                  <div>
                    <label className="block font-display text-xs font-extrabold uppercase tracking-wider text-cream/80">
                      Presentation Width
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(['full', 'wide', 'standard'] as const).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() =>
                            setCanvasStyle((prev) => ({
                              ...prev,
                              maxWidth: w,
                            }))
                          }
                          className={`rounded-xl border py-2 font-display text-[11px] font-bold uppercase ${
                            canvasStyle.maxWidth === w
                              ? 'border-[#a9cbff] bg-[#a9cbff] text-obsidian'
                              : 'border-cream/15 bg-charcoal text-cream/75'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* STEP 2: LIVE FULL-PAGE PRESENTATION PREVIEW (1:1 WITH PUBLISHED DETAIL PAGE) */}
      {activeStep === 'preview' && (
        <div className="flex-1 overflow-y-auto bg-obsidian p-4 sm:p-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cream/10 bg-[#13111c] px-6 py-4">
              <div>
                <span className="font-display text-[11px] font-extrabold uppercase tracking-widest text-[#ffd8be]">
                  LIVE PRESENTATION PREVIEW &bull; {selectedCategoryLabel}
                </span>
                <h2 className="mt-1 font-display text-2xl font-extrabold uppercase text-cream">
                  {title || 'Untitled Project'}
                </h2>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveStep('canvas')}
                  className="rounded-xl border border-cream/20 bg-charcoal px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-cream hover:border-[#a9cbff]"
                >
                  Back to Editing
                </button>
                <button
                  type="button"
                  onClick={() => void handlePublishOrUpdate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-4 py-2 font-display text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {isEditingPublished ? 'Update & Publish' : 'Publish Project'}
                  </span>
                </button>
              </div>
            </div>

            <div
              style={{
                backgroundColor: canvasStyle.backgroundColor,
                gap: `${canvasStyle.blockSpacing}px`,
              }}
              className={`mx-auto flex w-full ${maxWidthClass} flex-col overflow-hidden rounded-2xl border border-cream/10 ${
                isLightCanvas ? 'text-obsidian' : 'text-cream'
              }`}
            >
              {blocks.map((block) => {
                if (block.type === 'image') {
                  return (
                    <div
                      key={block.id}
                      className={`leading-none ${
                        block.layout === 'contained'
                          ? 'mx-auto w-full max-w-[1120px]'
                          : 'w-full'
                      }`}
                    >
                      <img
                        src={block.imageUrl}
                        alt={block.caption || title}
                        decoding="async"
                        className="block h-auto w-full max-w-full"
                      />
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
                      <h3 className="font-display text-2xl font-extrabold uppercase sm:text-4xl">
                        {block.text}
                      </h3>
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
                    <div
                      key={block.id}
                      className={`grid grid-cols-1 gap-0 ${
                        block.columns === 3
                          ? 'sm:grid-cols-3'
                          : 'sm:grid-cols-2'
                      }`}
                    >
                      {(block.gridImages || []).map((gi) => (
                        <img
                          key={gi.id}
                          src={gi.url}
                          alt={gi.caption || title}
                          decoding="async"
                          className="block h-auto w-full max-w-full"
                        />
                      ))}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SEPARATE PROJECT SETTINGS, COVER FRAMING & PUBLISHING STEP */}
      {activeStep === 'settings' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-12">
            {/* LEFT COLUMN: PROJECT COVER UPLOAD, SELECTION, CROP & LIVE HOMEPAGE CARD PREVIEW (5 cols) */}
            <div className="space-y-6 rounded-3xl border border-cream/12 bg-[#13111c] p-6 lg:col-span-5">
              <div>
                <span className="font-display text-[11px] font-extrabold uppercase tracking-widest text-[#ffd8be]">
                  HOMEPAGE THUMBNAIL
                </span>
                <h3 className="mt-1 font-display text-lg font-extrabold uppercase text-cream">
                  Project Cover &amp; Crop
                </h3>
                <p className="mt-1 text-xs text-cream/60">
                  Preview how your project card will appear in the uniform
                  5-column homepage grid.
                </p>
              </div>

              {/* LIVE UNIFORM 4:3 HOMEPAGE CARD PREVIEW */}
              <div className="mx-auto w-full max-w-[320px] rounded-2xl border border-cream/10 bg-obsidian p-3.5">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#13111c] ring-1 ring-cream/15">
                  {coverUrl || allCanvasImages[0] ? (
                    <img
                      src={coverUrl || allCanvasImages[0]}
                      alt="Cover Preview"
                      style={{
                        transform: `translate(${coverCrop.offsetX}%, ${coverCrop.offsetY}%) scale(${coverCrop.zoom})`,
                      }}
                      className="block h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-cream/40">
                      No Cover Selected
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex h-[42px] items-start justify-between gap-2 px-0.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[13px] font-bold leading-tight text-cream">
                      {title || 'Untitled Project'}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-medium leading-none text-cream/50">
                      {selectedCategoryLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-cream/60">
                    <span>{existingProject?.appreciations ?? 0}</span>
                    <span>&bull;</span>
                    <span>{existingProject?.views ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Upload Custom Cover Button */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#a9cbff]/40 bg-charcoal px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#a9cbff] transition hover:bg-[#a9cbff] hover:text-obsidian"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Cover Image</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCoverCrop({ zoom: 1, offsetX: 0, offsetY: 0 })
                  }
                  className="rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2.5 font-display text-xs font-bold uppercase text-cream/70 hover:text-cream"
                >
                  Reset Crop
                </button>
              </div>

              {/* Select Cover from Uploaded Project Content */}
              {allCanvasImages.length > 0 && (
                <div>
                  <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/75">
                    Or Select From Project Images ({allCanvasImages.length})
                  </label>
                  <div className="mt-2.5 grid grid-cols-4 gap-2">
                    {allCanvasImages.map((imgUrl, i) => (
                      <button
                        key={`${imgUrl}-${i}`}
                        type="button"
                        onClick={() => setCoverUrl(imgUrl)}
                        className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition ${
                          coverUrl === imgUrl
                            ? 'border-[#ffd8be] ring-2 ring-[#ffd8be]/40'
                            : 'border-cream/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover Cropping & Positioning Sliders */}
              <div className="space-y-3 border-t border-cream/10 pt-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffd8be]">
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Adjust Cover Framing</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-cream/75">
                    <span>Zoom</span>
                    <span>{coverCrop.zoom.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={2.4}
                    step={0.05}
                    value={coverCrop.zoom}
                    onChange={(e) =>
                      setCoverCrop((prev) => ({
                        ...prev,
                        zoom: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full accent-[#a9cbff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs text-cream/75">
                      <span>Horizontal (X)</span>
                      <span>{coverCrop.offsetX}%</span>
                    </div>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      step={1}
                      value={coverCrop.offsetX}
                      onChange={(e) =>
                        setCoverCrop((prev) => ({
                          ...prev,
                          offsetX: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full accent-[#a9cbff]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-cream/75">
                      <span>Vertical (Y)</span>
                      <span>{coverCrop.offsetY}%</span>
                    </div>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      step={1}
                      value={coverCrop.offsetY}
                      onChange={(e) =>
                        setCoverCrop((prev) => ({
                          ...prev,
                          offsetY: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full accent-[#a9cbff]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: PROJECT INFORMATION, TAGS, TOOLS & PUBLISHING ACTIONS (7 cols) */}
            <div className="space-y-6 rounded-3xl border border-cream/12 bg-[#13111c] p-6 lg:col-span-7">
              <div>
                <span className="font-display text-[11px] font-extrabold uppercase tracking-widest text-[#a9cbff]">
                  PROJECT METADATA
                </span>
                <h3 className="mt-1 font-display text-lg font-extrabold uppercase text-cream">
                  Project Information &amp; Publishing
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/80">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Geometric Brand Identity System"
                    className="mt-1.5 w-full rounded-xl border border-cream/15 bg-obsidian px-4 py-3 text-sm text-cream focus:border-[#a9cbff] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/80">
                    Category / Creative Field *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-cream/15 bg-obsidian px-4 py-3 text-sm text-cream focus:border-[#a9cbff] focus:outline-none"
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
                <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/80">
                  Project Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the brand identity goals, visual direction, and design solution..."
                  className="mt-1.5 w-full rounded-xl border border-cream/15 bg-obsidian px-4 py-3 text-sm text-cream focus:border-[#a9cbff] focus:outline-none"
                />
              </div>

              {/* Tools Used Selector */}
              <div>
                <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/80">
                  Tools &amp; Software Used
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_TOOLS.map((presetTool) => {
                    const active = tools.includes(presetTool);
                    return (
                      <button
                        key={presetTool}
                        type="button"
                        onClick={() => toggleTool(presetTool)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-display text-xs font-bold transition ${
                          active
                            ? 'border-[#a9cbff] bg-[#a9cbff] text-obsidian'
                            : 'border-cream/15 bg-obsidian text-cream/75 hover:border-cream/35'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        <span>{presetTool}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tools */}
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    value={customToolInput}
                    onChange={(e) => setCustomToolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTool();
                      }
                    }}
                    placeholder="Add another tool (e.g., After Effects, Cinema 4D)..."
                    className="flex-1 rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2 text-xs text-cream focus:border-[#a9cbff] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTool}
                    className="rounded-xl border border-cream/20 bg-charcoal px-4 py-2 font-display text-xs font-bold uppercase text-cream hover:border-[#a9cbff]"
                  >
                    Add Tool
                  </button>
                </div>

                {tools.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tools.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cream/10 bg-obsidian px-2.5 py-1 text-xs text-[#ffd8be]"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => toggleTool(t)}
                          className="text-cream/50 hover:text-cream"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Project Tags */}
              <div>
                <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/80">
                  Project Tags
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add project tag (e.g., Logo, Minimalist, Brand Book)..."
                    className="flex-1 rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2 text-xs text-cream focus:border-[#a9cbff] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="rounded-xl border border-cream/20 bg-charcoal px-4 py-2 font-display text-xs font-bold uppercase text-cream hover:border-[#a9cbff]"
                  >
                    Add Tag
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-obsidian px-3 py-1 text-xs text-cream/85"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setTags((prev) =>
                              prev.filter((item) => item !== tag)
                            )
                          }
                          className="text-cream/50 hover:text-cream"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Deliverables */}
              <div>
                <label className="block font-display text-xs font-bold uppercase tracking-wider text-cream/80">
                  Deliverables (Comma Separated)
                </label>
                <input
                  type="text"
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-cream/15 bg-obsidian px-4 py-2.5 text-xs text-cream focus:border-[#a9cbff] focus:outline-none"
                />
              </div>

              {/* Publishing & Lifecycle Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream/10 pt-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  {existingProject && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${existingProject.title}" permanently?`
                          )
                        ) {
                          deleteProject(existingProject.id);
                          closeProjectBuilder();
                          onPublishedOrClosed(undefined);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-red-300 transition hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isSavingAction !== null}
                    onClick={() => void handleSaveChangesOnly()}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#a9cbff]/40 bg-[#171526] px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-[#a9cbff] transition hover:border-[#a9cbff] hover:bg-[#211d36] disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingAction !== null}
                    onClick={() => void handleSaveAsDraft()}
                    className="inline-flex items-center gap-2 rounded-xl border border-cream/20 bg-obsidian px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#ffd8be] hover:text-[#ffd8be] disabled:opacity-50"
                  >
                    <EyeOff className="h-4 w-4 text-[#ffd8be]" />
                    <span>Save as Draft</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingAction !== null}
                    onClick={() => void handlePublishOrUpdate()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-6 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-105 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>
                      {isEditingPublished
                        ? 'Update & Publish'
                        : 'Publish Project'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
