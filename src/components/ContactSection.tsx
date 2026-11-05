import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  ArrowUpRight,
  Copy,
  Check,
  Sparkles,
  Send,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { usePortfolioCMS } from '../context/PortfolioCMSContext';
import { ProfilePhoto } from './ProfilePhoto';
import { OwnerEditButton } from './OwnerEditButton';

interface FieldErrors {
  clientName?: string;
  clientEmail?: string;
  projectMessage?: string;
}

export const ContactSection: React.FC = () => {
  const { siteConfig, isOwnerMode, openCMS, updateSiteConfig } =
    usePortfolioCMS();
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Inquiry Form State
  const [selectedService, setSelectedService] = useState<string>(
    siteConfig.services[0]?.title || 'Logo Design'
  );
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [inquirySubject, setInquirySubject] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [projectMessage, setProjectMessage] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>('');

  // Submission & Validation State
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [submittedSummary, setSubmittedSummary] = useState<{
    clientName: string;
    clientEmail: string;
    subject: string;
    submittedAt: string;
  } | null>(null);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(siteConfig.contact.emailPlaceholder);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2400);
    } catch {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2400);
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const trimmedName = clientName.trim();
    const trimmedEmail = clientEmail.trim();
    const trimmedMessage = projectMessage.trim();

    if (!trimmedName || trimmedName.length < 2) {
      errors.clientName = 'Please enter your full name.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      errors.clientEmail = 'Please enter a valid email address so I can reply to you.';
    }

    if (!trimmedMessage || trimmedMessage.length < 10) {
      errors.projectMessage =
        'Please share your project details (at least 10 characters).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions while a request is already in flight
    if (isSubmitting) return;

    setSubmitStatus('idle');
    setStatusMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const effectiveSubject = inquirySubject.trim()
      ? `${selectedService} — ${inquirySubject.trim()}`
      : selectedService;

    try {
      const response = await fetch('/__cms/email/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          service: selectedService,
          subject: effectiveSubject,
          budget: budget.trim() || undefined,
          message: projectMessage.trim(),
          honeypot,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        const errorText =
          data?.error ||
          'Unable to send your inquiry right now. Please check your connection or try again shortly.';
        setSubmitStatus('error');
        setStatusMessage(errorText);
        setIsSubmitting(false);
        return;
      }

      // Only show success after the backend confirms email delivery
      setSubmitStatus('success');
      setStatusMessage(
        data.message ||
          "Thank you for reaching out! Your inquiry has been submitted successfully. I'll get back to you as soon as possible."
      );
      setSubmittedSummary({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        subject: effectiveSubject,
        submittedAt:
          data.inquiry?.submittedAtFormatted || new Date().toLocaleString(),
      });

      // Reset form inputs after verified delivery
      setClientName('');
      setClientEmail('');
      setInquirySubject('');
      setBudget('');
      setProjectMessage('');
      setFieldErrors({});
    } catch {
      setSubmitStatus('error');
      setStatusMessage(
        'Network error while sending your inquiry. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer
      id="contact"
      className="relative overflow-hidden border-t border-cream/10 bg-obsidian pt-24 pb-14 text-cream studio-grid-dark lg:pt-32"
    >
      {/* Portrait-Matched Ambient Spotlight */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-[#5c4577]/20 blur-[160px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Heading, Availability, Email & Social Links (7 Columns) */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Freelance Availability Indicator */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 rounded-full border border-[#7ca6e8]/40 bg-charcoal px-4 py-1.5"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ca6e8] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#7ca6e8]" />
                </span>
                <span className="font-display text-xs font-bold uppercase tracking-widest text-[#f1b39c]">
                  {siteConfig.availability}
                </span>
              </motion.div>

              {isOwnerMode && (
                <button
                  type="button"
                  onClick={() => openCMS('contact')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cream/15 bg-charcoal px-3.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#7ca6e8] transition hover:border-[#7ca6e8]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Contact &amp; Gmail</span>
                </button>
              )}
            </div>

            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-6 flex items-start gap-3"
            >
              <h2 className="font-display text-4xl font-extrabold uppercase leading-[1.02] tracking-tight text-cream sm:text-6xl">
                {siteConfig.contact.heading}
              </h2>
              <OwnerEditButton
                title="Contact Heading"
                value={siteConfig.contact.heading}
                onSave={(val) =>
                  updateSiteConfig((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, heading: val },
                  }))
                }
              />
            </motion.div>

            {/* Supporting Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.14 }}
              className="mt-4 flex flex-col items-start gap-1"
            >
              <p className="max-w-xl text-lg leading-relaxed text-cream/80">
                {siteConfig.contact.supportingText}
              </p>
              <OwnerEditButton
                title="Contact Supporting Text"
                value={siteConfig.contact.supportingText}
                multiline
                onSave={(val) =>
                  updateSiteConfig((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, supportingText: val },
                  }))
                }
              />
            </motion.div>

            {/* Direct Contact Button + Email Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center"
            >
              <a
                href={`mailto:${siteConfig.contact.emailPlaceholder}`}
                className="group inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-7 py-4 font-display text-xs font-bold uppercase tracking-widest text-white shadow-[0_8px_25px_rgba(223,0,255,0.35)] transition hover:-translate-y-0.5 hover:brightness-110"
              >
                <Mail className="h-4 w-4" />
                <span>START A CONVERSATION</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-cream/15 bg-charcoal px-4 py-3">
                <span className="font-mono text-sm text-cream">
                  {siteConfig.contact.emailPlaceholder}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    aria-label="Copy email address"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream/15 bg-obsidian text-cream transition hover:border-[#7ca6e8] hover:text-[#7ca6e8]"
                  >
                    {copiedEmail ? (
                      <Check className="h-4 w-4 text-[#f1b39c]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <OwnerEditButton
                    title="Direct Contact Email"
                    value={siteConfig.contact.emailPlaceholder}
                    onSave={(val) =>
                      updateSiteConfig((prev) => ({
                        ...prev,
                        contact: { ...prev.contact, emailPlaceholder: val },
                      }))
                    }
                  />
                </div>
              </div>
            </motion.div>

            {/* Social Media Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
            >
              {siteConfig.contact.socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  onClick={(e) => {
                    if (social.url.startsWith('#')) {
                      e.preventDefault();
                      openCMS('contact');
                    }
                  }}
                  className="group flex items-center justify-between rounded-xl border border-cream/12 bg-charcoal/80 px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#7ca6e8] hover:bg-charcoal"
                >
                  <div>
                    <p className="font-display text-xs font-extrabold uppercase tracking-wider text-cream group-hover:text-[#f1b39c]">
                      {social.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone">
                      {social.handlePlaceholder}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-stone transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#7ca6e8]" />
                </a>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Connected Gmail Project Inquiry Form (5 Columns) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.18 }}
            className="lg:col-span-5"
          >
            <form
              onSubmit={handleSendInquiry}
              noValidate
              className="rounded-3xl border border-cream/15 bg-charcoal/90 p-6 shadow-studio backdrop-blur-xl sm:p-8"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-editorial text-[#f1b39c]">
                  <Sparkles className="h-4 w-4 text-[#7ca6e8]" />
                  <span>PROJECT INQUIRY</span>
                </div>
                {isOwnerMode && (
                  <button
                    type="button"
                    onClick={() => openCMS('contact')}
                    className="inline-flex items-center gap-1 rounded-lg border border-cream/15 bg-obsidian px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7ca6e8] transition hover:border-[#7ca6e8]"
                    title="Configure Gmail Delivery"
                  >
                    <Settings className="h-3 w-3" />
                    <span>Gmail Settings</span>
                  </button>
                )}
              </div>

              <h3 className="mt-2 font-display text-xl font-extrabold uppercase text-cream">
                SELECT A SERVICE
              </h3>

              {/* Service Selector Pills */}
              <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {siteConfig.services.map((srv) => {
                  const active = selectedService === srv.title;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setSelectedService(srv.title)}
                      className={`rounded-xl border px-3 py-2.5 font-display text-[11px] font-bold uppercase tracking-wider transition ${
                        active
                          ? 'border-[#00BDFF] bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] text-white shadow-[0_4px_16px_rgba(223,0,255,0.35)]'
                          : 'border-cream/15 bg-obsidian text-cream/85 hover:border-[#00BDFF]/60'
                      }`}
                    >
                      {srv.title}
                    </button>
                  );
                })}
              </div>

              {/* Honeypot anti-spam field (hidden from real users) */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="inquiry-company-website">Website</label>
                <input
                  id="inquiry-company-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {/* Client Full Name & Client Email */}
              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="inquiry-client-name"
                    className="block font-display text-[11px] font-bold uppercase tracking-wider text-cream/80"
                  >
                    YOUR NAME <span className="text-[#f1b39c]">*</span>
                  </label>
                  <input
                    id="inquiry-client-name"
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (fieldErrors.clientName) {
                        setFieldErrors((prev) => ({ ...prev, clientName: undefined }));
                      }
                    }}
                    placeholder="John Doe"
                    className={`mt-1.5 w-full rounded-xl border bg-obsidian px-3.5 py-2.5 text-sm text-cream placeholder:text-stone/70 focus:outline-none ${
                      fieldErrors.clientName
                        ? 'border-red-400/80 focus:border-red-400'
                        : 'border-cream/15 focus:border-[#7ca6e8]'
                    }`}
                  />
                  {fieldErrors.clientName && (
                    <p className="mt-1 text-[11px] font-medium text-red-300">
                      {fieldErrors.clientName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="inquiry-client-email"
                    className="block font-display text-[11px] font-bold uppercase tracking-wider text-cream/80"
                  >
                    YOUR EMAIL <span className="text-[#f1b39c]">*</span>
                  </label>
                  <input
                    id="inquiry-client-email"
                    type="email"
                    required
                    disabled={isSubmitting}
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      if (fieldErrors.clientEmail) {
                        setFieldErrors((prev) => ({ ...prev, clientEmail: undefined }));
                      }
                    }}
                    placeholder="john@example.com"
                    className={`mt-1.5 w-full rounded-xl border bg-obsidian px-3.5 py-2.5 text-sm text-cream placeholder:text-stone/70 focus:outline-none ${
                      fieldErrors.clientEmail
                        ? 'border-red-400/80 focus:border-red-400'
                        : 'border-cream/15 focus:border-[#7ca6e8]'
                    }`}
                  />
                  {fieldErrors.clientEmail && (
                    <p className="mt-1 text-[11px] font-medium text-red-300">
                      {fieldErrors.clientEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Inquiry Subject / Brand Name & Estimated Budget */}
              <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="inquiry-subject-input"
                    className="block font-display text-[11px] font-bold uppercase tracking-wider text-cream/80"
                  >
                    SUBJECT / BRAND NAME
                  </label>
                  <input
                    id="inquiry-subject-input"
                    type="text"
                    disabled={isSubmitting}
                    value={inquirySubject}
                    onChange={(e) => setInquirySubject(e.target.value)}
                    placeholder={`e.g. ${selectedService} for Acme`}
                    className="mt-1.5 w-full rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2.5 text-sm text-cream placeholder:text-stone/70 focus:border-[#7ca6e8] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inquiry-budget-input"
                    className="block font-display text-[11px] font-bold uppercase tracking-wider text-cream/80"
                  >
                    BUDGET / TIMELINE (OPTIONAL)
                  </label>
                  <input
                    id="inquiry-budget-input"
                    type="text"
                    disabled={isSubmitting}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. $1,500 • 3 Weeks"
                    className="mt-1.5 w-full rounded-xl border border-cream/15 bg-obsidian px-3.5 py-2.5 text-sm text-cream placeholder:text-stone/70 focus:border-[#7ca6e8] focus:outline-none"
                  />
                </div>
              </div>

              {/* Project Overview / Details */}
              <div className="mt-3.5">
                <label
                  htmlFor="project-brief-input"
                  className="block font-display text-[11px] font-bold uppercase tracking-wider text-cream/80"
                >
                  PROJECT OVERVIEW <span className="text-[#f1b39c]">*</span>
                </label>
                <textarea
                  id="project-brief-input"
                  rows={4}
                  required
                  disabled={isSubmitting}
                  value={projectMessage}
                  onChange={(e) => {
                    setProjectMessage(e.target.value);
                    if (fieldErrors.projectMessage) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        projectMessage: undefined,
                      }));
                    }
                  }}
                  placeholder={`Tell ${siteConfig.name} about your brand, deliverables, and design goals...`}
                  className={`mt-1.5 w-full rounded-xl border bg-obsidian px-4 py-3 text-sm text-cream placeholder:text-stone/70 focus:outline-none ${
                    fieldErrors.projectMessage
                      ? 'border-red-400/80 focus:border-red-400'
                      : 'border-cream/15 focus:border-[#7ca6e8]'
                  }`}
                />
                {fieldErrors.projectMessage && (
                  <p className="mt-1 text-[11px] font-medium text-red-300">
                    {fieldErrors.projectMessage}
                  </p>
                )}
              </div>

              {/* Verified Feedback Banner (Success or Error) */}
              <AnimatePresence mode="wait">
                {submitStatus === 'success' && (
                  <motion.div
                    key="inquiry-success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 rounded-2xl border border-emerald-400/35 bg-emerald-950/40 p-4 text-xs text-emerald-100"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <div className="space-y-1">
                        <p className="font-display text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Inquiry Delivered to Gmail
                        </p>
                        <p className="leading-relaxed text-cream/90">
                          {statusMessage}
                        </p>
                        {submittedSummary && (
                          <p className="pt-1 text-[11px] text-emerald-300/80">
                            Reply-To: <span className="font-mono">{submittedSummary.clientEmail}</span> &bull;{' '}
                            {submittedSummary.submittedAt}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {submitStatus === 'error' && (
                  <motion.div
                    key="inquiry-error"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 rounded-2xl border border-red-400/40 bg-red-950/40 p-4 text-xs text-red-100"
                    role="alert"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <div className="space-y-2">
                        <p className="font-display text-xs font-bold uppercase tracking-wider text-red-300">
                          Delivery Issue
                        </p>
                        <p className="leading-relaxed text-red-100/90">
                          {statusMessage}
                        </p>
                        {isOwnerMode && (
                          <button
                            type="button"
                            onClick={() => openCMS('contact')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300/40 bg-obsidian/80 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-[#f1b39c] transition hover:border-[#f1b39c]"
                          >
                            <Settings className="h-3 w-3" />
                            <span>Open Gmail Delivery Settings</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-6 py-4 font-display text-xs font-bold uppercase tracking-widest text-white shadow-[0_8px_25px_rgba(223,0,255,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>SENDING INQUIRY...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>SEND INQUIRY</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Bottom Copyright & Brand Signature Bar */}
        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-cream/10 pt-8 text-xs text-stone sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#7ca6e8]/40 bg-charcoal">
              <ProfilePhoto />
            </span>
            <span className="font-display font-bold uppercase tracking-wider text-cream">
              {siteConfig.name} &mdash; {siteConfig.title}
            </span>
          </div>

          <p className="text-center sm:text-right">
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
