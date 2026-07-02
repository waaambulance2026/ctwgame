
// EDIT SECTION 16: BASIC HELPERS, CLOUDINARY BASE, DEFAULT SETTINGS AND SAFE BROWSER SAVE CLEANUP
const $=id=>document.getElementById(id);const root=document.documentElement;const CLOUD='https://res.cloudinary.com/dpwlfmhia/image/upload';
// Fixed design canvas. Everything inside #game is positioned against this size, then the whole game is scaled to the real screen.
const DESIGN_W=1920, DESIGN_H=1080;
let currentGameScale=1,currentGameLeft=0,currentGameTop=0;
const pad2=n=>String(n).padStart(2,'0'), pad3=n=>String(n).padStart(3,'0');
// EDITOR SAVED LAYOUT APPLIED 2026-06-24: latest building sizes + image links preserved.
const DEFAULTS={floorPx:70,platformH:30,playerX:150,playerW:170,playerDrop:1,buddyX:265,buddyW:115,buddyDrop:13,hillsH:445,hillsBottom:82,groundH:757,groundBottom:-120,tokenLift:126,hazardLift:58,zSky:0,zHills:1,zGround:39,zPlatform:0,zBuddy:46,zPlayer:58,zBuildings:25,zObjects:50};
const VERSION='ctw_game_current_saved_layout_v3_team_facing';
const SAFE_LAYOUT_SAVE_KEY='ctw_game_places_layout_v8_user_exact_settings_20260625';
// These are the exact layout settings you pasted in chat.
// Reset safe layout returns to these values.
const USER_EXACT_LAYOUT_SETTINGS={
  floorPx:70,platformH:30,playerX:150,playerW:170,playerDrop:1,
  buddyX:265,buddyW:115,buddyDrop:13,hillsH:445,hillsBottom:82,
  groundH:757,groundBottom:-120,tokenLift:126,hazardLift:58,
  zSky:0,zHills:1,zGround:39,zPlatform:0,zBuddy:46,zPlayer:58,zBuildings:25,zObjects:50,
  main:'ax',buddy:'none',team:false,teamExtra:['none','none'],mainFlip:1,buddyFlip:1,
  petPlayerW:115,petFlip:-1,
  placeLayout:{
    welcomeBoard:{at:-1723,width:168,height:200,yOffset:-24,z:48},
    petShop:{at:-332,width:374,height:262,yOffset:-100.20001220703125,z:48},
    habitat:{at:1048,width:405,height:253,yOffset:-120,z:48},
    hookWaaambulance:{at:2411,width:250,height:185,yOffset:-120,z:48},
    questStarter:{at:3826,width:260,height:200,yOffset:-119.20001220703125,z:48}
  }
};
// Clear old broken browser saves once. These were made before sprite/facing controls were stable.
Object.keys(localStorage).forEach(k=>{
  const lower=String(k).toLowerCase();
  if(
    lower.startsWith('ctw_game_v') ||
    lower.startsWith('ctw_game_layout_v') ||
    /^v\d+_/.test(lower) ||
    lower === 'ctw_game_current_saved_layout_v2' ||
    lower === 'ctw_game_current_saved_layout_v3' ||
    lower === 'ctw_game_current_clean' ||
    lower.includes('movement_idle_fix') ||
    lower.includes('team_follower') ||
    lower.includes('team_editor')
  ){ localStorage.removeItem(k); }
});

/* No-spam asset loader.
   Earlier builds guessed lots of possible filenames. That caused walls of 404 errors and could stall PetBot.
   This version uses ONE pattern per character/action and remembers failed URLs so the browser is not hammered. */
const spriteBroken=new Set();
const spriteCurrent={sprite:'',buddySprite:''};
// EDIT SECTION 17: SPRITE PATHS - ONE PLACE ONLY
// This is the single source of truth for character image files.
// Edit these paths after uploading PNGs to Cloudinary, then upload index.html and hard refresh.
// Do not put Cloudflare KV game_config sprite paths here.
// Number rules:
//   {n}  = 001, 002, 003
//   {nn} = 01, 02, 03
//   {i}  = 1, 2, 3
let SPRITE_PATTERNS={
ax:{
  idle:`${CLOUD}/ax_idle_{n}.png`,
  walk:`${CLOUD}/ax_walk_{n}.png`,
  jump:`${CLOUD}/ax_jump_{n}.png?v=axjump2`
},

  pura:{
    idle:`${CLOUD}/pura_idle_{n}.png`,
    walk:`${CLOUD}/pura_walk_{n}.png`,
    jump:`${CLOUD}/pura_jump_{n}.png`
  },

  owl:{
    idle:`${CLOUD}/owl_idle_{n}.png`,
    walk:`${CLOUD}/owl_walk_{n}.png`,
    jump:`${CLOUD}/owl_jump_{i}.png`
  },

  unicorn:{
    idle:`${CLOUD}/unicorn_idle_{n}.png`,
    walk:`${CLOUD}/unicorn_walk_{n}.png`,
    jump:`${CLOUD}/unicorn_jump_{n}.png`
  }
};

function fillSpritePattern(pattern,idx,totalFrames=10){
  if(!pattern)return'';
  if(Array.isArray(pattern)){
    if(!pattern.length)return'';
    const safeIndex=((Number(idx)||0)%pattern.length+pattern.length)%pattern.length;
    return pattern[safeIndex]||'';
  }
  totalFrames=Math.max(1,Number(totalFrames)||10);
  const frame=((idx%totalFrames)+1);
  // {n} = 001 by default for old Ax/Pura files. {nn} = 01. {i} = 1 for unpadded files like owl_idle_1.png.
  return String(pattern)
    .replaceAll('{nnn}',pad3(frame))
    .replaceAll('{nn}',pad2(frame))
    .replaceAll('{i}',String(frame))
    .replaceAll('{raw}',String(frame))
    .replaceAll('{n}',pad3(frame));
}
function spriteUrlFor(char,action,idx){
  if(char==='pet'&&currentPetImage)return currentPetImage;
  const p=SPRITE_PATTERNS[char]||SPRITE_PATTERNS.ax;
  const total=getActionFrameCount(char,action);
  return fillSpritePattern((p&&p[action])||(p&&p.walk)||(p&&p.idle)||'',displayFrameIndex(char,action,idx,total),total);
}
function setSpriteMissing(elId,on,msg){
  const el=$(elId); const wrap=el?el.closest('.character'):null;
  if(!wrap)return;
  wrap.classList.toggle('spriteMissing',!!on);
  if(msg)wrap.dataset.missing=msg;
}
function pushSpriteCandidate(list,pattern,idx,totalFrames=10){
  if(!pattern)return;
  const add=u=>{ if(u&&!list.includes(u))list.push(u); };
  if(Array.isArray(pattern)){
    add(fillSpritePattern(pattern,idx,pattern.length));
    return;
  }
  const raw=String(pattern);
  add(fillSpritePattern(raw,idx,totalFrames));
}
function candidateSpriteUrls(char,action,idx){
  if(char==='pet'&&currentPetImage)return [currentPetImage];
  const p=SPRITE_PATTERNS[char]||SPRITE_PATTERNS.ax;
  const out=[];
  const total=getActionFrameCount(char,action);
  const shownFrameIndex=displayFrameIndex(char,action,idx,total);
  // Single source of truth: only try the exact path for the selected character/action.
  pushSpriteCandidate(out,p&&p[action],shownFrameIndex,total);
  return out.filter(Boolean);
}

function preloadSpriteAction(char,action){
  const count=getActionFrameCount(char,action);
  for(let i=0;i<count;i++){
    candidateSpriteUrls(char,action,i).forEach(url=>{
      if(!url||spriteBroken.has(url))return;
      const img=new Image();
      img.decoding='async';
      img.loading='eager';
      img.src=url;
      if(img.decode)img.decode().catch(()=>{});
    });
  }
}
function preloadAllGameSprites(){
  ['ax','pura','owl','unicorn'].forEach(char=>{
    ['idle','walk','jump'].forEach(action=>preloadSpriteAction(char,action));
  });
  if(currentPetImage){
    const img=new Image();
    img.decoding='async';
    img.src=currentPetImage;
  }
}
function preloadAxWalkFrames(){
  // Kept as an old function name so older calls still work.
  // It now preloads every character/action, not only Ax walk.
  preloadAllGameSprites();
}

function spriteFallbackLabel(char){
  const labels={ax:'AX',pura:'PURA',owl:'OWL',unicorn:'UNICORN',pet:'PET'};
  return labels[char]||String(char||'SPRITE').toUpperCase();
}
function spriteFallbackEmoji(char){
  const emojis={ax:'🚑',pura:'🐾',owl:'🦉',unicorn:'🦄',pet:'🐾'};
  return emojis[char]||'❔';
}
function fallbackSpriteDataUri(char,action){
  const label=spriteFallbackLabel(char);
  const emoji=spriteFallbackEmoji(char);
  const bg=char==='owl'?'#76C7D8':(char==='pura'?'#d282c2':'#F5C542');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 260"><rect width="220" height="260" rx="44" fill="${bg}" opacity="0.92"/><text x="110" y="105" text-anchor="middle" font-size="70">${emoji}</text><text x="110" y="178" text-anchor="middle" font-size="32" font-family="Arial" font-weight="900" fill="#24152e">${label}</text><text x="110" y="214" text-anchor="middle" font-size="17" font-family="Arial" font-weight="700" fill="#24152e">sprite path missing</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function useFallbackSprite(elId,char,action){
  const el=$(elId);
  if(!el)return;
  const fallback=fallbackSpriteDataUri(char,action);
  el.onerror=null;
  el.onload=null;
  el.src=fallback;
  spriteCurrent[elId]=fallback;
  setSpriteMissing(elId,true,`${spriteFallbackLabel(char)} sprite path missing - check ${action} URL`);
}
function shouldShowImmediateFallback(char){
  // IMPORTANT FIX: Do not force the Owl placeholder every animation tick.
  // The old return char==='owl' kept replacing the real Owl image with the "sprite missing" card.
  return false;
}
function setSpriteImage(elId,url){
  const el=$(elId);
  if(!el||!url||spriteBroken.has(url)||spriteCurrent[elId]===url)return false;
  el.onerror=()=>{
    spriteBroken.add(url);
    if(spriteCurrent[elId]===url) spriteCurrent[elId]='';
    setSpriteMissing(elId,true,'Sprite missing - check URL pattern');
  };
  el.onload=()=>{spriteCurrent[elId]=url;setSpriteMissing(elId,false);};
  el.src=url;
  spriteCurrent[elId]=url;
  return true;
}
function updateSpriteDebug(elId,char,action,frameIndex,totalFrames,url,status){
  const dbg=$('axFrameDebug');
  if(!dbg)return;
  if(char!=='ax'&&elId!=='sprite')return;
  const frameNo=Number(frameIndex||0)+1;
  dbg.textContent=[
    `Character: ${characterName(char)}`,
    `Action: ${action||'idle'}`,
    `Frame: ${pad3(frameNo)} / ${String(totalFrames||1).padStart(3,'0')}`,
    `Loaded: ${status||'trying'}`,
    `URL: ${url||'none'}`
  ].join('\n');
}

function setSpriteFrame(elId,char,action,idx){
  const el=$(elId);
  if(!el)return;

  el.dataset.action=action||'idle';
  el.dataset.character=char||'';

  const totalForDisplay=getActionFrameCount(char,action);
  const shownFrameIndex=displayFrameIndex(char,action,idx,totalForDisplay);
  el.dataset.frameIndex=String(shownFrameIndex);
  el.dataset.frameNumber=String(shownFrameIndex+1);
  applySpriteTransform();
  ensureActionFrameCount(char,action);

  const urls=candidateSpriteUrls(char,action,idx).filter(Boolean);
  const url=urls.find(u=>!spriteBroken.has(u))||urls[0]||'';
  updateSpriteDebug(elId,char,action,shownFrameIndex,totalForDisplay,url,spriteBroken.has(url)?'broken':'trying');
  if(!url){useFallbackSprite(elId,char,action);updateSpriteDebug(elId,char,action,shownFrameIndex,totalForDisplay,'','missing pattern');return;}

  // WALK ANIMATION FIX:
  // Do not wait for a hidden tester image before swapping frames.
  // The old tester could time out on Cloudinary and leave the sprite dragging along
  // on one frame. Set the frame immediately; only use the fallback after a real image error.
  if(spriteCurrent[elId]!==url){
    el.onerror=()=>{
      spriteBroken.add(url);
      if(spriteCurrent[elId]===url)spriteCurrent[elId]='';
      useFallbackSprite(elId,char,action);
      updateSpriteDebug(elId,char,action,shownFrameIndex,totalForDisplay,url,'FAILED');
    };
    el.onload=()=>{spriteCurrent[elId]=url;setSpriteMissing(elId,false);updateSpriteDebug(elId,char,action,shownFrameIndex,totalForDisplay,url,'yes');};
    el.src=url;
    spriteCurrent[elId]=url;
  }
  setSpriteMissing(elId,false);
}
// EDIT SECTION 18A: ANIMATION SPEEDS
// Lower numbers = faster frame changes. Higher numbers = slower frame changes.
// Ax idle now loops continuously, so 145ms gives a visible but not frantic phone-idle animation.
const SETS={
  ax:{name:'Ax',frameMs:95,actionMs:{idle:115,walk:95,jump:80}},
  pura:{name:'Pura',frameMs:100,actionMs:{idle:115,walk:72,jump:66}},
  owl:{name:'Owl',frameMs:115,actionMs:{idle:135,walk:82,jump:72}},
  unicorn:{name:'Unicorn',frameMs:105,actionMs:{idle:125,walk:72,jump:72}},
  pet:{name:'Pet',frameMs:105,actionMs:{idle:115,walk:76,jump:72}}
};
// EDIT SECTION 18B: FRAME COUNTS + CHARACTER SIZE LOCK
// This file is matched to the strict normalised Ax pack:
// ax_idle_001.png to ax_idle_010.png
// ax_walk_001.png to ax_walk_010.png
// ax_jump_001.png to ax_jump_010.png
// Forced counts stop old extra Cloudinary images being used by mistake.
// Ax current files: idle = 10 frames, walk = 10 frames, jump = 10 frames.
// If you upload a different number later, change ACTION_FRAME_OVERRIDES below.
const FRAME_PROBE_MAX=60;
const FRAME_PROBE_STOP_AFTER_MISSES=2;
const ACTION_FRAME_CACHE={};
const ACTION_FRAME_PROBING={};
// Manual frame counts stop Cloudinary auto-detect using old extra frames.
// Only force actions where we know the exact number.
const ACTION_FRAME_OVERRIDES={
  ax:{idle:10,walk:10,jump:10},
  pura:{walk:4},
  owl:{walk:10},
  unicorn:{walk:4}
};
const CHARACTER_CONFIGS={
  ax:{
    name:'Ax',
    boxW:170,
    visualScale:1,
    visualX:0,
    visualY:0,
    shadowScale:1,
    slotY:{buddy:16,team:18},
    actionVisuals:{
      idle:{visualScale:1.08,visualX:0,visualY:0},
      walk:{visualScale:1,visualX:0,visualY:0},
      jump:{visualScale:1,visualX:0,visualY:0}
    }
  },
  pura:{name:'Pura',boxW:150,visualScale:1,visualX:0,visualY:0,shadowScale:.88},
  owl:{name:'Owl',boxW:130,visualScale:.9,visualX:0,visualY:6,shadowScale:.72},
  unicorn:{
    name:'Unicorn',
    boxW:178,
    visualScale:1.00,
    visualX:0,
    visualY:2,
    shadowScale:.88,
    reverseWalk:false,
    actionVisuals:{
      idle:{visualScale:1.02,visualY:6},
      walk:{
        visualScale:.82,
        visualY:10,
        frameVisuals:{
          1:{visualY:10},
          2:{visualY:2},
          3:{visualY:10},
          4:{visualY:2}
        }
      },
      jump:{visualScale:1.00,visualY:10}
    }
  },
  pet:{name:'Pet',boxW:115,visualScale:1,visualX:0,visualY:0,shadowScale:.9}
};

function actionFrameKey(characterKey,action){return `${characterKey||'ax'}:${action||'idle'}`}
function getActionFrameCount(characterKey,action){
  const p=SPRITE_PATTERNS[characterKey]||SPRITE_PATTERNS.ax||{};
  const exactFrames=p&&p[action];
  if(Array.isArray(exactFrames))return Math.max(1,exactFrames.length);
  const forced=ACTION_FRAME_OVERRIDES[characterKey]?.[action];
  if(forced)return forced;
  const key=actionFrameKey(characterKey,action);
  return ACTION_FRAME_CACHE[key]||1; // 1 frame until the quick auto-count finishes
}
function displayFrameIndex(characterKey,action,idx,totalFrames){
  const total=Math.max(1,Number(totalFrames)||1);
  const clean=((Number(idx)||0)%total+total)%total;
  const cfg=getCharacterVisualConfig(characterKey);
  // Unicorn walk art was drawn facing the right way but animated backwards.
  // This plays walk frames as 10,9,8...1 instead of 1,2,3...10.
  if(cfg&&cfg.reverseWalk&&action==='walk')return total-1-clean;
  return clean;
}
function fillSpritePatternFrame(pattern,frame){
  if(!pattern)return'';
  return String(pattern)
    .replaceAll('{nnn}',pad3(frame))
    .replaceAll('{nn}',pad2(frame))
    .replaceAll('{i}',String(frame))
    .replaceAll('{raw}',String(frame))
    .replaceAll('{n}',pad3(frame));
}
function frameUrlNumberVariants(pattern,frame){
  if(!pattern)return [];
  // No number-format guessing. Use {n}, {nn}, or {i} correctly in SPRITE_PATTERNS.
  return [fillSpritePatternFrame(pattern,frame)];
}
function imageLoads(url,timeout=1200){
  return new Promise(resolve=>{
    if(!url)return resolve(false);
    const img=new Image();
    let done=false;
    const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok)};
    const timer=setTimeout(()=>finish(false),timeout);
    img.onload=()=>finish(true);
    img.onerror=()=>finish(false);
    img.src=url;
  });
}
function patternVariants(pattern){
  // No extension guessing. The URL in SPRITE_PATTERNS must be the real file path.
  if(Array.isArray(pattern))return pattern.filter(Boolean);
  return pattern?[pattern]:[];
}
function patternsForAction(characterKey,action){
  if(characterKey==='pet')return [];
  const p=SPRITE_PATTERNS[characterKey]||SPRITE_PATTERNS.ax||{};
  return [...new Set([p[action]].filter(Boolean).flatMap(patternVariants))];
}
async function countFramesForPattern(pattern){
  let count=0, misses=0;
  for(let frame=1; frame<=FRAME_PROBE_MAX; frame++){
    let ok=false;
    for(const url of frameUrlNumberVariants(pattern,frame)){
      if(await imageLoads(url,900)){ok=true;break;}
    }
    if(ok){count=frame;misses=0;}
    else{
      misses++;
      if(frame===1)break;
      if(count>0&&misses>=FRAME_PROBE_STOP_AFTER_MISSES)break;
    }
  }
  return count;
}
async function autoDetectActionFrames(characterKey,action){
  if(!characterKey||characterKey==='pet')return 1;
  const key=actionFrameKey(characterKey,action);
  if(ACTION_FRAME_CACHE[key])return ACTION_FRAME_CACHE[key];
  if(ACTION_FRAME_PROBING[key])return ACTION_FRAME_PROBING[key];
  ACTION_FRAME_PROBING[key]=(async()=>{
    let bestCount=0, bestPattern='';
    for(const pattern of patternsForAction(characterKey,action)){
      const count=await countFramesForPattern(pattern);
      if(count>bestCount){bestCount=count;bestPattern=pattern;}
      if(count>0)break; // use the first working pattern so we do not spam Cloudinary
    }
    ACTION_FRAME_CACHE[key]=Math.max(1,bestCount||1);
    if(bestPattern){
      SPRITE_PATTERNS[characterKey]=SPRITE_PATTERNS[characterKey]||{};
      SPRITE_PATTERNS[characterKey][action]=bestPattern;
    }
    delete ACTION_FRAME_PROBING[key];
    if($('spriteStatus'))$('spriteStatus').textContent=`Auto frames: ${characterKey} ${action} = ${ACTION_FRAME_CACHE[key]} frame(s)`;
    return ACTION_FRAME_CACHE[key];
  })();
  return ACTION_FRAME_PROBING[key];
}
function ensureActionFrameCount(characterKey,action){
  const key=actionFrameKey(characterKey,action);
  const p=SPRITE_PATTERNS[characterKey]||SPRITE_PATTERNS.ax||{};
  const exactFrames=p&&p[action];
  const forced=ACTION_FRAME_OVERRIDES[characterKey]?.[action];
  if(Array.isArray(exactFrames)||forced){
    ACTION_FRAME_CACHE[key]=getActionFrameCount(characterKey,action);
    return;
  }
  if(!ACTION_FRAME_CACHE[key]&&!ACTION_FRAME_PROBING[key]){
    autoDetectActionFrames(characterKey,action).then(()=>{
      // Do not reset the visible sprites here. Resetting here can kick Pura back to idle mid-walk.
    });
  }
}
function getCharacterVisualConfig(characterKey){return CHARACTER_CONFIGS[characterKey]||CHARACTER_CONFIGS.pet}
function getActionVisualConfig(characterKey, action, frameIndex = 0){
  const cfg = getCharacterVisualConfig(characterKey);
  const actionCfg = (cfg.actionVisuals && cfg.actionVisuals[action]) || {};
  const frameNo = (Number(frameIndex) || 0) + 1;
  const frameCfg = (actionCfg.frameVisuals && (actionCfg.frameVisuals[frameNo] || actionCfg.frameVisuals[String(frameNo)])) || {};

  return {
    ...cfg,
    ...actionCfg,
    ...frameCfg,
    frameNo
  };
}
function characterBoxWidth(characterKey){
  if(characterKey==='pet')return Math.max(45,Math.min(240,Number(petPlayerW)||CHARACTER_CONFIGS.pet.boxW));
  return getCharacterVisualConfig(characterKey).boxW||150;
}
function selectedTeamMembers(){
  const raw=[main,buddy,...(teamExtra||[])];
  const out=[];
  raw.forEach(ch=>{if(ch&&ch!=='none'&&!out.includes(ch))out.push(ch)});
  return out.length?out:['ax'];
}
function applyTeamSlotPositions(members=selectedTeamMembers()){
  const count=members.length;
  const positions={
    1:[''],
    2:['24vw','13vw'],
    3:['26vw','15vw','6vw'],
    4:['24vw','14vw','6vw','34vw']
  }[Math.min(4,Math.max(1,count))]||[''];
  const pairs=[['player','shadow'],['buddy','buddyShadow'],['teamMate2','teamShadow2'],['teamMate3','teamShadow3']];
  pairs.forEach(([charId,shadowId],i)=>{
    const ch=$(charId), sh=$(shadowId), pos=positions[i];
    if(ch)ch.style.left=pos||'';
    if(sh)sh.style.left=pos||'';
  });
}
function applyCharacterSlotSizes(){
  characterSlotSizeDirty=false;
  const members=selectedTeamMembers();
  applyTeamSlotPositions(members);
  const teamScale=members.length>1?.88:1;
  const mainW=Math.round(characterBoxWidth(main)*(members.length>1?.94:1));
  const buddyW=buddy&&buddy!=='none'?Math.round(characterBoxWidth(buddy)*teamScale):0;
  setVar('playerW',mainW,'px');
  if(buddy&&buddy!=='none')setVar('buddyW',buddyW,'px');
  if($('calPlayerW')){$('calPlayerW').value=mainW;$('calPlayerWVal').textContent=mainW+'px auto';}
  if($('calBuddyW')){$('calBuddyW').value=buddyW||characterBoxWidth(buddy);$('calBuddyWVal').textContent=(buddyW||0)+'px auto';}
  if($('shadow'))$('shadow').style.width=Math.max(72,mainW*.72)+'px';
  if($('buddyShadow'))$('buddyShadow').style.width=Math.max(52,buddyW*.68)+'px';
  const t2Key=(teamExtra&&teamExtra[0])||'none';
  const t3Key=(teamExtra&&teamExtra[1])||'none';
  const t2W=t2Key!=='none'?Math.round(Math.max(76,characterBoxWidth(t2Key)*teamScale)):0;
  const t3W=t3Key!=='none'?Math.round(Math.max(76,characterBoxWidth(t3Key)*teamScale)):0;
  if($('teamMate2')){$('teamMate2').style.width=(t2W||1)+'px';$('teamMate2').style.height=Math.round((t2W||1)*1.62)+'px';}
  if($('teamMate3')){$('teamMate3').style.width=(t3W||1)+'px';$('teamMate3').style.height=Math.round((t3W||1)*1.62)+'px';}
  if($('teamShadow2'))$('teamShadow2').style.width=Math.max(48,t2W*.66)+'px';
  if($('teamShadow3'))$('teamShadow3').style.width=Math.max(48,t3W*.66)+'px';
}

function slotVisualY(characterKey,slotName){
  const cfg=getCharacterVisualConfig(characterKey);
  return Number((cfg.slotY&&cfg.slotY[slotName])||0);
}

function cleanNum(value, fallback = 0){
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function spriteTransform(characterKey, action, frameIndex, direction, slotName, extraScale = 1){
  const cfg = getActionVisualConfig(characterKey, action, frameIndex);

  const x = cleanNum(cfg.visualX, 0);
  const y = cleanNum(cfg.visualY, 0) + slotVisualY(characterKey, slotName);
  const scale = cleanNum(cfg.visualScale, 1) * extraScale;

  return `translate(${x}px, ${y}px) scaleX(${direction}) scale(${scale})`;
}

function applySpriteTransform(){
  if(characterSlotSizeDirty){
    characterSlotSizeDirty=false;
    applyCharacterSlotSizes();
  }

  const mainAction = ($('sprite') && $('sprite').dataset.action) || 'idle';
  const buddyAction = ($('buddySprite') && $('buddySprite').dataset.action) || 'idle';
  const t2Action = ($('teamSprite2') && $('teamSprite2').dataset.action) || 'idle';
  const t3Action = ($('teamSprite3') && $('teamSprite3').dataset.action) || 'idle';

  const mainFrameIndex = Number(($('sprite') && $('sprite').dataset.frameIndex) || 0);
  const buddyFrameIndex = Number(($('buddySprite') && $('buddySprite').dataset.frameIndex) || 0);
  const t2FrameIndex = Number(($('teamSprite2') && $('teamSprite2').dataset.frameIndex) || 0);
  const t3FrameIndex = Number(($('teamSprite3') && $('teamSprite3').dataset.frameIndex) || 0);

  const mainDirection = (Number(mainFlip) || 1) * facing;
  const buddyDirection = (Number(buddyFlip) || 1) * facing;

  if($('sprite')){
    $('sprite').style.transform = spriteTransform(main, mainAction, mainFrameIndex, mainDirection, 'main', 1);
  }

  if($('buddySprite')){
    $('buddySprite').style.transform = spriteTransform(buddy, buddyAction, buddyFrameIndex, buddyDirection, 'buddy', 1);
  }

  const t2 = (teamExtra && teamExtra[0]) || 'owl';
  const t3 = (teamExtra && teamExtra[1]) || 'unicorn';

  if($('teamSprite2')){
    $('teamSprite2').style.transform = spriteTransform(t2, t2Action, t2FrameIndex, buddyDirection, 'team', .92);
  }

  if($('teamSprite3')){
    $('teamSprite3').style.transform = spriteTransform(t3, t3Action, t3FrameIndex, buddyDirection, 'team', .92);
  }

  if($('shadow')) $('shadow').style.opacity = main === 'owl' ? '.28' : '.72';
  if($('buddyShadow')) $('buddyShadow').style.opacity = buddy === 'owl' ? '.25' : '.65';
}
// EDIT SECTION 19: GAME STATE - selected characters, score, lives, movement and pet variables
let main='ax', buddy='none', team=false, teamExtra=['none','none'], mainFrame=0,buddyFrame=0,lastFrame=0,lastBuddyFrame=0,last=0;let playing=false,paused=false,ended=false,score=0,lives=3,levelIndex=0,distance=0,spawnTimer=0,finishMade=false;let groundX=0,hillX=0;let player={x:0,jump:0,vy:0,grounded:true,jumpPrepUntil:0,jumpStartedAt:0,jumpLandUntil:0,jumpRecoveryUntil:0};let objects=[], spawnedPlan=new Set(), currentPetImage='', currentPet=null, currentPetMeta={};let nearbyBuilding=null, nearbyInteractable=null,lastBuildingPrompt=0,lastObjectPrompt=0;let petPlayerW=115, petFlip=-1, mainFlip=1, buddyFlip=1, facing=1;const keys={left:false,right:false,jump:false};
const idleAnim={sprite:{playing:false,next:0,frame:0,last:0},buddySprite:{playing:false,next:0,frame:0,last:0},teamSprite2:{playing:false,next:0,frame:0,last:0},teamSprite3:{playing:false,next:0,frame:0,last:0}};
let visualWalkUntil=0;
let characterSlotSizeDirty=true;
function markCharacterSlotSizeDirty(){characterSlotSizeDirty=true;}
function resetIdleAnim(){const now=performance.now();Object.values(idleAnim).forEach(s=>{s.playing=false;s.frame=0;s.last=0;s.next=now+2600+Math.random()*2600;});}
function movementInput(){return (keys.right?1:0)-(keys.left?1:0)}
function updateSpriteFacing(input=0){
  const oldFacing=facing;
  if(input<0)facing=-1;
  if(input>0)facing=1;
  // Stage 26: only repaint sprite transforms when facing actually changes.
  // The old code rebuilt sprite sizes/transforms every animation frame while walking, which made walking feel laggy.
  if(facing!==oldFacing||characterSlotSizeDirty)applySpriteTransform();
}
// EDIT SECTION 20: LEVEL DATA - edit Level 1 items, hazards, Cloudinary paths and scores here
function placeSvg(title,emoji,colourA='#d282c2',colourB='#76C7D8'){
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 310"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${colourA}"/><stop offset="1" stop-color="${colourB}"/></linearGradient></defs><ellipse cx="210" cy="284" rx="150" ry="20" fill="rgba(0,0,0,.22)"/><rect x="55" y="80" width="310" height="175" rx="34" fill="url(#g)" stroke="white" stroke-width="10"/><rect x="82" y="112" width="256" height="100" rx="22" fill="rgba(255,255,255,.88)"/><text x="210" y="174" text-anchor="middle" font-family="Arial" font-size="38" font-weight="900" fill="#24152e">${title}</text><text x="210" y="76" text-anchor="middle" font-size="70">${emoji}</text><rect x="112" y="255" width="28" height="45" rx="10" fill="#8b5a3c"/><rect x="280" y="255" width="28" height="45" rx="10" fill="#8b5a3c"/></svg>`);
}
const PLACE_IMAGES={
  door:'https://res.cloudinary.com/dpwlfmhia/image/upload/v1782174047/door_1.png',
  welcomeBoard:'https://res.cloudinary.com/dpwlfmhia/image/upload/v1782267744/welcome_board.png',
  petShop:'https://res.cloudinary.com/dpwlfmhia/image/upload/v1782174881/pet_shop.png',
  habitat:'https://res.cloudinary.com/dpwlfmhia/image/upload/v1782174881/habitat.png',
  hookWaaambulance:'https://res.cloudinary.com/dpwlfmhia/image/upload/v1782271198/hook_a_waaambulance.png',
  questStarter:'https://res.cloudinary.com/dpwlfmhia/image/upload/v1782270438/quest_starter.png'
};
const PLACE_LABELS={
  welcomeBoard:'Welcome Board',
  petShop:'Pet Shop',
  habitat:'Habitat',
  hookWaaambulance:'Hook-a-Waaambulance',
  questStarter:'Quest Starter'
};

// EDIT SECTION 20A: PLACE / BUILDING LAYOUT
// at = route position. It can be negative so you can place a building on the visible screen after walking forward.
// width = building width.
// height = building height.
// yOffset = feet up/down. Smaller number moves up, bigger number moves down.
// z = layer level. Higher number goes in front.
const PLACE_LAYOUT_DEFAULT={
  // BAKED FROM YOUR EXACT EDITOR SETTINGS - 2026-06-25
  welcomeBoard:{at:-1723,width:168,height:200,yOffset:-24,z:48},
  petShop:{at:-332,width:374,height:262,yOffset:-100.20001220703125,z:48},
  habitat:{at:1048,width:405,height:253,yOffset:-120,z:48},
  hookWaaambulance:{at:2411,width:250,height:185,yOffset:-120,z:48},
  questStarter:{at:3826,width:260,height:200,yOffset:-119.20001220703125,z:48}
};
let PLACE_LAYOUT=JSON.parse(JSON.stringify(PLACE_LAYOUT_DEFAULT));

const levels=[
  {
    name:'Level 1: Tutorial Town',
    quest:'Tutorial Town',
    goal:7200,

    // Tutorial no longer spams random item blocks. These are kept for later optional rewards.
    tokens:[
      ['🕹️','Controls reward',40,''],
      ['🛍️','Pet Shop reward',60,''],
      ['🏡','Habitat reward',80,''],
      ['🎟️','Hook reward',100,''],
      ['⭐','Quest reward',120,'']
    ],

    hazards:[
      ['🟫','Training puddle',0,''],
      ['🚧','Jump cone',0,''],
      ['⚠️','Slow down sign',0,'']
    ],

    plan:[
      // Tutorial Town now uses useful stop markers matched to the actual saved building positions.
      // No extra random lesson clutter: each board explains the next real stop.
      {at:-1723,kind:'building',place:'welcomeBoard',data:['',PLACE_LABELS.welcomeBoard,0,PLACE_IMAGES.welcomeBoard],message:'Opening Welcome Board...'},

      {at:-1220,kind:'sign',title:'Controls',data:['🎮','Controls',0,''],message:'Welcome to Tutorial Town: walk, jump, then press Select near buildings.'},
      {at:-980,kind:'token',tokenIndex:0,message:'Tutorial Token: collect by touching it properly.'},
      {at:-820,kind:'token',tokenIndex:1,message:'Hidden-ish token: exploration gets rewards.'},

      {at:-620,kind:'sign',title:'Pet Shop',data:['🐾','Pet Shop',0,''],message:'Pet Shop: buy pet food, toys and care items. Stand near the glowing shop and press Select.'},
      {at:-332,kind:'building',place:'petShop',data:['',PLACE_LABELS.petShop,0,PLACE_IMAGES.petShop],message:'Opening Pet Shop...'},

      {at:730,kind:'sign',title:'Habitat',data:['🏡','Habitat',0,''],message:'Habitat: opens Pet Care/Tamagotchi so pets can be viewed and cared for.'},
      {at:1048,kind:'building',place:'habitat',data:['',PLACE_LABELS.habitat,0,PLACE_IMAGES.habitat],message:'Opening Habitat...'},

      {at:1500,kind:'sign',title:'Jump',data:['⬆️','Jump',0,''],message:'Jump practice: hop over the training cone.'},
      {at:1550,kind:'hazard',hazardIndex:1,message:'Training cone: jump over it or stomp it from above.'},
      {at:1760,kind:'token',tokenIndex:2,message:'Mushroom token collected.'},

      {at:2100,kind:'sign',title:'Hook Game',data:['🎣','Hook Game',0,''],message:'Hook-a-Waaambulance: prize mini-game stop. It is separate from the Pet Shop.'},
      {at:2411,kind:'building',place:'hookWaaambulance',data:['',PLACE_LABELS.hookWaaambulance,0,PLACE_IMAGES.hookWaaambulance],message:'Opening Hook-a-Waaambulance...'},

      {at:3300,kind:'sign',title:'Secret',data:['🎁','Secret',0,''],message:'You found a secret already?! Bonus curiosity points.'},
      {at:3500,kind:'sign',title:'Quest Pick',data:['🗺️','Quest Pick',0,''],message:'Quest Selector: Tutorial Town first, Wrong Moon next.'},
      {at:3826,kind:'building',place:'questStarter',data:['',PLACE_LABELS.questStarter,0,PLACE_IMAGES.questStarter],message:'Opening Quest Starter...'},

      {at:6200,kind:'finish'}
    ]
  },

  {
    name:'Level 2: Wrong Moon',
    quest:'Wrong Moon',
    goal:3000,

    tokens:[
      ['🌙','Moon crumb',70,'v1781638223/moon_crumb.png'],
      ['⭐','Wrong star',100,'v1781638223/wrong_star.png'],
      ['🔮','Moon wobble',120,'v1781638223/moon_wobble.png'],
      ['🧿','Sky evidence',140,'v1781638223/sky_evidence.png']
    ],

    hazards:[
      ['🌚','Wrong moon glare',0,'v1781638223/moon_glare.png'],
      ['📢','Dramatic prophecy',0,'v1781638223/dramatic_prophecy.png'],
      ['🕳️','Tiny doom hole',0,'v1781638223/doom_hole.png'],
      ['🗯️','Moon argument',0,'v1781638223/moon_argument.png']
    ],

    plan:[
      {at:80,kind:'sign',data:['🪧','Wrong Moon board',0,''],message:'Wrong Moon Quest: collect sky evidence and avoid moon drama.'},
      {at:260,kind:'token',tokenIndex:0},
      {at:470,kind:'hazard',hazardIndex:0},
      {at:700,kind:'token',tokenIndex:1},
      {at:930,kind:'task',data:['🔎','Check moon clue',150,''],message:'Moon clue checked. Something is definitely wrong.'},
      {at:1160,kind:'hazard',hazardIndex:1},
      {at:1420,kind:'token',tokenIndex:2},
      {at:1700,kind:'hazard',hazardIndex:2},
      {at:2000,kind:'task',data:['✅','Confirm sky evidence',250,''],message:'Sky evidence confirmed. Head to the finish.'},
      {at:2300,kind:'token',tokenIndex:3},
      {at:2650,kind:'finish'}
    ]
  },

  {
    name:'Level 3: Swamp Monster',
    quest:'Swamp Monster',
    goal:2500,

    tokens:[
      ['🍃','Damp leaf',50,'v1781797065/swamp_leaf.png'],
      ['🪙','Frog swamp coin',90,'v1781797065/swamp_coin.png'],
      ['🧭','Muddy compass',110,'v1781797065/swamp_compass.png'],
      ['✨','Swamp sparkle',120,'v1781797065/swamp_sparkle.png']
    ],

    hazards:[
      ['🟫','Mud splat',0,'v1781797065/monster_mud.png'],
      ['🐌','Suspicious snail',0,'v1781797065/evil_snail.png'],
      ['🧦','Wet sock',0,'v1781797065/wet_sock.png'],
      ['🦴','Bog bone',0,'v1781797065/bog_bone.png']
    ]
  }
];

/* EDIT SECTION 20B: PROPER LEVEL PLAN BUILDER
   This turns the level from random collecting into a planned path.
   Add more entries here to build a proper level:
   at = distance along the level
   kind = building, sign, task, token, hazard, finish
   tokenIndex/hazardIndex choose from the level tokens/hazards list above
*/
function levelPlan(){
  const l=levels[levelIndex];
  if(Array.isArray(l.plan)&&l.plan.length)return l.plan;
  return [
    {at:80,kind:'sign',data:['🪧','Quest board',0,''],message:`${l.quest}: start the patrol and look for clues.`},
    {at:230,kind:'token',tokenIndex:0},
    {at:390,kind:'task',data:['🔎','Inspect the swamp clue',150,''],message:'Clue inspected. The swamp is being suspicious.'},
    {at:560,kind:'hazard',hazardIndex:0},
    {at:760,kind:'sign',data:['➡️','Jump warning',0,''],message:'Jump or stomp the bad objects. Do not just walk into drama.'},
    {at:940,kind:'token',tokenIndex:1},
    {at:1140,kind:'hazard',hazardIndex:1},
    {at:1380,kind:'task',data:['🧰','Repair the clue scanner',180,''],message:'Scanner fixed. Very professional.'},
    {at:1640,kind:'token',tokenIndex:2},
    {at:1880,kind:'hazard',hazardIndex:2},
    {at:2120,kind:'task',data:['✅','Confirm the swamp evidence',250,''],message:'Evidence confirmed. Head for the finish.'},
    {at:2380,kind:'token',tokenIndex:3}
  ];
}
function pickPlannedData(entry){
  const level=levels[levelIndex];
  if(entry.data)return entry.data;
  if(entry.kind==='hazard')return level.hazards[Number(entry.hazardIndex)||0]||level.hazards[0];
  if(entry.kind==='token')return level.tokens[Number(entry.tokenIndex)||0]||level.tokens[0];
  if(entry.kind==='finish')return ['🏁','Finish flag',0,'v1781797065/finish_flag.png'];
  return ['❔',entry.label||'Level object',Number(entry.points)||0,entry.image||''];
}
function buildingLayout(place){return PLACE_LAYOUT[place]||PLACE_LAYOUT.petShop||{at:0,width:220,height:180,yOffset:18,z:48}}

// MOVEMENT FREEZE FIX:
// spawnLevelPlanObjects() calls plannedAt(entry).
// That helper was missing, so Level 1 crashed as soon as the game tried to spawn tutorial objects.
// When that happened, requestAnimationFrame stopped and the character/world looked frozen.
function plannedAt(entry){
  if(entry&&entry.kind==='building'&&entry.place){
    const l=buildingLayout(entry.place);
    return Number(l.at)||Number(entry.at)||0;
  }
  return Number(entry&&entry.at)||0;
}

function buildingPlanEntry(place){
  const found=levelPlan().find(e=>e&&e.kind==='building'&&e.place===place);
  if(found)return found;
  const img=PLACE_IMAGES[place]||PLACE_IMAGES.petShop||'';
  const label=PLACE_LABELS[place]||place||'Place';
  return {at:buildingLayout(place).at||1000,kind:'building',place,data:['',label,0,img],message:'Opening '+label+'...'};
}
// BUILDING ROUTE FIX:
// Buildings are not fixed screen stickers and they are not token/hazard objects.
// They are route places, so they keep their own level distance (at) and scroll with the ground.
function routeScrollScale(kind='token'){
  // Tutorial objects now use the same route scale as buildings.
  // This keeps lesson boards, tokens and buildings matched to the same saved route positions.
  return (0.05/0.055);
}
function routeXFromAt(at,kind='token'){
  return (DESIGN_W+260)-((distance-Number(at||0))*routeScrollScale(kind));
}
function routeAtFromX(x,kind='building'){
  return Math.round(distance-(((DESIGN_W+260)-Number(x||0))/routeScrollScale(kind)));
}
function buildingScrollScale(){return routeScrollScale('building');}
function buildingXFromAt(at){return routeXFromAt(at,'building');}
function buildingAtFromX(x){return routeAtFromX(x,'building');}
function applyBuildingRoutePosition(o){
  if(!o||o.kind!=='building')return;
  const l=buildingLayout(o.place);
  o.at=Number(l.at)||0;
  o.x=buildingXFromAt(o.at);
  applyBuildingLayout(o);
  renderObjectNow(o);
}
function applyRouteObjectPosition(o){
  if(!o||!Number.isFinite(Number(o.at)))return;
  if(o.kind==='building')applyBuildingRoutePosition(o);
  else{ o.x=routeXFromAt(Number(o.at)||0,o.kind); renderObjectNow(o); }
}
function applyBuildingLayout(o){
  if(!o||o.kind!=='building')return;
  const l=buildingLayout(o.place);
  const w=Math.max(60,Number(l.width)||220);
  const h=Math.max(50,Number(l.height)||Math.round(w*.78));
  // Use important inline styles because the building CSS has !important rules.
  // This makes the editor sliders actually resize each building image.
  o.el.style.setProperty('width',w+'px','important');
  o.el.style.setProperty('height',h+'px','important');
  o.el.style.zIndex=String(Number(l.z)||48);
  o.y=DESIGN_H-floorPx()+(Number(l.yOffset)||0);
}
function renderObjectNow(o){
  if(!o||!o.el)return;
  o.el.style.left=o.x+'px';
  o.el.style.top=o.y+'px';
}
function makePlannedObject(entry){
  const kind=entry.kind||'token';
  const data=pickPlannedData(entry);
  const x=routeXFromAt(plannedAt(entry),kind);
  const isFinish=kind==='finish';

  // SIMPLE EDITOR NOTE:
  // building = big place image on the map, like Pet Shop or Habitat.
  // task/sign/token/hazard stay as smaller game objects.
  const visualKind=(kind==='sign'||kind==='task'||kind==='building')?kind:(isFinish?'finish':kind);

  const el=document.createElement('div');
  el.className='obj '+visualKind;
  addObjectImage(el,data);
  const targetLayer=(kind==='building'&&$('buildingObjects'))?$('buildingObjects'):$('worldObjects');
  targetLayer.appendChild(el);

  const lift=kind==='hazard'
    ? cssNumber('--hazardLift',58)
    : kind==='sign'
      ? 76
      : kind==='task'
        ? 76
        : kind==='building'
          ? 118
          : cssNumber('--tokenLift',126);

  const y=kind==='building'
    ? DESIGN_H-floorPx()+buildingLayout(entry.place).yOffset
    : DESIGN_H-floorPx()-(isFinish?130:lift);

  const obj={
    el,
    x,
    y,
    kind:visualKind,
    place:entry.place||'',
    label:data[1],
    points:Number(data[2])||Number(entry.points)||0,
    hit:false,
    vanished:false,
    message:entry.message||'',
    at:plannedAt(entry),
    planKind:kind
  };

  if(kind==='building'){
    el.classList.add('doorStop');
    el.dataset.layer='places';
    el.dataset.place=obj.place;
    el.title='Enter '+obj.label;
    applyBuildingLayout(obj);
    el.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      if(document.body.classList.contains('editMode'))beginPlaceDrag(obj,ev);
      else openBuilding(obj);
    });
  }

  if(kind==='task'||kind==='sign'){
    el.classList.add('interactiveStop','lessonBlock');
    el.dataset.icon=(data&&data[0])||'';
    el.dataset.title=entry.title||data[1]||obj.label||'Lesson';
    el.title='Press Enter or tap '+obj.label;
    el.addEventListener('pointerdown',ev=>{
      if(document.body.classList.contains('editMode'))return;
      ev.preventDefault();
      interactObject(obj);
    });
  }

  objects.push(obj);
}
function spawnLevelPlanObjects(){
  const plan=levelPlan();
  plan.forEach((entry,i)=>{
    const at=plannedAt(entry);
    const backWindow=entry&&entry.kind==='building'?2600:(levelIndex===0?2200:900);
    const forwardWindow=(levelIndex===0?2200:1700);
    const inWindow=at>=distance-backWindow && at<=distance+forwardWindow;
    if(!inWindow||spawnedPlan.has(i))return;
    spawnedPlan.add(i);
    if(entry.kind==='building'&&entry.place){
      const existing=visiblePlaceObject(entry.place);
      if(existing){existing.editorPreview=false;existing.el.classList.remove('editorPreview');applyBuildingRoutePosition(existing);return;}
    }
    makePlannedObject(entry);
  });
}
function cssNumber(name,fallback){const n=parseFloat(getComputedStyle(root).getPropertyValue(name));return Number.isFinite(n)?n:fallback}function floorPx(){return cssNumber('--floorPx',116)}function setVar(n,v,unit='px'){root.style.setProperty('--'+n,v+unit)}function showToast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>$('toast').classList.remove('show'),1300)}function updateHud(){$('score').textContent=score;$('lives').textContent=lives;$('level').textContent=levelIndex+1;$('distance').textContent=Math.floor(distance);$('questName').textContent=levels[levelIndex].name}
function frameUrl(char,action,idx){return spriteUrlFor(char,action,idx)}
function clearCharacterSlot(elId){
  setSpriteMissing(elId,false);
  const el=$(elId); if(el)el.removeAttribute('src');
  spriteCurrent[elId]='';
}
function normaliseTeamList(a,b,c,d){
  const out=[];
  [a,b,c,d].forEach(ch=>{if(ch&&ch!=='none'&&!out.includes(ch))out.push(ch)});
  return (out.length?out:['ax']).slice(0,4);
}
function teamSelectionFromMenu(){
  return normaliseTeamList(
    $('teamSlot1Select')?.value||'ax',
    $('teamSlot2Select')?.value||'none',
    $('teamSlot3Select')?.value||'none',
    $('teamSlot4Select')?.value||'none'
  );
}
function characterName(ch){return SETS[ch]?.name||(ch==='pet'?'Pet':String(ch||'').toUpperCase())}
function setPair(m,b='none',extraA='none',extraB='none'){
  const members=normaliseTeamList(m,b,extraA,extraB);
  main=members[0]||'ax';
  buddy=members[1]||'none';
  teamExtra=[members[2]||'none',members[3]||'none'];
  team=members.length>1;
  document.body.classList.toggle('teamMode',team);
  document.body.classList.toggle('teamExtra2',members.length>2);
  document.body.classList.toggle('teamExtra3',members.length>3);
  document.body.classList.toggle('team4Mode',members.length>3);
  mainFrame=0;buddyFrame=0;lastFrame=0;lastBuddyFrame=0;
  markCharacterSlotSizeDirty();
  resetIdleAnim();
  ['sprite','buddySprite','teamSprite2','teamSprite3'].forEach(id=>spriteCurrent[id]='');
  preloadAxWalkFrames();
  setSpriteFrame('sprite',main,'idle',0);
  if(buddy&&buddy!=='none')setSpriteFrame('buddySprite',buddy,'idle',0); else clearCharacterSlot('buddySprite');
  if(teamExtra[0]&&teamExtra[0]!=='none')setSpriteFrame('teamSprite2',teamExtra[0],'idle',0); else clearCharacterSlot('teamSprite2');
  if(teamExtra[1]&&teamExtra[1]!=='none')setSpriteFrame('teamSprite3',teamExtra[1],'idle',0); else clearCharacterSlot('teamSprite3');
  updateSpriteFacing(0);
  const names=members.map(characterName).join(', ');
  showToast(members.length>1?`Team Quest: ${names}`:`${characterName(main)} solo.`);
  syncCharacterFields();
}
function startSoloQuest(){
  const chosen=$('soloCharacterSelect')?.value||main||'ax';
  startGame(chosen,'none','none','none');
}
function startTeamQuest(){
  const members=teamSelectionFromMenu();
  startGame(members[0],members[1]||'none',members[2]||'none',members[3]||'none');
}

// EDIT SECTION 21: IMAGE ITEMS, COLLECT-DISAPPEAR AND MARIO-STYLE STOMP LOGIC
function startGame(c,b,extraA,extraB){preloadAxWalkFrames();closeBuilder();closePetPanel();setPair(c,b,extraA,extraB);$('startScreen').classList.add('hidden');score=0;lives=3;levelIndex=0;startLevel()}function startLevel(){distance=0;finishMade=false;ended=false;paused=false;spawnTimer=0;spawnedPlan=new Set();player={x:0,jump:0,vy:0,grounded:true,jumpPrepUntil:0,jumpStartedAt:0,jumpLandUntil:0,jumpRecoveryUntil:0};objects.forEach(o=>o.el.remove());objects=[];groundX=0;hillX=0;playing=true;$('pauseBtn').textContent='Pause';$('levelScreen').classList.add('hidden');$('endScreen').classList.add('hidden');updateHud();showToast(levels[levelIndex].quest+' quest started.');spawnLevelPlanObjects();}function jump(){
  if(!playing||paused||ended||document.body.classList.contains('editMode'))return;
  const now=performance.now();
  // Jump animation timing fix:
  // Show the crouch/prep frames first, then start the physics jump a tiny moment later.
  // This stops frame 002/003 appearing while Ax is already in the air.
  if(player.grounded && !player.jumpPrepUntil && !(player.jumpRecoveryUntil&&now<player.jumpRecoveryUntil)){
    player.jumpStartedAt=now;
    player.jumpPrepUntil=now+115;
    player.jumpLandUntil=0;
    player.jumpRecoveryUntil=0;

    if(idleAnim&&idleAnim.sprite){
      idleAnim.sprite.action='';
      idleAnim.sprite.frame=0;
      idleAnim.sprite.last=0;
    }

    showToast('WEE-WOO jump');
  }
}function objectImageUrl(data){
  const raw=String((data&&data[3])||'').trim();
  if(!raw)return '';
  if(/^(https?:|data:)/i.test(raw))return raw;
  return `${CLOUD}/${raw.replace(/^\/+/, '')}`;
}
function addObjectImage(el,data){
  const url=objectImageUrl(data);
  const fallback=(data&&data[0])||'?';
  if(!url){el.textContent=fallback;el.classList.add('emojiFallback');return;}
  el.classList.add('hasImage');
  const img=document.createElement('img');
  img.alt=(data&&data[1])||'game item';
  img.src=url;
  img.loading='lazy';
  img.onerror=()=>{img.remove();el.classList.remove('hasImage');el.classList.add('emojiFallback');el.textContent=fallback};
  el.appendChild(img);
}
function makeObject(kind,x){
  const level=levels[levelIndex];
  const isFinish=kind==='finish';
  const data=isFinish?['🏁','Finish flag',0,'v1781797065/finish_flag.png']:(kind==='hazard'?level.hazards[Math.floor(Math.random()*level.hazards.length)]:level.tokens[Math.floor(Math.random()*level.tokens.length)]);
  const el=document.createElement('div');
  el.className='obj '+(isFinish?'finish':kind);
  addObjectImage(el,data);
  $('worldObjects').appendChild(el);
  const y=DESIGN_H-floorPx()-(isFinish?130:(kind==='hazard'?cssNumber('--hazardLift',58):(cssNumber('--tokenLift',126)+Math.random()*55)));
  objects.push({el,x,y,kind,label:data[1],points:data[2]||0,hit:false,vanished:false});
}
function spawn(){if(finishMade||objects.length>5)return;makeObject(Math.random()<.30?'hazard':'token',DESIGN_W+260+Math.random()*260)}function makeFinish(){finishMade=true;makeObject('finish',innerWidth+520)}
function vanishObject(o,cls='collected',delay=220){
  if(o.vanished)return;
  o.vanished=true;
  o.el.classList.add(cls);
  setTimeout(()=>{try{o.el.remove()}catch(e){}},delay);
}
function openBuilding(o){
  if(!o||o.kind!=='building'||o.vanished||o.opening)return;
  o.opening=true;

  const wasPaused=paused;
  paused=true;
  showToast(o.message||`Opening ${o.label}...`);

  const doorScreen=$('doorScreen');
  const doorTitle=$('doorTitle');
  const doorImg=$('doorBigImg');

  if(doorTitle)doorTitle.textContent=o.message||`Opening ${o.label}...`;
  if(doorImg)doorImg.src=PLACE_IMAGES.door;

  if(doorScreen){
    doorScreen.classList.remove('hidden');
    doorScreen.classList.remove('doorPlay');
    void doorScreen.offsetWidth;
    doorScreen.classList.add('doorPlay');
  }

  setTimeout(()=>{
    if(doorScreen){
      doorScreen.classList.add('hidden');
      doorScreen.classList.remove('doorPlay');
    }

    if(o.place==='welcomeBoard'){
      const welcome=$('welcomeInfoScreen');
      if(welcome)welcome.classList.remove('hidden');
      showToast('🪧 Welcome Board opened');
    }else if(o.place==='habitat'){
      const panel=$('petPanel');
      if(panel)panel.classList.remove('hidden');
      const reloadBtn=$('reloadPetsBtn');
      if(reloadBtn)reloadBtn.click();
      showToast('🏡 Habitat opened from PetBot');
    }else if(o.place==='petShop'){
      const shop=$('shopScreen');
      if(shop)shop.classList.remove('hidden');
      showToast('🐾 Pet Shop opened');
    }else if(o.place==='hookWaaambulance'){
      const hook=$('hookScreen');
      if(hook)hook.classList.remove('hidden');
      showToast('🎣 Hook-a-Waaambulance opened');
    }else if(o.place==='questStarter'){
      const qs=$('questStartScreen');
      if(qs)qs.classList.remove('hidden');
      showToast('🗺️ Quest Starter opened');
    }

    o.opening=false;
    paused=wasPaused;
  },900);
}
function enterNearbyBuilding(){
  if(!nearbyBuilding||nearbyBuilding.vanished||nearbyBuilding.opening)return false;
  if(!playing||ended||document.body.classList.contains('editMode'))return false;
  if(!$('startScreen').classList.contains('hidden'))return false;
  if(!$('doorScreen').classList.contains('hidden'))return false;
  if(!$('shopScreen').classList.contains('hidden'))return false;
  if($('welcomeInfoScreen')&&!$('welcomeInfoScreen').classList.contains('hidden'))return false;
  if($('hookScreen')&&!$('hookScreen').classList.contains('hidden'))return false;
  if($('questStartScreen')&&!$('questStartScreen').classList.contains('hidden'))return false;
  openBuilding(nearbyBuilding);
  return true;
}
function markNearbyBuilding(o,isNear){
  if(!o||o.kind!=='building'||!o.el)return;
  isNear=!!isNear;
  // Only change the CSS class when the state actually changes.
  // This avoids repainting the big building images every animation frame.
  if(o._nearBuilding!==isNear){
    o._nearBuilding=isNear;
    o.el.classList.toggle('buildingNearby',isNear);
  }
  if(isNear){
    nearbyBuilding=o;
    const now=performance.now();
    if(now-lastBuildingPrompt>2200){
      lastBuildingPrompt=now;
      showToast(`Press Enter or tap ${o.label} to enter.`);
    }
  }
}
function markNearbyInteractable(o,isNear){
  if(!o||!(o.kind==='task'||o.kind==='sign')||!o.el)return;
  isNear=!!isNear;
  if(o._nearInteractable!==isNear){
    o._nearInteractable=isNear;
    o.el.classList.toggle('interactNearby',isNear);
  }
  if(isNear){
    nearbyInteractable=o;
    const now=performance.now();
    if(now-lastObjectPrompt>2200){
      lastObjectPrompt=now;
      showToast(`Press Enter or tap ${o.label}.`);
    }
  }
}
function interactObject(o){
  if(!o||o.vanished||o.hit)return false;
  if(!(o.kind==='task'||o.kind==='sign'))return false;
  collide(o);
  return true;
}
function enterNearbyInteractable(){
  if(!nearbyInteractable||nearbyInteractable.vanished||nearbyInteractable.hit)return false;
  if(!playing||ended||document.body.classList.contains('editMode'))return false;
  if(!$('startScreen').classList.contains('hidden'))return false;
  return interactObject(nearbyInteractable);
}
function canStomp(o){
  if(o.kind!=='hazard'||player.grounded||player.vy>=0)return false;
  const pr=getShrunkRect($('player'),.08,.10);
  const r=o.el.getBoundingClientRect();
  const feet=pr.bottom;
  return feet<=r.top+r.height*.58;
}
function collide(o){
  if(o.hit||o.vanished)return;
  if(o.kind==='token'){
    o.hit=true;
    score+=o.points;
    showToast(`✨ Collected ${o.label}! +${o.points}`);
    vanishObject(o,'collected',220);
  }else if(o.kind==='hazard'){
    if(canStomp(o)){
      o.hit=true;
      score+=200;
      player.vy=13.5;
      player.jump=Math.max(player.jump,18);
      player.grounded=false;
      showToast(`💥 Stomped ${o.label}! +200`);
      vanishObject(o,'stomped',240);
    }else{
      o.hit=true;
      lives--;
      document.body.classList.add('hitFlash');
      setTimeout(()=>document.body.classList.remove('hitFlash'),230);
      showToast(`${o.label}. Drama damage.`);
      vanishObject(o,'damaged',240);
      if(lives<=0)end(false);
    }
  }else if(o.kind==='task'||o.kind==='sign'){
    o.hit=true;
    score+=o.points||0;
    showToast(o.message||`${o.label} done!`);
    vanishObject(o,'collected',260);
  }else if(o.kind==='building'){
    // Buildings no longer open just because the player walks near them.
    // Use Enter, or click/tap the building.
    markNearbyBuilding(o,true);
  }else{
    o.hit=true;
    score+=500;
    levelComplete();
  }
  updateHud();
}
function levelComplete(){playing=false;objects.forEach(o=>o.el.remove());objects=[];if(levelIndex<levels.length-1){$('levelTitle').textContent='Quest complete';$('levelText').textContent=`${levels[levelIndex].quest} survived. Next: ${levels[levelIndex+1].quest}.`;$('levelScreen').classList.remove('hidden')}else end(true)}function end(won){playing=false;ended=true;$('endTitle').textContent=won?'Test quests complete':'Patrol over';$('endText').textContent=won?`Score: ${score}. Ax and Pura escaped with mild nonsense.`:`Score: ${score}. The drama won. Very rude.`;$('endScreen').classList.remove('hidden')}
const lastTransformValue={};
function setTransformOnce(id,value){
  if(lastTransformValue[id]===value)return;
  const el=$(id);
  if(!el)return;
  el.style.transform=value;
  lastTransformValue[id]=value;
}
function updatePlayer(dt){
  const now=performance.now();

  // Start the actual jump after the short crouch/prep frames have shown.
  if(player.grounded && player.jumpPrepUntil && now>=player.jumpPrepUntil){
    player.grounded=false;
    player.jumpPrepUntil=0;
    player.vy=16.5;
  }

  if(keys.left)player.x-=dt*.22;
  if(keys.right)player.x+=dt*.22;
  player.x=Math.max(-25,Math.min(95,player.x));

  if(!player.grounded){
    player.jump+=player.vy*dt*.08;
    player.vy-=dt*.055;
    if(player.jump<=0){
      player.jump=0;
      player.vy=0;
      player.grounded=true;
      player.jumpPrepUntil=0;
      // Keep only a short landing/recovery sprite phase so Ax does not slide along the floor in jump frames.
      player.jumpLandUntil=now+130;
      player.jumpRecoveryUntil=now+220;
    }
  }

  setTransformOnce('player',`translateX(-50%) translate3d(${player.x}px, ${-(player.jump+cssNumber('--playerDrop',26))}px, 0)`);
  const mainShadow=(getCharacterVisualConfig(main).shadowScale||1)*(player.grounded?1:.72);
  setTransformOnce('shadow',`translateX(-50%) translate3d(${player.x}px,0,0) scale(${mainShadow})`);
  setTransformOnce('buddy',`translateX(-50%) translate3d(0,${-cssNumber('--buddyDrop',16)}px,0)`);
  if($('teamMate2'))setTransformOnce('teamMate2',`translateX(-50%) translate3d(0,${-(cssNumber('--buddyDrop',16)+4)}px,0)`);
  if($('teamMate3'))setTransformOnce('teamMate3',`translateX(-50%) translate3d(0,${-(cssNumber('--buddyDrop',16)+2)}px,0)`);
}

function animateOne(elId,char,action,now,state){
  const set=SETS[char]||SETS.ax;
  const frameMs=(set.actionMs&&set.actionMs[action])||set.frameMs||120;
  const totalFrames=getActionFrameCount(char,action);
  state=state||{playing:false,next:0,frame:0,last:0,action:''};

  // ACTION CHANGE FIX:
  // Each visible slot keeps its own animation state. When a slot changes from idle to walk
  // or walk back to idle, reset its frame counter so it does not get stuck showing idle frame 001.
  if(state.action!==action){
    state.action=action;
    state.playing=false;
    state.next=0;
    state.frame=0;
    state.last=0;
  }

  if(action==='idle'){
    // IDLE ANIMATION FIX:
    // The old code only played idle sometimes, after a random wait.
    // That made Ax look like idle was not animating.
    // Idle now loops normally while the character is standing still.
    if(now-(state.last||0)>frameMs){
      const frame=state.frame||0;
      setSpriteFrame(elId,char,'idle',frame);
      state.frame=(frame+1)%totalFrames;
      state.last=now;
    }
    return;
  }
  state.playing=false;
  state.next=now+2600+Math.random()*2600;
  if(now-(state.last||0)>frameMs){
    const frame=state.frame||0;
    setSpriteFrame(elId,char,action,frame);
    state.frame=(frame+1)%totalFrames;
    state.last=now;
  }
}
function jumpVisualActive(now){
  if(!player)return false;
  const start=player.jumpStartedAt||0;
  const sequenceActive=start && (now-start)<960;
  return !!(
    (player.jumpPrepUntil&&now<player.jumpPrepUntil) ||
    !player.grounded ||
    (player.jumpLandUntil&&now<player.jumpLandUntil) ||
    (player.jumpRecoveryUntil&&now<player.jumpRecoveryUntil) ||
    sequenceActive
  );
}

function jumpFrameFromPlayer(now,totalFrames){
  const total=Math.max(1,Number(totalFrames)||1);
  const start=player.jumpStartedAt||now;
  const elapsed=Math.max(0,now-start);

  if(total<10){
    const progress=Math.max(0,Math.min(1,elapsed/880));
    return Math.min(total-1,Math.floor(progress*total));
  }

  // Fixed game-sprite order for the uploaded Ax jump set:
  // 001 ready, 002 crouch, 003 deep crouch, 004 takeoff, 005 rise,
  // 006 apex, 007 fall, 008 landing, 009 squash, 010 recover.
  const marks=[0,60,120,190,280,380,500,620,745,865];
  let frame=0;
  for(let i=0;i<marks.length;i++){
    if(elapsed>=marks[i])frame=i;
  }
  return Math.min(total-1,frame);
}

function animateJumpOne(elId,char,now,state){
  const totalFrames=getActionFrameCount(char,'jump');
  state=state||{playing:false,next:0,frame:0,last:0,action:''};
  if(state.action!=='jump'){
    state.action='jump';
    state.frame=0;
    state.last=0;
  }
  const frame=jumpFrameFromPlayer(now,totalFrames);
  setSpriteFrame(elId,char,'jump',frame);
  state.frame=frame;
  state.last=now;
}

function animateSprites(now){
  // SIMPLE EDITOR NOTE:
  // Walking animation is based on movementInput(), so keyboard and screen buttons both count.
  const input=movementInput();
  const inputMoving=playing&&!paused&&!document.body.classList.contains('editMode')&&(input!==0 || now<visualWalkUntil);
  const mainAct=jumpVisualActive(now)?'jump':(inputMoving?'walk':'idle');
  const followerAct=mainAct==='jump'?'idle':mainAct;

  if(mainAct==='jump') animateJumpOne('sprite',main,now,idleAnim.sprite);
  else animateOne('sprite',main,mainAct,now,idleAnim.sprite);

  if(team){
    if(buddy&&buddy!=='none')animateOne('buddySprite',buddy,followerAct,now,idleAnim.buddySprite);
    if(teamExtra[0]&&teamExtra[0]!=='none')animateOne('teamSprite2',teamExtra[0],followerAct,now,idleAnim.teamSprite2);
    if(teamExtra[1]&&teamExtra[1]!=='none')animateOne('teamSprite3',teamExtra[1],followerAct,now,idleAnim.teamSprite3);
  }
}

function getShrunkRect(el,shrinkX=.08,shrinkY=.10){
  const r=el.getBoundingClientRect();
  return {left:r.left+r.width*shrinkX,right:r.right-r.width*shrinkX,top:r.top+r.height*shrinkY,bottom:r.bottom-r.height*.04};
}
function rectsOverlap(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}
function playerHitRectFor(kind){
  const el=$('player');

  // These MUST be decimals, not big numbers.
  // .40 means shrink by 40% from left/right.
  if(kind==='token')return getShrunkRect(el,.46,.34);

  // Tutorial boxes/signs should only react when Ax is close to the middle,
  // not when the outside of her sprite container brushes past them.
  if(kind==='task'||kind==='sign')return getShrunkRect(el,.50,.42);

  // Buildings need a smaller doorway-style interaction area.
  if(kind==='building')return getShrunkRect(el,.42,.28);

  if(kind==='hazard')return getShrunkRect(el,.28,.18);

  return getShrunkRect(el,.22,.16);
}
function objectHitRect(o){
  const r=o.el.getBoundingClientRect();

  let shrink=.08;

  if(o.kind==='token')shrink=.34;

  // Make tutorial boxes/signs harder to accidentally trigger.
  if(o.kind==='task'||o.kind==='sign')shrink=.42;

  // Buildings react around the centre/doorway, not the whole picture.
  if(o.kind==='building')shrink=.36;

  if(o.kind==='hazard')shrink=.12;

  return {
    left:r.left+r.width*shrink,
    right:r.right-r.width*shrink,
    top:r.top+r.height*shrink,
    bottom:r.bottom-r.height*shrink
  };
}
function shouldHitObject(o){
  if(o.hit||o.vanished)return false;
  const pr=playerHitRectFor(o.kind);
  return rectsOverlap(pr,objectHitRect(o));
}
// EDIT SECTION 22: MAIN GAME LOOP - movement, scrolling, spawning, collisions and redraw
function loop(now=0){
  const dt=Math.min(34,now-last||16);last=now;
  if(playing&&!paused&&!document.body.classList.contains('editMode')){
    const input=movementInput();
    updateSpriteFacing(input);
    const worldMove=input*dt*cssNumber('--gameSpeed',2.2);
    const moving=input!==0;
    if(moving)visualWalkUntil=now+220;
    const oldDistance=distance;

    if(moving){
      const plannedFinishes=levelPlan().filter(e=>e&&e.kind==='finish').map(plannedAt);
      const finishAt=plannedFinishes.length?Math.max(...plannedFinishes):(levels[levelIndex].goal||5000);
      const playerScreenX=Math.max(80,cssNumber('--playerX',150)+(player.x||0));
      const routePad=Math.ceil((((DESIGN_W+260)-playerScreenX)+360)/Math.max(.1,routeScrollScale('finish')));
      const maxRouteDistance=Math.max((levels[levelIndex].goal||5000)+900,finishAt+routePad);
      distance=Math.max(0,Math.min(maxRouteDistance,distance+worldMove*.055));
      if(Math.abs(distance-oldDistance)>0.001){
        spawnTimer+=dt;
        spawnLevelPlanObjects();
        if(!levelPlan().length&&spawnTimer>cssNumber('--spawnGap',1450)){spawnTimer=0;spawn()}
        if(distance>levels[levelIndex].goal&&!finishMade&&!levelPlan().some(e=>e&&e.kind==='finish'))makeFinish();
        if(levelPlan().some(e=>e&&e.kind==='finish') && distance>=maxRouteDistance-4 && playing&&!ended){levelComplete();}
      }
    }

    const routeMoved=Math.abs(distance-oldDistance)>0.001;
    if(routeMoved){
      groundX-=worldMove*.05;
      hillX-=worldMove*.012;
      $('groundLayer').style.backgroundPosition=`${groundX}px bottom, ${groundX}px bottom`;
      $('hillLayer').style.backgroundPosition=`${hillX}px bottom, ${hillX}px bottom`;
    }

    updatePlayer(dt);
    nearbyBuilding=null;
    nearbyInteractable=null;

    objects.forEach(o=>{
      if(Number.isFinite(Number(o.at))){
        applyRouteObjectPosition(o);
      }else if(routeMoved){
        o.x-=worldMove*.10;
        renderObjectNow(o);
      }else{
        renderObjectNow(o);
      }

      if(o.kind==='building'){
        const near=shouldHitObject(o);
        markNearbyBuilding(o,near);
      }else if(o.kind==='task'||o.kind==='sign'){
        const near=shouldHitObject(o);
        markNearbyInteractable(o,near);
      }else if(shouldHitObject(o)){
        collide(o);
      }
    });
    objects=objects.filter(o=>{
      if(o.vanished)return false;
      if(Number.isFinite(Number(o.at)))return true;
      if(o.x<-140||o.x>DESIGN_W+900){o.el.remove();return false}
      return true;
    });
    updateHud();
  }
  animateSprites(now);requestAnimationFrame(loop);
}
// EDIT SECTION 23: BUILDER SETTINGS, SAVE/LOAD, CHARACTER CONTROLS AND PETBOT
const settingMap={calFloor:['floorPx','px'],calPlatform:['platformH','px'],calPlayerX:['playerX','px'],calPlayerW:['playerW','px'],calDrop:['playerDrop','px'],calBuddyX:['buddyX','px'],calBuddyW:['buddyW','px'],calBuddyDrop:['buddyDrop','px'],calHillH:['hillsH','px'],calHillB:['hillsBottom','px'],calGroundH:['groundH','px'],calGroundB:['groundBottom','px'],calTokenLift:['tokenLift','px'],calHazardLift:['hazardLift','px'],calZSky:['zSky',''],calZHills:['zHills',''],calZGround:['zGround',''],calZPlatform:['zPlatform',''],calZBuddy:['zBuddy',''],calZPlayer:['zPlayer',''],calZBuildings:['zBuildings',''],calZObjects:['zObjects','']};
function clonePatterns(){return JSON.parse(JSON.stringify(SPRITE_PATTERNS))}
function safeSpritePatternValue(v){
  v=String(v||'').trim();
  if(!v)return '';
  const bad=['undefined','null','blob:','data:','peregrine','falcon_portrait'];
  if(bad.some(b=>v.toLowerCase().includes(b)))return '';
  return v;
}
function mergeSpritePatterns(saved){
  // Sprite paths are no longer loaded from shared/cloud saves.
  // Edit SPRITE_PATTERNS in EDIT SECTION 17 only.
  spriteBroken.clear();
  if($('axIdleUrl'))fillSpriteUrlInputs();
}
function readSettings(){
  applyCharacterSlotSizes();
  if($('axIdleUrl'))readSpriteUrlInputs();
  const o={};
  Object.entries(settingMap).forEach(([id,[key]])=>o[key]=+$(''+id).value);
  o.main=main;o.buddy=buddy;o.team=team;o.teamExtra=teamExtra;o.mainFlip=mainFlip;o.buddyFlip=buddyFlip;o.petPlayerW=petPlayerW;o.petFlip=petFlip;o.placeLayout=JSON.parse(JSON.stringify(PLACE_LAYOUT));
  return o;
}
function applySettings(o={}){
  markCharacterSlotSizeDirty();
  // Sprite URL patterns now come from the single SPRITE_PATTERNS block in index.html only.
  // Do NOT load old shared spritePatterns from Cloudflare, because old saves can keep broken Owl/Ax paths alive.
  // Use only EDIT SECTION 17 / SPRITE_PATTERNS as the source of truth for sprite folders/names.
  if(false && o.spritePatterns)mergeSpritePatterns(o.spritePatterns);
  if(o.placeLayout&&typeof o.placeLayout==='object'){Object.keys(PLACE_LAYOUT).forEach(k=>{if(o.placeLayout[k])PLACE_LAYOUT[k]={...PLACE_LAYOUT[k],...o.placeLayout[k]};});}
  if(Array.isArray(o.teamExtra)&&o.teamExtra.length>=2)teamExtra=[o.teamExtra[0]||'none',o.teamExtra[1]||'none'];
  if(o.petPlayerW!==undefined){petPlayerW=Number(o.petPlayerW)||petPlayerW;if($('petSizeRange')){$('petSizeRange').value=petPlayerW;$('petSizeVal').textContent=petPlayerW+'px';}}
  if(o.petFlip!==undefined){petFlip=Number(o.petFlip)||petFlip;if($('petFlipSelect'))$('petFlipSelect').value=String(petFlip);}
  if(o.mainFlip!==undefined){mainFlip=Number(o.mainFlip)||1;if($('mainFlipSelect'))$('mainFlipSelect').value=String(mainFlip);}
  if(o.buddyFlip!==undefined){buddyFlip=Number(o.buddyFlip)||1;if($('buddyFlipSelect'))$('buddyFlipSelect').value=String(buddyFlip);}
  Object.entries(settingMap).forEach(([id,[key,unit]])=>{if(o[key]!==undefined)$(id).value=o[key];const val=$(id).value;setVar(key,val,unit);$(id+'Val').textContent=val+unit});
  objects.forEach(applyBuildingLayout); if($('placeSelect'))syncPlaceControls();
  if(o.main||o.buddy!==undefined){
    setPair(o.main||main,o.team?(o.buddy||'none'):(o.buddy||'none'),teamExtra[0]||'none',teamExtra[1]||'none');
  }else{
    applyCharacterSlotSizes();
    updateSpriteFacing(0);
  }
  exportSettings();
}
function exportSettings(){$('settingsBox').value=JSON.stringify(readSettings(),null,2)}
// EDIT SECTION 23A: SAFE BROWSER SAVE FALLBACK
// Shared cloud save is still used, but building positions are also saved in this browser.
// Old broken sprite/team saves are cleared, but this safe layout key is kept.
function clearBrowserGameSaves(){try{Object.keys(localStorage).filter(k=>k!==SAFE_LAYOUT_SAVE_KEY&&(k.startsWith('ctw_game')||String(k).toLowerCase().includes('team')||String(k).toLowerCase().includes('movement')||String(k).toLowerCase().includes('sprite'))).forEach(k=>localStorage.removeItem(k));}catch(e){}}
function saveBrowserLayout(pack){try{localStorage.setItem(SAFE_LAYOUT_SAVE_KEY,JSON.stringify(pack||readSettings()));return true}catch(e){return false}}
function loadBrowserLayout(){try{const raw=localStorage.getItem(SAFE_LAYOUT_SAVE_KEY);if(!raw)return false;const pack=JSON.parse(raw);if(pack&&typeof pack==='object'){applySettings(pack);$('adminStatus').textContent='Loaded saved browser layout. Buildings restored.';return true}}catch(e){}return false}
function persistLocalQuiet(){saveBrowserLayout(readSettings());}
function saveLocal(){const ok=saveBrowserLayout(readSettings());$('adminStatus').textContent=ok?'Saved in this browser.':'Browser save failed.'}
function loadLocal(){const ok=loadBrowserLayout();if(!ok)$('adminStatus').textContent='No browser layout save found.'}
function resetCorrect(){clearBrowserGameSaves();spriteBroken.clear();mainFlip=1;buddyFlip=1;if($('mainFlipSelect'))$('mainFlipSelect').value='1';if($('buddyFlipSelect'))$('buddyFlipSelect').value='1';fillSpriteUrlInputs();PLACE_LAYOUT=JSON.parse(JSON.stringify(PLACE_LAYOUT_DEFAULT));syncPlaceControls&&syncPlaceControls();Object.entries(DEFAULTS).forEach(([k,v])=>{const ent=Object.entries(settingMap).find(e=>e[1][0]===k);if(ent)$(ent[0]).value=v});teamExtra=['none','none'];setPair('ax','none','none','none');applySettings({});exportSettings();$('adminStatus').textContent='Reset to safe visual layout. Sprite paths stay exactly as written in EDIT SECTION 17.'}
async function saveCloud(){
  const key=$('adminKey').value.trim(),name=$('levelName').value.trim()||'level_main';
  const pack=readSettings();
  saveBrowserLayout(pack);
  if(!key){$('adminStatus').textContent='Saved building positions in this browser. Add admin key to save shared.';showToast('Building positions saved.');return}
  $('adminStatus').textContent='Saving shared level...';
  try{
    const r=await fetch('/api/levels',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':key},body:JSON.stringify({admin_key:key,name,settings:pack,data:pack,version:VERSION})});
    const d=await r.json().catch(()=>null);
    if(r.ok&&d&&d.ok){$('adminStatus').textContent='Shared level saved: '+(d.name||name)+' and browser backup saved.';showToast('Shared level saved.');return}
    $('adminStatus').textContent='Cloud save failed, but browser backup saved: '+((d&&(d.error||d.message))||('HTTP '+r.status));
  }catch(e){$('adminStatus').textContent='Cloud save failed, but browser backup saved: '+e.message}
}
async function loadCloud(auto=false){
  const name=$('levelName').value.trim()||'level_main';
  if(!auto)$('adminStatus').textContent='Loading shared level...';
  try{
    const r=await fetch('/api/levels?name='+encodeURIComponent(name)+'&t='+Date.now(),{cache:'no-store'});
    const d=await r.json();
    const settings=d?.data||d?.settings||d?.pack?.settings||d?.pack?.data||d?.level||null;
    if(r.ok&&settings){applySettings(settings);$('adminStatus').textContent=auto?'Loaded shared cloud level automatically. Browser save is off.':'Loaded shared cloud level.';if(!auto)showToast('Shared level loaded.');return true}
    if(!auto)$('adminStatus').textContent='Load failed: '+(d?.error||'No cloud level found.');
    return false;
  }catch(e){if(!auto)$('adminStatus').textContent='Load failed: '+e.message;return false}
}
function syncCharacterFields(){$('mainSelect').value=main;if($('soloCharacterSelect'))$('soloCharacterSelect').value=main;$('buddySelect').value=buddy||'none';if($('teamSlot1Select'))$('teamSlot1Select').value=main||'ax';if($('teamSlot2Select'))$('teamSlot2Select').value=buddy||'none';if($('teamSlot3Select'))$('teamSlot3Select').value=(teamExtra&&teamExtra[0])||'none';if($('teamSlot4Select'))$('teamSlot4Select').value=(teamExtra&&teamExtra[1])||'none';if($('mainFlipSelect'))$('mainFlipSelect').value=String(mainFlip||1);if($('buddyFlipSelect'))$('buddyFlipSelect').value=String(buddyFlip||1)}
function editorRowsFor(layer){return {
  player:['calPlayerX','calDrop','calZPlayer'],
  buddy:['calBuddyX','calBuddyDrop','calZBuddy'],
  places:['calPlaceAt','calPlaceW','calPlaceH','calPlaceY','calPlaceZ','calZBuildings'],
  layers:['calZSky','calZHills','calZGround','calZPlatform','calZBuddy','calZPlayer','calZBuildings','calZObjects'],
  ground:['calGroundH','calGroundB','calZGround'],
  hills:['calHillH','calHillB','calZHills'],
  platform:['calFloor','calPlatform','calZPlatform'],
  sky:['calZSky'],
  objects:['calTokenLift','calHazardLift','calZObjects']
}[layer]||['calPlayerX','calDrop','calZPlayer'];}
function syncEditorVisibility(layer){
  const b=$('builder'); if(!b)return;
  b.classList.remove('show-player','show-buddy','show-world','show-objects','show-places','show-layers');
  const show=new Set(editorRowsFor(layer));
  document.querySelectorAll('.builder .editSection').forEach(sec=>sec.style.setProperty('display','none','important'));
  Object.keys(settingMap).forEach(id=>{const row=$(id)?.closest('.calRow'); if(row)row.style.display=show.has(id)?'grid':'none';});
  const showSection=sel=>{const el=document.querySelector(sel); if(el)el.style.setProperty('display','block','important');};
  if(layer==='player'){b.classList.add('show-player');showSection('.section-player');showSection('.section-layers');}
  else if(layer==='buddy'){b.classList.add('show-buddy');showSection('.section-buddy');showSection('.section-layers');}
  else if(layer==='places'){b.classList.add('show-places');showSection('.section-places');showSection('.section-layers');syncPlaceControls();}
  else if(layer==='layers'){b.classList.add('show-layers');showSection('.section-layers');}
  else if(layer==='objects'){b.classList.add('show-objects');showSection('.section-objects');showSection('.section-layers');}
  else {b.classList.add('show-world');showSection('.section-layers');}
  const layerTitle=document.querySelector('.section-layers h3');
  if(layerTitle){const names={ground:'Ground settings',hills:'Hills settings',platform:'Invisible floor line settings',sky:'Sky layer level',player:'Main character layer level',buddy:'Side character layer level',objects:'Items layer level',places:'Place / building settings',layers:'All layer levels'};layerTitle.textContent=names[layer]||'Selected settings';}
}
function focusEditTarget(layer){
  document.body.dataset.editTarget=layer; if($('builder')) $('builder').dataset.target=layer;
  syncEditorVisibility(layer);
  document.querySelectorAll('.editableTarget').forEach(x=>x.classList.remove('selectedEditTarget'));
  document.querySelectorAll('.targetPick').forEach(x=>x.classList.toggle('active',x.dataset.selectTarget===layer));
  const el=document.querySelector('[data-layer="'+layer+'"]'); if(el)el.classList.add('selectedEditTarget');
  if($('editTarget')) $('editTarget').value=layer;
  const names={player:'main character',buddy:'side character',places:'places / buildings',layers:'layer levels',ground:'ground artwork',hills:'hills layer',platform:'invisible floor line',sky:'sky',objects:'items'};
  $('adminStatus') && ($('adminStatus').textContent='Editing '+(names[layer]||layer)+'. Only these settings are shown. Drag on the game or use the sliders.');
}

let selectedPlace='welcomeBoard';
function clampNum(v,min,max){v=Number(v);if(!Number.isFinite(v))v=min;return Math.max(min,Math.min(max,v));}
function visiblePlaceObject(place){return objects.find(o=>o.kind==='building'&&o.place===place&&!o.vanished)||null;}

function ensurePlaceEditorObject(place,screenX,screenY){
  let obj=visiblePlaceObject(place);
  if(!obj){
    const entry=buildingPlanEntry(place);
    makePlannedObject(entry);
    obj=visiblePlaceObject(place);
    if(obj){
      obj.editorPreview=true;
      obj.el.classList.add('editorPreview');
    }
  }
  if(obj){
    const l=buildingLayout(place);
    if(Number.isFinite(Number(screenX))){l.at=clampNum(buildingAtFromX(Number(screenX)),-3000,5000);}
    if(Number.isFinite(Number(screenY))){l.yOffset=clampNum(Number(screenY)-DESIGN_H+floorPx(),-120,180);}
    applyBuildingRoutePosition(obj);
    syncPlaceControls();
  }
  return obj;
}
function syncPlaceControls(){
  if(!$('placeSelect'))return;
  selectedPlace=$('placeSelect').value||selectedPlace||'petShop';
  const l=buildingLayout(selectedPlace);
  const w=Number(l.width)||230;
  const h=Number(l.height)||Math.round(w*.78);
  $('calPlaceAt').min=-3000;$('calPlaceAt').max=7000;$('calPlaceAt').value=clampNum(l.at,-3000,7000);$('calPlaceAtVal').textContent=$('calPlaceAt').value;
  $('calPlaceW').min=80;$('calPlaceW').max=900;$('calPlaceW').value=clampNum(w,80,900);$('calPlaceWVal').textContent=$('calPlaceW').value+'px';
  if($('calPlaceH')){$('calPlaceH').min=70;$('calPlaceH').max=700;$('calPlaceH').value=clampNum(h,70,700);$('calPlaceHVal').textContent=$('calPlaceH').value+'px';}
  $('calPlaceY').value=clampNum(l.yOffset,-120,180);$('calPlaceYVal').textContent=$('calPlaceY').value+'px';
  $('calPlaceZ').value=clampNum(l.z,0,80);$('calPlaceZVal').textContent=$('calPlaceZ').value;
  document.querySelectorAll('.building').forEach(el=>el.classList.toggle('selectedPlaceTarget',el.dataset.place===selectedPlace));
}
function readPlaceControls(){
  if(!$('placeSelect'))return;
  selectedPlace=$('placeSelect').value||selectedPlace||'petShop';
  const width=+$('calPlaceW').value;
  const height=$('calPlaceH')?+$('calPlaceH').value:Math.round(width*.78);
  PLACE_LAYOUT[selectedPlace]={
    ...(PLACE_LAYOUT[selectedPlace]||{}),
    at:clampNum($('calPlaceAt').value,-3000,7000),
    width:width,
    height:height,
    yOffset:+$('calPlaceY').value,
    z:+$('calPlaceZ').value
  };
  $('calPlaceAtVal').textContent=$('calPlaceAt').value;
  $('calPlaceWVal').textContent=$('calPlaceW').value+'px';
  if($('calPlaceHVal'))$('calPlaceHVal').textContent=height+'px';
  $('calPlaceYVal').textContent=$('calPlaceY').value+'px';
  $('calPlaceZVal').textContent=$('calPlaceZ').value;
  objects.forEach(o=>{
    if(o.kind==='building')applyBuildingRoutePosition(o);
    else{applyBuildingLayout(o);renderObjectNow(o);}
  });
  saveBrowserLayout(readSettings());
  exportSettings();
}
function bringSelectedPlaceHere(){
  if(!$('placeSelect'))return;
  selectedPlace=$('placeSelect').value||selectedPlace||'petShop';
  const l=buildingLayout(selectedPlace);
  const targetX=DESIGN_W*.58;
  l.at=clampNum(buildingAtFromX(targetX),-3000,5000);
  l.yOffset=18;
  const obj=visiblePlaceObject(selectedPlace);
  if(obj){applyBuildingRoutePosition(obj);}
  syncPlaceControls();exportSettings();showToast('Moved '+selectedPlace+' near here');
}
function snapSelectedPlaceToGround(){
  if(!$('placeSelect'))return;
  selectedPlace=$('placeSelect').value||selectedPlace||'petShop';
  buildingLayout(selectedPlace).yOffset=18;
  const obj=visiblePlaceObject(selectedPlace); if(obj){applyBuildingRoutePosition(obj);}
  syncPlaceControls();exportSettings();showToast('Snapped building feet to ground');
}
// EDITOR PAUSE / RESUME FIX:
// Opening the editor pauses the game so dragging is safe.
// Closing the editor now resumes the game automatically if you were already playing.
let builderWasPlaying=false;
function openBuilder(){
  builderWasPlaying=!!(playing&&!ended&&$('startScreen').classList.contains('hidden'));
  keys.left=false;keys.right=false;
  document.body.classList.add('editMode');
  $('builder').classList.remove('hidden');
  $('petPanel').classList.add('hidden');
  paused=true;
  $('pauseBtn').textContent='Resume';
  exportSettings();
  focusEditTarget(($('editTarget')&&$('editTarget').value)||'player');
}
function closeBuilder(resumeAfter=true){
  document.body.classList.remove('editMode');
  $('builder').classList.add('hidden');
  document.querySelectorAll('.editableTarget').forEach(x=>x.classList.remove('selectedEditTarget'));
  document.querySelectorAll('.building').forEach(x=>x.classList.remove('selectedPlaceTarget'));
  keys.left=false;keys.right=false;
  const shopHidden=!$('shopScreen')||$('shopScreen').classList.contains('hidden');
  const shouldResume=resumeAfter!==false&&builderWasPlaying&&playing&&!ended&&$('startScreen').classList.contains('hidden')&&$('petPanel').classList.contains('hidden')&&shopHidden;
  if(shouldResume){
    paused=false;
    $('pauseBtn').textContent='Pause';
    showToast('Game resumed');
  }
  builderWasPlaying=false;
}
function openPetPanel(){
  closeBuilder(false);
  paused=true;
  $('pauseBtn').textContent='Resume';
  $('petPanel').classList.remove('hidden');
  loadPetbotPets(false);
}
function closePetPanel(){
  $('petPanel').classList.add('hidden');
  if(playing&&!ended&&$('startScreen').classList.contains('hidden')){
    paused=false;
    $('pauseBtn').textContent='Pause';
  }
}
function openMenu(){paused=true;$('pauseBtn').textContent='Resume';$('startScreen').classList.remove('hidden');$('resumeBtn').style.display=playing?'inline-block':'none';$('questName').textContent=playing?'Paused in menu':'Main menu: choose a quest.'}
function resumeGame(){if(!playing){$('startScreen').classList.remove('hidden');return}$('startScreen').classList.add('hidden');paused=false;$('pauseBtn').textContent='Pause';$('questName').textContent=(team?'Team Quest':'Solo Quest')+' in progress'}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tabBody').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('tab-'+b.dataset.tab).classList.add('active')});
document.querySelectorAll('[data-select-target]').forEach(b=>b.onclick=()=>focusEditTarget(b.dataset.selectTarget));
$('editTarget').onchange=()=>focusEditTarget($('editTarget').value);
Object.keys(settingMap).forEach(id=>$(id).addEventListener('input',()=>{applySettings({});}));
['calPlaceAt','calPlaceW','calPlaceH','calPlaceY','calPlaceZ'].forEach(id=>{if($(id))$(id).addEventListener('input',readPlaceControls);});
if($('placeSelect'))$('placeSelect').onchange=()=>{selectedPlace=$('placeSelect').value;syncPlaceControls();};
if($('placeQuick'))$('placeQuick').onchange=()=>{const v=$('placeQuick').value;$('placeQuick').value='';if(v==='bringHere')bringSelectedPlaceHere();if(v==='groundSnap')snapSelectedPlaceToGround();};
$('resetSettingsBtn').onclick=resetCorrect;$('saveCloudBtn').onclick=()=>saveCloud();$('loadCloudBtn').onclick=()=>loadCloud(false);$('closeBuilderBtn').onclick=closeBuilder;$('closeBuilderTop').onclick=closeBuilder;$('buildBtn').onclick=openBuilder;$('menuBuildBtn').onclick=()=>{$('startScreen').classList.add('hidden');openBuilder()};$('menuBtn').onclick=openMenu;$('resumeBtn').onclick=resumeGame;$('petBtn').onclick=()=>{ if(typeof openPetbotFull==='function') openPetbotFull(); else openPetPanel(); };$('menuPetBtn').onclick=()=>{$('startScreen').classList.add('hidden'); if(typeof openPetbotFull==='function') openPetbotFull(); else openPetPanel();};$('closePetBtn').onclick=closePetPanel;function applyCharacterChoices(){mainFlip=Number($('mainFlipSelect')?.value)||1;buddyFlip=Number($('buddyFlipSelect')?.value)||1;setPair($('mainSelect').value,$('buddySelect').value);}
$('applyCharsBtn').onclick=applyCharacterChoices;$('soloBtn').onclick=()=>{buddyFlip=Number($('buddyFlipSelect')?.value)||buddyFlip;setPair(main,'none');};$('teamBtn').onclick=()=>{buddyFlip=Number($('buddyFlipSelect')?.value)||buddyFlip;const members=teamSelectionFromMenu();setPair(members[0],members[1]||'none',members[2]||'none',members[3]||'none');};if($('mainFlipSelect'))$('mainFlipSelect').onchange=()=>{mainFlip=Number($('mainFlipSelect').value)||1;applySpriteTransform();};if($('buddyFlipSelect'))$('buddyFlipSelect').onchange=()=>{buddyFlip=Number($('buddyFlipSelect').value)||1;applySpriteTransform();};
function fillSpriteUrlInputs(){
  $('axIdleUrl').value=SPRITE_PATTERNS.ax.idle;$('axWalkUrl').value=SPRITE_PATTERNS.ax.walk;$('axJumpUrl').value=SPRITE_PATTERNS.ax.jump;
  $('puraIdleUrl').value=Array.isArray(SPRITE_PATTERNS.pura.idle)?SPRITE_PATTERNS.pura.idle[0]:SPRITE_PATTERNS.pura.idle;$('puraWalkUrl').value=Array.isArray(SPRITE_PATTERNS.pura.walk)?`${CLOUD}/v1781797065/pura_walk_{n}.png`:SPRITE_PATTERNS.pura.walk;$('puraJumpUrl').value=Array.isArray(SPRITE_PATTERNS.pura.jump)?SPRITE_PATTERNS.pura.jump[0]:SPRITE_PATTERNS.pura.jump;
  $('owlIdleUrl').value=SPRITE_PATTERNS.owl.idle;$('owlWalkUrl').value=SPRITE_PATTERNS.owl.walk;$('owlJumpUrl').value=SPRITE_PATTERNS.owl.jump;
  $('unicornIdleUrl').value=SPRITE_PATTERNS.unicorn.idle;$('unicornWalkUrl').value=SPRITE_PATTERNS.unicorn.walk;$('unicornJumpUrl').value=SPRITE_PATTERNS.unicorn.jump;
}

function readSpriteUrlInputs(){
  // The Builder only edits the live page while you test. The real saved source is EDIT SECTION 17 in index.html.
  SPRITE_PATTERNS.ax.idle=$('axIdleUrl').value.trim()||SPRITE_PATTERNS.ax.idle;SPRITE_PATTERNS.ax.walk=$('axWalkUrl').value.trim()||SPRITE_PATTERNS.ax.walk;SPRITE_PATTERNS.ax.jump=$('axJumpUrl').value.trim()||SPRITE_PATTERNS.ax.jump;
  SPRITE_PATTERNS.pura.idle=$('puraIdleUrl').value.trim()||SPRITE_PATTERNS.pura.idle;SPRITE_PATTERNS.pura.walk=$('puraWalkUrl').value.trim()||SPRITE_PATTERNS.pura.walk;SPRITE_PATTERNS.pura.jump=$('puraJumpUrl').value.trim()||SPRITE_PATTERNS.pura.jump;
  SPRITE_PATTERNS.owl.idle=$('owlIdleUrl').value.trim()||SPRITE_PATTERNS.owl.idle;SPRITE_PATTERNS.owl.walk=$('owlWalkUrl').value.trim()||SPRITE_PATTERNS.owl.walk;SPRITE_PATTERNS.owl.jump=$('owlJumpUrl').value.trim()||SPRITE_PATTERNS.owl.jump;
  SPRITE_PATTERNS.unicorn.idle=$('unicornIdleUrl').value.trim()||SPRITE_PATTERNS.unicorn.idle;SPRITE_PATTERNS.unicorn.walk=$('unicornWalkUrl').value.trim()||SPRITE_PATTERNS.unicorn.walk;SPRITE_PATTERNS.unicorn.jump=$('unicornJumpUrl').value.trim()||SPRITE_PATTERNS.unicorn.jump;
}

fillSpriteUrlInputs();
$('applySpriteUrlsBtn').onclick=()=>{readSpriteUrlInputs();spriteBroken.clear();['sprite','buddySprite','teamSprite2','teamSprite3'].forEach(id=>spriteCurrent[id]='');setSpriteFrame('sprite',main,'idle',0);if(team){if(buddy&&buddy!=='none')setSpriteFrame('buddySprite',buddy,'walk',0);if(teamExtra[0]&&teamExtra[0]!=='none')setSpriteFrame('teamSprite2',teamExtra[0],'walk',0);if(teamExtra[1]&&teamExtra[1]!=='none')setSpriteFrame('teamSprite3',teamExtra[1],'walk',0);}$('spriteStatus').textContent='Sprite URL patterns applied for this page. Permanent paths are edited in the single SPRITE_PATTERNS block.';showToast('Sprite URL patterns applied')};
$('resetSpriteUrlsBtn').onclick=()=>{spriteBroken.clear();fillSpriteUrlInputs();['sprite','buddySprite','teamSprite2','teamSprite3'].forEach(id=>spriteCurrent[id]='');setPair(main,buddy||'none',teamExtra[0]||'none',teamExtra[1]||'none');$('spriteStatus').textContent='Sprite cache cleared. To change permanent sprite paths, edit the single SPRITE_PATTERNS block in EDIT SECTION 17, upload, then Ctrl+F5.';};
function pct(v){v=Number(v);if(!Number.isFinite(v))return 0;if(v<=1&&v>0)v*=100;return Math.max(0,Math.min(100,v))}
function getPetUserId(){return ($('userIdInput')?.value||'').trim()||$('userSelect').value}
function parseMaybeJson(v){
  if(!v) return null;
  if(typeof v==='object') return v;
  if(typeof v==='string'){
    const t=v.trim();
    if((t.startsWith('{')&&t.endsWith('}'))||(t.startsWith('[')&&t.endsWith(']'))){try{return JSON.parse(t)}catch(e){}}
  }
  return null;
}
function unwrapPetbotData(d){
  const seen=new Set();
  while(d && typeof d==='object' && !seen.has(d)){
    seen.add(d);
    if(Array.isArray(d)) return d;
    if(Array.isArray(d.pets)||Array.isArray(d.rows)||Array.isArray(d.items)||Array.isArray(d.data)) return d;
    const next=parseMaybeJson(d.response)||parseMaybeJson(d.result)||parseMaybeJson(d.body)||parseMaybeJson(d.message);
    if(next) d=next; else break;
  }
  return d||{};
}
function normalisePets(raw){
  const d=unwrapPetbotData(raw);
  if(Array.isArray(d)) return d.map(normaliseOnePet).filter(p=>p.name);
  if(Array.isArray(d.pets)) return d.pets.map(normaliseOnePet).filter(p=>p.name);
  if(Array.isArray(d.rows)) return d.rows.map(normaliseOnePet).filter(p=>p.name);
  if(Array.isArray(d.items)) return d.items.map(normaliseOnePet).filter(p=>p.name);
  if(Array.isArray(d.data)) return d.data.map(normaliseOnePet).filter(p=>p.name);
  const pets=[];
  for(let i=1;i<=120;i++){
    const name=d['pet_'+i+'_name']||d['pet_name_'+i]||d['name_'+i]||d['Pet '+i+' Name'];
    if(!name) continue;
    pets.push(normaliseOnePet({name,code:d['pet_'+i+'_code']||d['pet_code_'+i]||d['code_'+i]||'',pet:d['pet_'+i+'_pet']||d['pet_'+i+'_species']||d['species_'+i]||d['pet_'+i+'_type']||'',level:d['pet_'+i+'_level']||d['level_'+i]||'',xp:d['pet_'+i+'_xp']||d['xp_'+i]||'',hunger:d['pet_'+i+'_hunger']||d['hunger_'+i]||0,happy:d['pet_'+i+'_happiness']||d['pet_'+i+'_happy']||d['happy_'+i]||0,energy:d['pet_'+i+'_energy']||d['energy_'+i]||0}));
  }
  return pets.filter(p=>p.name);
}
function normaliseOnePet(p){p=p||{};return {name:p.name||p.pet_name||p.displayName||p.display_name||p.nickname||'',code:p.code||p.pet_code||p.petId||p.pet_id||p.id||'',pet:p.pet||p.species||p.type||p.animal||p.category||'',level:p.level||p.pet_level||'',xp:p.xp||'',hunger:p.hunger??p.pet_hunger??p.hunger_percent??0,happy:p.happy??p.happiness??p.pet_happiness??p.happiness_percent??0,energy:p.energy??p.pet_energy??p.energy_percent??0}}
function setBar(id,val){const el=$(id); if(!el)return; const v=pct(val); el.style.width=v+'%'; el.setAttribute('aria-valuenow',String(v)); el.title=v+'%';}
async function fetchJsonWithTimeout(url,ms=16000){
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),ms);
  try{
    const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});
    const text=await r.text();
    let d={};
    try{d=JSON.parse(text)}
    catch(e){throw new Error('API did not return JSON. HTTP '+r.status+'. '+text.slice(0,140));}
    if(!r.ok){throw new Error((d.response||d.error||d.message||('API HTTP '+r.status))+'');}
    return d;
  } finally{clearTimeout(timer)}
}
function testImageUrl(url,ms=9000){
  return new Promise((resolve,reject)=>{
    if(!url)return reject(new Error('blank image URL'));
    const img=new Image();
    const timer=setTimeout(()=>{img.onload=img.onerror=null;reject(new Error('image timed out'));},ms);
    img.onload=()=>{clearTimeout(timer);resolve(url)};
    img.onerror=()=>{clearTimeout(timer);reject(new Error('image link did not load'));};
    img.src=url;
  });
}
function setPetLoading(on,msg){
  $('tamaScreen')?.classList.toggle('loading',!!on);
  if(msg) $('petStatus').textContent=msg;
}

function updateMiniTamagotchiDock(){
  const title=document.getElementById('dockMiniTitle');
  const pet=document.getElementById('dockMiniPet');
  const bars=document.getElementById('dockMiniBars');
  if(!title || !pet) return;
  const p=currentPet || window.petbotIframePet || null;
  const name=(p && p.name) ? p.name : 'PetBot';
  title.textContent=name.length>10 ? name.slice(0,9)+'…' : name;
  const img=currentPetImage || (p && (p.url || p.image_url || p.cloudinary_image_url)) || '';
  if(img){
    pet.innerHTML='<img src="'+String(img).replace(/"/g,'&quot;')+'" alt="">';
  } else {
    pet.innerHTML='<span>♡</span>';
  }
  if(bars){
    const vals=[p?.hunger,p?.happy,p?.energy].map(v=>Math.max(0.08,pct(v||0)/100));
    [...bars.querySelectorAll('i')].forEach((el,i)=>{el.style.transform='scaleX('+(vals[i]||0.08)+')';});
  }
}
function receivePetbotIframeState(payload){
  if(!payload || !payload.pet) return;
  window.petbotIframePet=payload.pet;
  currentPet={...(currentPet||{}),...payload.pet};
  const img=payload.pet.url || payload.pet.image_url || payload.pet.cloudinary_image_url || '';
  if(img) currentPetImage=img;
  updateMiniTamagotchiDock();
  if(payload.pet && payload.pet.name){
    try{ localStorage.setItem('waa-last-petbot-pet', JSON.stringify(payload.pet)); }catch(e){}
  }
}
window.addEventListener('message',function(e){
  if(e.origin !== location.origin) return;
  const d=e.data || {};
  if(d.type === 'waa-petbot-toggle-fullscreen'){
    // Stage 19: this is a CSS fullscreen first. Browser Fullscreen API can be blocked
    // when the click started inside an iframe, so the game must still visibly expand.
    try{ document.body.classList.remove('gameExpandedFromTama'); }catch(err){}
    try{ if(typeof window.openPetbotFull === 'function') window.openPetbotFull(); }catch(err){}
    try{
      if(!document.fullscreenElement && document.documentElement.requestFullscreen){ const r=document.documentElement.requestFullscreen(); if(r&&r.catch)r.catch(()=>{}); }
    }catch(err){}
    return;
  }
  if(d.type === 'waa-petbot-close'){
    try{ if(typeof window.closePetbotFull === 'function') window.closePetbotFull(); }catch(err){}
    return;
  }
  if(d.type === 'waa-petbot-state') receivePetbotIframeState(d);
  if(d.type === 'waa-petbot-game-action') handlePetbotGameAction(d.action);
});
function startEmbeddedTamaGame(kind){
  document.body.classList.add('tamaGameEmbedded');
  document.body.classList.add('petbotOpen');
  try{ sessionStorage.setItem('waa-game-started-this-tab','1'); }catch(e){}
  try{ fitEmbeddedTamaGame(); }catch(e){}
  try{ if(kind==='team') startTeamQuest(); else startSoloQuest(); }catch(e){ console.error('Could not start embedded game',e); }
  try{ if(typeof paused !== 'undefined') paused = false; if(typeof playing !== 'undefined') playing = true; }catch(e){}
  requestAnimationFrame(()=>{ try{ fitEmbeddedTamaGame(); }catch(e){} });
}
function stopEmbeddedTamaGame(){
  document.body.classList.remove('tamaGameEmbedded');
  try{ if(typeof paused !== 'undefined') paused = true; }catch(e){}
}

function fitEmbeddedTamaGame(){
  if(!document.body.classList.contains('tamaGameEmbedded')) return;
  try{
    const vw=window.innerWidth||document.documentElement.clientWidth||1920;
    const vh=window.innerHeight||document.documentElement.clientHeight||1080;
    const deviceW=Math.min(vw*0.98, vh*0.99*(1024/1536));
    const deviceH=deviceW*(1536/1024);
    const deviceLeft=(vw-deviceW)/2;
    const deviceTop=(vh-deviceH)/2;

    // Use the same LCD rectangle as petbot_test.html Stage 20.
    const lcdX=.2118, lcdY=.3952, lcdW=.5724, lcdH=.2663;
    const lcdLeft=deviceLeft+deviceW*lcdX;
    const lcdTop=deviceTop+deviceH*lcdY;
    const lcdPxW=deviceW*lcdW;
    const lcdPxH=deviceH*lcdH;
    const lcdCenterX=lcdLeft+lcdPxW/2;
    const lcdCenterY=lcdTop+lcdPxH/2;

    // Stage 25: zoom into the useful part of the level, then crop it to the LCD.
    // The player starts near the left of the design canvas, so the local crop begins near x=0.
    let scale=Math.max(lcdPxW/860, lcdPxH/520);
    scale=Math.max(.24,Math.min(.56,scale));
    const cropW=Math.min(DESIGN_W,lcdPxW/scale);
    const cropH=Math.min(DESIGN_H,lcdPxH/scale);
    const cropLeft=Math.max(0,Math.min(DESIGN_W-cropW,12));
    const cropTop=Math.max(0,Math.min(DESIGN_H-cropH,DESIGN_H-cropH-58));
    const cropCenterX=cropLeft+cropW/2;
    const cropCenterY=cropTop+cropH/2;

    // Position the selected crop rectangle exactly over the Tamagotchi screen.
    const cx=lcdCenterX-((cropCenterX-(DESIGN_W/2))*scale);
    const cy=lcdCenterY-((cropCenterY-(DESIGN_H/2))*scale);

    document.documentElement.style.setProperty('--tama-lcd-cx',cx+'px');
    document.documentElement.style.setProperty('--tama-lcd-cy',cy+'px');
    document.documentElement.style.setProperty('--tama-game-scale',scale.toFixed(4));
    document.documentElement.style.setProperty('--tama-clip-left',cropLeft+'px');
    document.documentElement.style.setProperty('--tama-clip-top',cropTop+'px');
    document.documentElement.style.setProperty('--tama-clip-right',(DESIGN_W-cropLeft-cropW)+'px');
    document.documentElement.style.setProperty('--tama-clip-bottom',(DESIGN_H-cropTop-cropH)+'px');
  }catch(e){console.warn('fitEmbeddedTamaGame failed',e);}
}

function expandEmbeddedTamaGame(){
  // Stage 19: expand the real platform game out of the Tamagotchi frame.
  document.body.classList.remove('tamaGameEmbedded');
  document.body.classList.remove('tamagotchiLanding');
  document.body.classList.add('gameExpandedFromTama');
  try{ if(typeof window.closePetbotFull === 'function') window.closePetbotFull(); }catch(e){}
  try{ const dock=document.getElementById('petbotDock'); if(dock) dock.classList.add('hidden'); }catch(e){}
  try{ const start=document.getElementById('startScreen'); if(start) start.classList.add('hidden'); }catch(e){}
  try{ if(typeof paused !== 'undefined') paused = false; if(typeof playing !== 'undefined') playing = true; }catch(e){}
  try{ if(!document.fullscreenElement && document.documentElement.requestFullscreen){ const r=document.documentElement.requestFullscreen(); if(r&&r.catch)r.catch(()=>{}); } }catch(e){}
  requestAnimationFrame(()=>{ try{ fitGameToScreen(); }catch(e){} });
}
function selectNearestEmbedded(){
  if(!document.body.classList.contains('tamaGameEmbedded')) return false;
  try{
    const playerEl=$('player');
    if(!playerEl||!Array.isArray(objects)) return false;
    const pr=playerEl.getBoundingClientRect();
    const pcx=pr.left+pr.width/2, pcy=pr.top+pr.height/2;
    let best=null;
    for(const o of objects){
      if(!o||o.hit||o.vanished||o.opening||!o.el) continue;
      if(!(o.kind==='building'||o.kind==='task'||o.kind==='sign')) continue;
      const r=o.el.getBoundingClientRect();
      if(r.width<4||r.height<4) continue;
      const cx=r.left+r.width/2, cy=r.top+r.height/2;
      const dx=Math.abs(cx-pcx), dy=Math.abs(cy-pcy);
      const limitX=o.kind==='building'?260:170;
      const limitY=o.kind==='building'?190:130;
      if(dx>limitX||dy>limitY) continue;
      const score=dx+(dy*.45);
      if(!best||score<best.score) best={o,score};
    }
    if(best&&best.o){
      if(best.o.kind==='building'&&typeof openBuilding==='function'){
        openBuilding(best.o); return true;
      }
      if(typeof interactObject==='function') return !!interactObject(best.o);
    }
  }catch(e){}
  return false;
}
function tapEmbeddedControl(action){
  try{
    if(action==='moveLeft'){ keys.left=true; keys.right=false; setTimeout(()=>{keys.left=false;},360); }
    if(action==='moveRight'){ keys.right=true; keys.left=false; setTimeout(()=>{keys.right=false;},360); }
    if(action==='moveLeftStart'){ keys.left=true; keys.right=false; }
    if(action==='moveRightStart'){ keys.right=true; keys.left=false; }
    if(action==='moveStop'){ keys.left=false; keys.right=false; }
    if(action==='jump'){
      // Pacifier is Select first. In Tamagotchi mode the screen is small, so also use a wider helper radius.
      if(selectNearestEmbedded()) return;
      if(!(typeof enterNearbyBuilding==='function' && enterNearbyBuilding()) && !(typeof enterNearbyInteractable==='function' && enterNearbyInteractable())) jump();
    }
  }catch(e){}
}
function handlePetbotGameAction(action){
  if(action === 'startSoloEmbedded' || action === 'startPlatformEmbedded'){
    startEmbeddedTamaGame('solo');
    return;
  }
  if(action === 'startTeamEmbedded'){
    startEmbeddedTamaGame('team');
    return;
  }
  if(action === 'expandEmbedded'){
    expandEmbeddedTamaGame();
    return;
  }
  if(action === 'stopEmbedded'){
    stopEmbeddedTamaGame();
    return;
  }
  if(action === 'moveLeft' || action === 'moveRight' || action === 'moveLeftStart' || action === 'moveRightStart' || action === 'moveStop' || action === 'jump' || action === 'selectOrJump' || action === 'jumpOnly'){
    tapEmbeddedControl(action);
    return;
  }
  document.body.classList.remove('tamagotchiLanding');
  document.body.classList.remove('tamaGameEmbedded');
  try{ if(action==='startSolo'||action==='startTeam'||action==='backToGame') sessionStorage.setItem('waa-game-started-this-tab','1'); }catch(e){}
  if(action === 'startPlatform'){
    if(typeof closePetbotFull === 'function') closePetbotFull();
    startSoloQuest();
  }else if(action === 'startSolo'){
    if(typeof closePetbotFull === 'function') closePetbotFull();
    startSoloQuest();
  }else if(action === 'startTeam'){
    if(typeof closePetbotFull === 'function') closePetbotFull();
    startTeamQuest();
  }else if(action === 'openBuilder'){
    if(typeof closePetbotFull === 'function') closePetbotFull();
    const ss=$('startScreen'); if(ss) ss.classList.add('hidden');
    openBuilder();
  }else if(action === 'openOldMenu'){
    if(typeof closePetbotFull === 'function') closePetbotFull();
    openMenu();
  }else if(action === 'backToGame'){
    if(typeof closePetbotFull === 'function') closePetbotFull();
    else resumeGame();
  }
}
try{
  const last=JSON.parse(localStorage.getItem('waa-last-petbot-pet')||'null');
  if(last && last.name) receivePetbotIframeState({pet:last});
}catch(e){}
// EDIT SECTION 24: PETBOT LIVE LOADING - gets owned pets from the safe read-only API
async function loadPetbotPets(force=false){
  const userId=getPetUserId();
  $('petTitle').textContent='Loading pets...';$('petSub').textContent='Contacting PetBot Apps Script';
  $('petPreview').classList.add('empty');$('petPreview').innerHTML='<span>Loading pets...</span>';
  setPetLoading(true,'Loading owned pets for Discord user '+userId+' ...');
  try{
    const url='/api/petbot?mode=view_pets&user_id='+encodeURIComponent(userId)+'&per_page=50&v=clean'+(force?'&force=1':'');
    const d=await fetchJsonWithTimeout(url);
    if(d && d.found===false && d.response) throw new Error(d.response);
    const pets=normalisePets(d);
    window.loadedPets=pets;
    $('petSelect').innerHTML=pets.length?pets.map((p,i)=>`<option value="${i}">${p.name} (${p.pet||p.code||'pet'})</option>`).join(''):'<option value="">No pets found</option>';
    if(!pets.length){
      $('petPreview').classList.add('empty');$('petPreview').innerHTML='<span class="petNoPets">No pets found for this user.</span>';
      $('petTitle').textContent='No pets found';$('petSub').textContent='PetBot replied, but no pet rows were detected.';
      setPetLoading(false,'PetBot replied, but no pets were found. Check the Discord user ID or the Apps Script view_pets response.');return;
    }
    setPetLoading(false,'Loaded '+pets.length+' pets. Looking for the Sheet 51 picture...');
    await selectPet();
  }catch(e){
    setPetLoading(false,'PetBot load failed: '+(e.name==='AbortError'?'request timed out':e.message));
    $('petTitle').textContent='PetBot error';$('petSub').textContent='Check the PetBot Apps Script /exec response.';
    $('petPreview').classList.add('empty');$('petPreview').innerHTML='<span>PetBot error</span>';
  }
}
async function selectPet(){
  const i=+$('petSelect').value||0,p=(window.loadedPets||[])[i],userId=getPetUserId();
  if(!p){$('petPreview').classList.add('empty');$('petPreview').textContent='No pet loaded yet';$('petTitle').textContent='No pet loaded';$('petSub').textContent='Choose a pet or press Reload live.';updateMiniTamagotchiDock();return}
  currentPet=p;currentPetImage='';updateMiniTamagotchiDock();
  $('petTitle').textContent=p.name||'Unnamed pet';
  $('petSub').textContent=(p.pet||'pet')+(p.code?' • code '+p.code:'')+(p.level?' • level '+p.level:'');
  $('petCodeBadge').textContent='code '+(p.code||'—');$('petLevelBadge').textContent='level '+(p.level||'—');setBar('hungerBar',p.hunger);setBar('happyBar',p.happy);setBar('energyBar',p.energy);
  $('petPreview').classList.add('empty');$('petPreview').innerHTML='<span>Finding Sheet 51 image...</span>';
  $('petImageBadge').textContent='Checking Sheet 51';$('petImageBadge').className='petBadge blue';
  setPetLoading(true,'Finding Sheet 51 image for '+(p.name||'this pet')+' ...');
  try{
    const q=new URLSearchParams({user_id:userId,pet_code:p.code||'',pet_name:p.name||'',pet:p.pet||'',action:'main',v:'51'});
    const d=await fetchJsonWithTimeout('/api/sheet51?'+q,14000);
    const candidate=d.image_url||d.url||d.cloudinary_image_url||'';
    if(candidate){
      try{
        await testImageUrl(candidate,9000);
        currentPetImage=candidate;
        currentPetMeta=d||{};
        updateMiniTamagotchiDock();
        const suggestedW=Number(d.player_width||d.width||d.overlay_width||d.scale_width||0);
        const scale=Number(d.scale||0);
        petPlayerW=Math.max(45,Math.min(240,suggestedW || (scale>0&&scale<3?Math.round(130*scale):115)));
        if($('petSizeRange')){$('petSizeRange').value=petPlayerW;$('petSizeVal').textContent=petPlayerW+'px';}
        const face=String(d.facing||d.direction||d.flip||'').toLowerCase();
        if(face.includes('flip')||face.includes('left')||face==='-1')petFlip=-1;
        if(face.includes('right')||face==='1')petFlip=1;
        if($('petFlipSelect'))$('petFlipSelect').value=String(petFlip);
        $('petPreview').classList.remove('empty');$('petPreview').innerHTML='<img src="'+candidate+'" alt="pet">';
        $('petImageBadge').textContent='Sheet 51 image ✓';$('petImageBadge').className='petBadge green';
        setPetLoading(false,p.name+' loaded with Sheet 51 image.');
      }catch(imgErr){
        currentPetImage='';
        updateMiniTamagotchiDock();
        $('petPreview').classList.add('empty');$('petPreview').innerHTML='<span>Image link found but did not load</span>';
        $('petImageBadge').textContent='Bad image link';$('petImageBadge').className='petBadge';
        setPetLoading(false,'Sheet 51 matched a row, but the image URL did not load. Check that the Cloudinary public ID/image_url is a real delivery URL. URL: '+candidate);
      }
    } else {
      updateMiniTamagotchiDock();
      $('petPreview').classList.add('empty');$('petPreview').textContent='No Sheet 51 image found for '+p.name;
      $('petImageBadge').textContent='No Sheet 51 image';$('petImageBadge').className='petBadge';
      setPetLoading(false,'Pet loaded, but Sheet 51 did not find an image match for '+p.name+'. Reason: '+(d.reason||'no match'));
    }
  }catch(e){
    updateMiniTamagotchiDock();
    $('petPreview').classList.add('empty');$('petPreview').innerHTML='<span>Sheet 51 error</span>';
    $('petImageBadge').textContent='Sheet 51 error';$('petImageBadge').className='petBadge';
    setPetLoading(false,'Sheet 51 lookup failed: '+(e.name==='AbortError'?'request timed out':e.message));
  }
}
function usePet(){if(!currentPetImage){$('petStatus').textContent='No pet image loaded yet.';return}spriteBroken.clear();petPlayerW=Math.max(45,Math.min(240,Number($('petSizeRange')?.value)||petPlayerW));petFlip=Number($('petFlipSelect')?.value)||petFlip;mainFlip=petFlip;if($('mainFlipSelect'))$('mainFlipSelect').value=String(mainFlip);if($('calPlayerW'))$('calPlayerW').value=petPlayerW;setVar('playerW',petPlayerW,'px');applySettings({playerW:petPlayerW,main:'pet',buddy:'none',team:false,petPlayerW,petFlip,mainFlip});setPair('pet','none');$('petPanel').classList.add('hidden');showToast((currentPet?.name||'Pet')+' is now the player')}
function bumpVisual(which){const p=currentPet;if(!p){$('petStatus').textContent='Load a pet first.';return}if(which==='feed')p.hunger=pct(p.hunger)+8;if(which==='play')p.happy=pct(p.happy)+8;if(which==='rest')p.energy=pct(p.energy)+8;if(which==='heal'){p.hunger=pct(p.hunger)+3;p.happy=pct(p.happy)+3;p.energy=pct(p.energy)+3}setBar('hungerBar',p.hunger);setBar('happyBar',p.happy);setBar('energyBar',p.energy);$('petStatus').textContent='Visual '+which+' animation only. PetBot is still read-only from this game.'}

// EDIT SECTION 20B: AUTO DAY / NIGHT - SAFE PATCH
// Uses the user's own device/browser time on every page load.
// Manual button changes it only for the current session, so old saved choices do not trap the game in day/night.
function isDeviceNightTime(){
  const hour=new Date().getHours();
  return hour>=19 || hour<7;
}
function setDayNightMode(useNight){
  document.body.classList.toggle('night',!!useNight);
  const btn=$('modeBtn');
  if(btn)btn.textContent=useNight?'Day ☀️':'Night 🌙';
}
function initAutoDayNight(){
  setDayNightMode(isDeviceNightTime());
}
function toggleDayNightManual(){
  setDayNightMode(!document.body.classList.contains('night'));
}

$('reloadPetsBtn').onclick=()=>loadPetbotPets(true);$('petSelect').onchange=selectPet;$('userSelect').onchange=()=>loadPetbotPets(false);$('userIdInput').addEventListener('change',()=>loadPetbotPets(true));$('usePetBtn').onclick=usePet;if($('petSizeRange'))$('petSizeRange').oninput=()=>{petPlayerW=Math.max(45,Math.min(240,Number($('petSizeRange').value)||115));$('petSizeRange').value=petPlayerW;$('petSizeVal').textContent=petPlayerW+'px';applyCharacterSlotSizes();updateSpriteFacing(0);};if($('petFlipSelect'))$('petFlipSelect').onchange=()=>{petFlip=Number($('petFlipSelect').value)||1;applySpriteTransform();};$('feedVisualBtn').onclick=()=>bumpVisual('feed');$('playVisualBtn').onclick=()=>bumpVisual('play');$('restVisualBtn').onclick=()=>bumpVisual('rest');$('healVisualBtn').onclick=()=>bumpVisual('heal');
$('startSoloBtn').onclick=startSoloQuest;$('startTeamBtn').onclick=startTeamQuest;$('swapBtn').onclick=()=>{if(!team||!buddy||buddy==='none')return showToast('Solo Quest: no side character.');const a=main;setPair(buddy,a,teamExtra[0]||'none',teamExtra[1]||'none')};$('pauseBtn').onclick=()=>{if(!playing)return openMenu();paused=!paused;$('pauseBtn').textContent=paused?'Resume':'Pause';if(paused)showToast('Paused. Press Menu for options.')} ;$('modeBtn').onclick=toggleDayNightManual;$('helpBtn').onclick=()=>$('instructions').classList.toggle('hidden');$('nextLevelBtn').onclick=()=>{levelIndex++;startLevel()};$('restartBtn').onclick=()=>{score=0;lives=3;levelIndex=0;startLevel();$('endScreen').classList.add('hidden')};
addEventListener('keydown',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=true;if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=true;if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')jump();if(e.code==='Enter'||e.code==='NumpadEnter'){if(enterNearbyBuilding()||enterNearbyInteractable())e.preventDefault();}if(e.code==='Escape'){closeBuilder();$('petPanel').classList.add('hidden');$('shopScreen')?.classList.add('hidden');$('welcomeInfoScreen')?.classList.add('hidden');$('hookScreen')?.classList.add('hidden');$('questStartScreen')?.classList.add('hidden')}});addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')keys.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')keys.right=false});
function holdButton(id,down,up){
  const btn=$(id); if(!btn)return;
  btn.onpointerdown=e=>{e.preventDefault();down();};
  btn.onpointerup=e=>{e.preventDefault();up();};
  btn.onpointercancel=up; btn.onpointerleave=up;
  btn.ontouchstart=e=>{e.preventDefault();down();};
  btn.ontouchend=e=>{e.preventDefault();up();};
}
holdButton('touchLeft',()=>keys.left=true,()=>keys.left=false);
holdButton('touchRight',()=>keys.right=true,()=>keys.right=false);
['touchJump','touchJump2'].forEach(id=>{const btn=$(id); if(btn){btn.onpointerdown=e=>{e.preventDefault();jump();};btn.ontouchstart=e=>{e.preventDefault();jump();};}});
function closePlaceOverlay(id){
  const el=$(id);
  if(el)el.classList.add('hidden');
  if(playing&&!ended&&$('startScreen').classList.contains('hidden')&&!document.body.classList.contains('editMode')){
    paused=false;
    $('pauseBtn').textContent='Pause';
  }
}
if($('closeShopBtn'))$('closeShopBtn').onclick=()=>closePlaceOverlay('shopScreen');
if($('closeWelcomeBtn'))$('closeWelcomeBtn').onclick=()=>closePlaceOverlay('welcomeInfoScreen');
if($('closeHookBtn'))$('closeHookBtn').onclick=()=>closePlaceOverlay('hookScreen');
if($('closeQuestStarterBtn'))$('closeQuestStarterBtn').onclick=()=>closePlaceOverlay('questStartScreen');
document.querySelectorAll('[data-quest-level]').forEach(btn=>{
  btn.onclick=()=>{
    closePlaceOverlay('questStartScreen');
    const idx=Math.max(0,Math.min(levels.length-1,Number(btn.dataset.questLevel)||0));
    levelIndex=idx;
    startLevel();
  };
});
const EDIT_SNAP=8;
function snapVal(v,step=EDIT_SNAP){return Math.round(Number(v||0)/step)*step;}
function clampSnap(v,min,max,step=EDIT_SNAP){return Math.max(min,Math.min(max,snapVal(v,step)));}

let drag=null;
// EDIT SECTION 25: DRAGGING, BUTTONS, KEYBOARD, TOUCH CONTROLS AND STARTUP
function beginSelectedPlaceDrag(e){
  if(!document.body.classList.contains('editMode'))return;
  selectedPlace=($('placeSelect')&&$('placeSelect').value)||selectedPlace||'petShop';
  if($('placeSelect'))$('placeSelect').value=selectedPlace;
  focusEditTarget('places');
  syncPlaceControls();

  // EASY DRAG FIX:
  // When Places / buildings is selected, drag works even if you grab the blue/yellow
  // edit box, the transparent edge, or empty game space beside the building.
  // It moves the currently selected building instead of trying to drag the ground.
  const obj=ensurePlaceEditorObject(selectedPlace,e.clientX,e.clientY);
  const l={...buildingLayout(selectedPlace)};
  drag={
    layer:'place',
    place:selectedPlace,
    obj,
    sx:e.clientX,
    sy:e.clientY,
    startLayout:l,
    startX:obj?obj.x:e.clientX,
    startY:obj?obj.y:e.clientY
  };
  try{($('game')||document.body).setPointerCapture(e.pointerId)}catch(err){}
  e.preventDefault();
  e.stopPropagation();
}
function beginLayerDrag(layer,e){
  if(!document.body.classList.contains('editMode'))return;
  if(!layer)return;
  if(layer==='places'||layer==='place'){beginSelectedPlaceDrag(e);return;}
  focusEditTarget(layer);
  drag={layer,sx:e.clientX,sy:e.clientY,start:readSettings()};
  try{(e.currentTarget||$('game')).setPointerCapture(e.pointerId)}catch(err){}
  e.preventDefault(); e.stopPropagation();
}
function beginPlaceDrag(o,e){
  if(!o||o.kind!=='building')return;
  selectedPlace=o.place||'petShop';
  if($('placeSelect'))$('placeSelect').value=selectedPlace;
  focusEditTarget('places');
  syncPlaceControls();
  const l={...buildingLayout(selectedPlace)};
  drag={layer:'place',place:selectedPlace,obj:o,sx:e.clientX,sy:e.clientY,startLayout:l,startX:o.x,startY:o.y};
  try{o.el.setPointerCapture(e.pointerId)}catch(err){}
  e.preventDefault();e.stopPropagation();
}

document.querySelectorAll('.editableTarget').forEach(el=>el.addEventListener('pointerdown',e=>{
  if(!document.body.classList.contains('editMode'))return;
  beginLayerDrag(el.dataset.layer,e);
}));
$('game').addEventListener('pointerdown',e=>{
  if(!document.body.classList.contains('editMode'))return;
  if(e.target.closest('.builder,.petPanel,.hud,.overlay,.touch,.helpBtn'))return;
  const selected=(document.body.dataset.editTarget||($('editTarget')&&$('editTarget').value)||'player');
  beginLayerDrag(selected,e);
});
addEventListener('pointermove',e=>{
  if(!drag)return;
  const dx=(e.clientX-drag.sx)/Math.max(.1,currentGameScale),dy=(e.clientY-drag.sy)/Math.max(.1,currentGameScale),s=drag.start;
  if(drag.layer==='place'){
    const l=PLACE_LAYOUT[drag.place]||buildingLayout(drag.place);
    const newX=drag.startX+dx;
    l.at=clampNum(buildingAtFromX(newX),-3000,5000);
    l.yOffset=clampNum(drag.startLayout.yOffset+dy,-120,180);
    if(drag.obj){
      // Redraw this one building immediately, using its own route position.
      // Do not convert all buildings into one shared background position.
      applyBuildingRoutePosition(drag.obj);
    }
    syncPlaceControls();
    exportSettings();
  }
  if(drag.layer==='player'){$('calPlayerX').value=clampSnap(s.playerX+dx,30,850);$('calDrop').value=clampSnap(s.playerDrop-dy,-45,110)}
  if(drag.layer==='buddy'){$('calBuddyX').value=clampSnap(s.buddyX+dx,30,850);$('calBuddyDrop').value=clampSnap(s.buddyDrop-dy,-45,110)}
  if(drag.layer==='hills'){$('calHillB').value=clampSnap(s.hillsBottom-dy,-250,600)}
  if(drag.layer==='ground'){$('calGroundB').value=clampSnap(s.groundBottom-dy,-350,350)}
  if(drag.layer==='platform'){$('calFloor').value=clampSnap(s.floorPx-dy,70,240);}
  if(drag.layer!=='place')applySettings({});
  $('dragHint').style.left=e.clientX+12+'px';$('dragHint').style.top=e.clientY+12+'px';
});
addEventListener('pointerup',()=>{if(drag&&drag.layer==='place'){saveBrowserLayout(readSettings());showToast('Building position saved in browser.');}drag=null});
clearBrowserGameSaves();resetCorrect();applySettings(USER_EXACT_LAYOUT_SETTINGS);saveBrowserLayout(USER_EXACT_LAYOUT_SETTINGS);focusEditTarget('player');$('resumeBtn').style.display='none';
// AX SPRITE FRAME DEBUG SWITCH
// Open the game with ?axframes=1 to show Ax idle/walk/jump frame numbers.
if(location.search.includes('axframes=1')){
  document.body.classList.add('axFrameDebugOn');
  const axDbg=$('axFrameDebug');
  if(axDbg) axDbg.textContent='Ax frame debug ON — idle/walk/jump';
}

// Auto day/night after layout reset so it is not overwritten.
initAutoDayNight();
// Load the browser building/layout save first. Only auto-load cloud if there is no browser save.
loadBrowserLayout();
requestAnimationFrame(loop);
// Fullscreen fixed-layout scaling.
// The game is always drawn as 1920x1080, then scaled to COVER the real screen.
// This removes letterbox gaps while keeping buildings/tutorial blocks in the same route positions.
function fitGameToScreen(){
  const game = document.getElementById('game');
  if(!game) return;

  const vw = window.innerWidth || document.documentElement.clientWidth || DESIGN_W;
  const vh = window.innerHeight || document.documentElement.clientHeight || DESIGN_H;

  // Full-screen cover mode: fills the screen.
  const scale = Math.max(vw / DESIGN_W, vh / DESIGN_H);

  const designAspect = DESIGN_W / DESIGN_H;
  const viewAspect = vw / vh;

  // Narrow screens keep the left side visible so Ax does not disappear.
  const left = viewAspect < designAspect
    ? 0
    : (vw - DESIGN_W * scale) / 2;

  // Keep floor/sprites visible.
  const top = vh - DESIGN_H * scale;

  currentGameScale = scale;
  currentGameLeft = left;
  currentGameTop = top;

  game.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;

  // Keep HUD visible even when the game canvas is cropped vertically.
  const visibleTop = Math.max(10, (10 - top) / scale);
  const visibleCentreX = (vw / 2 - left) / scale;
  const visibleHudW = Math.min(1160, (vw - 18) / scale);

  const hud = document.querySelector('.hud');
  if(hud){
    hud.style.left = `${visibleCentreX}px`;
    hud.style.top = `${visibleTop}px`;
    hud.style.width = `${visibleHudW}px`;
    hud.style.transform = 'translateX(-50%)';
  }

  const toast = $('toast');
  if(toast){
    toast.style.top = `${visibleTop + 76}px`;
  }

  // Keep the help panel visible when ? is pressed.
  const instructions = $('instructions');
  if(instructions){
    instructions.style.top = `${visibleTop + 72}px`;
    instructions.style.left = `${Math.max(14, Math.min(DESIGN_W - 360, (vw - 344 - left) / scale))}px`;
    instructions.style.right = 'auto';
  }

  // Keep ? button visible on cropped/narrow screens.
  const help = $('helpBtn');
  if(help){
    help.style.left = `${Math.max(14, Math.min(DESIGN_W - 60, (vw - 54 - left) / scale))}px`;
    help.style.right = 'auto';
  }

  // Keep the small Tamagotchi on the visible part of the game, under the HUD, not chopped off.
  const dock = $('petbotDock');
  if(dock && !dock.classList.contains('fullscreen')){
    const dockW = (window.innerWidth <= 520) ? 98 : (window.innerWidth <= 900 ? 132 : 170);
    const dockH = (window.innerWidth <= 520) ? 132 : (window.innerWidth <= 900 ? 176 : 226);
    const visibleRightX = (vw - left) / scale;
    const dockLeft = Math.max(18, Math.min(DESIGN_W - dockW - 18, visibleRightX - dockW - 32));
    const dockTop = Math.max(visibleTop + 94, visibleTop + 18);
    dock.style.setProperty('left', `${dockLeft}px`, 'important');
    dock.style.setProperty('right', 'auto', 'important');
    dock.style.setProperty('top', `${dockTop}px`, 'important');
    dock.style.setProperty('width', `${dockW}px`, 'important');
    dock.style.setProperty('height', `${dockH}px`, 'important');
    dock.style.setProperty('min-width', `${dockW}px`, 'important');
    dock.style.setProperty('min-height', `${dockH}px`, 'important');
    dock.style.setProperty('max-width', `${dockW}px`, 'important');
    dock.style.setProperty('max-height', `${dockH}px`, 'important');
  }
}
window.addEventListener('resize', fitGameToScreen);
window.addEventListener('orientationchange', fitGameToScreen);
window.addEventListener('resize',()=>{try{fitEmbeddedTamaGame();}catch(e){}});
window.addEventListener('orientationchange',()=>{setTimeout(()=>{try{fitEmbeddedTamaGame();}catch(e){}},120);});
fitGameToScreen();





// STAGE 27: reliable building select, visible Tamagotchi quest text, and smoother moving state.
function stage27EnsureCaption(){
  let cap=document.getElementById('tamaGameCaption');
  if(!cap){cap=document.createElement('div');cap.id='tamaGameCaption';cap.className='tamaGameCaption';cap.setAttribute('aria-live','polite');document.body.appendChild(cap);}
  return cap;
}
function stage27ShowCaption(msg,duration=1800){
  const cap=stage27EnsureCaption();
  cap.textContent=String(msg||'');
  cap.classList.add('show');
  clearTimeout(stage27ShowCaption.t);
  stage27ShowCaption.t=setTimeout(()=>cap.classList.remove('show'),duration);
}
function showToast(msg){
  const t=$('toast');
  if(t){t.textContent=msg;t.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>t.classList.remove('show'),1300);}
  if(document.body.classList.contains('tamaGameEmbedded')||document.body.classList.contains('gameExpandedFromTama')) stage27ShowCaption(msg,1900);
}
function stage27SetMovingClass(moving){
  moving=!!moving;
  if(stage27SetMovingClass.last===moving)return;
  stage27SetMovingClass.last=moving;
  document.body.classList.toggle('gameMoving',moving);
}
function renderObjectNow(o){
  if(!o||!o.el)return;
  const left=(Number(o.x)||0).toFixed(2)+'px';
  const top=(Number(o.y)||0).toFixed(2)+'px';
  if(o._lastLeft!==left){o.el.style.left=left;o._lastLeft=left;}
  if(o._lastTop!==top){o.el.style.top=top;o._lastTop=top;}
}
function stage27ObjectDistanceScore(o,pcx,pcy,wide){
  const r=o.el.getBoundingClientRect();
  if(!r||r.width<4||r.height<4)return null;
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  const dx=Math.abs(cx-pcx), dy=Math.abs(cy-pcy);
  const isBuilding=o.kind==='building';
  const limitX=isBuilding?(wide?560:430):(wide?310:230);
  const limitY=isBuilding?(wide?360:260):(wide?220:160);
  if(dx>limitX||dy>limitY)return null;
  return dx+(dy*.42);
}
function selectNearestWorldStop(opts={}){
  const wide=!!(opts.embedded||opts.expanded||document.body.classList.contains('tamaGameEmbedded')||document.body.classList.contains('gameExpandedFromTama'));
  if(!playing||ended||document.body.classList.contains('editMode'))return false;
  if(!$('startScreen').classList.contains('hidden'))return false;
  if($('doorScreen')&&!$('doorScreen').classList.contains('hidden'))return false;
  const overlays=['shopScreen','welcomeInfoScreen','hookScreen','questStartScreen','levelScreen','endScreen'];
  if(overlays.some(id=>$(id)&&!$(id).classList.contains('hidden')))return false;
  const playerEl=$('player');
  if(!playerEl||!Array.isArray(objects))return false;
  const pr=playerEl.getBoundingClientRect();
  const pcx=pr.left+pr.width/2, pcy=pr.top+pr.height*.70;
  let best=null;
  for(const o of objects){
    if(!o||o.hit||o.vanished||o.opening||!o.el)continue;
    if(!(o.kind==='building'||o.kind==='task'||o.kind==='sign'))continue;
    const score=stage27ObjectDistanceScore(o,pcx,pcy,wide);
    if(score==null)continue;
    if(!best||score<best.score)best={o,score};
  }
  if(!best){
    const playerDesignX=cssNumber('--playerX',150)+(player&&player.x?player.x:0);
    for(const o of objects){
      if(!o||o.hit||o.vanished||o.opening||!o.el)continue;
      if(!(o.kind==='building'||o.kind==='task'||o.kind==='sign'))continue;
      const dx=Math.abs((Number(o.x)||0)-playerDesignX);
      const limit=o.kind==='building'?(wide?620:470):(wide?360:260);
      if(dx<=limit){const score=dx+(o.kind==='building'?0:80);if(!best||score<best.score)best={o,score};}
    }
  }
  if(!best||!best.o){showToast('Move closer to the glowing building, then press the pacifier or Enter.');return false;}
  const o=best.o;
  if(o.kind==='building'&&typeof openBuilding==='function'){openBuilding(o);return true;}
  if(typeof interactObject==='function')return !!interactObject(o);
  return false;
}
function enterNearbyBuilding(){
  if(!playing||ended||document.body.classList.contains('editMode'))return false;
  if(nearbyBuilding&&!nearbyBuilding.vanished&&!nearbyBuilding.opening){openBuilding(nearbyBuilding);return true;}
  return selectNearestWorldStop({expanded:document.body.classList.contains('gameExpandedFromTama')});
}
function enterNearbyInteractable(){
  if(!playing||ended||document.body.classList.contains('editMode'))return false;
  if(nearbyInteractable&&!nearbyInteractable.vanished&&!nearbyInteractable.hit)return interactObject(nearbyInteractable);
  return selectNearestWorldStop({expanded:document.body.classList.contains('gameExpandedFromTama')});
}
function selectNearestEmbedded(){
  if(!document.body.classList.contains('tamaGameEmbedded'))return false;
  return selectNearestWorldStop({embedded:true});
}
function tapEmbeddedControl(action){
  try{
    if(action==='moveLeft'){keys.left=true;keys.right=false;stage27SetMovingClass(true);setTimeout(()=>{keys.left=false;stage27SetMovingClass(false);},300);return;}
    if(action==='moveRight'){keys.right=true;keys.left=false;stage27SetMovingClass(true);setTimeout(()=>{keys.right=false;stage27SetMovingClass(false);},300);return;}
    if(action==='moveLeftStart'){keys.left=true;keys.right=false;stage27SetMovingClass(true);return;}
    if(action==='moveRightStart'){keys.right=true;keys.left=false;stage27SetMovingClass(true);return;}
    if(action==='moveStop'){keys.left=false;keys.right=false;stage27SetMovingClass(false);return;}
    if(action==='jumpOnly'){jump();return;}
    if(action==='jump'||action==='selectOrJump'){
      if(selectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')}))return;
      jump();
    }
  }catch(e){console.warn('Tamagotchi control failed',e);}
}
function fitEmbeddedTamaGame(){
  if(!document.body.classList.contains('tamaGameEmbedded'))return;
  try{
    const vw=window.innerWidth||document.documentElement.clientWidth||1920;
    const vh=window.innerHeight||document.documentElement.clientHeight||1080;
    const deviceW=Math.min(vw*0.98, vh*0.99*(1024/1536));
    const deviceH=deviceW*(1536/1024);
    const deviceLeft=(vw-deviceW)/2, deviceTop=(vh-deviceH)/2;
    const lcdX=.2118,lcdY=.3952,lcdW=.5724,lcdH=.2663;
    const lcdLeft=deviceLeft+deviceW*lcdX, lcdTop=deviceTop+deviceH*lcdY;
    const lcdPxW=deviceW*lcdW, lcdPxH=deviceH*lcdH;
    const lcdCenterX=lcdLeft+lcdPxW/2, lcdCenterY=lcdTop+lcdPxH/2;
    let scale=Math.max(lcdPxW/760,lcdPxH/470);
    scale=Math.max(.30,Math.min(.62,scale));
    const cropW=Math.min(DESIGN_W,lcdPxW/scale), cropH=Math.min(DESIGN_H,lcdPxH/scale);
    const playerDesignX=cssNumber('--playerX',150)+(player&&player.x?player.x:0);
    const cropLeft=Math.max(0,Math.min(DESIGN_W-cropW,playerDesignX-145));
    const cropTop=Math.max(0,Math.min(DESIGN_H-cropH,DESIGN_H-cropH-54));
    const cropCenterX=cropLeft+cropW/2, cropCenterY=cropTop+cropH/2;
    const cx=lcdCenterX-((cropCenterX-(DESIGN_W/2))*scale);
    const cy=lcdCenterY-((cropCenterY-(DESIGN_H/2))*scale);
    document.documentElement.style.setProperty('--tama-lcd-left',lcdLeft+'px');
    document.documentElement.style.setProperty('--tama-lcd-top',lcdTop+'px');
    document.documentElement.style.setProperty('--tama-lcd-w',lcdPxW+'px');
    document.documentElement.style.setProperty('--tama-lcd-h',lcdPxH+'px');
    document.documentElement.style.setProperty('--tama-lcd-cx',cx+'px');
    document.documentElement.style.setProperty('--tama-lcd-cy',cy+'px');
    document.documentElement.style.setProperty('--tama-game-scale',scale.toFixed(4));
    document.documentElement.style.setProperty('--tama-clip-left',cropLeft+'px');
    document.documentElement.style.setProperty('--tama-clip-top',cropTop+'px');
    document.documentElement.style.setProperty('--tama-clip-right',(DESIGN_W-cropLeft-cropW)+'px');
    document.documentElement.style.setProperty('--tama-clip-bottom',(DESIGN_H-cropTop-cropH)+'px');
  }catch(e){console.warn('fitEmbeddedTamaGame failed',e);}
}
function expandEmbeddedTamaGame(){
  document.body.classList.remove('tamaGameEmbedded');
  document.body.classList.remove('tamagotchiLanding');
  document.body.classList.add('gameExpandedFromTama');
  stage27SetMovingClass(false);
  try{if(typeof window.closePetbotFull==='function')window.closePetbotFull();}catch(e){}
  try{const dock=document.getElementById('petbotDock');if(dock)dock.classList.add('hidden');}catch(e){}
  try{const start=document.getElementById('startScreen');if(start)start.classList.add('hidden');}catch(e){}
  try{if(typeof paused!=='undefined')paused=false;if(typeof playing!=='undefined')playing=true;}catch(e){}
  try{window.focus();document.body.setAttribute('tabindex','-1');document.body.focus({preventScroll:true});}catch(e){}
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen){const r=document.documentElement.requestFullscreen();if(r&&r.catch)r.catch(()=>{});}}catch(e){}
  showToast('Full-screen quest: Space jumps. Enter opens the building/sign.');
  requestAnimationFrame(()=>{try{fitGameToScreen();}catch(e){}});
}
window.addEventListener('keydown',function(e){
  const inQuestView=document.body.classList.contains('gameExpandedFromTama')||document.body.classList.contains('tamaGameEmbedded');
  if((e.code==='ArrowLeft'||e.code==='ArrowRight'||e.code==='KeyA'||e.code==='KeyD')&&inQuestView) stage27SetMovingClass(true);
  if(!inQuestView)return;
  if(e.repeat)return;
  if(e.code==='Enter'||e.code==='NumpadEnter'){
    if(selectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')})){e.preventDefault();e.stopPropagation();}
  }
},true);
window.addEventListener('keyup',function(e){
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'||e.code==='KeyA'||e.code==='KeyD') setTimeout(()=>stage27SetMovingClass(!!(keys&&((keys.left)||(keys.right)))),0);
},true);
(function(){
  const game=document.getElementById('game');
  if(game){game.addEventListener('pointerdown',function(e){
    if(document.body.classList.contains('editMode'))return;
    if(!(document.body.classList.contains('gameExpandedFromTama')||document.body.classList.contains('tamaGameEmbedded')))return;
    const target=e.target&&e.target.closest?e.target.closest('.building,.interactiveStop,.lessonBlock'):null;
    if(target&&selectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')})){e.preventDefault();e.stopPropagation();}
  },true);}
})();


// STAGE 28: open real Tamagotchi screens from quest buildings and make selection route-based.
(function(){
  const oldOpenBuilding = (typeof openBuilding === 'function') ? openBuilding : null;
  function q$(id){return document.getElementById(id)}
  function isQuestShell(){return document.body.classList.contains('tamaGameEmbedded') || document.body.classList.contains('gameExpandedFromTama')}
  function currentRouteAt(){
    try{
      const px=(typeof cssNumber==='function'?cssNumber('--playerX',150):150)+((window.player&&Number(player.x))||0);
      if(typeof routeAtFromX==='function') return routeAtFromX(px,'building');
      return (typeof distance==='number'?distance:0);
    }catch(e){return (typeof distance==='number'?distance:0)}
  }
  function objectRouteAt(o){
    try{
      if(Number.isFinite(Number(o&&o.at))) return Number(o.at);
      if(o&&Number.isFinite(Number(o.x))&&typeof routeAtFromX==='function') return routeAtFromX(Number(o.x), o.kind||'building');
    }catch(e){}
    return NaN;
  }
  function placeToPetbotScreen(place){
    const p=String(place||'');
    if(p==='petShop') return 'shop';
    if(p==='habitat') return 'habitat';
    if(p==='hookWaaambulance') return 'hook';
    if(p==='questStarter') return 'games';
    if(p==='welcomeBoard') return 'welcomeBoard';
    return 'petActions';
  }
  function postPetbotOpen(place,label){
    const screen=placeToPetbotScreen(place);
    try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(false); }catch(e){}
    try{ keys.left=false; keys.right=false; }catch(e){}
    try{ document.body.classList.remove('tamaGameEmbedded','gameExpandedFromTama'); }catch(e){}
    try{ if(typeof window.openPetbotFull==='function') window.openPetbotFull(); }catch(e){}
    try{ if(typeof paused!=='undefined') paused=true; }catch(e){}
    const frame=q$('petbotDockFrame')||q$('petbotFrame');
    const msg={type:'waa-parent-open-screen',screen,place,label:label||place};
    try{localStorage.setItem('waaPendingPetbotScreen',JSON.stringify({screen,place,label:label||place,t:Date.now()}));}catch(e){}
    [90,280,620,1100].forEach(ms=>setTimeout(()=>{try{frame&&frame.contentWindow&&frame.contentWindow.postMessage(msg,location.origin)}catch(e){}},ms));
    if(typeof stage27ShowCaption==='function') stage27ShowCaption((label||place||'Building')+' opened',1600);
  }
  window.stage28OpenPetbotScreen = postPetbotOpen;
  window.openBuilding = function(o){
    if(o && o.kind==='building' && isQuestShell()){
      postPetbotOpen(o.place,o.label);
      return;
    }
    if(oldOpenBuilding) return oldOpenBuilding(o);
  };
  window.selectNearestWorldStop = function(opts={}){
    const wide=!!(opts.embedded||opts.expanded||isQuestShell());
    try{
      if(!playing||ended||document.body.classList.contains('editMode'))return false;
      const start=q$('startScreen'); if(start && !start.classList.contains('hidden'))return false;
      const door=q$('doorScreen'); if(door && !door.classList.contains('hidden'))return false;
      const blocked=['shopScreen','welcomeInfoScreen','hookScreen','questStartScreen','levelScreen','endScreen'].some(id=>{const el=q$(id);return el && !el.classList.contains('hidden')});
      if(blocked)return false;
    }catch(e){}
    if(!Array.isArray(objects)) return false;
    const playerEl=q$('player');
    let pcx=0,pcy=0;
    if(playerEl){const pr=playerEl.getBoundingClientRect();pcx=pr.left+pr.width/2;pcy=pr.top+pr.height*.70;}
    const routeHere=currentRouteAt();
    let best=null;
    for(const o of objects){
      if(!o||o.hit||o.vanished||o.opening||!o.el)continue;
      if(!(o.kind==='building'||o.kind==='task'||o.kind==='sign'))continue;
      let screenScore=999999;
      try{
        const r=o.el.getBoundingClientRect();
        if(r&&r.width>3&&r.height>3){
          const dx=Math.abs((r.left+r.width/2)-pcx), dy=Math.abs((r.top+r.height/2)-pcy);
          const lx=o.kind==='building'?(wide?720:520):(wide?400:260);
          const ly=o.kind==='building'?(wide?520:330):(wide?250:170);
          if(dx<=lx && dy<=ly) screenScore=dx+(dy*.32);
        }
      }catch(e){}
      let routeScore=999999;
      const at=objectRouteAt(o);
      if(Number.isFinite(at)){
        const d=Math.abs(at-routeHere);
        const lim=o.kind==='building'?(wide?760:560):(wide?330:240);
        if(d<=lim) routeScore=d*.52+(o.kind==='building'?0:90);
      }
      const score=Math.min(screenScore,routeScore);
      if(score<999998 && (!best || score<best.score)) best={o,score};
    }
    if(!best||!best.o){
      if(typeof showToast==='function')showToast('Stand by the building/sign and press Select or Enter.');
      return false;
    }
    const o=best.o;
    if(o.kind==='building'){ window.openBuilding(o); return true; }
    if(typeof interactObject==='function') return !!interactObject(o);
    return false;
  };
  window.enterNearbyBuilding = function(){
    if(!playing||ended||document.body.classList.contains('editMode'))return false;
    if(nearbyBuilding&&!nearbyBuilding.vanished&&!nearbyBuilding.opening){window.openBuilding(nearbyBuilding);return true;}
    return window.selectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')});
  };
  window.enterNearbyInteractable = function(){
    if(!playing||ended||document.body.classList.contains('editMode'))return false;
    if(nearbyInteractable&&!nearbyInteractable.vanished&&!nearbyInteractable.hit)return interactObject(nearbyInteractable);
    return window.selectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')});
  };
  window.tapEmbeddedControl = function(action){
    try{
      if(action==='moveLeft'){keys.left=true;keys.right=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(true);setTimeout(()=>{keys.left=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(false);},260);return;}
      if(action==='moveRight'){keys.right=true;keys.left=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(true);setTimeout(()=>{keys.right=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(false);},260);return;}
      if(action==='moveLeftStart'){keys.left=true;keys.right=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(true);return;}
      if(action==='moveRightStart'){keys.right=true;keys.left=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(true);return;}
      if(action==='moveStop'){keys.left=false;keys.right=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(false);return;}
      if(action==='jumpOnly'){jump();return;}
      if(action==='jump'||action==='selectOrJump'){if(window.selectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')}))return;jump();}
    }catch(e){console.warn('Stage 28 control failed',e);}
  };
  window.addEventListener('keydown',function(e){
    const inQuest=isQuestShell();
    if(!inQuest||e.repeat)return;
    if(e.code==='Enter'||e.code==='NumpadEnter'||e.code==='KeyE'){
      if(window.selectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')})){e.preventDefault();e.stopImmediatePropagation();}
    }
  },true);
  window.addEventListener('pointerdown',function(e){
    if(!isQuestShell()||document.body.classList.contains('editMode'))return;
    const target=e.target&&e.target.closest?e.target.closest('.building,.interactiveStop,.lessonBlock'):null;
    if(!target)return;
    let found=null;
    if(Array.isArray(objects)) found=objects.find(o=>o&&o.el===target);
    if(found){
      if(found.kind==='building')window.openBuilding(found);
      else if(typeof interactObject==='function')interactObject(found);
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
})();



// STAGE 32: actual quest-mode repair — fullscreen fit, building select, and smoother walking.
(function(){
  function q(id){return document.getElementById(id)}
  function questShell(){return document.body.classList.contains('tamaGameEmbedded') || document.body.classList.contains('gameExpandedFromTama')}
  function setImp(el,prop,val){ if(el) el.style.setProperty(prop,val,'important'); }

  // Extra CSS without overriding the game transform. The older Stage 28 transform:translateZ(0)!important
  // made fullscreen ignore the real fitGameToScreen() transform.
  const st=document.createElement('style');
  st.textContent=`
    body.gameExpandedFromTama #game{visibility:visible!important;opacity:1!important;display:block!important;pointer-events:auto!important;}
    body.gameExpandedFromTama #buildingObjects,
    body.gameExpandedFromTama #worldObjects,
    body.gameExpandedFromTama .building,
    body.gameExpandedFromTama .interactiveStop,
    body.gameExpandedFromTama .lessonBlock{pointer-events:auto!important;}
    body.gameExpandedFromTama .building img,
    body.gameExpandedFromTama .obj.hasImage img,
    body.gameExpandedFromTama .character img,
    body.petbotOpen.tamaGameEmbedded .building img,
    body.petbotOpen.tamaGameEmbedded .obj.hasImage img,
    body.petbotOpen.tamaGameEmbedded .character img{filter:none!important;}
    body.gameExpandedFromTama .building,
    body.gameExpandedFromTama .obj,
    body.gameExpandedFromTama .character,
    body.petbotOpen.tamaGameEmbedded .building,
    body.petbotOpen.tamaGameEmbedded .obj,
    body.petbotOpen.tamaGameEmbedded .character{transition:none!important;will-change:transform;backface-visibility:hidden;}
    body.gameExpandedFromTama .tamaGameCaption.show{display:block!important;position:fixed!important;left:50vw!important;bottom:calc(env(safe-area-inset-bottom) + 18px)!important;top:auto!important;width:min(780px,88vw)!important;transform:translateX(-50%)!important;z-index:2147483646!important;}
  `;
  document.head.appendChild(st);

  // Stronger image warm-up. This keeps PNG frames decoded before walking starts.
  const warmCache=new Map();
  function warmUrl(url){
    if(!url || warmCache.has(url)) return;
    try{
      const img=new Image();
      img.decoding='async';
      img.loading='eager';
      img.fetchPriority='high';
      img.src=url;
      warmCache.set(url,img);
      if(img.decode) img.decode().catch(()=>{});
    }catch(e){}
  }
  function warmAction(char,action){
    try{
      const n=(typeof getActionFrameCount==='function')?getActionFrameCount(char,action):10;
      for(let i=0;i<n;i++){
        const urls=(typeof candidateSpriteUrls==='function')?candidateSpriteUrls(char,action,i):[];
        (urls||[]).forEach(warmUrl);
      }
    }catch(e){}
  }
  window.stage31WarmSprites=function(){
    try{ ['ax','pura','owl','unicorn'].forEach(c=>['idle','walk','jump'].forEach(a=>warmAction(c,a))); }catch(e){}
    try{ if(typeof currentPetImage!=='undefined' && currentPetImage) warmUrl(currentPetImage); }catch(e){}
  };
  const oldPreload=window.preloadAllGameSprites || (typeof preloadAllGameSprites==='function'?preloadAllGameSprites:null);
  window.preloadAllGameSprites=function(){ try{oldPreload&&oldPreload();}catch(e){} window.stage31WarmSprites(); };

  // Fullscreen fit must set transform with !important, otherwise old CSS wins and the screen/click zones drift.
  window.fitGameToScreen=function(){
    const game=q('game'); if(!game) return;
    if(document.body.classList.contains('tamaGameEmbedded')){ try{window.fitEmbeddedTamaGame();}catch(e){} return; }
    const vw=window.innerWidth||document.documentElement.clientWidth||DESIGN_W;
    const vh=window.innerHeight||document.documentElement.clientHeight||DESIGN_H;
    const scale=Math.max(vw/DESIGN_W,vh/DESIGN_H);
    const designAspect=DESIGN_W/DESIGN_H, viewAspect=vw/vh;
    const left=viewAspect<designAspect ? 0 : (vw-DESIGN_W*scale)/2;
    const top=vh-DESIGN_H*scale;
    try{ currentGameScale=scale; currentGameLeft=left; currentGameTop=top; }catch(e){}
    setImp(game,'position','fixed');
    setImp(game,'left','0px');
    setImp(game,'top','0px');
    setImp(game,'width',DESIGN_W+'px');
    setImp(game,'height',DESIGN_H+'px');
    setImp(game,'transform-origin','0 0');
    setImp(game,'transform',`translate3d(${left}px, ${top}px, 0) scale(${scale})`);
    setImp(game,'clip-path','none');
    setImp(game,'-webkit-clip-path','none');

    const visibleTop=Math.max(10,(10-top)/scale);
    const visibleCentreX=(vw/2-left)/scale;
    const visibleHudW=Math.min(1160,(vw-18)/scale);
    const hud=document.querySelector('.hud');
    if(hud){hud.style.left=`${visibleCentreX}px`;hud.style.top=`${visibleTop}px`;hud.style.width=`${visibleHudW}px`;hud.style.transform='translateX(-50%)';}
    const toast=q('toast'); if(toast) toast.style.top=`${visibleTop+76}px`;
    const instructions=q('instructions');
    if(instructions){instructions.style.top=`${visibleTop+72}px`;instructions.style.left=`${Math.max(14,Math.min(DESIGN_W-360,(vw-344-left)/scale))}px`;instructions.style.right='auto';}
    const help=q('helpBtn');
    if(help){help.style.left=`${Math.max(14,Math.min(DESIGN_W-60,(vw-54-left)/scale))}px`;help.style.right='auto';}
  };

  // Tamagotchi mode: explicitly transform/crop with inline important values so old fit rules cannot fight.
  window.fitEmbeddedTamaGame=function(){
    if(!document.body.classList.contains('tamaGameEmbedded')) return;
    const game=q('game'); if(!game) return;
    try{
      const vw=window.innerWidth||document.documentElement.clientWidth||1920;
      const vh=window.innerHeight||document.documentElement.clientHeight||1080;
      const deviceW=Math.min(vw*.98, vh*.99*(1024/1536));
      const deviceH=deviceW*(1536/1024);
      const deviceLeft=(vw-deviceW)/2, deviceTop=(vh-deviceH)/2;
      const lcdX=.2118,lcdY=.3952,lcdW=.5724,lcdH=.2663;
      const lcdLeft=deviceLeft+deviceW*lcdX, lcdTop=deviceTop+deviceH*lcdY;
      const lcdPxW=deviceW*lcdW, lcdPxH=deviceH*lcdH;
      const lcdCenterX=lcdLeft+lcdPxW/2, lcdCenterY=lcdTop+lcdPxH/2;
      // Slightly more zoomed in than before so the sprite is readable.
      let scale=Math.max(lcdPxW/690,lcdPxH/420);
      scale=Math.max(.34,Math.min(.74,scale));
      const cropW=Math.min(DESIGN_W,lcdPxW/scale), cropH=Math.min(DESIGN_H,lcdPxH/scale);
      const playerDesignX=(typeof cssNumber==='function'?cssNumber('--playerX',150):150)+((typeof player!=='undefined'&&player&&Number(player.x))||0);
      const cropLeft=Math.max(0,Math.min(DESIGN_W-cropW,playerDesignX-185));
      const cropTop=Math.max(0,Math.min(DESIGN_H-cropH,DESIGN_H-cropH-46));
      const cropCenterX=cropLeft+cropW/2, cropCenterY=cropTop+cropH/2;
      const cx=lcdCenterX-((cropCenterX-(DESIGN_W/2))*scale);
      const cy=lcdCenterY-((cropCenterY-(DESIGN_H/2))*scale);
      document.documentElement.style.setProperty('--tama-lcd-left',lcdLeft+'px');
      document.documentElement.style.setProperty('--tama-lcd-top',lcdTop+'px');
      document.documentElement.style.setProperty('--tama-lcd-w',lcdPxW+'px');
      document.documentElement.style.setProperty('--tama-lcd-h',lcdPxH+'px');
      document.documentElement.style.setProperty('--tama-lcd-cx',cx+'px');
      document.documentElement.style.setProperty('--tama-lcd-cy',cy+'px');
      document.documentElement.style.setProperty('--tama-game-scale',scale.toFixed(4));
      document.documentElement.style.setProperty('--tama-clip-left',cropLeft+'px');
      document.documentElement.style.setProperty('--tama-clip-top',cropTop+'px');
      document.documentElement.style.setProperty('--tama-clip-right',(DESIGN_W-cropLeft-cropW)+'px');
      document.documentElement.style.setProperty('--tama-clip-bottom',(DESIGN_H-cropTop-cropH)+'px');
      setImp(game,'position','fixed');
      setImp(game,'left',cx+'px');
      setImp(game,'top',cy+'px');
      setImp(game,'width',DESIGN_W+'px');
      setImp(game,'height',DESIGN_H+'px');
      setImp(game,'transform-origin','center center');
      setImp(game,'transform',`translate3d(-50%, -50%, 0) scale(${scale})`);
      setImp(game,'clip-path',`inset(${cropTop}px ${DESIGN_W-cropLeft-cropW}px ${DESIGN_H-cropTop-cropH}px ${cropLeft}px round 24px)`);
      setImp(game,'-webkit-clip-path',`inset(${cropTop}px ${DESIGN_W-cropLeft-cropW}px ${DESIGN_H-cropTop-cropH}px ${cropLeft}px round 24px)`);
    }catch(e){console.warn('stage31 fitEmbedded failed',e);}
  };

  function objectRouteAt31(o){
    try{ if(Number.isFinite(Number(o&&o.at))) return Number(o.at); }catch(e){}
    try{ if(o&&Number.isFinite(Number(o.x))&&typeof routeAtFromX==='function') return routeAtFromX(Number(o.x),o.kind||'building'); }catch(e){}
    return NaN;
  }
  function currentRouteAt31(){
    try{
      const playerX=(typeof cssNumber==='function'?cssNumber('--playerX',150):150)+((typeof player!=='undefined'&&player&&Number(player.x))||0);
      if(typeof routeAtFromX==='function') return routeAtFromX(playerX,'building');
    }catch(e){}
    try{return Number(distance)||0;}catch(e){return 0;}
  }
  window.stage31SelectNearestWorldStop=function(opts={}){
    const wide=!!(opts.embedded||opts.expanded||questShell());
    try{
      if(!playing||ended||document.body.classList.contains('editMode')) return false;
      const start=q('startScreen'); if(start && !start.classList.contains('hidden')) return false;
      const door=q('doorScreen'); if(door && !door.classList.contains('hidden')) return false;
      const blocked=['shopScreen','welcomeInfoScreen','hookScreen','questStartScreen','levelScreen','endScreen'].some(id=>{const el=q(id);return el&&!el.classList.contains('hidden')});
      if(blocked) return false;
    }catch(e){}
    if(!Array.isArray(objects)) return false;
    const playerEl=q('player');
    let pcx=window.innerWidth/2, pcy=window.innerHeight*.62;
    if(playerEl){const pr=playerEl.getBoundingClientRect();pcx=pr.left+pr.width/2;pcy=pr.top+pr.height*.68;}
    const routeHere=currentRouteAt31();
    let best=null;
    for(const o of objects){
      if(!o||o.hit||o.vanished||o.opening||!o.el) continue;
      if(!(o.kind==='building'||o.kind==='task'||o.kind==='sign')) continue;
      let score=999999;
      try{
        const r=o.el.getBoundingClientRect();
        if(r&&r.width>5&&r.height>5){
          const cx=r.left+r.width/2, cy=r.top+r.height/2;
          const visible=(r.right>0&&r.left<window.innerWidth&&r.bottom>0&&r.top<window.innerHeight);
          const dx=Math.abs(cx-pcx), dy=Math.abs(cy-pcy);
          const lx=o.kind==='building'?(wide?980:620):(wide?520:320);
          const ly=o.kind==='building'?(wide?760:430):(wide?360:230);
          if(visible && dx<=lx && dy<=ly) score=Math.min(score,dx+dy*.22);
        }
      }catch(e){}
      const at=objectRouteAt31(o);
      if(Number.isFinite(at)){
        const d=Math.abs(at-routeHere);
        const lim=o.kind==='building'?(wide?1180:650):(wide?520:320);
        if(d<=lim) score=Math.min(score,d*.32+(o.kind==='building'?0:80));
      }
      if(score<999998 && (!best || score<best.score)) best={o,score};
    }
    if(!best||!best.o){ if(typeof showToast==='function') showToast('Stand by the glowing building/sign, then press Select or Enter.'); return false; }
    const o=best.o;
    if(o.kind==='building'){
      if(typeof window.openBuilding==='function') window.openBuilding(o);
      else if(typeof openBuilding==='function') openBuilding(o);
      return true;
    }
    if(typeof interactObject==='function') return !!interactObject(o);
    return false;
  };
  window.selectNearestWorldStop=window.stage31SelectNearestWorldStop;
  window.enterNearbyBuilding=function(){
    try{ if(!playing||ended||document.body.classList.contains('editMode')) return false; }catch(e){return false;}
    if(typeof nearbyBuilding!=='undefined' && nearbyBuilding && !nearbyBuilding.vanished && !nearbyBuilding.opening){
      if(typeof window.openBuilding==='function') window.openBuilding(nearbyBuilding); else openBuilding(nearbyBuilding);
      return true;
    }
    return window.stage31SelectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')});
  };
  window.enterNearbyInteractable=function(){
    try{ if(!playing||ended||document.body.classList.contains('editMode')) return false; }catch(e){return false;}
    if(typeof nearbyInteractable!=='undefined' && nearbyInteractable && !nearbyInteractable.vanished && !nearbyInteractable.hit) return interactObject(nearbyInteractable);
    return window.stage31SelectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')});
  };
  window.tapEmbeddedControl=function(action){
    try{
      if(action==='moveLeft'||action==='moveLeftStart'){keys.left=true;keys.right=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(true);if(action==='moveLeft')setTimeout(()=>{keys.left=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(false);},240);return;}
      if(action==='moveRight'||action==='moveRightStart'){keys.right=true;keys.left=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(true);if(action==='moveRight')setTimeout(()=>{keys.right=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(false);},240);return;}
      if(action==='moveStop'){keys.left=false;keys.right=false;if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(false);return;}
      if(action==='jumpOnly'){jump();return;}
      if(action==='jump'||action==='selectOrJump'){ if(window.stage31SelectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')})) return; jump(); }
    }catch(e){console.warn('stage31 control failed',e);}
  };

  // Capture Enter/Space/E in both quest views. Space selects first if a stop is close; otherwise it jumps.
  window.addEventListener('keydown',function(e){
    const inQuest=questShell();
    if(!inQuest||e.repeat) return;
    if(e.code==='ArrowLeft'||e.code==='KeyA'||e.code==='ArrowRight'||e.code==='KeyD'){
      if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(true);
      return;
    }
    if(e.code==='Enter'||e.code==='NumpadEnter'||e.code==='KeyE'){
      if(window.stage31SelectNearestWorldStop({embedded:document.body.classList.contains('tamaGameEmbedded'),expanded:document.body.classList.contains('gameExpandedFromTama')})){e.preventDefault();e.stopImmediatePropagation();}
      return;
    }
    if(e.code==='Space'){
      e.preventDefault();
      e.stopImmediatePropagation();
      try{ if(typeof jump==='function') jump(); }catch(_e){}
      return;
    }
  },true);
  window.addEventListener('keyup',function(e){
    if(e.code==='ArrowLeft'||e.code==='KeyA'||e.code==='ArrowRight'||e.code==='KeyD') setTimeout(()=>{try{if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(!!(keys.left||keys.right));}catch(_e){}},0);
  },true);

  // Click/tap anywhere on a visible building/sign in quest mode should open it, even after fullscreen scaling.
  window.addEventListener('pointerdown',function(e){
    if(!questShell()||document.body.classList.contains('editMode')) return;
    const target=e.target&&e.target.closest?e.target.closest('.building,.interactiveStop,.lessonBlock'):null;
    if(!target) return;
    try{
      const found=Array.isArray(objects)?objects.find(o=>o&&o.el===target):null;
      if(found){ if(found.kind==='building') window.openBuilding(found); else if(typeof interactObject==='function') interactObject(found); e.preventDefault(); e.stopImmediatePropagation(); }
    }catch(_e){}
  },true);

  const oldStart=window.startEmbeddedTamaGame || (typeof startEmbeddedTamaGame==='function'?startEmbeddedTamaGame:null);
  window.startEmbeddedTamaGame=function(kind){
    try{ window.stage31WarmSprites(); }catch(e){}
    if(oldStart) oldStart(kind);
    setTimeout(()=>{try{window.fitEmbeddedTamaGame();}catch(e){}},60);
    setTimeout(()=>{try{window.fitEmbeddedTamaGame();}catch(e){}},260);
  };
  const oldExpand=window.expandEmbeddedTamaGame || (typeof expandEmbeddedTamaGame==='function'?expandEmbeddedTamaGame:null);
  window.expandEmbeddedTamaGame=function(){
    try{ window.stage31WarmSprites(); }catch(e){}
    if(oldExpand) oldExpand();
    document.body.classList.add('gameExpandedFromTama');
    document.body.classList.remove('tamaGameEmbedded');
    try{ if(typeof paused!=='undefined') paused=false; if(typeof playing!=='undefined') playing=true; }catch(e){}
    setTimeout(()=>{try{window.fitGameToScreen();}catch(e){}},30);
    setTimeout(()=>{try{window.fitGameToScreen();}catch(e){}},220);
  };
  window.addEventListener('resize',()=>{setTimeout(()=>{try{questShell()?window.fitEmbeddedTamaGame():window.fitGameToScreen();}catch(e){}},40);});
  setTimeout(()=>{try{window.stage31WarmSprites(); window.fitGameToScreen();}catch(e){}},120);
})();


// PETBOT TAMAGOTCHI DOCK HOOK
// Small by default in the top-right. Fullscreen now has a real Back button outside the iframe.
(function(){
  function byId(id){ return document.getElementById(id); }
  const dock = byId('petbotDock');
  const frame = byId('petbotDockFrame');
  const expandBtn = byId('petbotExpandBtn');
  const hideBtn = byId('petbotHideBtn');
  const backBtn = byId('petbotBackBtn');
  const openBtn = byId('petBtn');
  if(!dock || !frame || !expandBtn || !hideBtn) return;
  try{
    // The game canvas is transformed/scaled. A fixed element inside it can be painted
    // underneath body overlays, which caused the blank pastel screen. Keep the Tamagotchi
    // as a direct body child so it can truly cover the page.
    if(dock.parentElement !== document.body) document.body.appendChild(dock);
  }catch(e){}

  function pauseForPetbot(){
    try{ if(typeof paused !== 'undefined') paused = true; }catch(e){}
    try{ const p=byId('pauseBtn'); if(p) p.textContent='Resume'; }catch(e){}
  }
  function resumeAfterPetbot(){
    try{
      if(typeof playing !== 'undefined' && playing){
        if(typeof paused !== 'undefined') paused = false;
        const p=byId('pauseBtn'); if(p) p.textContent='Pause';
        const start=byId('startScreen'); if(start) start.classList.add('hidden');
        const q=byId('questName'); if(q) q.textContent=(typeof team !== 'undefined' && team ? 'Team Quest' : 'Solo Quest') + ' in progress';
      }else{
        const start=byId('startScreen');
        if(start && !document.body.classList.contains('tamagotchiLanding')) start.classList.remove('hidden');
      }
    }catch(e){}
  }
  function petbotFrameUrl(){
    // The iframe now asks who is playing first. Later Discord Activity can pass the real Discord user_id here.
    return 'petbot_test.html?v=141&embed=1&launch=1&choose=1';
  }
  function syncPetbotFrameUser(){
    try{
      const wanted=petbotFrameUrl();
      const current=new URL(frame.getAttribute('src') || '', location.href);
      const next=new URL(wanted, location.href);
      if(current.pathname.split('/').pop() !== next.pathname.split('/').pop() || current.searchParams.get('v') !== next.searchParams.get('v') || current.searchParams.get('choose') !== next.searchParams.get('choose')) frame.src=wanted;
    }catch(e){ frame.src=petbotFrameUrl(); }
  }
  function clearSmallDockPlacement(){
    ['left','right','top','width','height','min-width','min-height','max-width','max-height','inset'].forEach(prop=>dock.style.removeProperty(prop));
  }
  function refreshMiniPet(){
    syncPetbotFrameUser();
    try{ if(typeof updateMiniTamagotchiDock === 'function') updateMiniTamagotchiDock(); }catch(e){}
    try{ if(typeof loadPetbotPets === 'function' && !(window.loadedPets||[]).length) loadPetbotPets(false); }catch(e){}
  }
  window.openPetbotFull = function(){
    const returningFromExpanded=document.body.classList.contains('gameExpandedFromTama') || document.body.classList.contains('tamaGameEmbedded');
    document.body.classList.remove('gameExpandedFromTama');
    document.body.classList.remove('tamaGameEmbedded');
    refreshMiniPet();
    clearSmallDockPlacement();
    dock.classList.remove('hidden');
    dock.classList.add('fullscreen');
    document.body.classList.remove('editMode');
    document.body.classList.add('petbotOpen');
    expandBtn.textContent = 'Back';
    hideBtn.textContent = 'Close';
    pauseForPetbot();
    if(returningFromExpanded){
      setTimeout(()=>{try{frame.contentWindow.postMessage({type:'waa-parent-return-to-tamagotchi'},location.origin);}catch(e){}},60);
    }
  };
  window.closePetbotFull = function(){
    document.body.classList.remove('tamaGameEmbedded');
    dock.classList.remove('fullscreen');
    document.body.classList.remove('petbotOpen');
    expandBtn.textContent = 'Full';
    hideBtn.textContent = 'Hide';
    resumeAfterPetbot();
    requestAnimationFrame(()=>{ try{ fitGameToScreen(); }catch(e){} });
  };
  window.startTamagotchiLaunch = function(){
    const start=byId('startScreen');
    if(start) start.classList.add('hidden');
    document.body.classList.add('tamagotchiLanding');
    document.body.classList.add('petbotOpen');
    window.openPetbotFull();
  };
  window.togglePetbotDock = function(){
    if(dock.classList.contains('hidden')) dock.classList.remove('hidden');
    else window.openPetbotFull();
  };

  function backClick(e){
    if(e){ e.preventDefault(); e.stopPropagation(); }
    window.closePetbotFull();
  }
  expandBtn.addEventListener('click', backClick);
  hideBtn.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    if(dock.classList.contains('fullscreen')) window.closePetbotFull();
    else dock.classList.add('hidden');
  });
  if(backBtn){
    backBtn.addEventListener('click', backClick);
    backBtn.addEventListener('touchend', backClick, {passive:false});
  }
  dock.addEventListener('click', function(e){
    if(e.target.closest('.petbotDockBtn')) return;
    if(!dock.classList.contains('fullscreen')) window.openPetbotFull();
  });
  refreshMiniPet();
  setTimeout(()=>{ try{ window.startTamagotchiLaunch(); }catch(e){} }, 80);
  if(openBtn){
    openBtn.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      window.openPetbotFull();
    });
  }
  window.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && dock.classList.contains('fullscreen')) window.closePetbotFull();
  });
})();


// STAGE 33: stable Tamagotchi quest viewport + CSS fullscreen mode reset.
// This patch stops the Tamagotchi quest from clipping/scaling the whole game with clip-path.
// Instead it puts the game inside a real LCD viewport with overflow hidden, which is much lighter.
(function(){
  const d=document;
  const body=d.body;
  const DESIGN_W33=(typeof DESIGN_W!=='undefined'?DESIGN_W:1920);
  const DESIGN_H33=(typeof DESIGN_H!=='undefined'?DESIGN_H:1080);
  const game=d.getElementById('game');
  if(!game) return;
  const originalParent=game.parentNode;
  const originalNext=game.nextSibling;
  let mask=null;
  let tamaFitTimer=0;
  const previousFitGameToScreen = (typeof fitGameToScreen==='function') ? fitGameToScreen : null;

  function setImp(el,prop,val){ if(el) el.style.setProperty(prop,val,'important'); }
  function num(v,fb){ const n=Number(v); return Number.isFinite(n)?n:fb; }
  function q(id){ return d.getElementById(id); }
  function questShell(){ return body.classList.contains('tamaGameEmbedded') || body.classList.contains('gameExpandedFromTama'); }
  function stopMove(){ try{keys.left=false;keys.right=false;}catch(e){} try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(false); }catch(e){} }

  const st=d.createElement('style');
  st.textContent=`
    #tamaGameMask33{position:fixed;z-index:2147482999;overflow:hidden;background:#79d9ff;border-radius:18px;box-shadow:inset 0 0 0 2px rgba(16,25,48,.30);contain:layout paint size;transform:translateZ(0);pointer-events:none;display:none;}
    body.petbotOpen.tamaGameEmbedded #tamaGameMask33{display:block!important;}
    body.petbotOpen.tamaGameEmbedded #tamaGameMask33 #game{visibility:visible!important;opacity:1!important;display:block!important;position:absolute!important;left:0!important;top:0!important;width:${DESIGN_W33}px!important;height:${DESIGN_H33}px!important;min-width:${DESIGN_W33}px!important;min-height:${DESIGN_H33}px!important;max-width:none!important;max-height:none!important;clip-path:none!important;-webkit-clip-path:none!important;border-radius:0!important;box-shadow:none!important;z-index:1!important;pointer-events:none!important;will-change:transform;contain:layout paint style;}
    body.tamaLiteRender33 .hud,body.tamaLiteRender33 .instructions,body.tamaLiteRender33 .touch,body.tamaLiteRender33 .helpBtn,body.tamaLiteRender33 .builder,body.tamaLiteRender33 .overlay,body.tamaLiteRender33 #startScreen{display:none!important;}
    body.tamaLiteRender33 .character img,body.tamaLiteRender33 .building img,body.tamaLiteRender33 .obj img{filter:none!important;}
    body.tamaLiteRender33 .building,body.tamaLiteRender33 .obj,body.tamaLiteRender33 .character{transition:none!important;backface-visibility:hidden!important;}
    body.gameExpandedFromTama #tamaGameMask33{display:none!important;}
    body.gameExpandedFromTama #game{visibility:visible!important;opacity:1!important;display:block!important;position:fixed!important;clip-path:none!important;-webkit-clip-path:none!important;border-radius:0!important;box-shadow:none!important;pointer-events:auto!important;}
  `;
  d.head.appendChild(st);

  function ensureMask(){
    if(!mask){
      mask=d.createElement('div');
      mask.id='tamaGameMask33';
      body.appendChild(mask);
    }
    return mask;
  }
  function moveGameToMask(){
    const m=ensureMask();
    if(game.parentNode!==m) m.appendChild(game);
  }
  function releaseGame(){
    if(game.parentNode===mask){
      try{ originalParent.insertBefore(game, originalNext && originalNext.parentNode===originalParent ? originalNext : null); }
      catch(e){ body.appendChild(game); }
    }
  }
  function deviceRect(){
    const vw=innerWidth||d.documentElement.clientWidth||1920;
    const vh=innerHeight||d.documentElement.clientHeight||1080;
    const deviceW=Math.min(vw*.98, vh*.99*(1024/1536));
    const deviceH=deviceW*(1536/1024);
    const deviceLeft=(vw-deviceW)/2;
    const deviceTop=(vh-deviceH)/2;
    const lcdX=.2118,lcdY=.3952,lcdW=.5724,lcdH=.2663;
    return {
      left:deviceLeft+deviceW*lcdX,
      top:deviceTop+deviceH*lcdY,
      width:deviceW*lcdW,
      height:deviceH*lcdH
    };
  }
  function playerDesignX(){
    let base=150;
    try{ if(typeof cssNumber==='function') base=cssNumber('--playerX',150); }catch(e){}
    let px=0;
    try{ px=(typeof player!=='undefined'&&player&&Number(player.x))||0; }catch(e){}
    return base+px;
  }
  function fitTamaLite(){
    if(!body.classList.contains('tamaGameEmbedded')) return;
    const m=ensureMask();
    moveGameToMask();
    const r=deviceRect();
    setImp(m,'left',r.left+'px');
    setImp(m,'top',r.top+'px');
    setImp(m,'width',r.width+'px');
    setImp(m,'height',r.height+'px');
    // Slightly wider crop reduces redraw stress and stops the sprite feeling like it is fighting the LCD edges.
    let scale=Math.max(r.width/820, r.height/500);
    scale=Math.max(.24, Math.min(.54, scale));
    const cropW=Math.min(DESIGN_W33, r.width/scale);
    const cropH=Math.min(DESIGN_H33, r.height/scale);
    const cropLeft=Math.max(0, Math.min(DESIGN_W33-cropW, playerDesignX()-210));
    const cropTop=Math.max(0, Math.min(DESIGN_H33-cropH, DESIGN_H33-cropH-52));
    setImp(game,'position','absolute');
    setImp(game,'left','0px');
    setImp(game,'top','0px');
    setImp(game,'width',DESIGN_W33+'px');
    setImp(game,'height',DESIGN_H33+'px');
    setImp(game,'transform-origin','0 0');
    setImp(game,'transform',`translate3d(${-cropLeft*scale}px, ${-cropTop*scale}px, 0) scale(${scale})`);
    setImp(game,'clip-path','none');
    setImp(game,'-webkit-clip-path','none');
    setImp(game,'visibility','visible');
    setImp(game,'display','block');
    setImp(game,'pointer-events','none');
    d.documentElement.style.setProperty('--tama-game-scale',scale.toFixed(4));
  }
  function scheduleTamaFit(){
    if(!body.classList.contains('tamaGameEmbedded')) return;
    clearTimeout(tamaFitTimer);
    tamaFitTimer=setTimeout(()=>{try{fitTamaLite();}catch(e){}},80);
  }
  function fitExpandedCss(){
    releaseGame();
    body.classList.remove('petbotOpen','tamaGameEmbedded','tamagotchiLanding','tamaLiteRender33');
    body.classList.add('gameExpandedFromTama');
    const dock=q('petbotDock'); if(dock) dock.classList.add('hidden');
    const vw=innerWidth||d.documentElement.clientWidth||DESIGN_W33;
    const vh=innerHeight||d.documentElement.clientHeight||DESIGN_H33;
    const scale=Math.max(vw/DESIGN_W33, vh/DESIGN_H33);
    const left=(vw-DESIGN_W33*scale)/2;
    const top=vh-DESIGN_H33*scale;
    try{ currentGameScale=scale; currentGameLeft=left; currentGameTop=top; }catch(e){}
    setImp(game,'position','fixed');
    setImp(game,'left','0px');
    setImp(game,'top','0px');
    setImp(game,'width',DESIGN_W33+'px');
    setImp(game,'height',DESIGN_H33+'px');
    setImp(game,'transform-origin','0 0');
    setImp(game,'transform',`translate3d(${left}px, ${top}px, 0) scale(${scale})`);
    setImp(game,'clip-path','none');
    setImp(game,'-webkit-clip-path','none');
    setImp(game,'visibility','visible');
    setImp(game,'display','block');
    setImp(game,'pointer-events','auto');
    try{ if(typeof paused!=='undefined') paused=false; if(typeof playing!=='undefined') playing=true; }catch(e){}
    try{ const start=q('startScreen'); if(start) start.classList.add('hidden'); }catch(e){}
  }

  // Much cheaper HUD updates. The old function wrote the same text every frame.
  let hudLast='';
  window.updateHud = updateHud = function(){
    let pack='';
    try{ pack=[score,lives,levelIndex,Math.floor(distance),levels[levelIndex]&&levels[levelIndex].name].join('|'); }catch(e){ pack=String(Date.now()); }
    if(pack===hudLast) return;
    hudLast=pack;
    try{ const el=q('score'); if(el) el.textContent=score; }catch(e){}
    try{ const el=q('lives'); if(el) el.textContent=lives; }catch(e){}
    try{ const el=q('level'); if(el) el.textContent=levelIndex+1; }catch(e){}
    try{ const el=q('distance'); if(el) el.textContent=Math.floor(distance); }catch(e){}
    try{ const el=q('questName'); if(el) el.textContent=levels[levelIndex].name; }catch(e){}
  };

  // In the tiny Tamagotchi LCD, changing PNG src too fast is what makes walking look stuttery.
  // Keep movement smooth by slowing only the walk-frame swap in Tamagotchi mode.
  const oldAnimateOne=(typeof animateOne==='function')?animateOne:null;
  if(oldAnimateOne){
    window.animateOne = animateOne = function(elId,char,action,now,state){
      if(body.classList.contains('tamaGameEmbedded') && action==='walk'){
        state=state||{playing:false,next:0,frame:0,last:0,action:''};
        if(state.action!==action){state.action=action;state.frame=0;state.last=0;}
        const total=(typeof getActionFrameCount==='function')?getActionFrameCount(char,action):10;
        const frameMs=185;
        if(now-(state.last||0)>frameMs){
          const frame=state.frame||0;
          try{ setSpriteFrame(elId,char,action,frame); }catch(e){}
          state.frame=(frame+1)%Math.max(1,total);
          state.last=now;
        }
        return;
      }
      return oldAnimateOne(elId,char,action,now,state);
    };
  }

  window.fitEmbeddedTamaGame = fitEmbeddedTamaGame = fitTamaLite;
  window.fitGameToScreen = fitGameToScreen = function(){
    if(body.classList.contains('tamaGameEmbedded')) return fitTamaLite();
    if(body.classList.contains('gameExpandedFromTama')) return fitExpandedCss();
    if(previousFitGameToScreen) return previousFitGameToScreen();
  };

  window.startEmbeddedTamaGame = startEmbeddedTamaGame = function(kind){
    stopMove();
    body.classList.remove('gameExpandedFromTama');
    body.classList.add('petbotOpen','tamaGameEmbedded','tamaLiteRender33');
    const dock=q('petbotDock');
    if(dock){ dock.classList.remove('hidden'); dock.classList.add('fullscreen'); }
    try{ sessionStorage.setItem('waa-game-started-this-tab','1'); }catch(e){}
    try{ if(kind==='team') startTeamQuest(); else startSoloQuest(); }catch(e){ console.error('Could not start Tamagotchi quest',e); }
    try{ if(typeof paused!=='undefined') paused=false; if(typeof playing!=='undefined') playing=true; }catch(e){}
    fitTamaLite();
    setTimeout(fitTamaLite,90);
    setTimeout(fitTamaLite,300);
  };
  window.stopEmbeddedTamaGame = stopEmbeddedTamaGame = function(){
    stopMove();
    body.classList.remove('tamaGameEmbedded','tamaLiteRender33');
    releaseGame();
    try{ if(typeof paused!=='undefined') paused=true; }catch(e){}
  };
  window.expandEmbeddedTamaGame = expandEmbeddedTamaGame = function(){
    stopMove();
    try{ if(d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(()=>{}); }catch(e){}
    fitExpandedCss();
    try{ window.focus(); body.setAttribute('tabindex','-1'); body.focus({preventScroll:true}); }catch(e){}
    try{ showToast('Full screen quest: Space jumps. Enter opens buildings.'); }catch(e){}
  };

  window.tapEmbeddedControl = tapEmbeddedControl = function(action){
    try{
      if(action==='moveLeft'||action==='moveLeftStart'){
        keys.left=true; keys.right=false;
        try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(true); }catch(e){}
        scheduleTamaFit();
        if(action==='moveLeft') setTimeout(()=>{keys.left=false;try{if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(false);}catch(e){}},220);
        return;
      }
      if(action==='moveRight'||action==='moveRightStart'){
        keys.right=true; keys.left=false;
        try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(true); }catch(e){}
        scheduleTamaFit();
        if(action==='moveRight') setTimeout(()=>{keys.right=false;try{if(typeof stage27SetMovingClass==='function')stage27SetMovingClass(false);}catch(e){}},220);
        return;
      }
      if(action==='moveStop'){ stopMove(); scheduleTamaFit(); return; }
      if(action==='jumpOnly'){ if(typeof jump==='function') jump(); return; }
      if(action==='selectOrJump'||action==='jump'){
        if(typeof window.stage31SelectNearestWorldStop==='function' && window.stage31SelectNearestWorldStop({embedded:body.classList.contains('tamaGameEmbedded'),expanded:body.classList.contains('gameExpandedFromTama')})) return;
        if(typeof window.selectNearestWorldStop==='function' && window.selectNearestWorldStop({embedded:body.classList.contains('tamaGameEmbedded'),expanded:body.classList.contains('gameExpandedFromTama')})) return;
        if(typeof jump==='function') jump();
      }
    }catch(e){ console.warn('stage33 control failed',e); }
  };

  window.handlePetbotGameAction = handlePetbotGameAction = function(action){
    if(action==='startSoloEmbedded'||action==='startPlatformEmbedded'){ startEmbeddedTamaGame('solo'); return; }
    if(action==='startTeamEmbedded'){ startEmbeddedTamaGame('team'); return; }
    if(action==='expandEmbedded'){ expandEmbeddedTamaGame(); return; }
    if(action==='stopEmbedded'){ stopEmbeddedTamaGame(); return; }
    if(['moveLeft','moveRight','moveLeftStart','moveRightStart','moveStop','jump','jumpOnly','selectOrJump'].includes(action)){ tapEmbeddedControl(action); return; }
    body.classList.remove('tamagotchiLanding','tamaGameEmbedded','tamaLiteRender33');
    releaseGame();
    if(action==='startSolo'||action==='startPlatform'){ try{ if(typeof window.closePetbotFull==='function') window.closePetbotFull(); }catch(e){} startSoloQuest(); return; }
    if(action==='startTeam'){ try{ if(typeof window.closePetbotFull==='function') window.closePetbotFull(); }catch(e){} startTeamQuest(); return; }
    if(action==='openBuilder'){ try{ if(typeof window.closePetbotFull==='function') window.closePetbotFull(); }catch(e){} const ss=q('startScreen'); if(ss) ss.classList.add('hidden'); openBuilder(); return; }
    if(action==='openOldMenu'){ try{ if(typeof window.closePetbotFull==='function') window.closePetbotFull(); }catch(e){} openMenu(); return; }
    if(action==='backToGame'){ try{ if(typeof window.closePetbotFull==='function') window.closePetbotFull(); }catch(e){} return; }
  };

  // Keep the lightweight LCD mask lined up after rotation/resize or while the browser UI changes size.
  addEventListener('resize',()=>{ if(body.classList.contains('tamaGameEmbedded')) setTimeout(fitTamaLite,60); else if(body.classList.contains('gameExpandedFromTama')) setTimeout(fitExpandedCss,60); },{passive:true});
  addEventListener('orientationchange',()=>{ setTimeout(()=>{ if(body.classList.contains('tamaGameEmbedded')) fitTamaLite(); else if(body.classList.contains('gameExpandedFromTama')) fitExpandedCss(); },220); },{passive:true});
  addEventListener('fullscreenchange',()=>{ if(body.classList.contains('tamaGameEmbedded')) setTimeout(fitTamaLite,80); else if(body.classList.contains('gameExpandedFromTama')) setTimeout(fitExpandedCss,80); });

  // If the page was already opened in Tamagotchi mode before this patch loaded, stabilise it.
  setTimeout(()=>{ try{ if(body.classList.contains('tamaGameEmbedded')) fitTamaLite(); }catch(e){} },120);
})();


// STAGE 34: final quest control/router patch.
// Fixes: keyboard walking inside Tamagotchi/fullscreen, visible LCD captions, and Back-to-Quest after opening shop/habitat/hook.
(function(){
  const d=document;
  const body=d.body;
  function q(id){return d.getElementById(id);}
  function questShell(){return body.classList.contains('tamaGameEmbedded') || body.classList.contains('gameExpandedFromTama');}
  function stopMove(){
    try{keys.left=false;keys.right=false;}catch(e){}
    try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(false); }catch(e){}
  }
  function visibleCaption(msg,ms){
    msg=String(msg||'');
    try{ if(typeof stage27ShowCaption==='function') stage27ShowCaption(msg,ms||2200); }catch(e){}
    try{ if(typeof showToast==='function') showToast(msg); }catch(e){}
  }
  function placeToScreen(place){
    place=String(place||'');
    if(place==='petShop') return 'shop';
    if(place==='habitat') return 'habitat';
    if(place==='hookWaaambulance') return 'hook';
    if(place==='questStarter') return 'games';
    if(place==='welcomeBoard') return 'welcomeBoard';
    return 'petActions';
  }
  function postToPetbot(msg){
    const frame=q('petbotDockFrame')||q('petbotFrame');
    [80,220,520,900,1400].forEach(ms=>setTimeout(()=>{
      try{ frame && frame.contentWindow && frame.contentWindow.postMessage(msg, location.origin); }catch(e){}
    },ms));
  }
  function rememberQuestReturn(){
    const mode=body.classList.contains('gameExpandedFromTama')?'expanded':'embedded';
    window.waaQuestReturnMode=mode;
    try{sessionStorage.setItem('waaQuestReturnMode',mode);}catch(e){}
    return mode;
  }
  function resumeQuest(mode){
    mode=mode||window.waaQuestReturnMode;
    try{mode=mode||sessionStorage.getItem('waaQuestReturnMode')||'embedded';}catch(e){mode=mode||'embedded';}
    stopMove();
    const dock=q('petbotDock');
    const start=q('startScreen');
    try{ if(start) start.classList.add('hidden'); }catch(e){}
    try{ if(typeof playing!=='undefined') playing=true; if(typeof paused!=='undefined') paused=false; }catch(e){}
    body.classList.remove('tamagotchiLanding');
    if(mode==='expanded'){
      body.classList.remove('petbotOpen','tamaGameEmbedded','tamaLiteRender33');
      body.classList.add('gameExpandedFromTama');
      if(dock) dock.classList.add('hidden');
      setTimeout(()=>{try{ if(typeof fitGameToScreen==='function') fitGameToScreen(); }catch(e){}},30);
      setTimeout(()=>{try{ if(typeof fitGameToScreen==='function') fitGameToScreen(); }catch(e){}},220);
    }else{
      body.classList.remove('gameExpandedFromTama');
      body.classList.add('petbotOpen','tamaGameEmbedded','tamaLiteRender33');
      if(dock){ dock.classList.remove('hidden'); dock.classList.add('fullscreen'); }
      setTimeout(()=>{try{ if(typeof fitEmbeddedTamaGame==='function') fitEmbeddedTamaGame(); }catch(e){}},30);
      setTimeout(()=>{try{ if(typeof fitEmbeddedTamaGame==='function') fitEmbeddedTamaGame(); }catch(e){}},220);
    }
    visibleCaption('Back to quest',1600);
    try{ window.focus(); body.setAttribute('tabindex','-1'); body.focus({preventScroll:true}); }catch(e){}
  }
  window.waaResumeQuestFromPetbot=resumeQuest;

  // Keep the text caption aligned to the actual LCD mask used by Stage 33.
  const oldFitEmbedded=(typeof window.fitEmbeddedTamaGame==='function')?window.fitEmbeddedTamaGame:null;
  window.fitEmbeddedTamaGame=fitEmbeddedTamaGame=function(){
    if(oldFitEmbedded) oldFitEmbedded();
    try{
      const mask=q('tamaGameMask33');
      if(mask && body.classList.contains('tamaGameEmbedded')){
        const r=mask.getBoundingClientRect();
        d.documentElement.style.setProperty('--tama-lcd-left',r.left+'px');
        d.documentElement.style.setProperty('--tama-lcd-top',r.top+'px');
        d.documentElement.style.setProperty('--tama-lcd-w',r.width+'px');
        d.documentElement.style.setProperty('--tama-lcd-h',r.height+'px');
      }
    }catch(e){}
  };

  // Replace quest building opening with a proper "open PetBot screen, then allow Back to Quest" route.
  const oldOpenBuilding=(typeof window.openBuilding==='function')?window.openBuilding:null;
  window.openBuilding=openBuilding=function(o){
    if(o && o.kind==='building' && questShell()){
      const returnMode=rememberQuestReturn();
      stopMove();
      const screen=placeToScreen(o.place);
      const label=o.label||o.place||'Building';
      try{ body.classList.remove('tamaGameEmbedded','gameExpandedFromTama','tamaLiteRender33'); }catch(e){}
      try{ if(typeof window.openPetbotFull==='function') window.openPetbotFull(); }catch(e){}
      try{ if(typeof paused!=='undefined') paused=true; }catch(e){}
      try{localStorage.setItem('waaPendingPetbotScreen',JSON.stringify({screen,place:o.place,label,returnToQuest:true,returnMode,t:Date.now()}));}catch(e){}
      postToPetbot({type:'waa-parent-open-screen',screen,place:o.place,label,returnToQuest:true,returnMode});
      visibleCaption(label+' opened',1600);
      return true;
    }
    return oldOpenBuilding?oldOpenBuilding(o):false;
  };

  // This handles the PetBot cross/back when it asks to return to the quest.
  const oldHandle=(typeof window.handlePetbotGameAction==='function')?window.handlePetbotGameAction:null;
  window.handlePetbotGameAction=handlePetbotGameAction=function(action){
    if(action==='returnToQuest'||action==='resumeQuest'){
      resumeQuest();
      return;
    }
    if(oldHandle) return oldHandle(action);
  };

  // Final keyboard layer for the actual page, for when focus is outside the iframe.
  // It does not make Space select buildings: Space/ArrowUp/W are jump only.
  window.addEventListener('keydown',function(e){
    if(!questShell()) return;
    const code=e.code||'';
    if(code==='ArrowLeft'||code==='KeyA'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      try{keys.left=true;keys.right=false;}catch(_e){}
      try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(true); }catch(_e){}
      return;
    }
    if(code==='ArrowRight'||code==='KeyD'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      try{keys.right=true;keys.left=false;}catch(_e){}
      try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(true); }catch(_e){}
      return;
    }
    if(code==='Space'||code==='ArrowUp'||code==='KeyW'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if(!e.repeat){ try{ if(typeof jump==='function') jump(); }catch(_e){} }
      return;
    }
    if(code==='Enter'||code==='NumpadEnter'||code==='KeyE'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      let done=false;
      try{ done=!!(typeof window.stage31SelectNearestWorldStop==='function' && window.stage31SelectNearestWorldStop({embedded:body.classList.contains('tamaGameEmbedded'),expanded:body.classList.contains('gameExpandedFromTama')})); }catch(_e){}
      if(!done){ try{ done=!!(typeof window.selectNearestWorldStop==='function' && window.selectNearestWorldStop({embedded:body.classList.contains('tamaGameEmbedded'),expanded:body.classList.contains('gameExpandedFromTama')})); }catch(_e){} }
      if(!done) visibleCaption('Stand beside the stop, then press Enter.',1700);
      return;
    }
  },true);
  window.addEventListener('keyup',function(e){
    if(!questShell()) return;
    const code=e.code||'';
    if(code==='ArrowLeft'||code==='KeyA'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      try{keys.left=false;}catch(_e){}
      try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(!!(keys.left||keys.right)); }catch(_e){}
      return;
    }
    if(code==='ArrowRight'||code==='KeyD'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      try{keys.right=false;}catch(_e){}
      try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(!!(keys.left||keys.right)); }catch(_e){}
      return;
    }
  },true);
})();


// STAGE 35: keep the Stage 34 near-working version, but fix the remaining Tamagotchi quest issues.
// - Captions are moved out of the scaled game layer so tutorial/sign text is visible inside the LCD.
// - Building opens are made one-shot so duplicate click/Enter handlers do not fight each other.
// - Parent Back/Escape returns to the quest when a shop/habitat/hook screen was opened from the quest.
(function(){
  const d=document;
  const body=d.body;
  function q(id){return d.getElementById(id);}
  function questShell(){return body.classList.contains('tamaGameEmbedded') || body.classList.contains('gameExpandedFromTama');}
  function ensureCaptionInBody(){
    let cap=q('tamaGameCaption');
    if(!cap){
      cap=d.createElement('div');
      cap.id='tamaGameCaption';
      cap.className='tamaGameCaption';
      cap.setAttribute('aria-live','polite');
    }
    if(cap.parentElement!==body) body.appendChild(cap);
    return cap;
  }
  ensureCaptionInBody();
  const oldEnsure=window.stage27EnsureCaption || (typeof stage27EnsureCaption==='function'?stage27EnsureCaption:null);
  window.stage27EnsureCaption = stage27EnsureCaption = function(){
    try{ oldEnsure&&oldEnsure(); }catch(e){}
    return ensureCaptionInBody();
  };
  const oldShow=window.stage27ShowCaption || (typeof stage27ShowCaption==='function'?stage27ShowCaption:null);
  window.stage27ShowCaption = stage27ShowCaption = function(msg,duration){
    const cap=ensureCaptionInBody();
    cap.textContent=String(msg||'');
    cap.classList.add('show');
    clearTimeout(window.__stage35CaptionTimer);
    window.__stage35CaptionTimer=setTimeout(()=>cap.classList.remove('show'),duration||2200);
    try{ oldShow&&oldShow(msg,duration||2200); }catch(e){}
  };

  function activeQuestReturnMode(){
    let mode=window.waaQuestReturnMode||'';
    try{ mode=mode||sessionStorage.getItem('waaQuestReturnMode')||''; }catch(e){}
    try{
      const raw=localStorage.getItem('waaPendingPetbotScreen');
      if(raw){
        const pack=JSON.parse(raw);
        if(pack && pack.returnToQuest && Date.now()-Number(pack.t||0)<30000) mode=pack.returnMode||mode||'embedded';
      }
    }catch(e){}
    return mode;
  }
  function clearQuestReturnFlags(){
    window.waaQuestReturnMode='';
    window.__stage35QuestReturnActive=false;
    try{sessionStorage.removeItem('waaQuestReturnMode');}catch(e){}
    try{localStorage.removeItem('waaPendingPetbotScreen');}catch(e){}
  }
  const previousResume=window.waaResumeQuestFromPetbot;
  window.waaResumeQuestFromPetbot=function(mode){
    const useMode=mode||activeQuestReturnMode()||'embedded';
    try{ if(previousResume) previousResume(useMode); }
    catch(e){ console.warn('Stage 35 quest resume failed',e); }
    setTimeout(clearQuestReturnFlags,400);
  };

  const previousOpen=window.openBuilding || (typeof openBuilding==='function'?openBuilding:null);
  window.openBuilding=openBuilding=function(o){
    if(o && o.kind==='building' && questShell()){
      if(o.__stage35Opening) return true;
      o.__stage35Opening=true;
      o.opening=true;
      window.__stage35QuestReturnActive=true;
      const mode=body.classList.contains('gameExpandedFromTama')?'expanded':'embedded';
      window.waaQuestReturnMode=mode;
      try{sessionStorage.setItem('waaQuestReturnMode',mode);}catch(e){}
      let result=true;
      try{ result=previousOpen?previousOpen(o):true; }
      finally{
        setTimeout(()=>{ try{o.opening=false;o.__stage35Opening=false;}catch(e){} },1200);
      }
      return result===undefined?true:result;
    }
    return previousOpen?previousOpen(o):false;
  };

  function returnToQuestFromOuterBack(e){
    const mode=activeQuestReturnMode();
    if(!mode || !body.classList.contains('petbotOpen')) return false;
    if(e){ e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); }
    try{ if(typeof window.waaResumeQuestFromPetbot==='function') window.waaResumeQuestFromPetbot(mode); }
    catch(err){ console.warn('Stage 35 outer back failed',err); }
    return true;
  }
  ['petbotBackBtn','petbotExpandBtn','petbotHideBtn'].forEach(id=>{
    const el=q(id);
    if(!el || el.__stage35BackBound) return;
    el.__stage35BackBound=true;
    el.addEventListener('click',returnToQuestFromOuterBack,true);
    el.addEventListener('touchend',returnToQuestFromOuterBack,{capture:true,passive:false});
  });
  window.addEventListener('keydown',function(e){
    if(e.key==='Escape') returnToQuestFromOuterBack(e);
  },true);

  const previousGameAction=window.handlePetbotGameAction;
  window.handlePetbotGameAction=handlePetbotGameAction=function(action){
    if(action==='returnToQuest'||action==='resumeQuest'){
      const mode=activeQuestReturnMode()||'embedded';
      if(typeof window.waaResumeQuestFromPetbot==='function') window.waaResumeQuestFromPetbot(mode);
      return;
    }
    if(previousGameAction) return previousGameAction(action);
  };

  // Refit once after the caption is moved to body, otherwise the LCD variables can be stale.
  setTimeout(()=>{try{ if(body.classList.contains('tamaGameEmbedded') && typeof fitEmbeddedTamaGame==='function') fitEmbeddedTamaGame(); }catch(e){}},80);
})();


// STAGE 37: return from full-screen quest back into the Tamagotchi LCD without losing the quest screen.
// Fixes: after pressing the siren/full-screen quest view, Back/Escape/Tamagotchi should re-embed the live quest in the Tamagotchi,
// not reopen Pet Home or leave the LCD blank.
(function(){
  const d=document;
  const body=d.body;
  function q(id){return d.getElementById(id);}
  function stopMove(){
    try{keys.left=false;keys.right=false;}catch(e){}
    try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(false); }catch(e){}
  }
  function ensureReturnButton(){
    let btn=q('stage37TamaReturnBtn');
    if(!btn){
      btn=d.createElement('button');
      btn.id='stage37TamaReturnBtn';
      btn.type='button';
      btn.textContent='↩ Tamagotchi';
      btn.setAttribute('aria-label','Return quest to Tamagotchi');
      body.appendChild(btn);
      btn.addEventListener('click',function(e){
        e.preventDefault(); e.stopPropagation();
        window.stage37ReturnExpandedQuestToTamagotchi();
      },true);
      btn.addEventListener('touchend',function(e){
        e.preventDefault(); e.stopPropagation();
        window.stage37ReturnExpandedQuestToTamagotchi();
      },{capture:true,passive:false});
    }
    return btn;
  }
  ensureReturnButton();
  const st=d.createElement('style');
  st.textContent=`
    #stage37TamaReturnBtn{display:none;position:fixed;left:calc(env(safe-area-inset-left) + 12px);top:calc(env(safe-area-inset-top) + 12px);z-index:2147483647;border:0;border-radius:999px;padding:10px 14px;background:linear-gradient(180deg,#ffffff,#ffe9f7);color:#24152e;font-weight:1000;font-size:14px;box-shadow:0 8px 22px rgba(0,0,0,.24);cursor:pointer;}
    body.gameExpandedFromTama #stage37TamaReturnBtn{display:block!important;}
    body.petbotOpen.tamaGameEmbedded #stage37TamaReturnBtn{display:none!important;}
  `;
  d.head.appendChild(st);

  function tellPetbotQuestScreen(){
    const frame=q('petbotDockFrame')||q('petbotFrame');
    const msg={type:'waa-parent-quest-active',mode:'Tutorial Town',embedded:true,t:Date.now()};
    [40,120,300,650,1100].forEach(ms=>setTimeout(()=>{
      try{ frame && frame.contentWindow && frame.contentWindow.postMessage(msg,location.origin); }catch(e){}
    },ms));
  }

  window.stage37ReturnExpandedQuestToTamagotchi=function(){
    if(!body.classList.contains('gameExpandedFromTama')) return false;
    stopMove();
    const dock=q('petbotDock');
    const start=q('startScreen');
    try{ if(start) start.classList.add('hidden'); }catch(e){}
    try{ if(typeof playing!=='undefined') playing=true; if(typeof paused!=='undefined') paused=false; }catch(e){}
    try{ body.classList.remove('gameExpandedFromTama','tamagotchiLanding'); }catch(e){}
    try{ body.classList.add('petbotOpen','tamaGameEmbedded','tamaLiteRender33'); }catch(e){}
    try{ if(dock){ dock.classList.remove('hidden'); dock.classList.add('fullscreen'); } }catch(e){}
    try{ sessionStorage.setItem('waaQuestReturnMode','embedded'); window.waaQuestReturnMode='embedded'; }catch(e){}
    tellPetbotQuestScreen();
    [20,90,220,500,900].forEach(ms=>setTimeout(()=>{
      try{ if(typeof window.fitEmbeddedTamaGame==='function') window.fitEmbeddedTamaGame(); }catch(e){}
    },ms));
    try{ if(typeof stage27ShowCaption==='function') stage27ShowCaption('Back inside Tamagotchi',1500); }catch(e){}
    try{ window.focus(); body.setAttribute('tabindex','-1'); body.focus({preventScroll:true}); }catch(e){}
    return true;
  };

  const previousOpenPetbotFull=window.openPetbotFull;
  window.openPetbotFull=function(){
    // When the live quest is currently expanded, this means "put the quest back in the Tamagotchi".
    // Do not use the old openPetbotFull path here because it posts waa-parent-return-to-tamagotchi,
    // which reset the iframe to Pet Home and made the quest disappear from the LCD.
    if(body.classList.contains('gameExpandedFromTama')){
      return window.stage37ReturnExpandedQuestToTamagotchi();
    }
    return previousOpenPetbotFull ? previousOpenPetbotFull.apply(this,arguments) : undefined;
  };

  window.addEventListener('keydown',function(e){
    if(!body.classList.contains('gameExpandedFromTama')) return;
    if(e.key==='Escape' || e.code==='Backspace'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      window.stage37ReturnExpandedQuestToTamagotchi();
    }
  },true);

  let sawBrowserFullscreen=false;
  window.addEventListener('fullscreenchange',function(){
    if(!body.classList.contains('gameExpandedFromTama')) return;
    if(d.fullscreenElement){ sawBrowserFullscreen=true; return; }
    if(sawBrowserFullscreen){
      sawBrowserFullscreen=false;
      setTimeout(()=>{ try{ window.stage37ReturnExpandedQuestToTamagotchi(); }catch(e){} },80);
    }
  });
})();



// STAGE 39: quest-end screen inside Tamagotchi / fullscreen quest.
// The normal level-complete overlay is hidden in Tamagotchi lite render mode, so the game looked like the character just stopped.
// This keeps the working Stage 38 flow, but shows the end-of-quest message at the TOP and lets Select/Enter/Space continue.
(function(){
  const d=document;
  const body=d.body;
  function q(id){return d.getElementById(id);}
  function questShell(){return body.classList.contains('tamaGameEmbedded') || body.classList.contains('gameExpandedFromTama');}
  function stopMove39(){
    try{keys.left=false;keys.right=false;}catch(e){}
    try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(false); }catch(e){}
  }
  function ensureStage39Box(){
    let box=q('stage39QuestEndBox');
    if(!box){
      box=d.createElement('div');
      box.id='stage39QuestEndBox';
      box.innerHTML='<div id="stage39QuestEndText"></div><button id="stage39QuestEndBtn" type="button">Next quest</button>';
      body.appendChild(box);
      const btn=q('stage39QuestEndBtn');
      if(btn){
        btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();stage39ContinueQuest();},true);
        btn.addEventListener('touchend',function(e){e.preventDefault();e.stopPropagation();stage39ContinueQuest();},{capture:true,passive:false});
      }
    }
    return box;
  }
  const st=d.createElement('style');
  st.textContent=`
    #stage39QuestEndBox{display:none;position:fixed;z-index:2147483647;box-sizing:border-box;text-align:center;pointer-events:auto;background:rgba(255,247,189,.97);color:#21142d;border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,.25), inset 0 0 0 2px rgba(255,255,255,.55);font-weight:1000;line-height:1.08;}
    #stage39QuestEndText{font-size:clamp(10px,1vw,15px);padding:6px 8px 3px;}
    #stage39QuestEndBtn{margin:0 0 6px;border:0;border-radius:999px;padding:5px 12px;background:linear-gradient(180deg,#fff,#d282c2);color:#21142d;font-weight:1000;font-size:clamp(10px,.95vw,14px);box-shadow:0 4px 10px rgba(0,0,0,.18);cursor:pointer;}
    body.petbotOpen.tamaGameEmbedded #stage39QuestEndBox.show{display:block!important;left:calc(var(--tama-lcd-left,50vw) + 10px)!important;top:calc(var(--tama-lcd-top,50dvh) + 8px)!important;width:calc(var(--tama-lcd-w,360px) - 20px)!important;max-height:calc(var(--tama-lcd-h,180px) * .42)!important;overflow:hidden!important;}
    body.gameExpandedFromTama #stage39QuestEndBox.show{display:block!important;left:50vw!important;top:calc(env(safe-area-inset-top) + 14px)!important;transform:translateX(-50%)!important;width:min(780px,88vw)!important;max-height:26vh!important;overflow:hidden!important;}
    body.petbotOpen.tamaGameEmbedded #stage39QuestEndBox.show + .tamaGameCaption.show{display:none!important;}
  `;
  d.head.appendChild(st);

  function setQuestEndBox(message,buttonText){
    const box=ensureStage39Box();
    const txt=q('stage39QuestEndText');
    const btn=q('stage39QuestEndBtn');
    if(txt) txt.textContent=message;
    if(btn) btn.textContent=buttonText||'Next quest';
    box.classList.add('show');
    try{ if(typeof stage27ShowCaption==='function') stage27ShowCaption(message+'  Press Select/Enter.',4500); }catch(e){}
  }
  function hideQuestEndBox(){
    const box=q('stage39QuestEndBox');
    if(box) box.classList.remove('show');
    const cap=q('tamaGameCaption');
    if(cap) cap.classList.remove('show');
  }
  window.stage39ContinueQuest=function(){
    if(!window.__stage39QuestWaiting) return false;
    const complete=window.__stage39QuestWaiting;
    window.__stage39QuestWaiting=null;
    hideQuestEndBox();
    stopMove39();
    try{ q('levelScreen')?.classList.add('hidden'); q('endScreen')?.classList.add('hidden'); }catch(e){}
    try{
      if(complete.final){
        score=0; lives=3; levelIndex=0; startLevel();
      }else{
        levelIndex=Math.min(levels.length-1, Number(levelIndex||0)+1);
        startLevel();
      }
      if(body.classList.contains('tamaGameEmbedded') && typeof fitEmbeddedTamaGame==='function') setTimeout(fitEmbeddedTamaGame,60);
      if(body.classList.contains('gameExpandedFromTama') && typeof fitGameToScreen==='function') setTimeout(fitGameToScreen,60);
    }catch(err){ console.warn('Stage 39 continue failed',err); }
    return true;
  };

  const oldLevelComplete=(typeof levelComplete==='function')?levelComplete:null;
  window.levelComplete=levelComplete=function(){
    stopMove39();
    try{ playing=false; }catch(e){}
    try{ objects.forEach(o=>o&&o.el&&o.el.remove()); objects=[]; }catch(e){}
    if(questShell()){
      const nextExists=Number(levelIndex||0)<levels.length-1;
      window.__stage39QuestWaiting={final:!nextExists,t:Date.now()};
      const current=(levels[levelIndex]&&levels[levelIndex].quest)||'Quest';
      const next=nextExists?((levels[levelIndex+1]&&levels[levelIndex+1].quest)||'next quest'):'Tutorial Town';
      const msg=nextExists ? ('Quest complete: '+current+'. Next: '+next+'.') : ('All test quests complete. Score: '+score+'.');
      setQuestEndBox(msg,nextExists?'Next quest':'Restart quests');
      return;
    }
    if(oldLevelComplete) return oldLevelComplete();
  };

  const oldEnd=(typeof end==='function')?end:null;
  window.end=end=function(won){
    stopMove39();
    try{ playing=false; ended=true; }catch(e){}
    if(questShell()){
      window.__stage39QuestWaiting={final:true,t:Date.now()};
      const msg=won ? ('All test quests complete. Score: '+score+'.') : ('Patrol over. Score: '+score+'.');
      setQuestEndBox(msg,'Restart quests');
      return;
    }
    if(oldEnd) return oldEnd(won);
  };

  const oldJump=(typeof jump==='function')?jump:null;
  window.jump=jump=function(){
    if(window.__stage39QuestWaiting && questShell()){
      window.stage39ContinueQuest();
      return;
    }
    if(oldJump) return oldJump.apply(this,arguments);
  };

  const oldTap=window.tapEmbeddedControl || (typeof tapEmbeddedControl==='function'?tapEmbeddedControl:null);
  window.tapEmbeddedControl=tapEmbeddedControl=function(action){
    if(window.__stage39QuestWaiting && (action==='selectOrJump'||action==='jump'||action==='jumpOnly'||action==='startSoloEmbedded'||action==='startPlatformEmbedded')){
      window.stage39ContinueQuest();
      return;
    }
    if(oldTap) return oldTap.apply(this,arguments);
  };

  const oldHandle=window.handlePetbotGameAction || (typeof handlePetbotGameAction==='function'?handlePetbotGameAction:null);
  window.handlePetbotGameAction=handlePetbotGameAction=function(action){
    if(window.__stage39QuestWaiting && ['selectOrJump','jump','jumpOnly','returnToQuest','resumeQuest','nextQuest'].includes(action)){
      window.stage39ContinueQuest();
      return;
    }
    if(oldHandle) return oldHandle.apply(this,arguments);
  };

  window.addEventListener('keydown',function(e){
    if(!window.__stage39QuestWaiting || !questShell()) return;
    if(e.code==='Enter'||e.code==='NumpadEnter'||e.code==='Space'){
      e.preventDefault(); e.stopPropagation();
      window.stage39ContinueQuest();
    }
  },true);

  window.addEventListener('resize',function(){
    if(window.__stage39QuestWaiting && body.classList.contains('tamaGameEmbedded')){
      setTimeout(()=>{try{ if(typeof fitEmbeddedTamaGame==='function') fitEmbeddedTamaGame(); }catch(e){}},60);
    }
  },{passive:true});
})();


// STAGE 40: hard fix for fullscreen -> Tamagotchi return and pacifier jump.
// The Stage 33/37 patches could leave the transparent PetBot quest LCD on top with the real
// quest not reattached to the LCD mask. This patch makes one authoritative re-embed function.
(function(){
  const d=document;
  const body=d.body;
  const DESIGN_W40=(typeof DESIGN_W!=='undefined'?DESIGN_W:1920);
  const DESIGN_H40=(typeof DESIGN_H!=='undefined'?DESIGN_H:1080);
  function q(id){return d.getElementById(id);}
  function setImp(el,prop,val){ if(el) el.style.setProperty(prop,val,'important'); }
  function stopMove40(){
    try{keys.left=false;keys.right=false;}catch(e){}
    try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(false); }catch(e){}
  }
  function ensureMask40(){
    let mask=q('tamaGameMask33');
    if(!mask){
      mask=d.createElement('div');
      mask.id='tamaGameMask33';
      body.appendChild(mask);
    }
    if(mask.parentElement!==body) body.appendChild(mask);
    return mask;
  }
  function deviceLcdRect40(){
    const vw=innerWidth||d.documentElement.clientWidth||1920;
    const vh=innerHeight||d.documentElement.clientHeight||1080;
    const deviceW=Math.min(vw*.98, vh*.99*(1024/1536));
    const deviceH=deviceW*(1536/1024);
    const deviceLeft=(vw-deviceW)/2;
    const deviceTop=(vh-deviceH)/2;
    const lcdX=.2118,lcdY=.3952,lcdW=.5724,lcdH=.2663;
    return {
      left:deviceLeft+deviceW*lcdX,
      top:deviceTop+deviceH*lcdY,
      width:deviceW*lcdW,
      height:deviceH*lcdH
    };
  }
  function playerDesignX40(){
    let base=150;
    try{ if(typeof cssNumber==='function') base=cssNumber('--playerX',150); }catch(e){}
    let px=0;
    try{ px=(typeof player!=='undefined'&&player&&Number(player.x))||0; }catch(e){}
    return base+px;
  }
  function fitQuestInTamagotchi40(){
    const game=q('game');
    if(!game) return false;
    const mask=ensureMask40();
    const dock=q('petbotDock');
    const start=q('startScreen');

    body.classList.remove('gameExpandedFromTama','tamagotchiLanding');
    body.classList.add('petbotOpen','tamaGameEmbedded','tamaLiteRender33');
    if(start) start.classList.add('hidden');
    if(dock){ dock.classList.remove('hidden'); dock.classList.add('fullscreen'); }

    if(game.parentElement!==mask) mask.appendChild(game);

    const r=deviceLcdRect40();
    setImp(mask,'position','fixed');
    setImp(mask,'left',r.left+'px');
    setImp(mask,'top',r.top+'px');
    setImp(mask,'width',r.width+'px');
    setImp(mask,'height',r.height+'px');
    setImp(mask,'display','block');
    setImp(mask,'overflow','hidden');
    setImp(mask,'z-index','2147483646');
    setImp(mask,'pointer-events','none');
    setImp(mask,'background','#79d9ff');
    setImp(mask,'border-radius','18px');
    setImp(mask,'contain','layout paint size');
    setImp(mask,'transform','translateZ(0)');

    let scale=Math.max(r.width/820, r.height/500);
    scale=Math.max(.24, Math.min(.54, scale));
    const cropW=Math.min(DESIGN_W40, r.width/scale);
    const cropH=Math.min(DESIGN_H40, r.height/scale);
    const cropLeft=Math.max(0, Math.min(DESIGN_W40-cropW, playerDesignX40()-210));
    const cropTop=Math.max(0, Math.min(DESIGN_H40-cropH, DESIGN_H40-cropH-52));

    setImp(game,'position','absolute');
    setImp(game,'left','0px');
    setImp(game,'top','0px');
    setImp(game,'width',DESIGN_W40+'px');
    setImp(game,'height',DESIGN_H40+'px');
    setImp(game,'min-width',DESIGN_W40+'px');
    setImp(game,'min-height',DESIGN_H40+'px');
    setImp(game,'max-width','none');
    setImp(game,'max-height','none');
    setImp(game,'transform-origin','0 0');
    setImp(game,'transform',`translate3d(${-cropLeft*scale}px, ${-cropTop*scale}px, 0) scale(${scale})`);
    setImp(game,'clip-path','none');
    setImp(game,'-webkit-clip-path','none');
    setImp(game,'visibility','visible');
    setImp(game,'opacity','1');
    setImp(game,'display','block');
    setImp(game,'pointer-events','none');

    d.documentElement.style.setProperty('--tama-game-scale',scale.toFixed(4));
    d.documentElement.style.setProperty('--tama-lcd-left',r.left+'px');
    d.documentElement.style.setProperty('--tama-lcd-top',r.top+'px');
    d.documentElement.style.setProperty('--tama-lcd-w',r.width+'px');
    d.documentElement.style.setProperty('--tama-lcd-h',r.height+'px');

    try{ if(typeof playing!=='undefined') playing=true; if(typeof paused!=='undefined') paused=false; }catch(e){}
    return true;
  }
  function tellPetbotQuest40(){
    const frame=q('petbotDockFrame')||q('petbotFrame');
    const msgs=[
      {type:'waa-parent-quest-active',mode:'Tutorial Town',embedded:true,keepQuest:true,t:Date.now()},
      {type:'waa-parent-return-to-tamagotchi',keepQuest:true,t:Date.now()}
    ];
    [30,100,220,460,900,1400].forEach(ms=>setTimeout(()=>{
      for(const msg of msgs){
        try{ frame && frame.contentWindow && frame.contentWindow.postMessage(msg,location.origin); }catch(e){}
      }
    },ms));
  }
  window.stage40FitQuestInTamagotchi=fitQuestInTamagotchi40;
  window.stage40ReturnQuestToTamagotchi=function(){
    stopMove40();
    fitQuestInTamagotchi40();
    tellPetbotQuest40();
    [40,140,300,700,1200].forEach(ms=>setTimeout(()=>{try{fitQuestInTamagotchi40();}catch(e){}},ms));
    try{ if(typeof stage27ShowCaption==='function') stage27ShowCaption('Back inside Tamagotchi',1500); }catch(e){}
    try{ window.focus(); body.setAttribute('tabindex','-1'); body.focus({preventScroll:true}); }catch(e){}
    return true;
  };

  const oldFitEmbedded40=window.fitEmbeddedTamaGame || (typeof fitEmbeddedTamaGame==='function'?fitEmbeddedTamaGame:null);
  window.fitEmbeddedTamaGame=fitEmbeddedTamaGame=function(){
    if(body.classList.contains('tamaGameEmbedded')) return fitQuestInTamagotchi40();
    if(oldFitEmbedded40) return oldFitEmbedded40.apply(this,arguments);
  };

  const oldStartEmbedded40=window.startEmbeddedTamaGame || (typeof startEmbeddedTamaGame==='function'?startEmbeddedTamaGame:null);
  window.startEmbeddedTamaGame=startEmbeddedTamaGame=function(kind){
    stopMove40();
    if(oldStartEmbedded40) oldStartEmbedded40(kind);
    else { try{ if(kind==='team') startTeamQuest(); else startSoloQuest(); }catch(e){} }
    body.classList.add('petbotOpen','tamaGameEmbedded','tamaLiteRender33');
    body.classList.remove('gameExpandedFromTama');
    tellPetbotQuest40();
    [30,120,320,800].forEach(ms=>setTimeout(()=>{try{fitQuestInTamagotchi40();}catch(e){}},ms));
  };

  const oldReturn37=window.stage37ReturnExpandedQuestToTamagotchi;
  window.stage37ReturnExpandedQuestToTamagotchi=function(){
    return window.stage40ReturnQuestToTamagotchi() || (oldReturn37?oldReturn37():false);
  };

  const oldResumeQuest40=window.waaResumeQuestFromPetbot;
  window.waaResumeQuestFromPetbot=function(mode){
    if((mode||'embedded')==='embedded') return window.stage40ReturnQuestToTamagotchi();
    if(oldResumeQuest40) return oldResumeQuest40(mode);
  };

  const oldOpenPetbotFull40=window.openPetbotFull;
  window.openPetbotFull=function(){
    if(body.classList.contains('gameExpandedFromTama') || body.classList.contains('tamaGameEmbedded')){
      return window.stage40ReturnQuestToTamagotchi();
    }
    return oldOpenPetbotFull40 ? oldOpenPetbotFull40.apply(this,arguments) : undefined;
  };

  const oldTap40=window.tapEmbeddedControl || (typeof tapEmbeddedControl==='function'?tapEmbeddedControl:null);
  window.tapEmbeddedControl=tapEmbeddedControl=function(action){
    // Pacifier / jump button is jump only. It should not be stolen by the nearest-stop selector.
    if(action==='jumpOnly'){
      try{ if(typeof jump==='function') jump(); }catch(e){}
      return;
    }
    if(oldTap40) return oldTap40.apply(this,arguments);
  };

  const oldHandle40=window.handlePetbotGameAction || (typeof handlePetbotGameAction==='function'?handlePetbotGameAction:null);
  window.handlePetbotGameAction=handlePetbotGameAction=function(action){
    if(action==='jumpOnly'){
      try{ if(typeof jump==='function') jump(); }catch(e){}
      return;
    }
    if(action==='backToTamagotchi'||action==='returnQuestToTamagotchi'){
      window.stage40ReturnQuestToTamagotchi();
      return;
    }
    if(oldHandle40) return oldHandle40.apply(this,arguments);
  };

  const st=d.createElement('style');
  st.textContent=`
    body.petbotOpen.tamaGameEmbedded #tamaGameMask33{display:block!important;z-index:2147483646!important;pointer-events:none!important;}
    body.petbotOpen.tamaGameEmbedded #petbotDock{z-index:10000!important;}
    body.petbotOpen.tamaGameEmbedded #petbotDockFrame{background:transparent!important;}
    body.gameExpandedFromTama #tamaGameMask33{display:none!important;}
  `;
  d.head.appendChild(st);

  window.addEventListener('keydown',function(e){
    if(!body.classList.contains('gameExpandedFromTama')) return;
    if(e.key==='Escape'||e.code==='Backspace'){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      window.stage40ReturnQuestToTamagotchi();
    }
  },true);
  window.addEventListener('fullscreenchange',function(){
    if(body.classList.contains('gameExpandedFromTama') && !d.fullscreenElement){
      setTimeout(()=>{try{window.stage40ReturnQuestToTamagotchi();}catch(e){}},90);
    }
  });
  window.addEventListener('resize',function(){
    if(body.classList.contains('tamaGameEmbedded')) setTimeout(()=>{try{fitQuestInTamagotchi40();}catch(e){}},70);
  },{passive:true});
})();


// STAGE 41: authoritative fullscreen return + real pacifier jump.
(function(){
  const d=document, body=d.body;
  const DESIGN_W41=(typeof DESIGN_W!=='undefined'?DESIGN_W:1920);
  const DESIGN_H41=(typeof DESIGN_H!=='undefined'?DESIGN_H:1080);
  let returning41=false;
  function q(id){return d.getElementById(id);}
  function setImp(el,prop,val){ if(el) el.style.setProperty(prop,val,'important'); }
  function stopMove41(){try{keys.left=false;keys.right=false;}catch(e){} try{ if(typeof stage27SetMovingClass==='function') stage27SetMovingClass(false); }catch(e){}}
  function deviceLcdRect41(){
    const vw=innerWidth||d.documentElement.clientWidth||1920, vh=innerHeight||d.documentElement.clientHeight||1080;
    const deviceW=Math.min(vw*.98, vh*.99*(1024/1536)), deviceH=deviceW*(1536/1024);
    const deviceLeft=(vw-deviceW)/2, deviceTop=(vh-deviceH)/2;
    const lcdX=.2118,lcdY=.3952,lcdW=.5724,lcdH=.2663;
    return {left:deviceLeft+deviceW*lcdX,top:deviceTop+deviceH*lcdY,width:deviceW*lcdW,height:deviceH*lcdH};
  }
  function playerDesignX41(){
    let base=150, px=0;
    try{ if(typeof cssNumber==='function') base=cssNumber('--playerX',150); }catch(e){}
    try{ px=(typeof player!=='undefined'&&player&&Number(player.x))||0; }catch(e){}
    return base+px;
  }
  function ensureMask41(){
    let mask=q('tamaGameMask33');
    if(!mask){ mask=d.createElement('div'); mask.id='tamaGameMask33'; }
    const dock=q('petbotDock');
    if(dock && mask.parentElement!==dock) dock.appendChild(mask);
    else if(!dock && mask.parentElement!==body) body.appendChild(mask);
    return mask;
  }
  function tellPetbotQuest41(){
    const frame=q('petbotDockFrame')||q('petbotFrame');
    const msgs=[
      {type:'waa-parent-quest-active',mode:'Tutorial Town',embedded:true,keepQuest:true,stage:41,t:Date.now()},
      {type:'waa-parent-return-to-tamagotchi',keepQuest:true,stage:41,t:Date.now()}
    ];
    [0,60,160,360,760,1300].forEach(ms=>setTimeout(()=>{for(const msg of msgs){try{ frame&&frame.contentWindow&&frame.contentWindow.postMessage(msg,location.origin); }catch(e){}}},ms));
  }
  function fitQuestInTamagotchi41(){
    const game=q('game'); if(!game) return false;
    const dock=q('petbotDock'), start=q('startScreen'), mask=ensureMask41();
    body.classList.remove('gameExpandedFromTama','tamagotchiLanding');
    body.classList.add('petbotOpen','tamaGameEmbedded','tamaLiteRender33');
    if(start) start.classList.add('hidden');
    if(dock){
      dock.classList.remove('hidden'); dock.classList.add('fullscreen');
      setImp(dock,'z-index','10000'); setImp(dock,'position','fixed'); setImp(dock,'inset','0');
      setImp(dock,'width','100vw'); setImp(dock,'height','100dvh'); setImp(dock,'display','grid'); setImp(dock,'place-items','center');
    }
    if(game.parentElement!==mask) mask.appendChild(game);
    const r=deviceLcdRect41();
    setImp(mask,'position','absolute'); setImp(mask,'left',r.left+'px'); setImp(mask,'top',r.top+'px');
    setImp(mask,'width',r.width+'px'); setImp(mask,'height',r.height+'px'); setImp(mask,'display','block');
    setImp(mask,'visibility','visible'); setImp(mask,'opacity','1'); setImp(mask,'overflow','hidden'); setImp(mask,'z-index','50');
    setImp(mask,'pointer-events','none'); setImp(mask,'background','#79d9ff'); setImp(mask,'border-radius','18px'); setImp(mask,'contain','layout paint size');
    setImp(mask,'transform','translateZ(0)'); setImp(mask,'box-shadow','inset 0 0 0 2px rgba(16,25,48,.22)');
    let scale=Math.max(r.width/820, r.height/500); scale=Math.max(.24, Math.min(.54, scale));
    const cropW=Math.min(DESIGN_W41, r.width/scale), cropH=Math.min(DESIGN_H41, r.height/scale);
    const cropLeft=Math.max(0, Math.min(DESIGN_W41-cropW, playerDesignX41()-210));
    const cropTop=Math.max(0, Math.min(DESIGN_H41-cropH, DESIGN_H41-cropH-52));
    setImp(game,'position','absolute'); setImp(game,'left','0px'); setImp(game,'top','0px');
    setImp(game,'width',DESIGN_W41+'px'); setImp(game,'height',DESIGN_H41+'px');
    setImp(game,'min-width',DESIGN_W41+'px'); setImp(game,'min-height',DESIGN_H41+'px'); setImp(game,'max-width','none'); setImp(game,'max-height','none');
    setImp(game,'transform-origin','0 0'); setImp(game,'transform',`translate3d(${-cropLeft*scale}px, ${-cropTop*scale}px, 0) scale(${scale})`);
    setImp(game,'clip-path','none'); setImp(game,'-webkit-clip-path','none'); setImp(game,'visibility','visible'); setImp(game,'opacity','1'); setImp(game,'display','block'); setImp(game,'pointer-events','none');
    d.documentElement.style.setProperty('--tama-game-scale',scale.toFixed(4));
    d.documentElement.style.setProperty('--tama-lcd-left',r.left+'px'); d.documentElement.style.setProperty('--tama-lcd-top',r.top+'px');
    d.documentElement.style.setProperty('--tama-lcd-w',r.width+'px'); d.documentElement.style.setProperty('--tama-lcd-h',r.height+'px');
    try{ if(typeof playing!=='undefined') playing=true; if(typeof paused!=='undefined') paused=false; }catch(e){}
    return true;
  }
  window.stage41FitQuestInTamagotchi=fitQuestInTamagotchi41;
  window.stage41ReturnQuestToTamagotchi=function(){
    if(returning41) return true;
    returning41=true; stopMove41();
    try{ if(d.fullscreenElement && d.exitFullscreen){ const p=d.exitFullscreen(); if(p&&p.catch)p.catch(()=>{}); } }catch(e){}
    fitQuestInTamagotchi41(); tellPetbotQuest41();
    [40,120,260,520,900,1400].forEach(ms=>setTimeout(()=>{try{fitQuestInTamagotchi41();tellPetbotQuest41();}catch(e){}},ms));
    setTimeout(()=>{returning41=false;},650);
    try{ if(typeof stage27ShowCaption==='function') stage27ShowCaption('Back inside Tamagotchi',1400); }catch(e){}
    try{ window.focus(); body.setAttribute('tabindex','-1'); body.focus({preventScroll:true}); }catch(e){}
    return true;
  };
  const oldFitEmbedded41=window.fitEmbeddedTamaGame || (typeof fitEmbeddedTamaGame==='function'?fitEmbeddedTamaGame:null);
  window.fitEmbeddedTamaGame=fitEmbeddedTamaGame=function(){ if(body.classList.contains('tamaGameEmbedded')) return fitQuestInTamagotchi41(); if(oldFitEmbedded41) return oldFitEmbedded41.apply(this,arguments); };
  const oldOpenPetbotFull41=window.openPetbotFull;
  window.openPetbotFull=function(){ if(body.classList.contains('gameExpandedFromTama') || body.classList.contains('tamaGameEmbedded')) return window.stage41ReturnQuestToTamagotchi(); return oldOpenPetbotFull41 ? oldOpenPetbotFull41.apply(this,arguments) : undefined; };
  const oldReturn37_41=window.stage37ReturnExpandedQuestToTamagotchi;
  window.stage37ReturnExpandedQuestToTamagotchi=function(){ return window.stage41ReturnQuestToTamagotchi() || (oldReturn37_41?oldReturn37_41():false); };
  const oldReturn40_41=window.stage40ReturnQuestToTamagotchi;
  window.stage40ReturnQuestToTamagotchi=function(){ return window.stage41ReturnQuestToTamagotchi() || (oldReturn40_41?oldReturn40_41():false); };
  const oldResumeQuest41=window.waaResumeQuestFromPetbot;
  window.waaResumeQuestFromPetbot=function(mode){ if((mode||'embedded')==='embedded') return window.stage41ReturnQuestToTamagotchi(); if(oldResumeQuest41) return oldResumeQuest41(mode); };
  function ensureReturnButton41(){
    let btn=q('stage41TamaReturnBtn');
    if(!btn){
      btn=d.createElement('button'); btn.id='stage41TamaReturnBtn'; btn.type='button'; btn.textContent='↩ Back to Tamagotchi'; body.appendChild(btn);
      const go=e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.stage41ReturnQuestToTamagotchi();};
      btn.addEventListener('pointerdown',go,{capture:true}); btn.addEventListener('click',go,{capture:true}); btn.addEventListener('touchend',go,{capture:true,passive:false});
    }
  }
  ensureReturnButton41();
  const st=d.createElement('style');
  st.textContent=`
    #stage41TamaReturnBtn{display:none;position:fixed;right:calc(env(safe-area-inset-right) + 14px);top:calc(env(safe-area-inset-top) + 48px);z-index:2147483647;border:0;border-radius:999px;padding:12px 16px;background:linear-gradient(180deg,#ffffff,#ffe5f6);color:#24152e;font-weight:1000;font-size:15px;box-shadow:0 8px 26px rgba(0,0,0,.26);cursor:pointer;}
    body.gameExpandedFromTama #stage41TamaReturnBtn{display:block!important;}
    body.petbotOpen.tamaGameEmbedded #stage41TamaReturnBtn{display:none!important;}
    body.petbotOpen.tamaGameEmbedded #petbotDock{z-index:10000!important;}
    body.petbotOpen.tamaGameEmbedded #petbotDockFrame{z-index:1!important;background:transparent!important;}
    body.petbotOpen.tamaGameEmbedded #petbotDock #tamaGameMask33{display:block!important;z-index:50!important;}
    body.gameExpandedFromTama #tamaGameMask33{display:none!important;}
  `;
  d.head.appendChild(st);
  const oldTap41=window.tapEmbeddedControl || (typeof tapEmbeddedControl==='function'?tapEmbeddedControl:null);
  window.tapEmbeddedControl=tapEmbeddedControl=function(action){
    if(action==='jumpOnly'||action==='selectOrJump'||action==='jump'){ try{ if(typeof jump==='function') jump(); }catch(e){} return; }
    if(oldTap41) return oldTap41.apply(this,arguments);
  };
  const oldHandle41=window.handlePetbotGameAction || (typeof handlePetbotGameAction==='function'?handlePetbotGameAction:null);
  window.handlePetbotGameAction=handlePetbotGameAction=function(action){
    if(action==='backToTamagotchi'||action==='returnQuestToTamagotchi'){ window.stage41ReturnQuestToTamagotchi(); return; }
    if(action==='jumpOnly'||action==='selectOrJump'||action==='jump'){ try{ if(typeof jump==='function') jump(); }catch(e){} return; }
    if(oldHandle41) return oldHandle41.apply(this,arguments);
  };
  window.addEventListener('keydown',function(e){
    if(!body.classList.contains('gameExpandedFromTama')) return;
    if(e.key==='Escape'||e.code==='Backspace'||e.code==='KeyT'){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); window.stage41ReturnQuestToTamagotchi(); }
  },true);
  window.addEventListener('fullscreenchange',function(){ if(body.classList.contains('gameExpandedFromTama') && !d.fullscreenElement) setTimeout(()=>{try{window.stage41ReturnQuestToTamagotchi();}catch(e){}},80); });
  window.addEventListener('resize',function(){ if(body.classList.contains('tamaGameEmbedded')) setTimeout(()=>{try{fitQuestInTamagotchi41();}catch(e){}},60); },{passive:true});
})();

