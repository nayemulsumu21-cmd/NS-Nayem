import React, { useLayoutEffect, useRef, useState } from 'react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';

interface ProfilePhotoProps {
  /** Extra classes for the image wrapper (shape/size are controlled by the parent container) */
  className?: string;
}

/**
 * Renders the owner's uploaded profile portrait (same crop as the header avatar).
 * Never renders initials: while the image decodes, a neutral dark shimmer is shown.
 */
export const ProfilePhoto: React.FC<ProfilePhotoProps> = ({ className = '' }) => {
  const { siteConfig } = usePortfolioCMS();
  const { imageUrl, zoom, offsetX, offsetY } = siteConfig.headerAvatar;
  const src =
    imageUrl ||
    siteConfig.portraits.heroPortraitPath ||
    '/images/profile/hero-portrait.png';
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    const el = imgRef.current;
    setLoaded(!!el && el.complete && el.naturalWidth > 0);
  }, [src]);

  return (
    <span
      className={`relative block h-full w-full overflow-hidden bg-charcoal ${className}`}
    >
      {!loaded && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#2a2236] to-[#16131f]"
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={siteConfig.name}
        {...({ fetchpriority: 'high' } as Record<string, string>)}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        style={{
          transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`,
          opacity: loaded ? 1 : 0,
        }}
        className="h-full w-full object-cover object-top transition-opacity duration-200"
      />
    </span>
  );
};
