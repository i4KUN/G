const API_URL = "https://script.google.com/macros/s/AKfycbwLolmGWd8se90_sVHYI5MMV6aX26sJynJdtUtT8LCbdYM8LeAw2SS7ncbPllraMxyh/exec";

'use strict';

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const panel = document.getElementById('panel');
const toast = document.getElementById('toast');

const WORLD_COLS = 500;
const WORLD_ROWS = 500;
const CELL = 180;
const MINI = 6;
const SAVE_KEY = 'GameNjd_v01_world';
const USER_KEY = 'GameNjd_v01_user';
const USERS_KEY = 'GameNjd_v01_users';

let zoom = 0.7;
let camX = 0;
let camY = 0;
let gridOpacity = 0.45;
let selectedTile = null;
let activeLayer = 1;
let brushSize = 1;
let eraser = false;
let blockingMode = false;
let walkMode = false;
let isDown = false;
let lastPaintKey = '';
let selectedIds = new Set();
let selectionBox = null;
let dragMode = null;
let dragStart = null;
let copyBuffer = [];
let undoStack = [];
let currentUser = localStorage.getItem(USER_KEY) || '';

let world = loadWorld();
let player = { x: 100, y: 100, speed: 4, dir: 'down' };
const keys = {};

const categories = {
  kitchen: {
    name: 'المطبخ',
    tiles: [
      { id: 'kitchen_table_01', name: 'طاولة', icon: '▰', w: 80, h: 52, size: 'medium', color: '#a16207' },
      { id: 'kitchen_chair_01', name: 'كرسي', icon: '▣', w: 38, h: 38, size: 'small', color: '#92400e' },
      { id: 'kitchen_plate_01', name: 'صحن', icon: '○', w: 24, h: 24, size: 'smaller', color: '#e5e7eb' },
      { id: 'kitchen_wall_01', name: 'جدار', icon: '▌', w: 24, h: 120, size: 'large', color: '#6b7280' }
    ]
  },
  bedroom: {
    name: 'غرفة النوم',
    tiles: [
      { id: 'bedroom_bed_01', name: 'سرير', icon: '▰', w: 95, h: 65, size: 'large', color: '#7c3aed' },
      { id: 'bedroom_book_01', name: 'كتاب', icon: '▤', w: 20, h: 16, size: 'smaller', color: '#ef4444' },
      { id: 'bedroom_lamp_01', name: 'مصباح', icon: '●', w: 24, h: 42, size: 'small', color: '#facc15' }
    ]
  },
  living: {
    name: 'الصالة',
    tiles: [
      { id: 'living_sofa_01', name: 'كنبة', icon: '▰', w: 100, h: 48, size: 'large', color: '#2563eb' },
      { id: 'living_carpet_01', name: 'سجادة', icon: '▬', w: 120, h: 82, size: 'large', color: '#db2777' },
      { id: 'living_tv_01', name: 'تلفاز', icon: '▭', w: 65, h: 38, size: 'medium', color: '#111827' }
    ]
  },
  build: {
    name: 'بناء',
    tiles: [
      { id: 'build_floor_01', name: 'أرضية', icon: '□', w: 64, h: 64, size: 'medium', color: '#374151' },
      { id: 'build_wall_h_01', name: 'جدار أفقي', icon: '━', w: 130, h: 22, size: 'large', color: '#64748b' },
      { id: 'build_wall_v_01', name: 'جدار عمودي', icon: '┃', w: 22, h: 130, size: 'large', color: '#64748b' },
      { id: 'build_door_01', name: 'باب', icon: '▯', w: 55, h: 18, size: 'medium', color: '#78350f' }
    ]
  }
};
const tileMap = Object.fromEntries(Object.values(categories).flatMap(c => c.tiles.map(t => [t.id, t])));

function loadWorld() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
  catch { return {}; }
}
function saveWorld() { localStorage.setItem(SAVE_KEY, JSON.stringify(world)); }
function pushUndo() {
  undoStack.push(JSON.stringify(world));
  if (undoStack.length > 80) undoStack.shift();
}
function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.style.display = 'none', 1800);
}
function resize() {
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.max(300, r.width * devicePixelRatio);
  canvas.height = Math.max(300, r.height * devicePixelRatio);
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener('resize', resize);
resize();

function colName(n) {
  let s = '';
  while (n > 0) { let m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function parseCell(ref) {
  const m = String(ref).trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  const row = Number(m[2]);
  if (col < 1 || col > WORLD_COLS || row < 1 || row > WORLD_ROWS) return null;
  return { col, row, key: `${colName(col)}${row}` };
}
function worldToScreen(x,y){ return { x:(x-camX)*zoom, y:(y-camY)*zoom }; }
function screenToWorld(x,y){ return { x:x/zoom+camX, y:y/zoom+camY }; }
function cellFromWorld(x,y){
  const col = Math.floor(x / CELL) + 1;
  const row = Math.floor(y / CELL) + 1;
  if (col < 1 || row < 1 || col > WORLD_COLS || row > WORLD_ROWS) return null;
  return { col, row, key: `${colName(col)}${row}`, x: (col-1)*CELL, y: (row-1)*CELL };
}
function getItems() { return Object.values(world).flatMap(c => c.items || []); }
function itemRect(item) {
  const cell = parseCell(item.cell);
  return { x:(cell.col-1)*CELL+item.x, y:(cell.row-1)*CELL+item.y, w:item.w, h:item.h };
}
function currentOwner(){ return currentUser || 'local-device'; }
function canEditCell(key) {
  const c = world[key];
  return !c || !c.owner || c.owner === currentOwner();
}
function ensureCell(key) {
  world[key] ||= { owner: currentOwner(), items: [] };
  world[key].owner ||= currentOwner();
  return world[key];
}

function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#0b1120'; ctx.fillRect(0,0,w,h);

  const startCol = Math.max(1, Math.floor(camX / CELL) + 1);
  const endCol = Math.min(WORLD_COLS, Math.ceil((camX + w/zoom) / CELL) + 1);
  const startRow = Math.max(1, Math.floor(camY / CELL) + 1);
  const endRow = Math.min(WORLD_ROWS, Math.ceil((camY + h/zoom) / CELL) + 1);

  ctx.lineWidth = 1;
  for (let c=startCol; c<=endCol; c++) {
    for (let r=startRow; r<=endRow; r++) {
      const sx = ((c-1)*CELL - camX) * zoom;
      const sy = ((r-1)*CELL - camY) * zoom;
      const size = CELL * zoom;
      ctx.strokeStyle = `rgba(147,197,253,${gridOpacity})`;
      ctx.strokeRect(sx, sy, size, size);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `${Math.max(10, 13*zoom)}px Arial`;
      ctx.fillText(`${colName(c)}${r}`, sx + 6, sy + 16);
      ctx.strokeStyle = `rgba(255,255,255,${gridOpacity * 0.28})`;
      for (let i=1; i<MINI; i++) {
        ctx.beginPath(); ctx.moveTo(sx+i*size/MINI, sy); ctx.lineTo(sx+i*size/MINI, sy+size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy+i*size/MINI); ctx.lineTo(sx+size, sy+i*size/MINI); ctx.stroke();
      }
    }
  }

  const visibleItems = getItems().sort((a,b) => a.layer - b.layer);
  for (const item of visibleItems) {
    const r = itemRect(item);
    const p = worldToScreen(r.x, r.y);
    const t = tileMap[item.tileId] || {};
    ctx.fillStyle = t.color || '#94a3b8';
    ctx.fillRect(p.x, p.y, r.w*zoom, r.h*zoom);
    ctx.strokeStyle = item.blocking ? '#ef4444' : '#e5e7eb';
    ctx.strokeRect(p.x, p.y, r.w*zoom, r.h*zoom);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(11, 18*zoom)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t.icon || '?', p.x + r.w*zoom/2, p.y + r.h*zoom/2);
    if (selectedIds.has(item.uid)) {
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
      ctx.strokeRect(p.x-3, p.y-3, r.w*zoom+6, r.h*zoom+6);
      ctx.lineWidth = 1;
    }
  }
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';

  if (selectionBox) {
    ctx.strokeStyle = '#22c55e'; ctx.setLineDash([5,5]);
    ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
    ctx.setLineDash([]);
  }

  if (walkMode) drawPlayer();
  requestAnimationFrame(draw);
}
function drawPlayer(){
  const p = worldToScreen(player.x, player.y);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath(); ctx.arc(p.x, p.y, 15*zoom, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#052e16'; ctx.fillRect(p.x-7*zoom, p.y-4*zoom, 14*zoom, 18*zoom);
}
requestAnimationFrame(draw);

function initUI(){
  const cat = document.getElementById('categorySelect');
  cat.innerHTML = Object.entries(categories).map(([id,c]) => `<option value="${id}">${c.name}</option>`).join('');
  cat.onchange = renderTiles;
  renderTiles();
  document.getElementById('gridOpacity').oninput = e => gridOpacity = Number(e.target.value);
  document.getElementById('brushSize').oninput = e => brushSize = Number(e.target.value);
  document.getElementById('layerInput').oninput = e => activeLayer = Number(e.target.value || 1);
  document.getElementById('elementsTab').onclick = () => switchTab('elements');
  document.getElementById('layersTab').onclick = () => switchTab('layers');
  document.getElementById('eraseBtn').onclick = () => { eraser = !eraser; document.getElementById('eraseBtn').textContent = `ممحاة: ${eraser?'تشغيل':'إيقاف'}`; };
  document.getElementById('blockBtn').onclick = () => { blockingMode = !blockingMode; document.getElementById('blockBtn').textContent = `جعل العنصر عائق: ${blockingMode?'تشغيل':'إيقاف'}`; };
  document.getElementById('undoBtn').onclick = undo;
  document.getElementById('jumpBtn').onclick = jump;
  document.getElementById('walkBtn').onclick = toggleWalk;
  document.getElementById('exportBtn').onclick = exportData;
  document.getElementById('importBtn').onclick = importData;
  document.getElementById('togglePanel').onclick = () => panel.classList.toggle('closed');
  document.getElementById('signupBtn').onclick = signup;
  document.getElementById('loginBtn').onclick = login;
  document.getElementById('logoutBtn').onclick = logout;
  updateAuthUI();
}
function renderTiles(){
  const id = document.getElementById('categorySelect').value;
  document.getElementById('tileset').innerHTML = categories[id].tiles.map(t => `
    <div class="tile" data-id="${t.id}"><div class="tileIcon">${t.icon}</div><span>${t.name}</span></div>
  `).join('');
  document.querySelectorAll('.tile').forEach(el => el.onclick = () => {
    document.querySelectorAll('.tile').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    selectedTile = tileMap[el.dataset.id];
    eraser = false;
    document.getElementById('eraseBtn').textContent = 'ممحاة: إيقاف';
  });
}
function switchTab(tab){
  document.getElementById('elementsPanel').classList.toggle('hidden', tab !== 'elements');
  document.getElementById('layersPanel').classList.toggle('hidden', tab !== 'layers');
  document.getElementById('elementsTab').classList.toggle('active', tab === 'elements');
  document.getElementById('layersTab').classList.toggle('active', tab === 'layers');
}
function updateAuthUI(){
  document.getElementById('statusText').textContent = walkMode ? 'وضع التجول' : `وضع البناء ${currentUser ? '- '+currentUser : '- محلي'}`;
}
function signup(){
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const pass = document.getElementById('passInput').value;
  if (!email || !pass) return showToast('اكتب الإيميل والرقم السري');
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  if (users[email]) return showToast('تم إنشاء حساب بنفس الإيميل، جرب تسجيل دخول');
  users[email] = { pass };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  currentUser = email; localStorage.setItem(USER_KEY, email); updateAuthUI(); showToast('تم إنشاء الحساب');
}
function login(){
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const pass = document.getElementById('passInput').value;
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  if (!users[email] || users[email].pass !== pass) return showToast('بيانات الدخول غير صحيحة');
  currentUser = email; localStorage.setItem(USER_KEY, email); updateAuthUI(); showToast('تم تسجيل الدخول');
}
function logout(){ currentUser = ''; localStorage.removeItem(USER_KEY); updateAuthUI(); showToast('تم الخروج'); }

canvas.addEventListener('mousedown', e => {
  if (walkMode) return;
  isDown = true; lastPaintKey = '';
  const pos = getMouse(e);
  dragStart = pos;
  const hit = hitItem(pos.world.x, pos.world.y);
  if (e.button === 1 || e.altKey) dragMode = 'pan';
  else if (hit && !eraser) { dragMode = 'move'; selectedIds = new Set([hit.uid]); }
  else if (!selectedTile && !eraser) { dragMode = 'select'; selectionBox = { x: pos.x, y: pos.y, w: 0, h: 0 }; }
  else { dragMode = 'paint'; pushUndo(); paintAt(pos.world.x, pos.world.y); }
});
canvas.addEventListener('mousemove', e => {
  if (!isDown || walkMode) return;
  const pos = getMouse(e);
  if (dragMode === 'paint') paintAt(pos.world.x, pos.world.y);
  if (dragMode === 'pan') { camX -= e.movementX / zoom; camY -= e.movementY / zoom; clampCam(); }
  if (dragMode === 'select') {
    selectionBox = { x: Math.min(dragStart.x,pos.x), y: Math.min(dragStart.y,pos.y), w: Math.abs(pos.x-dragStart.x), h: Math.abs(pos.y-dragStart.y) };
  }
  if (dragMode === 'move') moveSelected(e.movementX/zoom, e.movementY/zoom);
});
window.addEventListener('mouseup', () => {
  if (dragMode === 'select' && selectionBox) selectInBox(selectionBox);
  if (dragMode === 'move') saveWorld();
  isDown = false; dragMode = null; selectionBox = null;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (e.ctrlKey) {
    const old = zoom;
    zoom *= e.deltaY < 0 ? 1.1 : 0.9;
    zoom = Math.max(0.2, Math.min(3, zoom));
    const m = getMouse(e);
    camX = m.world.x - (m.x / zoom);
    camY = m.world.y - (m.y / zoom);
  } else if (e.shiftKey) camX += e.deltaY / zoom;
  else camY += e.deltaY / zoom;
  clampCam();
}, { passive:false });
function getMouse(e){
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  return { x, y, world: screenToWorld(x,y) };
}
function paintAt(x,y){
  const cell = cellFromWorld(x,y); if (!cell) return;
  if (!canEditCell(cell.key)) return showToast('ممنوع البناء في أرض لاعب آخر');
  const localX = Math.max(2, Math.min(CELL-2, x - cell.x));
  const localY = Math.max(2, Math.min(CELL-2, y - cell.y));
  const snapX = Math.floor(localX / (CELL/MINI));
  const snapY = Math.floor(localY / (CELL/MINI));
  const key = `${cell.key}-${snapX}-${snapY}-${activeLayer}-${selectedTile?.id}-${eraser}`;
  if (key === lastPaintKey) return; lastPaintKey = key;
  if (eraser) return eraseAt(x,y);
  if (!selectedTile) return;
  const c = ensureCell(cell.key);
  c.items.push({
    uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),
    tileId: selectedTile.id,
    cell: cell.key,
    x: Math.max(0, Math.min(CELL-selectedTile.w, localX - selectedTile.w/2)),
    y: Math.max(0, Math.min(CELL-selectedTile.h, localY - selectedTile.h/2)),
    w: selectedTile.w, h: selectedTile.h,
    layer: activeLayer,
    blocking: blockingMode
  });
  saveWorld();
  saveCellToSheet(cell.key);

}



  
  
function eraseAt(x,y){
  const hit = hitItem(x,y); if (!hit) return;
  if (!canEditCell(hit.cell)) return showToast('ممنوع تعديل أرض لاعب آخر');
  world[hit.cell].items = world[hit.cell].items.filter(i => i.uid !== hit.uid);
  saveWorld();
}
function hitItem(x,y){
  return getItems().sort((a,b)=>b.layer-a.layer).find(i => {
    const r = itemRect(i);
    return x>=r.x && y>=r.y && x<=r.x+r.w && y<=r.y+r.h;
  });
}
function selectInBox(box){
  selectedIds.clear();
  for (const item of getItems()) {
    const r = itemRect(item), p = worldToScreen(r.x,r.y);
    const iw = r.w*zoom, ih = r.h*zoom;
    if (p.x < box.x+box.w && p.x+iw > box.x && p.y < box.y+box.h && p.y+ih > box.y) selectedIds.add(item.uid);
  }
}
function moveSelected(dx,dy){
  if (!selectedIds.size) return;
  for (const item of getItems()) if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
    item.x = Math.max(0, Math.min(CELL-item.w, item.x + dx));
    item.y = Math.max(0, Math.min(CELL-item.h, item.y + dy));
  }
}
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (walkMode) return;
  if (e.ctrlKey && e.key.toLowerCase() === 'c') { copyBuffer = getItems().filter(i => selectedIds.has(i.uid)).map(i => ({...i})); showToast('تم النسخ'); }
  if (e.ctrlKey && e.key.toLowerCase() === 'v') pasteItems();
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && selectedIds.size) {
    e.preventDefault(); pushUndo();
    const d = { ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0] }[e.key];
    moveSelected(d[0], d[1]); saveWorld();
  }
});
window.addEventListener('keyup', e => keys[e.key] = false);
function pasteItems(){
  if (!copyBuffer.length) return;
  pushUndo(); selectedIds.clear();
  for (const old of copyBuffer) {
    if (!canEditCell(old.cell)) continue;
    const item = {...old, uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()), x: Math.min(CELL-old.w, old.x+10), y: Math.min(CELL-old.h, old.y+10)};
    ensureCell(item.cell).items.push(item); selectedIds.add(item.uid);
  }
  saveWorld(); showToast('تم اللصق');
}
function undo(){
  const last = undoStack.pop(); if (!last) return showToast('لا توجد خطوة سابقة');
  world = JSON.parse(last); saveWorld(); showToast('تم الرجوع خطوة');
}
function jump(){
  const c = parseCell(document.getElementById('jumpInput').value);
  if (!c) return showToast('اكتب خلية صحيحة مثل K90');
  camX = (c.col-1)*CELL - 80; camY = (c.row-1)*CELL - 80; clampCam();
  if (isBlocked(player.x, player.y)) showToast('أنت فوق عائق، يجب أن تغير الخلية');
}
function clampCam(){
  camX = Math.max(0, Math.min(WORLD_COLS*CELL - canvas.clientWidth/zoom, camX));
  camY = Math.max(0, Math.min(WORLD_ROWS*CELL - canvas.clientHeight/zoom, camY));
}
function toggleWalk(){
  walkMode = !walkMode;
  selectedIds.clear();
  document.getElementById('joystick').classList.toggle('hidden', !walkMode);
  panel.classList.toggle('closed', walkMode && innerWidth < 800);
  document.getElementById('walkBtn').textContent = walkMode ? 'رجوع للتصميم' : 'تجول';
  updateAuthUI();
}
function isBlocked(x,y){
  return getItems().some(i => i.blocking && (() => { const r=itemRect(i); return x>=r.x && y>=r.y && x<=r.x+r.w && y<=r.y+r.h; })());
}
function walkLoop(){
  if (walkMode) {
    let dx = 0, dy = 0;
    if (keys.ArrowUp) dy -= player.speed;
    if (keys.ArrowDown) dy += player.speed;
    if (keys.ArrowLeft) dx -= player.speed;
    if (keys.ArrowRight) dx += player.speed;
    const nx = player.x + dx, ny = player.y + dy;
    if (!isBlocked(nx, ny)) { player.x = nx; player.y = ny; }
    else if (dx || dy) showToast('يوجد عائق');
    camX = player.x - canvas.clientWidth/(2*zoom); camY = player.y - canvas.clientHeight/(2*zoom); clampCam();
  }
  requestAnimationFrame(walkLoop);
}
walkLoop();

function exportData(){
  document.getElementById('sheetData').value = JSON.stringify(world, null, 2);
  showToast('تم تجهيز البيانات للتصدير');
}
function importData(){
  try {
    const data = JSON.parse(document.getElementById('sheetData').value);
    pushUndo(); world = data || {}; saveWorld(); showToast('تم الاستيراد');
  } catch { showToast('بيانات غير صحيحة'); }
}

function setupJoystick(){
  const joy = document.getElementById('joystick'), stick = document.getElementById('stick');
  let active = false;
  joy.addEventListener('pointerdown', e => { active = true; joy.setPointerCapture(e.pointerId); });
  joy.addEventListener('pointerup', () => { active=false; stick.style.left='36px'; stick.style.top='36px'; keys.ArrowUp=keys.ArrowDown=keys.ArrowLeft=keys.ArrowRight=false; });
  joy.addEventListener('pointermove', e => {
    if (!active) return;
    const r = joy.getBoundingClientRect();
    const x = e.clientX - r.left - 60, y = e.clientY - r.top - 60;
    const len = Math.min(42, Math.hypot(x,y));
    const a = Math.atan2(y,x);
    const sx = Math.cos(a)*len, sy = Math.sin(a)*len;
    stick.style.left = `${36+sx}px`; stick.style.top = `${36+sy}px`;
    keys.ArrowRight = sx > 15; keys.ArrowLeft = sx < -15; keys.ArrowDown = sy > 15; keys.ArrowUp = sy < -15;
  });
}

initUI();
setupJoystick();
camX = 0; camY = 0;

function saveCellToSheet(cellKey) {
  const cellData = world[cellKey];
  if (!cellData) return;

  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      cell: cellKey,
      content: cellData
    })
  })
  .then(res => res.text())
  .then(res => console.log("saved:", res))
  .catch(err => console.error(err));
}


