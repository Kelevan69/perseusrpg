// engine.js
(function() {
  // 🧠 Состояние
  let state = { hp:100, gold:0, lvl:1, view:'map', map:{current:'n1', visited:['n1'], unlocked:['n2','n3']} };
  let gameStarted = false;

  // 🎮 Управление
  function startGame() { 
    if(!gameStarted){ state={hp:100,gold:0,lvl:1,view:'map',map:{current:'n1',visited:['n1'],unlocked:['n2','n3']}}; saveState(); } 
    gameStarted=true; switchUI('game'); renderMap(); 
  }
  function continueGame() { loadState(); gameStarted=true; switchUI('game'); state.view==='map' ? renderMap() : showEvent(state.lastEvent||'n1'); }
  function resetGame() { if(confirm('⚠️ Удалить прогресс?')){ localStorage.removeItem('rpg_save'); state={hp:100,gold:0,lvl:1,view:'map',map:{current:'n1',visited:['n1'],unlocked:['n2','n3']}}; gameStarted=false; switchUI('menu'); updateContinue(); } }
  function showMenu() { if(confirm('⏸️ В главное меню? Прогресс сохранён.')){ switchUI('menu'); updateContinue(); } }
  function switchUI(mode){ document.getElementById('start-menu').style.display=mode==='menu'?'block':'none'; document.getElementById('game-ui').style.display=mode==='game'?'block':'none'; }
  function updateContinue(){ document.getElementById('continue-btn').style.display=localStorage.getItem('rpg_save')?'block':'none'; }

  // 🗺️ Логика карты
  function renderMap(){
    state.view='map';
    const grid=document.getElementById('map-grid'); grid.innerHTML='';
    document.getElementById('map-view').style.display='block';
    document.getElementById('event-view').style.display='none';
    
    Object.values(MAP_DATA).forEach(node=>{
      const el=document.createElement('div'); el.className='map-node';
      const status = state.map.current===node.id ? 'current' : 
                     state.map.visited.includes(node.id) ? 'visited' :
                     state.map.unlocked.includes(node.id) ? 'available' : 'locked';
      el.classList.add(status);
      el.innerHTML=`<span class="node-icon">${node.icon}</span><div class="node-label">${node.label}</div><div class="node-status">${status==='current'?'Вы здесь':status==='available'?'Доступно':status==='visited'?'Пройдено':'Заблокировано'}</div>`;
      if(status==='available'){ el.onclick=()=>enterNode(node.id); }
      grid.appendChild(el);
    });
    saveState();
  }

  function enterNode(id){
    const node=MAP_DATA[id];
    state.map.current=id;
    if(!state.map.visited.includes(id)) state.map.visited.push(id);
    state.map.unlocked=[...new Set([...state.map.unlocked, ...node.connections])].filter(n=>!state.map.visited.includes(n));
    state.lastEvent=id;
    resolveNode(node);
  }

  function resolveNode(node){
    state.view='event';
    const txt=document.getElementById('event-text');
    const acts=document.getElementById('event-actions');
    document.getElementById('map-view').style.display='none';
    document.getElementById('event-view').style.display='block';
    
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
      } else {
        log+=`💀 Вы погибли. Сессия сброшена.`;
        actions.push({text:'🔄 Перезапуск', next:'death'});
      }
    }
    else if(node.type==='loot'){
      log+=`📦 Найдено: +${node.loot.gold} золота.`;
      state.gold+=node.loot.gold;
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
        log+=`✨ Удача! +${node.reward.gold} золота`;
        state.gold+=node.reward.gold;
        if(node.reward.lvl){ state.lvl+=node.reward.lvl; log+=`, +${node.reward.lvl} уровень`; }
        log+='.';
      } else {
        log+=`⚡ Риск не оправдался. -${node.penalty.hp} HP.`;
        state.hp-=node.penalty.hp;
        if(state.hp<=0){ log+='\n💀 Смерть.'; actions.push({text:'🔄 Перезапуск', next:'death'}); }
      }
      if(!actions.length) actions.push({text:'✅ Дальше', next:'map'});
    }
    else if(node.type==='start'){
      log+='🌄 Точка старта. Куда дальше?';
      actions.push({text:'🗺️ К карте', next:'map'});
    }

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

  // 🌟 Экспорт в глобальную область для вызова из HTML
  window.RPG = { startGame, continueGame, resetGame, showMenu };
})();

// 🎬 Автоинициализация
document.addEventListener('DOMContentLoaded', ()=>{
  updateContinue();
  loadState();
  if(gameStarted) { switchUI('game'); state.view==='map' ? renderMap() : showEvent(state.lastEvent||'n1'); }
});
