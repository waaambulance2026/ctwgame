function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

function cleanName(value) {
  const name = String(value || 'level_1').trim().replace(/[^a-z0-9_\- ]/gi, '_').slice(0, 80);
  return name || 'level_1';
}

function getStore(env) {
  return env.CTW_GAME_LEVELS || env.CTW_LEVELS || env.LEVELS || null;
}

function requireAdmin(env, body) {
  const expected = String(env.CTW_GAME_ADMIN_KEY || '').trim();
  const supplied = String(body.admin_key || body.key || body.password || '').trim();
  if (!expected) return { ok: false, status: 500, error: 'CTW_GAME_ADMIN_KEY is not set in Cloudflare Pages environment variables.' };
  if (!supplied) return { ok: false, status: 400, error: 'Enter the Builder admin key.' };
  if (supplied !== expected) return { ok: false, status: 403, error: 'Wrong Builder admin key.' };
  return { ok: true };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return json({ ok: true });

  const store = getStore(env);
  if (!store) {
    return json({
      ok: false,
      error: 'KV namespace is not bound. In Cloudflare Pages, bind a KV namespace called CTW_GAME_LEVELS.'
    }, 500);
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const name = cleanName(url.searchParams.get('name'));
    const raw = await store.get('ctw_level:' + name);
    if (!raw) return json({ ok: false, error: 'No cloud level found with that name.', name }, 404);
    try {
      const pack = JSON.parse(raw);
      return json({ ok: true, name, pack, savedAt: pack.savedAt || null });
    } catch (err) {
      return json({ ok: false, error: 'Saved cloud level is not valid JSON.', name }, 500);
    }
  }

  if (request.method === 'POST') {
    let body = {};
    try { body = await request.json(); }
    catch (err) { return json({ ok: false, error: 'Invalid JSON body.' }, 400); }

    const admin = requireAdmin(env, body);
    if (!admin.ok) return json({ ok: false, error: admin.error }, admin.status);

    const name = cleanName(body.name);
    const pack = {
      version: body.version || 'ctw-game',
      name,
      savedAt: new Date().toISOString(),
      level: body.level || { layers: [], objects: [] },
      player: body.player || null,
      anim: body.anim || null
    };

    if (!pack.level || !Array.isArray(pack.level.layers) || !Array.isArray(pack.level.objects)) {
      return json({ ok: false, error: 'Level must contain level.layers and level.objects arrays.' }, 400);
    }

    await store.put('ctw_level:' + name, JSON.stringify(pack));
    return json({ ok: true, name, savedAt: pack.savedAt });
  }

  return json({ ok: false, error: 'Method not allowed.' }, 405);
}
