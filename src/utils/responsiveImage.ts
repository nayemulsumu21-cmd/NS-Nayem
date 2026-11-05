import imageManifest from '../data/image-manifest.json';

export interface ResponsiveImageSource {
  src: string;
  avifSrcSet?: string;
  webpSrcSet?: string;
  fallbackSrcSet?: string;
  sizes: string;
  origWidth?: number;
  origHeight?: number;
  aspectRatio?: number;
  isSvg: boolean;
}

export type ImageDisplayMode = 'thumbnail' | 'detail' | 'fullscreen' | 'avatar';

/**
 * Returns high-resolution responsive image sources, AVIF/WebP srcSets,
 * and high-DPI display size rules for any project image.
 */
export function getResponsiveImageSources(
  originalUrl: string,
  mode: ImageDisplayMode = 'thumbnail'
): ResponsiveImageSource {
  if (!originalUrl) {
    return { src: '', sizes: '100vw', isSvg: false };
  }

  // 1. Vector graphics (SVG) maintain infinite native resolution
  const isSvg = /\.svg(\?.*)?$/i.test(originalUrl);
  if (isSvg) {
    return {
      src: originalUrl,
      sizes: '100vw',
      isSvg: true,
    };
  }

  // 2. Extract relative path or filename
  const cleanUrl = originalUrl.split('?')[0];
  const filename = cleanUrl.split('/').pop() || '';
  const parsed = filename.replace(/\.[^/.]+$/, '');
  const extMatch = cleanUrl.match(/\.(jpg|jpeg|png|webp)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';
  const fallbackExt = ext === '.png' ? '.png' : '.jpg';

  const entry = (imageManifest as Record<string, any>)[filename];

  // Default responsive sizes based on display location
  let sizes = '(max-width: 1440px) 100vw, 1440px';
  if (mode === 'thumbnail') {
    // 5-col on 1200px+ (~280px), 4-col on lg (~320px), 2-col on sm (~360px), 1-col on mobile (100vw)
    sizes =
      '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 25vw, 360px';
  } else if (mode === 'avatar') {
    sizes = '96px';
  } else if (mode === 'fullscreen') {
    sizes = '100vw';
  }

  if (!entry || !entry.widths || !entry.widths.length) {
    return {
      src: originalUrl,
      sizes,
      isSvg: false,
    };
  }

  const widths: number[] = entry.widths;

  // AVIF variant for thumbnails and medium sizes (superb compression & color fidelity)
  const avifSrcSet = widths
    .filter((w) => w <= 1200)
    .map((w) => `/images/optimized/${parsed}-${w}.avif ${w}w`)
    .join(', ');

  // WebP variant for all sizes (wide browser support, crisp Lanczos-3 resampling)
  const webpSrcSet = widths
    .map((w) => `/images/optimized/${parsed}-${w}.webp ${w}w`)
    .join(', ');

  // Fallback JPEG/PNG with 4:4:4 chroma subsampling for 100% color and text clarity
  const fallbackSrcSet = widths
    .map((w) => `/images/optimized/${parsed}-${w}${fallbackExt} ${w}w`)
    .join(', ');

  return {
    src: originalUrl,
    avifSrcSet: avifSrcSet || undefined,
    webpSrcSet: webpSrcSet || undefined,
    fallbackSrcSet: fallbackSrcSet || undefined,
    sizes,
    origWidth: entry.origWidth,
    origHeight: entry.origHeight,
    aspectRatio: entry.aspectRatio,
    isSvg: false,
  };
}
