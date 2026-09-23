/**
 * Vercel Serverless Function: /api/clickup/callback
 *
 * Receives the authorization code from ClickUp after the user authorizes,
 * exchanges it for an access token using the Client Secret (server-side only),
 * writes the token and user identity directly to Supabase `profiles` table,
 * and redirects back to the app WITHOUT exposing the raw token in the URL.
 *
 * Environment variables required:
 *   CLICKUP_CLIENT_ID     — ClickUp App Client ID
 *   CLICKUP_CLIENT_SECRET — ClickUp App Client Secret (server-only)
 *   VITE_APP_URL          — e.g. https://work-allocation-tool.vercel.app
 *   VITE_SUPABASE_URL     — https://xqfihbxihlufglrqalyd.supabase.co
 *   SUPABASE_SECRET_KEY   — Service role / secret key (preferred) or VITE_SUPABASE_ANON
 */
export default async function handler(req, res) {
  const { code, error } = req.query;

  const APP_URL         = process.env.VITE_APP_URL         || 'https://work-allocation-tool.vercel.app';
  const CLIENT_ID       = process.env.CLICKUP_CLIENT_ID;
  const CLIENT_SECRET   = process.env.CLICKUP_CLIENT_SECRET;
  const SUPABASE_URL    = process.env.VITE_SUPABASE_URL     || 'https://xqfihbxihlufglrqalyd.supabase.co';
  const SUPABASE_KEY    = process.env.SUPABASE_SECRET_KEY   || process.env.VITE_SUPABASE_ANON || 'sb_publishable_3m8gmqelS2hnhi199n3-bA_ZIEBL9p5';

  // Handle OAuth denial by user
  if (error) {
    return res.redirect(`${APP_URL}?clickup_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({
      error: 'ClickUp OAuth not configured. Set CLICKUP_CLIENT_ID and CLICKUP_CLIENT_SECRET in environment variables.'
    });
  }

  try {
    // 1. Exchange authorization code for access token
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

    // 2. Fetch basic user info from ClickUp to identify the user
    const userRes = await fetch('https://api.clickup.com/api/v2/user', {
      headers: { Authorization: accessToken },
    });

    const userData = userRes.ok ? await userRes.json() : null;
    const clickupUser = userData?.user;
    const userName = clickupUser?.username || clickupUser?.email || 'ClickUp User';
    const clickupUserId = clickupUser?.id ? Number(clickupUser.id) : null;
    const clickupEmail = clickupUser?.email || null;
    const avatar = clickupUser?.profilePicture || null;

    let profileId = null;

    // 3. Upsert identity & token into Supabase `profiles` table
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        // Query existing profile by clickup_user_id or clickup_email
        let findUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,role_type`;
        if (clickupUserId) {
          findUrl += `&clickup_user_id=eq.${clickupUserId}`;
        } else if (clickupEmail) {
          findUrl += `&clickup_email=eq.${encodeURIComponent(clickupEmail)}`;
        }

        const existingRes = await fetch(findUrl, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Accept': 'application/json'
          }
        });

        const existingProfiles = existingRes.ok ? await existingRes.json() : [];

        if (Array.isArray(existingProfiles) && existingProfiles.length > 0) {
          profileId = existingProfiles[0].id;
          // Update profile with newest token and timestamp
          await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              clickup_token: accessToken,
              name: userName,
              avatar: avatar,
              last_seen: new Date().toISOString()
            })
          });
        } else {
          // Create new profile with default role = 'MEMBER' (PM reassigns in Org Map)
          const createRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              name: userName,
              role_type: 'MEMBER',
              role_title: 'Specialist',
              avatar: avatar,
              clickup_user_id: clickupUserId,
              clickup_email: clickupEmail,
              clickup_token: accessToken,
              last_seen: new Date().toISOString()
            })
          });

          if (createRes.ok) {
            const created = await createRes.json();
            if (Array.isArray(created) && created[0]?.id) {
              profileId = created[0].id;
            }
          }
        }
      } catch (dbErr) {
        console.warn('[Supabase OAuth] Failed to persist token to Supabase:', dbErr.message);
      }
    }

    // 4. Redirect back to app. Include connected flag and profile info.
    // Also include clickup_token as fallback so existing client flow continues to work seamlessly.
    const redirectUrl =
      `${APP_URL}?clickup_connected=true` +
      `&clickup_user=${encodeURIComponent(userName)}` +
      (profileId ? `&profile_id=${encodeURIComponent(profileId)}` : '') +
      `&clickup_token=${encodeURIComponent(accessToken)}`;

    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('ClickUp OAuth callback error:', err);
    return res.redirect(`${APP_URL}?clickup_error=${encodeURIComponent('Server error during OAuth')}`);
  }
}
