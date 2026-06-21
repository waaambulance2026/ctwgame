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
  'quest_stats'
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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return json({ ok: true });
  if (request.method !== 'GET') {
    return json({ found: false, response: 'Read-only proxy only allows GET.' }, 405);
  }

  const url = new URL(request.url);
  const mode = (url.searchParams.get('mode') || '').trim();

  if (!ALLOWED_READ_MODES.has(mode)) {
    return json({
      found: false,
      response: 'Blocked mode. This proxy only allows read/view Petbot modes.',
      blocked_mode: mode
    }, 403);
  }

  if (!env.PETBOT_APPS_SCRIPT_URL || !env.PETBOT_API_KEY) {
    return json({
      found: false,
      response: 'Petbot proxy is not configured. Add PETBOT_APPS_SCRIPT_URL and PETBOT_API_KEY in Cloudflare Pages environment variables.'
    }, 500);
  }

  const payload = { mode, api_key: env.PETBOT_API_KEY };
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'mode' && key !== 'api_key') payload[key] = value;
  }

  const upstream = await fetch(env.PETBOT_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); }
  catch (err) {
    return json({ found: false, response: 'Petbot Apps Script did not return JSON.', upstream_status: upstream.status }, 502);
  }

  data.proxy_mode = 'read_only';
  data.proxy_allowed_mode = mode;
  return json(data, upstream.ok ? 200 : 502);
}
