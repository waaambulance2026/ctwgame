const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwZgX5P6tj9_DeO4srLAwCtkgE_OMCzXt-51l5p_GjHEfDErAmBHjE5XVn_NCcTrNO/exec';

// This is the GAME proxy. It is separate from the Discord interaction Worker.
// The Discord Worker is locked to Discord/BotGhost flows; the browser game needs this Pages Function.
const READ_MODES = new Set([
  'view_pets','view_pet','view_all_pets','pets','pet_profile_compact',
  'view_inventory','inventory','debug_inventory','view_shop','shop','care_item_menu','view_pet_coins','pet_coins',
  'get_pet_habitat','view_pet_habitat','pet_habitat','view_habitat','habitat',
  'view_habitat_shop','view_collectibles','view_quest_items','quest_menu','quest_stats','get_mini_quest',
  'view_hook_prizes','view_hook_prize_list','get_hook_waaambulance','hook_waaambulance','view_hook_collection'
]);

const WRITE_MODES = new Set([
  'select_pet','select_pet_code','care_pet','feed_all_pets','care_feed_all',
  'buy_item','shop_buy','purchase_item','buy_habitat_background','use_item','use_inventory_item',
  'complete_hook_waaambulance','cast_hook_waaambulance','play_hook_waaambulance',
  'complete_mini_quest','set_pet_habitat_item','equip_pet_habitat','set_pet_habitat',
  'clear_pet_habitat','clear_pet_habitat_item','reset_pet_habitat'
]);

const MODE_ALIASES = {
  view_habitat: 'get_pet_habitat',
  habitat: 'get_pet_habitat',
  view_habitat_layout: 'get_pet_habitat',
  view_user_habitats_layout: 'get_pet_habitat',
  view_user_habitat_layouts: 'get_pet_habitat',
  view_quests: 'quest_menu',
  view_mini_quests: 'get_mini_quest',
  mini_quests: 'get_mini_quest',
  quests: 'quest_menu',
  play_hook_waaambulance: 'complete_hook_waaambulance',
  use_inventory_item: 'use_item',
  feed_pet: 'care_pet',
  play_pet: 'care_pet',
  rest_pet: 'care_pet',
  heal_pet: 'care_pet',
  train_pet: 'care_pet'
};

const CARE_ALIASES = {
  feed_pet: 'feed',
  play_pet: 'play',
  rest_pet: 'rest',
  heal_pet: 'heal',
  train_pet: 'train'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type,x-admin-key,x-petbot-key'
    }
  });
}

async function readJsonOrText(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { return { found: false, response: text || ('HTTP ' + res.status) }; }
}

async function readPayload(request, url) {
  let body = {};
  if (request.method === 'POST') {
    try { body = await request.clone().json(); } catch (e) { body = {}; }
  }
  const payload = { ...body };
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'api_key' && payload[key] == null) payload[key] = value;
  }
  if (!payload.mode && payload.action) payload.mode = payload.action;
  payload.mode = String(payload.mode || 'view_pets').trim();
  return payload;
}

function apiKeyFromEnv(env) {
  return String(
    (env && (env.PETBOT_API_KEY || env.APPS_SCRIPT_API_KEY || env.CTW_PETBOT_API_KEY || env.GOOGLE_APPS_SCRIPT_API_KEY)) || ''
  ).trim();
}

function normalisePayload(payload) {
  const originalMode = String(payload.mode || '').trim();
  const mode = MODE_ALIASES[originalMode] || originalMode;
  const out = { ...payload, mode };

  if (CARE_ALIASES[originalMode] && !out.care_action) out.care_action = CARE_ALIASES[originalMode];
  if (out.pet_code && !out.selected_pet_code) out.selected_pet_code = out.pet_code;
  if (out.selected_pet_code && !out.pet_code) out.pet_code = out.selected_pet_code;
  if (out.item_id && !out.item_key) out.item_key = out.item_id;
  if (out.prize_id && !out.hook_key) out.hook_key = out.prize_id;
  if (out.prize_name && !out.hook_name) out.hook_name = out.prize_name;
  out.proxy_original_mode = originalMode;
  return out;
}

function looksLikeMissingKey(data) {
  const text = String((data && (data.response || data.error || data.message)) || '').toLowerCase();
  return text.includes('unauthorized') || text.includes('missing apps_script_api_key') || text.includes('server configuration error');
}

async function callAppsScript(appsUrl, payload) {
  let upstream = await fetch(appsUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json,text/plain,*/*' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });
  let data = await readJsonOrText(upstream);

  // Apps Script deployments can be fussy depending on deployment/version, so try GET too.
  if ((!upstream.ok || data.found === false) && looksLikeMissingKey(data) === false) {
    try {
      const getUrl = new URL(appsUrl);
      for (const [key, value] of Object.entries(payload)) getUrl.searchParams.set(key, String(value == null ? '' : value));
      const getRes = await fetch(getUrl.toString(), { method: 'GET', headers: { accept: 'application/json,text/plain,*/*' }, redirect: 'follow' });
      const getData = await readJsonOrText(getRes);
      if (getRes.ok && getData && (getData.found !== false || data.found === false)) {
        upstream = getRes;
        data = getData;
        data.proxy_fallback = 'get_after_post';
      }
    } catch (e) {}
  }
  return { upstream, data };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return json({ ok: true });

  const url = new URL(request.url);
  const rawPayload = await readPayload(request, url);
  const originalMode = rawPayload.mode;
  const allowed = READ_MODES.has(originalMode) || WRITE_MODES.has(originalMode) || READ_MODES.has(MODE_ALIASES[originalMode]) || WRITE_MODES.has(MODE_ALIASES[originalMode]);

  if (!allowed) {
    return json({ found: false, response: 'Blocked mode. This game proxy only allows known PetBot modes.', blocked_mode: originalMode }, 403);
  }

  const payload = normalisePayload(rawPayload);
  const appsUrl = String((env && env.PETBOT_APPS_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL).trim();
  const key = apiKeyFromEnv(env);
  if (key) payload.api_key = key;

  let result;
  try {
    result = await callAppsScript(appsUrl, payload);
  } catch (err) {
    return json({ found: false, response: 'Could not contact the PetBot Apps Script.', error: err && err.message ? err.message : String(err) }, 502);
  }

  const data = result.data || {};
  if (!key && looksLikeMissingKey(data)) {
    return json({
      found: false,
      response: 'The game reached Apps Script, but the PetBot API key is not set in this Cloudflare Pages project. Add the same key as your Discord PetBot worker under PETBOT_API_KEY or APPS_SCRIPT_API_KEY.',
      missing_env: 'PETBOT_API_KEY or APPS_SCRIPT_API_KEY',
      upstream_response: data.response || data.error || ''
    }, 401);
  }

  data.proxy_mode = WRITE_MODES.has(originalMode) || WRITE_MODES.has(payload.mode) ? 'read_write' : 'read_only';
  data.proxy_original_mode = originalMode;
  data.proxy_sent_mode = payload.mode;
  data.proxy_upstream_status = result.upstream ? result.upstream.status : 0;
  return json(data, result.upstream && result.upstream.ok ? 200 : 502);
}
