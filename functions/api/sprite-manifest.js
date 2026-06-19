// Cloudflare Pages Function: /api/sprite-manifest
// Builds a sprite manifest for the game from Cloudinary.
// This version prefers Cloudinary Admin API prefix searches so it can use the
// REAL public_id + version for each file. That fixes cases where visual folders
// or upload versions do not match guessed browser URLs.

const DEFAULT_CLOUD = 'dpwlfmhia';
const CHARACTER_WIDTH = 384;
const BACKGROUND_WIDTH = 1800;
const MAX_FRAMES = 500;
const STOP_AFTER_MISSES = 6;

const CHARACTER_SPECS = {
  ax: {
    name: 'Ax',
    actions: {
      idle: { prefixes: ['ax_idle_', 'ctwgame/characters/ax/idle/ax_idle_'], patterns: ['ax_idle_###.png', 'ax_idle#.png'] },
      walk: { prefixes: ['ax_walk_', 'ctwgame/characters/ax/walk/ax_walk_'], patterns: ['ax_walk_###.png', 'ax_walk#.png'] },
      jump: { prefixes: ['ax_jump_', 'ctwgame/characters/ax/jump/ax_jump_'], patterns: ['ax_jump_###.png', 'ax_jump#.png'] }
    }
  },
  pura: {
    name: 'Pura',
    actions: {
      idle: { prefixes: ['pura_idle_', 'ctwgame/characters/pura/idle/pura_idle_'], patterns: ['pura_idle_###.png', 'pura_idle#.png'] },
      walk: { prefixes: ['pura_walk_', 'ctwgame/characters/pura/walk/pura_walk_'], patterns: ['pura_walk_###.png', 'pura_walk#.png'] },
      jump: { prefixes: ['pura_jump_', 'ctwgame/characters/pura/jump/pura_jump_'], patterns: ['pura_jump_###.png', 'pura_jump#.png'] }
    }
  },
  unicorn: {
    name: 'Unicorn',
    actions: {
      idle: { prefixes: ['unicorn_idle_', 'ctwgame/characters/unicorn/idle/unicorn_idle_'], patterns: ['unicorn_idle_###.png', 'unicorn_idle#.png'] },
      walk: { prefixes: ['unicorn_walk_', 'Uni_Walk_', 'Uni_walk_', 'ctwgame/characters/unicorn/walk/unicorn_walk_'], patterns: ['unicorn_walk_###.png', 'unicorn_walk#.png', 'Uni_Walk_#.png', 'Uni_walk_#.png'] },
      jump: { prefixes: ['unicorn_jump_', 'ctwgame/characters/unicorn/jump/unicorn_jump_'], patterns: ['unicorn_jump_###.png', 'unicorn_jump#.png'] }
    }
  },
  owl: {
    name: 'Owl',
    actions: {
      idle: { prefixes: ['owl_idle_', 'ctwgame/characters/owl/idle/owl_idle_'], patterns: ['owl_idle_#.png', 'owl_idle_###.png'] },
      walk: { prefixes: ['owl_walk', 'ctwgame/characters/owl/walk/owl_walk'], patterns: ['owl_walk##.png', 'owl_walk#.png'] },
      jump: { prefixes: ['owl_jump_', 'ctwgame/characters/owl/jump/owl_jump_'], patterns: ['owl_jump_#.png', 'owl_jump_###.png'] },
      play: { prefixes: ['owl_play_', 'ctwgame/characters/owl/play/owl_play_'], patterns: ['owl_play_#.png', 'owl_play_###.png'] },
      rest: { prefixes: ['owl_rest_', 'ctwgame/characters/owl/rest/owl_rest_'], patterns: ['owl_rest_#.png', 'owl_rest_###.png'] }
    }
  }
};

const BACKGROUND_CANDIDATES = {
  day: {
    sky: ['day_sky', 'ctwgame/layers/backgrounds/day_sky'],
    hills: ['day_hills', 'ctwgame/layers/middle-ground/day_hills'],
    ground: ['day_ground', 'ctwgame/layers/ground/day_ground']
  },
  night: {
    sky: ['night_sky', 'ctwgame/layers/backgrounds/night_sky'],
    hills: ['night_hills', 'ctwgame/layers/middle-ground/night_hills'],
    ground: ['night_ground', 'ctwgame/layers/ground/night_ground']
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=120'
    }
  });
}

function pad3(n) { return String(n).padStart(3, '0'); }
function pad2(n) { return String(n).padStart(2, '0'); }
function fillPattern(pattern, n) {
  return pattern.replace('###', pad3(n)).replace('##', pad2(n)).replace('#', String(n));
}
function encodePublicIdPath(path) {
  return String(path).split('/').map(encodeURIComponent).join('/');
}
function publicProbeUrl(cloud, file, width) {
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width}/${encodePublicIdPath(file)}`;
}
function adminResourceUrl(cloud, resource, width) {
  const publicId = encodePublicIdPath(resource.public_id);
  const version = resource.version ? `/v${resource.version}` : '';
  const format = resource.format ? `.${resource.format}` : '';
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_${width}${version}/${publicId}${format}`;
}
function basicAuth(key, secret) {
  return 'Basic ' + btoa(`${key}:${secret}`);
}
async function cloudinaryResourcesByPrefix(cloud, key, secret, prefix) {
  if (!key || !secret) return [];
  const all = [];
  let nextCursor = '';
  for (let page = 0; page < 5; page++) {
    const qs = new URLSearchParams({ prefix, max_results: '500' });
    if (nextCursor) qs.set('next_cursor', nextCursor);
    const url = `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload?${qs.toString()}`;
    const res = await fetch(url, { headers: { authorization: basicAuth(key, secret) } });
    if (!res.ok) return [];
    const data = await res.json();
    all.push(...(data.resources || []));
    nextCursor = data.next_cursor || '';
    if (!nextCursor) break;
  }
  return all;
}
function frameNumberFromPublicId(publicId) {
  const last = String(publicId).split('/').pop() || '';
  const m = last.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}
function uniqueByPublicId(resources) {
  const map = new Map();
  for (const r of resources) map.set(r.public_id, r);
  return [...map.values()];
}
async function adminFrames(cloud, key, secret, prefixes) {
  let resources = [];
  for (const prefix of prefixes || []) {
    resources.push(...await cloudinaryResourcesByPrefix(cloud, key, secret, prefix));
  }
  resources = uniqueByPublicId(resources)
    .filter(r => /\d+$/.test(String(r.public_id).split('/').pop() || ''))
    .sort((a, b) => frameNumberFromPublicId(a.public_id) - frameNumberFromPublicId(b.public_id));
  return resources.map(r => adminResourceUrl(cloud, r, CHARACTER_WIDTH));
}
async function imageExists(url) {
  try {
    let res = await fetch(url, { method: 'HEAD', cf: { cacheTtl: 120, cacheEverything: true } });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 403 || res.status === 404) {
      res = await fetch(url, { method: 'GET', cf: { cacheTtl: 120, cacheEverything: true } });
      return res.ok;
    }
    return false;
  } catch (_) { return false; }
}
async function probeFrames(cloud, patterns) {
  const frames = [];
  let misses = 0;
  for (let i = 1; i <= MAX_FRAMES; i++) {
    let found = null;
    for (const pattern of patterns) {
      const file = fillPattern(pattern, i);
      const url = publicProbeUrl(cloud, file, CHARACTER_WIDTH);
      if (await imageExists(url)) { found = url; break; }
    }
    if (found) { frames.push(found); misses = 0; }
    else {
      misses++;
      if (frames.length > 0 && misses >= STOP_AFTER_MISSES) break;
      if (frames.length === 0 && i >= STOP_AFTER_MISSES) break;
    }
  }
  return frames;
}
async function firstAdminBackground(cloud, key, secret, candidates) {
  for (const prefix of candidates) {
    const resources = await cloudinaryResourcesByPrefix(cloud, key, secret, prefix);
    if (resources.length) return adminResourceUrl(cloud, resources[0], BACKGROUND_WIDTH);
  }
  return null;
}
async function firstPublicBackground(cloud, candidates) {
  for (const base of candidates) {
    for (const file of [`${base}.png`, `${base}.jpg`, `${base}.jpeg`, `${base}.webp`]) {
      const url = publicProbeUrl(cloud, file, BACKGROUND_WIDTH);
      if (await imageExists(url)) return url;
    }
  }
  return null;
}

export async function onRequestGet(context) {
  const cloud = context.env.CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD;
  const key = context.env.CLOUDINARY_API_KEY || '';
  const secret = context.env.CLOUDINARY_API_SECRET || '';
  const usedAdminApi = !!(key && secret);

  const manifest = {
    ok: true,
    generatedAt: new Date().toISOString(),
    cloudName: cloud,
    baseUrl: `https://res.cloudinary.com/${cloud}/image/upload`,
    usedAdminApi,
    note: 'Generated from Cloudinary public IDs. Uses exact versioned URLs from Admin API when available, with public probing fallback.',
    backgrounds: {},
    characters: {},
    counts: {}
  };

  for (const [char, spec] of Object.entries(CHARACTER_SPECS)) {
    manifest.characters[char] = { name: spec.name, frames: {} };
    manifest.counts[char] = {};
    for (const [action, cfg] of Object.entries(spec.actions)) {
      let frames = await adminFrames(cloud, key, secret, cfg.prefixes);
      if (!frames.length) frames = await probeFrames(cloud, cfg.patterns);
      manifest.characters[char].frames[action] = frames;
      manifest.counts[char][action] = frames.length;
    }
  }

  for (const [theme, layers] of Object.entries(BACKGROUND_CANDIDATES)) {
    manifest.backgrounds[theme] = {};
    for (const [layer, candidates] of Object.entries(layers)) {
      manifest.backgrounds[theme][layer] =
        await firstAdminBackground(cloud, key, secret, candidates) ||
        await firstPublicBackground(cloud, candidates);
    }
  }

  return json(manifest);
}
