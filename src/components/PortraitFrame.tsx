import React, { useState, useRef } from 'react';
import { motion, MotionValue } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Undo2,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';

interface PortraitFrameProps {
  primaryPath: string;
  placeholderPath: string;
  storageKey: string;
  variant: 'hero' | 'about';
  pointer?: { x: number; y: number };
  motionValues?: {
    x?: MotionValue<number>;
    y?: MotionValue<number>;
    rotateX?: MotionValue<number>;
    rotateY?: MotionValue<number>;
  };
  reducedMotion?: boolean;
}

export const PortraitFrame: React.FC<PortraitFrameProps> = ({
  primaryPath,
  placeholderPath,
  variant,
  pointer = { x: 0, y: 0 },
  motionValues,
  reducedMotion = false,
}) => {
  const {
    siteConfig,
    isOwnerMode,
    updateSiteConfig,
    uploadAssetFile,
    replaceHeroPortraitWithBackgroundRemoval,
    restorePreviousHeroPortrait,
    hasHeroPortraitBackup,
    openPortraitAdjuster,
    updateHeroAdjustments,
  } = usePortfolioCMS();
  const [imgError, setImgError] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (variant === 'hero') {
        const res = await replaceHeroPortraitWithBackgroundRemoval(file);
        if (res.ok) {
          setImgError(false);
          setSuccessMessage('Background removed & portrait updated!');
          setTimeout(() => setSuccessMessage(null), 4000);
          const updatedSrc = res.url || '/images/profile/hero-portrait.png';
          openPortraitAdjuster(
            updatedSrc,
            (newAdj) => updateHeroAdjustments(newAdj),
            siteConfig.portraits?.heroAdjustments
          );
        } else {
          setErrorMessage(
            res.error ||
              'Background removal failed. Your current portrait was kept intact.'
          );
        }
      } else {
        const targetDiskPath = '/images/profile/about-portrait.png';
        const newUrl = await uploadAssetFile(file, targetDiskPath);
        setImgError(false);
        updateSiteConfig((prev) => ({
          ...prev,
          portraits: {
            ...prev.portraits,
            aboutPortraitPath: newUrl,
          },
        }));
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Upload failed. The current portrait was preserved.'
      );
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await restorePreviousHeroPortrait();
      if (res.ok) {
        setImgError(false);
        setSuccessMessage('Previous portrait restored successfully!');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(
          res.error || 'Failed to restore previous portrait.'
        );
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to restore previous portrait.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const activeSrc = imgError ? placeholderPath : primaryPath;

  // HERO CENTER CHARACTER VARIANT: Large Transparent PNG overlapping "BRAND IDENTITY" in the foreground
  if (variant === 'hero') {
    const parallaxX = reducedMotion ? 0 : pointer.x * 16;
    const parallaxY = reducedMotion ? 0 : pointer.y * 10;
    const rotateY = reducedMotion ? 0 : pointer.x * 5;
    const rotateX = reducedMotion ? 0 : -pointer.y * 4;

    const heroAdjustments = siteConfig.portraits?.heroAdjustments || {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      cropTop: 0,
      cropBottom: 0,
    };

    return (
      <div className="perspective-1600 relative mx-auto flex w-full max-w-[520px] flex-col items-center justify-end select-none sm:max-w-[620px] lg:max-w-[690px] xl:max-w-[750px]">
        {/* Gentle Floating Character Animation + Mouse Parallax */}
        <motion.div
          animate={
            reducedMotion
              ? undefined
              : {
                  y: [0, -10, 0],
                  x: [0, 3.5, 0, -3.5, 0],
                }
          }
          transition={
            reducedMotion
              ? undefined
              : {
                  y: {
                    duration: 5.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                  x: {
                    duration: 8.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }
          }
          className="relative w-full"
        >
          <motion.div
            style={
              reducedMotion
                ? undefined
                : motionValues
                ? {
                    x: motionValues.x,
                    y: motionValues.y,
                    rotateY: motionValues.rotateY,
                    rotateX: motionValues.rotateX,
                  }
                : {
                    x: parallaxX,
                    y: parallaxY,
                    rotateY,
                    rotateX,
                  }
            }
            className="group relative flex w-full flex-col items-center justify-end"
          >
            {/*
             * High-Resolution Transparent PNG Subject — Natural Colors, Zero Shadows/Glows
             */}
            <div
              className="portrait-stage-mask relative z-10 w-full"
              style={{ transform: 'translateZ(0)' }}
            >
              <img
                src={activeSrc}
                alt="NAYEMUL ISLAM — Brand Identity Designer"
                onError={() => setImgError(true)}
                style={{
                  transform: `translate(${heroAdjustments.offsetX}px, ${heroAdjustments.offsetY}px) scale(${heroAdjustments.scale})`,
                  clipPath:
                    heroAdjustments.cropTop > 0 || heroAdjustments.cropBottom > 0
                      ? `inset(${heroAdjustments.cropTop}% 0px ${heroAdjustments.cropBottom}% 0px)`
                      : undefined,
                  transformOrigin: 'bottom center',
                }}
                className="mx-auto h-auto max-h-[72vh] w-full object-contain object-bottom transition-transform duration-300 group-hover:scale-[1.015] sm:max-h-[78vh] lg:max-h-[84vh] xl:max-h-[87vh]"
              />
            </div>

            {isOwnerMode && (
              <>
                <div
                  className={`mt-2 flex flex-col items-center justify-center gap-2 transition-opacity duration-300 ${
                    isUploading || isRestoring || errorMessage || successMessage
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {/* Change Portrait Button */}
                    <button
                      type="button"
                      disabled={isUploading || isRestoring}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 bg-obsidian/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cream shadow-lg backdrop-blur-md transition-all hover:border-[#00BDFF] hover:text-[#00BDFF] disabled:opacity-50"
                      title="Upload a new portrait image. Background will be removed automatically."
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-[#00BDFF]" />
                          <span>Removing Background...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-3 w-3 text-[#ffd8be]" />
                          <span>Change Portrait</span>
                        </>
                      )}
                    </button>

                    {/* Adjust Size & Position Button */}
                    <button
                      type="button"
                      disabled={isUploading || isRestoring}
                      onClick={() =>
                        openPortraitAdjuster(
                          activeSrc,
                          (newAdj) => updateHeroAdjustments(newAdj),
                          siteConfig.portraits?.heroAdjustments
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 bg-obsidian/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cream shadow-lg backdrop-blur-md transition-all hover:border-[#00BDFF] hover:text-[#00BDFF] disabled:opacity-50"
                      title="Fine-tune the size, scale, position, and crop of the hero portrait"
                    >
                      <Sliders className="h-3 w-3 text-[#00BDFF]" />
                      <span>Adjust Size &amp; Position</span>
                    </button>

                    {/* Restore Previous Image Button */}
                    {hasHeroPortraitBackup && (
                      <button
                        type="button"
                        disabled={isUploading || isRestoring}
                        onClick={handleRestore}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 bg-obsidian/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cream shadow-lg backdrop-blur-md transition-all hover:border-[#DF00FF] hover:text-[#DF00FF] disabled:opacity-50"
                        title="Restore the previous portrait image exactly as it was"
                      >
                        {isRestoring ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-[#DF00FF]" />
                            <span>Restoring...</span>
                          </>
                        ) : (
                          <>
                            <Undo2 className="h-3 w-3 text-[#DF00FF]" />
                            <span>Restore Previous Image</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Processing Status Indicator */}
                  {isUploading && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00BDFF]/40 bg-obsidian/95 px-3 py-1 text-[10px] font-medium text-[#00BDFF] shadow-lg backdrop-blur-md animate-pulse">
                      <Sparkles className="h-3 w-3 text-[#DF00FF]" />
                      <span>Removing background automatically with AI...</span>
                    </div>
                  )}

                  {/* Success Message Banner */}
                  {successMessage && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-obsidian/95 px-3 py-1 text-[10px] font-medium text-emerald-400 shadow-lg backdrop-blur-md">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* Error Message Banner */}
                  {errorMessage && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-obsidian/95 px-3 py-1 text-[10px] font-medium text-rose-300 shadow-lg backdrop-blur-md">
                      <AlertCircle className="h-3 w-3 text-rose-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Upload portrait photo"
                />
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ABOUT SECTION VARIANT (4:5 Studio Frame)
  const rotateY = reducedMotion ? 0 : (motionValues?.rotateY ?? pointer.x * 8);
  const rotateX = reducedMotion ? 0 : (motionValues?.rotateX ?? -pointer.y * 8);

  return (
    <div className="perspective-1600 relative mx-auto w-full max-w-[430px] select-none">
      <div
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-r from-[#DF00FF]/20 to-[#00BDFF]/20 blur-2xl"
        aria-hidden="true"
      />

      <motion.div
        style={{
          rotateY,
          rotateX,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 22 }}
        className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-obsidian/15 bg-obsidian shadow-studio"
      >
        <img
          src={activeSrc}
          alt="NAYEMUL ISLAM — Brand Identity Designer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-obsidian/85 to-transparent px-4 py-3 text-[10px] font-bold uppercase tracking-editorial text-cream/90">
          <span>NAYEMUL ISLAM</span>
          <span className="text-[#ffd8be]">BRAND IDENTITY</span>
        </div>

        {isOwnerMode && (
          <>
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-95">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Change portrait photo"
                className="inline-flex items-center gap-1 rounded-lg border border-cream/20 bg-obsidian/85 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cream backdrop-blur-md hover:border-[#7ee2ff] hover:text-[#7ee2ff]"
              >
                <CheckCircle2 className="h-3 w-3 text-[#ffd8be]" />
                <span>{isUploading ? 'Uploading...' : 'Change Photo'}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload portrait photo for preview"
            />
          </>
        )}
      </motion.div>
    </div>
  );
};
