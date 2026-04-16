// engine.js
(function() {
  let state = { hp:100, gold:0, lvl:1, view:'intro', map:{current:'n1', visited:['n1'], unlocked:['n2','n3']} };
  let gameStarted = false;
  let currentIntroPage = 0;

  // 🎮 Управление
  function startGame() { 
    if(!gameStarted){ 
      state={hp:100,gold:0,lvl:1,view:'intro',map:{current:'n1',visited:['n1'],unlocked:['n2','n3']}}; 
      saveState(); 
    } 
    gameStarted=true; 
    switchUI('game'); 
    showIntro(); 
  }
  function continueGame() { 
    loadState(); 
    gameStarted=true; 
    switchUI('game'); 
    // Если сохранение в интро, продолжаем, иначе сразу карта
    if(state.view==='intro') showIntro(true); 
    else if(state.view==='map') renderMap(); 
    else showEvent(state.lastEvent||'n1'); 
  }
  function resetGame() { if(confirm('⚠️ Удалить прогресс?')){ localStorage.removeItem('rpg_save'); state={hp:100,gold:0,lvl:1,view:'intro',map:{current:'n1',visited:['n1'],unlocked:['n2','n3']}}; gameStarted=false; switchUI('menu'); updateContinue(); } }
  function showMenu() { if(confirm('⏸️ В главное меню? Прогресс сохранён.')){ switchUI('menu'); updateContinue(); } }
  function switchUI(mode){ document.getElementById('start-menu').style.display=mode==='menu'?'block':'none'; document.getElementById('game-ui').style.display=mode==='game'?'block':'none'; }
  function updateContinue(){ document.getElementById('continue-btn').style.display=localStorage.getItem('rpg_save')?'block':'none'; }

  // 🎬 Логика интро
  function showIntro(isResume=false) {
    currentIntroPage = isResume ? (state.introPage || 0) : 0;
    state.view = 'intro';
    hideAllViews();
    document.getElementById('intro-view').style.display = 'block';
    renderIntroPage();
    saveState();
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
      state.introPage = currentIntroPage;
      saveState();
      renderIntroPage();
    } else {
      state.view = 'map';
      delete state.introPage;
      saveState();
      hideAllViews();
      document.getElementById('map-view').style.display = 'block';
      renderMap();
    }
  }

  function hideAllViews() {
    ['map-view','event-view','intro-view'].forEach(id => document.getElementById(id).style.display='none');
  }

  // 🗺️ Логика карты
function renderMap(){
  state.view='map';
  hideAllViews();
  document.getElementById('map-view').style.display='block';
  const grid=document.getElementById('map-grid'); grid.innerHTML='';
  
  // 🔥 Показываем как доступные: текущие + разблокированные + посещённые (для возврата)
  Object.values(MAP_DATA).forEach(node=>{
    const el=document.createElement('div'); el.className='map-node';
    const status = state.map.current===node.id ? 'current' : 
                   state.map.unlocked.includes(node.id) ? 'available' :
                   state.map.visited.includes(node.id) ? 'visited' : 'locked';
    el.classList.add(status);
    el.innerHTML=`<span class="node-icon">${node.icon}</span><div class="node-label">${node.label}</div><div class="node-status">${status==='current'?'Вы здесь':status==='available'?'Доступно':status==='visited'?'Пройдено':'Заблокировано'}</div>`;
    // 🔥 Теперь можно кликать на available И visited
    if(status==='available' || status==='visited'){ el.onclick=()=>enterNode(node.id); }
    grid.appendChild(el);
  });
  saveState();
}

function enterNode(id){
  const node=MAP_DATA[id];
  state.map.current=id;
  if(!state.map.visited.includes(id)) state.map.visited.push(id);
  // 🔥 НЕ фильтруем visited из unlocked — можно возвращаться
  state.map.unlocked=[...new Set([...state.map.unlocked, ...node.connections])];
  state.lastEvent=id;
  resolveNode(node);
}

  function resolveNode(node){
    state.view='event';
    hideAllViews();
    document.getElementById('event-view').style.display='block';
    
    const txt=document.getElementById('event-text');
    const acts=document.getElementById('event-actions');
    let log=`[${node.icon}] ${node.label}\n`;
    let actions=[];

    if(node.type==='combat'||node.type==='boss'){
      const dmg=node.enemy.atk;
      const maxDmg=dmg+Math.floor(Math.random()*5);
      const survived=state.hp>maxDmg;
      state.hp-=maxDmg;
      log+=`⚔️ Бой. Получено ${maxDmg} урона.\n`;
      if(survived){
        log+=`🏆 Победа. +${node.reward.gold} золота.`;
        state.gold+=node.reward.gold;
        if(node.reward.lvl){ state.lvl+=node.reward.lvl; log+=` +${node.reward.lvl} уровень.`; }
        actions.push({text:'✅ Продолжить', next:'map'});
      } else { log+=`💀 Вы погибли.`; actions.push({text:'🔄 Перезапуск', next:'death'}); }
    }
    else if(node.type==='loot'){
      log+=`📦 Найдено: +${node.loot.gold} золота.`; state.gold+=node.loot.gold;
      actions.push({text:'📥 Забрать', next:'map'});
    }
    else if(node.type==='rest'){
      log+=`🔥 Отдых. Восстановлено ${Math.min(node.heal, 100-state.hp)} HP.`;
      state.hp=Math.min(100, state.hp+node.heal);
      actions.push({text:'🛌 Встать', next:'map'});
    }
    else if(node.type==='risk'){
      const success=Math.random()<node.chance;
      if(success){
        log+=`✨ Удача! +${node.reward.gold} золота`; state.gold+=node.reward.gold;
        if(node.reward.lvl){ state.lvl+=node.reward.lvl; log+=`, +${node.reward.lvl} уровень`; }
        log+='.';
      } else {
        log+=`⚡ Риск не оправдался. -${node.penalty.hp} HP.`; state.hp-=node.penalty.hp;
        if(state.hp<=0){ log+='\n💀 Смерть.'; actions.push({text:'🔄 Перезапуск', next:'death'}); }
      }
      if(!actions.length) actions.push({text:'✅ Дальше', next:'map'});
    }
    else if(node.type==='start'){ log+='🌄 Точка старта.'; actions.push({text:'🗺️ К карте', next:'map'}); }

    txt.innerText=log;
    acts.innerHTML='';
    actions.forEach(a=>{
      const btn=document.createElement('button');
      btn.className='event-btn';
      btn.textContent=a.text;
      btn.onclick=()=> a.next==='map' ? renderMap() : resetGame();
      acts.appendChild(btn);
    });
    saveState();
  }

  // 💾 Сохранение
  function saveState(){ localStorage.setItem('rpg_save', JSON.stringify(state)); }
  function loadState(){ const s=localStorage.getItem('rpg_save'); if(s) state={...state, ...JSON.parse(s)}; }

  // 🌟 Экспорт
  window.RPG = { startGame, continueGame, resetGame, showMenu, nextIntroPage };
})();

// 🎬 Автоинициализация
document.addEventListener('DOMContentLoaded', ()=>{
  updateContinue();
  loadState();
  if(gameStarted) { switchUI('game'); if(state.view==='map') renderMap(); else if(state.view==='intro') showIntro(true); else showEvent(state.lastEvent||'n1'); }
});
