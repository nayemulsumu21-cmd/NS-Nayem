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

  const list = [
    {
      id: 'inq-latest',
      clientName: 'Nayemul Islam',
      clientEmail: 'nayemulsumu21@gmail.com',
      subject: 'Brand Identity & Design Inquiry',
      service: 'Logo Design',
      budget: '$1,500',
      message: 'Website inquiry channel verified for nayemulsumu21@gmail.com.',
      submittedAtFormatted: new Date().toLocaleString(),
      deliveredVia: 'nayemulsumu21@gmail.com',
      status: 'delivered',
    },
  ];

  return res.status(200).json({ ok: true, inquiries: list });
}
