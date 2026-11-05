import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { login } = usePortfolioCMS();

  const [username, setUsername] = useState('nayemul21');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setPassword('');
      setUsername('nayemul21');
      setTimeout(() => {
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        } else {
          usernameInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage('');
    setSuccessMessage('');

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setErrorMessage('Please enter your owner username.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your owner password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(trimmedUser, password);
      if (result.ok) {
        setSuccessMessage('Authenticated successfully! Welcome back, Nayemul.');
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setErrorMessage(
          result.error || 'Invalid owner username or password.'
        );
      }
    } catch {
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-login-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-obsidian/85 backdrop-blur-md"
          />

          {/* Modal Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-cream/15 bg-[#12101b] p-6 shadow-2xl text-cream sm:p-7"
          >
            {/* Top Gradient Accent Line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#DF00FF] to-[#00BDFF]" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Login Window"
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-cream/10 bg-charcoal/70 text-cream/70 transition hover:border-cream/30 hover:text-cream"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header Badge & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00BDFF]/40 bg-[#181528] shadow-sm text-[#00BDFF]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-display text-[10px] font-extrabold uppercase tracking-widest text-[#ffd8be]">
                  PORTFOLIO SECURITY
                </span>
                <h2
                  id="owner-login-title"
                  className="font-display text-lg font-bold uppercase tracking-wider text-cream"
                >
                  Owner Authentication
                </h2>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-cream/70">
              Secure owner-only portal. Enter your owner credentials to access
              Owner Mode and administrative editing tools.
            </p>

            {/* Error Message Alert */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#FF3366]/40 bg-[#280c18] p-3 text-xs text-[#ffccd8]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-[#FF3366] mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </motion.div>
            )}

            {/* Success Message Alert */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-3 text-xs text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="owner-username"
                  className="block font-display text-[11px] font-bold uppercase tracking-wider text-cream/80 mb-1.5"
                >
                  Owner Username
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-cream/40">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="owner-username"
                    ref={usernameInputRef}
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nayemul21"
                    className="w-full rounded-xl border border-cream/15 bg-obsidian/90 py-2.5 pl-10 pr-3.5 text-xs text-cream placeholder-cream/35 transition focus:border-[#00BDFF] focus:outline-none focus:ring-1 focus:ring-[#00BDFF]"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="owner-password"
                  className="block font-display text-[11px] font-bold uppercase tracking-wider text-cream/80 mb-1.5"
                >
                  Owner Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-cream/40">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="owner-password"
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter owner password"
                    className="w-full rounded-xl border border-cream/15 bg-obsidian/90 py-2.5 pl-10 pr-10 text-xs text-cream placeholder-cream/35 transition focus:border-[#00BDFF] focus:outline-none focus:ring-1 focus:ring-[#00BDFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-cream/40 transition hover:text-cream"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] py-3 font-display text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_8px_24px_rgba(223,0,255,0.35)] transition-all duration-300 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AUTHENTICATING...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span>LOG IN</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 border-t border-cream/10 pt-3 text-center">
              <span className="text-[10px] tracking-wider text-cream/40 uppercase">
                Owner Session &bull; HttpOnly Cookie &bull; Rate-Limited Protection
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
