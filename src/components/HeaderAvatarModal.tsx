import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Trash2,
  ZoomIn,
  Move,
  Check,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';

export const HeaderAvatarModal: React.FC = () => {
  const {
    siteConfig,
    isHeaderAvatarModalOpen,
    closeHeaderAvatarModal,
    updateHeaderAvatar,
    uploadAssetFile,
  } = usePortfolioCMS();

  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(
    siteConfig.headerAvatar.imageUrl
  );
  const [draftZoom, setDraftZoom] = useState<number>(
    siteConfig.headerAvatar.zoom
  );
  const [draftOffsetX, setDraftOffsetX] = useState<number>(
    siteConfig.headerAvatar.offsetX
  );
  const [draftOffsetY, setDraftOffsetY] = useState<number>(
    siteConfig.headerAvatar.offsetY
  );
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isHeaderAvatarModalOpen) {
      setDraftImageUrl(siteConfig.headerAvatar.imageUrl);
      setDraftZoom(siteConfig.headerAvatar.zoom);
      setDraftOffsetX(siteConfig.headerAvatar.offsetX);
      setDraftOffsetY(siteConfig.headerAvatar.offsetY);
    }
  }, [isHeaderAvatarModalOpen, siteConfig.headerAvatar]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadAssetFile(file);
      setDraftImageUrl(uploadedUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUseMyPortrait = () => {
    setDraftImageUrl(siteConfig.portraits.heroPortraitPath);
    setDraftZoom(1.35);
    setDraftOffsetX(0);
    setDraftOffsetY(10);
  };

  const handleRemoveImage = () => {
    setDraftImageUrl(null);
  };

  const previewUrl =
    draftImageUrl ||
    siteConfig.portraits.heroPortraitPath ||
    '/images/profile/hero-portrait.png';

  const handleSave = () => {
    updateHeaderAvatar({
      imageUrl: previewUrl,
      zoom: draftZoom,
      offsetX: draftOffsetX,
      offsetY: draftOffsetY,
    });
    closeHeaderAvatarModal();
  };

  return (
    <AnimatePresence>
      {isHeaderAvatarModalOpen && (
        <motion.div
          key="header-avatar-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-obsidian/90 p-4 backdrop-blur-2xl"
          onClick={closeHeaderAvatarModal}
        >
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-cream/15 bg-charcoal text-cream shadow-studio"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cream/10 bg-obsidian/70 px-6 py-4">
              <div>
                <h2 className="font-display text-base font-bold uppercase tracking-wider text-cream">
                  Header Profile Picture
                </h2>
                <p className="text-xs text-stone">
                  Upload, preview, position, or remove your top-left profile badge
                </p>
              </div>
              <button
                type="button"
                onClick={closeHeaderAvatarModal}
                aria-label="Close modal"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-cream/15 bg-charcoal text-cream transition hover:border-[#7ca6e8] hover:text-[#7ca6e8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6 p-6">
              {/* Live Header Preview */}
              <div className="rounded-2xl border border-cream/10 bg-obsidian p-5">
                <span className="block text-[10px] font-bold uppercase tracking-editorial text-stone">
                  LIVE HEADER PREVIEW
                </span>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-[#b86bd4] bg-charcoal shadow-gold">
                      <img
                        src={previewUrl}
                        alt={siteConfig.name}
                        style={{
                          transform: `translate(${draftOffsetX}%, ${draftOffsetY}%) scale(${draftZoom})`,
                        }}
                        className="h-full w-full object-cover object-top transition-transform duration-75"
                      />
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold tracking-wider text-cream">
                        {siteConfig.name}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-editorial text-[#f1b39c]">
                        {siteConfig.title}
                      </p>
                    </div>
                  </div>

                  {/* Larger 84px Crop Inspector */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#7ca6e8]/70 bg-charcoal shadow-studio">
                      <img
                        src={previewUrl}
                        alt="Crop preview"
                        style={{
                          transform: `translate(${draftOffsetX}%, ${draftOffsetY}%) scale(${draftZoom})`,
                        }}
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <span className="text-[10px] text-stone">2x Preview</span>
                  </div>
                </div>
              </div>

              {/* Upload / Replace / Remove Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:brightness-110"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    {isUploading ? 'Uploading...' : 'Upload New Photo'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleUseMyPortrait}
                  className="inline-flex items-center gap-2 rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:border-[#f1b39c] hover:text-[#f1b39c]"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#f1b39c]" />
                  <span>Use My Hero Portrait</span>
                </button>

                {draftImageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-red-300 transition hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Positioning & Cropping Sliders */}
              {draftImageUrl && (
                <div className="space-y-4 rounded-2xl border border-cream/10 bg-obsidian/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#f1b39c]">
                      <Move className="h-3.5 w-3.5" />
                      <span>Crop &amp; Position Adjustments</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftZoom(1.35);
                        setDraftOffsetX(0);
                        setDraftOffsetY(10);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-stone hover:text-cream"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset Crop</span>
                    </button>
                  </div>

                  {/* Zoom Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-cream/80">
                      <span className="inline-flex items-center gap-1">
                        <ZoomIn className="h-3.5 w-3.5 text-[#7ca6e8]" />
                        Zoom Scale
                      </span>
                      <span>{Math.round(draftZoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2.6"
                      step="0.05"
                      value={draftZoom}
                      onChange={(e) => setDraftZoom(parseFloat(e.target.value))}
                      className="mt-1.5 w-full accent-[#b86bd4]"
                    />
                  </div>

                  {/* Horizontal Position */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs text-cream/80">
                        <span>Horizontal (X)</span>
                        <span>{draftOffsetX}%</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="1"
                        value={draftOffsetX}
                        onChange={(e) =>
                          setDraftOffsetX(parseInt(e.target.value, 10))
                        }
                        className="mt-1.5 w-full accent-[#7ca6e8]"
                      />
                    </div>

                    {/* Vertical Position */}
                    <div>
                      <div className="flex justify-between text-xs text-cream/80">
                        <span>Vertical (Y)</span>
                        <span>{draftOffsetY}%</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="1"
                        value={draftOffsetY}
                        onChange={(e) =>
                          setDraftOffsetY(parseInt(e.target.value, 10))
                        }
                        className="mt-1.5 w-full accent-[#f1b39c]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-cream/10 bg-obsidian/70 px-6 py-4">
              <button
                type="button"
                onClick={closeHeaderAvatarModal}
                className="rounded-xl border border-cream/15 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cream/80 hover:border-cream/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-[0_6px_20px_rgba(223,0,255,0.35)] transition hover:brightness-110"
              >
                <Check className="h-4 w-4" />
                <span>Save Profile Image</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
