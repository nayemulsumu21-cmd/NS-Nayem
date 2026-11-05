import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sliders,
  RotateCcw,
  Check,
  ZoomIn,
  Move,
  Crop as CropIcon,
} from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { PortraitAdjustments } from '../config/site';

const DEFAULT_ADJUSTMENTS: PortraitAdjustments = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  cropTop: 0,
  cropBottom: 0,
};

export const HeroPortraitAdjusterModal: React.FC = () => {
  const {
    portraitAdjusterConfig,
    closePortraitAdjuster,
    isOwnerMode,
    siteConfig,
  } = usePortfolioCMS();

  const [scale, setScale] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [cropTop, setCropTop] = useState<number>(0);
  const [cropBottom, setCropBottom] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (portraitAdjusterConfig) {
      const init = portraitAdjusterConfig.initialAdjustments ||
        siteConfig.portraits?.heroAdjustments ||
        DEFAULT_ADJUSTMENTS;
      setScale(init.scale ?? 1);
      setOffsetX(init.offsetX ?? 0);
      setOffsetY(init.offsetY ?? 0);
      setCropTop(init.cropTop ?? 0);
      setCropBottom(init.cropBottom ?? 0);
      setIsSaving(false);
    }
  }, [portraitAdjusterConfig, siteConfig.portraits?.heroAdjustments]);

  if (!isOwnerMode || !portraitAdjusterConfig || !portraitAdjusterConfig.isOpen) {
    return null;
  }

  const handleReset = () => {
    setScale(DEFAULT_ADJUSTMENTS.scale);
    setOffsetX(DEFAULT_ADJUSTMENTS.offsetX);
    setOffsetY(DEFAULT_ADJUSTMENTS.offsetY);
    setCropTop(DEFAULT_ADJUSTMENTS.cropTop);
    setCropBottom(DEFAULT_ADJUSTMENTS.cropBottom);
  };

  const handleCancel = () => {
    if (portraitAdjusterConfig.onCancel) {
      portraitAdjusterConfig.onCancel();
    }
    closePortraitAdjuster();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalAdjustments: PortraitAdjustments = {
        scale: Number(scale.toFixed(2)),
        offsetX: Math.round(offsetX),
        offsetY: Math.round(offsetY),
        cropTop: Math.round(cropTop),
        cropBottom: Math.round(cropBottom),
      };
      await portraitAdjusterConfig.onSave(finalAdjustments);
      closePortraitAdjuster();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hero-adjuster-title"
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          className="fixed inset-0 bg-obsidian/90 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22 }}
          className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-cream/20 bg-[#141122] shadow-[0_30px_90px_rgba(0,0,0,0.9)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cream/10 bg-[#1a162b] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DF00FF]/40 bg-gradient-to-br from-[#DF00FF]/20 to-[#00BDFF]/20 text-[#00BDFF]">
                <Sliders className="h-4 w-4" />
              </span>
              <div>
                <h3
                  id="hero-adjuster-title"
                  className="font-display text-base font-extrabold uppercase tracking-wide text-cream"
                >
                  Hero Portrait Size &amp; Position Adjuster
                </h3>
                <p className="text-xs text-cream/65">
                  Fine-tune the subject scale, positioning, and crop over the Hero layout.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl p-2 text-cream/60 transition hover:bg-cream/10 hover:text-cream"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body: Split Live Preview & Controls */}
          <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
            {/* Left: Live Hero Stage Preview (7 Columns) */}
            <div className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden border-b border-cream/10 bg-obsidian p-6 select-none sm:min-h-[440px] lg:col-span-7 lg:border-b-0 lg:border-r">
              {/* Background Typography Watermark for live visual alignment */}
              <div
                className="pointer-events-none absolute inset-x-0 top-[22%] -translate-y-1/2 text-center opacity-40 select-none overflow-visible"
                aria-hidden="true"
              >
                <span className="hero-brand-identity-gradient font-impact text-[7vw] font-normal uppercase tracking-[0.02em] whitespace-nowrap lg:text-[4vw]">
                  {siteConfig.heroBackgroundText || 'NAYEMUL ISLAM'}
                </span>
              </div>

              {/* Stage Mask Wrapper */}
              <div className="relative flex h-full max-h-[400px] w-full max-w-[420px] items-end justify-center overflow-hidden rounded-2xl border border-cream/10 bg-black/40 p-4">
                <img
                  src={portraitAdjusterConfig.imageUrl}
                  alt="Live Hero Portrait Preview"
                  style={{
                    transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
                    clipPath:
                      cropTop > 0 || cropBottom > 0
                        ? `inset(${cropTop}% 0 ${cropBottom}% 0)`
                        : undefined,
                  }}
                  className="mx-auto h-auto max-h-[360px] w-full object-contain object-bottom transition-transform duration-100"
                />
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-cream/60 uppercase">
                <span>Scale: {scale.toFixed(2)}x</span>
                <span>&bull;</span>
                <span>X: {Math.round(offsetX)}px</span>
                <span>&bull;</span>
                <span>Y: {Math.round(offsetY)}px</span>
              </div>
            </div>

            {/* Right: Adjustment Controls (5 Columns) */}
            <div className="flex flex-col justify-between space-y-5 bg-[#141122] p-6 lg:col-span-5">
              <div className="space-y-4">
                {/* 1. Scale / Resize */}
                <div className="space-y-1.5 rounded-2xl border border-cream/10 bg-obsidian/60 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cream">
                    <span className="flex items-center gap-1.5 text-[#00BDFF]">
                      <ZoomIn className="h-3.5 w-3.5" />
                      <span>Scale / Resize</span>
                    </span>
                    <span className="font-mono text-cream/90">{scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.02}
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-cream/20 accent-[#00BDFF]"
                  />
                  <div className="flex justify-between text-[10px] text-cream/50">
                    <span>Smaller (0.6x)</span>
                    <span>Default (1.0x)</span>
                    <span>Larger (1.6x)</span>
                  </div>
                </div>

                {/* 2. Position Horizontal (X) */}
                <div className="space-y-1.5 rounded-2xl border border-cream/10 bg-obsidian/60 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cream">
                    <span className="flex items-center gap-1.5 text-[#DF00FF]">
                      <Move className="h-3.5 w-3.5" />
                      <span>Horizontal Position (X)</span>
                    </span>
                    <span className="font-mono text-cream/90">{Math.round(offsetX)}px</span>
                  </div>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={1}
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-cream/20 accent-[#DF00FF]"
                  />
                  <div className="flex justify-between text-[10px] text-cream/50">
                    <span>Move Left</span>
                    <span>Center</span>
                    <span>Move Right</span>
                  </div>
                </div>

                {/* 3. Position Vertical (Y) */}
                <div className="space-y-1.5 rounded-2xl border border-cream/10 bg-obsidian/60 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cream">
                    <span className="flex items-center gap-1.5 text-[#ffd8be]">
                      <Move className="h-3.5 w-3.5 rotate-90" />
                      <span>Vertical Position (Y)</span>
                    </span>
                    <span className="font-mono text-cream/90">{Math.round(offsetY)}px</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-cream/20 accent-[#ffd8be]"
                  />
                  <div className="flex justify-between text-[10px] text-cream/50">
                    <span>Move Up</span>
                    <span>Normal</span>
                    <span>Move Down</span>
                  </div>
                </div>

                {/* 4. Crop Top & Bottom */}
                <div className="space-y-2.5 rounded-2xl border border-cream/10 bg-obsidian/60 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cream">
                    <span className="flex items-center gap-1.5 text-[#34d399]">
                      <CropIcon className="h-3.5 w-3.5" />
                      <span>Crop Visible Area</span>
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-cream/70">
                      <span>Crop Top: {cropTop}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={35}
                      step={1}
                      value={cropTop}
                      onChange={(e) => setCropTop(parseInt(e.target.value, 10))}
                      className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-cream/20 accent-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-cream/70">
                      <span>Crop Bottom: {cropBottom}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={cropBottom}
                      onChange={(e) => setCropBottom(parseInt(e.target.value, 10))}
                      className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-cream/20 accent-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 border-t border-cream/10 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-cream/15 bg-obsidian/80 px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-cream/70 transition hover:border-cream/30 hover:text-cream"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#ffd8be]" />
                  <span>Reset All Adjustments</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-xl border border-cream/15 bg-obsidian px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-cream transition hover:bg-cream/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-4 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
