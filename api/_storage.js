import fs from 'node:fs';
import path from 'node:path';

const SECRETS_DIR = path.resolve(process.cwd(), '.server-secrets');
const TMP_DIR = '/tmp';

const ANALYTICS_FILE = fs.existsSync(SECRETS_DIR)
  ? path.join(SECRETS_DIR, 'analytics.json')
  : path.join(TMP_DIR, 'portfolio_analytics.json');

const PROJECT_STATS_FILE = fs.existsSync(SECRETS_DIR)
  ? path.join(SECRETS_DIR, 'project-stats.json')
  : path.join(TMP_DIR, 'portfolio_project_stats.json');

const TMP_PROJECT_STATS_FILE = path.join(TMP_DIR, 'portfolio_project_stats.json');
const PUBLIC_PROJECT_STATS_FILE = path.resolve(process.cwd(), 'public/data/project-stats.json');
const PUBLIC_CMS_STORE_FILE = path.resolve(process.cwd(), 'public/data/cms-store.json');

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
const inMemoryProjectViews = new Map();
const inMemoryProjectAppreciations = new Map();
let inMemoryTotalViewsWatermark = 0;
let inMemoryTotalAppreciationsWatermark = 0;

function readJsonSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {}
  return null;
}

function writeJsonSafe(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

// Read base project records from disk
function getBaseProjects() {
  const store = readJsonSafe(PUBLIC_CMS_STORE_FILE);
  if (store && Array.isArray(store.projects)) {
    return store.projects;
  }
  const projs = readJsonSafe(path.resolve(process.cwd(), 'public/data/projects.json'));
  if (Array.isArray(projs)) {
    return projs;
  }
  return [];
}

// Read persistent project stats mapping
function readStoredProjectStats() {
  const sources = [
    PROJECT_STATS_FILE,
    TMP_PROJECT_STATS_FILE,
    PUBLIC_PROJECT_STATS_FILE,
  ];
  const views = {};
  const appreciations = {};
  for (const src of sources) {
    const data = readJsonSafe(src);
    if (data && typeof data === 'object') {
      if (data.views && typeof data.views === 'object') {
        for (const [k, v] of Object.entries(data.views)) {
          const num = parseInt(v, 10);
          if (!isNaN(num) && num >= 0) {
            views[k] = Math.max(views[k] || 0, num);
          }
        }
      }
      if (data.appreciations && typeof data.appreciations === 'object') {
        for (const [k, v] of Object.entries(data.appreciations)) {
          const num = parseInt(v, 10);
          if (!isNaN(num) && num >= 0) {
            appreciations[k] = Math.max(appreciations[k] || 0, num);
          }
        }
      }
    }
  }
  return { views, appreciations };
}

// Save persistent project stats mapping
function saveStoredProjectStats(viewsMap, appreciationsMap) {
  const payload = {
    views: viewsMap,
    appreciations: appreciationsMap,
    updatedAt: new Date().toISOString(),
  };
  writeJsonSafe(PROJECT_STATS_FILE, payload);
  writeJsonSafe(TMP_PROJECT_STATS_FILE, payload);
  writeJsonSafe(PUBLIC_PROJECT_STATS_FILE, payload);
}

async function getRedisProjectStats() {
  const redis = getRedisConfig();
  if (!redis) return null;
  try {
    const res = await fetch(`${redis.url}/get/portfolio:project_stats`, {
      headers: { Authorization: `Bearer ${redis.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
    }
  } catch (err) {
    console.warn('Redis getProjectStats error:', err);
  }
  return null;
}

async function saveRedisProjectStats(payload) {
  const redis = getRedisConfig();
  if (!redis) return;
  try {
    await fetch(`${redis.url}/set/portfolio:project_stats`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redis.token}` },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Redis saveProjectStats error:', err);
  }
}

// ----------------------------------------------------
// PERMANENT LIFETIME BEHANCE-STYLE PROJECT STATISTICS
// ----------------------------------------------------
export async function getProjectStatistics() {
  const baseProjects = getBaseProjects();
  const diskStats = readStoredProjectStats();
  const redisStats = await getRedisProjectStats();

  const viewsMap = {};
  const appreciationsMap = {};

  // 1. Populate from base projects in cms-store.json / projects.json
  for (const proj of baseProjects) {
    if (!proj || !proj.id) continue;
    viewsMap[proj.id] = Math.max(0, parseInt(proj.views, 10) || 0);
    appreciationsMap[proj.id] = Math.max(0, parseInt(proj.appreciations, 10) || 0);
  }

  // 2. Merge disk stats
  if (diskStats.views) {
    for (const [id, count] of Object.entries(diskStats.views)) {
      viewsMap[id] = Math.max(viewsMap[id] || 0, count);
    }
  }
  if (diskStats.appreciations) {
    for (const [id, count] of Object.entries(diskStats.appreciations)) {
      appreciationsMap[id] = Math.max(0, count);
    }
  }

  // 3. Merge redis stats
  if (redisStats && typeof redisStats === 'object') {
    if (redisStats.views && typeof redisStats.views === 'object') {
      for (const [id, count] of Object.entries(redisStats.views)) {
        const num = parseInt(count, 10);
        if (!isNaN(num) && num >= 0) {
          viewsMap[id] = Math.max(viewsMap[id] || 0, num);
        }
      }
    }
    if (redisStats.appreciations && typeof redisStats.appreciations === 'object') {
      for (const [id, count] of Object.entries(redisStats.appreciations)) {
        const num = parseInt(count, 10);
        if (!isNaN(num) && num >= 0) {
          appreciationsMap[id] = num;
        }
      }
    }
  }

  // 4. Merge in-memory stats
  for (const [id, count] of inMemoryProjectViews.entries()) {
    viewsMap[id] = Math.max(viewsMap[id] || 0, count);
  }
  for (const [id, count] of inMemoryProjectAppreciations.entries()) {
    appreciationsMap[id] = Math.max(0, count);
  }

  // Update in-memory maps
  for (const [id, count] of Object.entries(viewsMap)) {
    inMemoryProjectViews.set(id, count);
  }
  for (const [id, count] of Object.entries(appreciationsMap)) {
    inMemoryProjectAppreciations.set(id, count);
  }

  // Calculate totals across published projects
  let totalProjectViews = 0;
  let totalAppreciations = 0;

  for (const proj of baseProjects) {
    if (!proj || !proj.id) continue;
    const isPublished = proj.status !== 'draft' && proj.visible !== false;
    if (isPublished) {
      totalProjectViews += viewsMap[proj.id] || 0;
      totalAppreciations += appreciationsMap[proj.id] || 0;
    }
  }

  // Strictly non-decreasing lifetime watermark for views (views never decrease)
  inMemoryTotalViewsWatermark = Math.max(inMemoryTotalViewsWatermark, totalProjectViews);

  return {
    projectViews: inMemoryTotalViewsWatermark,
    appreciations: totalAppreciations,
    views: inMemoryTotalViewsWatermark,
    byProject: {
      views: viewsMap,
      appreciations: appreciationsMap,
    },
  };
}

export async function recordProjectView(projectId) {
  if (!projectId) return getProjectStatistics();
  const stats = await getProjectStatistics();

  const currentCount = stats.byProject.views[projectId] || 0;
  const nextCount = currentCount + 1;
  stats.byProject.views[projectId] = nextCount;
  inMemoryProjectViews.set(projectId, nextCount);

  saveStoredProjectStats(stats.byProject.views, stats.byProject.appreciations);
  await saveRedisProjectStats({
    views: stats.byProject.views,
    appreciations: stats.byProject.appreciations,
    updatedAt: new Date().toISOString(),
  });

  return getProjectStatistics();
}

export async function recordProjectAppreciation(projectId, delta = 1) {
  if (!projectId) return getProjectStatistics();
  const stats = await getProjectStatistics();

  const currentCount = stats.byProject.appreciations[projectId] || 0;
  const nextCount = Math.max(0, currentCount + delta);
  stats.byProject.appreciations[projectId] = nextCount;
  inMemoryProjectAppreciations.set(projectId, nextCount);

  saveStoredProjectStats(stats.byProject.views, stats.byProject.appreciations);
  await saveRedisProjectStats({
    views: stats.byProject.views,
    appreciations: stats.byProject.appreciations,
    updatedAt: new Date().toISOString(),
  });

  return getProjectStatistics();
}

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
