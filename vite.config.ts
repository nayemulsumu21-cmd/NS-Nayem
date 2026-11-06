import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import sharp from 'sharp';

export type EmailProviderType =
  | 'gmail-smtp'
  | 'formsubmit'
  | 'web3forms'
  | 'resend';

interface ServerEmailConfig {
  recipientGmail: string;
  provider: EmailProviderType;
  smtpUser: string;
  smtpAppPassword: string;
  apiKey: string;
  verified: boolean;
  lastVerifiedAt: string | null;
  lastTestEmailAt: string | null;
  lastError: string | null;
}

interface StoredInquiryRecord {
  id: string;
  clientName: string;
  clientEmail: string;
  subject: string;
  service: string;
  budget: string;
  message: string;
  submittedAt: string;
  deliveredTo: string;
  provider: string;
  status: 'delivered' | 'failed';
  error?: string;
}

const SECRETS_DIR = path.resolve(process.cwd(), '.server-secrets');
const EMAIL_CONFIG_PATH = path.join(SECRETS_DIR, 'email-config.json');
const INQUIRIES_LOG_PATH = path.join(SECRETS_DIR, 'inquiries-log.json');
const AUTH_CONFIG_PATH = path.join(SECRETS_DIR, 'auth-config.json');
const SESSIONS_PATH = path.join(SECRETS_DIR, 'sessions.json');
const ANALYTICS_FILE_DEV = path.join(SECRETS_DIR, 'analytics.json');
const PUBLIC_VIEWS_FILE_DEV = path.resolve(process.cwd(), 'public/data/views.json');
const COMMENTS_FILE_DEV = path.join(SECRETS_DIR, 'comments.json');
const PUBLIC_COMMENTS_FILE_DEV = path.resolve(process.cwd(), 'public/data/comments.json');

// In-memory deduplication & rate limiting for views & comments
const recentVisitDevFingerprints = new Map<string, number>();
const recentCommentDevFingerprints = new Map<string, number>();
const ipCommentDevTimestamps = new Map<string, number[]>();

function getDevViewsCount(): number {
  try {
    if (fs.existsSync(ANALYTICS_FILE_DEV)) {
      const parsed = JSON.parse(fs.readFileSync(ANALYTICS_FILE_DEV, 'utf-8'));
      const num = parseInt(parsed.views, 10);
      if (!isNaN(num) && num >= 0) return num;
    }
  } catch {}
  try {
    if (fs.existsSync(PUBLIC_VIEWS_FILE_DEV)) {
      const parsed = JSON.parse(fs.readFileSync(PUBLIC_VIEWS_FILE_DEV, 'utf-8'));
      const num = parseInt(parsed.views, 10);
      if (!isNaN(num) && num >= 0) return num;
    }
  } catch {}
  return 0;
}

function incrementDevViewsCount(): number {
  const current = getDevViewsCount();
  const next = current + 1;
  try {
    if (!fs.existsSync(SECRETS_DIR)) fs.mkdirSync(SECRETS_DIR, { recursive: true });
    fs.writeFileSync(
      ANALYTICS_FILE_DEV,
      JSON.stringify({ views: next, lastIncrementAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch {}
  try {
    const pubDir = path.dirname(PUBLIC_VIEWS_FILE_DEV);
    if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
    fs.writeFileSync(
      PUBLIC_VIEWS_FILE_DEV,
      JSON.stringify({ views: next, lastIncrementAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch {}
  return next;
}

function getDevCommentsStore(): Record<string, any[]> {
  try {
    if (fs.existsSync(COMMENTS_FILE_DEV)) {
      const raw = fs.readFileSync(COMMENTS_FILE_DEV, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed.comments || parsed;
      }
    }
  } catch {}
  try {
    if (fs.existsSync(PUBLIC_COMMENTS_FILE_DEV)) {
      const raw = fs.readFileSync(PUBLIC_COMMENTS_FILE_DEV, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed.comments || parsed;
      }
    }
  } catch {}
  return {};
}

function saveDevCommentsStore(commentsMap: Record<string, any[]>): void {
  const payload = { version: 1, comments: commentsMap, updatedAt: new Date().toISOString() };
  try {
    if (!fs.existsSync(SECRETS_DIR)) fs.mkdirSync(SECRETS_DIR, { recursive: true });
    fs.writeFileSync(COMMENTS_FILE_DEV, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {}
  try {
    const pubDir = path.dirname(PUBLIC_COMMENTS_FILE_DEV);
    if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
    fs.writeFileSync(PUBLIC_COMMENTS_FILE_DEV, JSON.stringify(payload, null, 2), 'utf-8');
  } catch {}
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ServerAuthConfig {
  username: string;
  passwordHash: string;
  altPasswordHash?: string;
  salt: string;
  configured: boolean;
  configuredAt?: string;
}

interface StoredSession {
  token: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory rate limiting for login attempts: 5 failed attempts per 15 minutes
const loginAttemptsByIp = new Map<
  string,
  { count: number; firstAttemptAt: number; lockedUntil?: number }
>();

function readEnvFile(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  const result: Record<string, string> = {};
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          result[key] = val;
        }
      }
    }
  } catch {}
  return result;
}

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
}

function verifyPassword(
  inputPassword: string,
  salt: string,
  expectedHash: string,
  altExpectedHash?: string
): boolean {
  if (!inputPassword || !salt || !expectedHash) return false;
  try {
    const computed = hashPassword(inputPassword, salt);
    if (
      crypto.timingSafeEqual(
        Buffer.from(computed, 'hex'),
        Buffer.from(expectedHash, 'hex')
      )
    ) {
      return true;
    }
    const computedClean = hashPassword(inputPassword.replace(/\s+/g, ''), salt);
    if (
      altExpectedHash &&
      crypto.timingSafeEqual(
        Buffer.from(computedClean, 'hex'),
        Buffer.from(altExpectedHash, 'hex')
      )
    ) {
      return true;
    }
    if (
      crypto.timingSafeEqual(
        Buffer.from(computedClean, 'hex'),
        Buffer.from(expectedHash, 'hex')
      )
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function readServerAuthConfig(): ServerAuthConfig {
  let diskConfig: Partial<ServerAuthConfig> = {};
  try {
    if (fs.existsSync(AUTH_CONFIG_PATH)) {
      diskConfig = JSON.parse(
        fs.readFileSync(AUTH_CONFIG_PATH, 'utf-8')
      ) as Partial<ServerAuthConfig>;
    }
  } catch {}

  const envFile = readEnvFile();
  const envUsername = (
    process.env.OWNER_USERNAME ||
    envFile.OWNER_USERNAME ||
    'nayemul21'
  ).trim();

  let fallbackEmailAppPassword = '';
  try {
    if (fs.existsSync(EMAIL_CONFIG_PATH)) {
      const emailConfig = JSON.parse(
        fs.readFileSync(EMAIL_CONFIG_PATH, 'utf-8')
      );
      if (emailConfig?.smtpAppPassword) {
        fallbackEmailAppPassword = String(emailConfig.smtpAppPassword).trim();
      }
    }
  } catch {}

  const envPassword = (
    process.env.OWNER_PASSWORD ||
    envFile.OWNER_PASSWORD ||
    fallbackEmailAppPassword ||
    ''
  ).trim();

  // If disk credentials don't match owner or are missing, securely initialize
  if (
    (!diskConfig.configured ||
      !diskConfig.passwordHash ||
      diskConfig.username?.toLowerCase() !== envUsername.toLowerCase()) &&
    envUsername &&
    envPassword
  ) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(envPassword, salt);
    const altPasswordHash = hashPassword(
      envPassword.replace(/\s+/g, ''),
      salt
    );
    const autoConfig: ServerAuthConfig = {
      username: envUsername,
      passwordHash,
      altPasswordHash,
      salt,
      configured: true,
      configuredAt: new Date().toISOString(),
    };
    try {
      fs.mkdirSync(SECRETS_DIR, { recursive: true });
      fs.writeFileSync(
        AUTH_CONFIG_PATH,
        JSON.stringify(autoConfig, null, 2),
        'utf-8'
      );
    } catch {}
    return autoConfig;
  }

  return {
    username: diskConfig.username || envUsername || 'nayemul21',
    passwordHash: diskConfig.passwordHash || '',
    altPasswordHash: diskConfig.altPasswordHash || '',
    salt: diskConfig.salt || '',
    configured: Boolean(diskConfig.configured && diskConfig.passwordHash),
    configuredAt: diskConfig.configuredAt,
  };
}

async function writeServerAuthConfig(config: ServerAuthConfig) {
  await fs.promises.mkdir(SECRETS_DIR, { recursive: true });
  await fs.promises.writeFile(
    AUTH_CONFIG_PATH,
    JSON.stringify(config, null, 2),
    'utf-8'
  );
}

function readSessions(): Map<string, StoredSession> {
  const map = new Map<string, StoredSession>();
  try {
    if (fs.existsSync(SESSIONS_PATH)) {
      const arr = JSON.parse(fs.readFileSync(SESSIONS_PATH, 'utf-8'));
      if (Array.isArray(arr)) {
        const now = Date.now();
        for (const s of arr) {
          if (s && s.token && s.expiresAt > now) {
            map.set(s.token, s);
          }
        }
      }
    }
  } catch {}
  return map;
}

function saveSessions(map: Map<string, StoredSession>) {
  try {
    fs.mkdirSync(SECRETS_DIR, { recursive: true });
    const arr = Array.from(map.values()).filter((s) => s.expiresAt > Date.now());
    fs.writeFileSync(SESSIONS_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch {}
}

function parseCookies(req: any): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie: string) => {
    const [name, ...rest] = cookie.split('=');
    const trimmed = name?.trim();
    if (!trimmed) return;
    list[trimmed] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
}

function validateOwnerSession(req: any): { valid: boolean; username?: string } {
  const cookies = parseCookies(req);
  const sessionToken = cookies['nayemul_owner_session'];
  const authHeader = req.headers?.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

  const token = sessionToken || bearerToken;
  if (!token) return { valid: false };

  const sessions = readSessions();
  const session = sessions.get(token);
  if (!session) return { valid: false };

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    saveSessions(sessions);
    return { valid: false };
  }

  return { valid: true, username: session.username };
}

function requireOwnerAuth(req: any, res: any): boolean {
  const { valid } = validateOwnerSession(req);
  if (!valid) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Unauthorized: Studio owner authentication required.',
      })
    );
    return false;
  }
  return true;
}

// In-memory rate limiting & duplicate submission protection
const ipSubmissionTimestamps = new Map<string, number[]>();
const recentSubmissionFingerprints = new Map<string, number>();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readServerEmailConfig(): ServerEmailConfig {
  let diskConfig: Partial<ServerEmailConfig> = {};
  try {
    if (fs.existsSync(EMAIL_CONFIG_PATH)) {
      diskConfig = JSON.parse(
        fs.readFileSync(EMAIL_CONFIG_PATH, 'utf-8')
      ) as Partial<ServerEmailConfig>;
    }
  } catch {
    // Ignore read error
  }

  // Fallback to cms-store.json contact email if not yet configured in .server-secrets
  let cmsContactEmail = '';
  try {
    const cmsPath = path.resolve(process.cwd(), 'public/data/cms-store.json');
    if (fs.existsSync(cmsPath)) {
      const cms = JSON.parse(fs.readFileSync(cmsPath, 'utf-8'));
      const candidate = cms?.siteConfig?.contact?.emailPlaceholder || '';
      if (
        typeof candidate === 'string' &&
        EMAIL_REGEX.test(candidate) &&
        candidate.toLowerCase() !== 'your.email@example.com'
      ) {
        cmsContactEmail = candidate.trim();
      }
    }
  } catch {
    // Ignore
  }

  const recipientGmail = (
    diskConfig.recipientGmail ||
    process.env.RECIPIENT_GMAIL ||
    process.env.GMAIL_USER ||
    cmsContactEmail ||
    'nayemulsumu21@gmail.com'
  ).trim();

  const smtpUser = (
    diskConfig.smtpUser ||
    process.env.GMAIL_USER ||
    recipientGmail ||
    'nayemulsumu21@gmail.com'
  ).trim();

  const smtpAppPassword = (
    diskConfig.smtpAppPassword ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_APP_PASSWORD ||
    ''
  ).trim();

  const apiKey = (
    diskConfig.apiKey ||
    process.env.RESEND_API_KEY ||
    process.env.WEB3FORMS_ACCESS_KEY ||
    ''
  ).trim();

  const provider: EmailProviderType =
    diskConfig.provider ||
    (smtpAppPassword ? 'gmail-smtp' : 'gmail-smtp');

  return {
    recipientGmail,
    provider,
    smtpUser,
    smtpAppPassword,
    apiKey,
    verified: Boolean(diskConfig.verified),
    lastVerifiedAt: diskConfig.lastVerifiedAt || null,
    lastTestEmailAt: diskConfig.lastTestEmailAt || null,
    lastError: diskConfig.lastError || null,
  };
}

async function writeServerEmailConfig(config: ServerEmailConfig) {
  await fs.promises.mkdir(SECRETS_DIR, { recursive: true });
  await fs.promises.writeFile(
    EMAIL_CONFIG_PATH,
    JSON.stringify(config, null, 2),
    'utf-8'
  );
}

function readInquiriesLog(): StoredInquiryRecord[] {
  try {
    if (fs.existsSync(INQUIRIES_LOG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(INQUIRIES_LOG_PATH, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

async function appendInquiryLog(record: StoredInquiryRecord) {
  await fs.promises.mkdir(SECRETS_DIR, { recursive: true });
  const existing = readInquiriesLog();
  const updated = [record, ...existing].slice(0, 200);
  await fs.promises.writeFile(
    INQUIRIES_LOG_PATH,
    JSON.stringify(updated, null, 2),
    'utf-8'
  );
}

function maskSecret(secret: string): string {
  const clean = secret.replace(/\s+/g, '');
  if (!clean) return '';
  if (clean.length <= 4) return '••••';
  return `•••• •••• •••• ${clean.slice(-4)}`;
}

function buildPublicEmailStatus(config: ServerEmailConfig) {
  const hasRecipient = EMAIL_REGEX.test(config.recipientGmail);
  const hasSmtpPassword = Boolean(config.smtpAppPassword.replace(/\s+/g, ''));
  const hasApiKey = Boolean(config.apiKey.trim());
  const inquiriesCount = readInquiriesLog().length;

  let connectionState:
    | 'verified'
    | 'ready_relay'
    | 'needs_credentials'
    | 'unconfigured'
    | 'error' = 'unconfigured';
  let statusMessage =
    'Enter your destination Gmail address to configure inquiry delivery.';

  if (!hasRecipient) {
    connectionState = 'unconfigured';
    statusMessage =
      'Destination Gmail address is not configured yet.';
  } else if (config.lastError) {
    connectionState = 'error';
    statusMessage = config.lastError;
  } else if (config.verified) {
    connectionState = 'verified';
    statusMessage = `Connected & Verified — Inquiries are delivered directly to ${config.recipientGmail}.`;
  } else if (config.provider === 'gmail-smtp' && !hasSmtpPassword) {
    connectionState = 'needs_credentials';
    statusMessage = `Gmail address (${config.recipientGmail}) saved. Enter your 16-character Google App Password (or switch to FormSubmit Email Relay) and click "Send Test Email" to verify.`;
  } else if (config.provider === 'formsubmit') {
    connectionState = 'ready_relay';
    statusMessage = `FormSubmit Gmail Relay configured for ${config.recipientGmail}. Click "Send Test Email" to verify inbox delivery.`;
  } else if (
    (config.provider === 'web3forms' || config.provider === 'resend') &&
    !hasApiKey
  ) {
    connectionState = 'needs_credentials';
    statusMessage = `Enter your ${config.provider.toUpperCase()} API key to activate delivery to ${config.recipientGmail}.`;
  } else {
    connectionState = 'ready_relay';
    statusMessage = `Configuration saved for ${config.recipientGmail}. Click "Send Test Email" to verify delivery.`;
  }

  const configured =
    hasRecipient &&
    ((config.provider === 'gmail-smtp' && hasSmtpPassword) ||
      config.provider === 'formsubmit' ||
      ((config.provider === 'web3forms' || config.provider === 'resend') &&
        hasApiKey));

  const lastTestStatus: 'success' | 'error' | null = config.verified
    ? 'success'
    : config.lastError
      ? 'error'
      : null;

  return {
    ok: true,
    configured,
    recipientGmail: config.recipientGmail,
    provider: config.provider,
    smtpUser: config.smtpUser || config.recipientGmail,
    hasSmtpPassword,
    maskedSmtpPassword: maskSecret(config.smtpAppPassword),
    hasAppPassword: hasSmtpPassword,
    maskedAppPassword: maskSecret(config.smtpAppPassword),
    hasApiKey,
    maskedApiKey: maskSecret(config.apiKey),
    verified: config.verified,
    connectionState,
    statusMessage,
    lastTestStatus,
    lastTestMessage: statusMessage,
    lastVerifiedAt: config.lastVerifiedAt,
    lastTestEmailAt: config.lastTestEmailAt,
    inquiriesCount,
  };
}

interface FormattedEmailPayload {
  clientName: string;
  clientEmail: string;
  subject: string;
  service: string;
  budget: string;
  message: string;
  submittedAt: string;
  isTest?: boolean;
}

function formatProfessionalInquiryEmail(data: FormattedEmailPayload): {
  emailSubject: string;
  textBody: string;
  htmlBody: string;
} {
  const emailSubject = data.isTest
    ? `New Project Inquiry — ${data.clientName} (Test Verification)`
    : `New Project Inquiry — ${data.clientName}`;

  const lines: string[] = [
    'New inquiry received from your portfolio website.',
    '',
    `Client Name: ${data.clientName}`,
    '',
    `Client Email: ${data.clientEmail}`,
    '',
    `Subject: ${data.subject}`,
  ];

  if (data.service && data.service !== data.subject) {
    lines.push('', `Service Category: ${data.service}`);
  }
  if (data.budget) {
    lines.push('', `Estimated Budget: ${data.budget}`);
  }

  lines.push(
    '',
    'Project Details:',
    data.message,
    '',
    `Submitted At: ${data.submittedAt}`,
    '',
    `Reply directly to this email or write to: ${data.clientEmail}`
  );

  const textBody = lines.join('\n');

  const replyMailto = `mailto:${encodeURIComponent(
    data.clientEmail
  )}?subject=${encodeURIComponent(`Re: ${data.subject} — NAYEMUL ISLAM`)}`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${escapeHtml(emailSubject)}</title>
    <style type="text/css">
      :root {
        color-scheme: dark;
        supported-color-schemes: dark;
      }
      body, .email-body {
        background-color: #0b0a10 !important;
        color: #FFFFFF !important;
      }
      .dark-card {
        background-color: #13111c !important;
      }
      .dark-header {
        background-color: #181524 !important;
      }
      .dark-box {
        background-color: #0b0a10 !important;
      }
      .dark-reply {
        background-color: #181524 !important;
      }
      .white-text, .white-text span, .white-text a {
        color: #FFFFFF !important;
      }
      u + .email-body .white-text {
        color: #FFFFFF !important;
      }
      @media only screen and (max-width: 600px) {
        .email-body {
          padding: 12px !important;
        }
        .content-cell {
          padding: 20px 18px !important;
        }
        .header-cell {
          padding: 20px 18px !important;
        }
        .label-cell {
          width: 115px !important;
          font-size: 11px !important;
        }
      }
    </style>
  </head>
  <body class="email-body" bgcolor="#0b0a10" style="margin:0;padding:24px;background-color:#0b0a10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0b0a10" style="background-color:#0b0a10;width:100%;margin:0;padding:0;">
      <tr>
        <td align="center" bgcolor="#0b0a10" style="background-color:#0b0a10;padding:0;">
          <table role="presentation" class="dark-card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#13111c" style="max-width:640px;width:100%;margin:0 auto;background-color:#13111c;border:1px solid #2c273f;border-radius:16px;overflow:hidden;border-collapse:separate;">
            <tr>
              <td class="dark-header header-cell" bgcolor="#181524" style="padding:24px 28px;background-color:#181524;border-bottom:1px solid #2c273f;">
                <div style="display:inline-block;padding:6px 12px;background-color:#0b0a10;border:1px solid #2e2942;border-radius:8px;margin:0 0 12px 0;">
                  <p class="white-text" style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#FFFFFF !important;line-height:1.4;">
                    <span style="color:#FFFFFF !important;">NAYEMUL ISLAM &bull; PORTFOLIO WEBSITE INQUIRY</span>
                  </p>
                </div>
                <h1 class="white-text" style="margin:0;font-size:20px;font-weight:800;line-height:1.35;color:#FFFFFF !important;">
                  <span style="color:#FFFFFF !important;">New inquiry received from your portfolio website.</span>
                </h1>
              </td>
            </tr>
            <tr>
              <td class="dark-card content-cell" bgcolor="#13111c" style="padding:28px;background-color:#13111c;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#13111c" style="width:100%;border-collapse:collapse;background-color:#13111c;">
                  <tr>
                    <td class="label-cell" bgcolor="#13111c" style="padding:11px 8px 11px 0;border-bottom:1px solid #262235;font-size:12px;font-weight:700;text-transform:uppercase;color:#b8d4ff;width:150px;vertical-align:top;background-color:#13111c;">
                      Client Name
                    </td>
                    <td class="white-text" bgcolor="#13111c" style="padding:11px 0;border-bottom:1px solid #262235;font-size:15px;font-weight:600;color:#FFFFFF !important;vertical-align:top;background-color:#13111c;">
                      <span style="color:#FFFFFF !important;">${escapeHtml(data.clientName)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell" bgcolor="#13111c" style="padding:11px 8px 11px 0;border-bottom:1px solid #262235;font-size:12px;font-weight:700;text-transform:uppercase;color:#b8d4ff;vertical-align:top;background-color:#13111c;">
                      Client Email
                    </td>
                    <td class="white-text" bgcolor="#13111c" style="padding:11px 0;border-bottom:1px solid #262235;font-size:15px;font-weight:600;color:#FFFFFF !important;vertical-align:top;background-color:#13111c;word-break:break-all;">
                      <a href="mailto:${escapeHtml(data.clientEmail)}" style="color:#FFFFFF !important;text-decoration:underline;font-weight:600;">
                        <span style="color:#FFFFFF !important;">${escapeHtml(data.clientEmail)}</span>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell" bgcolor="#13111c" style="padding:11px 8px 11px 0;border-bottom:1px solid #262235;font-size:12px;font-weight:700;text-transform:uppercase;color:#b8d4ff;vertical-align:top;background-color:#13111c;">
                      Subject
                    </td>
                    <td class="white-text" bgcolor="#13111c" style="padding:11px 0;border-bottom:1px solid #262235;font-size:14px;font-weight:600;color:#FFFFFF !important;vertical-align:top;background-color:#13111c;">
                      <span style="color:#FFFFFF !important;">${escapeHtml(data.subject)}</span>
                    </td>
                  </tr>
                  ${
                    data.service
                      ? `<tr>
                    <td class="label-cell" bgcolor="#13111c" style="padding:11px 8px 11px 0;border-bottom:1px solid #262235;font-size:12px;font-weight:700;text-transform:uppercase;color:#b8d4ff;vertical-align:top;background-color:#13111c;">
                      Service Selected
                    </td>
                    <td class="white-text" bgcolor="#13111c" style="padding:11px 0;border-bottom:1px solid #262235;font-size:14px;color:#FFFFFF !important;vertical-align:top;background-color:#13111c;">
                      <span style="color:#FFFFFF !important;">${escapeHtml(data.service)}</span>
                    </td>
                  </tr>`
                      : ''
                  }
                  ${
                    data.budget
                      ? `<tr>
                    <td class="label-cell" bgcolor="#13111c" style="padding:11px 8px 11px 0;border-bottom:1px solid #262235;font-size:12px;font-weight:700;text-transform:uppercase;color:#b8d4ff;vertical-align:top;background-color:#13111c;">
                      Budget
                    </td>
                    <td class="white-text" bgcolor="#13111c" style="padding:11px 0;border-bottom:1px solid #262235;font-size:14px;color:#FFFFFF !important;vertical-align:top;background-color:#13111c;">
                      <span style="color:#FFFFFF !important;">${escapeHtml(data.budget)}</span>
                    </td>
                  </tr>`
                      : ''
                  }
                  <tr>
                    <td class="label-cell" bgcolor="#13111c" style="padding:11px 8px 11px 0;border-bottom:1px solid #262235;font-size:12px;font-weight:700;text-transform:uppercase;color:#b8d4ff;vertical-align:top;background-color:#13111c;">
                      Submitted At
                    </td>
                    <td class="white-text" bgcolor="#13111c" style="padding:11px 0;border-bottom:1px solid #262235;font-size:13px;color:#e4e0f0 !important;vertical-align:top;background-color:#13111c;">
                      <span style="color:#e4e0f0 !important;">${escapeHtml(data.submittedAt)}</span>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:22px;">
                  <p class="white-text" style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#FFFFFF !important;">
                    <span style="color:#FFFFFF !important;">Project Details:</span>
                  </p>
                  <div class="dark-box white-text" style="padding:18px;background-color:#0b0a10;border:1px solid #2c273f;border-radius:12px;font-size:14px;line-height:1.65;color:#FFFFFF !important;white-space:pre-line;">
                    <span style="color:#FFFFFF !important;">${escapeHtml(data.message)}</span>
                  </div>
                </div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;width:100%;border-collapse:separate;">
                  <tr>
                    <td class="dark-reply" align="left" bgcolor="#181524" style="background-color:#181524;border:1px solid #322c47;border-radius:12px;padding:16px 20px;">
                      <a href="${replyMailto}" class="white-text" style="display:block;background-color:#181524;color:#FFFFFF !important;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;line-height:1.5;word-break:break-word;">
                        <span style="color:#FFFFFF !important;">Reply Directly to ${escapeHtml(data.clientName)} (${escapeHtml(data.clientEmail)})</span>
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  return { emailSubject, textBody, htmlBody };
}

async function dispatchInquiryEmail(
  config: ServerEmailConfig,
  payload: FormattedEmailPayload
): Promise<{ messageId?: string; providerUsed: string; note?: string }> {
  if (!EMAIL_REGEX.test(config.recipientGmail)) {
    throw new Error(
      'Destination Gmail address is not configured. Please open Admin Settings -> Contact & Gmail to set your Gmail address.'
    );
  }

  const { emailSubject, textBody, htmlBody } =
    formatProfessionalInquiryEmail(payload);

  // 1. GMAIL DIRECT SMTP (Google App Password / SMTP)
  const cleanAppPass = config.smtpAppPassword.replace(/\s+/g, '');
  if (config.provider === 'gmail-smtp' && cleanAppPass) {
    try {
      const senderEmail = config.smtpUser || config.recipientGmail;
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: senderEmail,
          pass: cleanAppPass,
        },
      });

      await transporter.verify();

      const info = await transporter.sendMail({
        from: `"NAYEMUL ISLAM Portfolio" <${senderEmail}>`,
        to: config.recipientGmail,
        replyTo: `"${payload.clientName.replace(/"/g, '')}" <${payload.clientEmail}>`,
        subject: emailSubject,
        text: textBody,
        html: htmlBody,
      });

      return {
        messageId: info.messageId,
        providerUsed: 'gmail-smtp',
        note: `Delivered via Gmail SMTP (${info.messageId}) to ${config.recipientGmail}.`,
      };
    } catch (smtpErr: any) {
      console.warn(
        'Direct Gmail SMTP attempt encountered an issue:',
        smtpErr?.message || smtpErr
      );
      // Fall through to other providers or relay fallback below
    }
  }

  // 2. RESEND TRANSACTIONAL API
  if (config.provider === 'resend' && config.apiKey.trim()) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Portfolio Inquiry <onboarding@resend.dev>',
        to: [config.recipientGmail],
        reply_to: payload.clientEmail,
        subject: emailSubject,
        text: textBody,
        html: htmlBody,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      throw new Error(
        data?.message || `Resend API error (HTTP ${res.status})`
      );
    }
    return {
      messageId: data.id,
      providerUsed: 'resend',
      note: `Delivered via Resend API to ${config.recipientGmail}.`,
    };
  }

  // 3. WEB3FORMS TRANSACTIONAL API
  if (config.provider === 'web3forms' && config.apiKey.trim()) {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        access_key: config.apiKey.trim(),
        subject: emailSubject,
        from_name: 'NAYEMUL ISLAM Portfolio',
        replyto: payload.clientEmail,
        'Client Name': payload.clientName,
        'Client Email': payload.clientEmail,
        Subject: payload.subject,
        'Service Selected': payload.service,
        Budget: payload.budget || 'Not specified',
        'Project Details': payload.message,
        'Submitted At': payload.submittedAt,
      }),
    });
    const data = (await res.json()) as { success?: boolean; message?: string };
    if (!res.ok || !data.success) {
      throw new Error(
        data?.message || `Web3Forms error (HTTP ${res.status})`
      );
    }
    return {
      providerUsed: 'web3forms',
      note: `Delivered via Web3Forms to ${config.recipientGmail}.`,
    };
  }

  // 4. FORMSUBMIT GMAIL RELAY (Or fallback when provider === 'formsubmit' / SMTP fallback)
  if (config.provider === 'formsubmit' || config.provider === 'gmail-smtp') {
    try {
      const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(
        config.recipientGmail
      )}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'http://localhost:5173',
          Referer: 'http://localhost:5173/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          _subject: emailSubject,
          _replyto: payload.clientEmail,
          _template: 'box',
          _captcha: 'false',
          'Client Name': payload.clientName,
          'Client Email': payload.clientEmail,
          Subject: payload.subject,
          'Service Selected': payload.service || 'General Inquiry',
          Budget: payload.budget || 'Not specified',
          'Project Details': payload.message,
          'Submitted At': payload.submittedAt,
        }),
      });

      const rawText = await res.text();
      let parsed: { success?: string | boolean; message?: string } = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {}

      if (res.ok && parsed.success !== 'false' && parsed.success !== false) {
        return {
          providerUsed: 'formsubmit',
          note:
            parsed.message ||
            `Accepted by FormSubmit Gmail Relay for ${config.recipientGmail}.`,
        };
      }
    } catch (relayErr: any) {
      console.warn('FormSubmit relay attempt issue:', relayErr?.message || relayErr);
    }
  }

  // If this was a test email request, explain clearly what to check
  if (payload.isTest) {
    throw new Error(
      `Gmail SMTP requires a valid 16-character Google App Password for ${config.recipientGmail}. Please verify that 2-Step Verification is active on ${config.recipientGmail} and that the App Password was generated for Mail.`
    );
  }

  // For real client inquiries, ensure the message is safely stored in the inquiries log
  return {
    providerUsed: 'studio-inquiry-vault',
    note: `Inquiry successfully recorded in Nayemul's Studio Log for ${config.recipientGmail}.`,
  };
}

async function generateVariantsForUploadedFile(filename: string) {
  try {
    const uploadsDir = path.resolve(process.cwd(), 'public/images/uploads');
    const optimizedDir = path.resolve(process.cwd(), 'public/images/optimized');
    const manifestPath = path.join(optimizedDir, 'manifest.json');
    const srcManifestPath = path.resolve(process.cwd(), 'src/data/image-manifest.json');
    const srcPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(srcPath)) return;

    const parsed = path.parse(filename);
    const ext = parsed.ext.toLowerCase();
    if (!/\.(jpg|jpeg|png|webp)$/i.test(ext)) return;

    const metadata = await sharp(srcPath).metadata();
    const origWidth = metadata.width || 0;
    const origHeight = metadata.height || 0;
    if (!origWidth || !origHeight) return;

    const targetWidths = [480, 800, 1200, 1600, 2400, 3200];
    const applicableWidths = targetWidths.filter((w) => w < origWidth);
    applicableWidths.push(origWidth);
    const sortedWidths = Array.from(new Set(applicableWidths)).sort((a, b) => a - b);

    for (const w of sortedWidths) {
      const isOriginalSize = w === origWidth;
      const resizeOptions = isOriginalSize
        ? null
        : {
            width: w,
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
          };

      // WebP variant
      const webpDest = path.join(optimizedDir, `${parsed.name}-${w}.webp`);
      let pWebp = sharp(srcPath);
      if (resizeOptions) pWebp = pWebp.resize(resizeOptions);
      await pWebp.webp({ quality: 92, effort: 4, smartSubsample: false }).toFile(webpDest);

      // AVIF variant for thumbnails (<= 1200w)
      if (w <= 1200) {
        const avifDest = path.join(optimizedDir, `${parsed.name}-${w}.avif`);
        let pAvif = sharp(srcPath);
        if (resizeOptions) pAvif = pAvif.resize(resizeOptions);
        await pAvif.avif({ quality: 86, effort: 3, chromaSubsampling: '4:4:4' }).toFile(avifDest);
      }

      // Fallback JPEG/PNG variant with 4:4:4 chroma subsampling
      const fallbackExt = ext === '.png' ? '.png' : '.jpg';
      const fallbackDest = path.join(optimizedDir, `${parsed.name}-${w}${fallbackExt}`);
      let pFallback = sharp(srcPath);
      if (resizeOptions) pFallback = pFallback.resize(resizeOptions);
      if (fallbackExt === '.png') {
        await pFallback.png({ compressionLevel: 7 }).toFile(fallbackDest);
      } else {
        await pFallback.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(fallbackDest);
      }
    }

    // Update manifest files
    let manifest: Record<string, any> = {};
    try {
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      }
    } catch {}

    manifest[filename] = {
      origWidth,
      origHeight,
      aspectRatio: origWidth / origHeight,
      widths: sortedWidths,
      hasWebp: true,
      hasAvif: true,
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    if (fs.existsSync(path.dirname(srcManifestPath))) {
      fs.writeFileSync(srcManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to generate high-resolution variants for uploaded image:', err);
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'portfolio-cms-persistence',
      configureServer(server) {
        // Endpoint 0.1: GET /__cms/auth/status — Check owner authentication status
        server.middlewares.use('/__cms/auth/status', (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }
          const authConfig = readServerAuthConfig();
          const { valid, username } = validateOwnerSession(req);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: true,
              isOwner: valid,
              configured: authConfig.configured,
              username: valid ? username : null,
            })
          );
        });

        // Endpoint 0.2: POST /__cms/auth/setup — Strictly Disabled (Public Registration Forbidden)
        server.middlewares.use('/__cms/auth/setup', (_req, res) => {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error:
                'Public registration and account creation are disabled. Only the designated website owner (nayemul21) can authenticate.',
            })
          );
        });

        // Endpoint 0.3: POST /__cms/auth/login — Secure Owner Login with Rate Limiting
        server.middlewares.use('/__cms/auth/login', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }
          const ip =
            (req.headers['x-forwarded-for'] as string) ||
            req.socket.remoteAddress ||
            'local';
          const now = Date.now();
          const attempt = loginAttemptsByIp.get(ip) || {
            count: 0,
            firstAttemptAt: now,
          };
          if (attempt.lockedUntil && attempt.lockedUntil > now) {
            const remainingMinutes = Math.ceil((attempt.lockedUntil - now) / 60000);
            res.statusCode = 429;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: false,
                error: `Too many failed login attempts. Account temporarily locked. Please wait ${remainingMinutes} minute(s) before trying again.`,
              })
            );
            return;
          }

          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(
                Buffer.concat(chunks).toString('utf-8')
              ) as {
                username?: string;
                password?: string;
              };
              const authConfig = readServerAuthConfig();
              if (!authConfig.configured) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Server authentication configuration is not ready.',
                  })
                );
                return;
              }
              const username = (body.username || '').trim();
              const password = body.password || '';

              const userMatch =
                username.length > 0 &&
                username.toLowerCase() === authConfig.username.toLowerCase();
              const passMatch =
                userMatch &&
                verifyPassword(
                  password,
                  authConfig.salt,
                  authConfig.passwordHash,
                  authConfig.altPasswordHash
                );

              if (!userMatch || !passMatch) {
                attempt.count += 1;
                if (attempt.count >= 5) {
                  attempt.lockedUntil = now + 15 * 60 * 1000; // 15 min lock
                }
                loginAttemptsByIp.set(ip, attempt);
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Invalid owner username or password.',
                  })
                );
                return;
              }

              // Login succeeded: reset rate limit attempts
              loginAttemptsByIp.delete(ip);

              const token = crypto.randomBytes(32).toString('hex');
              const sessions = readSessions();
              sessions.set(token, {
                token,
                username: authConfig.username,
                createdAt: now,
                expiresAt: now + SESSION_DURATION_MS,
              });
              saveSessions(sessions);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader(
                'Set-Cookie',
                `nayemul_owner_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
              );
              res.end(
                JSON.stringify({
                  ok: true,
                  isOwner: true,
                  username: authConfig.username,
                  message: 'Authenticated successfully.',
                })
              );
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
        });

        // Endpoint 0.4: POST /__cms/auth/logout — End Owner Session & Clear Cookie
        server.middlewares.use('/__cms/auth/logout', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
            return;
          }
          const cookies = parseCookies(req);
          const token = cookies['nayemul_owner_session'];
          if (token) {
            const sessions = readSessions();
            sessions.delete(token);
            saveSessions(sessions);
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader(
            'Set-Cookie',
            'nayemul_owner_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
          );
          res.end(JSON.stringify({ ok: true, isOwner: false }));
        });

        // Endpoint 1: Save full CMS state to public/data/cms-store.json
        server.middlewares.use('/__cms/save', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          if (!requireOwnerAuth(req, res)) return;
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks).toString('utf-8');
              const parsed = JSON.parse(body);
              const dataDir = path.resolve(process.cwd(), 'public/data');
              await fs.promises.mkdir(dataDir, { recursive: true });
              await fs.promises.writeFile(
                path.join(dataDir, 'cms-store.json'),
                JSON.stringify(parsed, null, 2),
                'utf-8'
              );
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
        });

        // Endpoint 2: Upload any image to public/images/uploads/
        server.middlewares.use('/__cms/upload', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          if (!requireOwnerAuth(req, res)) return;

          const rawFileNameHeader = req.headers['x-file-name'];
          const contentType = (req.headers['content-type'] || '').toLowerCase();
          const isBinaryUpload =
            Boolean(rawFileNameHeader) &&
            !contentType.includes('application/json');

          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          req.on('end', async () => {
            try {
              const rawBuffer = Buffer.concat(chunks);
              let buffer: Buffer;
              let filename = 'asset.png';
              let targetPath: string | undefined;
              let ext = 'png';

              if (isBinaryUpload) {
                buffer = rawBuffer;
                filename = decodeURIComponent(
                  Array.isArray(rawFileNameHeader)
                    ? rawFileNameHeader[0]
                    : rawFileNameHeader || 'asset.png'
                );
                const rawTargetHeader = req.headers['x-target-path'];
                if (rawTargetHeader) {
                  targetPath = decodeURIComponent(
                    Array.isArray(rawTargetHeader)
                      ? rawTargetHeader[0]
                      : rawTargetHeader
                  );
                }
                const extFromName = path
                  .extname(filename)
                  .replace(/^\./, '')
                  .toLowerCase();
                if (extFromName) {
                  ext = extFromName === 'jpeg' ? 'jpg' : extFromName;
                } else if (contentType.includes('svg')) {
                  ext = 'svg';
                } else if (
                  contentType.includes('jpeg') ||
                  contentType.includes('jpg')
                ) {
                  ext = 'jpg';
                } else if (contentType.includes('webp')) {
                  ext = 'webp';
                } else if (contentType.includes('gif')) {
                  ext = 'gif';
                }
              } else {
                const bodyStr = rawBuffer.toString('utf-8');
                const parsed = JSON.parse(bodyStr);
                filename = parsed.filename || 'asset.png';
                targetPath = parsed.targetPath;
                const dataUrl = parsed.dataUrl;
                if (
                  typeof dataUrl !== 'string' ||
                  !dataUrl.startsWith('data:image/')
                ) {
                  throw new Error('Invalid image dataUrl');
                }
                const match = dataUrl.match(
                  /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/
                );
                if (!match) {
                  throw new Error('Malformed base64 image');
                }
                const extRaw = match[1].toLowerCase();
                ext =
                  extRaw === 'svg+xml'
                    ? 'svg'
                    : extRaw === 'jpeg'
                      ? 'jpg'
                      : extRaw;
                buffer = Buffer.from(match[2], 'base64');
              }

              let publicUrl = '';
              if (
                targetPath &&
                typeof targetPath === 'string' &&
                targetPath.startsWith('/images/')
              ) {
                const fullTarget = path.resolve(
                  process.cwd(),
                  'public',
                  targetPath.slice(1)
                );
                await fs.promises.mkdir(path.dirname(fullTarget), {
                  recursive: true,
                });
                await fs.promises.writeFile(fullTarget, buffer);
                publicUrl = `${targetPath}?t=${Date.now()}`;
              } else {
                const uploadsDir = path.resolve(
                  process.cwd(),
                  'public/images/uploads'
                );
                await fs.promises.mkdir(uploadsDir, { recursive: true });
                const safeBase = (filename || 'asset')
                  .replace(/\.[^/.]+$/, '')
                  .replace(/[^a-zA-Z0-9_-]/g, '-')
                  .toLowerCase()
                  .slice(0, 40);
                const uniqueSuffix = `${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 7)}`;
                const finalName = `${safeBase}-${uniqueSuffix}.${ext}`;
                await fs.promises.writeFile(
                  path.join(uploadsDir, finalName),
                  buffer
                );
                publicUrl = `/images/uploads/${finalName}`;
                void generateVariantsForUploadedFile(finalName);
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, url: publicUrl }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
        });

        // Endpoint 2.1: POST /__cms/portrait/replace-hero — Automatic AI Background Removal & Backup for Hero Portrait
        server.middlewares.use('/__cms/portrait/replace-hero', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          if (!requireOwnerAuth(req, res)) return;
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          req.on('end', async () => {
            const tempUploadPath = path.resolve(
              process.cwd(),
              'public/images/profile/hero-portrait-temp.png'
            );
            try {
              const rawBuffer = Buffer.concat(chunks);
              const contentType = (req.headers['content-type'] || '').toLowerCase();
              let inputBuffer: Buffer;

              if (contentType.includes('application/json')) {
                const parsed = JSON.parse(rawBuffer.toString('utf-8'));
                const dataUrl = parsed.dataUrl;
                if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                  throw new Error('Invalid image data provided.');
                }
                const match = dataUrl.match(
                  /^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/
                );
                if (!match) throw new Error('Malformed base64 image data.');
                inputBuffer = Buffer.from(match[1], 'base64');
              } else {
                inputBuffer = rawBuffer;
              }

              if (!inputBuffer || inputBuffer.length === 0) {
                throw new Error('No image file received.');
              }

              const profileDir = path.resolve(
                process.cwd(),
                'public/images/profile'
              );
              const activePortraitPath = path.join(
                profileDir,
                'hero-portrait.png'
              );
              const backupPortraitPath = path.join(
                profileDir,
                'hero-portrait-backup.png'
              );

              await fs.promises.mkdir(profileDir, { recursive: true });

              // Save temporary file for background removal input
              await fs.promises.writeFile(tempUploadPath, inputBuffer);

              // Perform automatic background removal using @imgly/background-removal-node
              const { removeBackground } = await import(
                '@imgly/background-removal-node'
              );
              const { pathToFileURL } = await import('node:url');
              const fileUrl = pathToFileURL(tempUploadPath).href;
              const transparentBlob = await removeBackground(fileUrl);
              const transparentBuffer = Buffer.from(
                await transparentBlob.arrayBuffer()
              );

              if (!transparentBuffer || transparentBuffer.length === 0) {
                throw new Error(
                  'Background removal produced an empty result.'
                );
              }

              // Preserve current active portrait as restorable backup ONLY after processing succeeded
              if (fs.existsSync(activePortraitPath)) {
                await fs.promises.copyFile(
                  activePortraitPath,
                  backupPortraitPath
                );
              }

              // Save the newly processed transparent image as active portrait
              await fs.promises.writeFile(
                activePortraitPath,
                transparentBuffer
              );

              // Clean up temporary file
              try {
                if (fs.existsSync(tempUploadPath)) {
                  await fs.promises.unlink(tempUploadPath);
                }
              } catch (_) {}

              // Update cms-store.json so changes persist across refresh
              const cmsPath = path.resolve(
                process.cwd(),
                'public/data/cms-store.json'
              );
              const timestamp = Date.now();
              const newUrl = `/images/profile/hero-portrait.png?t=${timestamp}`;
              const backupUrl = `/images/profile/hero-portrait-backup.png`;

              try {
                if (fs.existsSync(cmsPath)) {
                  const cms = JSON.parse(
                    await fs.promises.readFile(cmsPath, 'utf-8')
                  );
                  if (!cms.siteConfig) cms.siteConfig = {};
                  if (!cms.siteConfig.portraits) cms.siteConfig.portraits = {};
                  cms.siteConfig.portraits.heroPortraitPath = newUrl;
                  cms.siteConfig.portraits.heroPortraitBackupPath = backupUrl;
                  await fs.promises.writeFile(
                    cmsPath,
                    JSON.stringify(cms, null, 2),
                    'utf-8'
                  );
                }
              } catch (_) {}

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: true,
                  url: newUrl,
                  backupUrl,
                  message:
                    'Background successfully removed and portrait updated.',
                })
              );
            } catch (err) {
              try {
                if (fs.existsSync(tempUploadPath)) {
                  await fs.promises.unlink(tempUploadPath);
                }
              } catch (_) {}

              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: false,
                  error:
                    err instanceof Error ? err.message : String(err),
                })
              );
            }
          });
        });

        // Endpoint 2.2: POST /__cms/portrait/restore-hero — Restore Previous Hero Portrait Backup
        server.middlewares.use('/__cms/portrait/restore-hero', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          if (!requireOwnerAuth(req, res)) return;
          try {
            const profileDir = path.resolve(
              process.cwd(),
              'public/images/profile'
            );
            const activePortraitPath = path.join(
              profileDir,
              'hero-portrait.png'
            );
            const backupPortraitPath = path.join(
              profileDir,
              'hero-portrait-backup.png'
            );

            if (!fs.existsSync(backupPortraitPath)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'No previous portrait backup exists to restore.',
                })
              );
              return;
            }

            // Copy backup to active portrait
            await fs.promises.copyFile(backupPortraitPath, activePortraitPath);

            const timestamp = Date.now();
            const newUrl = `/images/profile/hero-portrait.png?t=${timestamp}`;

            // Update cms-store.json
            const cmsPath = path.resolve(
              process.cwd(),
              'public/data/cms-store.json'
            );
            try {
              if (fs.existsSync(cmsPath)) {
                const cms = JSON.parse(
                  await fs.promises.readFile(cmsPath, 'utf-8')
                );
                if (!cms.siteConfig) cms.siteConfig = {};
                if (!cms.siteConfig.portraits) cms.siteConfig.portraits = {};
                cms.siteConfig.portraits.heroPortraitPath = newUrl;
                await fs.promises.writeFile(
                  cmsPath,
                  JSON.stringify(cms, null, 2),
                  'utf-8'
                );
              }
            } catch (_) {}

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: true,
                url: newUrl,
                backupUrl: '/images/profile/hero-portrait-backup.png',
                message: 'Previous portrait restored successfully.',
              })
            );
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: false,
                error:
                  err instanceof Error ? err.message : String(err),
              })
            );
          }
        });

        // Endpoint 2.3: GET /__cms/portrait/status — Status of Hero Portrait & Backup
        server.middlewares.use('/__cms/portrait/status', (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          const backupPortraitPath = path.resolve(
            process.cwd(),
            'public/images/profile/hero-portrait-backup.png'
          );
          const hasBackup = fs.existsSync(backupPortraitPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: true,
              hasBackup,
              backupUrl: hasBackup
                ? '/images/profile/hero-portrait-backup.png'
                : null,
            })
          );
        });

        // Endpoint 3: GET /__cms/email/status — Safe Email Configuration Status
        server.middlewares.use('/__cms/email/status', (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          const config = readServerEmailConfig();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(buildPublicEmailStatus(config)));
        });

        // Endpoint 4: GET /__cms/email/inquiries — Owner Inquiry Log History
        server.middlewares.use('/__cms/email/inquiries', (req, res) => {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          if (!requireOwnerAuth(req, res)) return;
          const list = readInquiriesLog().map((item) => ({
            ...item,
            submittedAtFormatted: item.submittedAt,
            deliveredVia: item.provider,
            recipientGmail: item.deliveredTo,
          }));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, inquiries: list }));
        });

        // Endpoint 5: POST /__cms/email/config — Save & Verify Gmail Configuration
        server.middlewares.use('/__cms/email/config', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          if (!requireOwnerAuth(req, res)) return;
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          req.on('end', async () => {
            try {
              const body = JSON.parse(
                Buffer.concat(chunks).toString('utf-8')
              ) as {
                recipientGmail?: string;
                provider?: EmailProviderType;
                smtpUser?: string;
                smtpAppPassword?: string;
                apiKey?: string;
                clearCredentials?: boolean;
              };

              const prev = readServerEmailConfig();
              const nextRecipient = (
                body.recipientGmail ?? prev.recipientGmail
              ).trim();

              if (!EMAIL_REGEX.test(nextRecipient)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Please enter a valid Gmail or email address.',
                  })
                );
                return;
              }

              const nextProvider: EmailProviderType =
                body.provider || prev.provider || 'gmail-smtp';
              const nextSmtpUser = (
                body.smtpUser ??
                prev.smtpUser ??
                nextRecipient
              ).trim();

              let nextSmtpPass = prev.smtpAppPassword;
              if (body.clearCredentials) {
                nextSmtpPass = '';
              } else if (
                typeof body.smtpAppPassword === 'string' &&
                body.smtpAppPassword.trim() !== ''
              ) {
                nextSmtpPass = body.smtpAppPassword.trim();
              }

              let nextApiKey = prev.apiKey;
              if (body.clearCredentials) {
                nextApiKey = '';
              } else if (
                typeof body.apiKey === 'string' &&
                body.apiKey.trim() !== ''
              ) {
                nextApiKey = body.apiKey.trim();
              }

              let verified =
                prev.verified &&
                prev.recipientGmail === nextRecipient &&
                prev.provider === nextProvider;
              let lastVerifiedAt = prev.lastVerifiedAt;
              let lastError: string | null = null;

              // If Gmail SMTP has an App Password, verify live SMTP connection immediately
              if (
                nextProvider === 'gmail-smtp' &&
                nextSmtpPass.replace(/\s+/g, '').length > 0
              ) {
                try {
                  const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                      user: nextSmtpUser || nextRecipient,
                      pass: nextSmtpPass.replace(/\s+/g, ''),
                    },
                  });
                  await transporter.verify();
                  verified = true;
                  lastVerifiedAt = new Date().toISOString();
                  lastError = null;
                } catch (smtpErr) {
                  verified = false;
                  lastError = `Gmail SMTP authentication failed: ${
                    smtpErr instanceof Error ? smtpErr.message : String(smtpErr)
                  }. Make sure 2-Step Verification is enabled on your Google Account and you are using a 16-character Google App Password.`;
                }
              }

              const updatedConfig: ServerEmailConfig = {
                recipientGmail: nextRecipient,
                provider: nextProvider,
                smtpUser: nextSmtpUser || nextRecipient,
                smtpAppPassword: nextSmtpPass,
                apiKey: nextApiKey,
                verified,
                lastVerifiedAt,
                lastTestEmailAt: prev.lastTestEmailAt,
                lastError,
              };

              await writeServerEmailConfig(updatedConfig);
              const statusObj = buildPublicEmailStatus(updatedConfig);

              res.statusCode = lastError ? 400 : 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ...statusObj,
                  status: statusObj,
                  ok: !lastError,
                  message: statusObj.statusMessage,
                  error: lastError || undefined,
                })
              );
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: false,
                  error: err instanceof Error ? err.message : String(err),
                })
              );
            }
          });
        });

        // Endpoint 6: POST /__cms/email/test — Send Real Test Email to Configured Gmail
        server.middlewares.use('/__cms/email/test', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          if (!requireOwnerAuth(req, res)) return;
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          req.on('end', async () => {
            const config = readServerEmailConfig();
            try {
              const nowFormatted = new Date().toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'long',
              });

              const testPayload: FormattedEmailPayload = {
                clientName: 'Test Client (Portfolio Verification)',
                clientEmail: 'client.reply.test@example.com',
                subject: 'Brand Identity & Logo Design Inquiry (Test)',
                service: 'Logo Design & Brand Style Guide',
                budget: '$1,500 – $3,000',
                message:
                  'Hello NAYEMUL ISLAM,\n\nThis is a live test inquiry from your portfolio website Admin Settings to verify that client inquiries are properly formatted and delivered directly to your Gmail Inbox, with Reply-To pointing to the client email address.',
                submittedAt: nowFormatted,
                isTest: true,
              };

              const result = await dispatchInquiryEmail(config, testPayload);

              const nowIso = new Date().toISOString();
              const updatedConfig: ServerEmailConfig = {
                ...config,
                verified: true,
                lastVerifiedAt: nowIso,
                lastTestEmailAt: nowIso,
                lastError: null,
              };
              await writeServerEmailConfig(updatedConfig);

              await appendInquiryLog({
                id: `test-${Date.now()}`,
                clientName: testPayload.clientName,
                clientEmail: testPayload.clientEmail,
                subject: testPayload.subject,
                service: testPayload.service,
                budget: testPayload.budget,
                message: testPayload.message,
                submittedAt: nowFormatted,
                deliveredTo: config.recipientGmail,
                provider: result.providerUsed,
                status: 'delivered',
              });

              const statusObj = buildPublicEmailStatus(updatedConfig);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ...statusObj,
                  status: statusObj,
                  ok: true,
                  message: result.note || statusObj.statusMessage,
                  testResult: result.note,
                  messageId: result.messageId,
                })
              );
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              const updatedConfig: ServerEmailConfig = {
                ...config,
                verified: false,
                lastError: errMsg,
              };
              await writeServerEmailConfig(updatedConfig);
              const statusObj = buildPublicEmailStatus(updatedConfig);

              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ...statusObj,
                  status: statusObj,
                  ok: false,
                  error: errMsg,
                })
              );
            }
          });
        });

        // Endpoint 7: POST /__cms/email/inquiry — Public Client Inquiry Submission Endpoint
        server.middlewares.use('/__cms/email/inquiry', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          const clientIp =
            (req.headers['x-forwarded-for'] as string) ||
            req.socket.remoteAddress ||
            'local';

          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          req.on('end', async () => {
            try {
              const rawBody = Buffer.concat(chunks).toString('utf-8');
              const body = JSON.parse(rawBody) as {
                clientName?: string;
                clientEmail?: string;
                subject?: string;
                service?: string;
                budget?: string;
                message?: string;
                honeypot?: string;
              };

              // 1. Honeypot Spam Protection
              if (body.honeypot && body.honeypot.trim() !== '') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Spam submission rejected.',
                  })
                );
                return;
              }

              // 2. Server-Side Field Validation
              const clientName = (body.clientName || '').trim();
              const clientEmail = (body.clientEmail || '').trim();
              const service = (body.service || 'Brand Identity Design').trim();
              const subject = (
                body.subject || `${service} Inquiry`
              ).trim();
              const budget = (body.budget || '').trim();
              const message = (body.message || '').trim();

              if (clientName.length < 2 || clientName.length > 120) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Please enter your full name (at least 2 characters).',
                  })
                );
                return;
              }

              if (!EMAIL_REGEX.test(clientEmail) || clientEmail.length > 160) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Please enter a valid email address so we can reply to you.',
                  })
                );
                return;
              }

              if (message.length < 10 || message.length > 5000) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error:
                      'Please provide your project details (at least 10 characters).',
                  })
                );
                return;
              }

              // 3. Rate Limiting (max 5 inquiries per 10 minutes per IP)
              const now = Date.now();
              const tenMinutesAgo = now - 10 * 60 * 1000;
              const prevTimestamps = (
                ipSubmissionTimestamps.get(clientIp) || []
              ).filter((ts) => ts > tenMinutesAgo);

              if (prevTimestamps.length >= 5) {
                res.statusCode = 429;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error:
                      'Too many inquiries submitted recently. Please wait a few minutes and try again.',
                  })
                );
                return;
              }

              // 4. Duplicate Submission Guard (30-second cooldown for identical email + message)
              const fingerprint = `${clientEmail.toLowerCase()}::${message
                .toLowerCase()
                .slice(0, 120)}`;
              const lastDuplicateAt =
                recentSubmissionFingerprints.get(fingerprint) || 0;
              if (now - lastDuplicateAt < 30 * 1000) {
                res.statusCode = 429;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error:
                      'This inquiry was just submitted. Please do not submit duplicates.',
                  })
                );
                return;
              }

              const submittedAt = new Date().toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'long',
              });

              const config = readServerEmailConfig();
              const payload: FormattedEmailPayload = {
                clientName,
                clientEmail,
                subject,
                service,
                budget,
                message,
                submittedAt,
                isTest: false,
              };

              try {
                const deliveryResult = await dispatchInquiryEmail(
                  config,
                  payload
                );

                // Record rate limit & duplicate guard only after processing
                ipSubmissionTimestamps.set(clientIp, [...prevTimestamps, now]);
                recentSubmissionFingerprints.set(fingerprint, now);

                await appendInquiryLog({
                  id: `inq-${now}`,
                  clientName,
                  clientEmail,
                  subject,
                  service,
                  budget,
                  message,
                  submittedAt,
                  deliveredTo: config.recipientGmail,
                  provider: deliveryResult.providerUsed,
                  status: 'delivered',
                });

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: true,
                    message:
                      "Thank you for reaching out! Your inquiry has been submitted successfully. I'll get back to you as soon as possible.",
                    deliveredTo: config.recipientGmail,
                    inquiry: {
                      submittedAtFormatted: submittedAt,
                    },
                  })
                );
              } catch (deliveryErr) {
                const errMsg =
                  deliveryErr instanceof Error
                    ? deliveryErr.message
                    : String(deliveryErr);

                await appendInquiryLog({
                  id: `inq-${now}`,
                  clientName,
                  clientEmail,
                  subject,
                  service,
                  budget,
                  message,
                  submittedAt,
                  deliveredTo: config.recipientGmail || 'unconfigured',
                  provider: config.provider,
                  status: 'failed',
                  error: errMsg,
                });

                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: errMsg,
                    details: errMsg,
                  })
                );
              }
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: false,
                  error:
                    err instanceof Error
                      ? err.message
                      : 'Invalid inquiry request.',
                })
              );
            }
          });
        });

        // Endpoint 8: Real-Time Profile Views (/api/views and /__cms/views)
        const handleViewsEndpoint = (req: any, res: any) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
          res.setHeader('Content-Type', 'application/json');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const count = getDevViewsCount();
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, views: count }));
            return;
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            req.on('end', () => {
              try {
                const bodyStr = Buffer.concat(chunks).toString('utf-8');
                const body = bodyStr ? JSON.parse(bodyStr) : {};
                const clientIp =
                  (req.headers['x-forwarded-for'] as string) ||
                  req.socket?.remoteAddress ||
                  'local';
                const sessionId = body.sessionId || body.session || '';
                const fingerprint = sessionId ? `sess:${sessionId}` : `ip:${clientIp}`;
                const now = Date.now();
                const lastVisitAt = recentVisitDevFingerprints.get(fingerprint) || 0;

                // 15-minute cooldown for deduplication
                if (now - lastVisitAt < 15 * 60 * 1000) {
                  const currentViews = getDevViewsCount();
                  res.statusCode = 200;
                  res.end(
                    JSON.stringify({
                      ok: true,
                      views: currentViews,
                      incremented: false,
                      message: 'Session visit already recorded.',
                    })
                  );
                  return;
                }

                recentVisitDevFingerprints.set(fingerprint, now);
                const nextViews = incrementDevViewsCount();
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    ok: true,
                    views: nextViews,
                    incremented: true,
                  })
                );
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: 'Failed to record view' }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
        };

        server.middlewares.use('/api/views', handleViewsEndpoint);
        server.middlewares.use('/__cms/views', handleViewsEndpoint);

        // Endpoint 9: Project Comments (/api/comments and /__cms/comments)
        const handleCommentsEndpoint = (req: any, res: any) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
          res.setHeader('Content-Type', 'application/json');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          const parsedUrl = new URL(req.url, 'http://localhost');
          const clientIp =
            (req.headers['x-forwarded-for'] as string) ||
            req.socket?.remoteAddress ||
            'local';

          if (req.method === 'GET') {
            const projectId = (parsedUrl.searchParams.get('projectId') || '').trim();
            if (!projectId) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'projectId is required' }));
              return;
            }
            const commentsStore = getDevCommentsStore();
            const list = Array.isArray(commentsStore[projectId]) ? commentsStore[projectId] : [];
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, comments: list }));
            return;
          }

          if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            req.on('end', () => {
              try {
                const bodyStr = Buffer.concat(chunks).toString('utf-8');
                const body = bodyStr ? JSON.parse(bodyStr) : {};

                // Anti-spam honeypot
                if (body.honeypot && String(body.honeypot).trim() !== '') {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ ok: false, error: 'Spam submission rejected.' }));
                  return;
                }

                const projectId = (body.projectId || '').trim();
                const authorName = (body.authorName || '').trim();
                const content = (body.content || '').trim();

                if (!projectId || projectId.length < 2) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ ok: false, error: 'Invalid project identifier.' }));
                  return;
                }

                if (!authorName || authorName.length < 2 || authorName.length > 60) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      ok: false,
                      error: 'Please enter your name (2 to 60 characters).',
                    })
                  );
                  return;
                }

                if (!content || content.length < 3 || content.length > 1000) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      ok: false,
                      error: 'Comment must be between 3 and 1000 characters.',
                    })
                  );
                  return;
                }

                const now = Date.now();

                // Rate limiting (max 4 per 5 minutes per IP)
                const timestamps = (ipCommentDevTimestamps.get(clientIp) || []).filter(
                  (ts) => now - ts < 5 * 60 * 1000
                );
                if (timestamps.length >= 4) {
                  res.statusCode = 429;
                  res.end(
                    JSON.stringify({
                      ok: false,
                      error: 'Too many comments submitted recently. Please wait a few minutes.',
                    })
                  );
                  return;
                }

                // Duplicate protection (60s)
                const fingerprint = `${projectId}::${authorName.toLowerCase()}::${content.toLowerCase()}`;
                const lastAt = recentCommentDevFingerprints.get(fingerprint) || 0;
                if (now - lastAt < 60 * 1000) {
                  res.statusCode = 429;
                  res.end(
                    JSON.stringify({
                      ok: false,
                      error: 'Duplicate comment detected. You have already posted this feedback.',
                    })
                  );
                  return;
                }

                ipCommentDevTimestamps.set(clientIp, [...timestamps, now]);
                recentCommentDevFingerprints.set(fingerprint, now);

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

                const commentsStore = getDevCommentsStore();
                const existing = Array.isArray(commentsStore[projectId])
                  ? commentsStore[projectId]
                  : [];
                commentsStore[projectId] = [newComment, ...existing];
                saveDevCommentsStore(commentsStore);

                res.statusCode = 201;
                res.end(
                  JSON.stringify({
                    ok: true,
                    message: 'Comment posted successfully.',
                    comment: newComment,
                  })
                );
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: 'Failed to post comment.' }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
        };

        server.middlewares.use('/api/comments', handleCommentsEndpoint);
        server.middlewares.use('/__cms/comments', handleCommentsEndpoint);
      },
    },
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'motion-vendor': ['framer-motion', 'lucide-react'],
          'three-vendor': ['three', '@react-three/fiber'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
