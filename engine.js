// engine.js
(function() {
  // 🔥 state теперь содержит флаг started
  let state = { hp:100, gold:0, lvl:1, view:'intro', started:false, map:{current:'n1', visited:['n1'], unlocked:['n2','n3']} };
  let currentIntroPage = 0;

  // 🎮 Управление
  function startGame() { 
    if(!state.started){ 
      state={hp:100,gold:0,lvl:1,view:'intro',started:true,map:{current:'n1',visited:['n1'],unlocked:['n2','n3']}}; 
    } 
    switchUI('game'); updateStatsUI(); showIntro(false); 
  }
  function continueGame() { 
    loadState(); 
    switchUI('game'); updateStatsUI();
    if(state.view==='intro') showIntro(true); 
    else if(state.view==='map') renderMap(); 
    else if(state.view==='event' && MAP_DATA[state.lastEvent]) resolveNode(MAP_DATA[state.lastEvent]);
  }
  function resetGame() { 
    if(confirm('⚠️ Удалить прогресс?')){ 
      localStorage.removeItem('rpg_save'); 
      state={hp:100,gold:0,lvl:1,view:'intro',started:false,map:{current:'n1',visited:['n1'],unlocked:['n2','n3']}}; 
      switchUI('menu'); updateContinue(); 
    } 
  }
  function showMenu() { if(confirm('⏸️ В главное меню? Прогресс сохранён.')){ switchUI('menu'); updateContinue(); } }
  function switchUI(mode){ document.getElementById('start-menu').style.display=mode==='menu'?'block':'none'; document.getElementById('game-ui').style.display=mode==='game'?'block':'none'; }
  function updateContinue(){ document.getElementById('continue-btn').style.display=localStorage.getItem('rpg_save')?'block':'none'; }

  // 📊 UI
  function updateStatsUI() {
    document.getElementById('hp').textContent = state.hp;
    document.getElementById('gold').textContent = state.gold;
    document.getElementById('lvl').textContent = state.lvl;
  }

  // 🎬 Интро
  function showIntro(isResume=false) {
    currentIntroPage = isResume ? (state.introPage || 0) : 0;
    state.view = 'intro'; hideAllViews();
    document.getElementById('intro-view').style.display = 'block';
    renderIntroPage(); saveState();
  }
  function renderIntroPage() {
    const page = INTRO_DATA[currentIntroPage];
    document.getElementById('intro-text').innerText = page.text;
    const imgEl = document.getElementById('intro-image');
    if (page.image) { imgEl.src = page.image; imgEl.style.display = 'block'; } 
    else { imgEl.style.display = 'none'; }
    document.getElementById('intro-page-indicator').innerText = `${currentIntroPage + 1} / ${INTRO_DATA.length}`;
  }
  function nextIntroPage() {
    currentIntroPage++;
    if (currentIntroPage < INTRO_DATA.length) {
      state.introPage = currentIntroPage; saveState(); renderIntroPage();
    } else {
      state.view = 'map'; delete state.introPage; saveState();
      hideAllViews(); document.getElementById('map-view').style.display = 'block'; renderMap();
    }
  }
  function hideAllViews() { ['map-view','event-view','intro-view'].forEach(id => document.getElementById(id).style.display='none'); }

  // 🗺️ Карта с Fog of War
  function renderMap(){
    state.view='map'; hideAllViews();
    document.getElementById('map-view').style.display='block';
    const grid=document.getElementById('map-grid'); grid.innerHTML='';
    
    // 🔥 Рендерим ТОЛЬКО известные узлы
    Object.values(MAP_DATA).forEach(node=>{
      const isKnown = state.map.visited.includes(node.id) || state.map.unlocked.includes(node.id);
      if (!isKnown) return; // Скрыт в тумане войны

      const el=document.createElement('div'); el.className='map-node';
      const status = state.map.current===node.id ? 'current' : 
                     state.map.unlocked.includes(node.id) ? 'available' : 'visited';
      el.classList.add(status);
      el.innerHTML=`<span class="node-icon">${node.icon}</span><div class="node-label">${node.label}</div><div class="node-status">${status==='current'?'Вы здесь':status==='available'?'Доступно':'Пройдено'}</div>`;
      el.onclick = () => enterNode(node.id);
      grid.appendChild(el);
    });
  }

  function enterNode(id){
    const node=MAP_DATA[id];
    state.map.current=id;
    if(!state.map.visited.includes(id)) state.map.visited.push(id);
    state.map.unlocked=[...new Set([...state.map.unlocked, ...node.connections])];
    state.lastEvent=id;
    resolveNode(node);
  }

  function resolveNode(node){
    state.view='event'; hideAllViews();
    document.getElementById('event-view').style.display='block';
    const txt=document.getElementById('event-text');
    const acts=document.getElementById('event-actions');
    let log=`[${node.icon}] ${node.label}\n`;
    let actions=[];

    if(node.type==='combat'||node.type==='boss'){
      const maxDmg=node.enemy.atk+Math.floor(Math.random()*5);
      const survived=state.hp>maxDmg;
      state.hp-=maxDmg;
      log+=`⚔️ Бой. -${maxDmg} HP.\n`;
      if(survived){
        log+=`🏆 Победа. +${node.reward.gold} 🪙`; state.gold+=node.reward.gold;
        if(node.reward.lvl){ state.lvl+=node.reward.lvl; log+=` | +${node.reward.lvl} ⭐`; }
        actions.push({text:'✅ Дальше', next:'map'});
      } else { log+=`💀 Вы погибли.`; actions.push({text:'🔄 Перезапуск', next:'death'}); }
    }
    else if(node.type==='loot'){
      log+=`📦 Найдено: +${node.loot.gold} 🪙`; state.gold+=node.loot.gold;
      actions.push({text:'📥 Забрать', next:'map'});
    }
    else if(node.type==='rest'){
      const healed=Math.min(node.heal, 100-state.hp);
      log+=`🔥 Отдых. +${healed} ❤️`; state.hp+=healed;
      actions.push({text:'🛌 Встать', next:'map'});
    }
    else if(node.type==='risk'){
      if(Math.random()<node.chance){
        log+=`✨ Удача! +${node.reward.gold} 🪙`; state.gold+=node.reward.gold;
        if(node.reward.lvl){ state.lvl+=node.reward.lvl; log+=` | +${node.reward.lvl} ⭐`; }
      } else {
        log+=`⚡ Неудача. -${node.penalty.hp} ❤️`; state.hp-=node.penalty.hp;
        if(state.hp<=0){ log+='\n💀 Смерть.'; actions.push({text:'🔄 Перезапуск', next:'death'}); }
      }
      if(!actions.length) actions.push({text:'✅ Дальше', next:'map'});
    }
    else { log+='🌄 Точка старта.'; actions.push({text:'🗺️ К карте', next:'map'}); }

    txt.innerText=log;
    acts.innerHTML='';
    actions.forEach(a=>{
      const btn=document.createElement('button');
      btn.className='event-btn';
      btn.textContent=a.text;
      btn.onclick=()=> {
        if(a.next==='map') renderMap(); else resetGame();
        updateStatsUI(); saveState();
      };
      acts.appendChild(btn);
    });
  }

  // 💾 Сохранение (защита от ошибок мобильных браузеров)
  function saveState(){ 
    try { localStorage.setItem('rpg_save', JSON.stringify(state)); } 
    catch(e) { console.warn('Save failed:', e); }
  }
  function loadState(){ 
    try {
      const s=localStorage.getItem('rpg_save'); 
      if(s) { state={...state, ...JSON.parse(s), started:true}; }
    } catch(e) { console.warn('Load failed:', e); }
  }

  // 🌟 Экспорт
  window.RPG = { startGame, continueGame, resetGame, showMenu, nextIntroPage };
})();

// 🎬 Инициализация (теперь опирается на saved state, а не на переменную)
document.addEventListener('DOMContentLoaded', ()=>{
  updateContinue(); loadState(); updateStatsUI();
  if(state.started) {
    switchUI('game');
    if(state.view==='map') renderMap();
    else if(state.view==='intro') showIntro(true);
    else if(state.view==='event' && MAP_DATA[state.lastEvent]) resolveNode(MAP_DATA[state.lastEvent]);
  }
});
