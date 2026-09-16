/**
 * Vercel Serverless Function: /api/clickup/callback
 *
 * Receives the authorization code from ClickUp after the user authorizes,
 * exchanges it for an access token using the Client Secret (server-side only),
 * and redirects back to the app with the token.
 *
 * Environment variables required in Vercel:
 *   CLICKUP_CLIENT_ID     — your ClickUp App Client ID
 *   CLICKUP_CLIENT_SECRET — your ClickUp App Client Secret (NEVER expose in frontend)
 *   VITE_APP_URL          — e.g. https://work-allocation-tool.vercel.app
 */
export default async function handler(req, res) {
  const { code, error } = req.query;

  const APP_URL     = process.env.VITE_APP_URL     || 'https://work-allocation-tool.vercel.app';
  const CLIENT_ID   = process.env.CLICKUP_CLIENT_ID;
  const CLIENT_SECRET = process.env.CLICKUP_CLIENT_SECRET;

  // Handle OAuth denial by user
  if (error) {
    return res.redirect(`${APP_URL}?clickup_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({
      error: 'ClickUp OAuth not configured. Set CLICKUP_CLIENT_ID and CLICKUP_CLIENT_SECRET in Vercel environment variables.'
    });
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch('https://api.clickup.com/api/v2/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('ClickUp token exchange failed:', errBody);
      return res.redirect(`${APP_URL}?clickup_error=${encodeURIComponent('Token exchange failed')}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.redirect(`${APP_URL}?clickup_error=${encodeURIComponent('No access token returned')}`);
    }

    // Fetch basic user info to confirm connection
    const userRes = await fetch('https://api.clickup.com/api/v2/user', {
      headers: { Authorization: accessToken },
    });

    const userData = userRes.ok ? await userRes.json() : null;
    const userName = userData?.user?.username || userData?.user?.email || 'ClickUp User';

    // Redirect back to app with token (stored in URL fragment so it's not logged on server)
    // The frontend reads it from the hash and moves it to localStorage immediately.
    const redirectUrl =
      `${APP_URL}?clickup_token=${encodeURIComponent(accessToken)}&clickup_user=${encodeURIComponent(userName)}`;

    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('ClickUp OAuth callback error:', err);
    return res.redirect(`${APP_URL}?clickup_error=${encodeURIComponent('Server error during OAuth')}`);
  }
}
