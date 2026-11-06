import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface CommentItem {
  id: string;
  projectId: string;
  authorName: string;
  content: string;
  createdAt: string;
  formattedDate?: string;
}

interface ProjectCommentsProps {
  projectId: string;
  projectTitle: string;
  onCommentsCountChange?: (count: number) => void;
}

export const ProjectComments: React.FC<ProjectCommentsProps> = ({
  projectId,
  projectTitle,
  onCommentsCountChange,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authorName, setAuthorName] = useState<string>(() => {
    try {
      return localStorage.getItem('nayemul_commenter_name') || '';
    } catch {
      return '';
    }
  });
  const [content, setContent] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch comments for this project
  const loadComments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/comments?projectId=${encodeURIComponent(projectId)}&t=${Date.now()}`);
      if (!res.ok) {
        throw new Error('Failed to load comments');
      }
      const data = await res.json();
      if (data && Array.isArray(data.comments)) {
        setComments(data.comments);
        if (onCommentsCountChange) {
          onCommentsCountChange(data.comments.length);
        }
      } else {
        setComments([]);
        if (onCommentsCountChange) {
          onCommentsCountChange(0);
        }
      }
    } catch (err) {
      console.warn('Could not fetch comments:', err);
      // Fallback empty list without crashing UI
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, onCommentsCountChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Handle new comment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Spam honeypot trap check
    if (honeypot.trim() !== '') {
      return;
    }

    const trimmedName = authorName.trim();
    const trimmedContent = content.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your name (at least 2 characters).');
      return;
    }

    if (trimmedName.length > 60) {
      setErrorMessage('Name cannot exceed 60 characters.');
      return;
    }

    if (!trimmedContent || trimmedContent.length < 3) {
      setErrorMessage('Please write a comment (at least 3 characters).');
      return;
    }

    if (trimmedContent.length > 1000) {
      setErrorMessage('Comment cannot exceed 1000 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          authorName: trimmedName,
          content: trimmedContent,
          honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Failed to post comment. Please try again.');
      }

      // Save author name locally for convenience
      try {
        localStorage.setItem('nayemul_commenter_name', trimmedName);
      } catch {}

      // Prepend newly created comment
      const newComment: CommentItem = data.comment || {
        id: `c_${Date.now()}`,
        projectId,
        authorName: trimmedName,
        content: trimmedContent,
        createdAt: new Date().toISOString(),
        formattedDate: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      };

      setComments((prev) => {
        const next = [newComment, ...prev];
        if (onCommentsCountChange) {
          onCommentsCountChange(next.length);
        }
        return next;
      });

      setContent('');
      setSuccessMessage('Thank you! Your comment has been posted.');

      // Clear success message after 5 seconds
      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit comment. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitial = (name: string) => {
    return (name || 'A').trim().charAt(0).toUpperCase();
  };

  return (
    <div id="project-comments-section" className="mt-14 scroll-mt-24 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#DF00FF]/20 to-[#00BDFF]/20 text-[#00BDFF] ring-1 ring-white/10">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-lg sm:text-xl font-extrabold uppercase tracking-wider text-white">
              Project Comments
            </h3>
            <p className="text-xs text-cream/60">
              Share your thoughts, feedback, or appreciation for{' '}
              <span className="text-[#00BDFF] font-medium">{projectTitle}</span>
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/15 bg-obsidian/80 px-3.5 py-1 text-xs font-bold text-cream">
          <Sparkles className="h-3 w-3 text-[#00BDFF]" />
          <span>{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</span>
        </span>
      </div>

      {/* Main Comment Box Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-3xl border border-cream/12 bg-[#13111c]/90 p-5 sm:p-7 shadow-[0_10px_35px_rgba(0,0,0,0.4)] backdrop-blur-xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Author Name */}
          <div className="col-span-1">
            <label
              htmlFor="comment-author-name"
              className="block font-display text-[11px] font-bold uppercase tracking-wider text-cream/80 mb-2"
            >
              Your Name <span className="text-[#DF00FF]">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-cream/40">
                <User className="h-4 w-4" />
              </div>
              <input
                id="comment-author-name"
                type="text"
                required
                maxLength={60}
                placeholder="e.g. Alex Morgan"
                value={authorName}
                onChange={(e) => {
                  setAuthorName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full rounded-xl border border-cream/15 bg-obsidian/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-cream/40 transition focus:border-[#00BDFF] focus:outline-none focus:ring-1 focus:ring-[#00BDFF]"
              />
            </div>
          </div>

          {/* Anti-spam Honeypot (Hidden from genuine visitors) */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website-trap">Leave this empty</label>
            <input
              id="website-trap"
              type="text"
              name="website_trap"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
        </div>

        {/* Comment Content */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="comment-content-text"
              className="font-display text-[11px] font-bold uppercase tracking-wider text-cream/80"
            >
              Your Comment <span className="text-[#DF00FF]">*</span>
            </label>
            <span className="text-[10px] text-cream/45 font-mono">
              {content.length}/1000
            </span>
          </div>
          <textarea
            id="comment-content-text"
            required
            rows={4}
            maxLength={1000}
            placeholder="Write your feedback, favorite design details, or design appreciation..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            className="w-full rounded-xl border border-cream/15 bg-obsidian/90 p-3.5 text-sm leading-relaxed text-white placeholder-cream/40 transition focus:border-[#00BDFF] focus:outline-none focus:ring-1 focus:ring-[#00BDFF]"
          />
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Submit Action */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-cream/50">
            Your comment will be saved and visible to other visitors.
          </p>

          <button
            type="submit"
            disabled={isSubmitting || !authorName.trim() || !content.trim()}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DF00FF] to-[#00BDFF] px-6 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(223,0,255,0.3)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:pointer-events-none disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                <span>Submit Comment</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-cream/50">
            <Loader2 className="h-6 w-6 animate-spin text-[#00BDFF]" />
            <span className="mt-2 text-xs font-medium">Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-cream/10 bg-[#13111c]/50 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-cream/40 ring-1 ring-white/10">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h4 className="mt-3 font-display text-sm font-bold uppercase tracking-wider text-white">
              No Comments Yet
            </h4>
            <p className="mt-1 max-w-sm text-xs text-cream/60">
              Be the first to share your thoughts, design critique, or appreciation for this project!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-start gap-4 rounded-2xl border border-cream/10 bg-[#13111c]/80 p-4 sm:p-5 transition hover:border-cream/20"
            >
              {/* Author Initial Avatar */}
              <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-br from-[#DF00FF] to-[#00BDFF] font-display text-sm font-black text-white shadow-md">
                {getInitial(comment.authorName)}
              </div>

              {/* Comment Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-display text-xs sm:text-sm font-extrabold text-white">
                    {comment.authorName}
                  </h4>
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-cream/50">
                    <Clock className="h-3 w-3 text-cream/40" />
                    <span>{comment.formattedDate || new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="mt-2 whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed text-cream/85">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
