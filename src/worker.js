const jsonResponse = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

const allowCors = (origin, allowedOrigin) => {
  if (!origin || origin !== allowedOrigin) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
};

const base64UrlEncode = (input) =>
  btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const base64UrlEncodeString = (input) =>
  btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const pemToArrayBuffer = (pem) => {
  const clean = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const createAppJwt = async (appId, privateKeyPem) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId
  };

  const headerPart = base64UrlEncodeString(JSON.stringify(header));
  const payloadPart = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${headerPart}.${payloadPart}`;

  const keyData = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
};

const getInstallationToken = async (env) => {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_INSTALLATION_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error('GitHub App credentials are not configured.');
  }

  const jwt = await createAppJwt(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY);
  const response = await fetch(
    `https://api.github.com/app/installations/${env.GITHUB_APP_INSTALLATION_ID}/access_tokens`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'harpertoken-welcome-bot'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create installation token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.token;
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = allowCors(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405, corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON.' }, 400, corsHeaders);
    }

    const github = String(payload.github || '').replace(/^@/, '').trim();
    const name = String(payload.name || '').trim();
    const note = String(payload.note || '').trim();
    const link = String(payload.link || '').trim();
    const trap = String(payload.company || '').trim();

    if (!github || !name) {
      return jsonResponse({ error: 'GitHub username and name are required.' }, 400, corsHeaders);
    }
    if (trap) {
      return jsonResponse({ error: 'Invalid request.' }, 400, corsHeaders);
    }

    const issueTitle = `Welcome: ${name} (@${github})`;
    const issueBodyLines = [
      `Welcome @${github}!`,
      '',
      `**Name:** ${name}`,
      note ? `**Intro:** ${note}` : null,
      link ? `**Link:** ${link}` : null,
      '',
      'Thanks for stopping by. A maintainer will respond shortly.',
      '',
      '### A few quick questions',
      '- What are you working on right now?',
      '- How did you find Harper?',
      '- Anything you want to build or collaborate on?'
    ].filter(Boolean);

    let issueResponse;
    try {
      const installationToken = await getInstallationToken(env);
      issueResponse = await fetch(
        `https://api.github.com/repos/${env.WELCOME_OWNER}/${env.WELCOME_REPO}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${installationToken}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'harpertoken-welcome-bot'
          },
          body: JSON.stringify({
            title: issueTitle,
            body: issueBodyLines.join('\n'),
            labels: (env.WELCOME_LABELS || '')
              .split(',')
              .map(label => label.trim())
              .filter(Boolean),
            assignees: (env.WELCOME_ASSIGNEES || '')
              .split(',')
              .map(user => user.trim())
              .filter(Boolean)
          })
        }
      );
    } catch (error) {
      console.log('GitHub App token error:', error?.message || error);
      return jsonResponse({ error: 'Failed to authenticate GitHub App.' }, 500, corsHeaders);
    }

    if (!issueResponse.ok) {
      const errorText = await issueResponse.text();
      console.log('GitHub issue create failed:', issueResponse.status, errorText);
      return jsonResponse(
        { error: 'Failed to create issue.', details: errorText },
        issueResponse.status,
        corsHeaders
      );
    }

    const issueData = await issueResponse.json();
    console.log('GitHub issue created:', issueData.html_url);
    return jsonResponse(
      { issue_url: issueData.html_url, issue_number: issueData.number },
      201,
      corsHeaders
    );
  }
};
