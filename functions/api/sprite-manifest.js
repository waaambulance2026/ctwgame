// Cloudflare Pages Function: /api/sprite-manifest
// One-search Cloudinary manifest builder.
// This avoids the Cloudflare "Too many subrequests" problem by asking Cloudinary for the asset list once,
// then building the game manifest from the returned public_id/version values.

const DEFAULT_CLOUD = 'dpwlfmhia';
const CHARACTER_WIDTH = 384;
const BACKGROUND_WIDTH = 1800;
const MAX_SEARCH_PAGES = 3; // 3 Cloudinary requests max, not hundreds.
const MAX_RESULTS = 500;

const CHARACTER_DEFS = {
  ax: {
    name: 'Ax',
    actions: {
      idle: [/^ax_idle_(\d+)$/i, /^ax_idle(\d+)$/i],
      walk: [/^ax_walk_(\d+)$/i, /^ax_walk(\d+)$/i],
      jump: [/^ax_jump_(\d+)$/i, /^ax_jump(\d+)$/i]
    }
  },
  pura: {
    name: 'Pura',
    actions: {
      idle: [/^pura_idle_(\d+)$/i, /^pura_idle(\d+)$/i],
      walk: [/^pura_walk_(\d+)$/i, /^pura_walk(\d+)$/i],
      jump: [/^pura_jump_(\d+)$/i, /^pura_jump(\d+)$/i]
    }
  },
  unicorn: {
    name: 'Unicorn',
    actions: {
      idle: [/^unicorn_idle_(\d+)$/i, /^unicorn_idle(\d+)$/i],
      walk: [/^unicorn_walk_(\d+)$/i, /^unicorn_walk(\d+)$/i, /^uni_walk_(\d+)$/i],
      jump: [/^unicorn_jump_(\d+)$/i, /^unicorn_jump(\d+)$/i]
    }
  },
  owl: {
    name: 'Owl',
    actions: {
      idle: [/^owl_idle_(\d+)$/i, /^owl_idle(\d+)$/i],
      walk: [/^owl_walk(\d+)$/i, /^owl_walk_(\d+)$/i],
      jump: [/^owl_jump_(\d+)$/i, /^owl_jump(\d+)$/i],
      play: [/^owl_play_(\d+)$/i, /^owl_play(\d+)$/i],
      rest: [/^owl_rest_(\d+)$/i, /^owl_rest(\d+)$/i]
    }
  }
};

const BACKGROUND_NAMES = {
  day: { sky: /^day_sky$/i, hills: /^day_hills$/i, ground: /^day_ground$/i },
  night: { sky: /^night_sky$/i, hills: /^night_hills$/i, ground: /^night_ground$/i }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function basicAuth(key, secret) {
  return 'Basic ' + btoa(`${key}:${secret}`);
}

function baseName(publicId) {
  return String(publicId || '').split('/').pop() || '';
}

function resourceUrl(cloud, resource, width) {
  const publicId = String(resource.public_id || '').split('/').map(encodeURIComponent).join('/');
  const version = resource.version ? `/v${resource.version}` : '';
  const format = resource.format ? `.${resource.format}` : '';
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width}${version}/${publicId}${format}`;
}

function frameNumberFor(publicId, regexes) {
  const name = baseName(publicId);
  for (const re of regexes) {
    const m = name.match(re);
    if (m) return Number.parseInt(m[1], 10) || 0;
  }
  return 0;
}

function matchesAny(publicId, regexes) {
  const name = baseName(publicId);
  return regexes.some(re => re.test(name));
}

async function searchCloudinaryResources(cloud, key, secret, debug) {
  const resources = [];
  let nextCursor = '';

  // Keep the expression broad. We filter filenames in code.
  // This costs 1 request per page instead of many requests per character/action.
  const expression = 'resource_type:image AND type:upload';

  for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
    const body = {
      expression,
      max_results: MAX_RESULTS,
      sort_by: [{ public_id: 'asc' }]
    };
    if (nextCursor) body.next_cursor = nextCursor;

    const url = `https://api.cloudinary.com/v1_1/${cloud}/resources/search`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(key, secret),
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    if (!res.ok) {
      debug.searchErrors.push({ status: res.status, body: text.slice(0, 600) });
      break;
    }

    let data;
    try { data = JSON.parse(text); }
    catch (err) {
      debug.searchErrors.push({ error: 'Cloudinary search returned non-JSON', body: text.slice(0, 600) });
      break;
    }

    resources.push(...(data.resources || []));
    nextCursor = data.next_cursor || '';
    if (!nextCursor) break;
  }

  return resources;
}

function buildCharacterFrames(cloud, resources) {
  const characters = {};
  const counts = {};

  for (const [char, def] of Object.entries(CHARACTER_DEFS)) {
    characters[char] = { name: def.name, frames: {} };
    counts[char] = {};

    for (const [action, regexes] of Object.entries(def.actions)) {
      const matched = resources
        .filter(r => matchesAny(r.public_id, regexes))
        .map(r => ({ r, n: frameNumberFor(r.public_id, regexes) }))
        .filter(item => item.n > 0)
        .sort((a, b) => a.n - b.n || String(a.r.public_id).localeCompare(String(b.r.public_id)));

      // De-dupe by frame number. If Cloudinary has two versions/names for one number, keep the newest version.
      const byNumber = new Map();
      for (const item of matched) {
        const prev = byNumber.get(item.n);
        if (!prev || Number(item.r.version || 0) >= Number(prev.r.version || 0)) byNumber.set(item.n, item);
      }

      const frames = [...byNumber.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, item]) => resourceUrl(cloud, item.r, CHARACTER_WIDTH));

      characters[char].frames[action] = frames;
      counts[char][action] = frames.length;
    }
  }

  return { characters, counts };
}

function buildBackgrounds(cloud, resources) {
  const backgrounds = { day: {}, night: {} };
  for (const [theme, layers] of Object.entries(BACKGROUND_NAMES)) {
    for (const [layer, re] of Object.entries(layers)) {
      const matches = resources
        .filter(r => re.test(baseName(r.public_id)))
        .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
      backgrounds[theme][layer] = matches[0] ? resourceUrl(cloud, matches[0], BACKGROUND_WIDTH) : null;
    }
  }
  return backgrounds;
}

export async function onRequestGet(context) {
  const debug = { searchErrors: [], resourceCount: 0, matchedPublicIds: [] };
  try {
    const env = context.env || {};
    const cloud = env.CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD;
    const key = env.CLOUDINARY_API_KEY || '';
    const secret = env.CLOUDINARY_API_SECRET || '';

    if (!key || !secret) {
      return json({
        ok: false,
        error: 'Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET in Cloudflare Pages environment variables/secrets.',
        debug
      }, 500);
    }

    const resources = await searchCloudinaryResources(cloud, key, secret, debug);
    debug.resourceCount = resources.length;
    debug.matchedPublicIds = resources
      .map(r => r.public_id)
      .filter(id => /^(ax|pura|unicorn|Uni|owl|day_|night_)/i.test(baseName(id)))
      .slice(0, 200);

    const { characters, counts } = buildCharacterFrames(cloud, resources);
    const backgrounds = buildBackgrounds(cloud, resources);

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      cloudName: cloud,
      baseUrl: `https://res.cloudinary.com/${cloud}/image/upload`,
      usedAdminApi: true,
      note: 'Generated with one Cloudinary Search API pass, then grouped by public_id filename. This avoids Cloudflare too-many-subrequests errors.',
      backgrounds,
      characters,
      counts,
      debug
    });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err), debug }, 500);
  }
}
