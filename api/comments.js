import { getProjectComments, addProjectComment, escapeHtml } from './_storage.js';

// In-memory rate limiting and spam protection
const ipCommentTimestamps = new Map();
const recentCommentFingerprints = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_COMMENTS_PER_WINDOW = 4;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'local';

  // 1. GET COMMENTS FOR A SPECIFIC PROJECT
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const projectId = (url.searchParams.get('projectId') || '').trim();

      if (!projectId) {
        return res.status(400).json({ ok: false, error: 'projectId is required' });
      }

      const comments = await getProjectComments(projectId);
      return res.status(200).json({ ok: true, comments });
    } catch (err) {
      console.error('Error fetching comments:', err);
      return res.status(500).json({ ok: false, error: 'Failed to fetch comments' });
    }
  }

  // 2. POST A NEW COMMENT
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

      // Anti-Bot Honeypot Trap
      if (body.honeypot && String(body.honeypot).trim() !== '') {
        return res.status(400).json({ ok: false, error: 'Spam submission rejected.' });
      }

      const projectId = (body.projectId || '').trim();
      const authorName = (body.authorName || '').trim();
      const content = (body.content || '').trim();

      // Field Validations
      if (!projectId || projectId.length < 2) {
        return res.status(400).json({ ok: false, error: 'Invalid project identifier.' });
      }

      if (!authorName || authorName.length < 2 || authorName.length > 60) {
        return res.status(400).json({
          ok: false,
          error: 'Please enter your name (2 to 60 characters).',
        });
      }

      if (!content || content.length < 3 || content.length > 1000) {
        return res.status(400).json({
          ok: false,
          error: 'Comment must be between 3 and 1000 characters.',
        });
      }

      // Rate Limiting Protection (Max 4 comments per 5 minutes per IP)
      const now = Date.now();
      const timestamps = (ipCommentTimestamps.get(clientIp) || []).filter(
        (ts) => now - ts < RATE_LIMIT_WINDOW_MS
      );

      if (timestamps.length >= MAX_COMMENTS_PER_WINDOW) {
        return res.status(429).json({
          ok: false,
          error: 'Too many comments submitted recently. Please wait a few minutes before trying again.',
        });
      }

      // Duplicate Comment Protection (Cooldown for identical author + message within 60s)
      const fingerprint = `${projectId}::${authorName.toLowerCase()}::${content.toLowerCase()}`;
      const lastDuplicateAt = recentCommentFingerprints.get(fingerprint) || 0;
      if (now - lastDuplicateAt < 60 * 1000) {
        return res.status(429).json({
          ok: false,
          error: 'Duplicate comment detected. You have already posted this feedback.',
        });
      }

      // Update rate-limiting memory
      ipCommentTimestamps.set(clientIp, [...timestamps, now]);
      recentCommentFingerprints.set(fingerprint, now);

      // Create new clean, XSS-protected comment
      const newComment = {
        id: `c_${now}_${Math.random().toString(36).substring(2, 8)}`,
        projectId,
        authorName: escapeHtml(authorName),
        content: escapeHtml(content),
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

      const saved = await addProjectComment(projectId, newComment);

      return res.status(201).json({
        ok: true,
        message: 'Comment posted successfully.',
        comment: saved || newComment,
      });
    } catch (err) {
      console.error('Error posting comment:', err);
      return res.status(500).json({ ok: false, error: 'Failed to post comment.' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
