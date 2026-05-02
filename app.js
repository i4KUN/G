'use strict';
// GameNjd v08

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const panel = document.getElementById('panel');
const toast = document.getElementById('toast');

const WORLD_COLS = 500;
const WORLD_ROWS = 500;
const CELL = 180;
const MINI = 6;
const SAVE_KEY = 'GameNjd_v03_world';
const USER_KEY = 'GameNjd_v01_user';
const USERS_KEY = 'GameNjd_v01_users';
const PLAYER_KEY = 'GameNjd_v03_player_id';
const CHARACTER_KEY = 'GameNjd_v08_character';
const DISPLAY_NAME_KEY = 'GameNjd_v07_display_name';
const CHARACTER_BASE = 'Characters';
const SPRITE_COLS = 4;
const SPRITE_ROWS = 4;
const PLAYER_DRAW_W = 120;
const PLAYER_DRAW_H = 120;
const FLOOR_TILE_SRC = 'All-Pic-tiles/04-Floors/Big/Floors-big-36.png';

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
let displayName = localStorage.getItem(DISPLAY_NAME_KEY) || '';
let flipMode = false;
let itemScale = 1;
let didInitialCenter = false;

let world = loadWorld();
let player = { x: (250 - 0.5) * CELL, y: (250 - 0.5) * CELL, speed: 4, dir: 'down' };
let onlinePlayers = {};
let myCharacterId = localStorage.getItem(CHARACTER_KEY) || '';
let playerMoving = false;

const characterImageCache = {};
const floorImage = new Image();
floorImage.src = FLOOR_TILE_SRC;

function getCurrentPlayerId() {
  return window.auth?.currentUser?.uid || getPlayerId();
}

function normalizeCharacterId(id) {
  if (!id) return '';
  if (id.startsWith('male_')) return 'man-' + Number(id.split('_')[1] || 1);
  if (id.startsWith('female_')) return 'woman-' + Number(id.split('_')[1] || 1);
  return id;
}

function getCharacterSrc(id) {
  const fixedId = normalizeCharacterId(id || 'woman-1');
  if (fixedId.startsWith('man-')) return `${CHARACTER_BASE}/man/${fixedId}.png`;
  if (fixedId.startsWith('woman-')) return `${CHARACTER_BASE}/woman/${fixedId}.png`;
  return `${CHARACTER_BASE}/woman/woman-1.png`;
}

function getCharacterName(id) {
  const fixedId = normalizeCharacterId(id || 'woman-1');
  if (fixedId.startsWith('man-')) return 'رجل ' + Number(fixedId.split('-')[1] || 1);
  if (fixedId.startsWith('woman-')) return 'امرأة ' + Number(fixedId.split('-')[1] || 1);
  return 'شخصية';
}

function getCharacterImage(id) {
  const src = getCharacterSrc(id);
  if (!characterImageCache[src]) {
    const img = new Image();
    img.src = src;
    characterImageCache[src] = img;
  }
  return characterImageCache[src];
}

function setCharacter(id) {
  myCharacterId = normalizeCharacterId(id);
  localStorage.setItem(CHARACTER_KEY, myCharacterId);
  document.getElementById('characterModal')?.classList.add('hidden');
  savePlayerToFirebase();
  showToast('تم اختيار الشخصية');
}

function buildCharacterChoices() {
  const box = document.getElementById('characterChoices');
  if (!box) return;

  let html = '<h3>رجال</h3><div class="characterGrid">';
  for (let i = 1; i <= 10; i++) {
    const id = 'man-' + i;
    html += '<button class="characterChoice" data-id="' + id + '"><img class="characterPreviewImg" src="Characters/man/man-' + i + '.png" alt="رجل ' + i + '"><b>رجل ' + i + '</b></button>';
  }

  html += '</div><h3>نساء</h3><div class="characterGrid">';
  for (let i = 1; i <= 10; i++) {
    const id = 'woman-' + i;
    html += '<button class="characterChoice" data-id="' + id + '"><img class="characterPreviewImg" src="Characters/woman/woman-' + i + '.png" alt="امرأة ' + i + '"><b>امرأة ' + i + '</b></button>';
  }
  html += '</div>';
  box.innerHTML = html;

  box.querySelectorAll('.characterChoice').forEach(btn => {
    if (normalizeCharacterId(myCharacterId) === btn.dataset.id) btn.classList.add('active');
    btn.onclick = () => {
      box.querySelectorAll('.characterChoice').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      setCharacter(btn.dataset.id);
    };
  });
}

function showCharacterModal(force = false) {
  myCharacterId = normalizeCharacterId(myCharacterId);
  if (myCharacterId && !force) return;
  buildCharacterChoices();
  document.getElementById('characterModal')?.classList.remove('hidden');
}
const keys = {};

const ASSET_BASE = 'All-Pic-tiles';

const SIZE_DATA = {
  Big: { label: 'كبير', w: 160, h: 160 },
  Medium: { label: 'متوسط', w: 95, h: 95 },
  Small: { label: 'صغير', w: 55, h: 55 },
  Precise: { label: 'دقيق', w: 30, h: 30 }
};

const tileGroups = [
  { key: 'furniture', name: '1) أثاث', folder: '05-Furniture', prefix: 'Furniture', sizes: { Medium: 55, Small: 143 } },
  { key: 'storage', name: '2) تخزين', folder: '07-Storage', prefix: 'Storage', sizes: { Medium: 8, Small: 148 } },
  { key: 'kitchenware', name: '3) أدوات وأواني', folder: '06-Kitchenware', prefix: 'Kitchenware', sizes: { Small: 266, Precise: 9 } },
  { key: 'floors', name: '4) أرضيات', folder: '04-Floors', prefix: 'Floors', sizes: { Big: 196 } },
  { key: 'carpets', name: '5) سجاد ومنسوجات', folder: '01-Carpets', prefix: 'Carpets', sizes: { Medium: 91, Small: 125 } },
  { key: 'plants', name: '6) نباتات', folder: '09-Plants', prefix: 'Plants', sizes: { Big: 7, Small: 8, Precise: 7 } },
  { key: 'walls', name: '7) جدران ومباني', folder: '08-Walls', prefix: 'Walls', sizes: { Big: 142, Medium: 43 } },
  { key: 'doors', name: '8) أبواب ونوافذ', folder: '03-Doors', prefix: 'Doors', sizes: { Medium: 188, Precise: 5 } },
  { key: 'decorations', name: '9) ديكور', folder: '02-Decorations', prefix: 'Decorations', sizes: { Small: 164 } }
];

function getTileSize(groupKey, size) {
  if (groupKey === 'floors') return { w: 180, h: 180 };
  if (groupKey === 'walls' && size === 'Big') return { w: 160, h: 160 };
  if (groupKey === 'walls' && size === 'Medium') return { w: 120, h: 120 };
  if (groupKey === 'carpets' && size === 'Medium') return { w: 120, h: 120 };
  if (groupKey === 'carpets' && size === 'Small') return { w: 70, h: 70 };
  if (groupKey === 'doors' && size === 'Medium') return { w: 80, h: 80 };
  if (groupKey === 'doors' && size === 'Precise') return { w: 38, h: 38 };
  const data = SIZE_DATA[size] || SIZE_DATA.Medium;
  return { w: data.w, h: data.h };
}

function isDefaultBlocking(groupKey) {
  return groupKey === 'walls' || groupKey === 'doors';
}

function getImageName(group, size, index) {
  if (group.key === 'floors') return `${group.prefix}-big-${index}.png`;
  if (group.key === 'plants' && size === 'Precise') return `sprite_${33 + index}.png`;
  return `${group.prefix}-${size}-${index}.png`;
}

function buildCategories() {
  const result = {};

  for (const group of tileGroups) {
    const tiles = [];

    for (const [size, count] of Object.entries(group.sizes)) {
      for (let i = 1; i <= count; i++) {
        const image = `${ASSET_BASE}/${group.folder}/${size}/${getImageName(group, size, i)}`;
        const dims = getTileSize(group.key, size);

        tiles.push({
          id: `${group.key}_${size.toLowerCase()}_${i}`,
          name: `${SIZE_DATA[size]?.label || size} ${i}`,
          image,
          w: dims.w,
          h: dims.h,
          size,
          category: group.key,
          blocking: isDefaultBlocking(group.key)
        });
      }
    }

    result[group.key] = { name: group.name, tiles };
  }

  return result;
}

const categories = buildCategories();
const tileMap = Object.fromEntries(Object.values(categories).flatMap(c => c.tiles.map(t => [t.id, t])));
const imageCache = {};

function getTileImage(src) {
  if (!src) return null;
  if (!imageCache[src]) {
    const img = new Image();
    img.src = src;
    imageCache[src] = img;
  }
  return imageCache[src];
}

function getPlayerId() {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

function loadWorld() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
  catch { return {}; }
}

function saveWorld() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(world));
  saveWorldToFirebase();
}

function saveWorldToFirebase() {
  if (!window.db || !window.ref || !window.set) return;

  for (const key in world) {
    if (canEditCell(key)) saveCellToFirebase(key);
  }
}

function saveCellToFirebase(cellKey) {
  if (!window.db || !window.ref || !window.set) return;
  if (!world[cellKey]) return;

  window.set(window.ref(window.db, 'world/' + cellKey), world[cellKey])
    .catch(err => console.error('Firebase cell save error:', err));
}

function listenWorldFromFirebase() {
  if (!window.db || !window.ref || !window.onValue) {
    setTimeout(listenWorldFromFirebase, 500);
    return;
  }

  window.onValue(window.ref(window.db, 'world'), (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    world = data;
    localStorage.setItem(SAVE_KEY, JSON.stringify(world));
    centerStartOnce();
  }, () => {
    showToast('فشل الاتصال بـ Firebase');
  });
}

function savePlayerToFirebase() {
  if (!window.db || !window.ref || !window.set) return;

  const name = displayName || (currentUser ? 'لاعب' : getGuestId());
  const id = getCurrentPlayerId();
  window.set(window.ref(window.db, 'players/' + id), {
    id: id,
    name: name,
    x: player.x,
    y: player.y,
    dir: player.dir,
    moving: playerMoving,
    walkMode: walkMode,
    character: normalizeCharacterId(myCharacterId) || 'woman-1',
    updatedAt: Date.now()
  }).catch(err => console.error('Firebase player save error:', err));
}

function listenPlayersFromFirebase() {
  if (!window.db || !window.ref || !window.onValue) {
    setTimeout(listenPlayersFromFirebase, 500);
    return;
  }

  window.onValue(window.ref(window.db, 'players'), (snapshot) => {
    onlinePlayers = snapshot.val() || {};
  });
}

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
  while (n > 0) {
    let m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
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

function getItems() {
  return Object.values(world).flatMap(c => c.items || []);
}

function itemRect(item) {
  const cell = parseCell(item.cell);
  return { x:(cell.col-1)*CELL+item.x, y:(cell.row-1)*CELL+item.y, w:item.w, h:item.h };
}

const GUEST_KEY = 'GameNjd_guest_id';

function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);

  if (!id) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    id = 'GNJ' + Array.from({length:3}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
    localStorage.setItem(GUEST_KEY, id);
  }

  return id;
}

function currentOwner(){
  if (window.auth && window.auth.currentUser) {
    return window.auth.currentUser.uid;
  }

  return 'guest:' + getGuestId();
}


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
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0,0,w,h);
  drawFloorBackground(w, h);

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

      ctx.fillStyle = `rgba(255,255,255,${gridOpacity})`;
      ctx.font = `${Math.max(10, 13*zoom)}px Arial`;
      ctx.fillText(`${colName(c)}${r}`, sx + 6, sy + 16);

      ctx.strokeStyle = `rgba(255,255,255,${gridOpacity * 0.28})`;
      for (let i=1; i<MINI; i++) {
        ctx.beginPath();
        ctx.moveTo(sx+i*size/MINI, sy);
        ctx.lineTo(sx+i*size/MINI, sy+size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sx, sy+i*size/MINI);
        ctx.lineTo(sx+size, sy+i*size/MINI);
        ctx.stroke();
      }
    }
  }

  const visibleItems = getItems().sort((a,b) => a.layer - b.layer);

  for (const item of visibleItems) {
    const r = itemRect(item);
    const p = worldToScreen(r.x, r.y);
    const t = tileMap[item.tileId] || {};

    const img = getTileImage(t.image);
    ctx.save();
    if (item.flipX) {
      ctx.translate(p.x + r.w * zoom, p.y);
      ctx.scale(-1, 1);
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, r.w * zoom, r.h * zoom);
      else { ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, 0, r.w * zoom, r.h * zoom); }
    } else {
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, p.x, p.y, r.w * zoom, r.h * zoom);
      else { ctx.fillStyle = '#94a3b8'; ctx.fillRect(p.x, p.y, r.w * zoom, r.h * zoom); }
    }
    ctx.restore();

    if (item.blocking || selectedIds.has(item.uid)) {
      ctx.strokeStyle = item.blocking ? '#ef4444' : '#e5e7eb';
      ctx.strokeRect(p.x, p.y, r.w*zoom, r.h*zoom);
    }

    if (selectedIds.has(item.uid)) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x-3, p.y-3, r.w*zoom+6, r.h*zoom+6);
      ctx.lineWidth = 1;
    }
  }

  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';

  if (selectionBox) {
    ctx.strokeStyle = '#22c55e';
    ctx.setLineDash([5,5]);
    ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
    ctx.setLineDash([]);
  }

  drawOnlinePlayers();

  if (walkMode) drawPlayer();

  requestAnimationFrame(draw);
}

function drawSpriteCharacter(x, y, dir, moving, name, characterId, isMe) {
  const p = worldToScreen(x, y);
  const drawW = PLAYER_DRAW_W * zoom;
  const drawH = PLAYER_DRAW_H * zoom;
  const rowMap = { down: 0, right: 1, up: 2, left: 3 };
  const row = rowMap[dir] ?? 0;
  const frame = moving ? Math.floor(Date.now() / 150) % SPRITE_COLS : 0;
  const img = getCharacterImage(characterId || myCharacterId || 'woman-1');

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 10 * zoom, 24 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  if (img.complete && img.naturalWidth) {
    const frameW = img.naturalWidth / SPRITE_COLS;
    const frameH = img.naturalHeight / SPRITE_ROWS;
    const sx = frame * frameW;
    const sy = row * frameH;
    const dx = p.x - drawW / 2;
    const dy = p.y - drawH + 22 * zoom;

    ctx.drawImage(img, sx, sy, frameW, frameH, dx, dy, drawW, drawH);
  } else {
    ctx.fillStyle = isMe ? '#22c55e' : '#f97316';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15*zoom, 0, Math.PI*2);
    ctx.fill();
  }

  const label = isMe ? (displayName || 'أنا') : (name || 'لاعب');
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(10, 13 * zoom)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.strokeText(label, p.x, p.y - drawH + 18 * zoom);
  ctx.fillText(label, p.x, p.y - drawH + 18 * zoom);
  ctx.textAlign = 'start';

  ctx.restore();
}

function drawPlayer(){
  drawSpriteCharacter(player.x, player.y, player.dir, playerMoving, 'أنا', myCharacterId || 'woman-1', true);
}

function drawOnlinePlayers(){
  const now = Date.now();

  for (const id in onlinePlayers) {
    if (id === getCurrentPlayerId()) continue;

    const pData = onlinePlayers[id];
    if (!pData) continue;

    if (now - (pData.updatedAt || 0) > 20000) continue;

    drawSpriteCharacter(
      pData.x || 0,
      pData.y || 0,
      pData.dir || 'down',
      !!pData.moving,
      pData.name || 'لاعب',
      pData.character || 'woman-1',
      false
    );
  }
}

requestAnimationFrame(draw);

function initUI(){
  document.getElementById('guestCodeBtn').onclick = loginWithGuestCode;
  document.getElementById('displayNameInput').value = displayName;
  document.getElementById('displayNameInput').onchange = saveDisplayName;
  document.getElementById('aboutBtn').onclick = () => showInfo('من نحن', 'انا مصمم مبتدئ في الالعاب.');
  document.getElementById('shortcutsBtn').onclick = showShortcuts;
  document.getElementById('flipBtn').onclick = toggleFlip;
  document.getElementById('deleteAllBtn').onclick = deleteMyItems;
  document.getElementById('itemScale').oninput = updateItemScale;
  document.getElementById('stopWalkBtn').onclick = () => { if (walkMode) toggleWalk(); };
  document.getElementById('infoCloseBtn').onclick = () => document.getElementById('infoModal').classList.add('hidden');
  document.getElementById('changeCharacterBtn').onclick = () => showCharacterModal(true);
  document.getElementById('mobileGearBtn').onclick = () => panel.classList.toggle('closed');
  document.getElementById('zoomInBtn').onclick = () => { zoom = Math.min(3, zoom * 1.15); };
  document.getElementById('zoomOutBtn').onclick = () => { zoom = Math.max(0.2, zoom * 0.85); };
  const cat = document.getElementById('categorySelect');
  cat.innerHTML = Object.entries(categories).map(([id,c]) => `<option value="${id}">${c.name}</option>`).join('');
  cat.onchange = () => { updateSizeFilter(); renderTiles(); };
  document.getElementById('sizeFilter').onchange = renderTiles;
  updateSizeFilter();
  renderTiles();

  document.getElementById('gridOpacity').oninput = e => gridOpacity = Number(e.target.value);
  document.getElementById('brushSize').oninput = e => brushSize = Number(e.target.value);
  document.getElementById('layerInput').oninput = e => activeLayer = Number(e.target.value || 1);
  document.getElementById('elementsTab').onclick = () => switchTab('elements');
  document.getElementById('layersTab').onclick = () => switchTab('layers');

  document.getElementById('eraseBtn').onclick = () => {
    eraser = !eraser;
    document.getElementById('eraseBtn').textContent = `ممحاة: ${eraser?'تشغيل':'إيقاف'}`;
  };

  document.getElementById('blockBtn').onclick = () => {
    blockingMode = !blockingMode;
    document.getElementById('blockBtn').textContent = `جعل العنصر عائق: ${blockingMode?'تشغيل':'إيقاف'}`;
  };

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

function updateSizeFilter(){
  const catId = document.getElementById('categorySelect').value;
  const sizeSelect = document.getElementById('sizeFilter');
  const sizes = [...new Set(categories[catId].tiles.map(t => t.size))];
  const old = sizeSelect.value;
  sizeSelect.innerHTML = '<option value="all">الكل</option>' + sizes.map(size => `<option value="${size}">${SIZE_DATA[size]?.label || size}</option>`).join('');
  sizeSelect.value = sizes.includes(old) ? old : 'all';
}

function renderTiles(){
  const id = document.getElementById('categorySelect').value;
  const selectedSize = document.getElementById('sizeFilter').value;
  const tiles = categories[id].tiles.filter(t => selectedSize === 'all' || t.size === selectedSize);
  document.getElementById('tileset').innerHTML = tiles.map(t => `
    <div class="tile" data-id="${t.id}" title="${t.name}">
      <img class="tileImg" src="${t.image}" alt="${t.name}" loading="lazy">
      <span>${t.name}</span>
    </div>
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
  document.getElementById('statusText').textContent =
    walkMode ? 'وضع التجول' : `وضع البناء ${currentUser ? '- '+currentUser : ''}`;

  const nameInput = document.getElementById('displayNameInput');
  if (nameInput && nameInput.value !== displayName) nameInput.value = displayName;
  const box = document.getElementById('guestIdBox');

  if (!currentUser) {
    const id = getGuestId();
    box.textContent = ` | رمزك: ${id}`;
  } else {
    box.textContent = '';
  }
}



function signup(){
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const pass = document.getElementById('passInput').value;

  if (!email || !pass) return showToast('اكتب الإيميل والرقم السري');

  if (!window.auth) return showToast('Firebase Auth غير جاهز');

  window.createUserWithEmailAndPassword(window.auth, email, pass)
    .then(() => {
      currentUser = email;
      saveDisplayName(false);
      transferGuestOwnership();
      localStorage.setItem(USER_KEY, email);
      updateAuthUI();
      savePlayerToFirebase();
      showToast('تم إنشاء الحساب');
    })
    .catch(err => {
      showToast('فشل إنشاء الحساب');
      console.error(err);
    });
}



function login(){
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const pass = document.getElementById('passInput').value;

  if (!email || !pass) return showToast('اكتب الإيميل والرقم السري');

  if (!window.auth) return showToast('Firebase Auth غير جاهز');

  window.signInWithEmailAndPassword(window.auth, email, pass)
    .then(() => {
      currentUser = email;
      saveDisplayName(false);
      transferGuestOwnership();
      localStorage.setItem(USER_KEY, email);
      updateAuthUI();
      savePlayerToFirebase();
      showToast('تم تسجيل الدخول');
    })
    .catch(err => {
      showToast('بيانات الدخول غير صحيحة');
      console.error(err);
    });
}





function logout(){
  if (!window.auth) {
    currentUser = '';
    localStorage.removeItem(USER_KEY);
    updateAuthUI();
    savePlayerToFirebase();
    showToast('تم الخروج');
    return;
  }

  window.signOut(window.auth).then(() => {
    currentUser = '';
    localStorage.removeItem(USER_KEY);
    updateAuthUI();
    savePlayerToFirebase();
    showToast('تم الخروج');
  });
}




canvas.addEventListener('mousedown', e => {
  if (walkMode) return;

  isDown = true;
  lastPaintKey = '';

  const pos = getMouse(e);
  dragStart = pos;
  const hit = hitItem(pos.world.x, pos.world.y);

  if (e.button === 1 || e.altKey) dragMode = 'pan';
  else if (hit && !eraser) {
    dragMode = 'move';
    selectedIds = new Set([hit.uid]);
  }
  else if (!selectedTile && !eraser) {
    dragMode = 'select';
    selectionBox = { x: pos.x, y: pos.y, w: 0, h: 0 };
  }
  else {
    dragMode = 'paint';
    pushUndo();
    paintAt(pos.world.x, pos.world.y);
  }
});

canvas.addEventListener('mousemove', e => {
  if (!isDown || walkMode) return;

  const pos = getMouse(e);

  if (dragMode === 'paint') paintAt(pos.world.x, pos.world.y);
  if (dragMode === 'pan') {
    camX -= e.movementX / zoom;
    camY -= e.movementY / zoom;
    clampCam();
  }
  if (dragMode === 'select') {
    selectionBox = {
      x: Math.min(dragStart.x,pos.x),
      y: Math.min(dragStart.y,pos.y),
      w: Math.abs(pos.x-dragStart.x),
      h: Math.abs(pos.y-dragStart.y)
    };
  }
  if (dragMode === 'move') moveSelected(e.movementX/zoom, e.movementY/zoom);
});

window.addEventListener('mouseup', () => {
  if (dragMode === 'select' && selectionBox) selectInBox(selectionBox);
  if (dragMode === 'move') saveWorld();

  isDown = false;
  dragMode = null;
  selectionBox = null;
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();

  if (e.ctrlKey) {
    zoom *= e.deltaY < 0 ? 1.1 : 0.9;
    zoom = Math.max(0.2, Math.min(3, zoom));
    const m = getMouse(e);
    camX = m.world.x - (m.x / zoom);
    camY = m.world.y - (m.y / zoom);
  } else if (e.shiftKey) {
    camX += e.deltaY / zoom;
  } else {
    camY += e.deltaY / zoom;
  }

  clampCam();
}, { passive:false });

function getMouse(e){
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  return { x, y, world: screenToWorld(x,y) };
}

function paintAt(x,y){
  const cell = cellFromWorld(x,y);
  if (!cell) return;

  if (!canEditCell(cell.key)) return showToast('ممنوع البناء في أرض لاعب آخر');

  const localX = Math.max(2, Math.min(CELL-2, x - cell.x));
  const localY = Math.max(2, Math.min(CELL-2, y - cell.y));
  const snapX = Math.floor(localX / (CELL/MINI));
  const snapY = Math.floor(localY / (CELL/MINI));
  const key = `${cell.key}-${snapX}-${snapY}-${activeLayer}-${selectedTile?.id}-${eraser}`;

  if (key === lastPaintKey) return;
  lastPaintKey = key;

  if (eraser) return eraseAt(x,y);
  if (!selectedTile) return;

  const c = ensureCell(cell.key);
  const scaledW = Math.max(12, Math.min(CELL, Math.round(selectedTile.w * itemScale)));
  const scaledH = Math.max(12, Math.min(CELL, Math.round(selectedTile.h * itemScale)));

  c.items.push({
    uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),
    tileId: selectedTile.id,
    cell: cell.key,
    x: Math.max(0, Math.min(CELL-scaledW, localX - scaledW/2)),
    y: Math.max(0, Math.min(CELL-scaledH, localY - scaledH/2)),
    w: scaledW,
    h: scaledH,
    flipX: flipMode,
    layer: activeLayer,
    blocking: blockingMode || !!selectedTile.blocking
  });

localStorage.setItem(SAVE_KEY, JSON.stringify(world));
saveCellToFirebase(cell.key);  
  
  
}

function eraseAt(x,y){
  const hit = hitItem(x,y);
  if (!hit) return;

  if (!canEditCell(hit.cell)) return showToast('ممنوع تعديل أرض لاعب آخر');

  world[hit.cell].items = world[hit.cell].items.filter(i => i.uid !== hit.uid);
  
localStorage.setItem(SAVE_KEY, JSON.stringify(world));
saveCellToFirebase(hit.cell);

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
    const r = itemRect(item);
    const p = worldToScreen(r.x,r.y);
    const iw = r.w*zoom;
    const ih = r.h*zoom;

    if (p.x < box.x+box.w && p.x+iw > box.x && p.y < box.y+box.h && p.y+ih > box.y) {
      selectedIds.add(item.uid);
    }
  }
}

function moveSelected(dx,dy){
  if (!selectedIds.size) return;

  for (const item of getItems()) {
    if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
      item.x = Math.max(0, Math.min(CELL-item.w, item.x + dx));
      item.y = Math.max(0, Math.min(CELL-item.h, item.y + dy));
    }
  }
}

window.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
  if (walkMode) return;

  if (e.ctrlKey && e.key.toLowerCase() === 'c') {
    copyBuffer = getItems().filter(i => selectedIds.has(i.uid)).map(i => ({...i}));
    showToast('تم النسخ');
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'v') pasteItems();

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && selectedIds.size) {
    e.preventDefault();
    pushUndo();

    const d = {
      ArrowUp:[0,-1],
      ArrowDown:[0,1],
      ArrowLeft:[-1,0],
      ArrowRight:[1,0]
    }[e.key];

    moveSelected(d[0], d[1]);
    saveWorld();
  }
});

window.addEventListener('keyup', e => keys[e.key] = false);

function pasteItems(){
  if (!copyBuffer.length) return;

  pushUndo();
  selectedIds.clear();

  for (const old of copyBuffer) {
    if (!canEditCell(old.cell)) continue;

    const item = {
      ...old,
      uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),
      x: Math.min(CELL-old.w, old.x+10),
      y: Math.min(CELL-old.h, old.y+10)
    };

    ensureCell(item.cell).items.push(item);
    selectedIds.add(item.uid);
  }

  saveWorld();
  showToast('تم اللصق');
}

function undo(){
  const last = undoStack.pop();
  if (!last) return showToast('لا توجد خطوة سابقة');

  world = JSON.parse(last);
  saveWorld();
  showToast('تم الرجوع خطوة');
}

function jump(){
  const c = parseCell(document.getElementById('jumpInput').value);
  if (!c) return showToast('اكتب خلية صحيحة مثل K90');

  camX = (c.col-1)*CELL - 80;
  camY = (c.row-1)*CELL - 80;
  clampCam();

  if (isBlocked(player.x, player.y)) showToast('أنت فوق عائق، يجب أن تغير الخلية');
}

function clampCam(){
  camX = Math.max(0, Math.min(WORLD_COLS*CELL - canvas.clientWidth/zoom, camX));
  camY = Math.max(0, Math.min(WORLD_ROWS*CELL - canvas.clientHeight/zoom, camY));
}

function toggleWalk(){
  const nextMode = !walkMode;

  if (nextMode) {
    const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
    player.x = center.x;
    player.y = center.y;
  }

  walkMode = nextMode;
  selectedIds.clear();

  document.body.classList.toggle('walking', walkMode);
  document.getElementById('joystick').classList.toggle('hidden', !walkMode);
  document.getElementById('stopWalkBtn').classList.toggle('hidden', !walkMode);
  document.getElementById('walkBtn').textContent = walkMode ? 'رجوع للتصميم' : 'تجول';

  updateAuthUI();
  savePlayerToFirebase();
}

function isBlocked(x,y){
  return getItems().some(i => i.blocking && (() => {
    const r=itemRect(i);
    return x>=r.x && y>=r.y && x<=r.x+r.w && y<=r.y+r.h;
  })());
}

function walkLoop(){
  if (walkMode) {
    let dx = 0;
    let dy = 0;

    if (keys.ArrowUp) dy -= player.speed;
    if (keys.ArrowDown) dy += player.speed;
    if (keys.ArrowLeft) dx -= player.speed;
    if (keys.ArrowRight) dx += player.speed;

    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : dx < 0 ? 'left' : player.dir;
    else if (dy !== 0) player.dir = dy > 0 ? 'down' : 'up';

    playerMoving = !!(dx || dy);

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (!isBlocked(nx, ny)) {
      player.x = nx;
      player.y = ny;

      if (dx || dy) {
        savePlayerToFirebase();
      }
    } else if (dx || dy) {
      playerMoving = false;
      savePlayerToFirebase();
    }

    camX = player.x - canvas.clientWidth/(2*zoom);
    camY = player.y - canvas.clientHeight/(2*zoom);
    clampCam();
  } else if (playerMoving) {
    playerMoving = false;
    savePlayerToFirebase();
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
    pushUndo();
    world = data || {};
    saveWorld();
    showToast('تم الاستيراد');
  } catch {
    showToast('بيانات غير صحيحة');
  }
}

function setupJoystick(){
  const joy = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  let active = false;

  joy.addEventListener('pointerdown', e => {
    active = true;
    joy.setPointerCapture(e.pointerId);
  });

  joy.addEventListener('pointerup', () => {
    active=false;
    stick.style.left='36px';
    stick.style.top='36px';
    keys.ArrowUp=keys.ArrowDown=keys.ArrowLeft=keys.ArrowRight=false;
  });

  joy.addEventListener('pointermove', e => {
    if (!active) return;

    const r = joy.getBoundingClientRect();
    const x = e.clientX - r.left - 60;
    const y = e.clientY - r.top - 60;
    const len = Math.min(42, Math.hypot(x,y));
    const a = Math.atan2(y,x);
    const sx = Math.cos(a)*len;
    const sy = Math.sin(a)*len;

    stick.style.left = `${36+sx}px`;
    stick.style.top = `${36+sy}px`;

    keys.ArrowRight = sx > 15;
    keys.ArrowLeft = sx < -15;
    keys.ArrowDown = sy > 15;
    keys.ArrowUp = sy < -15;
  });
}

window.addEventListener('beforeunload', () => {
  savePlayerToFirebase();
});




function drawFloorBackground(w, h) {
  if (!floorImage.complete || !floorImage.naturalWidth) return;

  const startCol = Math.max(1, Math.floor(camX / CELL) + 1);
  const endCol = Math.min(WORLD_COLS, Math.ceil((camX + w/zoom) / CELL) + 1);
  const startRow = Math.max(1, Math.floor(camY / CELL) + 1);
  const endRow = Math.min(WORLD_ROWS, Math.ceil((camY + h/zoom) / CELL) + 1);

  for (let c=startCol; c<=endCol; c++) {
    for (let r=startRow; r<=endRow; r++) {
      const sx = ((c-1)*CELL - camX) * zoom;
      const sy = ((r-1)*CELL - camY) * zoom;
      const size = CELL * zoom;
      ctx.drawImage(floorImage, sx, sy, size, size);
    }
  }
}

function saveDisplayName(showMsg = true) {
  const input = document.getElementById('displayNameInput');
  displayName = (input?.value || '').trim().slice(0, 20);
  localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  savePlayerToFirebase();
  if (showMsg) showToast('تم حفظ الاسم');
}

function showInfo(title, text) {
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoText').textContent = text;
  document.getElementById('infoModal').classList.remove('hidden');
}

function showShortcuts() {
  showInfo('شرح الاختصارات', 'Ctrl + عجلة: تقريب / إبعاد\nShift + عجلة: تحريك يمين ويسار\nCtrl + C: نسخ العناصر المحددة\nCtrl + V: لصق العناصر\nالأسهم: تحريك العنصر المحدد بكسل واحد\nزر تجول: تحريك الشخصية بالأسهم أو عصا الجوال');
}

function toggleFlip() {
  flipMode = !flipMode;
  document.getElementById('flipBtn').textContent = `عكس العنصر: ${flipMode ? 'تشغيل' : 'إيقاف'}`;

  if (selectedIds.size) {
    pushUndo();
    const changedCells = new Set();
    for (const item of getItems()) {
      if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
        item.flipX = !item.flipX;
        changedCells.add(item.cell);
      }
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(world));
    changedCells.forEach(saveCellToFirebase);
  }
}

function updateItemScale(e) {
  itemScale = Number(e.target.value || 1);
  if (!selectedIds.size) return;

  pushUndo();
  const changedCells = new Set();
  for (const item of getItems()) {
    if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
      const base = tileMap[item.tileId] || { w:item.w, h:item.h };
      item.w = Math.max(12, Math.min(CELL, Math.round(base.w * itemScale)));
      item.h = Math.max(12, Math.min(CELL, Math.round(base.h * itemScale)));
      item.x = Math.max(0, Math.min(CELL - item.w, item.x));
      item.y = Math.max(0, Math.min(CELL - item.h, item.y));
      changedCells.add(item.cell);
    }
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(world));
  changedCells.forEach(saveCellToFirebase);
}

function deleteMyItems() {
  pushUndo();
  let changed = false;
  for (const key in world) {
    if (canEditCell(key)) {
      world[key].items = [];
      changed = true;
      saveCellToFirebase(key);
    }
  }
  if (changed) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(world));
    showToast('تم حذف جميع عناصرك');
  }
}

function centerStartOnce() {
  if (didInitialCenter) return;
  didInitialCenter = true;

  const occupied = Object.keys(world).filter(key => world[key]?.items?.length);
  let target = null;

  if (occupied.length) {
    const baseCell = parseCell(occupied[Math.floor(Math.random() * occupied.length)]);
    if (baseCell) {
      for (let radius = 1; radius <= 6 && !target; radius++) {
        for (let dc = -radius; dc <= radius && !target; dc++) {
          for (let dr = -radius; dr <= radius && !target; dr++) {
            const col = baseCell.col + dc;
            const row = baseCell.row + dr;
            if (col < 1 || row < 1 || col > WORLD_COLS || row > WORLD_ROWS) continue;
            const key = `${colName(col)}${row}`;
            if (!world[key] || !(world[key].items || []).length) target = { col, row, key };
          }
        }
      }
    }
  }

  if (!target) target = parseCell('IP250') || { col:250, row:250 };
  camX = Math.max(0, (target.col - 1) * CELL - canvas.clientWidth / (2 * zoom) + CELL / 2);
  camY = Math.max(0, (target.row - 1) * CELL - canvas.clientHeight / (2 * zoom) + CELL / 2);
  player.x = (target.col - 0.5) * CELL;
  player.y = (target.row - 0.5) * CELL;
  clampCam();
}

setTimeout(() => document.body.classList.add('loaded'), 3000);

function startAnonymousAuth() {
  if (!window.auth || !window.signInAnonymously) {
    setTimeout(startAnonymousAuth, 500);
    return;
  }

  if (window.auth.currentUser) {
    savePlayerToFirebase();
    return;
  }

  window.signInAnonymously(window.auth)
    .then(() => savePlayerToFirebase())
    .catch(err => console.error('Anonymous login error:', err));
}


startAnonymousAuth();

initUI();
myCharacterId = normalizeCharacterId(myCharacterId);
if (myCharacterId) localStorage.setItem(CHARACTER_KEY, myCharacterId);
showCharacterModal(false);
setupJoystick();
listenWorldFromFirebase();
setTimeout(centerStartOnce, 900);
listenPlayersFromFirebase();
savePlayerToFirebase();

function loginWithGuestCode() {
  const code = document.getElementById('guestCodeInput').value.trim().toUpperCase();

  if (!/^GNJ[A-Z0-9]{3}$/.test(code)) {
    return showToast('رمز غير صحيح');
  }

  localStorage.setItem(GUEST_KEY, code);
  currentUser = '';
  localStorage.removeItem(USER_KEY);

  updateAuthUI();
  savePlayerToFirebase();
  showToast('تم الدخول بالرمز');
}


function transferGuestOwnership() {
  const guestId = getGuestId();
  const oldOwner = 'guest:' + guestId;
  const newOwner = currentOwner();

  let changed = false;

  for (const key in world) {
    if (world[key].owner === oldOwner) {
      world[key].owner = newOwner;
      changed = true;
    }
  }

  if (changed) {
    saveWorld();
    showToast('تم نقل ملكية أرضك للحساب');
  }
}


