export async function onRequestPost(context) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  };
  try {
    const kv = context.env.CTW_GAME_CONFIG;
    if (!kv) {
      return new Response(JSON.stringify({ ok:false, error:'KV binding CTW_GAME_CONFIG is missing.' }), { status:500, headers });
    }
    const expected = context.env.CTW_GAME_ADMIN_KEY;
    const given = context.request.headers.get('x-admin-key') || '';
    if (!expected || given !== expected) {
      return new Response(JSON.stringify({ ok:false, error:'Forbidden: admin key is wrong or missing.' }), { status:403, headers });
    }
    const body = await context.request.json();
    const config = body && body.config ? body.config : body;
    if (!config || typeof config !== 'object') {
      return new Response(JSON.stringify({ ok:false, error:'No config object received.' }), { status:400, headers });
    }
    config.savedAt = new Date().toISOString();
    await kv.put('game_config', JSON.stringify(config, null, 2));
    return new Response(JSON.stringify({ ok:true, savedAt:config.savedAt }), { status:200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok:false, error:String(err && err.message || err) }), { status:500, headers });
  }
}
