(function(){
  'use strict';

  const VERSION='20260705-one-bridge-2';
  const PETBOT_URL='petbot_test.html?v='+VERSION+'&embed=1&launch=1&choose=1';

  function q(id){return document.getElementById(id);}
  function isParentPage(){return !!q('game') && !!q('petbotDockFrame');}
  function isPetbotPage(){return !!q('lcd') && !q('game');}

  function clearQuestHeartbeat(){
    try{
      sessionStorage.removeItem('waaQuestActiveAt');
      localStorage.removeItem('waaQuestActiveAt');
      localStorage.removeItem('waaQuestActive');
    }catch(e){}
  }

  function writeQuestHeartbeat(){
    try{
      const t=String(Date.now());
      sessionStorage.setItem('waaQuestActiveAt',t);
      localStorage.setItem('waaQuestActiveAt',t);
      localStorage.removeItem('waaQuestActive');
    }catch(e){}
  }

  function recentQuestHeartbeat(){
    try{
      const raw=sessionStorage.getItem('waaQuestActiveAt') || localStorage.getItem('waaQuestActiveAt') || '0';
      const t=Number(raw);
      return !!(t && Date.now()-t<2500);
    }catch(e){return false;}
  }

  function startParentBridge(){
    const MODES=['petbot','questEmbedded','questFullscreen','buildingPetbot'];
    const LEGACY_CLASSES=[
      'waaFs40Petbot','waaFs40Embedded','waaFs40Expanded','petbotOpen',
      'tamaGameEmbedded','gameExpandedFromTama','tamaLiteRender33',
      'tamagotchiLanding','waaTamaStartMode'
    ];
    const state={mode:'petbot',lastQuestMode:'',questKind:'solo',returnMode:'embedded'};

    function installParentCss(){
      if(document.getElementById('waa-one-bridge-parent-css')) return;
      const style=document.createElement('style');
      style.id='waa-one-bridge-parent-css';
      style.textContent=[
        /* Fullscreen quest should have only ONE Tamagotchi return button.
           Keep the final router's stage40 return button, hide the normal HUD PetBot button. */
        'body.questFullscreen #petBtn,body.waaFs40Expanded #petBtn,body.gameExpandedFromTama #petBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}',
        'body.questFullscreen #stage37TamaReturnBtn,body.waaFs40Expanded #stage37TamaReturnBtn,body.gameExpandedFromTama #stage37TamaReturnBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}',
        'body.questFullscreen .petbotBackBtn,body.waaFs40Expanded .petbotBackBtn,body.gameExpandedFromTama .petbotBackBtn{display:none!important;visibility:hidden!important;pointer-events:none!important;}',
        'body.questFullscreen #stage40TamaReturnBtn,body.waaFs40Expanded #stage40TamaReturnBtn,body.gameExpandedFromTama #stage40TamaReturnBtn{display:block!important;visibility:visible!important;opacity:1!important;}',

        /* When the quest is expanded, make sure the platform-game art layers stay visible.
           This prevents the walk state falling back to a plain blue game background. */
        'body.questFullscreen #game,body.waaFs40Expanded #game,body.gameExpandedFromTama #game{display:block!important;visibility:visible!important;opacity:1!important;background:#79d9ff!important;overflow:hidden!important;}',
        'body.questFullscreen .sky,body.questFullscreen .hills,body.questFullscreen .groundDecor,body.questFullscreen .platform,body.questFullscreen .underFloor,body.waaFs40Expanded .sky,body.waaFs40Expanded .hills,body.waaFs40Expanded .groundDecor,body.waaFs40Expanded .platform,body.waaFs40Expanded .underFloor,body.gameExpandedFromTama .sky,body.gameExpandedFromTama .hills,body.gameExpandedFromTama .groundDecor,body.gameExpandedFromTama .platform,body.gameExpandedFromTama .underFloor{display:block!important;visibility:visible!important;opacity:1!important;}',
        'body.questFullscreen #buildingObjects,body.questFullscreen #worldObjects,body.waaFs40Expanded #buildingObjects,body.waaFs40Expanded #worldObjects,body.gameExpandedFromTama #buildingObjects,body.gameExpandedFromTama #worldObjects{display:block!important;visibility:visible!important;opacity:1!important;}',
        'body.questFullscreen #player,body.questFullscreen #shadow,body.waaFs40Expanded #player,body.waaFs40Expanded #shadow,body.gameExpandedFromTama #player,body.gameExpandedFromTama #shadow{display:flex!important;visibility:visible!important;opacity:1!important;}',
        'body.questFullscreen #shadow,body.waaFs40Expanded #shadow,body.gameExpandedFromTama #shadow{display:block!important;}'
      ].join('\n');
      document.head.appendChild(style);
    }

    installParentCss();

    function dock(){return q('petbotDock');}
    function frame(){return q('petbotDockFrame') || q('petbotFrame');}
    function game(){return q('game');}

    function fixFrameUrl(){
      const f=frame();
      if(!f) return;
      const src=f.getAttribute('src') || '';
      if(src.indexOf('petbot_test.html')>-1 && src!==PETBOT_URL) f.setAttribute('src',PETBOT_URL);
    }

    function postPetbot(message){
      const f=frame();
      if(!f || !f.contentWindow) return;
      try{f.contentWindow.postMessage(message,location.origin);}catch(e){}
    }

    function clearModeClasses(){
      document.body.classList.remove(...LEGACY_CLASSES,...MODES);
      document.documentElement.classList.remove('waaFs40Lock');
      document.body.classList.remove('waaFs40Lock');
    }

    function rememberQuest(){
      if(state.mode==='questFullscreen') state.returnMode='expanded';
      else if(state.mode==='questEmbedded') state.returnMode='embedded';
      state.lastQuestMode=state.returnMode;
      try{sessionStorage.setItem('waaQuestReturnMode',state.returnMode);}catch(e){}
    }

    function setGameFixed(on){
      const g=game();
      if(!g) return;
      if(on){
        g.style.setProperty('display','block','important');
        g.style.setProperty('visibility','visible','important');
      }
    }

    function setMode(mode,opts){
      opts=opts || {};
      state.mode=mode;
      if(opts.kind) state.questKind=opts.kind;
      fixFrameUrl();
      clearModeClasses();
      document.body.classList.add(mode);

      const d=dock();
      if(d){
        d.classList.remove('hidden');
        d.classList.add('fullscreen');
      }

      if(mode==='petbot'){
        clearQuestHeartbeat();
        document.body.classList.add('petbotOpen','waaFs40Petbot');
        postPetbot({type:'waa-parent-show-petbot-home'});
        return true;
      }

      if(mode==='buildingPetbot'){
        rememberQuest();
        document.body.classList.add('petbotOpen','waaFs40Petbot');
        if(opts.screen){
          postPetbot({
            type:'waa-parent-open-screen',
            screen:opts.screen,
            place:opts.place || '',
            label:opts.label || '',
            returnToQuest:true,
            returnMode:state.returnMode
          });
        }
        return true;
      }

      writeQuestHeartbeat();
      setGameFixed(true);

      if(mode==='questEmbedded'){
        document.documentElement.classList.add('waaFs40Lock');
        document.body.classList.add('waaFs40Lock','petbotOpen','tamaGameEmbedded','tamaLiteRender33','waaFs40Embedded');
        try{ if(typeof window.fitEmbeddedTamaGame==='function') window.fitEmbeddedTamaGame(); }catch(e){}
        postPetbot({type:'waa-parent-quest-active',mode:'embedded',kind:state.questKind,t:Date.now()});
        return true;
      }

      if(mode==='questFullscreen'){
        document.documentElement.classList.add('waaFs40Lock');
        document.body.classList.add('waaFs40Lock','gameExpandedFromTama','waaFs40Expanded');
        if(d) d.classList.add('hidden');
        try{ if(typeof window.fitGameToScreen==='function') window.fitGameToScreen(); }catch(e){}
        postPetbot({type:'waa-parent-quest-active',mode:'expanded',kind:state.questKind,t:Date.now()});
        return true;
      }
    }

    function startQuest(kind){
      state.questKind=kind || (document.body.classList.contains('teamMode')?'team':'solo');
      try{ if(typeof window.startPlaying==='function') window.startPlaying(state.questKind); }catch(e){}
      try{ if(typeof window.preloadAllGameSprites==='function') window.preloadAllGameSprites(); }catch(e){}
      return setMode('questEmbedded',{kind:state.questKind});
    }

    function expandQuest(){
      if(state.mode!=='questEmbedded' && !document.body.classList.contains('waaFs40Embedded') && !document.body.classList.contains('tamaGameEmbedded')){
        return setMode('petbot');
      }
      return setMode('questFullscreen');
    }

    function returnQuest(){return setMode('questEmbedded',{kind:state.questKind});}

    function stopQuest(){
      clearQuestHeartbeat();
      try{ if(typeof window.stage27SetMovingClass==='function') window.stage27SetMovingClass(false); }catch(e){}
      try{ if(window.keys){window.keys.left=false;window.keys.right=false;} }catch(e){}
      return setMode('petbot');
    }

    function petbotAction(action){
      if(action==='startSoloEmbedded' || action==='startPlatformEmbedded') return startQuest('solo');
      if(action==='startTeamEmbedded') return startQuest('team');
      if(action==='expandEmbedded') return expandQuest();
      if(action==='returnToQuest' || action==='resumeQuest') return returnQuest();
      if(action==='stopEmbedded') return stopQuest();
      if(['moveLeft','moveRight','moveLeftStart','moveRightStart','moveStop','jump','jumpOnly','selectOrJump'].indexOf(action)>-1){
        try{ if(typeof window.tapEmbeddedControl==='function') return window.tapEmbeddedControl(action); }catch(e){}
      }
      return false;
    }

    function placeToScreen(place){
      if(place==='petShop') return 'shop';
      if(place==='habitat') return 'habitat';
      if(place==='hookWaaambulance') return 'hook';
      if(place==='questStarter') return 'games';
      if(place==='welcomeBoard') return 'welcomeBoard';
      return 'petActions';
    }

    const oldOpenBuilding=window.openBuilding;
    window.openBuilding=function(o){
      if(o && o.kind==='building' && (state.mode==='questEmbedded' || state.mode==='questFullscreen')){
        return setMode('buildingPetbot',{screen:placeToScreen(o.place),place:o.place,label:o.label || o.place || 'Building'});
      }
      return oldOpenBuilding ? oldOpenBuilding.apply(this,arguments) : false;
    };

    window.WaaBridge={state,setMode,startQuest,expandQuest,returnQuest,stopQuest,petbotAction};
    window.startEmbeddedTamaGame=function(kind){return startQuest(kind || 'solo');};
    window.stopEmbeddedTamaGame=function(){return stopQuest();};
    window.expandEmbeddedTamaGame=function(){return expandQuest();};
    window.stage37ReturnExpandedQuestToTamagotchi=function(){return returnQuest();};
    window.waaResumeQuestFromPetbot=function(){return returnQuest();};
    window.openPetbotFull=function(){
      if(state.mode==='questEmbedded') return expandQuest();
      if(state.mode==='questFullscreen') return returnQuest();
      return setMode('petbot');
    };
    window.closePetbotFull=function(){return setMode('petbot');};
    window.handlePetbotGameAction=function(action){return petbotAction(action);};

    window.addEventListener('message',function(e){
      if(e.origin!==location.origin) return;
      const msg=e.data || {};
      if(msg.type==='waa-petbot-game-action') petbotAction(msg.action);
      if(msg.type==='waa-petbot-toggle-fullscreen'){
        if(state.mode==='questEmbedded') expandQuest();
        else if(state.mode==='questFullscreen') returnQuest();
        else setMode('petbot');
      }
      if(msg.type==='waa-petbot-close') setMode('petbot');
      if(msg.type==='waa-parent-return-to-quest') returnQuest();
    },true);

    window.addEventListener('keydown',function(e){
      if(e.key==='Escape' && state.mode==='questFullscreen'){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
        returnQuest();
      }
    },true);

    setInterval(function(){
      if(state.mode==='questEmbedded' || state.mode==='questFullscreen'){
        writeQuestHeartbeat();
        postPetbot({
          type:'waa-parent-quest-active',
          mode:state.mode==='questFullscreen'?'expanded':'embedded',
          kind:state.questKind,
          t:Date.now()
        });
      }
    },700);

    try{localStorage.removeItem('waaQuestActive');}catch(e){}
    setTimeout(function(){
      fixFrameUrl();
      if(!document.body.classList.contains('waaFs40Embedded') && !document.body.classList.contains('waaFs40Expanded')) setMode('petbot');
    },0);
  }

  function startPetbotBridge(){
    function installQuestCss(){
      if(document.getElementById('waa-bridge-quest-css')) return;
      const style=document.createElement('style');
      style.id='waa-bridge-quest-css';
      style.textContent=[
        'html.questPlaying,body.questPlaying,body.questPlaying #app,body.questPlaying .device,body.questPlaying .lcd,body.questPlaying .questGameGlass{background:transparent!important;box-shadow:none!important;}',
        'body.questPlaying .device::after,body.questPlaying .lcd::before,body.questPlaying .lcd::after,body.questPlaying .questGameGlass{display:none!important;}',
        'body.questPlaying .top,body.questPlaying .body{display:none!important;}',
        'body.questPlaying .hit{display:block!important;pointer-events:auto!important;}'
      ].join('\n');
      document.head.appendChild(style);
    }

    function forceQuestControls(mode){
      try{
        writeQuestHeartbeat();
        if(window.__petbotBridgeApi && typeof window.__petbotBridgeApi.forceQuestControls==='function'){
          window.__petbotBridgeApi.forceQuestControls(mode);
          return;
        }
        document.documentElement.classList.add('questPlaying');
        document.body.classList.add('questPlaying');
      }catch(e){}
    }

    function showRealPetbotHome(){
      try{
        clearQuestHeartbeat();
        if(window.__petbotBridgeApi && typeof window.__petbotBridgeApi.showRealPetbotHome==='function'){
          window.__petbotBridgeApi.showRealPetbotHome();
          return;
        }
        document.documentElement.classList.remove('cssFullscreen','questPlaying');
        document.body.classList.remove('cssFullscreen','questPlaying');
      }catch(e){}
    }

    function parentHasQuestClass(){
      try{
        if(parent && parent!==window && parent.document){
          const b=parent.document.body;
          return !!(b && (
            b.classList.contains('questEmbedded') ||
            b.classList.contains('questFullscreen') ||
            b.classList.contains('waaFs40Embedded') ||
            b.classList.contains('waaFs40Expanded') ||
            b.classList.contains('tamaGameEmbedded') ||
            b.classList.contains('gameExpandedFromTama')
          ));
        }
      }catch(e){}
      return false;
    }

    function parentQuestLocked(){return recentQuestHeartbeat() || parentHasQuestClass();}

    window.WaaBridge={forceQuestControls,showRealPetbotHome,parentQuestLocked};
    installQuestCss();

    window.addEventListener('message',function(e){
      if(e.origin!==location.origin) return;
      const d=e.data || {};
      if(d.type==='waa-parent-quest-active'){
        forceQuestControls(d.mode==='expanded'?'Expanded Quest':'Solo Quest');
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      if(d.type==='waa-parent-show-petbot-home'){
        if(parentQuestLocked()) forceQuestControls();
        else showRealPetbotHome();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
    },true);

    setInterval(function(){
      try{
        const inQuest=!!(window.__petbotBridgeApi && window.__petbotBridgeApi.isQuest && window.__petbotBridgeApi.isQuest());
        if(parentQuestLocked() && !inQuest) forceQuestControls();
      }catch(e){}
    },500);

    try{localStorage.removeItem('waaQuestActive');}catch(e){}
  }

  if(isParentPage()) startParentBridge();
  else if(isPetbotPage()) startPetbotBridge();
})();
