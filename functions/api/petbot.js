const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwZgX5P6tj9_DeO4srLAwCtkgE_OMCzXt-51l5p_GjHEfDErAmBHjE5XVn_NCcTrNO/exec';

// Stage 1 is deliberately display/read focused so the app does not damage the working Discord bot data.
const ALLOWED_READ_MODES = new Set([
  'pet_profile_compact','view_pets','view_inventory','view_shop','view_pet_coins','care_item_menu',
  'view_hook_prizes','view_hook_collection','get_hook_waaambulance','quest_stats','profile','inventory',
  'traits','skills','effects','coins','habitat','quests','miniQuestLogs','shop','careMenu','hookCollection'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}
async function readUpstreamText(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return { response: text }; }
}
function buildPayload(request, env, bodyPayload = {}) {
  const url = new URL(request.url);
  const payload = { ...bodyPayload };
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'api_key') payload[key] = value;
  }
  if (!payload.mode) payload.mode = 'view_pets';
  if (env.PETBOT_API_KEY) payload.api_key = env.PETBOT_API_KEY;
  return payload;
}
function hasUsefulData(data) {
  if (!data || typeof data !== 'object') return false;
  const text = String(data.response || '').toLowerCase();
  if (text.includes('<html') || text.includes('script function not found') || text.includes('exception')) return false;
  if (Array.isArray(data)) return true;
  return ['pets','owned_pets','user_pets','rows','data','items','results','inventory','profile','coins'].some(k => Array.isArray(data[k]) || (data[k] && typeof data[k] === 'object')) || !!data.found || !!data.success;
}
async function fetchGet(appsUrl, payload) {
  const getUrl = new URL(appsUrl);
  for (const [key, value] of Object.entries(payload)) getUrl.searchParams.set(key, String(value));
  const res = await fetch(getUrl.toString(), { method: 'GET', headers: { 'accept': 'application/json,text/plain,*/*' }, redirect: 'follow' });
  const data = await readUpstreamText(res);
  data.proxy_request_method = 'GET';
  return { res, data };
}
async function fetchPost(appsUrl, payload) {
  const res = await fetch(appsUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json,text/plain,*/*' }, body: JSON.stringify(payload), redirect: 'follow' });
  const data = await readUpstreamText(res);
  data.proxy_request_method = 'POST';
  return { res, data };
}
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return json({ ok: true });

  let bodyPayload = {};
  if (request.method === 'POST') {
    try { bodyPayload = await request.clone().json(); } catch (e) { bodyPayload = {}; }
  }
  const payload = buildPayload(request, env, bodyPayload);
  const mode = String(payload.mode || 'view_pets').trim();
  payload.mode = mode;

  if (!ALLOWED_READ_MODES.has(mode)) {
    return json({ found: false, response: 'Blocked mode. Stage 1 Tamagotchi proxy is read/display only.', blocked_mode: mode }, 403);
  }

  const appsUrl = env.PETBOT_APPS_SCRIPT_URL || APPS_SCRIPT_URL;
  let first, second;
  try {
    // The current Discord PetBot Apps Script is most likely parameter based, so GET is the safest first attempt.
    first = await fetchGet(appsUrl, payload);
    if (!first.res.ok || !hasUsefulData(first.data)) {
      second = await fetchPost(appsUrl, payload);
    }
  } catch (getErr) {
    try {
      second = await fetchPost(appsUrl, payload);
      second.data.proxy_fallback = 'post_after_get_failed';
    } catch (postErr) {
      return json({ found: false, response: 'Could not contact PetBot Apps Script.', get_error: getErr.message, post_error: postErr.message }, 502);
    }
  }

  const chosen = second && (second.res.ok || hasUsefulData(second.data)) ? second : first;
  const data = chosen && chosen.data && typeof chosen.data === 'object' ? chosen.data : { response: String(chosen?.data || '') };
  data.proxy_mode = 'read_only_stage_1';
  data.proxy_allowed_mode = mode;
  data.proxy_upstream_status = chosen && chosen.res ? chosen.res.status : 0;
  return json(data, chosen && chosen.res && chosen.res.ok ? 200 : 502);
}
