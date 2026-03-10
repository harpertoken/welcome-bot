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

    const issueResponse = await fetch(
      `https://api.github.com/repos/${env.WELCOME_OWNER}/${env.WELCOME_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
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
