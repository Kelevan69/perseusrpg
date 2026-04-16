// data/map.js
const MAP_DATA = {
  n1: { id:'n1', type:'start', label:'Окраины', icon:'🌄', connections:['n2','n3'] },
  n2: { id:'n2', type:'combat', label:'Засада', icon:'⚔️', enemy:{hp:30, atk:6}, reward:{gold:15}, connections:['n4'] },
  n3: { id:'n3', type:'loot', label:'Склад', icon:'📦', loot:{gold:20}, connections:['n4'] },
  n4: { id:'n4', type:'rest', label:'Костёр', icon:'🔥', heal:25, connections:['n5'] },
  n5: { id:'n5', type:'risk', label:'Разлом', icon:'🌪️', chance:0.6, reward:{gold:40,lvl:1}, penalty:{hp:30}, connections:['n6'] },
  n6: { id:'n6', type:'boss', label:'Врата', icon:'👹', enemy:{hp:80, atk:12}, reward:{gold:100,lvl:2}, connections:[] }
};
