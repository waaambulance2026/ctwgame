// Cloudflare Pages Function: /api/sprite-manifest
// This build does NOT use Cloudinary Admin API. The browser probes public Cloudinary delivery URLs,
// preloads the working frames, and caches the results in localStorage.
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate'
    }
  });
}
export async function onRequestGet() {
  return json({
    ok: true,
    mode: 'public-url-probe-in-browser',
    generatedAt: new Date().toISOString(),
    cloudName: 'dpwlfmhia',
    baseUrl: 'https://res.cloudinary.com/dpwlfmhia/image/upload',
    note: 'No Cloudinary Admin API. index.html probes public filenames like ax_idle_001.png and caches working frame URLs before gameplay.',
    backgrounds: { day: { sky: null, hills: null, ground: null }, night: { sky: null, hills: null, ground: null } },
    characters: {
      ax: { name: 'Ax', frames: { idle: [], walk: [], jump: [] } },
      pura: { name: 'Pura', frames: { idle: [], walk: [], jump: [] } },
      unicorn: { name: 'Unicorn', frames: { idle: [], walk: [], jump: [] } },
      owl: { name: 'Owl', frames: { idle: [], walk: [], jump: [], play: [], rest: [] } }
    }
  });
}
