import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SITE_CONFIG } from '../config/site';
import { ProfilePhoto } from './ProfilePhoto';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const shouldReduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (shouldReduceMotion) {
      setProgress(100);
      const t = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 150);
      return () => clearTimeout(t);
    }

    const duration = 950;
    const interval = 25;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsVisible(false);
            onComplete();
          }, 220);
          return 100;
        }
        return Math.min(100, Math.round(prev + step));
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete, shouldReduceMotion]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-obsidian px-6 py-10 text-cream studio-grid-dark"
          aria-label="Loading portfolio"
        >
          {/* Top bar */}
          <div className="flex w-full max-w-7xl items-center justify-between text-xs uppercase tracking-editorial text-stone">
            <span>{SITE_CONFIG.name.toUpperCase()}</span>
            <span>{SITE_CONFIG.title.toUpperCase()}</span>
          </div>

          {/* Center 3D Monogram Emblem */}
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.9, rotateY: -20, opacity: 0 }}
              animate={{ scale: 1, rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-gold/40 bg-charcoal/90 shadow-gold"
            >
              <div className="absolute inset-1.5 rounded-xl border border-cream/10" />
              <span className="absolute inset-1.5 block overflow-hidden rounded-xl">
                <ProfilePhoto />
              </span>
              <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-gold shadow-gold" />
            </motion.div>

            <div className="text-center">
              <p className="font-display text-lg font-bold tracking-widest text-cream">
                {SITE_CONFIG.name.toUpperCase()}
              </p>
              <p className="mt-1 text-xs uppercase tracking-editorial text-gold">
                {SITE_CONFIG.title}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-[2px] w-56 overflow-hidden bg-slate">
              <motion.div
                className="h-full bg-gold"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Bottom status */}
          <div className="flex w-full max-w-7xl items-center justify-between text-xs uppercase tracking-editorial text-stone">
            <span>STUDIO FOLIO</span>
            <span className="font-display text-gold">{progress}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
