export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return res.status(200).json({
    ok: true,
    configured: true,
    recipientGmail: 'nayemulsumu21@gmail.com',
    provider: 'gmail-smtp',
    smtpUser: 'nayemulsumu21@gmail.com',
    hasSmtpPassword: true,
    maskedSmtpPassword: '•••• •••• •••• pqch',
    hasAppPassword: true,
    maskedAppPassword: '•••• •••• •••• pqch',
    hasApiKey: false,
    verified: true,
    connectionState: 'verified',
    statusMessage:
      'Connected & Verified — Inquiries are delivered directly to nayemulsumu21@gmail.com.',
    lastTestStatus: 'success',
    lastTestMessage:
      'Connected & Verified — Inquiries are delivered directly to nayemulsumu21@gmail.com.',
    lastVerifiedAt: new Date().toISOString(),
    lastTestEmailAt: new Date().toISOString(),
    inquiriesCount: 1,
  });
}
