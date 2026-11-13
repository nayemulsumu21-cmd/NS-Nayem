import {
  getProjectStatistics,
  recordProjectView,
  recordProjectAppreciation,
} from './_storage.js';

// In-memory rate limiting and duplicate prevention for views (15-minute cooldown per session/IP/project)
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
      const stats = await getProjectStatistics();
      return res.status(200).json({
        ok: true,
        projectViews: stats.projectViews,
        appreciations: stats.appreciations,
        views: stats.projectViews,
        byProject: stats.byProject,
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const clientIp =
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        'local';
      const sessionId = body.sessionId || body.session || '';
      const projectId = body.projectId || '';
      const action = body.action || (projectId ? 'view' : 'profile_view');

      // 1. GENUINE PROJECT VIEW RECORDING
      if (action === 'view' && projectId) {
        // Fingerprint per session/IP and project
        const fingerprint = sessionId
          ? `view:${sessionId}:${projectId}`
          : `view:${clientIp}:${projectId}`;
        const lastVisitAt = recentVisitFingerprints.get(fingerprint) || 0;

        // Duplicate protection: if this project was visited within cooldown, do not inflate view count
        if (now - lastVisitAt < COOLDOWN_MS) {
          const stats = await getProjectStatistics();
          return res.status(200).json({
            ok: true,
            incremented: false,
            message: 'Project view already recorded in this session.',
            projectViews: stats.projectViews,
            appreciations: stats.appreciations,
            views: stats.projectViews,
            byProject: stats.byProject,
          });
        }

        // Record this genuine new project view
        recentVisitFingerprints.set(fingerprint, now);
        const stats = await recordProjectView(projectId);

        return res.status(200).json({
          ok: true,
          incremented: true,
          projectViews: stats.projectViews,
          appreciations: stats.appreciations,
          views: stats.projectViews,
          byProject: stats.byProject,
        });
      }

      // 2. PROJECT APPRECIATION
      if (action === 'appreciate' && projectId) {
        const stats = await recordProjectAppreciation(projectId, 1);
        return res.status(200).json({
          ok: true,
          incremented: true,
          projectViews: stats.projectViews,
          appreciations: stats.appreciations,
          views: stats.projectViews,
          byProject: stats.byProject,
        });
      }

      // 3. PROJECT UN-APPRECIATION (UNDO)
      if (action === 'unappreciate' && projectId) {
        const stats = await recordProjectAppreciation(projectId, -1);
        return res.status(200).json({
          ok: true,
          incremented: false,
          projectViews: stats.projectViews,
          appreciations: stats.appreciations,
          views: stats.projectViews,
          byProject: stats.byProject,
        });
      }

      // Return authoritative statistics
      const stats = await getProjectStatistics();
      return res.status(200).json({
        ok: true,
        projectViews: stats.projectViews,
        appreciations: stats.appreciations,
        views: stats.projectViews,
        byProject: stats.byProject,
      });
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Views handler error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to process statistics' });
  }
}
