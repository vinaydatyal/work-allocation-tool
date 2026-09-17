/**
 * Vercel Serverless Function: /api/clickup/proxy
 * Proxies ClickUp API v2 requests from the frontend to avoid browser CORS restrictions.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const { endpoint } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  // Forward any additional query params to ClickUp
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'endpoint') {
      if (Array.isArray(value)) {
        value.forEach((v) => queryParams.append(key, v));
      } else {
        queryParams.set(key, value);
      }
    }
  }

  const queryString = queryParams.toString();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `https://api.clickup.com/api/v2${normalizedEndpoint}${
    queryString ? (normalizedEndpoint.includes('?') ? '&' : '?') + queryString : ''
  }`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const cuRes = await fetch(targetUrl, fetchOptions);
    const data = await cuRes.json().catch(() => ({}));
    return res.status(cuRes.status).json(data);
  } catch (err) {
    console.error('ClickUp API proxy error:', err);
    return res.status(500).json({ error: 'Failed to communicate with ClickUp API' });
  }
}
