// Cloudflare Pages Function: /api/sprite-manifest
// Builds a fresh sprite manifest by listing Cloudinary public IDs server-side.
// Required Cloudflare env vars/secrets:
//   CLOUDINARY_CLOUD_NAME = dpwlfmhia
//   CLOUDINARY_API_KEY = your Cloudinary API key
//   CLOUDINARY_API_SECRET = your Cloudinary API secret

const DEFAULT_CLOUD = 'dpwlfmhia';
const CHARACTER_WIDTH = 384;      // smaller delivery for gameplay; change to 512 if needed
const BACKGROUND_WIDTH = 1800;    // enough for full-screen backgrounds

const CHARACTER_SPECS = {
  ax: {
    name: 'Ax',
    actions: { idle: ['ax_idle_'], walk: ['ax_walk_'], jump: ['ax_jump_'] }
  },
  pura: {
    name: 'Pura',
    actions: { idle: ['pura_idle_'], walk: ['pura_walk_'], jump: ['pura_jump_'] }
  },
  unicorn: {
    name: 'Unicorn',
    actions: { idle: ['unicorn_idle_'], walk: ['unicorn_walk_'], jump: ['unicorn_jump_'] }
  },
  owl: {
    name: 'Owl',
    actions: {
      idle: ['owl_idle_'],
      walk: ['owl_walk'],
      jump: ['owl_jump_'],
      play: ['owl_play_'],
      rest: ['owl_rest_']
    }
  }
};

const BACKGROUND_PREFIXES = {
  day: {
    sky: ['day_sky'],
    hills: ['day_hills'],
    ground: ['day_ground']
  },
  night: {
    sky: ['night_sky'],
    hills: ['night_hills'],
    ground: ['night_ground']
  }
};

function json(data, status=200){
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // keep short cache so gameplay is fast but Cloudinary changes appear soon
      'cache-control': 'public, max-age=300'
    }
  });
}
function authHeader(key, secret){
  return 'Basic ' + btoa(`${key}:${secret}`);
}
function nsort(a,b){
  const an=(a.public_id.match(/(\d+)(?!.*\d)/)||['', '0'])[1];
  const bn=(b.public_id.match(/(\d+)(?!.*\d)/)||['', '0'])[1];
  return Number(an)-Number(bn) || a.public_id.localeCompare(b.public_id);
}
function deliveryUrl(cloud, resource, width){
  const transform = `f_auto,q_auto,w_${width}`;
  const version = resource.version ? `v${resource.version}/` : '';
  const id = String(resource.public_id || '').split('/').map(encodeURIComponent).join('/');
  const fmt = resource.format || 'png';
  return `https://res.cloudinary.com/${cloud}/image/upload/${transform}/${version}${id}.${fmt}`;
}
async function listByPrefix({cloud, key, secret, prefix}){
  const out=[];
  let next='';
  do{
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload`);
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('max_results', '500');
    if(next) url.searchParams.set('next_cursor', next);
    const res = await fetch(url.toString(), {headers:{authorization:authHeader(key, secret)}});
    if(!res.ok){
      const text = await res.text();
      throw new Error(`Cloudinary list failed for prefix ${prefix}: ${res.status} ${text}`);
    }
    const data = await res.json();
    out.push(...(data.resources || []));
    next = data.next_cursor || '';
  }while(next);
  return out;
}
async function listMany(ctx, prefixes){
  const all=[];
  for(const prefix of prefixes){
    try{ all.push(...await listByPrefix({...ctx, prefix})); }
    catch(e){ console.warn(e.message); }
  }
  const seen=new Set();
  return all.filter(r=>{
    const key=`${r.public_id}.${r.format}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort(nsort);
}

export async function onRequestGet(context){
  const cloud = context.env.CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD;
  const key = context.env.CLOUDINARY_API_KEY;
  const secret = context.env.CLOUDINARY_API_SECRET;
  if(!key || !secret){
    return json({ok:false, error:'Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET in Cloudflare Pages environment variables/secrets.'}, 500);
  }
  const ctx={cloud,key,secret};
  const manifest={
    ok:true,
    generatedAt:new Date().toISOString(),
    cloudName:cloud,
    baseUrl:`https://res.cloudinary.com/${cloud}/image/upload`,
    note:'Generated from Cloudinary Admin API. Character URLs are resized with f_auto,q_auto,w_384 for faster gameplay.',
    backgrounds:{},
    characters:{},
    counts:{}
  };
  for(const [char,spec] of Object.entries(CHARACTER_SPECS)){
    manifest.characters[char]={name:spec.name, frames:{}};
    manifest.counts[char]={};
    for(const [action,prefixes] of Object.entries(spec.actions)){
      const resources=await listMany(ctx, prefixes);
      const frames=resources.map(r=>deliveryUrl(cloud, r, CHARACTER_WIDTH));
      manifest.characters[char].frames[action]=frames;
      manifest.counts[char][action]=frames.length;
    }
  }
  for(const [theme,layers] of Object.entries(BACKGROUND_PREFIXES)){
    manifest.backgrounds[theme]={};
    for(const [layer,prefixes] of Object.entries(layers)){
      const resources=await listMany(ctx, prefixes);
      manifest.backgrounds[theme][layer]=resources[0] ? deliveryUrl(cloud, resources[0], BACKGROUND_WIDTH) : null;
    }
  }
  return json(manifest);
}
