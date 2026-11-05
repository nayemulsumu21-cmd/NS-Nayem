import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  driftX: number;
  swingPhase: number;
  swingSpeed: number;
  swingAmplitude: number;
  alpha: number;
  alphaPulseSpeed: number;
  alphaPhase: number;
  isGlowing: boolean;
  tone: 'orchid' | 'amber' | 'sky';
}

export const FallingParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const getParticleCount = (w: number) => {
      if (w < 640) return 34;
      if (w < 1024) return 56;
      return 86;
    };

    const tones: Particle['tone'][] = ['orchid', 'amber', 'sky'];

    const createParticle = (initialRandomY = true): Particle => {
      const isGlowing = Math.random() < 0.28;
      const tone = tones[Math.floor(Math.random() * tones.length)];
      return {
        x: Math.random() * width,
        y: initialRandomY ? Math.random() * height : -12 - Math.random() * 40,
        radius: isGlowing
          ? 1.5 + Math.random() * 1.8
          : 0.75 + Math.random() * 1.3,
        speedY: 0.24 + Math.random() * 0.58,
        driftX: (Math.random() - 0.5) * 0.16,
        swingPhase: Math.random() * Math.PI * 2,
        swingSpeed: 0.006 + Math.random() * 0.013,
        swingAmplitude: 0.12 + Math.random() * 0.3,
        alpha: isGlowing
          ? 0.4 + Math.random() * 0.34
          : 0.18 + Math.random() * 0.3,
        alphaPulseSpeed: 0.01 + Math.random() * 0.018,
        alphaPhase: Math.random() * Math.PI * 2,
        isGlowing,
        tone,
      };
    };

    let particles: Particle[] = Array.from(
      { length: getParticleCount(width) },
      () => createParticle(true)
    );

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const targetCount = getParticleCount(width);
      if (particles.length < targetCount) {
        const extra = Array.from(
          { length: targetCount - particles.length },
          () => createParticle(true)
        );
        particles = [...particles, ...extra];
      } else if (particles.length > targetCount) {
        particles = particles.slice(0, targetCount);
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!shouldReduceMotion) {
          p.y += p.speedY;
          p.swingPhase += p.swingSpeed;
          p.alphaPhase += p.alphaPulseSpeed;
          p.x += p.driftX + Math.sin(p.swingPhase) * p.swingAmplitude;

          if (p.y > height + 16) {
            p.y = -12;
            p.x = Math.random() * width;
          }
          if (p.x > width + 16) p.x = -12;
          if (p.x < -16) p.x = width + 12;
        }

        const currentAlpha = Math.max(
          0.1,
          Math.min(0.82, p.alpha + Math.sin(p.alphaPhase) * 0.12)
        );

        // Portrait-matched particle colors: Orchid (#B86BD4), Rose-Amber (#F1B39C), Periwinkle Sky (#7CA6E8)
        let rgb = '184, 107, 212';
        if (p.tone === 'amber') rgb = '241, 179, 156';
        if (p.tone === 'sky') rgb = '124, 166, 232';

        if (p.isGlowing) {
          const glowRadius = p.radius * 4.0;
          const grad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            glowRadius
          );
          grad.addColorStop(0, `rgba(${rgb}, ${currentAlpha})`);
          grad.addColorStop(0.42, `rgba(${rgb}, ${currentAlpha * 0.34})`);
          grad.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${rgb}, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!shouldReduceMotion) {
        animationFrameId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [shouldReduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[4] h-full w-full"
    />
  );
};
