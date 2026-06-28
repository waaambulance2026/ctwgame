
(function(){
'use strict';
const SPREADSHEET_ID='1A-Uzz8q32PdNOcTXLwpPLT-9RAmCc3ZtYL-LdRU8avA';
const CLOUD='https://res.cloudinary.com/dpwlfmhia/image/upload/';
const PLAYER_LIST=[
  {key:'ax',label:'Ax',display:"Ryan's Axolotl",userId:'1214671839205396481',password:'Axtok'},
  {key:'aly',label:'Aly',display:'Ashely with one L',userId:'1407957358683885670',password:'Alytok'},
  {key:'test',label:'Test',display:'Safe test mode',userId:'test',password:'',test:true}
];
const TEST_PETS=[
  {name:'Test Raven',pet:'raven',category:'birds',code:'test_raven_1',level:3,xp:240,hunger:80,happiness:70,energy:75,health:90,emoji:'🐦‍⬛'},
  {name:'Test Owl',pet:'owl',category:'birds',code:'test_owl_1',level:2,xp:120,hunger:90,happiness:75,energy:68,health:100,emoji:'🦉'},
  {name:'Test Dragon',pet:'dragon',category:'mythical',code:'test_dragon_1',level:5,xp:600,hunger:65,happiness:90,energy:60,health:88,emoji:'🐉'}
];
const MENU=[
  {key:'pets',label:'Pets',icon:'🐾'},
  {key:'games',label:'Games',icon:'🎮'},
  {key:'shop',label:'Shop',icon:'🛍️'},
  {key:'inventory',label:'Inventory',icon:'🎒'},
  {key:'habitat',label:'Habitat',icon:'🏡'},
  {key:'hook',label:'Hook-a-Waa',icon:'🎣'}
];
const GAME_MENU=[
  {key:'solo',label:'Solo Quest',icon:'🚑',action:'questSolo'},
  {key:'team',label:'Team Quest',icon:'👥',action:'questTeam'},
  {key:'platform',label:'Open Platform Game',icon:'🎮',action:'questPlatform'},
  {key:'back',label:'Back',icon:'↩️',action:'back'}
];
const $=id=>document.getElementById(id);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const clean=s=>String(s??'').trim();
function n(v,f=0){const x=Number(String(v??'').replace(/,/g,''));return Number.isFinite(x)?x:f;}
function bar(v){return clamp(Math.round(n(v,0)),0,100)+'%';}
let state={screen:'login',loginIndex:0,password:'',error:'',player:null,pets:[],petIndex:0,menuIndex:0,gameIndex:0,panelKind:'',panelLoading:false,panelItems:[],panelIndex:0,panelActionMsg:'',panelMessage:'',message:'Choose player',loading:false,lastError:'',quest:{mode:'Solo Quest',x:42,jump:false,score:0,started:false,embedded:false},hookPrize:null,hookCasting:false,shopStep:'pet',shopPetIndex:0,shopQty:1,shopSelected:null};
let touchStart=null;
function log(msg,obj){console.log('[TamaStable]',msg,obj||'');}
function top(title,right=''){return `<div class="top"><span>${state.player?esc(state.player.label):'CTW'}</span><span>${esc(title)}</span><span>${esc(right)}</span></div>`;}
function render(){
  const lcd=$('lcd');
  if(!lcd)return;
  lcd.classList.toggle('gameLcd', state.screen==='questGame');
  document.body.classList.toggle('questPlaying', state.screen==='questGame');
  document.documentElement.classList.toggle('questPlaying', state.screen==='questGame');
  let html='';
  if(state.screen==='login') html=renderLogin();
  else if(state.screen==='password') html=renderPassword();
  else if(state.screen==='loading') html=renderLoading();
  else if(state.screen==='pet') html=renderPet();
  else if(state.screen==='menu') html=renderMenu();
  else if(state.screen==='stats') html=renderStats();
  else if(state.screen==='inventory') html=renderPanel('INVENTORY');
  else if(state.screen==='games') html=renderGames();
  else if(state.screen==='questGame') html=renderQuestGame();
  else if(state.screen==='shop') html=renderPanel('SHOP');
  else if(state.screen==='habitat') html=renderHabitatPanel();
  else if(state.screen==='hook') html=renderHookGamePanel();
  else if(state.screen==='quests') html=renderSimplePanel('QUESTS','Quest history comes after pets/stats are correct.', currentPet()?.quests||[]);
  else if(state.screen==='error') html=renderError();
  lcd.innerHTML=html;
  wireRenderedControls();
  notifyParent();
}
function renderLogin(){
  return top('WHO IS PLAYING?',`${state.loginIndex+1}/${PLAYER_LIST.length}`)+`<div class="body"><div class="choiceList">${PLAYER_LIST.map((p,i)=>`<div class="choice ${i===state.loginIndex?'active':''}" data-player-index="${i}"><span>${p.test?'🧪':'👤'}</span><div>${esc(p.label)}<small>${esc(p.display)}</small></div></div>`).join('')}</div></div>`;
}
function renderPassword(){
  const p=PLAYER_LIST[state.loginIndex]||PLAYER_LIST[0];
  return top('PASSWORD','')+`<div class="body"><div class="passwordCard"><div>${esc(p.label)} password</div><input id="passInput" type="password" autocomplete="off" inputmode="text" value="${esc(state.password)}" placeholder="type password"><div class="error">${esc(state.error)}</div></div></div>`;
}
function renderLoading(){return top('LOADING','')+`<div class="body"><div class="loader"></div><div class="bigText">${esc(state.message||'Loading pets')}</div></div>`;}
function currentPet(){return state.pets[state.petIndex]||null;}
function renderPet(){
  const p=currentPet();
  if(!p)return renderError('No pets loaded.');
  const count=Math.max(1,state.pets.length);
  const img=petImage(p);
  const petName=p.name||p.nickname||p.pet||'Pet';
  const title=`${petName} · Lv ${p.level||1}`;
  const sub=`${p.pet||p.species||'pet'} · XP ${p.xp||0} · ${state.petIndex+1}/${count}`;
  return top(title,'')+`<div class="body petBody"><div class="petStage">${img}</div><div class="petName">${esc(petName)}</div><div class="details">${esc(sub)}</div><div class="stats">${stat('🍔','h',p.hunger)}${stat('😊','j',p.happiness)}${stat('⚡','e',p.energy)}${stat('➕','hp',p.health)}</div></div>`;
}
function petImage(p){
  if(p.url){
    const size=clamp(n(p.size,66),42,76); const x=clamp(n(p.x,50),18,82); const y=clamp(n(p.y,48),20,72); const flip=p.flip===-1?' scaleX(-1)':'';
    return `<div class="petImg" style="background-image:url('${esc(p.url)}');width:${size}%;height:${size}%;left:${x}%;top:${y}%;transform:translate(-50%,-50%)${flip}"></div>`;
  }
  return `<div class="petEmoji">${esc(p.emoji||emojiFor(p.pet||p.category))}</div>`;
}
function emojiFor(s){s=String(s||'').toLowerCase();if(s.includes('raven')||s.includes('crow'))return'🐦‍⬛';if(s.includes('owl'))return'🦉';if(s.includes('dragon'))return'🐉';if(s.includes('unicorn'))return'🦄';if(s.includes('cat'))return'🐈';if(s.includes('dog'))return'🐕';if(s.includes('frog'))return'🐸';if(s.includes('axolotl'))return'🦎';return'🐾';}
function stat(icon,cls,v){return `<div class="stat"><span>${icon}</span><div class="bar ${cls}"><i style="width:${bar(v)}"></i></div><span>${clamp(Math.round(n(v,0)),0,100)}</span></div>`;}
function renderMenu(){return top('MAIN MENU','')+`<div class="body"><div class="menuGrid main6">${MENU.map((m,i)=>`<div class="menuItem ${i===state.menuIndex?'active':''}" data-menu-index="${i}"><b>${m.icon}</b>${esc(m.label)}</div>`).join('')}</div></div>`;}
function renderStats(){
  const p=currentPet()||{};
  const rows=[['Owner',state.player?.display||''],['User ID',state.player?.userId||''],['Pet ID',p.userPetId||p.code||''],['Species',p.pet||''],['Category',p.category||''],['Level',p.level||1],['XP',p.xp||0],['Health',p.health||0],['Hunger',p.hunger||0],['Happy',p.happiness||0],['Energy',p.energy||0]];
  return top('STATS','')+`<div class="body"><div class="panelList">${rows.map(r=>`<div class="panelItem"><b>${esc(r[0])}:</b> ${esc(r[1])}</div>`).join('')}</div></div>`;
}
function renderSimplePanel(title,msg,items){
  const list=Array.isArray(items)?items:[];
  return top(title,'')+`<div class="body"><div class="panelList">${list.length?list.slice(0,20).map(item=>`<div class="panelItem">${esc(rowLabel(item))}</div>`).join(''):`<div class="panelItem">${esc(msg)}</div>`}</div></div>`;
}
function renderPanel(title){
  const kind=String(state.panelKind||title).toLowerCase().replace(/[^a-z]/g,'');
  if(kind==='shop') return renderShopPanel(title);
  const isLoading=state.panelLoading&&state.panelKind===kind;
  const items=Array.isArray(state.panelItems)?state.panelItems:[];
  const msg=(isLoading&&!items.length)?('Loading '+title+'...'):(state.panelMessage||('No '+title+' rows found yet.'));
  const pageSize=4;
  const idx=clamp(state.panelIndex||0,0,Math.max(0,items.length-1));
  const startIndex=items.length?Math.floor(idx/pageSize)*pageSize:0;
  const pageItems=items.slice(startIndex,startIndex+pageSize);
  const gridClass='panelGrid '+(kind==='shop'?'shopGrid':kind==='inventory'?'invGrid':kind==='habitat'?'habitatGrid':(kind==='hook'||kind==='hookawaa')?'hookGrid':'');
  const cardClass='panelCard '+(kind==='shop'?'shopCard':kind==='inventory'?'invCard':kind==='habitat'?'habitatCard':(kind==='hook'||kind==='hookawaa')?'hookCard':'');
  return top(title,items.length?((idx+1)+'/'+items.length):'')+`<div class="body"><div class="panelHead">${esc(msg)}</div><div class="panelActionMsg">${esc(state.panelActionMsg||'')}</div><div class="${gridClass}">${pageItems.length?pageItems.map((it,j)=>{const realIndex=startIndex+j;return `<div class="${cardClass} ${realIndex===idx?'active':''}" data-panel-index="${realIndex}"><span>${esc(iconForItem(it))}</span><span>${esc(itemTitle(it))}<small>${esc(itemSub(it))}</small>${priceForItem(it)?`<small class="priceTag">${esc(priceForItem(it))}</small>`:''}</span></div>`}).join(''):`<div class="panelCard" style="grid-column:1/-1">${esc(msg)}</div>`}</div></div>`;
}


function renderShopPanel(title){
  const target=state.pets[state.shopPetIndex]||currentPet()||{};
  const targetName=target.name||target.pet||'Pet';
  if(state.shopStep==='pet'){
    const img=target.url?`<div class="shopTargetPetPic" style="background-image:url('${esc(target.url)}')"></div>`:`<div class="petEmoji" style="position:static;transform:none;font-size:38px">${esc(target.emoji||emojiFor(target.pet||target.category))}</div>`;
    return top('SHOP PET',state.pets.length?((state.shopPetIndex+1)+'/'+state.pets.length):'')+`<div class="body"><div class="shopTargetCard">${img}<div class="shopTargetPetName">${esc(targetName)}</div><div class="shopFlowNote">Choose which pet/animal this shop is for.</div></div></div>`;
  }
  if(state.shopStep==='qty'){
    const item=state.shopSelected || (state.panelItems||[])[state.panelIndex||0] || {};
    const price=Number(pick(item.raw||item,['shop_price','price','cost','coins','pet_coins'],item.price||0))||0;
    const total=price?`Total: 🪙 ${price*Number(state.shopQty||1)}`:'';
    return top('BUY AMOUNT','')+`<div class="body"><div class="shopQtyCard"><div class="shopQtyItem">${esc(itemTitle(item))}</div><div class="shopFlowNote">For ${esc(targetName)}</div><div class="shopQtyNumber">x${esc(state.shopQty||1)}</div><div class="shopFlowNote">${esc(total)} · left/right changes amount</div></div></div>`;
  }
  const items=Array.isArray(state.panelItems)?state.panelItems:[];
  const isLoading=state.panelLoading;
  const msg=(isLoading&&!items.length)?'Loading shop...':(state.panelMessage||'No shop rows found for this pet yet.');
  const pageSize=4;
  const idx=clamp(state.panelIndex||0,0,Math.max(0,items.length-1));
  const startIndex=items.length?Math.floor(idx/pageSize)*pageSize:0;
  const pageItems=items.slice(startIndex,startIndex+pageSize);
  return top('SHOP',items.length?((idx+1)+'/'+items.length):'')+`<div class="body"><div class="panelHead">${esc(targetName)} · ${esc(msg)}</div><div class="panelActionMsg">${esc(state.panelActionMsg||'')}</div><div class="panelGrid shopGrid">${pageItems.length?pageItems.map((it,j)=>{const realIndex=startIndex+j;return `<div class="panelCard shopCard ${realIndex===idx?'active':''}" data-panel-index="${realIndex}"><span>${esc(iconForItem(it))}</span><span>${esc(itemTitle(it))}<small>${esc(itemSub(it))}</small>${priceForItem(it)?`<small class="priceTag">${esc(priceForItem(it))}</small>`:''}</span></div>`}).join(''):`<div class="panelCard" style="grid-column:1/-1">${esc(msg)}</div>`}</div></div>`;
}

function itemImage(it){
  const raw=(it&&it.raw)||it||{};
  const v=pick(raw,['full_image_url','full_url','render_url','rendered_url','composite_url','composed_image_url','room_image_url','habitat_image_url','habitat_background_url','background_image_url','background_url','loadout_image_url','preview_url','image_url','cloudinary_image_url','cloudinary_url','url','img','image','overlay_url','public_url','cloudinary_public_id'],'');
  return cleanImageUrl(v);
}
function habitatSlot(row){return String(pick(row,['habitat_slot','slot','loadout_slot','layout_slot','layer','section','type','item_type'],'')).toLowerCase();}
function habitatKey(row){return clean(pick(row,['habitat_key','item_id','item_key','key','id','background_key','base_key','decor_key','decor_1','decor_2','decor_3','special_key','value'],'')).trim();}
function rowLooksLikeCareItem(row){
  const s=String(Object.values(row||{}).join(' ')).toLowerCase();
  return /care_item|food|snack|medicine|heal|toy/.test(s) && !/habitat|background|decor|room|loadout|base|wall|floor/.test(s);
}
function imageUrlFromValue(v){
  const url=cleanImageUrl(v);
  return url;
}
function makeHabitatLayer(cls,url,x=50,y=50,w=30,h=30,z=20){
  if(!url)return null;
  if(cls==='background')return {cls:'background',url,x:0,y:0,w:100,h:100,z:1};
  return {cls:cls||'decor',url,x,y,w,h,z};
}
function buildHabitatKeyMap(rows){
  const map=new Map();
  for(const r of rows||[]){
    if(!r||rowLooksLikeCareItem(r))continue;
    const url=itemImage(r);
    if(!url)continue;
    const keys=[habitatKey(r),pick(r,['item_id','item_key','key','id','habitat_key','background_key','base_key','decor_key','special_key','name','item_name','habitat_name'],'')].map(clean).filter(Boolean);
    for(const k of keys)map.set(norm(k),r);
  }
  return map;
}
function resolveHabitatImage(value,keyMap){
  const direct=imageUrlFromValue(value);
  if(direct)return direct;
  const key=norm(clean(value));
  if(key&&keyMap.has(key))return itemImage(keyMap.get(key));
  return '';
}
function addLayerFromField(layers,row,keyMap,fieldNames,cls,defaults){
  const value=pick(row,fieldNames,'');
  const url=resolveHabitatImage(value,keyMap);
  if(!url)return false;
  layers.push(makeHabitatLayer(cls,url,defaults.x,defaults.y,defaults.w,defaults.h,defaults.z));
  return true;
}
function fieldAny(row, patterns){
  if(!row||typeof row!=='object')return'';
  const keys=Object.keys(row);
  for(const pat of patterns){
    const re=pat instanceof RegExp?pat:new RegExp(pat,'i');
    const k=keys.find(x=>re.test(x));
    if(k&&clean(row[k])!=='')return row[k];
  }
  return'';
}
function buildHabitatLayers(items,pet){
  const rows=(items||[]).map(x=>x&&x.raw?x.raw:x).filter(Boolean).filter(r=>!rowLooksLikeCareItem(r));
  const petUrl=pet.url||pet.image_url||itemImage(pet.raw||{})||'';
  const layers=[];
  const compositeFields=['full_image_url','full_url','render_url','rendered_url','composite_url','composed_image_url','room_image_url','habitat_image_url','loadout_image_url','preview_url'];
  const compositeRow=rows.find(r=>cleanImageUrl(pick(r,compositeFields,'')));
  if(compositeRow){
    layers.push(makeHabitatLayer('background',cleanImageUrl(pick(compositeRow,compositeFields,'')),0,0,100,100,1));
    if(petUrl)layers.push(makeHabitatLayer('petLayer stage11Pet',petUrl,50,72,22,34,80));
    return layers.filter(Boolean);
  }
  const row=rows.find(Boolean)||{};
  // Only use direct image URL columns from user_habitats_layout/loadout rows. Do not resolve random catalogue keys into unrelated dragon/decor images.
  const bgUrl=cleanImageUrl(fieldAny(row,[/background.*image.*url/i,/habitat.*background.*url/i,/room.*image.*url/i,/bg.*url/i,/background_url/i,/image_url/i]));
  if(bgUrl)layers.push(makeHabitatLayer('background',bgUrl,0,0,100,100,1));
  const baseUrl=cleanImageUrl(fieldAny(row,[/base.*image.*url/i,/floor.*image.*url/i,/ground.*image.*url/i,/base_url/i]));
  if(baseUrl)layers.push(makeHabitatLayer('base',baseUrl,50,55,100,90,8));
  const decorFields=[[/decor.*1.*image.*url/i,/decor_1.*url/i],[/decor.*2.*image.*url/i,/decor_2.*url/i],[/decor.*3.*image.*url/i,/decor_3.*url/i],[/special.*image.*url/i,/special.*url/i]];
  decorFields.forEach((pats,i)=>{const u=cleanImageUrl(fieldAny(row,pats));if(u)layers.push(makeHabitatLayer('decor',u,28+i*16,56,22,28,25+i));});
  const rowPetUrl=cleanImageUrl(fieldAny(row,[/pet.*image.*url/i,/overlay.*pet.*url/i,/pet_url/i]));
  if(rowPetUrl)layers.push(makeHabitatLayer('petLayer stage11Pet',rowPetUrl,50,72,24,36,80));
  else if(petUrl)layers.push(makeHabitatLayer('petLayer stage11Pet',petUrl,50,72,24,36,80));
  return layers.filter(Boolean);
}

function habitatLayerHtml(layer){
  if(!layer||!layer.url)return'';
  if(layer.cls==='background') return `<div class="habitatLayer background" style="background-image:url('${esc(layer.url)}');z-index:${esc(layer.z)}"></div>`;
  return `<div class="habitatLayer ${esc(layer.cls||'decor')}" style="background-image:url('${esc(layer.url)}');left:${esc(layer.x)}%;top:${esc(layer.y)}%;width:${esc(layer.w)}%;height:${esc(layer.h)}%;z-index:${esc(layer.z)};transform:translate(-50%,-50%)"></div>`;
}
function renderHabitatPanel(){
  const items=Array.isArray(state.panelItems)?state.panelItems:[];
  const pet=currentPet()||{};
  const layers=buildHabitatLayers(items,pet);
  const msg=state.panelLoading?'Loading habitat...':(layers.length?'':(state.panelMessage||'No habitat loadout image found yet.'));
  const empty = !layers.length ? `<div class="habitatEmpty">${esc(msg)}<br><small>user_habitats_layout did not return a usable image yet.</small></div>` : '';
  const label = layers.length ? `<div class="habitatLabel">${esc(pet.name||'Habitat')}</div>` : '';
  return top('HABITAT','')+`<div class="body"><div class="habitatView"><div class="habitatFrame stage10Full stage11Simple ${layers.length?'withImage':''}">${layers.map(habitatLayerHtml).join('')}${empty}${label}</div><div class="panelActionMsg">${esc(state.panelActionMsg||'')}</div></div></div>`;
}
function hookPrizeFloatHtml(it,cls,emoji){
  const url=itemImage(it);
  if(url)return `<div class="hookFloatPrize ${cls}" style="background-image:url('${esc(url)}')"></div>`;
  return `<div class="hookFloatPrize noImg ${cls}">${emoji}</div>`;
}
function renderHookGamePanel(){
  const items=Array.isArray(state.panelItems)?state.panelItems:[];
  const idx=clamp(state.panelIndex||0,0,Math.max(0,items.length-1));
  const selected=state.hookPrize||items[idx]||{};
  const loading=state.panelLoading;
  const floats=[0,1,2,3].map((n)=>items[(idx+n)%Math.max(1,items.length)]||{});
  const prizeImg=state.hookPrize&&itemImage(state.hookPrize)?`<div class="hookPrizeImage" style="background-image:url('${esc(itemImage(state.hookPrize))}')"></div>`:'';
  const prizeTitle=loading?'Loading prize pool...':(state.panelActionMsg|| (selected&&itemTitle(selected)!=='Item'?('Prize: '+itemTitle(selected)):'Ready · pacifier casts'));
  return top('HOOK-A-WAA','')+`<div class="body"><div class="hookGameView"><div class="hookPond ${state.hookCasting?'hookCasting':''}"><div class="hookLine"></div><div class="hookWave"></div>${hookPrizeFloatHtml(floats[0],'p1','🚑')}${hookPrizeFloatHtml(floats[1],'p2','🚑')}${hookPrizeFloatHtml(floats[2],'p3','🚑')}${hookPrizeFloatHtml(floats[3],'p4','🚑')}${prizeImg||'<div class="hookPrize">🪝</div>'}<div class="hookResult ${state.hookPrize?'hasPrize':''}">${esc(prizeTitle)}</div></div></div></div>`;
}
function renderGames(){
  return top('GAMES','')+`<div class="body"><div class="panelHead">Choose a real Waaambulance game</div><div class="panelGrid">${GAME_MENU.map((g,i)=>`<div class="panelCard ${i===state.gameIndex?'active':''}" data-game-index="${i}"><span>${g.icon}</span><span>${esc(g.label)}</span></div>`).join('')}</div></div>`;
}
function renderQuestGame(){
  return `<div class="questGameGlass" aria-label="${esc(state.quest.mode||'Quest')} running inside Tamagotchi"></div>`;
}
function iconForItem(it){
  const s=String(itemTitle(it)+' '+itemSub(it)).toLowerCase();
  if(s.includes('seed')||s.includes('food')||s.includes('snack')||s.includes('pellet')||s.includes('cricket'))return'🍔';
  if(s.includes('toy')||s.includes('ball')||s.includes('play')||s.includes('trinket'))return'🧸';
  if(s.includes('heal')||s.includes('med')||s.includes('cure')||s.includes('potion'))return'💊';
  if(s.includes('habitat')||s.includes('perch')||s.includes('blanket')||s.includes('lamp')||s.includes('cave'))return'🏡';
  return'📦';
}
function priceForItem(it){
  const price=pick(it,['shop_price','price','cost','coins','pet_coins'],'');
  return price ? '🪙 '+price : '';
}

function itemTitle(it){return pick(it,['item_name','shop_name','name','label','title','habitat_name','prize_name','display_name'],'Item');}
function itemSub(it){
  const qty=pick(it,['quantity','qty','count','amount'],'');
  const price=pick(it,['shop_price','price','cost','coins','pet_coins'],'');
  const type=pick(it,['category','item_type','type','target_category','rarity'],'');
  return [qty?('x'+qty):'', price?('🪙 '+price):'', type].filter(Boolean).join(' · ');
}
function renderError(msg){return top('ERROR','')+`<div class="body"><div class="bigText">${esc(msg||state.lastError||'Something went wrong')}</div></div>`;}
function rowLabel(r){if(!r||typeof r!=='object')return String(r||'');return pick(r,['item_name','name','label','title','quest_name','trait_name','skill_name','effect_name','description'],'Row');}
function wireRenderedControls(){
  document.querySelectorAll('[data-player-index]').forEach(el=>el.addEventListener('click',()=>{state.loginIndex=Number(el.dataset.playerIndex)||0;choosePlayer();}));
  document.querySelectorAll('[data-menu-index]').forEach(el=>el.addEventListener('click',()=>{state.menuIndex=Number(el.dataset.menuIndex)||0;activateMenu();}));
  document.querySelectorAll('[data-game-index]').forEach(el=>el.addEventListener('click',()=>{state.gameIndex=Number(el.dataset.gameIndex)||0;activateGameMenu();}));
  document.querySelectorAll('[data-panel-index]').forEach(el=>el.addEventListener('click',()=>{state.panelIndex=Number(el.dataset.panelIndex)||0;state.panelActionMsg='';render();}));
  const input=$('passInput');
  if(input){input.addEventListener('input',()=>state.password=input.value);setTimeout(()=>{try{input.focus();input.select();}catch(e){}},40);input.addEventListener('keydown',e=>{if(e.key==='Enter')submitPassword();});}
}
function choosePlayer(){
  const p=PLAYER_LIST[state.loginIndex]||PLAYER_LIST[0];
  if(p.test){startPlayer(p);return;}
  state.screen='password';state.password='';state.error='';render();
}
function submitPassword(){
  const p=PLAYER_LIST[state.loginIndex]||PLAYER_LIST[0];
  const input=$('passInput'); const pass=input?input.value:state.password;
  if(pass!==p.password){state.error='Wrong password';state.password='';render();return;}
  startPlayer(p);
}
function petsCacheKey(userId){return 'ctw_tamagotchi_pets_cache_v4_'+String(userId||'none');}
function readCachedPets(userId){
  try{const raw=localStorage.getItem(petsCacheKey(userId));if(!raw)return null;const pack=JSON.parse(raw);if(!pack||!Array.isArray(pack.pets))return null;if(Date.now()-Number(pack.t||0)>60*60*1000)return null;return pack.pets;}catch(e){return null;}
}
function writeCachedPets(userId,pets){
  try{localStorage.setItem(petsCacheKey(userId),JSON.stringify({t:Date.now(),pets:(pets||[]).slice(0,30)}));}catch(e){}
}
async function startPlayer(player){
  state.player={...player,password:undefined};state.pets=[];state.petIndex=0;state.menuIndex=0;state.screen='loading';state.message='Loading '+player.label+' pets';render();
  try{
    if(player.test){
      const pets=TEST_PETS.map(p=>({...p}));
      state.pets=pets.map((p,i)=>withDefaults(p,i));state.petIndex=0;state.menuIndex=0;state.screen='menu';state.message='Loaded test pets';render();return;
    }
    const cached=readCachedPets(player.userId);
    if(cached&&cached.length){
      state.pets=cached.map((p,i)=>withDefaults(p,i));state.petIndex=0;state.menuIndex=0;state.screen='menu';state.message='Loaded cached pets';render();
      loadUserPets(player.userId).then(fresh=>{
        if(!fresh||!fresh.length||!state.player||state.player.userId!==player.userId)return;
        const ready=fresh.map((p,i)=>withDefaults(p,i));writeCachedPets(player.userId,ready);state.pets=ready;state.petIndex=Math.min(state.petIndex,ready.length-1);state.screen='menu';state.message='Updated '+ready.length+' pets';render();
      }).catch(e=>log('background refresh failed',e.message||e));
      return;
    }
    const pets=await loadUserPetsFast(player.userId);
    if(!pets.length)throw new Error('No owned pets found for '+player.label+'. This is safer than showing everyone.');
    const ready=pets.map((p,i)=>withDefaults(p,i));writeCachedPets(player.userId,ready);state.pets=ready;state.petIndex=0;state.menuIndex=0;state.screen='menu';state.message='Loaded '+pets.length+' pets';render();
    enrichPets(ready,player.userId).then(enriched=>{
      if(!enriched||!enriched.length||!state.player||state.player.userId!==player.userId)return;
      const updated=enriched.map((p,i)=>withDefaults(p,i));writeCachedPets(player.userId,updated);state.pets=updated;state.petIndex=Math.min(state.petIndex,updated.length-1);render();
    }).catch(e=>log('background visual enrich failed',e.message||e));
  }catch(err){state.lastError=err.message||String(err);state.screen='error';render();}
}
function withDefaults(p,i){return {hunger:100,happiness:100,energy:100,health:100,level:1,xp:0,size:104,x:50,y:49,emoji:emojiFor(p.pet||p.category||p.name),...p};}
async function loadUserPetsFast(userId){
  // Fast path: get owned pets and stats first, then images/layout can enrich in the background.
  let proxyPets=[];
  try{
    const sheetRows=await fetchSheetRows('user_pets');
    const direct=dedupePets(sheetRows.filter(r=>strictUserMatch(r,userId)).map(r=>normalisePet(r,userId)));
    if(direct.length)return direct;
  }catch(e){log('fast direct user_pets failed',e.message||e);}
  try{proxyPets=await fetchPetsViaProxy(userId);}catch(e){log('fast proxy failed',e.message||e);}
  return dedupePets(proxyPets.filter(p=>strictUserMatch(p.raw||p,userId)).map(p=>p.raw?p:normalisePet(p,userId)));
}
async function loadUserPets(userId){
  let proxyPets=[];
  // Try direct user_pets first because that is where your real Discord-owned pet names/stats live.
  try{
    const sheetRows=await fetchSheetRows('user_pets');
    const direct=dedupePets(sheetRows.filter(r=>strictUserMatch(r,userId)).map(r=>normalisePet(r,userId)));
    if(direct.length){
      try{proxyPets=await fetchPetsViaProxy(userId);}catch(e){log('proxy failed after direct',e.message||e);}
      return await enrichPets(mergePetLists(direct,proxyPets),userId);
    }
  }catch(e){log('direct user_pets failed',e.message||e);}
  // Fallback to Apps Script proxy, but still strict-filter to the selected user.
  try{proxyPets=await fetchPetsViaProxy(userId);}catch(e){log('proxy failed',e.message||e);}
  const strict=dedupePets(proxyPets.filter(p=>strictUserMatch(p.raw||p,userId)).map(p=>p.raw?p:normalisePet(p,userId)));
  return await enrichPets(strict,userId);
}
function mergePetLists(primary,secondary){
  const out=[]; const byKey=new Map();
  function keyFor(p){return norm(p.userPetId||p.code||p.name||p.pet||'');}
  for(const p of primary||[]){const k=keyFor(p);if(k&&!byKey.has(k)){byKey.set(k,{...p});out.push(byKey.get(k));}}
  for(const p of secondary||[]){const k=keyFor(p);if(k&&byKey.has(k)){Object.assign(byKey.get(k),{...p,name:byKey.get(k).name||p.name});}else if(k){const v={...p};byKey.set(k,v);out.push(v);}}
  return out;
}
async function fetchPetsViaProxy(userId){
  const url='/api/petbot?'+new URLSearchParams({mode:'view_pets',user_id:String(userId),per_page:'100',v:'stable-tama-2'});
  const data=await fetchJson(url,14000);
  const rootUser=clean(pick(data,['user_id','discord_user_id','discord_id','requested_user_id','player_id'],''));
  let arr=findArray(data,['pets','owned_pets','user_pets','rows','data','items','results']);
  // Never stamp catalogue rows as owned. Rows must contain the selected user ID themselves.
  return arr.map(r=>normalisePet(r,userId));
}
function findArray(data,names){
  if(Array.isArray(data))return data;
  if(!data||typeof data!=='object')return[];
  for(const name of names){if(Array.isArray(data[name]))return data[name];}
  for(const val of Object.values(data)){if(Array.isArray(val)&&val.some(x=>x&&typeof x==='object'))return val;}
  return [];
}
async function enrichPets(pets,userId){
  const visualRows=[];
  const tabs=['Sheet51','user_pet_images','pet_action_images'];
  const results=await Promise.allSettled(tabs.map(tab=>fetchSheetRows(tab)));
  results.forEach(r=>{if(r.status==='fulfilled'&&Array.isArray(r.value))visualRows.push(...r.value);});
  return (pets||[]).map(pet=>{
    const p={...pet};
    try{
      const owned=visualRows.find(r=>strictUserMatch(r,userId)&&matchPet(r,p));
      const generic=owned||visualRows.find(r=>!hasOtherUser(r,userId)&&matchPet(r,p));
      if(generic)applyVisual(p,generic);
    }catch(e){log('visual failed',e.message||e);}
    return p;
  });
}
function applyVisual(p,row){
  const url=cleanImageUrl(pick(row,['image_url','url','cloudinary_image_url','image','pet_image','sprite_url','public_url','cloudinary_public_id'],''));
  if(url)p.url=url;
  const w=pick(row,['overlay_width','width','size','pet_size','display_width','w'],''); if(w)p.size=screenSize(w,p.size);
  const x=pick(row,['overlay_x','x','x_pos','screen_x','display_x'],''); if(x!==''&&x!=null)p.x=screenPos(x,p.x);
  const y=pick(row,['overlay_y','y','y_pos','screen_y','display_y'],''); if(y!==''&&y!=null)p.y=screenPos(y,p.y);
  const f=String(pick(row,['flip','facing','direction','scale_x'],'')).toLowerCase(); if(f.includes('-1')||f.includes('left')||f.includes('flip'))p.flip=-1;
}
function screenSize(v,f=66){let x=n(v,f);if(x>220)x=x/4.8;else if(x>140)x=x*.42;return clamp(x,42,76);}
function screenPos(v,f=50){let x=n(v,f);if(x>100)x=50;return clamp(x,15,85);}
async function findVisualForPet(p,userId){
  // Existing Cloudflare lookup first.
  try{
    const q=new URLSearchParams({user_id:userId,pet_code:p.code||'',pet_name:p.name||'',pet:p.pet||'',action:'main',v:'stable-51'});
    const d=await fetchJson('/api/sheet51?'+q.toString(),9000);
    const u=cleanImageUrl(pick(d,['image_url','url','cloudinary_image_url','cloudinary_public_id'],''));
    if(u)return d;
  }catch(e){}
  for(const tab of ['Sheet51','user_pet_images','pet_action_images']){
    try{
      const rows=await fetchSheetRows(tab);
      const owned=rows.find(r=>strictUserMatch(r,userId)&&matchPet(r,p));
      if(owned)return owned;
      const generic=rows.find(r=>!hasOtherUser(r,userId)&&matchPet(r,p));
      if(generic)return generic;
    }catch(e){}
  }
  return null;
}
function cleanImageUrl(v){v=clean(v).replace(/^['"]|['"]$/g,'');if(!v)return'';if(/^https?:\/\//i.test(v))return v;if(v.includes('res.cloudinary.com'))return 'https://'+v.replace(/^\/+/,'');return CLOUD+v.replace(/^\/+/,'');}
function normalisePet(row,userId){
  // Rows may arrive as normal objects or raw array rows from Apps Script.
  if(Array.isArray(row)){
    row={
      user_id:row[0], owner_display:row[1], user_pet_id:row[2], pet_code:row[3], pet:row[4], category:row[5],
      pet_name:row[6], level:row[7], xp:row[8], hunger:row[9], happiness:row[10], energy:row[11], health:row[12],
      adopted_at:row[13], updated_at:row[14]
    };
  }
  const vals=Object.values(row||{}).map(clean);
  const indexLooks=vals[0]===String(userId)||vals.includes(String(userId));
  const fromIndex={};
  if(indexLooks&&vals.length>=9){Object.assign(fromIndex,{userId:vals[0],owner:vals[1],userPetId:vals[2],code:vals[3],pet:vals[4],category:vals[5],name:vals[6],level:vals[7],xp:vals[8],hunger:vals[9],happiness:vals[10],energy:vals[11],health:vals[12]});}
  const userPetId=pick(row,['user_pet_id','owned_pet_id','pet_instance_id','instance_id','id'],fromIndex.userPetId||'');
  const code=pick(row,['pet_code','code','pet_key','pet_id'],fromIndex.code||userPetId||'');
  const pet=pick(row,['pet','species','animal','pet_type','type','base_pet','pet_key'],fromIndex.pet||code||'');
  let name=pick(row,['nickname','pet_nickname','custom_name','given_name','pet_display_name','display_pet_name','display_name','pet_given_name','petName','name_given'],fromIndex.name||'');
  if(!name)name=pick(row,['pet_name','name','Name'],fromIndex.name||'');
  if(!name||norm(name)===norm(pet)||norm(name)===norm(code)) name=fromIndex.name||name||pet||code||'Pet';
  return {raw:row,userId:pick(row,['user_id','discord_user_id','discord_id','owner_id','member_id','player_id'],fromIndex.userId||userId||''),owner:pick(row,['owner_display','display_name','username','user_name'],fromIndex.owner||''),userPetId,code,pet,category:pick(row,['category','pet_category','class'],fromIndex.category||''),name,level:n(pick(row,['level','lvl'],fromIndex.level||1),1),xp:n(pick(row,['xp','experience','exp'],fromIndex.xp||0),0),hunger:n(pick(row,['hunger','food','feed'],fromIndex.hunger||100),100),happiness:n(pick(row,['happiness','happy','mood'],fromIndex.happiness||100),100),energy:n(pick(row,['energy','stamina'],fromIndex.energy||100),100),health:n(pick(row,['health','hp'],fromIndex.health||100),100)};
}
function pick(row,names,fallback=''){
  if(!row||typeof row!=='object')return fallback;
  const keys=Object.keys(row); const map=new Map(keys.map(k=>[norm(k),k]));
  for(const name of names){const k=map.get(norm(name));if(k!=null&&clean(row[k])!=='')return row[k];}
  // loose contains match for awkward sheet headers
  for(const name of names){const want=norm(name);const k=keys.find(key=>norm(key).includes(want)||want.includes(norm(key)));if(k&&clean(row[k])!=='')return row[k];}
  return fallback;
}
function strictUserMatch(row,userId){
  userId=String(userId||''); if(!userId)return false;
  const direct=clean(pick(row,['user_id','discord_user_id','discord_id','owner_id','member_id','guild_user_id','recipient_id','owner_user_id','player_id','User ID','Discord User ID'],''));
  if(direct)return direct===userId;
  return Object.values(row||{}).some(v=>clean(v)===userId);
}
function hasOtherUser(row,userId){
  const other=clean(pick(row,['user_id','discord_user_id','discord_id','owner_id','member_id','player_id'],''));
  return !!other && other!==String(userId||'');
}
function matchPet(row,p){
  const hay=Object.values(row||{}).map(v=>clean(v).toLowerCase()).join(' | ');
  const bits=[p.userPetId,p.code,p.pet,p.name].map(v=>clean(v).toLowerCase()).filter(Boolean);
  return bits.some(b=>hay.includes(b));
}
function dedupePets(pets){
  const seen=new Set(),out=[];
  for(const p of pets){const key=clean(p.userPetId||p.code||p.name||JSON.stringify(p.raw||p));if(!key||seen.has(key))continue;seen.add(key);out.push(p);}return out;
}
async function fetchJson(url,timeoutMs){
  const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),timeoutMs||12000);
  try{const res=await fetch(url,{headers:{accept:'application/json,text/plain,*/*'},cache:'no-store',signal:ctrl.signal});const text=await res.text();if(!res.ok)throw new Error('HTTP '+res.status+' '+text.slice(0,120));try{return JSON.parse(text);}catch(e){return {response:text};}}finally{clearTimeout(t);}
}
const SHEET_CACHE=new Map();
async function fetchSheetRows(tab){
  const cacheKey=tab;
  const cached=SHEET_CACHE.get(cacheKey);
  if(cached&&Date.now()-cached.t<45000)return cached.rows;
  const url=`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?`+new URLSearchParams({tqx:'out:json',sheet:tab,tq:'select *'}).toString();
  const text=await (await fetch(url,{cache:'no-store'})).text();
  const rows=parseGviz(text);
  SHEET_CACHE.set(cacheKey,{t:Date.now(),rows});
  return rows;
}
function parseGviz(text){
  const start=text.indexOf('{'),end=text.lastIndexOf('}'); if(start<0||end<start)throw new Error('Sheet not readable');
  const data=JSON.parse(text.slice(start,end+1)); const table=data.table||{};
  let headers=(table.cols||[]).map((c,i)=>clean(c.label||c.id||('col'+i))||('col'+i));
  let rows=(table.rows||[]).map(r=>{const o={};(r.c||[]).forEach((cell,i)=>o[headers[i]||('col'+i)]=cell?clean(cell.f??cell.v??''):'');return o;});
  if(rows.length){
    const first=headers.map(h=>clean(rows[0][h])); const low=first.map(x=>x.toLowerCase());
    if(low.includes('user_id')||low.includes('pet_code')||low.includes('image_url')||low.includes('section')){
      const old=headers; headers=first.map((v,i)=>v||('col'+i));
      rows=rows.slice(1).map(r=>{const o={};old.forEach((h,i)=>o[headers[i]||('col'+i)]=r[h]);return o;});
    }
  }
  return rows.filter(r=>Object.values(r).some(v=>clean(v)!==''));
}


function isRealShopRow(row){
  const titleRaw=String(pick(row,['item_name','shop_name','name','label','title'],'')).trim();
  const title=norm(titleRaw);
  if(!title)return false;
  const s=String(Object.values(row||{}).join(' ')).toLowerCase();
  // Hide generic/demo/fallback stock. Only real sheet shop rows should appear.
  if(['caresnack','happytoy','restblanket','smallhealkit','testsnack','testtoyball'].includes(title))return false;
  if(/care\s*snack|happy\s*toy|rest\s*blanket|small\s*heal|demo item|sample item|fallback|placeholder/.test(s))return false;
  if(/hook_waaambulance|hook-a-waa|prize pool/.test(s))return false;
  const enabled=String(pick(row,['shop_enabled','enabled','active','is_active'],'true')).toLowerCase();
  if(['false','no','0','off','disabled'].includes(enabled))return false;
  return true;
}
function isHookPrizeRow(row){
  const s=String(Object.values(row||{}).join(' ')).toLowerCase();
  if(/level_config|how to play|game config|tutorial|booth config/.test(s))return false;
  const key=String(pick(row,['hook_key','item_id','reward_item_key','key','id'],'')).toLowerCase();
  const cat=String(pick(row,['category','type'],'')).toLowerCase();
  const title=String(pick(row,['name','reward_item_name','hook_name','title','item_name'],'')).toLowerCase();
  const img=cleanImageUrl(pick(row,['image_url','image','url','cloudinary_image_url'],''));
  return /^hook_waaambulance_\d+/.test(key) || (cat==='hook_waaambulance' && !!img && !!title);
}
function normaliseHookRow(row){
  const r=normaliseStoreRow(row);
  r.item_id=pick(row,['hook_key','reward_item_key','item_id','item_key','key','id'],r.item_id||'');
  r.item_name=pick(row,['name','reward_item_name','hook_name','title','item_name'],r.item_name||'Hook prize');
  r.price=pick(row,['play_cost','cost'],r.price||'');
  r.category=pick(row,['rarity','collection_name','category'],r.category||'');
  r.image_url=pick(row,['image_url','image','url','cloudinary_image_url'],r.image_url||'');
  return r;
}
function weightedPrize(pool){
  const arr=(pool||[]).filter(Boolean);
  if(!arr.length)return null;
  const total=arr.reduce((sum,it)=>sum+Math.max(0,Number(pick(it.raw||it,['roll_weight','weight'],'')||0)),0);
  if(total<=0)return arr[Math.floor(Math.random()*arr.length)];
  let roll=Math.random()*total;
  for(const it of arr){
    roll-=Math.max(0,Number(pick(it.raw||it,['roll_weight','weight'],'')||0));
    if(roll<=0)return it;
  }
  return arr[arr.length-1];
}

async function loadPanelData(kind){
  const userId=state.player?.userId||'';
  const p=currentPet()||{};
  if(state.player?.test){
    if(kind==='inventory')return [{item_name:'Test snack',quantity:3,item_type:'food'},{item_name:'Test toy ball',quantity:1,item_type:'toy'},{item_name:'Test blanket',quantity:1,item_type:'comfort'}];
    if(kind==='shop')return [{item_id:'bird_seed_mix',item_name:'Bird seed mix',price:10,item_type:'food'},{item_id:'soft_blanket',item_name:'Soft blanket',price:25,item_type:'comfort'},{item_id:'perch_upgrade',item_name:'Perch upgrade',price:40,item_type:'habitat'}];
    if(kind==='habitat')return [{item_name:'Default habitat room',item_type:'background'},{item_name:'Soft blanket slot',item_type:'decor'},{item_name:'Perch upgrade slot',item_type:'decor'}];
    if(kind==='hook')return [{item_id:'hook_common',item_name:'Common Waaambulance prize',price:15,rarity:'common'},{item_id:'hook_rare',item_name:'Rare siren toy',price:15,rarity:'rare'},{item_id:'hook_epic',item_name:'Epic shiny trinket',price:15,rarity:'epic'}];
  }
  let rows=[];
  if(kind==='inventory'){
    rows=await loadRowsFromProxyAndSheets(['view_inventory','inventory'],['user_inventory'],userId,p);
    return rows.filter(r=>strictUserMatch(r,userId)).map(normaliseStoreRow).filter(x=>itemTitle(x)!=='Item');
  }
  if(kind==='shop'){
    rows=await loadRowsFromProxyAndSheets(['view_shop'],['shop','pet_shop','shop_items','habitat_shop'],userId,p);
    const shop=rows.filter(r=>isRealShopRow(r)&&shopRowForPet(r,p)).map(normaliseStoreRow).filter(x=>itemTitle(x)!=='Item');
    return shop;
  }
  if(kind==='habitat'){
    rows=await loadRowsFromProxyAndSheets(['view_habitat'],['user_habitats_layout','user_habitat_loadout','user_habitat_layouts'],userId,p);
    const userRows=rows.filter(r=>strictUserMatch(r,userId));
    const petRows=userRows.filter(r=>matchPet(r,p));
    const chosen=(petRows.length?petRows:userRows);
    const base=dedupeRows(chosen).map(normaliseHabitatRow).filter(x=>!rowLooksLikeCareItem(x.raw||x) && (itemTitle(x)!=='Item' || itemImage(x) || habitatKey(x.raw||x)));
    base.sort((a,b)=>(itemImage(b)?1:0)-(itemImage(a)?1:0));
    return base.length?base:[{item_name:'No habitat loadout image found yet',item_type:'habitat'}];
  }
  if(kind==='hook'){
    rows=await loadRowsFromProxyAndSheets(['view_hook_prizes'],['hook_waaambulance'],userId,p);
    const prizes=rows.filter(isHookPrizeRow).map(normaliseHookRow).filter(x=>itemTitle(x)!=='Item' && (itemImage(x)||x.item_id));
    return prizes;
  }
  return [];
}
function fallbackShopItems(p){ return []; }
async function loadRowsFromProxyAndSheets(modes,tabs,userId,p){
  const all=[];
  for(const mode of modes){
    try{
      const q=new URLSearchParams({mode,user_id:String(userId||''),pet_code:p.code||'',pet_name:p.name||'',pet:p.pet||'',v:'stage11'});
      const data=await fetchJson('/api/petbot?'+q.toString(),12000);
      all.push(...findArray(data,['inventory','shop','items','rows','data','results','prizes','catalogue','catalog']));
    }catch(e){log('panel proxy '+mode+' failed',e.message||e);}
  }
  for(const tab of tabs){
    try{all.push(...await fetchSheetRows(tab));}catch(e){log('panel sheet '+tab+' failed',e.message||e);}
  }
  return dedupeRows(all);
}
function normaliseStoreRow(row){
  return {raw:row,item_name:pick(row,['item_name','shop_name','name','label','title','habitat_name','prize_name','display_name'],'Item'),item_id:pick(row,['item_id','item_key','key','id','habitat_key','prize_key'],''),quantity:pick(row,['quantity','qty','count','amount'],''),price:pick(row,['shop_price','price','cost','coins','pet_coins'],''),category:pick(row,['category','item_type','type','target_category','rarity'],''),image_url:pick(row,['full_image_url','full_url','render_url','rendered_url','composite_url','composed_image_url','room_image_url','habitat_image_url','background_image_url','loadout_image_url','preview_url','image_url','cloudinary_image_url','cloudinary_url','url','img','image','overlay_url','public_url'],'')};
}
function normaliseHabitatRow(row){
  const slot=pick(row,['slot','habitat_slot','loadout_slot','layer','section','type'],'');
  const title=pick(row,['habitat_name','habitat_key','loadout_name','room_name','background_key','base_key','decor_key','item_name','name','title'], slot||'Habitat');
  return {raw:row,item_name:title,item_id:pick(row,['habitat_key','item_id','item_key','key','id','background_key','base_key','decor_key'],''),quantity:pick(row,['quantity','qty','count','amount'],''),price:pick(row,['shop_price','price','cost','coins','pet_coins'],''),category:pick(row,['category','item_type','habitat_slot','slot','type','target_category','rarity'],''),image_url:pick(row,['full_image_url','full_url','render_url','rendered_url','composite_url','composed_image_url','room_image_url','habitat_image_url','habitat_background_url','background_image_url','background_url','loadout_image_url','preview_url','image_url','cloudinary_image_url','cloudinary_url','url','img','image','overlay_url','public_url','cloudinary_public_id'],'')};
}
function shopRowForPet(row,p){
  const enabled=String(pick(row,['enabled','shop_enabled','active','is_active'],'true')).toLowerCase();
  if(['false','no','0','off','disabled'].includes(enabled))return false;
  const targetPet=clean(pick(row,['target_pet','pet','species','for_pet'],''));
  const targetCat=clean(pick(row,['target_category','category','for_category'],''));
  if(targetPet && !norm(targetPet).includes(norm(p.pet||p.code||p.name)) && !norm(p.pet||p.code||p.name).includes(norm(targetPet)))return false;
  if(targetCat && p.category && !norm(targetCat).includes(norm(p.category)) && !norm(p.category).includes(norm(targetCat)))return false;
  return true;
}
function dedupeRows(rows){const seen=new Set(),out=[];for(const r of rows||[]){const k=norm(pick(r,['item_id','item_key','key','id','name','item_name','habitat_key'],JSON.stringify(r).slice(0,100)));if(!k||seen.has(k))continue;seen.add(k);out.push(r);}return out;}
function handlePrev(){
  if(state.screen==='login'){state.loginIndex=(state.loginIndex+PLAYER_LIST.length-1)%PLAYER_LIST.length;render();return;}
  if(state.screen==='pet'&&state.pets.length){state.petIndex=(state.petIndex+state.pets.length-1)%state.pets.length;render();return;}
  if(state.screen==='menu'){state.menuIndex=(state.menuIndex+MENU.length-1)%MENU.length;render();return;}
  if(state.screen==='games'){state.gameIndex=(state.gameIndex+GAME_MENU.length-1)%GAME_MENU.length;render();return;}
  if(state.screen==='shop'&&state.shopStep==='pet'&&state.pets.length){state.shopPetIndex=(state.shopPetIndex+state.pets.length-1)%state.pets.length;render();return;}
  if(state.screen==='shop'&&state.shopStep==='qty'){state.shopQty=Math.max(1,(Number(state.shopQty)||1)-1);render();return;}
  if(['shop','inventory','habitat','hook'].includes(state.screen)&&state.panelItems.length){state.panelIndex=(state.panelIndex+state.panelItems.length-1)%state.panelItems.length;render();return;}
  if(state.screen==='questGame'){sendParent('waa-petbot-game-action',{action:'moveLeft'});return;}
}
function handleNext(){
  if(state.screen==='login'){state.loginIndex=(state.loginIndex+1)%PLAYER_LIST.length;render();return;}
  if(state.screen==='pet'&&state.pets.length){state.petIndex=(state.petIndex+1)%state.pets.length;render();return;}
  if(state.screen==='menu'){state.menuIndex=(state.menuIndex+1)%MENU.length;render();return;}
  if(state.screen==='games'){state.gameIndex=(state.gameIndex+1)%GAME_MENU.length;render();return;}
  if(state.screen==='shop'&&state.shopStep==='pet'&&state.pets.length){state.shopPetIndex=(state.shopPetIndex+1)%state.pets.length;render();return;}
  if(state.screen==='shop'&&state.shopStep==='qty'){state.shopQty=Math.min(99,(Number(state.shopQty)||1)+1);render();return;}
  if(['shop','inventory','habitat','hook'].includes(state.screen)&&state.panelItems.length){state.panelIndex=(state.panelIndex+1)%state.panelItems.length;render();return;}
  if(state.screen==='questGame'){sendParent('waa-petbot-game-action',{action:'moveRight'});return;}
}
function handleSelect(){
  if(state.screen==='login')return choosePlayer();
  if(state.screen==='password')return submitPassword();
  if(state.screen==='error'&&state.player)return startPlayer(state.player);
  if(state.screen==='pet'){state.screen='menu';render();return;}
  if(state.screen==='menu')return activateMenu();
  if(state.screen==='games')return activateGameMenu();
  if(state.screen==='questGame')return questJump();
  if(['shop','inventory','habitat','hook'].includes(state.screen))return activatePanelItem();
  if(['stats','quests'].includes(state.screen)){state.screen='menu';render();}
}
function activateMenu(){
  const item=MENU[state.menuIndex]||MENU[0];
  if(item.key==='pets'){state.screen='pet';render();return;}
  if(item.key==='games'){state.screen='games';state.gameIndex=0;render();return;}
  if(item.key==='shop'){openShopPanel();return;}
  if(item.key==='inventory'){openDataPanel('inventory');return;}
  if(item.key==='habitat'){openDataPanel('habitat');return;}
  if(item.key==='hook'){openDataPanel('hook');return;}
  state.screen=item.key;render();
}
function activateGameMenu(){
  const item=GAME_MENU[state.gameIndex]||GAME_MENU[0];
  if(item.action==='back'){state.screen='menu';render();return;}
  if(item.action==='questSolo'){
    state.quest={mode:'Solo Quest',embedded:true,score:0};
    state.screen='questGame';
    render();
    setTimeout(()=>sendParent('waa-petbot-game-action',{action:'startSoloEmbedded'}),80);
    return;
  }
  if(item.action==='questTeam'){
    state.quest={mode:'Team Quest',embedded:true,score:0};
    state.screen='questGame';
    render();
    setTimeout(()=>sendParent('waa-petbot-game-action',{action:'startTeamEmbedded'}),80);
    return;
  }
  if(item.action==='questPlatform'){
    state.quest={mode:'Platform Game',embedded:true,score:0};
    state.screen='questGame';
    render();
    setTimeout(()=>sendParent('waa-petbot-game-action',{action:'startSoloEmbedded'}),80);
    return;
  }
  state.screen='menu';render();
}

function openShopPanel(){
  state.screen='shop';
  state.panelKind='shop';
  state.shopStep='pet';
  state.shopPetIndex=state.petIndex||0;
  state.shopQty=1;
  state.shopSelected=null;
  state.panelItems=[];
  state.panelIndex=0;
  state.panelLoading=false;
  state.panelActionMsg='';
  state.panelMessage='Choose animal first';
  render();
}
function loadShopItemsForTarget(){
  state.shopStep='items';
  state.petIndex=clamp(state.shopPetIndex||0,0,Math.max(0,state.pets.length-1));
  state.panelLoading=true;
  state.panelItems=[];
  state.panelIndex=0;
  state.panelActionMsg='';
  state.panelMessage='Loading shop...';
  render();
  loadPanelData('shop').then(items=>{
    if(state.panelKind!=='shop')return;
    state.panelItems=items;state.panelLoading=false;state.panelMessage=items.length?(items.length+' shop item'+(items.length===1?'':'s')):'No shop items found for this pet yet.';render();
  }).catch(err=>{if(state.panelKind!=='shop')return;state.panelItems=[];state.panelLoading=false;state.panelMessage='Shop failed to load: '+(err.message||String(err));render();});
}

function openDataPanel(kind){
  state.screen=kind;state.panelKind=kind;state.panelLoading=true;state.panelItems=[];state.panelIndex=0;state.panelActionMsg='';state.panelMessage='Loading '+kind+'...';if(kind==='hook'){state.hookPrize=null;state.hookCasting=false;}render();
  loadPanelData(kind).then(items=>{
    if(state.panelKind!==kind)return;
    state.panelItems=items;state.panelLoading=false;state.panelActionMsg='';state.panelMessage=items.length?(items.length+' '+kind+' item'+(items.length===1?'':'s')):('No '+kind+' items found for this player/pet yet.');render();
  }).catch(err=>{
    if(state.panelKind!==kind)return;
    state.panelItems=[];state.panelLoading=false;state.panelMessage=kind+' failed to load: '+(err.message||String(err));render();
  });
}
async function activatePanelItem(){
  const kind=state.panelKind;
  if(kind==='shop'&&state.shopStep==='pet')return loadShopItemsForTarget();
  const item=(state.panelItems||[])[state.panelIndex||0];
  if(!item){state.panelActionMsg='Nothing selected';render();return;}
  if(kind==='shop'){
    if(state.shopStep==='pet')return loadShopItemsForTarget();
    if(state.shopStep==='items'){state.shopSelected=item;state.shopQty=1;state.shopStep='qty';render();return;}
    if(state.shopStep==='qty')return buySelectedItem(state.shopSelected||item);
  }
  if(kind==='inventory') return useSelectedItem(item);
  if(kind==='hook') return playHook(item);
  if(kind==='habitat'){state.panelActionMsg='Viewing '+itemTitle(item);render();return;}
}
async function postPetbotAction(payload){
  const res=await fetch('/api/petbot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  let data={}; try{data=await res.json();}catch(e){}
  if(!res.ok || data.success===false || data.ok===false) throw new Error(data.error||data.response||('HTTP '+res.status));
  return data;
}
async function buySelectedItem(item){
  const target=state.pets[state.shopPetIndex]||currentPet()||{};
  const qty=Math.max(1,Math.min(99,Number(state.shopQty)||1));
  state.panelActionMsg='Buying x'+qty+' '+itemTitle(item)+'...';render();
  try{
    const data=await postPetbotAction({mode:'buy_item',user_id:state.player?.userId||'',pet_code:target.code||currentPet()?.code||'',target_pet_code:target.code||'',target_pet_name:target.name||'',item_id:item.item_id||'',item_name:itemTitle(item),quantity:qty,amount:qty,price:item.price||pick(item.raw||{},['price','shop_price','cost'],'')});
    state.panelActionMsg=data.message||('Bought x'+qty+' '+itemTitle(item));
    state.shopStep='items';
    await openPanelReload('shop');
  }catch(e){state.panelActionMsg='Buy not enabled yet: '+(e.message||e);render();}
}
async function useSelectedItem(item){
  state.panelActionMsg='Using '+itemTitle(item)+'...';render();
  try{
    const data=await postPetbotAction({mode:'use_inventory_item',user_id:state.player?.userId||'',pet_code:currentPet()?.code||'',item_id:item.item_id||'',item_name:itemTitle(item)});
    state.panelActionMsg=data.message||('Used '+itemTitle(item));
    await openPanelReload('inventory');
  }catch(e){state.panelActionMsg='Use not enabled yet: '+(e.message||e);render();}
}
async function playHook(item){
  const pool=(state.panelItems&&state.panelItems.length?state.panelItems:[item]).filter(Boolean);
  const prize=weightedPrize(pool) || item || {item_name:'Mystery Waaambulance prize',price:15};
  state.hookPrize=prize; state.hookCasting=true; state.panelActionMsg='Casting hook...'; render();
  await new Promise(r=>setTimeout(r,520));
  try{
    const data=await postPetbotAction({mode:'play_hook_waaambulance',user_id:state.player?.userId||'',pet_code:currentPet()?.code||'',prize_id:prize.item_id||'',prize_name:itemTitle(prize),hook_key:prize.item_id||'',coins:pick(prize.raw||prize,['coins'],''),xp:pick(prize.raw||prize,['xp'],''),effect_stat:pick(prize.raw||prize,['effect_stat'],''),effect_amount:pick(prize.raw||prize,['effect_amount'],'')});
    state.panelActionMsg=data.message||data.prize_name||('You hooked '+itemTitle(prize));
  }catch(e){
    state.panelActionMsg='You hooked '+itemTitle(prize)+' · saving is not enabled yet';
  }
  state.hookCasting=false; render();
}
async function openPanelReload(kind){
  state.panelKind=kind;state.panelLoading=true;render();
  const items=await loadPanelData(kind);state.panelItems=items;state.panelLoading=false;state.panelActionMsg='';state.panelIndex=clamp(state.panelIndex||0,0,Math.max(0,items.length-1));render();
}
function questJump(){
  if(state.screen!=='questGame')return;
  sendParent('waa-petbot-game-action',{action:'jump'});
}
function handleBack(){
  if(state.screen==='password'){state.screen='login';state.password='';state.error='';render();return;}
  if(state.screen==='login'){sendParent('waa-petbot-close');return;}
  if(state.screen==='pet'){state.screen='menu';render();return;}
  if(state.screen==='menu'){state={...state,screen:'login',player:null,pets:[],petIndex:0,password:'',error:'',message:'Choose player'};render();return;}
  if(state.screen==='shop'&&state.shopStep==='qty'){state.shopStep='items';render();return;}
  if(state.screen==='shop'&&state.shopStep==='items'){state.shopStep='pet';state.panelItems=[];state.panelIndex=0;state.panelActionMsg='';state.panelMessage='Choose animal first';render();return;}
  if(state.screen==='questGame'){sendParent('waa-petbot-game-action',{action:'stopEmbedded'});state.screen='games';render();return;}
  if(state.screen==='error'){state.screen='login';state.player=null;state.pets=[];render();return;}
  state.screen='menu';render();
}
function sendParent(type,extra){try{if(parent&&parent!==window)parent.postMessage({type,...(extra||{})},location.origin);}catch(e){}}
function notifyParent(){
  const p=currentPet(); if(!p)return;
  sendParent('waa-petbot-state',{mode:state.screen,message:state.message,pet:{name:p.name||'',code:p.code||'',pet:p.pet||'',type:p.pet||'',category:p.category||'',url:p.url||'',image_url:p.url||'',level:p.level||1,xp:p.xp||0,hunger:p.hunger||0,happy:p.happiness||0,happiness:p.happiness||0,energy:p.energy||0,health:p.health||0,size:p.size||58,x:p.x||50,y:p.y||52}});
}
$('btnPrev').addEventListener('click',e=>{e.preventDefault();if(state.screen==='questGame')return;handlePrev();});
$('btnNext').addEventListener('click',e=>{e.preventDefault();if(state.screen==='questGame')return;handleNext();});
$('btnSelect').addEventListener('click',e=>{e.preventDefault();handleSelect();});
function bindQuestHoldButton(id,startAction){
  const btn=$(id); if(!btn)return;
  const stop=e=>{ if(state.screen==='questGame'){ try{e.preventDefault();}catch(_e){} sendParent('waa-petbot-game-action',{action:'moveStop'}); } };
  btn.addEventListener('pointerdown',e=>{ if(state.screen==='questGame'){ e.preventDefault(); try{btn.setPointerCapture(e.pointerId);}catch(_e){} sendParent('waa-petbot-game-action',{action:startAction}); } });
  btn.addEventListener('pointerup',stop);
  btn.addEventListener('pointercancel',stop);
  btn.addEventListener('pointerleave',stop);
}
bindQuestHoldButton('btnPrev','moveLeftStart');
bindQuestHoldButton('btnNext','moveRightStart');
$('btnExit').addEventListener('click',e=>{e.preventDefault();handleBack();});
$('btnSiren').addEventListener('click',e=>{e.preventDefault(); if(state.screen==='questGame') sendParent('waa-petbot-game-action',{action:'expandEmbedded'}); else sendParent('waa-petbot-toggle-fullscreen');});
$('lcd').addEventListener('pointerdown',e=>{touchStart={x:e.clientX,y:e.clientY,t:Date.now()};});
$('lcd').addEventListener('pointerup',e=>{if(!touchStart||state.screen!=='pet')return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;if(Math.abs(dx)>34&&Math.abs(dx)>Math.abs(dy)){dx<0?handleNext():handlePrev();}touchStart=null;});
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')handlePrev();else if(e.key==='ArrowRight')handleNext();else if(e.key==='Enter'||e.key===' '){if(e.target&&e.target.tagName==='INPUT'&&e.key===' ')return;e.preventDefault();handleSelect();}else if(e.key==='Escape')handleBack();else if(e.key==='~'||(e.ctrlKey&&e.key.toLowerCase()==='d')){const d=$('debug');d.style.display=d.style.display==='block'?'none':'block';d.textContent=JSON.stringify({state},null,2);}});
render();
})();
