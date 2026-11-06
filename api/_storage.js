import fs from 'node:fs';
import path from 'node:path';

const SECRETS_DIR = path.resolve(process.cwd(), '.server-secrets');
const TMP_DIR = '/tmp';

const ANALYTICS_FILE = fs.existsSync(SECRETS_DIR)
  ? path.join(SECRETS_DIR, 'analytics.json')
  : path.join(TMP_DIR, 'portfolio_analytics.json');

const COMMENTS_FILE = fs.existsSync(SECRETS_DIR)
  ? path.join(SECRETS_DIR, 'comments.json')
  : path.join(TMP_DIR, 'portfolio_comments.json');

// Check for Vercel KV or Upstash Redis configuration
function getRedisConfig() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL ||
    '';
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_TOKEN ||
    '';

  if (url && token) {
    return {
      url: url.replace(/\/$/, ''),
      token,
    };
  }
  return null;
}

// In-memory lifetime watermark (strictly monotonically increasing, never decreases)
let lifetimeTotalViewsWatermark = 0;

// ----------------------------------------------------
// PERMANENT LIFETIME PROFILE VISITS COUNTER
// ----------------------------------------------------
export async function getProfileViews() {
  const redis = getRedisConfig();
  if (redis) {
    try {
      const res = await fetch(`${redis.url}/get/portfolio:profile_views`, {
        headers: { Authorization: `Bearer ${redis.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const num = parseInt(data.result, 10);
        if (!isNaN(num) && num >= 0) {
          lifetimeTotalViewsWatermark = Math.max(lifetimeTotalViewsWatermark, num);
          return lifetimeTotalViewsWatermark;
        }
      }
    } catch (err) {
      console.warn('Redis getViews error, falling back to disk:', err);
    }
  }

  // Filesystem fallback
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const content = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      const views = parseInt(parsed.views, 10);
      if (!isNaN(views) && views >= 0) {
        lifetimeTotalViewsWatermark = Math.max(lifetimeTotalViewsWatermark, views);
      }
    }
  } catch {}

  // Check public/data/views.json
  try {
    const publicViewsFile = path.resolve(process.cwd(), 'public/data/views.json');
    if (fs.existsSync(publicViewsFile)) {
      const content = fs.readFileSync(publicViewsFile, 'utf-8');
      const parsed = JSON.parse(content);
      const views = parseInt(parsed.views, 10);
      if (!isNaN(views) && views >= 0) {
        lifetimeTotalViewsWatermark = Math.max(lifetimeTotalViewsWatermark, views);
      }
    }
  } catch {}

  return lifetimeTotalViewsWatermark;
}

export async function incrementProfileViews() {
  const redis = getRedisConfig();
  if (redis) {
    try {
      // Atomic increment in Redis (guaranteed cumulative lifetime integer)
      const res = await fetch(`${redis.url}/incr/portfolio:profile_views`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redis.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const num = parseInt(data.result, 10);
        if (!isNaN(num) && num >= 0) {
          lifetimeTotalViewsWatermark = Math.max(lifetimeTotalViewsWatermark, num);
          return lifetimeTotalViewsWatermark;
        }
      }
    } catch (err) {
      console.warn('Redis incrementViews error, falling back to disk:', err);
    }
  }

  // Fallback persistent accumulation (strictly non-decreasing)
  try {
    const current = await getProfileViews();
    const next = Math.max(lifetimeTotalViewsWatermark + 1, current + 1);
    lifetimeTotalViewsWatermark = next;
    const dir = path.dirname(ANALYTICS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      ANALYTICS_FILE,
      JSON.stringify({ views: next, lastIncrementAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
    return next;
  } catch {
    lifetimeTotalViewsWatermark = Math.max(lifetimeTotalViewsWatermark + 1, 1);
    return lifetimeTotalViewsWatermark;
  }
}

// ----------------------------------------------------
// PROJECT COMMENTS
// ----------------------------------------------------
export async function getProjectComments(projectId) {
  if (!projectId) return [];

  const redis = getRedisConfig();
  if (redis) {
    try {
      const res = await fetch(
        `${redis.url}/lrange/portfolio:comments:${encodeURIComponent(projectId)}/0/-1`,
        {
          headers: { Authorization: `Bearer ${redis.token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.result)) {
          return data.result
            .map((item) => {
              if (typeof item === 'string') {
                try {
                  return JSON.parse(item);
                } catch {
                  return null;
                }
              }
              return item;
            })
            .filter(Boolean);
        }
      }
    } catch (err) {
      console.warn('Redis getComments error, falling back to disk:', err);
    }
  }

  // Filesystem fallback
  try {
    if (fs.existsSync(COMMENTS_FILE)) {
      const raw = fs.readFileSync(COMMENTS_FILE, 'utf-8');
      const store = JSON.parse(raw);
      if (store && Array.isArray(store[projectId])) {
        return store[projectId];
      }
    }
  } catch {}

  // Check public/data/comments.json
  try {
    const publicComments = path.resolve(process.cwd(), 'public/data/comments.json');
    if (fs.existsSync(publicComments)) {
      const raw = fs.readFileSync(publicComments, 'utf-8');
      const store = JSON.parse(raw);
      if (store?.comments && Array.isArray(store.comments[projectId])) {
        return store.comments[projectId];
      }
    }
  } catch {}

  return [];
}

export async function addProjectComment(projectId, comment) {
  if (!projectId || !comment) return null;

  const redis = getRedisConfig();
  if (redis) {
    try {
      const res = await fetch(
        `${redis.url}/rpush/portfolio:comments:${encodeURIComponent(projectId)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${redis.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([JSON.stringify(comment)]),
        }
      );
      if (res.ok) {
        return comment;
      }
    } catch (err) {
      console.warn('Redis addComment error, falling back to disk:', err);
    }
  }

  // Filesystem fallback
  try {
    let store = {};
    if (fs.existsSync(COMMENTS_FILE)) {
      try {
        store = JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8')) || {};
      } catch {}
    }
    if (!Array.isArray(store[projectId])) {
      store[projectId] = [];
    }
    store[projectId].unshift(comment); // newest first
    // Limit to 200 comments per project
    store[projectId] = store[projectId].slice(0, 200);

    const dir = path.dirname(COMMENTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
    return comment;
  } catch (err) {
    console.error('Failed to write comment to disk:', err);
    return comment;
  }
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
