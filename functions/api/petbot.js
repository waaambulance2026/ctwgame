const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwZgX5P6tj9_DeO4srLAwCtkgE_OMCzXt-51l5p_GjHEfDErAmBHjE5XVn_NCcTrNO/exec';

const ALLOWED_READ_MODES = new Set([
  'pet_profile_compact','view_pets','view_inventory','view_shop','view_pet_coins','care_item_menu',
  'view_hook_prizes','view_hook_collection','get_hook_waaambulance','quest_stats','profile','inventory',
  'traits','skills','effects','coins','habitat','view_habitat','quests','miniQuestLogs','shop','careMenu','hookCollection'
]);

const ALLOWED_WRITE_MODES = new Set([
  'buy_item','shop_buy','purchase_item','use_inventory_item','feed_pet','play_pet','rest_pet','heal_pet','train_pet',
  'play_hook_waaambulance','hook_waaambulance','get_hook_waaambulance','log_hook_drop','add_to_inventory'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type,x-admin-key'
    }
  });
}

async function readUpstreamText(res){
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return { response: text }; }
}

async function readPayload(request, url){
  let body = {};
  if (request.method === 'POST') {
    try { body = await request.clone().json(); } catch(e) { body = {}; }
  }
  const payload = { ...body };
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'api_key' && payload[key] == null) payload[key] = value;
  }
  payload.mode = String(payload.mode || url.searchParams.get('mode') || 'view_pets').trim();
  return payload;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return json({ ok: true });

  const url = new URL(request.url);
  const payload = await readPayload(request, url);
  const mode = payload.mode;
  const isRead = ALLOWED_READ_MODES.has(mode);
  const isWrite = ALLOWED_WRITE_MODES.has(mode);

  if (!isRead && !isWrite) {
    return json({ found: false, response: 'Blocked mode. This proxy only allows known PetBot app modes.', blocked_mode: mode }, 403);
  }

  const appsUrl = env.PETBOT_APPS_SCRIPT_URL || APPS_SCRIPT_URL;
  if (env.PETBOT_API_KEY) payload.api_key = env.PETBOT_API_KEY;

  let upstream;
  let data;
  try {
    upstream = await fetch(appsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept':'application/json,text/plain,*/*' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    data = await readUpstreamText(upstream);
  } catch (postErr) {
    try {
      const getUrl = new URL(appsUrl);
      for (const [key, value] of Object.entries(payload)) getUrl.searchParams.set(key, String(value));
      upstream = await fetch(getUrl.toString(), { method: 'GET', headers: { 'accept': 'application/json,text/plain,*/*' }, redirect: 'follow' });
      data = await readUpstreamText(upstream);
      data.proxy_fallback = 'get_after_post_failed';
    } catch (getErr) {
      return json({ found: false, response: 'Could not contact PetBot Apps Script.', post_error: postErr.message, get_error: getErr.message }, 502);
    }
  }

  if (!data || typeof data !== 'object') data = { response: String(data || '') };
  data.proxy_mode = isWrite ? 'read_write' : 'read_only';
  data.proxy_allowed_mode = mode;
  data.proxy_upstream_status = upstream ? upstream.status : 0;
  return json(data, upstream && upstream.ok ? 200 : 502);
}
