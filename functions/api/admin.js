function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return json({ ok: true });
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Admin check only allows POST.' }, 405);
  }

  if (!env.CTW_GAME_ADMIN_KEY) {
    return json({
      ok: false,
      error: 'CTW_GAME_ADMIN_KEY is not set in Cloudflare Pages environment variables.'
    }, 500);
  }

  let body = {};
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const supplied = String(body.admin_key || body.key || body.password || '').trim();
  const expected = String(env.CTW_GAME_ADMIN_KEY || '').trim();

  if (!supplied) return json({ ok: false, error: 'Enter the Builder admin key.' }, 400);
  if (supplied !== expected) return json({ ok: false, error: 'Wrong Builder admin key.' }, 403);

  return json({ ok: true, unlocked: true });
}
