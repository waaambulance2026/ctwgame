
/* =========================
   CONFIG — add game things here
   ========================= */
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dpwlfmhia/image/upload/f_auto,q_auto/';
function file(name){ return CLOUDINARY_BASE + name + '.png'; }
function frames(prefix,count){ return Array.from({length:count},(_,i)=>file(prefix+(i+1))); }
function framesUnderscore(prefix,count){ return Array.from({length:count},(_,i)=>file(prefix+'_'+(i+1))); }
function framesPadded(prefix,numbers){ return numbers.map(n=>file(prefix+String(n).padStart(2,'0'))); }

// Local game-ready transparent sprites. These are fixed-size frame canvases, so
// idle/walk/jump stay the same size when the animation changes.
const LOCAL_SPRITE_PREFIX = (location.pathname.includes('/htmls/') ? '../' : '') + 'assets/characters/';
function pad3(n){ return String(n).padStart(3,'0'); }
function localFrames(char, action, count){
  return Array.from({length:count}, (_,i)=>`${LOCAL_SPRITE_PREFIX}${char}/frames/${action}/${char}_${action}_${pad3(i+1)}.png`);
}
const CHARACTERS={
  ax:{name:'Ax',height:220,feet:0,x:24,aspect:896/1024,flip:false,actions:{idle:localFrames('ax','idle',10),walk:localFrames('ax','walk',10),jump:localFrames('ax','jump',10)}},
  pura:{name:'Pura',height:235,feet:0,x:24,aspect:704/1344,flip:false,fps:10,actionFps:{idle:8,walk:12,jump:10},walkBob:4,actions:{idle:localFrames('pura','idle',10),walk:localFrames('pura','walk',10),jump:localFrames('pura','jump',10)}},
  owl:{name:'Owl',height:150,feet:0,x:24,aspect:512/384,flip:false,actions:{idle:localFrames('owl','idle',10),walk:localFrames('owl','walk',10),jump:localFrames('owl','jump',7),play:localFrames('owl','play',10),rest:localFrames('owl','rest',6)}},
  unicorn:{name:'Unicorn',height:205,feet:0,x:24,aspect:1088/1088,flip:false,actions:{idle:localFrames('unicorn','idle',10),walk:localFrames('unicorn','walk',10),jump:localFrames('unicorn','jump',10)}}
};
const QUESTS=[
  {name:'Swamp Monster',goal:900,tokens:['🍃','🪙','🧭','✨'],hazards:['🟫','🐌','🧦']},
  {name:'Wrong Moon',goal:1100,tokens:['🌙','⭐','🔮'],hazards:['🌚','📢','🕳️']}
];
const LS_KEY='ctw-real-game-dev-v5-cloudinary-stable';
let devConfig=loadDevConfig();
function loadDevConfig(){try{return JSON.parse(localStorage.getItem(LS_KEY)||'{}')}catch{return {}}}
function saveDevConfig(){localStorage.setItem(LS_KEY,JSON.stringify(devConfig));}
function cfg(char){return Object.assign({},CHARACTERS[char],devConfig[char]||{});}
function actionFrames(char,action){const acts=CHARACTERS[char]?.actions||{};return (acts[action]&&acts[action].length?acts[action]:acts.idle&&acts.idle.length?acts.idle:acts.walk&&acts.walk.length?acts.walk:acts.jump&&acts.jump.length?acts.jump:[]);}


/* =========================
   BACKGROUND LOADER
   Keeps sprite_manifest.json for backgrounds/layers only.
   It tries the manifest first, then root Cloudinary names, then local SVG fallbacks.
   ========================= */
const CLOUDINARY_RAW = 'https://res.cloudinary.com/dpwlfmhia/image/upload/';
const DEFAULT_BACKGROUND_CANDIDATES = {
  sky: [
    CLOUDINARY_RAW + 'f_auto,q_auto/day_sky.png',
    CLOUDINARY_RAW + 'day_sky.png',
    CLOUDINARY_RAW + 'f_auto,q_auto/layers/backgrounds/day_sky.png',
    CLOUDINARY_RAW + 'layers/backgrounds/day_sky.png',
    'assets/parallax_far.svg'
  ],
  hills: [
    CLOUDINARY_RAW + 'f_auto,q_auto/day_hills.png',
    CLOUDINARY_RAW + 'day_hills.png',
    CLOUDINARY_RAW + 'f_auto,q_auto/layers/middle-ground/day_hills.png',
    CLOUDINARY_RAW + 'layers/middle-ground/day_hills.png',
    'assets/parallax_far.svg'
  ],
  ground: [
    CLOUDINARY_RAW + 'f_auto,q_auto/day_ground.png',
    CLOUDINARY_RAW + 'day_ground.png',
    CLOUDINARY_RAW + 'f_auto,q_auto/layers/ground/day_ground.png',
    CLOUDINARY_RAW + 'layers/ground/day_ground.png',
    'assets/parallax_mid.svg'
  ]
};
function asArray(v){return Array.isArray(v)?v.filter(Boolean):(v?[v]:[])}
function unique(list){return [...new Set(list.filter(Boolean))]}
function optimisedCloudinary(url){
  if(!url || !url.includes('res.cloudinary.com') || url.includes('/upload/f_auto,q_auto/')) return url;
  return url.replace('/image/upload/','/image/upload/f_auto,q_auto/');
}
function testImage(src, timeoutMs=1800){
  return new Promise(resolve=>{
    if(!src) return resolve(null);
    const im=new Image();
    im.crossOrigin='anonymous';
    im.decoding='async';
    const done=(ok)=>{ clearTimeout(t); resolve(ok ? src : null); };
    const t=setTimeout(()=>done(false), timeoutMs);
    im.onload=()=>done(true);
    im.onerror=()=>done(false);
    // Do not add cache-busting query strings here. Cloudinary/browser cache is what makes sprites fast.
    im.src=src;
  });
}
async function firstWorking(list){
  const candidates=unique(list.flatMap(raw=>unique([optimisedCloudinary(raw), raw])));
  // Try the first four in parallel; this avoids long serial Cloudinary/local fallback delays.
  for(let start=0; start<Math.min(candidates.length,48); start+=8){
    const batch=candidates.slice(start,start+8).map(src=>testImage(src, start===0?1600:900));
    const results=await Promise.all(batch);
    const hit=results.find(Boolean);
    if(hit) return hit;
  }
  return null;
}
function cloudinaryFirst(list){
  const arr=asArray(list);
  return unique([
    ...arr.filter(u=>String(u).includes('res.cloudinary.com')).map(optimisedCloudinary),
    ...arr.filter(u=>!String(u).includes('res.cloudinary.com')),
  ]);
}
function preferredFrameUrl(list){
  const ordered=cloudinaryFirst(list);
  return ordered[0] || TRANSPARENT_PIXEL;
}
function localSpriteCacheKey(){ return 'ctw-working-sprite-url-cache-v2'; }
function readSpriteUrlCache(){
  try{return JSON.parse(localStorage.getItem(localSpriteCacheKey())||'{}')}catch{return {}}
}
function writeSpriteUrlCache(cache){
  try{localStorage.setItem(localSpriteCacheKey(), JSON.stringify(cache||{}))}catch{}
}


/* =========================
   ROBUST CLOUDINARY CHARACTER SPRITES
   - resolves Cloudinary candidates once before gameplay
   - avoids resetting img.src every animation tick, which caused flicker
   ========================= */
const CHARACTER_MANIFEST_FILE = (location.pathname.includes('/htmls/') ? '../' : '') + 'jsons/sprite_manifest.json';
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
function setImageSrc(img, src){
  if(!img || !src) return;
  if(img.dataset && img.dataset.srcKey === src) return;
  if(img.dataset) img.dataset.srcKey = src;
  img.onload = function(){ img.classList.remove('spriteMissing'); };
  img.onerror = function(){ img.classList.add('spriteMissing'); };
  img.src = src;
}
function cloudCandidateUrls(char, action, n){
  const num = String(n);
  const p3 = String(n).padStart(3,'0');
  const p2 = String(n).padStart(2,'0');
  const base = CLOUDINARY_RAW;
  const charCaps = char.charAt(0).toUpperCase()+char.slice(1);
  const actionCaps = action.charAt(0).toUpperCase()+action.slice(1);
  const rawNames = [
    `${char}_${action}_${p3}`, `${char}_${action}${p3}`, `${char}_${action}_${p2}`, `${char}_${action}${p2}`, `${char}_${action}_${num}`, `${char}_${action}${num}`,
    `${charCaps}_${actionCaps}_${p3}`, `${charCaps}_${actionCaps}${p3}`, `${charCaps}_${actionCaps}_${num}`, `${charCaps}_${actionCaps}${num}`,
    // Older unicorn files use Uni_Walk_1 style names.
    ...(char==='unicorn' && action==='walk' ? [`Uni_Walk_${num}`,`Uni_Walk_${p2}`,`Uni_Walk_${p3}`,`Uni_walk_${num}`,`Uni_walk_${p2}`,`Uni_walk_${p3}`] : []),
    // Some uploaded jump files were named unicorn_Idle_jump1 in a folder called idle jump.
    ...(char==='unicorn' && action==='jump' ? [`unicorn_Idle_jump${num}`,`unicorn_Idle_jump_${num}`,`unicorn_idle_jump${num}`,`unicorn_idle_jump_${num}`] : [])
  ];
  const folders = [
    // Most Cloudinary uploads in this project have used action folders, for example walk/ax_walk_008.png.
    `${action}/`,
    '',
    `characters/${char}/${action}/`,
    `${char}/${action}/`,
    ...(char==='unicorn' && action==='jump' ? ['idle%20jump/','idle jump/'] : [])
  ];
  const exts = ['.png','.PNG'];
  const names=[];
  for(const folder of folders){
    for(const raw of rawNames){
      for(const ext of exts) names.push(folder+raw+ext);
    }
  }
  return unique(names.flatMap(name=>[base+'f_auto,q_auto/'+name, base+name]));
}
function candidateListFromManifest(manifest, char, action, index){
  const frame = manifest?.characters?.[char]?.frames?.[action]?.[index];
  if(Array.isArray(frame)) return cloudinaryFirst(frame);
  if(typeof frame === 'string') return cloudinaryFirst([frame]);
  return [];
}
async function resolveCharacterSprites(){
  let manifest=null;
  try{
    const res=await fetch(CHARACTER_MANIFEST_FILE, {cache:'force-cache'});
    if(res.ok) manifest=await res.json();
  }catch(e){ console.warn('Could not read sprite_manifest character section.', e); }

  const cache=readSpriteUrlCache();
  const changed={value:false};
  async function resolveOne(char, action, i, existing){
    const key=`${char}/${action}/${i+1}`;
    if(cache[key]){
      // Verify cached URL quickly. If it fails, fall through and re-detect.
      const ok=await testImage(cache[key],700);
      if(ok) return ok;
      delete cache[key]; changed.value=true;
    }
    const n=i+1;
    const candidates=unique([
      ...candidateListFromManifest(manifest,char,action,i),
      ...cloudCandidateUrls(char,action,n),
      ...(existing ? [existing] : [])
    ]);
    const hit=await firstWorking(candidates);
    if(hit){ cache[key]=hit; changed.value=true; return hit; }
    return null;
  }

  for(const [char,cfg] of Object.entries(CHARACTERS)){
    const actions=cfg.actions||{};
    const actionNames=Object.keys(actions);
    for(const action of actionNames){
      const arr=actions[action]||[];
      const count=Math.max(Array.isArray(arr)?arr.length:0, manifest?.characters?.[char]?.frames?.[action]?.length || 10);
      const checks=[];
      for(let i=0;i<count;i++) checks.push(resolveOne(char,action,i, Array.isArray(arr)?arr[i]:null));
      const resolved=(await Promise.all(checks)).filter(Boolean);
      if(resolved.length){
        cfg.actions[action]=resolved;
      }else{
        console.warn(`No working sprites found for ${char}/${action}`);
        cfg.actions[action]=[];
      }
    }
    // Fallbacks so the character is never invisible just because one action folder is missing.
    const idle=cfg.actions.idle||[], walk=cfg.actions.walk||[], jump=cfg.actions.jump||[];
    if(!idle.length && walk.length) cfg.actions.idle=walk;
    if(!idle.length && jump.length) cfg.actions.idle=jump;
    if(!walk.length && cfg.actions.idle?.length) cfg.actions.walk=cfg.actions.idle;
    if(!jump.length && cfg.actions.idle?.length) cfg.actions.jump=cfg.actions.idle;
  }
  if(changed.value) writeSpriteUrlCache(cache);
  warmSpriteCache();
  console.log('Character sprites resolved to working URLs:', CHARACTERS);
}


window.CTW_SPRITES_READY = resolveCharacterSprites();
async function getBackgroundCandidates(){
  const c={sky:[...DEFAULT_BACKGROUND_CANDIDATES.sky],hills:[...DEFAULT_BACKGROUND_CANDIDATES.hills],ground:[...DEFAULT_BACKGROUND_CANDIDATES.ground]};
  try{
    const res=await fetch(CHARACTER_MANIFEST_FILE + '?ctw=' + Date.now(), {cache:'no-store'});
    if(res.ok){
      const manifest=await res.json();
      const day=manifest?.backgrounds?.day || {};
      c.sky=unique([...asArray(day.sky),...c.sky]);
      c.hills=unique([...asArray(day.hills),...c.hills]);
      c.ground=unique([...asArray(day.ground),...c.ground]);
    }
  }catch(e){
    console.warn('Could not read sprite_manifest.json for backgrounds. Using fallbacks.', e);
  }
  return c;
}
async function applyBackgrounds(){
  const status=document.getElementById('backgroundStatus');
  if(status)status.textContent='Checking background links...';
  const c=await getBackgroundCandidates();
  const found={
    sky: await firstWorking(c.sky),
    hills: await firstWorking(c.hills),
    ground: await firstWorking(c.ground)
  };
  if(found.sky)document.documentElement.style.setProperty('--sky',`url('${found.sky}')`);
  if(found.hills)document.documentElement.style.setProperty('--hills',`url('${found.hills}')`);
  if(found.ground)document.documentElement.style.setProperty('--ground',`url('${found.ground}')`);
  const msg=`Backgrounds: sky ${found.sky?'ok':'missing'}, hills ${found.hills?'ok':'missing'}, ground ${found.ground?'ok':'missing'}.`;
  if(status)status.textContent=msg;
  console.log(msg, found);
}
applyBackgrounds();

/* =========================
   LAYER DEVELOPER CONTROLS
   Kept simple and safe: this sits on top of the last working build.
   ========================= */
const LAYER_DEFAULTS={
  sky:{show:true,height:100,bottom:0,zoom:100,x:0,y:0,z:0,opacity:1},
  hills:{show:true,height:56,bottom:40,zoom:100,x:0,y:0,z:1,opacity:1},
  ground:{show:true,height:35,bottom:-10,zoom:100,x:0,y:0,z:4,opacity:1},
  platform:{show:true,height:35,bottom:47,zoom:100,x:0,y:0,z:6,opacity:1}
};
function layerElement(key){
  if(key==='sky')return document.querySelector('.sky');
  if(key==='hills')return document.getElementById('hills');
  if(key==='ground')return document.getElementById('ground');
  if(key==='platform')return document.querySelector('.platform');
  return null;
}
function layerCfg(key){return Object.assign({},LAYER_DEFAULTS[key]||{},(devConfig._layers&&devConfig._layers[key])||{});}
function setLayerCfg(key,patch){devConfig._layers=devConfig._layers||{};devConfig._layers[key]=Object.assign({},layerCfg(key),patch);}
function bgPositionFor(key,scrollX=0){const c=layerCfg(key);if(key==='sky')return `calc(50% + ${c.x}px) calc(50% + ${c.y}px)`;return `${scrollX + c.x}px calc(100% + ${c.y}px)`;}
function applyLayerStyles(){
  ['sky','hills','ground','platform'].forEach(key=>{
    const el=layerElement(key), c=layerCfg(key); if(!el)return;
    el.classList.toggle('devLayerSelected',document.body.classList.contains('devMode') && document.getElementById('devLayer') && document.getElementById('devLayer').value===key);
    el.style.display=c.show===false?'none':'';
    el.style.opacity=String(c.opacity);
    el.style.zIndex=String(c.z);
    if(key==='platform'){
      el.style.height=c.height+'px';
      el.style.bottom=c.bottom+'px';
      el.style.left=c.x+'px';
      el.style.right=(-c.x)+'px';
    }else{
      el.style.top='auto';
      el.style.bottom=c.bottom+'px';
      el.style.height=c.height+'vh';
      el.style.backgroundPosition=bgPositionFor(key,0);
      el.style.backgroundSize=key==='sky'?`${c.zoom}% auto`:`auto ${c.zoom}%`;
    }
  });
}
function syncLayerLabels(){
  if(!document.getElementById('devLayer'))return;
  const key=devLayer.value, c=layerCfg(key);
  layerHeightVal.textContent=key==='platform'?c.height+'px':c.height+'vh';
  layerBottomVal.textContent=c.bottom+'px';
  layerZoomVal.textContent=c.zoom+'%';
  layerXVal.textContent=c.x+'px';
  layerYVal.textContent=c.y+'px';
  layerZVal.textContent=c.z;
  layerOpacityVal.textContent=Math.round(c.opacity*100)+'%';
  layerReadout.textContent=JSON.stringify({[key]:c},null,2);
}
function renderLayerPanel(){
  if(!document.getElementById('devLayer'))return;
  const key=devLayer.value||'sky', c=layerCfg(key);
  layerShow.value=String(c.show!==false);
  layerHeight.value=c.height; layerBottom.value=c.bottom; layerZoom.value=c.zoom; layerX.value=c.x; layerY.value=c.y; layerZ.value=c.z; layerOpacity.value=c.opacity;
  syncLayerLabels(); applyLayerStyles();
}
function applyLayerInputs(){
  if(!document.getElementById('devLayer'))return;
  const key=devLayer.value;
  setLayerCfg(key,{show:layerShow.value==='true',height:Number(layerHeight.value),bottom:Number(layerBottom.value),zoom:Number(layerZoom.value),x:Number(layerX.value),y:Number(layerY.value),z:Number(layerZ.value),opacity:Number(layerOpacity.value)});
  syncLayerLabels(); applyLayerStyles(); updateCopyBox();
}
function resetSelectedLayer(){const key=devLayer.value; if(devConfig._layers)delete devConfig._layers[key]; renderLayerPanel(); updateCopyBox(); showToast('Layer reset: '+key);}

/* =========================
   GAME STATE
   ========================= */
const game=document.getElementById('game'), charsEl=document.getElementById('characters'), shadow=document.getElementById('shadow'), objectsEl=document.getElementById('objects'), toastEl=document.getElementById('toast');
let selected=['ax'], activeIndex=0, characterEls={}, images=new Map();
let player={x:0,y:0,vy:0,grounded:true,facing:1};
let keys={left:false,right:false,jump:false};
let running=false, paused=false, devMode=false, score=0,lives=3,level=0,distance=0,last=0,spawn=0,worldObjs=[];

function showToast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toastEl.classList.remove('show'),1200)}
function floorPx(){return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--floor'))||82}
function playerBaseX(){return window.innerWidth*(cfg(selected[activeIndex]||'ax').x||24)/100 + player.x}
function setHud(){document.getElementById('score').textContent=score;document.getElementById('lives').textContent=lives;document.getElementById('level').textContent=level+1;document.getElementById('distance').textContent=Math.floor(distance);document.getElementById('questText').textContent='Quest: '+QUESTS[level].name+' · Active: '+(CHARACTERS[selected[activeIndex]]?.name||'Ax')}
function preload(url){
  if(!url || url===TRANSPARENT_PIXEL) return null;
  if(images.has(url))return images.get(url);
  const im=new Image();
  im.crossOrigin='anonymous';
  im.decoding='async';
  im.fetchPriority='high';
  im.src=url;
  images.set(url,im);
  return im;
}
function preloadAsync(url, timeoutMs=2500){
  const im=preload(url);
  if(!im) return Promise.resolve(false);
  if(im.complete && im.naturalWidth>0) return Promise.resolve(true);
  return new Promise(resolve=>{
    const done=(ok)=>{ clearTimeout(t); im.onload=null; im.onerror=null; resolve(ok); };
    const t=setTimeout(()=>done(false), timeoutMs);
    im.onload=()=>done(true);
    im.onerror=()=>done(false);
  });
}
function selectedSpriteUrls(){
  const urls=[];
  for(const c of selected){
    const acts=CHARACTERS[c]?.actions||{};
    // idle and walk are needed immediately, jump shortly after.
    ['idle','walk','jump','play','rest'].forEach(a=>{ for(const u of (acts[a]||[])) urls.push(u); });
  }
  return unique(urls);
}
function preloadSelected(){ selectedSpriteUrls().forEach(u=>preload(u)); }
async function preloadSelectedAsync(){
  const urls=selectedSpriteUrls();
  await Promise.all(urls.map(u=>preloadAsync(u,2600)));
}
function warmSpriteCache(){
  // Warm the first idle frame for every character as soon as the page opens.
  Object.keys(CHARACTERS).forEach(c=>{
    const u=CHARACTERS[c]?.actions?.idle?.[0];
    if(u) preload(u);
  });
}
function buildChoices(){const grid=document.getElementById('choiceGrid');grid.innerHTML='';Object.entries(CHARACTERS).forEach(([key,c])=>{const b=document.createElement('button');b.className='choice'+(selected.includes(key)?' selected':'');b.innerHTML=`<strong>${c.name}</strong><span>${Object.keys(c.actions).join(', ')}</span>`;b.onclick=()=>{if(selected.includes(key)){if(selected.length>1)selected=selected.filter(x=>x!==key)}else selected.push(key);buildChoices();};grid.appendChild(b);});}
function createCharacterEls(){charsEl.innerHTML='';characterEls={};selected.forEach(c=>{const wrap=document.createElement('div');wrap.className='char';const box=document.createElement('div');box.className='charBox';const img=document.createElement('img');img.alt=CHARACTERS[c].name;img.decoding='async';img.loading='eager';img.fetchPriority='high';box.appendChild(img);wrap.appendChild(box);charsEl.appendChild(wrap);characterEls[c]={wrap,box,img,action:'idle',frame:0,acc:0};});}
function applyCharStyle(c,active=false){const ent=characterEls[c];if(!ent)return;const cc=cfg(c);const h=cc.height||200;ent.box.style.height=h+'px';ent.box.style.width=(h*(cc.aspect||1))+'px';const x=active?playerBaseX():window.innerWidth*((cc.x||24)-8-selected.indexOf(c)*5)/100;ent.wrap.style.left=x+'px';const action=(ent&&ent.action)||'idle';const idx=Number((ent&&ent.frame)||0);const bob=(active&&action==='walk') ? Math.round(Math.sin((idx%10)/10*Math.PI*2)*Number(cc.walkBob||0)) : 0;ent.wrap.style.bottom=(floorPx()+player.y+(cc.feet||0)+bob)+'px';ent.wrap.style.opacity=active?1:.82;ent.wrap.style.zIndex=active?22:20-selected.indexOf(c);const flip=(cc.flip?!1:1)*(player.facing<0?-1:1);ent.wrap.style.transform=`translateX(-50%) scaleX(${flip})`;}
function updateCharacterAnimations(dt){selected.forEach((c,i)=>{const ent=characterEls[c];if(!ent)return;const active=i===activeIndex;const moving=active&&(keys.left||keys.right);const jumping=active&&!player.grounded;const action=jumping?'jump':moving?'walk':'idle';if(ent.action!==action){ent.action=action;ent.frame=0;ent.acc=0}const eff0=cfg(c);const fps=(eff0.actionFps&&eff0.actionFps[action])||devConfig[c]?.fps||eff0.fps||10;ent.acc+=dt;if(ent.acc>1000/fps){ent.acc=0;const fr=actionFrames(c,action);ent.frame=(ent.frame+1)%Math.max(1,fr.length)}const src=actionFrames(c,action)[ent.frame]||actionFrames(c,'idle')[0];setImageSrc(ent.img,src);applyCharStyle(c,active);});shadow.style.left=playerBaseX()+'px';shadow.style.bottom=(floorPx()-11)+'px';}
function switchChar(){if(selected.length<2)return;activeIndex=(activeIndex+1)%selected.length;showToast('Active: '+CHARACTERS[selected[activeIndex]].name);setHud();renderDev();}
async function startGame(openDev=false){
  document.getElementById('startScreen').classList.add('hidden');
  showToast('Loading sprites…');
  try{await window.CTW_SPRITES_READY;}catch(e){console.warn('Sprite resolve failed',e)}
  try{await preloadSelectedAsync();}catch(e){console.warn('Sprite preload failed',e)}
  running=true;paused=false;level=0;score=0;lives=3;distance=0;player={x:0,y:0,vy:0,grounded:true,facing:1};worldObjs=[];objectsEl.innerHTML='';
  createCharacterEls();preloadSelected();setHud();if(openDev)toggleDev(true);requestAnimationFrame(loop)
}
function spawnObj(){const q=QUESTS[level];const kind=Math.random()<.72?'token':'hazard';const list=kind==='token'?q.tokens:q.hazards;const el=document.createElement('div');el.className='obj '+kind;el.textContent=list[Math.floor(Math.random()*list.length)];objectsEl.appendChild(el);worldObjs.push({el,kind,x:window.innerWidth+80,y:window.innerHeight-floorPx()-80-Math.random()*110,hit:false});}
function updateObjects(dt){spawn-=dt;if(spawn<0){spawnObj();spawn=850+Math.random()*650}const speed=(Number(document.getElementById('devSpeed')?.value)||devConfig._gameSpeed||3.2)*(dt/16.67);const px=playerBaseX();worldObjs.forEach(o=>{if(o.hit)return;o.x-=speed;o.el.style.left=o.x+'px';o.el.style.top=o.y+'px';const dx=Math.abs(o.x-px), dy=Math.abs(o.y-(window.innerHeight-floorPx()-player.y-90));if(dx<55&&dy<90){o.hit=true;o.el.remove();if(o.kind==='token'){score+=25;showToast('+25 chaos token')}else{lives--;showToast('Ouch. Dramatic.');if(lives<=0){lives=3;score=0;distance=0;showToast('Reset patrol')}}setHud();}});worldObjs=worldObjs.filter(o=>!o.hit&&o.x>-100);}
function updateWorld(dt){const move=(keys.right?1:0)-(keys.left?1:0);if(move){player.x+=move*4*(dt/16.67);player.facing=move>0?1:-1;}if(keys.jump&&player.grounded){player.vy=13;player.grounded=false}player.vy-=0.62*(dt/16.67);player.y+=player.vy*(dt/16.67);const __ctwMaxJumpY=Math.max(90,window.innerHeight-floorPx()-(cfg(selected[activeIndex]||'ax').height||220)-70);if(player.y>__ctwMaxJumpY){player.y=__ctwMaxJumpY;player.vy=Math.min(player.vy,0)}if(player.y<=0){player.y=0;player.vy=0;player.grounded=true}distance+=Math.max(0,move)*0.18*(dt/16.67)+0.07*(dt/16.67);if(distance>QUESTS[level].goal){level=(level+1)%QUESTS.length;distance=0;showToast('Next quest: '+QUESTS[level].name)}const hx=-(distance*0.22)%900, gx=-(distance*0.9)%900;document.getElementById('hills').style.backgroundPosition=bgPositionFor('hills',hx);document.getElementById('ground').style.backgroundPosition=bgPositionFor('ground',gx);setHud();}
function loop(ts){if(!running)return;const dt=Math.min(50,ts-(last||ts));last=ts;if(!paused){updateWorld(dt);updateObjects(dt)}updateCharacterAnimations(dt);requestAnimationFrame(loop)}

/* =========================
   DEVELOPER MODE
   ========================= */
function toggleDev(force){devMode=typeof force==='boolean'?force:!devMode;document.body.classList.toggle('devMode',devMode);renderDev();}
function renderDev(){if(!devMode)return;document.body.classList.toggle('gridOn',!!devConfig._grid);if(typeof gridBtn!=='undefined'&&gridBtn)gridBtn.textContent=devConfig._grid?'Grid: on':'Grid: off';const charSel=document.getElementById('devCharacter');const oldChar=charSel.value||selected[activeIndex]||'ax';charSel.innerHTML=Object.entries(CHARACTERS).map(([k,c])=>`<option value="${k}">${c.name}</option>`).join('');charSel.value=CHARACTERS[oldChar]?oldChar:selected[activeIndex]||'ax';const actionSel=document.getElementById('devAction');const oldAction=actionSel.value||'idle';actionSel.innerHTML=Object.keys(CHARACTERS[charSel.value].actions).map(a=>`<option value="${a}">${a}</option>`).join('');actionSel.value=CHARACTERS[charSel.value].actions[oldAction]?oldAction:'idle';const c=cfg(charSel.value);devHeight.value=c.height||200;devFeet.value=c.feet||0;devX.value=c.x||24;devFps.value=c.fps||10;devFlip.value=String(!!c.flip);devSpeed.value=devConfig._gameSpeed||3.2;syncDevLabels();renderFrames();renderLayerPanel();applyLayerStyles();updateCopyBox();}
function syncDevLabels(){heightVal.textContent=devHeight.value+'px';feetVal.textContent=devFeet.value+'px';xVal.textContent=devX.value+'vw';fpsVal.textContent=devFps.value;speedVal.textContent=devSpeed.value;}
function currentDevChar(){return devCharacter.value||selected[activeIndex]||'ax'}
function applyDevInputs(){const c=currentDevChar();devConfig[c]=Object.assign({},devConfig[c]||{}, {height:Number(devHeight.value),feet:Number(devFeet.value),x:Number(devX.value),fps:Number(devFps.value),flip:devFlip.value==='true'});devConfig._gameSpeed=Number(devSpeed.value);syncDevLabels();if(characterEls[c])applyCharStyle(c,selected[activeIndex]===c);updateCopyBox();}
function renderFrames(){const c=currentDevChar(), a=devAction.value||'idle';const strip=document.getElementById('frameStrip');strip.innerHTML='';actionFrames(c,a).forEach((src,i)=>{const b=document.createElement('button');b.className='frameBtn';b.title=src;const im=document.createElement('img');setImageSrc(im,src);b.appendChild(im);b.onclick=()=>{if(characterEls[c]){characterEls[c].action=a;characterEls[c].frame=i;setImageSrc(characterEls[c].img,src)}strip.querySelectorAll('.frameBtn').forEach(x=>x.classList.remove('active'));b.classList.add('active')};strip.appendChild(b);});}
function updateCopyBox(){copyBox.value=JSON.stringify({devConfig, characters:Object.keys(CHARACTERS)},null,2)}
['devHeight','devFeet','devX','devFps','devFlip','devSpeed'].forEach(id=>document.getElementById(id).addEventListener('input',applyDevInputs));devCharacter.addEventListener('change',()=>{activeIndex=selected.indexOf(devCharacter.value);if(activeIndex<0){selected=[devCharacter.value,...selected];activeIndex=0;createCharacterEls();preloadSelected()}renderDev();setHud();});devAction.addEventListener('change',()=>{renderFrames();});saveDev.onclick=()=>{applyDevInputs();saveDevConfig();showToast('Developer settings saved')};resetDev.onclick=()=>{localStorage.removeItem(LS_KEY);devConfig={};document.body.classList.remove('gridOn');renderDev();createCharacterEls();showToast('Developer settings reset')};copyDev.onclick=()=>{updateCopyBox();copyBox.select();document.execCommand('copy');showToast('Config copied')};
if(gridBtn){gridBtn.onclick=()=>{devConfig._grid=!devConfig._grid;document.body.classList.toggle('gridOn',!!devConfig._grid);gridBtn.textContent=devConfig._grid?'Grid: on':'Grid: off';saveDevConfig();};}
if(reloadBgBtn){reloadBgBtn.onclick=()=>{applyBackgrounds();showToast('Reloading backgrounds')};}
['devLayer','layerShow','layerHeight','layerBottom','layerZoom','layerX','layerY','layerZ','layerOpacity'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('input',id==='devLayer'?renderLayerPanel:applyLayerInputs);if(el&&id==='devLayer')el.addEventListener('change',renderLayerPanel);});
if(resetLayerBtn){resetLayerBtn.onclick=resetSelectedLayer;}
if(copyLayerBtn){copyLayerBtn.onclick=()=>{layerReadout.textContent=JSON.stringify(devConfig._layers||{},null,2);copyBox.value=layerReadout.textContent;copyBox.select();document.execCommand('copy');showToast('Layer config copied')};}
applyLayerStyles();

/* =========================
   INPUTS
   ========================= */
window.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')keys.left=true;if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')keys.right=true;if(e.key===' '||e.key==='ArrowUp'||e.key.toLowerCase()==='w')keys.jump=true;if(e.key==='Tab'||e.key.toLowerCase()==='q'){e.preventDefault();switchChar()}if(e.key.toLowerCase()==='e')toggleDev();});
window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')keys.left=false;if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')keys.right=false;if(e.key===' '||e.key==='ArrowUp'||e.key.toLowerCase()==='w')keys.jump=false});
function hold(btn,down,up){btn.addEventListener('pointerdown',e=>{e.preventDefault();down()});btn.addEventListener('pointerup',up);btn.addEventListener('pointerleave',up);btn.addEventListener('pointercancel',up)}hold(leftTouch,()=>keys.left=true,()=>keys.left=false);hold(rightTouch,()=>keys.right=true,()=>keys.right=false);hold(jumpTouch,()=>keys.jump=true,()=>keys.jump=false);
document.getElementById('devBtn').onclick=()=>toggleDev();document.getElementById('pauseBtn').onclick=()=>{paused=!paused;pauseBtn.textContent=paused?'Resume':'Pause'};document.getElementById('switchBtn').onclick=switchChar;document.getElementById('startBtn').onclick=()=>startGame(false);document.getElementById('startDevBtn').onclick=()=>startGame(true);
buildChoices();setHud();renderDev();


/* ===== CTW WINDOWED DEVELOPER MODE BEHAVIOUR ===== */
(function(){
  function $(id){return document.getElementById(id)}

  function buildDevWindow(){
    const panel=$('devPanel');
    if(!panel || panel.dataset.windowed==='true')return;
    panel.dataset.windowed='true';

    const controls=document.createElement('div');
    controls.className='devControlsPane';
    while(panel.firstChild){controls.appendChild(panel.firstChild)}

    const preview=document.createElement('div');
    preview.className='devWindowPreview';
    preview.innerHTML=`
      <div class="devPreviewHeader">
        <span>🛠️ Developer preview — game stays full screen behind this window</span>
        <button type="button" id="closeDevWindowBtn">Close editor</button>
      </div>
      <div class="devPreviewScreen" id="devPreviewScreen">
        <div class="devPreviewLayer devPreviewSky" id="devPreviewSky"></div>
        <div class="devPreviewLayer devPreviewHills" id="devPreviewHills"></div>
        <div class="devPreviewLayer devPreviewGround" id="devPreviewGround"></div>
        <div class="devPreviewPlatform" id="devPreviewPlatform"></div>
        <div class="devPreviewBaseline" id="devPreviewBaseline"></div>
        <div class="devPreviewSprite devPreviewSpriteBox" id="devPreviewSprite"><img id="devPreviewSpriteImg" alt="sprite preview"></div>
        <div class="devPreviewGrid" id="devPreviewGridInside"></div>
      </div>
      <div class="devPreviewReadout" id="devPreviewReadout">Preview ready.</div>
    `;
    panel.appendChild(preview);
    panel.appendChild(controls);

    const close=$('closeDevWindowBtn');
    if(close)close.onclick=function(){ if(typeof toggleDev==='function')toggleDev(false); };
  }

  function safeLayerCfg(key){
    try{ if(typeof layerCfg==='function')return layerCfg(key); }catch(e){}
    const d={sky:{show:true,height:100,bottom:0,zoom:100,x:0,y:0,z:0,opacity:1},hills:{show:true,height:56,bottom:40,zoom:100,x:0,y:0,z:1,opacity:1},ground:{show:true,height:35,bottom:-10,zoom:100,x:0,y:0,z:4,opacity:1},platform:{show:true,height:35,bottom:47,zoom:100,x:0,y:0,z:6,opacity:1}};
    return d[key]||d.sky;
  }

  function activeDevChar(){
    const sel=$('devCharacter');
    if(sel && sel.value)return sel.value;
    try{return selected[activeIndex]||'ax'}catch(e){return 'ax'}
  }
  function activeDevAction(){
    const sel=$('devAction');
    return (sel && sel.value)||'idle';
  }
  function getCharCfg(char){
    try{ if(typeof cfg==='function')return cfg(char); }catch(e){}
    try{return CHARACTERS[char]||CHARACTERS.ax}catch(e){return {height:220,feet:0,x:24,aspect:1,flip:false}}
  }
  function getFrames(char,action){
    try{ if(typeof actionFrames==='function')return actionFrames(char,action); }catch(e){}
    try{return CHARACTERS[char].actions[action]||CHARACTERS[char].actions.idle||[]}catch(e){return []}
  }

  function applyPreviewLayer(key,el,screenW,screenH,scrollX){
    if(!el)return;
    const c=safeLayerCfg(key);
    el.classList.toggle('devPreviewSelectedLayer', $('devLayer') && $('devLayer').value===key);
    el.style.display=c.show===false?'none':'';
    el.style.opacity=String(c.opacity ?? 1);
    el.style.zIndex=String(c.z ?? 0);
    const sx=screenW/window.innerWidth;
    const sy=screenH/window.innerHeight;
    const s=Math.min(sx,sy) || 1;
    if(key==='sky'){
      el.style.top='0';el.style.bottom='0';el.style.height='auto';
      el.style.backgroundSize=`${c.zoom||100}% auto`;
      el.style.backgroundPosition=`calc(50% + ${(c.x||0)*s}px) calc(50% + ${(c.y||0)*s}px)`;
    }else{
      el.style.height=(screenH*((c.height||35)/100))+'px';
      el.style.bottom=((c.bottom||0)*s)+'px';
      el.style.backgroundSize=`auto ${c.zoom||100}%`;
      el.style.backgroundPosition=`${((scrollX||0)+(c.x||0))*s}px calc(100% + ${(c.y||0)*s}px)`;
    }
  }

  function updateDeveloperPreview(){
    const panel=$('devPanel'), screen=$('devPreviewScreen');
    if(!panel || !screen || !document.body.classList.contains('devMode'))return;
    const sw=screen.clientWidth||800, sh=screen.clientHeight||450;
    const sx=sw/window.innerWidth, sy=sh/window.innerHeight;
    const scale=Math.min(sx,sy)||1;

    let dist=0, py=0, px=0;
    try{dist=distance||0;py=player.y||0;px=player.x||0;}catch(e){}
    applyPreviewLayer('sky',$('devPreviewSky'),sw,sh,0);
    applyPreviewLayer('hills',$('devPreviewHills'),sw,sh,-(dist*0.22)%900);
    applyPreviewLayer('ground',$('devPreviewGround'),sw,sh,-(dist*0.9)%900);
    const platform=$('devPreviewPlatform');
    const pc=safeLayerCfg('platform');
    if(platform){
      platform.classList.toggle('devPreviewSelectedLayer', $('devLayer') && $('devLayer').value==='platform');
      platform.style.display=pc.show===false?'none':'';
      platform.style.opacity=String(pc.opacity ?? 1);
      platform.style.zIndex=String(pc.z ?? 6);
      platform.style.height=((pc.height||35)*scale)+'px';
      platform.style.bottom=((pc.bottom||47)*scale)+'px';
      platform.style.left=((pc.x||0)*scale)+'px';
      platform.style.right=(-(pc.x||0)*scale)+'px';
    }

    const char=activeDevChar(), action=activeDevAction(), cc=getCharCfg(char);
    const sprite=$('devPreviewSprite'), img=$('devPreviewSpriteImg');
    const frames=getFrames(char,action);
    let frameIndex=0;
    try{ frameIndex=(characterEls[char]?.frame||0)%Math.max(1,frames.length); }catch(e){}
    const src=frames[frameIndex]||frames[0]||'';
    if(img && src) setImageSrc(img,src);
    const h=(Number($('devHeight')?.value)||cc.height||220)*scale;
    const aspect=cc.aspect||1;
    const floor=(typeof floorPx==='function'?floorPx():82)*scale;
    const feet=(Number($('devFeet')?.value)||cc.feet||0)*scale;
    const xvw=Number($('devX')?.value)||cc.x||24;
    const x=(window.innerWidth*(xvw/100)+px)*scale;
    if(sprite){
      sprite.style.width=(h*aspect)+'px';
      sprite.style.height=h+'px';
      sprite.style.left=x+'px';
      sprite.style.bottom=(floor+feet+py*scale)+'px';
      const flip=((String($('devFlip')?.value)==='true'||cc.flip)?-1:1);
      sprite.style.transform=`translateX(-50%) scaleX(${flip})`;
    }
    const base=$('devPreviewBaseline');
    if(base)base.style.bottom=floor+'px';
    const read=$('devPreviewReadout');
    if(read){
      read.textContent=`Preview: ${char} / ${action} · sprite ${Math.round(h)}px high · feet ${Math.round(feet/scale||0)}px · x ${xvw}vw\nGrid shows 25px squares / 100px stronger lines. Yellow line = feet baseline.`;
    }
  }

  function devPreviewLoop(){
    updateDeveloperPreview();
    requestAnimationFrame(devPreviewLoop);
  }

  buildDevWindow();

  // Wrap existing developer functions so preview refreshes after changes without breaking old buttons.
  try{
    const oldRender=renderDev;
    renderDev=function(){oldRender.apply(this,arguments);buildDevWindow();setTimeout(updateDeveloperPreview,0);};
  }catch(e){}
  try{
    const oldApply=applyDevInputs;
    applyDevInputs=function(){oldApply.apply(this,arguments);updateDeveloperPreview();};
  }catch(e){}
  try{
    const oldLayer=applyLayerInputs;
    applyLayerInputs=function(){oldLayer.apply(this,arguments);updateDeveloperPreview();};
  }catch(e){}
  try{
    const oldLayerPanel=renderLayerPanel;
    renderLayerPanel=function(){oldLayerPanel.apply(this,arguments);updateDeveloperPreview();};
  }catch(e){}

  document.addEventListener('input',function(e){
    if(e.target && e.target.closest && e.target.closest('#devPanel'))updateDeveloperPreview();
  });
  document.addEventListener('change',function(e){
    if(e.target && e.target.closest && e.target.closest('#devPanel'))updateDeveloperPreview();
  });
  window.addEventListener('resize',updateDeveloperPreview);
  devPreviewLoop();
})();


/* Fullscreen editor workspace + sprite pause/resume. */
(function(){
  window.CTW_SPRITES_PAUSED = window.CTW_SPRITES_PAUSED || false;

  function byId(id){return document.getElementById(id)}

  function installFrameDock(){
    const panel=byId('devPanel');
    const strip=byId('frameStrip');
    if(!panel || !strip)return;
    let dock=byId('devFrameDock');
    if(!dock){
      dock=document.createElement('section');
      dock.id='devFrameDock';
      dock.innerHTML='<div class="frameDockHead"><span>Frames</span><span class="frameDockHint">Click a frame to preview. This bottom box is only for the selected action.</span></div>';
      const controls=panel.querySelector('.devControlsPane');
      panel.insertBefore(dock, controls || null);
    }
    if(strip.parentElement!==dock){
      const oldHeading=Array.from(document.querySelectorAll('.devControlsPane h2')).find(h=>h.textContent.trim().toLowerCase()==='frames');
      if(oldHeading)oldHeading.classList.add('devOldFramesHeading');
      dock.appendChild(strip);
    }
  }

  function installSpritePauseButton(){
    const controls=document.querySelector('.devControlsPane');
    if(!controls || byId('spritePauseBtn'))return;
    const firstButtons=controls.querySelector('.devButtons');
    if(!firstButtons)return;
    const btn=document.createElement('button');
    btn.id='spritePauseBtn';
    btn.className='blueBtn';
    btn.type='button';
    btn.textContent=window.CTW_SPRITES_PAUSED?'Resume sprites':'Pause sprites';
    btn.onclick=function(){
      window.CTW_SPRITES_PAUSED=!window.CTW_SPRITES_PAUSED;
      btn.textContent=window.CTW_SPRITES_PAUSED?'Resume sprites':'Pause sprites';
      btn.classList.toggle('spritePaused', window.CTW_SPRITES_PAUSED);
      try{ if(typeof showToast==='function')showToast(window.CTW_SPRITES_PAUSED?'Sprites paused':'Sprites resumed'); }catch(e){}
    };
    firstButtons.appendChild(btn);
  }

  function installFullscreenEditorBits(){
    installFrameDock();
    installSpritePauseButton();
    const head=document.querySelector('.devPreviewHeader span');
    if(head)head.textContent='🛠️ Developer preview — full-screen editor workspace';
  }

  // Freeze animation frames when requested, without stopping player/game controls.
  function wrapAnimationOnce(){
    if(window.__ctwSpritePauseWrapped)return;
    try{
      const oldUpdate=updateCharacterAnimations;
      updateCharacterAnimations=function(dt){
        return oldUpdate.call(this, window.CTW_SPRITES_PAUSED ? 0 : dt);
      };
      window.__ctwSpritePauseWrapped=true;
    }catch(e){
      setTimeout(wrapAnimationOnce,50);
    }
  }

  // Refresh after the existing window builder has rearranged the panel.
  function boot(){
    installFullscreenEditorBits();
    wrapAnimationOnce();
  }
  boot();
  setTimeout(boot,100);
  setTimeout(boot,400);
  document.addEventListener('click',function(e){
    if(e.target && (e.target.id==='devBtn' || e.target.id==='startDevBtn'))setTimeout(boot,80);
  });
  document.addEventListener('change',function(e){
    if(e.target && e.target.closest && e.target.closest('#devPanel'))setTimeout(installFrameDock,0);
  });
})();


/* ===== CTW NO-CODE GAME CONFIG MANAGER =====
   This adds a safer way to save developer sizes/layers and add future characters/items/levels
   without editing the main script. Permanent changes live in game_config.json.
*/
(function(){
  const CONFIG_FILE = (location.pathname.includes('/htmls/') ? '../' : '') + 'jsons/game_config.json';
  const CONFIG_KEY = 'ctw-game-content-config-v5-cloudinary-stable';

  function $(id){return document.getElementById(id)}
  function safeToast(msg){try{ if(typeof showToast==='function') showToast(msg); }catch(e){console.log(msg)}}
  function clone(v){return JSON.parse(JSON.stringify(v||{}))}

  function makeUrl(name){
    try{ return (typeof file==='function') ? file(name) : 'https://res.cloudinary.com/dpwlfmhia/image/upload/f_auto,q_auto/' + name + '.png'; }
    catch(e){ return 'https://res.cloudinary.com/dpwlfmhia/image/upload/f_auto,q_auto/' + name + '.png'; }
  }

  function makeActionFrames(spec){
    if(!spec) return [];
    if(Array.isArray(spec)) return spec;
    const count = Number(spec.count||0);
    const prefix = String(spec.prefix||'').trim();
    const naming = spec.naming || 'numbered';
    const numbers = Array.isArray(spec.numbers) ? spec.numbers : null;
    if(numbers){
      return numbers.map(n=>{
        if(naming==='padded2') return makeUrl(prefix + String(n).padStart(2,'0'));
        if(naming==='underscore') return makeUrl(prefix + '_' + n);
        return makeUrl(prefix + n);
      });
    }
    return Array.from({length:count},(_,i)=>{
      const n=i+1;
      if(naming==='padded2') return makeUrl(prefix + String(n).padStart(2,'0'));
      if(naming==='underscore') return makeUrl(prefix + '_' + n);
      return makeUrl(prefix + n);
    });
  }

  function parseFrameUrls(text){
    return String(text||'')
      .split(/[\n,]+/)
      .map(x=>x.trim())
      .filter(Boolean);
  }

  function charToConfig(key,c){
    const out={
      name:c.name||key,
      height:c.height||200,
      feet:c.feet||0,
      x:c.x||24,
      aspect:c.aspect||1,
      flip:!!c.flip,
      actions:{}
    };
    // Existing default characters are exported as explicit urls unless user replaces them with simple patterns.
    Object.entries(c.actions||{}).forEach(([a,arr])=>out.actions[a]=arr);
    return out;
  }

  function collectConfig(){
    const chars={};
    Object.entries(CHARACTERS||{}).forEach(([k,c])=>{ chars[k]=charToConfig(k,c); });
    return {
      version: 1,
      note: 'Edit with Developer Mode. Upload this file as game_config.json. No main script editing needed.',
      devConfig: clone(devConfig||{}),
      characters: chars,
      quests: clone(QUESTS||[])
    };
  }

  function applyContentConfig(data, from){
    if(!data || typeof data!=='object') return false;
    if(data.devConfig && typeof data.devConfig==='object'){
      Object.assign(devConfig, data.devConfig);
      try{ saveDevConfig(); }catch(e){}
    }
    if(data.characters && typeof data.characters==='object'){
      Object.entries(data.characters).forEach(([key,c])=>{
        if(!key || !c) return;
        const actions={};
        Object.entries(c.actions||{}).forEach(([action,spec])=>{ actions[action]=makeActionFrames(spec); });
        if(!actions.idle && c.idleCount) actions.idle=makeActionFrames({prefix:key+'_idle',count:c.idleCount});
        if(!actions.walk && c.walkCount) actions.walk=makeActionFrames({prefix:key+'_walk',count:c.walkCount});
        if(!actions.jump && c.jumpCount) actions.jump=makeActionFrames({prefix:key+'_jump',count:c.jumpCount});
        CHARACTERS[key]={
          name:c.name||key,
          height:Number(c.height||200),
          feet:Number(c.feet||0),
          x:Number(c.x||24),
          aspect:Number(c.aspect||1),
          flip:!!c.flip,
          actions:actions
        };
      });
    }
    if(Array.isArray(data.quests)){
      QUESTS.splice(0, QUESTS.length, ...data.quests);
    }
    try{ localStorage.setItem(CONFIG_KEY, JSON.stringify(data)); }catch(e){}
    try{ buildChoices(); setHud(); renderDev(); preloadSelected(); }catch(e){}
    safeToast('Loaded game config' + (from ? ': '+from : ''));
    return true;
  }

  async function loadJsonConfig(){
    // Local browser copy first, then repo file.
    try{
      const local=localStorage.getItem(CONFIG_KEY);
      if(local){ applyContentConfig(JSON.parse(local),'browser copy'); }
    }catch(e){}
    try{
      const res=await fetch(CONFIG_FILE+'?ctw='+Date.now(),{cache:'no-store'});
      if(res.ok){
        const data=await res.json();
        applyContentConfig(data,CONFIG_FILE);
      }
    }catch(e){
      console.log('No game_config.json yet. This is fine for first setup.', e);
    }
  }

  function downloadText(filename,text){
    const blob=new Blob([text],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
  }

  function exportGameConfig(){
    try{ if(typeof applyDevInputs==='function') applyDevInputs(); }catch(e){}
    try{ if(typeof saveDevConfig==='function') saveDevConfig(); }catch(e){}
    const data=collectConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify(data));
    downloadText('game_config.json', JSON.stringify(data,null,2));
    safeToast('Downloaded game_config.json');
  }

  function importGameConfigFile(fileObj){
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(reader.result);
        applyContentConfig(data,fileObj.name);
      }catch(e){ alert('That config file could not be read.'); }
    };
    reader.readAsText(fileObj);
  }

  function addOrUpdateCharacterFromForm(){
    const key=($('newCharKey')?.value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'_');
    if(!key){ alert('Add a character key, like dragon or cat.'); return; }
    const name=($('newCharName')?.value||key).trim();
    const height=Number($('newCharHeight')?.value||210);
    const aspect=Number($('newCharAspect')?.value||1);
    const idle=Number($('newCharIdle')?.value||10);
    const walk=Number($('newCharWalk')?.value||10);
    const jump=Number($('newCharJump')?.value||10);
    const idleUrls=parseFrameUrls($('newCharIdleUrls')?.value);
    const walkUrls=parseFrameUrls($('newCharWalkUrls')?.value);
    const jumpUrls=parseFrameUrls($('newCharJumpUrls')?.value);
    CHARACTERS[key]={name,height,feet:0,x:24,aspect,flip:false,actions:{
      idle:idleUrls.length ? idleUrls : makeActionFrames({prefix:key+'_idle',count:idle,naming:'numbered'}),
      walk:walkUrls.length ? walkUrls : makeActionFrames({prefix:key+'_walk',count:walk,naming:'numbered'}),
      jump:jumpUrls.length ? jumpUrls : makeActionFrames({prefix:key+'_jump',count:jump,naming:'numbered'})
    }};
    safeToast('Added/updated character: '+name);
    try{ buildChoices(); renderDev(); }catch(e){}
  }

  function updateQuestFromForm(){
    const idx=Number($('questSelect')?.value||0);
    const q=QUESTS[idx];
    if(!q) return;
    q.name=($('questNameEdit')?.value||q.name).trim();
    q.goal=Number($('questGoalEdit')?.value||q.goal||900);
    q.tokens=($('questTokensEdit')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
    q.hazards=($('questHazardsEdit')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
    safeToast('Quest updated');
    try{ setHud(); updateQuestForm(); }catch(e){}
  }

  function addNewQuest(){
    QUESTS.push({name:'New Quest '+QUESTS.length,goal:1000,tokens:['✨','🪙'],hazards:['🕳️','🐌'],text:['A new quest starts here.'],npc:'',enemy:''});
    updateQuestForm();
    safeToast('New quest added');
  }

  function updateQuestForm(){
    const sel=$('questSelect');
    if(!sel) return;
    const old=Number(sel.value||0);
    sel.innerHTML=QUESTS.map((q,i)=>`<option value="${i}">${i+1}. ${q.name}</option>`).join('');
    sel.value=String(Math.min(old,QUESTS.length-1));
    const q=QUESTS[Number(sel.value)]||QUESTS[0];
    if(!q) return;
    $('questNameEdit').value=q.name||'';
    $('questGoalEdit').value=q.goal||900;
    $('questTokensEdit').value=(q.tokens||[]).join(', ');
    $('questHazardsEdit').value=(q.hazards||[]).join(', ');
  }

  function installNoCodePanel(){
    const panel=$('devPanel');
    if(!panel || $('noCodeManager')) return;
    const sec=document.createElement('section');
    sec.id='noCodeManager';
    sec.innerHTML=`
      <h2>No-code save / game builder</h2>
      <div class="devNote"><b>Save settings</b> keeps sizes on this browser. <b>Download game_config.json</b> is the permanent file for GitHub. Replace only game_config.json in the repo — do not edit index.html for size changes.</div>
      <div class="devButtons">
        <button id="downloadConfigBtn">Download game_config.json</button>
        <button class="blueBtn" id="importConfigBtn">Import config</button>
        <button class="pinkBtn" id="clearBrowserConfigBtn">Clear browser config</button>
        <input id="importConfigFile" type="file" accept="application/json,.json" style="display:none">
      </div>
      <h2>Add character</h2>
      <div class="devNote">Upload files as <b>key_idle1.png</b>, <b>key_walk1.png</b>, <b>key_jump1.png</b>, or paste Cloudinary frame URLs below. One URL per line is safest.</div>
      <div class="devRow">
        <div class="devField"><label>Character key</label><input id="newCharKey" placeholder="dragon"></div>
        <div class="devField"><label>Name shown</label><input id="newCharName" placeholder="Dragon"></div>
        <div class="devField"><label>Height</label><input id="newCharHeight" type="number" value="220"></div>
        <div class="devField"><label>Aspect width/height</label><input id="newCharAspect" type="number" step="0.01" value="1"></div>
        <div class="devField"><label>Idle frame count</label><input id="newCharIdle" type="number" value="10"></div>
        <div class="devField"><label>Walk frame count</label><input id="newCharWalk" type="number" value="10"></div>
        <div class="devField"><label>Jump frame count</label><input id="newCharJump" type="number" value="10"></div>
        <div class="devField"><label>Idle Cloudinary URLs</label><textarea id="newCharIdleUrls" class="copyBox" placeholder="https://res.cloudinary.com/.../idle1.png"></textarea></div>
        <div class="devField"><label>Walk Cloudinary URLs</label><textarea id="newCharWalkUrls" class="copyBox" placeholder="https://res.cloudinary.com/.../walk1.png"></textarea></div>
        <div class="devField"><label>Jump Cloudinary URLs</label><textarea id="newCharJumpUrls" class="copyBox" placeholder="https://res.cloudinary.com/.../jump1.png"></textarea></div>
      </div>
      <div class="devButtons"><button id="addCharBtn">Add/update character</button></div>
      <h2>Quest / level setup</h2>
      <div class="devNote">This is how we make levels longer and turn it into an actual quest game. Goal = distance needed to finish the level. Tokens and hazards are comma-separated for now.</div>
      <div class="devRow">
        <div class="devField"><label>Quest</label><select id="questSelect"></select></div>
        <div class="devField"><label>Quest name</label><input id="questNameEdit"></div>
        <div class="devField"><label>Level length / goal</label><input id="questGoalEdit" type="number"></div>
        <div class="devField"><label>Tokens / rewards</label><input id="questTokensEdit" placeholder="✨, 🪙, 🍃"></div>
        <div class="devField"><label>Hazards / enemies</label><input id="questHazardsEdit" placeholder="🐌, 🕳️, 👾"></div>
      </div>
      <div class="devButtons"><button id="saveQuestBtn">Save quest</button><button class="blueBtn" id="addQuestBtn">Add new quest</button></div>
    `;
    const box=$('copyBox');
    if(box && box.parentElement) box.parentElement.insertBefore(sec, box);
    else panel.appendChild(sec);

    $('downloadConfigBtn').onclick=exportGameConfig;
    $('importConfigBtn').onclick=()=>$('importConfigFile').click();
    $('importConfigFile').onchange=e=>{ if(e.target.files[0]) importGameConfigFile(e.target.files[0]); };
    $('clearBrowserConfigBtn').onclick=()=>{ localStorage.removeItem(CONFIG_KEY); safeToast('Browser game config cleared'); };
    $('addCharBtn').onclick=addOrUpdateCharacterFromForm;
    $('questSelect').onchange=updateQuestForm;
    $('saveQuestBtn').onclick=updateQuestFromForm;
    $('addQuestBtn').onclick=addNewQuest;
    updateQuestForm();
  }

  function patchSaveButtons(){
    if($('saveDev')){
      const old=$('saveDev').onclick;
      $('saveDev').onclick=function(){
        try{ old && old.call(this); }catch(e){}
        try{ localStorage.setItem(CONFIG_KEY, JSON.stringify(collectConfig())); }catch(e){}
        safeToast('Saved to browser. Download game_config.json for GitHub.');
      };
    }
    if($('copyDev')){
      const old=$('copyDev').onclick;
      $('copyDev').onclick=function(){
        try{ if(typeof updateCopyBox==='function') updateCopyBox(); }catch(e){}
        if($('copyBox')) $('copyBox').value=JSON.stringify(collectConfig(),null,2);
        try{ $('copyBox').select(); document.execCommand('copy'); }catch(e){}
        safeToast('Full game config copied');
      };
    }
  }

  function boot(){
    installNoCodePanel();
    patchSaveButtons();
    updateQuestForm();
  }

  window.CTW_collectGameConfig = collectConfig;
  window.CTW_applyGameConfig = applyContentConfig;
  window.CTW_downloadGameConfig = exportGameConfig;

  loadJsonConfig().then(()=>{try{renderDev();}catch(e){}});
  boot();
  setTimeout(boot,100);
  setTimeout(boot,500);
  document.addEventListener('click',function(e){
    if(e.target && (e.target.id==='devBtn' || e.target.id==='startDevBtn')) setTimeout(boot,80);
  });
})();


/* CTW per-frame / per-action / per-character sprite sizing editor.
   This saves settings into devConfig/game_config.json instead of editing scripts.
*/
(function(){
  if(window.__ctwFrameScopeEditorInstalled) return;
  window.__ctwFrameScopeEditorInstalled = true;
  window.CTW_SELECTED_FRAME_INDEX = window.CTW_SELECTED_FRAME_INDEX || 0;

  const CONTENT_CONFIG_KEY = 'ctw-game-content-config-v5-cloudinary-stable';
  function $(id){return document.getElementById(id)}
  function toast(msg){try{showToast(msg)}catch(e){console.log(msg)}}
  function hasGlobal(name){try{return typeof window[name] !== 'undefined'}catch(e){return false}}

  function spriteRoot(create){
    if(typeof devConfig === 'undefined') return {};
    if(create && !devConfig._spriteEdits) devConfig._spriteEdits = {};
    return devConfig._spriteEdits || {};
  }
  function charEdit(char, create){
    const root=spriteRoot(create);
    if(create && !root[char]) root[char]={actions:{}};
    if(create && !root[char].actions) root[char].actions={};
    return root[char] || {actions:{}};
  }
  function actionEdit(char, action, create){
    const ce=charEdit(char, create);
    if(create && !ce.actions[action]) ce.actions[action]={defaults:{},frames:{}};
    if(create && !ce.actions[action].defaults) ce.actions[action].defaults={};
    if(create && !ce.actions[action].frames) ce.actions[action].frames={};
    return ce.actions[action] || {defaults:{},frames:{}};
  }
  function frameKey(idx){return String((Number(idx)||0)+1)}
  function currentChar(){return ($('devCharacter') && $('devCharacter').value) || (typeof selected!=='undefined' && selected[activeIndex]) || 'ax'}
  function currentAction(){return ($('devAction') && $('devAction').value) || 'idle'}
  function currentFrame(){
    const frames = getFramesFor(currentChar(), currentAction());
    const max = Math.max(0, frames.length-1);
    window.CTW_SELECTED_FRAME_INDEX = Math.max(0, Math.min(max, Number(window.CTW_SELECTED_FRAME_INDEX)||0));
    return window.CTW_SELECTED_FRAME_INDEX;
  }
  function getFramesFor(char, action){
    try{return actionFrames(char,action)||[]}catch(e){
      try{return CHARACTERS[char].actions[action]||CHARACTERS[char].actions.idle||[]}catch(_){return []}
    }
  }
  function baseConfig(char){
    const c=(typeof CHARACTERS!=='undefined' && CHARACTERS[char]) ? CHARACTERS[char] : {};
    const saved=(typeof devConfig!=='undefined' && devConfig[char]) ? devConfig[char] : {};
    return Object.assign({height:c.height||200, feet:c.feet||0, x:c.x||24, fps:saved.fps||c.fps||10, actionFps:c.actionFps||{}, walkBob:c.walkBob||0, flip:!!c.flip, aspect:c.aspect||1}, saved);
  }
  function effectiveSpriteConfig(char, action, frameIdx){
    const base=baseConfig(char);
    const ae=actionEdit(char, action, false);
    const frame=(ae.frames||{})[frameKey(frameIdx)] || {};
    return Object.assign({}, base, ae.defaults||{}, frame||{});
  }
  window.CTW_effectiveSpriteConfig = effectiveSpriteConfig;

  function valuesFromInputs(){
    return {
      height:Number($('devHeight')?.value || 200),
      feet:Number($('devFeet')?.value || 0),
      x:Number($('devX')?.value || 24),
      fps:Number($('devFps')?.value || 10),
      flip:String($('devFlip')?.value)==='true'
    };
  }
  function setInputsFromConfig(config){
    if($('devHeight')) $('devHeight').value = Math.round(Number(config.height||200));
    if($('devFeet')) $('devFeet').value = Math.round(Number(config.feet||0));
    if($('devX')) $('devX').value = Math.round(Number(config.x||24));
    if($('devFps')) $('devFps').value = Math.round(Number(config.fps||10));
    if($('devFlip')) $('devFlip').value = String(!!config.flip);
    try{syncDevLabels()}catch(e){}
  }
  function scope(){return ($('spriteEditScope') && $('spriteEditScope').value) || 'frame'}

  function saveToScope(chosenScope, quiet){
    if(typeof devConfig==='undefined') return;
    const char=currentChar(), action=currentAction(), idx=currentFrame();
    const vals=valuesFromInputs();
    if(chosenScope==='character'){
      devConfig[char]=Object.assign({}, devConfig[char]||{}, vals);
      toast(!quiet ? 'Saved as character default: '+char : '');
    }else if(chosenScope==='action'){
      const ae=actionEdit(char, action, true);
      ae.defaults=Object.assign({}, ae.defaults||{}, vals);
      toast(!quiet ? 'Saved to all '+action+' frames' : '');
    }else{
      const ae=actionEdit(char, action, true);
      ae.frames[frameKey(idx)]=Object.assign({}, ae.frames[frameKey(idx)]||{}, vals);
      toast(!quiet ? 'Saved frame '+(idx+1)+' only' : '');
    }
    try{saveDevConfig()}catch(e){}
    persistContentConfig();
    try{updateCopyBox()}catch(e){}
    try{renderFrames()}catch(e){}
    try{applyActiveCharacterStyle()}catch(e){}
    updateFrameScopeReadout();
  }

  function persistContentConfig(){
    try{
      if(window.CTW_collectGameConfig){
        localStorage.setItem(CONTENT_CONFIG_KEY, JSON.stringify(window.CTW_collectGameConfig()));
      }
    }catch(e){}
  }

  function resetFrame(){
    const ae=actionEdit(currentChar(), currentAction(), false);
    if(ae.frames) delete ae.frames[frameKey(currentFrame())];
    try{saveDevConfig()}catch(e){}
    persistContentConfig();
    setInputsFromConfig(effectiveSpriteConfig(currentChar(), currentAction(), currentFrame()));
    renderFrames();
    updateFrameScopeReadout();
    toast('Reset frame '+(currentFrame()+1));
  }
  function resetAction(){
    const ce=charEdit(currentChar(), false);
    if(ce.actions) delete ce.actions[currentAction()];
    try{saveDevConfig()}catch(e){}
    persistContentConfig();
    setInputsFromConfig(effectiveSpriteConfig(currentChar(), currentAction(), currentFrame()));
    renderFrames();
    updateFrameScopeReadout();
    toast('Reset action edits: '+currentAction());
  }
  function copyFrameToAction(){
    const vals=valuesFromInputs();
    const ae=actionEdit(currentChar(), currentAction(), true);
    ae.defaults=Object.assign({}, vals);
    ae.frames={};
    try{saveDevConfig()}catch(e){}
    persistContentConfig();
    renderFrames();
    updateFrameScopeReadout();
    toast('Copied current frame size to whole action');
  }

  function installScopeUI(){
    const panel=$('devPanel');
    if(!panel || $('spriteScopePanel')) return;
    const row=$('devHeight')?.closest('.devRow') || document.querySelector('#devPanel .devRow');
    if(!row) return;
    const sec=document.createElement('section');
    sec.id='spriteScopePanel';
    sec.innerHTML=`
      <h2>Frame / action sizing</h2>
      <div class="devNote">Use this when one frame is wrong. Choose what the sliders edit: one frame, all frames in this action, or the whole character.</div>
      <div class="devRow">
        <div class="devField"><label>Edit size for</label><select id="spriteEditScope"><option value="frame">This frame only</option><option value="action">All frames in this action</option><option value="character">All actions for this character</option></select></div>
        <div class="devField"><label>Selected frame</label><input id="selectedFrameBox" readonly value="Frame 1"></div>
      </div>
      <div class="devButtons">
        <button id="saveFrameScopeBtn">Save selected scope</button>
        <button class="blueBtn" id="copyFrameToActionBtn">Copy this frame to action</button>
        <button class="pinkBtn" id="resetFrameBtn">Reset this frame</button>
        <button class="pinkBtn" id="resetActionBtn">Reset action edits</button>
      </div>
      <div class="scopeReadout" id="spriteScopeReadout">No frame selected yet.</div>
    `;
    row.insertAdjacentElement('afterend', sec);
    $('spriteEditScope').onchange=function(){setInputsFromConfig(effectiveSpriteConfig(currentChar(), currentAction(), currentFrame())); updateFrameScopeReadout();};
    $('saveFrameScopeBtn').onclick=function(){saveToScope(scope(), false)};
    $('copyFrameToActionBtn').onclick=copyFrameToAction;
    $('resetFrameBtn').onclick=resetFrame;
    $('resetActionBtn').onclick=resetAction;
  }

  function frameHasEdit(char, action, idx){
    const ae=actionEdit(char, action, false);
    return !!(ae.frames && ae.frames[frameKey(idx)]);
  }
  function actionHasDefault(char, action){
    const ae=actionEdit(char, action, false);
    return !!(ae.defaults && Object.keys(ae.defaults).length);
  }

  function updateFrameScopeReadout(){
    const char=currentChar(), action=currentAction(), idx=currentFrame();
    const frames=getFramesFor(char,action);
    const ae=actionEdit(char, action, false);
    const eff=effectiveSpriteConfig(char, action, idx);
    if($('selectedFrameBox')) $('selectedFrameBox').value = `Frame ${idx+1} of ${frames.length||1}`;
    const frameEdit=(ae.frames||{})[frameKey(idx)] || null;
    const msg=[
      `Editing: ${char} / ${action} / frame ${idx+1}`,
      `Current scope: ${scope()==='frame'?'this frame only':scope()==='action'?'all frames in this action':'whole character'}`,
      `Effective size: height ${Math.round(eff.height)}px · feet ${Math.round(eff.feet||0)}px · x ${Math.round(eff.x||24)}vw · fps ${Math.round(eff.fps||10)}`,
      `Action default: ${ae.defaults && Object.keys(ae.defaults).length ? 'yes' : 'no'}`,
      `This frame override: ${frameEdit ? 'yes' : 'no'}`
    ].join('\n');
    if($('spriteScopeReadout')) $('spriteScopeReadout').textContent=msg;
  }

  function applyActiveCharacterStyle(){
    try{
      const c=currentChar();
      if(characterEls[c]) applyCharStyle(c, selected[activeIndex]===c);
    }catch(e){}
  }

  function installInputInterceptors(){
    ['devHeight','devFeet','devX','devFps','devFlip'].forEach(id=>{
      const el=$(id);
      if(!el || el.dataset.frameScopeIntercepted) return;
      el.dataset.frameScopeIntercepted='true';
      const handler=function(e){
        if(!document.body.classList.contains('devMode')) return;
        e.stopImmediatePropagation();
        saveToScope(scope(), true);
      };
      el.addEventListener('input', handler, true);
      el.addEventListener('change', handler, true);
    });
  }

  // Replace frame strip with frame-aware buttons.
  const oldRenderFrames = (typeof renderFrames==='function') ? renderFrames : null;
  renderFrames = function(){
    const char=currentChar(), action=currentAction();
    const frames=getFramesFor(char, action);
    const strip=$('frameStrip');
    if(!strip){ if(oldRenderFrames) oldRenderFrames(); return; }
    if(window.CTW_SELECTED_FRAME_INDEX >= frames.length) window.CTW_SELECTED_FRAME_INDEX=0;
    strip.innerHTML='';
    frames.forEach((src,i)=>{
      const b=document.createElement('button');
      b.className='frameBtn';
      b.dataset.frameLabel=String(i+1);
      if(i===currentFrame()) b.classList.add('active');
      if(frameHasEdit(char,action,i)) b.classList.add('frameEdited');
      if(actionHasDefault(char,action)) b.classList.add('actionDefaulted');
      b.title=`Frame ${i+1}: ${src}`;
      const im=document.createElement('img');
      setImageSrc(im,src);
      b.appendChild(im);
      b.onclick=function(){
        window.CTW_SELECTED_FRAME_INDEX=i;
        try{
          if(characterEls[char]){
            characterEls[char].action=action;
            characterEls[char].frame=i;
            setImageSrc(characterEls[char].img,src);
            applyCharStyle(char, selected[activeIndex]===char);
          }
        }catch(e){}
        setInputsFromConfig(effectiveSpriteConfig(char, action, i));
        renderFrames();
        updateFrameScopeReadout();
      };
      strip.appendChild(b);
    });
    updateFrameScopeReadout();
  };

  // Override character positioning so frame/action edits affect the actual game, not only the panel.
  const oldApplyCharStyle = (typeof applyCharStyle==='function') ? applyCharStyle : null;
  applyCharStyle = function(c, active=false){
    if(oldApplyCharStyle) oldApplyCharStyle(c, active);
    try{
      const ent=characterEls[c]; if(!ent) return;
      const action=ent.action || 'idle';
      const idx=Number(ent.frame)||0;
      const cc=effectiveSpriteConfig(c, action, idx);
      const base=baseConfig(c);
      const h=Number(cc.height||base.height||200);
      ent.box.style.height=h+'px';
      ent.box.style.width=(h*(base.aspect||1))+'px';
      const activeX=window.innerWidth*((cc.x||24)/100)+player.x;
      const inactiveX=window.innerWidth*(((cc.x||24)-8-selected.indexOf(c)*5)/100);
      ent.wrap.style.left=(active?activeX:inactiveX)+'px';
      const bob=(active&&action==='walk') ? Math.round(Math.sin((idx%10)/10*Math.PI*2)*Number(cc.walkBob||0)) : 0;
      ent.wrap.style.bottom=(floorPx()+player.y+(cc.feet||0)+bob)+'px';
      const flip=(cc.flip?-1:1)*(player.facing<0?-1:1);
      ent.wrap.style.transform=`translateX(-50%) scaleX(${flip})`;
    }catch(e){}
  };

  try{
    playerBaseX = function(){
      const c=selected[activeIndex]||'ax';
      const ent=characterEls[c];
      const eff=effectiveSpriteConfig(c, ent?.action||'idle', ent?.frame||0);
      return window.innerWidth*((eff.x||24)/100)+player.x;
    };
  }catch(e){}

  // Use effective FPS, and respect pause sprites.
  if(typeof updateCharacterAnimations==='function'){
    updateCharacterAnimations=function(dt){
      if(window.CTW_SPRITES_PAUSED) dt=0;
      selected.forEach((c,i)=>{
        const ent=characterEls[c]; if(!ent) return;
        const active=i===activeIndex;
        const moving=active&&(keys.left||keys.right);
        const jumping=active&&!player.grounded;
        const action=jumping?'jump':moving?'walk':'idle';
        if(ent.action!==action){ent.action=action;ent.frame=0;ent.acc=0;}
        const fr=getFramesFor(c,action);
        const idx=(Number(ent.frame)||0)%Math.max(1,fr.length);
        const eff=effectiveSpriteConfig(c,action,idx);
        const fps=Number((eff.actionFps&&eff.actionFps[action])||eff.fps||10);
        ent.acc+=dt;
        if(ent.acc>1000/fps){ent.acc=0;ent.frame=(ent.frame+1)%Math.max(1,fr.length);}
        const src=fr[ent.frame]||getFramesFor(c,'idle')[0];
        if(src) setImageSrc(ent.img,src);
        applyCharStyle(c,active);
      });
      try{shadow.style.left=playerBaseX()+'px';shadow.style.bottom=(floorPx()-11)+'px';}catch(e){}
    };
  }

  const oldRenderDev = (typeof renderDev==='function') ? renderDev : null;
  renderDev=function(){
    if(oldRenderDev) oldRenderDev.apply(this, arguments);
    installScopeUI();
    installInputInterceptors();
    if($('spriteEditScope')){
      const eff=effectiveSpriteConfig(currentChar(), currentAction(), currentFrame());
      setInputsFromConfig(eff);
    }
    try{renderFrames()}catch(e){}
    updateFrameScopeReadout();
  };

  function replaceSaveButtons(){
    const save=$('saveDev');
    if(save && !save.dataset.frameScopeSave){
      save.dataset.frameScopeSave='true';
      save.addEventListener('click',function(e){
        e.preventDefault(); e.stopImmediatePropagation();
        saveToScope(scope(), false);
        try{saveDevConfig()}catch(err){}
        persistContentConfig();
        toast('Saved. Download game_config.json for GitHub when ready.');
      }, true);
    }
    const copy=$('copyDev');
    if(copy && !copy.dataset.frameScopeCopy){
      copy.dataset.frameScopeCopy='true';
      copy.addEventListener('click',function(e){
        e.preventDefault(); e.stopImmediatePropagation();
        try{saveToScope(scope(), true)}catch(err){}
        const data=window.CTW_collectGameConfig ? window.CTW_collectGameConfig() : {devConfig};
        if($('copyBox')){ $('copyBox').value=JSON.stringify(data,null,2); $('copyBox').select(); document.execCommand('copy'); }
        toast('Config copied');
      }, true);
    }
  }

  function boot(){
    installScopeUI();
    installInputInterceptors();
    replaceSaveButtons();
    try{renderFrames()}catch(e){}
    updateFrameScopeReadout();
  }
  boot();
  setTimeout(boot,100);
  setTimeout(boot,600);
  setTimeout(boot,1200);
  document.addEventListener('click',function(e){
    if(e.target && (e.target.id==='devBtn'||e.target.id==='startDevBtn')) setTimeout(boot,80);
  });
  document.addEventListener('change',function(e){
    if(e.target && (e.target.id==='devCharacter'||e.target.id==='devAction')){
      window.CTW_SELECTED_FRAME_INDEX=0;
      setTimeout(()=>{setInputsFromConfig(effectiveSpriteConfig(currentChar(), currentAction(), currentFrame())); renderFrames(); updateFrameScopeReadout();},0);
    }
  });
})();


/* Coloured previous/next frame ghosts + editor preview zoom/pan. */
(function(){
  if(window.__ctwFrameGhostZoomInstalled) return;
  window.__ctwFrameGhostZoomInstalled=true;
  function $(id){return document.getElementById(id)}
  function readCfg(){
    try{ return (typeof devConfig!=='undefined' && devConfig._preview) ? devConfig._preview : {}; }catch(e){ return {}; }
  }
  function writeCfg(patch){
    try{ devConfig._preview=Object.assign({}, devConfig._preview||{}, patch); if(typeof saveDevConfig==='function')saveDevConfig(); }catch(e){}
  }
  function getFramesSafe(char,action){
    try{ if(typeof actionFrames==='function') return actionFrames(char,action)||[]; }catch(e){}
    try{ return CHARACTERS[char].actions[action]||CHARACTERS[char].actions.idle||[]; }catch(e){ return []; }
  }
  function currentCharSafe(){
    return ($('devCharacter')&&$('devCharacter').value) || (typeof selected!=='undefined'&&selected[activeIndex]) || 'ax';
  }
  function currentActionSafe(){ return ($('devAction')&&$('devAction').value)||'idle'; }
  function currentIndexSafe(frames){
    let idx=Number(window.CTW_SELECTED_FRAME_INDEX)||0;
    if(!frames.length) return 0;
    return Math.max(0,Math.min(frames.length-1,idx));
  }
  function ensureStage(){
    const screen=$('devPreviewScreen');
    if(!screen) return null;
    let stage=$('devPreviewZoomStage');
    if(!stage){
      stage=document.createElement('div');
      stage.id='devPreviewZoomStage';
      stage.className='devPreviewZoomStage';
      const kids=Array.from(screen.children);
      screen.appendChild(stage);
      kids.forEach(k=>{ if(k!==stage) stage.appendChild(k); });
    }
    if(!$('devPrevFrameGhost')){
      const prev=document.createElement('div'); prev.id='devPrevFrameGhost'; prev.className='devPreviewFrameGhost prev';
      const next=document.createElement('div'); next.id='devNextFrameGhost'; next.className='devPreviewFrameGhost next';
      const sprite=$('devPreviewSprite');
      if(sprite && sprite.parentElement===stage){ stage.insertBefore(next,sprite); stage.insertBefore(prev,sprite); }
      else { stage.appendChild(next); stage.appendChild(prev); }
    }
    if(!$('devPreviewGhostLabels')){
      const labels=document.createElement('div');
      labels.id='devPreviewGhostLabels';
      labels.className='devPreviewGhostLabels';
      labels.innerHTML='<span class="prev">pink = previous frame</span><span class="next">blue = next frame</span>';
      stage.appendChild(labels);
    }
    return stage;
  }
  function installTools(){
    const preview=document.querySelector('.devWindowPreview');
    if(!preview || $('devPreviewZoomTools')) return;
    const cfg=Object.assign({zoom:100,panX:0,panY:0,ghosts:true},readCfg());
    document.body.classList.toggle('showFrameGhosts', cfg.ghosts!==false);
    const tools=document.createElement('div');
    tools.id='devPreviewZoomTools';
    tools.className='devPreviewTools';
    tools.innerHTML=`
      <button type="button" id="frameGhostToggle" class="${cfg.ghosts!==false?'ghostOn':''}">${cfg.ghosts!==false?'Ghost frames: on':'Ghost frames: off'}</button>
      <label>Preview zoom <span id="previewZoomVal">${cfg.zoom}%</span><input id="previewZoomRange" type="range" min="50" max="250" step="5" value="${cfg.zoom}"></label>
      <label>Pan X <span id="previewPanXVal">${cfg.panX}px</span><input id="previewPanXRange" type="range" min="-600" max="600" step="5" value="${cfg.panX}"></label>
      <label>Pan Y <span id="previewPanYVal">${cfg.panY}px</span><input id="previewPanYRange" type="range" min="-400" max="400" step="5" value="${cfg.panY}"></label>
      <button type="button" id="previewZoomReset">Reset preview zoom</button>
    `;
    const header=preview.querySelector('.devPreviewHeader');
    if(header) header.insertAdjacentElement('afterend',tools); else preview.prepend(tools);
    $('frameGhostToggle').onclick=function(){
      const on=!document.body.classList.contains('showFrameGhosts');
      document.body.classList.toggle('showFrameGhosts',on);
      this.textContent=on?'Ghost frames: on':'Ghost frames: off';
      this.classList.toggle('ghostOn',on);
      writeCfg({ghosts:on});
      updateGhostsAndZoom();
    };
    ['previewZoomRange','previewPanXRange','previewPanYRange'].forEach(id=>{
      const el=$(id); if(!el)return;
      el.addEventListener('input',()=>{
        writeCfg({zoom:Number($('previewZoomRange').value),panX:Number($('previewPanXRange').value),panY:Number($('previewPanYRange').value)});
        updateGhostsAndZoom();
      });
    });
    $('previewZoomReset').onclick=function(){
      $('previewZoomRange').value=100; $('previewPanXRange').value=0; $('previewPanYRange').value=0;
      writeCfg({zoom:100,panX:0,panY:0});
      updateGhostsAndZoom();
    };
  }
  function setMask(el,src){
    if(!el)return;
    if(!src){ el.style.display='none'; return; }
    el.style.display='flex';
    const v='url("'+src.replace(/"/g,'%22')+'")';
    el.style.webkitMaskImage=v;
    el.style.maskImage=v;
  }
  function updateGhostsAndZoom(){
    const stage=ensureStage();
    if(!stage)return;
    installTools();
    const cfg=Object.assign({zoom:100,panX:0,panY:0,ghosts:true},readCfg());
    const screen=$('devPreviewScreen');
    if(screen){
      screen.style.setProperty('--ctwPreviewZoom',String((Number(cfg.zoom)||100)/100));
      screen.style.setProperty('--ctwPreviewPanX',(Number(cfg.panX)||0)+'px');
      screen.style.setProperty('--ctwPreviewPanY',(Number(cfg.panY)||0)+'px');
    }
    if($('previewZoomVal')) $('previewZoomVal').textContent=Math.round(cfg.zoom)+'%';
    if($('previewPanXVal')) $('previewPanXVal').textContent=Math.round(cfg.panX)+'px';
    if($('previewPanYVal')) $('previewPanYVal').textContent=Math.round(cfg.panY)+'px';

    const char=currentCharSafe(), action=currentActionSafe();
    const frames=getFramesSafe(char,action);
    if(!frames.length)return;
    const idx=currentIndexSafe(frames);
    const prevIdx=(idx-1+frames.length)%frames.length;
    const nextIdx=(idx+1)%frames.length;
    const sprite=$('devPreviewSprite');
    const prev=$('devPrevFrameGhost');
    const next=$('devNextFrameGhost');
    if(sprite && prev && next){
      ['width','height','left','bottom','transform'].forEach(prop=>{
        prev.style[prop]=sprite.style[prop] || getComputedStyle(sprite)[prop];
        next.style[prop]=sprite.style[prop] || getComputedStyle(sprite)[prop];
      });
      setMask(prev,frames[prevIdx]);
      setMask(next,frames[nextIdx]);
      prev.title='Previous frame '+(prevIdx+1);
      next.title='Next frame '+(nextIdx+1);
    }
    document.querySelectorAll('#frameStrip .frameBtn').forEach((b,i)=>{
      b.classList.toggle('prevNeighbour',i===prevIdx && i!==idx);
      b.classList.toggle('nextNeighbour',i===nextIdx && i!==idx);
    });
    const read=$('devPreviewReadout');
    if(read && !read.dataset.ghostLegendAdded){
      read.textContent += '\nPink silhouette = previous frame. Blue silhouette = next frame. Use preview zoom if the sprite is too small to line up.';
      read.dataset.ghostLegendAdded='true';
    }
  }
  function boot(){ ensureStage(); installTools(); updateGhostsAndZoom(); }
  boot();
  setTimeout(boot,100); setTimeout(boot,500); setTimeout(boot,1200);
  const oldRAF=window.requestAnimationFrame;
  function loop(){ updateGhostsAndZoom(); oldRAF(loop); }
  oldRAF(loop);
  document.addEventListener('click',function(e){
    if(e.target && (e.target.closest('#frameStrip') || e.target.id==='devBtn' || e.target.id==='startDevBtn')) setTimeout(updateGhostsAndZoom,60);
  });
  document.addEventListener('change',function(e){ if(e.target && e.target.closest('#devPanel')) setTimeout(updateGhostsAndZoom,60); });
  document.addEventListener('input',function(e){ if(e.target && e.target.closest('#devPanel')) setTimeout(updateGhostsAndZoom,0); });
})();


(function(){
  if(window.__ctwCleanFrameCompareInstalled) return;
  window.__ctwCleanFrameCompareInstalled=true;
  function $(id){return document.getElementById(id)}
  function char(){return ($('devCharacter')&&$('devCharacter').value)||(typeof selected!=='undefined'&&selected[activeIndex])||'ax'}
  function action(){return ($('devAction')&&$('devAction').value)||'idle'}
  function framesFor(c,a){try{return actionFrames(c,a)||[]}catch(e){try{return CHARACTERS[c].actions[a]||CHARACTERS[c].actions.idle||[]}catch(_){return []}}}
  function currentIdx(frames){let i=Number(window.CTW_SELECTED_FRAME_INDEX)||0;return Math.max(0,Math.min(Math.max(0,frames.length-1),i));}
  function makeCard(kind,label){
    const card=document.createElement('div');
    card.className='devFrameCompareCard '+kind;
    card.innerHTML='<div class="devFrameCompareLabel"><b>'+label+'</b><span></span></div><img class="devFrameCompareImg" alt="'+label+' frame">';
    return card;
  }
  function ensurePanel(){
    const preview=document.querySelector('.devWindowPreview');
    if(!preview) return null;
    let panel=$('devFrameComparePanel');
    if(panel) return panel;
    panel=document.createElement('section');
    panel.id='devFrameComparePanel';
    panel.className='devFrameComparePanel';
    panel.innerHTML='<div class="devFrameCompareTop"><strong>Frame compare</strong><button type="button" id="devCompareToggle">Compare: on</button></div><div class="devFrameCompareGrid" id="devFrameCompareGrid"></div><div class="devFrameCompareHint">Shows previous, current and next frame separately on the same feet line. Use this for sizing without covering the main preview.</div>';
    const grid=panel.querySelector('#devFrameCompareGrid');
    grid.appendChild(makeCard('prev','Previous'));
    grid.appendChild(makeCard('current','Current'));
    grid.appendChild(makeCard('next','Next'));
    const read=$('devPreviewReadout');
    if(read) read.insertAdjacentElement('afterend',panel);
    else preview.appendChild(panel);
    const btn=panel.querySelector('#devCompareToggle');
    btn.addEventListener('click',()=>{
      const off=document.body.classList.toggle('devCompareOff');
      btn.textContent=off?'Compare: off':'Compare: on';
    });
    return panel;
  }
  function updateFrameStrip(frames,idx){
    const prev=(idx-1+frames.length)%frames.length;
    const next=(idx+1)%frames.length;
    document.querySelectorAll('#frameStrip .frameBtn').forEach((btn,i)=>{
      btn.classList.toggle('prevCompare',frames.length>1&&i===prev);
      btn.classList.toggle('currentCompare',i===idx);
      btn.classList.toggle('nextCompare',frames.length>1&&i===next);
      const old=btn.querySelector('.compareMiniLabel'); if(old) old.remove();
      if(i===prev||i===idx||i===next){
        const span=document.createElement('span');
        span.className='compareMiniLabel';
        span.textContent=i===idx?'now':(i===prev?'prev':'next');
        span.style.cssText='position:absolute;right:4px;bottom:4px;background:#21142d;color:white;font-size:9px;font-weight:900;border-radius:999px;padding:1px 4px;z-index:6;';
        btn.appendChild(span);
      }
    });
  }
  function update(){
    const panel=ensurePanel(); if(!panel) return;
    const c=char(), a=action(), frames=framesFor(c,a);
    const idx=currentIdx(frames);
    const prev=(idx-1+frames.length)%frames.length;
    const next=(idx+1)%frames.length;
    const list=[['prev',prev],['current',idx],['next',next]];
    list.forEach(([kind,i])=>{
      const card=panel.querySelector('.devFrameCompareCard.'+kind);
      if(!card) return;
      const img=card.querySelector('img');
      const span=card.querySelector('.devFrameCompareLabel span');
      if(frames[i]){ img.src=frames[i]; img.style.visibility='visible'; span.textContent='frame '+(i+1)+' of '+frames.length; }
      else { img.removeAttribute('src'); img.style.visibility='hidden'; span.textContent='missing'; }
    });
    panel.style.display=document.body.classList.contains('devCompareOff')?'none':'block';
    updateFrameStrip(frames,idx);
    // Force off the old messy overlay if present.
    document.body.classList.remove('showAllFrameColours');
    const oldLayer=$('devAllFrameGhostLayer'); if(oldLayer) oldLayer.style.display='none';
    const oldLegend=$('devFrameColourLegend'); if(oldLegend) oldLegend.style.display='none';
  }
  window.CTW_updateCleanFrameCompare=update;
  function boot(){ensurePanel(); update();}
  boot(); setTimeout(boot,150); setTimeout(boot,650); setTimeout(boot,1500);
  const raf=window.requestAnimationFrame;
  function loop(){update(); raf(loop);} raf(loop);
  document.addEventListener('click',e=>{if(e.target&&(e.target.closest('#frameStrip')||e.target.closest('#devPanel')||e.target.id==='devBtn'||e.target.id==='startDevBtn'))setTimeout(update,30);});
  document.addEventListener('input',e=>{if(e.target&&e.target.closest('#devPanel'))setTimeout(update,0);});
  document.addEventListener('change',e=>{if(e.target&&e.target.closest('#devPanel'))setTimeout(update,30);});
})();


(function(){
  if(window.__ctwGameplayMenuAndAutoSizeInstalled) return;
  window.__ctwGameplayMenuAndAutoSizeInstalled = true;

  function $(id){ return document.getElementById(id); }
  function toast(msg){ try{ showToast(msg); }catch(e){ console.log(msg); } }

  /* -------------------------
     1) Gameplay menu controls
     ------------------------- */
  function addGameplayButtons(){
    const stats=document.querySelector('.stats');
    if(!stats || $('restartGameBtn')) return;
    const restart=document.createElement('button');
    restart.id='restartGameBtn';
    restart.className='pill gameMenuBtn';
    restart.type='button';
    restart.textContent='Restart';
    const quit=document.createElement('button');
    quit.id='mainMenuGameBtn';
    quit.className='pill gameQuitBtn';
    quit.type='button';
    quit.textContent='Menu';
    const pause=$('pauseBtn');
    if(pause){ pause.insertAdjacentElement('afterend', quit); pause.insertAdjacentElement('afterend', restart); }
    else { stats.appendChild(restart); stats.appendChild(quit); }

    restart.onclick=function(){ resetCurrentRun(); };
    quit.onclick=function(){ backToMainMenu(); };
  }

  function resetCurrentRun(){
    try{
      paused=false; running=true; level=0; score=0; lives=3; distance=0; spawn=0; last=0;
      player={x:0,y:0,vy:0,grounded:true,facing:1};
      keys={left:false,right:false,jump:false};
      worldObjs=[]; if(objectsEl) objectsEl.innerHTML='';
      Object.values(characterEls||{}).forEach(ent=>{ ent.action='idle'; ent.frame=0; ent.acc=0; });
      if($('pauseBtn')) $('pauseBtn').textContent='Pause';
      setHud(); renderFrames && renderFrames(); toast('Quest restarted');
    }catch(e){ console.error(e); toast('Restart failed'); }
  }

  function backToMainMenu(){
    try{
      running=false; paused=true; devMode=false;
      document.body.classList.remove('devMode','gridOn','showFrameGhosts','devCompareOff');
      if($('devPanel')) $('devPanel').style.display='';
      worldObjs=[]; if(objectsEl) objectsEl.innerHTML='';
      if(charsEl) charsEl.innerHTML='';
      characterEls={};
      player={x:0,y:0,vy:0,grounded:true,facing:1};
      keys={left:false,right:false,jump:false};
      level=0; score=0; lives=3; distance=0; spawn=0; last=0;
      buildChoices && buildChoices();
      const start=$('startScreen'); if(start) start.classList.remove('hidden');
      setHud && setHud();
      toast('Back to character select');
    }catch(e){ console.error(e); toast('Menu failed'); }
  }
  window.CTW_restartCurrentRun = resetCurrentRun;
  window.CTW_backToMainMenu = backToMainMenu;

  /* ---------------------------------------------
     2) Auto action visual-size matching
     Fixes: idle looks huge, walk/jump looks tiny.
     This does NOT crop or redraw sprites. It only measures transparent PNG bounds
     and scales the displayed sprite box per action so the visible character height matches.
     --------------------------------------------- */
  const FALLBACK_ACTION_SCALE={
    ax:{idle:1, walk:1, jump:1},
    pura:{idle:1, walk:1, jump:1},
    owl:{idle:1, walk:1, jump:1, play:1, rest:1},
    unicorn:{idle:1, walk:1, jump:1}
  };
  window.CTW_ACTION_AUTO_SCALE = window.CTW_ACTION_AUTO_SCALE || {};
  window.CTW_ACTION_ANALYSIS_READY = false;

  function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
  function frameKeyLocal(idx){ return String((Number(idx)||0)+1); }
  function hasManualFrameOrActionHeight(char, action, frameIdx){
    try{
      const root=devConfig && devConfig._spriteEdits && devConfig._spriteEdits[char];
      const ae=root && root.actions && root.actions[action];
      const frame=ae && ae.frames && ae.frames[frameKeyLocal(frameIdx)];
      return !!((ae && ae.defaults && ae.defaults.height!=null) || (frame && frame.height!=null));
    }catch(e){ return false; }
  }
  function autoScale(char, action, frameIdx){
    // Fixed-frame mode: the assets already have matching transparent canvases.
    // Do not resize walk/jump/rest relative to idle, otherwise Ax/Pura/etc. pop in size.
    return 1;
  }
  window.CTW_getActionAutoScale = autoScale;

  function imgForAnalysis(src){
    return new Promise(resolve=>{
      const im=new Image();
      im.crossOrigin='anonymous';
      im.onload=()=>resolve(im);
      im.onerror=()=>resolve(null);
      im.src=src + (src.includes('?')?'&':'?') + 'ctwAnalyse=' + Date.now();
    });
  }
  async function visibleFraction(src){
    const im=await imgForAnalysis(src);
    if(!im || !im.naturalWidth || !im.naturalHeight) return null;
    const canvas=document.createElement('canvas');
    canvas.width=im.naturalWidth; canvas.height=im.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(im,0,0);
    let data;
    try{ data=ctx.getImageData(0,0,canvas.width,canvas.height).data; }catch(e){ return null; }
    let minY=canvas.height, maxY=-1;
    for(let y=0;y<canvas.height;y++){
      const row=y*canvas.width*4;
      for(let x=0;x<canvas.width;x++){
        if(data[row+x*4+3] > 18){ if(y<minY)minY=y; if(y>maxY)maxY=y; }
      }
    }
    if(maxY<0) return null;
    return (maxY-minY+1)/canvas.height;
  }
  async function analyseActionScales(){
    if(typeof CHARACTERS==='undefined') return;
    const out={};
    for(const [char,c] of Object.entries(CHARACTERS)){
      out[char]={};
      const idleSrc=(c.actions?.idle||[])[0];
      const idleFrac=await visibleFraction(idleSrc);
      let ref=idleFrac;
      if(!ref){
        Object.keys(c.actions||{}).forEach(a=>{out[char][a]=FALLBACK_ACTION_SCALE?.[char]?.[a]||1;});
        continue;
      }
      for(const [action,arr] of Object.entries(c.actions||{})){
        const frac=await visibleFraction(arr[0]);
        const raw=frac ? ref/frac : (FALLBACK_ACTION_SCALE?.[char]?.[action]||1);
        out[char][action]=Number(clamp(raw,0.65,1.75).toFixed(3));
      }
    }
    window.CTW_ACTION_AUTO_SCALE=out;
    window.CTW_ACTION_ANALYSIS_READY=true;
    updateAutoSizeStatus();
    try{ Object.keys(characterEls||{}).forEach(c=>applyCharStyle(c, selected[activeIndex]===c)); }catch(e){}
  }

  function baseCfg(char){
    const c=(typeof CHARACTERS!=='undefined' && CHARACTERS[char]) ? CHARACTERS[char] : {};
    const saved=(typeof devConfig!=='undefined' && devConfig[char]) ? devConfig[char] : {};
    return Object.assign({height:c.height||200,feet:c.feet||0,x:c.x||24,fps:saved.fps||c.fps||10,actionFps:c.actionFps||{},walkBob:c.walkBob||0,flip:!!c.flip,aspect:c.aspect||1}, saved);
  }
  function scopedCfg(char, action, frameIdx){
    let base;
    try{ base = window.CTW_effectiveSpriteConfig ? window.CTW_effectiveSpriteConfig(char,action,frameIdx) : baseCfg(char); }
    catch(e){ base = baseCfg(char); }
    const scale=autoScale(char,action,frameIdx);
    const copy=Object.assign({}, base);
    copy.height = Math.round(Number(copy.height||baseCfg(char).height||200)*scale);
    copy._autoActionScale = scale;
    return copy;
  }
  window.CTW_effectiveSpriteConfigAuto = scopedCfg;

  // Override the real game drawing so the active action uses the matched size.
  try{
    applyCharStyle=function(c,active=false){
      const ent=characterEls[c]; if(!ent) return;
      const action=ent.action || 'idle';
      const idx=Number(ent.frame)||0;
      const cc=scopedCfg(c,action,idx);
      const base=baseCfg(c);
      const h=Number(cc.height||base.height||200);
      ent.box.style.height=h+'px';
      ent.box.style.width=(h*(base.aspect||1))+'px';
      const activeX=window.innerWidth*((cc.x||24)/100)+player.x;
      const inactiveX=window.innerWidth*(((cc.x||24)-8-selected.indexOf(c)*5)/100);
      ent.wrap.style.left=(active?activeX:inactiveX)+'px';
      const bob=(active&&action==='walk') ? Math.round(Math.sin((idx%10)/10*Math.PI*2)*Number(cc.walkBob||0)) : 0;
      ent.wrap.style.bottom=(floorPx()+player.y+(cc.feet||0)+bob)+'px';
      ent.wrap.style.opacity=active?1:.82;
      ent.wrap.style.zIndex=active?22:20-selected.indexOf(c);
      const flip=(cc.flip?-1:1)*(player.facing<0?-1:1);
      ent.wrap.style.transform=`translateX(-50%) scaleX(${flip})`;
    };
  }catch(e){ console.warn('Could not patch applyCharStyle', e); }

  try{
    updateCharacterAnimations=function(dt){
      if(window.CTW_SPRITES_PAUSED) dt=0;
      selected.forEach((c,i)=>{
        const ent=characterEls[c]; if(!ent) return;
        const active=i===activeIndex;
        const moving=active&&(keys.left||keys.right);
        const jumping=active&&!player.grounded;
        const action=jumping?'jump':moving?'walk':'idle';
        if(ent.action!==action){ ent.action=action; ent.frame=0; ent.acc=0; }
        const fr=actionFrames(c,action)||[];
        const idx=(Number(ent.frame)||0)%Math.max(1,fr.length);
        const eff=scopedCfg(c,action,idx);
        const fps=Number((eff.actionFps&&eff.actionFps[action])||eff.fps||10);
        ent.acc+=dt;
        if(ent.acc>1000/fps){ ent.acc=0; ent.frame=(ent.frame+1)%Math.max(1,fr.length); }
        const src=fr[ent.frame]||actionFrames(c,'idle')[0];
        if(src) setImageSrc(ent.img,src);
        applyCharStyle(c,active);
      });
      try{ shadow.style.left=playerBaseX()+'px'; shadow.style.bottom=(floorPx()-11)+'px'; }catch(e){}
    };
  }catch(e){ console.warn('Could not patch animation', e); }

  // Patch dev preview after the existing preview loop runs.
  function updatePreviewSpriteAuto(){
    if(!document.body.classList.contains('devMode')) return;
    const sprite=$('devPreviewSprite'), img=$('devPreviewSpriteImg'), screen=$('devPreviewScreen');
    if(!sprite || !img || !screen) return;
    const char=($('devCharacter')&&$('devCharacter').value)||(selected&&selected[activeIndex])||'ax';
    const action=($('devAction')&&$('devAction').value)||'idle';
    const frames=actionFrames(char,action)||[];
    let idx=Number(window.CTW_SELECTED_FRAME_INDEX)||0;
    idx=Math.max(0,Math.min(Math.max(0,frames.length-1),idx));
    const ent=characterEls?.[char];
    if(frames[idx]) setImageSrc(img,frames[idx]);
    const sw=screen.clientWidth||800, sh=screen.clientHeight||450;
    const scale=Math.min(sw/window.innerWidth, sh/window.innerHeight)||1;
    const cc=scopedCfg(char, action, idx);
    const base=baseCfg(char);
    const h=Number(cc.height||base.height||200)*scale;
    sprite.style.height=h+'px';
    sprite.style.width=(h*(base.aspect||1))+'px';
    const x=(window.innerWidth*((cc.x||24)/100)+(player?.x||0))*scale;
    sprite.style.left=x+'px';
    sprite.style.bottom=((floorPx()+(player?.y||0)+(cc.feet||0))*scale)+'px';
    const flip=(cc.flip?-1:1)*((player?.facing||1)<0?-1:1);
    sprite.style.transform=`translateX(-50%) scaleX(${flip})`;
    const read=$('devPreviewReadout');
    if(read){
      const auto=Number(cc._autoActionScale||1);
      const extra=auto!==1 ? ` · auto action scale ${auto}x` : '';
      read.textContent=`Preview: ${char} / ${action} · display height ${Math.round(h)}px${extra} · feet ${cc.feet||0}px · x ${cc.x||24}vw\nGrid shows 25px squares / 100px stronger lines. Yellow line = feet baseline.`;
    }
  }
  window.CTW_updatePreviewSpriteAuto=updatePreviewSpriteAuto;

  function addAutoSizeStatus(){
    if($('autoSizeStatus')) return;
    const anchor=$('spriteScopePanel') || $('devPreviewReadout') || $('copyBox');
    if(!anchor || !anchor.parentElement) return;
    const box=document.createElement('div');
    box.id='autoSizeStatus';
    box.textContent='Fixed-size sprite mode: action scaling disabled.';
    anchor.parentElement.insertBefore(box, anchor.nextSibling);
  }
  function updateAutoSizeStatus(){
    addAutoSizeStatus();
    const box=$('autoSizeStatus'); if(!box) return;
    const char=($('devCharacter')&&$('devCharacter').value)||(selected&&selected[activeIndex])||'ax';
    const data=window.CTW_ACTION_AUTO_SCALE?.[char]||{};
    const parts=Object.entries(data).map(([a,s])=>`${a} ${s}x`).join(' · ');
    box.textContent='Fixed-size sprite mode: idle/walk/jump use the same display size.\n'+(parts||'all action scales 1x')+'\nManual frame/action edits still override this.';
  }

  function boot(){
    addGameplayButtons();
    addAutoSizeStatus();
    updateAutoSizeStatus();
  }
  boot(); setTimeout(boot,100); setTimeout(boot,800);
  window.CTW_ACTION_AUTO_SCALE=FALLBACK_ACTION_SCALE; window.CTW_ACTION_ANALYSIS_READY=true; updateAutoSizeStatus();
  requestAnimationFrame(function loop(){ updatePreviewSpriteAuto(); requestAnimationFrame(loop); });
  document.addEventListener('change',e=>{ if(e.target && e.target.closest && e.target.closest('#devPanel')) setTimeout(updateAutoSizeStatus,30); });
  document.addEventListener('click',e=>{ if(e.target && (e.target.id==='devBtn'||e.target.id==='startDevBtn'||e.target.closest?.('#frameStrip'))) setTimeout(()=>{boot();updatePreviewSpriteAuto();},80); });

  // Safer jump ceiling. This keeps tall jump frames, especially the unicorn horn/head,
  // inside the visible game area instead of letting the player rise until the sprite clips.
  try{
    updateWorld=function(dt){
      const move=(keys.right?1:0)-(keys.left?1:0);
      if(move){ player.x+=move*4*(dt/16.67); player.facing=move>0?1:-1; }
      if(keys.jump&&player.grounded){ player.vy=13; player.grounded=false; }
      player.vy-=0.62*(dt/16.67);
      player.y+=player.vy*(dt/16.67);
      const activeChar=selected[activeIndex]||'ax';
      const ent=characterEls[activeChar];
      let displayHeight=Number(cfg(activeChar).height||220);
      try{ displayHeight=Number(scopedCfg(activeChar, ent?.action||'idle', ent?.frame||0).height||displayHeight); }catch(e){}
      const topSafety=Math.max(110, Math.min(190, window.innerHeight*0.18));
      const __ctwMaxJumpY=Math.max(60, window.innerHeight-floorPx()-displayHeight-topSafety);
      if(player.y>__ctwMaxJumpY){ player.y=__ctwMaxJumpY; player.vy=Math.min(player.vy,0); }
      if(player.y<=0){ player.y=0; player.vy=0; player.grounded=true; }
      distance+=Math.max(0,move)*0.18*(dt/16.67)+0.07*(dt/16.67);
      if(distance>QUESTS[level].goal){ level=(level+1)%QUESTS.length; distance=0; showToast('Next quest: '+QUESTS[level].name); }
      const hx=-(distance*0.22)%900, gx=-(distance*0.9)%900;
      document.getElementById('hills').style.backgroundPosition=bgPositionFor('hills',hx);
      document.getElementById('ground').style.backgroundPosition=bgPositionFor('ground',gx);
      setHud();
    };
  }catch(e){ console.warn('Could not install safe jump ceiling', e); }
})();


/* ===== CTW EASY CONFIG + VISIBLE NUMBERS PATCH =====
   Makes the editor easier:
   - every slider gets a number box
   - GitHub game_config.json can be force-loaded
   - browser-saved sizes can be cleared when they hide repo changes
   - imported/GitHub config replaces old devConfig instead of merging with stale settings
*/
(function(){
  if(window.__ctwEasyConfigNumbersPatch) return;
  window.__ctwEasyConfigNumbersPatch = true;

  const CONTENT_KEY = 'ctw-game-content-config-v2-fixed-sprites';
  const DEV_KEY = 'ctw-real-game-dev-v2-fixed-sprites';
  const $ = id => document.getElementById(id);

  function say(msg){
    try{ if(typeof showToast === 'function') showToast(msg); }
    catch(e){ console.log(msg); }
    const s=$('ctwConfigStatus');
    if(s) s.textContent = msg;
  }

  function clearObject(obj){
    if(!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(k => delete obj[k]);
  }

  // IMPORTANT FIX: old apply function merged config into old browser settings.
  // This made uploaded game_config.json look like it did nothing.
  if(window.CTW_applyGameConfig && !window.CTW_applyGameConfig.__ctwReplaceFixed){
    const oldApply = window.CTW_applyGameConfig;
    const fixedApply = function(data, from){
      try{
        if(data && data.devConfig && typeof devConfig !== 'undefined'){
          clearObject(devConfig);
        }
      }catch(e){}
      const ok = oldApply(data, from);
      try{
        if(data && data.devConfig){
          localStorage.setItem(DEV_KEY, JSON.stringify(data.devConfig));
        }
      }catch(e){}
      say('Loaded config: ' + (from || 'manual'));
      return ok;
    };
    fixedApply.__ctwReplaceFixed = true;
    window.CTW_applyGameConfig = fixedApply;
  }

  async function loadGitHubConfig(){
    try{
      localStorage.removeItem(CONTENT_KEY);
      const res = await fetch((location.pathname.includes('/htmls/') ? '../' : '') + 'jsons/game_config.json?ctw=' + Date.now(), {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if(window.CTW_applyGameConfig) window.CTW_applyGameConfig(data, 'GitHub game_config.json');
      try{ renderDev(); createCharacterEls(); preloadSelected(); }catch(e){}
      say('GitHub game_config.json loaded.');
    }catch(e){
      console.error(e);
      say('Could not load jsons/game_config.json. Check it is uploaded in the jsons folder.');
    }
  }

  function clearBrowserAndReload(){
    try{
      localStorage.removeItem(CONTENT_KEY);
      localStorage.removeItem(DEV_KEY);
    }catch(e){}
    location.reload();
  }

  function downloadConfig(){
    if(window.CTW_downloadGameConfig){
      window.CTW_downloadGameConfig();
    }else{
      try{
        const data={version:1,devConfig:devConfig||{},characters:CHARACTERS||{},quests:QUESTS||[]};
        const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
        const a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download='game_config.json';
        document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
      }catch(e){ alert('Could not download config.'); }
    }
  }

  function importConfigFile(file){
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(reader.result);
        if(window.CTW_applyGameConfig) window.CTW_applyGameConfig(data, file.name);
        try{ renderDev(); createCharacterEls(); preloadSelected(); }catch(e){}
      }catch(e){ alert('That JSON file could not be read.'); }
    };
    reader.readAsText(file);
  }

  function installConfigHelper(){
    const panel=$('devPanel');
    if(!panel || $('ctwEasyConfigHelper')) return;
    const box=document.createElement('section');
    box.id='ctwEasyConfigHelper';
    box.className='ctwEasyConfigHelper';
    box.innerHTML=`
      <h2>Easy save / config</h2>
      <div class="devNote">
        <b>Why your JSON looked like it did nothing:</b> the browser can keep old saved sizes. Use <b>Load GitHub config</b> after uploading game_config.json, or <b>Clear browser sizes</b> if it still looks wrong.
      </div>
      <div class="devButtons">
        <button type="button" id="ctwLoadGithubConfig" class="blueBtn">Load GitHub config</button>
        <button type="button" id="ctwDownloadConfig" class="goldBtn">Download game_config.json</button>
        <button type="button" id="ctwImportConfig" class="blueBtn">Import config file</button>
        <button type="button" id="ctwClearBrowserSizes" class="pinkBtn">Clear browser sizes + reload</button>
        <input id="ctwImportConfigFile" type="file" accept="application/json,.json" style="display:none">
      </div>
      <div id="ctwConfigStatus" class="ctwConfigStatus">Config status: ready.</div>
    `;
    const firstH2 = panel.querySelector('h2');
    if(firstH2 && firstH2.parentElement) firstH2.parentElement.insertBefore(box, firstH2);
    else panel.prepend(box);
    $('ctwLoadGithubConfig').onclick=loadGitHubConfig;
    $('ctwDownloadConfig').onclick=downloadConfig;
    $('ctwClearBrowserSizes').onclick=clearBrowserAndReload;
    $('ctwImportConfig').onclick=()=>$('ctwImportConfigFile').click();
    $('ctwImportConfigFile').onchange=e=>{ if(e.target.files && e.target.files[0]) importConfigFile(e.target.files[0]); };
  }

  function installSliderNumbers(){
    const panel=$('devPanel');
    if(!panel) return;
    panel.querySelectorAll('input[type="range"]').forEach(range=>{
      if(range.dataset.ctwNumberLinked) return;
      range.dataset.ctwNumberLinked='true';
      const num=document.createElement('input');
      num.type='number';
      num.className='ctwRangeNumber';
      num.value=range.value || 0;
      if(range.min !== '') num.min=range.min;
      if(range.max !== '') num.max=range.max;
      if(range.step !== '') num.step=range.step;
      num.title='Exact value for ' + (range.id || 'slider');
      range.insertAdjacentElement('afterend', num);
      const syncNum=()=>{ num.value=range.value; };
      const syncRange=()=>{
        range.value=num.value;
        range.dispatchEvent(new Event('input',{bubbles:true}));
        range.dispatchEvent(new Event('change',{bubbles:true}));
      };
      range.addEventListener('input', syncNum);
      range.addEventListener('change', syncNum);
      num.addEventListener('input', syncRange);
      num.addEventListener('change', syncRange);
    });
  }

  function installStyles(){
    if($('ctwEasyConfigStyle')) return;
    const style=document.createElement('style');
    style.id='ctwEasyConfigStyle';
    style.textContent=`
      #ctwEasyConfigHelper{border-top:3px solid #F5C542;border-bottom:3px solid #F5C542;margin:10px 0 16px;padding:10px 0;}
      .ctwConfigStatus{margin-top:8px;background:#20142d;color:#fff7bd;border-radius:12px;padding:9px 10px;font-weight:900;font-size:12px;line-height:1.25;}
      .devField input[type=range]{width:calc(100% - 78px)!important;display:inline-block!important;vertical-align:middle!important;}
      .ctwRangeNumber{width:68px!important;margin-left:8px!important;border:2px solid #76C7D8!important;border-radius:10px!important;padding:6px 5px!important;font-weight:900!important;text-align:center!important;background:#f4fdff!important;color:#1d142c!important;vertical-align:middle!important;}
      .devField label span{font-size:13px!important;background:#fff7bd!important;color:#1d142c!important;padding:2px 7px!important;border-radius:999px!important;margin-left:4px!important;}
      .devButtons .goldBtn{background:#F5C542!important;color:#21142d!important;}
    `;
    document.head.appendChild(style);
  }

  function boot(){
    installStyles();
    installConfigHelper();
    installSliderNumbers();
  }
  boot();
  setTimeout(boot,100);
  setTimeout(boot,500);
  setTimeout(boot,1200);
  document.addEventListener('click',()=>setTimeout(boot,80));
  document.addEventListener('change',()=>setTimeout(boot,80));
  new MutationObserver(()=>boot()).observe(document.body,{childList:true,subtree:true});
})();


(function(){
  if(window.__ctwCleanerDevEditorV2) return;
  window.__ctwCleanerDevEditorV2 = true;
  const tabNames = [
    ['sprite','Sprite'],
    ['frame','Frame fix'],
    ['layers','Layers'],
    ['save','Save / Add']
  ];
  let activeTab = localStorage.getItem('ctw-editor-active-tab') || 'sprite';
  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function cleanText(el){ return (el?.textContent||'').trim().toLowerCase(); }
  function classifyHeading(h){
    const t=cleanText(h);
    if(t.includes('sprite setup')) return 'sprite';
    if(t.includes('frame / action') || t.includes('frame sizing')) return 'frame';
    if(t.includes('background') || t.includes('layer setup')) return 'layers';
    if(t.includes('easy save') || t.includes('live save') || t.includes('no-code') || t.includes('add character') || t.includes('quest') || t.includes('add more')) return 'save';
    if(t.includes('frames')) return 'frame';
    return 'save';
  }
  function wrapSections(){
    const pane = $('#devPanel .devControlsPane');
    if(!pane || pane.dataset.ctwTabbed==='true') return;
    pane.dataset.ctwTabbed='true';
    const title = $('h1', pane);
    const intro = title ? title.nextElementSibling : null;
    const tabs = document.createElement('div');
    tabs.className='ctwEditorTabs';
    tabs.innerHTML = tabNames.map(([id,label])=>`<button type="button" data-tab="${id}">${label}</button>`).join('');
    if(intro && intro.classList.contains('devNote')) intro.insertAdjacentElement('afterend', tabs);
    else if(title) title.insertAdjacentElement('afterend', tabs);
    else pane.prepend(tabs);

    const children = Array.from(pane.children).filter(el=>el!==title && el!==intro && el!==tabs);
    const groups = {sprite:[],frame:[],layers:[],save:[]};
    let current = 'save';
    children.forEach(el=>{
      if(el.tagName && el.tagName.toLowerCase()==='h2') current = classifyHeading(el);
      groups[current].push(el);
    });
    Object.entries(groups).forEach(([key,nodes])=>{
      const sec=document.createElement('div');
      sec.className='ctwEditorSection';
      sec.dataset.section=key;
      nodes.forEach(n=>sec.appendChild(n));
      pane.appendChild(sec);
    });
    tabs.addEventListener('click', e=>{
      const btn=e.target.closest('button[data-tab]');
      if(!btn) return;
      activeTab=btn.dataset.tab;
      localStorage.setItem('ctw-editor-active-tab', activeTab);
      applyTabs();
    });
    applyTabs();
  }
  function applyTabs(){
    const pane = $('#devPanel .devControlsPane');
    if(!pane) return;
    tabNames.forEach(([id])=>pane.classList.toggle('ctwTab-'+id, activeTab===id));
    $all('.ctwEditorTabs button', pane).forEach(b=>b.classList.toggle('active', b.dataset.tab===activeTab));
    $all('.ctwEditorSection', pane).forEach(sec=>sec.classList.toggle('active', sec.dataset.section===activeTab));
  }
  function formatValue(range){
    const id=(range.id||'').toLowerCase();
    const n=Number(range.value||0);
    if(id.includes('opacity')) return Math.round(n*100)+'%';
    if(id.includes('zoom')) return Math.round(n)+'%';
    if(id.includes('speed')) return (Math.round(n*10)/10).toString();
    if(id.includes('x') && !id.includes('fps')) return Math.round(n)+'vw';
    if(id.includes('fps')) return Math.round(n).toString();
    if(id.includes('height') || id.includes('feet') || id.includes('bottom') || id.includes('pan') || id.includes('y')) return Math.round(n)+'px';
    return String(Math.round(n*100)/100);
  }
  function syncRange(range){
    if(!range || range.type !== 'range') return;
    const field = range.closest('.devField, .devPreviewTools label') || range.parentElement;
    let num = range.parentElement.querySelector('input.ctwRangeNumber[data-for="'+range.id+'"]') || range.nextElementSibling;
    if(!(num && num.classList && num.classList.contains('ctwRangeNumber'))){
      num = document.createElement('input');
      num.type='number';
      num.className='ctwRangeNumber';
      num.dataset.for=range.id||'';
      if(range.min !== '') num.min=range.min;
      if(range.max !== '') num.max=range.max;
      if(range.step !== '') num.step=range.step;
      range.insertAdjacentElement('afterend', num);
    }
    let live = field?.querySelector('.ctwLiveNum');
    const label = field?.querySelector('label') || (range.closest('label'));
    if(!live && label){
      live = label.querySelector('span') || document.createElement('span');
      live.classList.add('ctwLiveNum');
      if(!live.parentElement) label.appendChild(live);
    }
    const updateFromRange = ()=>{
      num.value = range.value;
      if(live) live.textContent = formatValue(range);
    };
    const updateFromNum = ()=>{
      range.value = num.value;
      range.dispatchEvent(new Event('input',{bubbles:true}));
      range.dispatchEvent(new Event('change',{bubbles:true}));
      updateFromRange();
    };
    if(!range.dataset.ctwLiveSync){
      range.dataset.ctwLiveSync='true';
      range.addEventListener('input', updateFromRange);
      range.addEventListener('change', updateFromRange);
      num.addEventListener('input', updateFromNum);
      num.addEventListener('change', updateFromNum);
    }
    updateFromRange();
  }
  function installNumberSync(){
    const panel=$('#devPanel');
    if(!panel) return;
    $all('input[type="range"]', panel).forEach(syncRange);
  }
  function install(){
    wrapSections();
    installNumberSync();
    applyTabs();
  }
  document.addEventListener('click', e=>{
    if(e.target && (e.target.id==='devBtn' || e.target.id==='startDevBtn')) setTimeout(install,120);
  });
  document.addEventListener('input', e=>{
    if(e.target && e.target.matches && e.target.matches('#devPanel input[type="range"]')) syncRange(e.target);
  }, true);
  document.addEventListener('change', e=>{
    if(e.target && e.target.matches && e.target.matches('#devPanel input[type="range"]')) syncRange(e.target);
  }, true);
  setInterval(()=>{ if(document.body.classList.contains('devMode')) install(); }, 700);
  window.addEventListener('load', ()=>setTimeout(install,400));
})();


(function(){
  if(window.__ctwFinalEditorLayoutFix) return;
  window.__ctwFinalEditorLayoutFix=true;
  function $(id){return document.getElementById(id)}
  function addCompareButton(){
    const tools=$('devPreviewZoomTools');
    if(!tools || $('ctwCompareBtn')) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='ctwCompareBtn';
    btn.textContent=document.body.classList.contains('ctwCompareOpen')?'Compare: on':'Compare: off';
    btn.onclick=function(){
      document.body.classList.toggle('ctwCompareOpen');
      btn.textContent=document.body.classList.contains('ctwCompareOpen')?'Compare: on':'Compare: off';
      try{ if(typeof updateCleanFrameCompare==='function') updateCleanFrameCompare(); }catch(e){}
    };
    tools.appendChild(btn);
  }
  function improveZoomLabels(){
    const pairs=[
      ['previewZoomRange','previewZoomVal','%'],
      ['previewPanXRange','previewPanXVal','px'],
      ['previewPanYRange','previewPanYVal','px']
    ];
    pairs.forEach(([rangeId,valId,suffix])=>{
      const r=$(rangeId), v=$(valId);
      if(!r || !v) return;
      const sync=()=>{ v.textContent=String(r.value)+suffix; };
      r.addEventListener('input',sync);
      r.addEventListener('change',sync);
      sync();
    });
  }
  function keepSlidersSynced(){
    const panel=$('devPanel');
    if(!panel) return;
    panel.querySelectorAll('input[type="range"]').forEach(r=>{
      if(r.dataset.ctwFinalSync) return;
      r.dataset.ctwFinalSync='1';
      const field=r.closest('.devField');
      let num=field ? Array.from(field.querySelectorAll('input[type="number"]')).find(n=>n!==r) : null;
      if(num){
        const copyRange=()=>{ num.value=r.value; };
        const copyNum=()=>{ r.value=num.value; r.dispatchEvent(new Event('input',{bubbles:true})); };
        r.addEventListener('input',copyRange);
        r.addEventListener('change',copyRange);
        num.addEventListener('input',copyNum);
        copyRange();
      }
    });
  }
  function tick(){
    addCompareButton();
    improveZoomLabels();
    keepSlidersSynced();
  }
  setInterval(tick,500);
  document.addEventListener('input',()=>setTimeout(tick,0));
  document.addEventListener('click',()=>setTimeout(tick,0));
  window.addEventListener('load',tick);
})();


(function(){
  if(window.__ctwStableLiveSave) return;
  window.__ctwStableLiveSave=true;
  const ADMIN_KEY_STORAGE='ctw-live-admin-key-v2';
  function $(id){return document.getElementById(id)}
  function msg(t){const s=$('ctwLiveStatus'); if(s)s.textContent=t; try{if(typeof showToast==='function')showToast(t)}catch(e){} console.log('[CTW live save]',t)}
  function adminKey(){return ($('ctwAdminKey')?.value||localStorage.getItem(ADMIN_KEY_STORAGE)||'').trim()}
  function rememberKey(){const k=($('ctwAdminKey')?.value||'').trim(); if(k)localStorage.setItem(ADMIN_KEY_STORAGE,k)}
  function collect(){
    try{
      if(typeof window.CTW_collectGameConfig==='function'){
        const full=window.CTW_collectGameConfig();
        full.version=3;
        full.savedBy='developer-mode-live-save';
        full.savedAt=new Date().toISOString();
        return full;
      }
    }catch(e){console.warn('Could not collect full game config',e)}
    const out={version:2, savedBy:'developer-mode', savedAt:new Date().toISOString()};
    try{ if(typeof devConfig!=='undefined') out.devConfig=JSON.parse(JSON.stringify(devConfig||{})); }catch(e){out.devConfig={};}
    try{ if(typeof CHARACTERS!=='undefined') out.characters=JSON.parse(JSON.stringify(CHARACTERS||{})); }catch(e){}
    try{ if(typeof QUESTS!=='undefined') out.quests=JSON.parse(JSON.stringify(QUESTS||[])); }catch(e){}
    return out;
  }
  function apply(config){
    if(!config) return false;
    try{
      if(typeof window.CTW_applyGameConfig==='function'){
        window.CTW_applyGameConfig(config,'Cloudflare KV');
        return true;
      }
    }catch(e){console.warn('Could not apply full game config',e)}
    try{
      if(config.devConfig && typeof devConfig!=='undefined'){
        Object.keys(devConfig).forEach(k=>delete devConfig[k]);
        Object.assign(devConfig, config.devConfig);
        if(typeof saveDevConfig==='function') saveDevConfig();
      }
    }catch(e){console.warn('Could not apply devConfig',e)}
    try{
      if(config.characters && typeof CHARACTERS!=='undefined'){
        Object.keys(CHARACTERS).forEach(k=>delete CHARACTERS[k]);
        Object.assign(CHARACTERS, JSON.parse(JSON.stringify(config.characters)));
      }
    }catch(e){console.warn('Could not apply characters',e)}
    try{
      if(Array.isArray(config.quests) && typeof QUESTS!=='undefined'){
        QUESTS.splice(0, QUESTS.length, ...JSON.parse(JSON.stringify(config.quests)));
      }
    }catch(e){console.warn('Could not apply quests',e)}
    try{ if(typeof buildChoices==='function') buildChoices(); }catch(e){}
    try{ if(typeof renderDev==='function') renderDev(); }catch(e){}
    try{ if(typeof createCharacterEls==='function') createCharacterEls(); }catch(e){}
    try{ if(typeof renderFrames==='function') renderFrames(); }catch(e){}
    try{ if(typeof updateFrameScopeReadout==='function') updateFrameScopeReadout(); }catch(e){}
    return true;
  }
  async function loadLive(){
    try{
      const res=await fetch('/api/game-config?ctw='+Date.now(),{cache:'no-store'});
      const data=await res.json().catch(()=>null);
      if(!res.ok) throw new Error((data&&data.error)||('HTTP '+res.status));
      if(!data.config){msg('Live save is connected. No config saved yet.'); return false;}
      apply(data.config); msg('Loaded live config from Cloudflare KV.'); return true;
    }catch(e){msg('Load failed: '+(e.message||e)); return false;}
  }
  async function saveLive(){
    const key=adminKey(); if(!key){msg('Enter your admin save key first.'); return false;} rememberKey();
    try{ if(typeof applyDevInputs==='function') applyDevInputs(); }catch(e){}
    try{ if(typeof saveDevConfig==='function') saveDevConfig(); }catch(e){}
    try{
      const res=await fetch('/api/save-game-config',{method:'POST',headers:{'content-type':'application/json','x-admin-key':key},body:JSON.stringify({config:collect()})});
      const data=await res.json().catch(()=>null);
      if(!res.ok || !data?.ok) throw new Error((data&&data.error)||('HTTP '+res.status));
      msg('Saved to live game. Refresh another browser to check it loads.'); return true;
    }catch(e){msg('Save failed: '+(e.message||e)); return false;}
  }
  function install(){
    const panel=document.querySelector('#devPanel .devControlsPane') || document.getElementById('devPanel');
    if(!panel || $('ctwLiveSaveBox')) return;
    const box=document.createElement('section');
    box.id='ctwLiveSaveBox';
    box.innerHTML=`<h2>Live save</h2>
      <div class="liveHelp">Use this after your sprite/layer settings are right. This saves to Cloudflare KV so you do not need to upload game_config.json.</div>
      <label for="ctwAdminKey">Admin save key</label><input id="ctwAdminKey" type="password" placeholder="Paste your CTW_GAME_ADMIN_KEY">
      <div class="liveBtns"><button id="ctwSaveLiveBtn" type="button">Save to live game</button><button id="ctwLoadLiveBtn" class="blueBtn" type="button">Load live config</button><button id="ctwForgetKeyBtn" class="pinkBtn" type="button">Forget key</button></div>
      <div id="ctwLiveStatus">Ready. Test /api/game-config if save fails.</div>`;
    const tabs=panel.querySelector('.ctwDevTabs');
    if(tabs && tabs.nextSibling) panel.insertBefore(box,tabs.nextSibling); else panel.appendChild(box);
    const saved=localStorage.getItem(ADMIN_KEY_STORAGE); if(saved && $('ctwAdminKey')) $('ctwAdminKey').value=saved;
    $('ctwSaveLiveBtn')?.addEventListener('click',saveLive);
    $('ctwLoadLiveBtn')?.addEventListener('click',loadLive);
    $('ctwForgetKeyBtn')?.addEventListener('click',()=>{localStorage.removeItem(ADMIN_KEY_STORAGE); if($('ctwAdminKey'))$('ctwAdminKey').value=''; msg('Forgot admin key on this browser.');});
  }
  window.CTW_saveLiveConfig=saveLive; window.CTW_loadLiveConfig=loadLive;
  install(); setTimeout(install,300); setTimeout(install,1200); document.addEventListener('click',()=>setTimeout(install,60));
  // Auto-load live config quietly on first page load if API is connected.
  window.addEventListener('load',()=>setTimeout(()=>loadLive(false),800));
})();
