import { getProfileViews, incrementProfileViews } from './_storage.js';

// In-memory rate limiting and duplicate prevention for views (15-minute cooldown per session/IP)
const recentVisitFingerprints = new Map();
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

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

  // Clean old fingerprints
  const now = Date.now();
  for (const [key, timestamp] of recentVisitFingerprints.entries()) {
    if (now - timestamp > COOLDOWN_MS) {
      recentVisitFingerprints.delete(key);
    }
  }

  try {
    if (req.method === 'GET') {
      const views = await getProfileViews();
      return res.status(200).json({ ok: true, views });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const clientIp =
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        'local';
      const sessionId = body.sessionId || body.session || '';

      // Generate fingerprint based on IP or Session ID
      const fingerprint = sessionId ? `sess:${sessionId}` : `ip:${clientIp}`;
      const lastVisitAt = recentVisitFingerprints.get(fingerprint) || 0;

      // Duplicate protection: if visit occurred within cooldown, do not count as a new website opening
      if (now - lastVisitAt < COOLDOWN_MS) {
        const currentViews = await getProfileViews();
        return res.status(200).json({
          ok: true,
          views: currentViews,
          incremented: false,
          message: 'Session visit already recorded.',
        });
      }

      // Record this genuine new website visit
      recentVisitFingerprints.set(fingerprint, now);
      const nextViews = await incrementProfileViews();

      return res.status(200).json({
        ok: true,
        views: nextViews,
        incremented: true,
      });
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Views handler error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to process views' });
  }
}
