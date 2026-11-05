import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Check, Loader2 } from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';

export const QuickEditModal: React.FC = () => {
  const { quickEditConfig, closeQuickEdit, isOwnerMode } = usePortfolioCMS();
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (quickEditConfig) {
      setDraft(quickEditConfig.value ?? '');
      setIsSaving(false);
    }
  }, [quickEditConfig]);

  if (!isOwnerMode || !quickEditConfig) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await quickEditConfig.onSave(draft);
      closeQuickEdit();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-edit-title"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeQuickEdit}
          className="fixed inset-0 bg-obsidian/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-cream/20 bg-[#161324] shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cream/10 bg-[#1b172d] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DF00FF]/40 bg-[#DF00FF]/15 text-[#ffd8be]">
                <Pencil className="h-3.5 w-3.5" />
              </span>
              <div>
                <h3
                  id="quick-edit-title"
                  className="font-display text-sm font-extrabold uppercase tracking-wide text-cream"
                >
                  {quickEditConfig.title}
                </h3>
                {quickEditConfig.description && (
                  <p className="text-[11px] text-cream/60">
                    {quickEditConfig.description}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={closeQuickEdit}
              className="rounded-lg p-1.5 text-cream/60 transition hover:bg-cream/10 hover:text-cream"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-5">
            <div className="space-y-3">
              {quickEditConfig.multiline ? (
                <textarea
                  rows={5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-cream/15 bg-obsidian/90 p-3.5 font-sans text-sm text-cream shadow-inner placeholder-cream/40 focus:border-[#00BDFF] focus:outline-none focus:ring-1 focus:ring-[#00BDFF]"
                />
              ) : (
                <input
                  type={quickEditConfig.type || 'text'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-cream/15 bg-obsidian/90 px-3.5 py-2.5 font-sans text-sm text-cream shadow-inner placeholder-cream/40 focus:border-[#00BDFF] focus:outline-none focus:ring-1 focus:ring-[#00BDFF]"
                />
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-cream/10 pt-4">
              <button
                type="button"
                onClick={closeQuickEdit}
                className="rounded-xl border border-cream/15 bg-obsidian/80 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-cream/70 transition hover:bg-cream/10 hover:text-cream"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-5 py-2 font-display text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
