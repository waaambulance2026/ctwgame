const DEFAULT_PETBOT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwZgX5P6tj9_DeO4srLAwCtkgE_OMCzXt-51l5p_GjHEfDErAmBHjE5XVn_NCcTrNO/exec';

// These are read/display modes only. Care/write actions should only be added here
// once you are ready for the Tamagotchi buttons to update the real PetBot sheet.
const ALLOWED_READ_MODES = new Set([
  'pet_profile_compact',
  'view_pets',
  'view_inventory',
  'view_shop',
  'view_pet_coins',
  'care_item_menu',
  'view_hook_prizes',
  'view_hook_collection',
  'get_hook_waaambulance',
  'quest_stats',
  'view_habitat',
  'view_traits',
  'view_skills',
  'view_effects',
  'view_relationships'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

function upstreamUrl(env) {
  return (env.PETBOT_APPS_SCRIPT_URL || DEFAULT_PETBOT_APPS_SCRIPT_URL || '').trim();
}

function makePayload(url, env) {
  const mode = (url.searchParams.get('mode') || 'view_pets').trim();
  const payload = { mode };
  const key = (env.PETBOT_API_KEY || '').trim();
  if (key) payload.api_key = key;
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== 'api_key') payload[k] = v;
  }
  return payload;
}

async function readJsonishResponse(res) {
  const text = await res.text();
  try { return { data: JSON.parse(text), text }; }
  catch (e) { return { data: null, text }; }
}

function addQuery(url, payload, env) {
  const u = new URL(url);
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') u.searchParams.set(k, String(v));
  });
  const key = (env.PETBOT_API_KEY || '').trim();
  if (key) u.searchParams.set('api_key', key);
  return u.toString();
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return json({ ok: true });
  if (request.method !== 'GET') {
    return json({ found: false, response: 'PetBot proxy only accepts GET from the game.' }, 405);
  }

  const url = new URL(request.url);
  const payload = makePayload(url, env);
  const mode = payload.mode;

  if (!ALLOWED_READ_MODES.has(mode)) {
    return json({
      found: false,
      response: 'Blocked mode. This proxy is currently read/display only.',
      blocked_mode: mode
    }, 403);
  }

  const appUrl = upstreamUrl(env);
  if (!appUrl) {
    return json({
      found: false,
      response: 'PetBot proxy is not configured. Add PETBOT_APPS_SCRIPT_URL or use the built-in default Apps Script URL.'
    }, 500);
  }

  // Your current Discord PetBot works through the Google Apps Script /exec URL.
  // Try POST JSON first because BotGhost/PetBot backends often use that shape.
  let postText = '';
  try {
    const upstream = await fetch(appUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const parsed = await readJsonishResponse(upstream);
    postText = parsed.text || '';
    if (parsed.data) {
      parsed.data.proxy_mode = 'apps_script_post';
      parsed.data.proxy_allowed_mode = mode;
      parsed.data.proxy_upstream_status = upstream.status;
      return json(parsed.data, upstream.ok ? 200 : 502);
    }
  } catch (err) {
    postText = 'POST failed: ' + err.message;
  }

  // Some Apps Script web apps only read e.parameter from GET, so fall back to GET.
  try {
    const getUrl = addQuery(appUrl, payload, env);
    const upstream = await fetch(getUrl, { method: 'GET', redirect: 'follow' });
    const parsed = await readJsonishResponse(upstream);
    if (parsed.data) {
      parsed.data.proxy_mode = 'apps_script_get';
      parsed.data.proxy_allowed_mode = mode;
      parsed.data.proxy_upstream_status = upstream.status;
      return json(parsed.data, upstream.ok ? 200 : 502);
    }
    return json({
      found: false,
      response: 'PetBot Apps Script did not return JSON.',
      upstream_status: upstream.status,
      post_preview: postText.slice(0, 240),
      get_preview: (parsed.text || '').slice(0, 240)
    }, 502);
  } catch (err) {
    return json({
      found: false,
      response: 'Could not contact PetBot Apps Script: ' + err.message,
      post_preview: postText.slice(0, 240)
    }, 502);
  }
}
