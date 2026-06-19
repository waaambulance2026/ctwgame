export async function onRequestGet(context) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  };
  try {
    const kv = context.env.CTW_GAME_CONFIG;
    if (!kv) {
      return new Response(JSON.stringify({ ok:false, error:'KV binding CTW_GAME_CONFIG is missing.' }), { status:500, headers });
    }
    const saved = await kv.get('game_config');
    if (!saved) {
      return new Response(JSON.stringify({ ok:true, source:'empty', config:null }), { status:200, headers });
    }
    let config;
    try { config = JSON.parse(saved); }
    catch (err) { return new Response(JSON.stringify({ ok:false, error:'Saved config is not valid JSON.' }), { status:500, headers }); }
    return new Response(JSON.stringify({ ok:true, source:'kv', config }), { status:200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok:false, error:String(err && err.message || err) }), { status:500, headers });
  }
}
