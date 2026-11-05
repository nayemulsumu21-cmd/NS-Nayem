import React, { useState } from 'react';
import {
  getResponsiveImageSources,
  ImageDisplayMode,
} from '../utils/responsiveImage';

export interface ResponsiveProjectImageProps {
  src: string;
  alt: string;
  mode?: ImageDisplayMode;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * ResponsiveProjectImage ensures every project image renders at its highest
 * possible clarity, utilizing appropriately sized WebP and AVIF variants
 * generated with Lanczos-3 resampling and 4:4:4 chroma subsampling.
 *
 * Automatically falls back to the original source on any loading issue.
 */
export const ResponsiveProjectImage: React.FC<ResponsiveProjectImageProps> = ({
  src,
  alt,
  mode = 'thumbnail',
  className = '',
  style,
  loading = 'lazy',
  decoding = 'async',
  onClick,
  onLoad,
}) => {
  const [hasError, setHasError] = useState(false);
  const info = getResponsiveImageSources(src, mode);

  // Direct render for SVGs or unindexed/fallback files
  if (info.isSvg || hasError || (!info.webpSrcSet && !info.fallbackSrcSet)) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onClick={onClick}
        onLoad={onLoad}
        style={style}
        className={`project-image-high-res ${className}`}
      />
    );
  }

  return (
    <picture className="contents">
      {info.avifSrcSet && (
        <source
          type="image/avif"
          srcSet={info.avifSrcSet}
          sizes={info.sizes}
        />
      )}
      {info.webpSrcSet && (
        <source
          type="image/webp"
          srcSet={info.webpSrcSet}
          sizes={info.sizes}
        />
      )}
      {info.fallbackSrcSet && (
        <source
          type={info.src.endsWith('.png') ? 'image/png' : 'image/jpeg'}
          srcSet={info.fallbackSrcSet}
          sizes={info.sizes}
        />
      )}
      <img
        src={info.src}
        srcSet={info.fallbackSrcSet || info.webpSrcSet}
        sizes={info.sizes}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onClick={onClick}
        onLoad={onLoad}
        onError={() => setHasError(true)}
        style={style}
        className={`project-image-high-res ${className}`}
      />
    </picture>
  );
};
