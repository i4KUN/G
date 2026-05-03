'use strict';
// GameNjd v10.5

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const panel = document.getElementById('panel');
const toast = document.getElementById('toast');

const WORLD_COLS = 200;
const WORLD_ROWS = 200;
const CELL = 320;
const MINI = 6;
const SAVE_KEY = 'GameNjd_v105_world';
const USER_KEY = 'GameNjd_v105_user';
const PLAYER_KEY = 'GameNjd_v105_player_id';
const GUEST_KEY = 'GameNjd_v105_guest_id';
const CHARACTER_KEY = 'GameNjd_v105_character';
const DISPLAY_NAME_KEY = 'GameNjd_v105_display_name';
const LINKED_ID_KEY = 'GameNjd_v105_linked_id';
const LAST_EMAIL_KEY = 'GameNjd_v105_last_email';
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
let previousBuildZoom = zoom;
let playerMoving = false;
let onlinePlayers = {};
let myCharacterId = localStorage.getItem(CHARACTER_KEY) || '';
let world = loadWorld();
let player = { x: (100 - 0.5) * CELL, y: (100 - 0.5) * CELL, speed: 4, dir: 'down' };

const keys = {};
const imageCache = {};
const characterImageCache = {};
const floorImage = new Image();
floorImage.src = FLOOR_TILE_SRC;

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
        const dims = getTileSize(group.key, size);
        tiles.push({
          id: `${group.key}_${size.toLowerCase()}_${i}`,
          name: `${SIZE_DATA[size]?.label || size} ${i}`,
          image: `${ASSET_BASE}/${group.folder}/${size}/${getImageName(group, size, i)}`,
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
const tileMap = Object.fromEntries(Object.values(categories).flatMap(category => category.tiles.map(tile => [tile.id, tile])));

function loadWorld() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
  catch { return {}; }
}

function saveLocalWorld() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(world));
}

function saveWorld() {
  saveLocalWorld();
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
  const cell = world[cellKey];
  if (!cell || !Array.isArray(cell.items) || cell.items.length === 0) {
    removeCellFromFirebase(cellKey);
    return;
  }
  window.set(window.ref(window.db, 'world/' + cellKey), cell)
    .catch(error => console.error('Firebase cell save error:', error));
}

function removeCellFromFirebase(cellKey) {
  if (!window.db || !window.ref || !window.remove) return;
  window.remove(window.ref(window.db, 'world/' + cellKey))
    .catch(error => console.error('Firebase cell remove error:', error));
}

function listenWorldFromFirebase() {
  if (!window.db || !window.ref || !window.onValue) {
    setTimeout(listenWorldFromFirebase, 500);
    return;
  }
  window.onValue(window.ref(window.db, 'world'), snapshot => {
    world = snapshot.val() || {};
    saveLocalWorld();
    centerStartOnce();
  }, () => showToast('فشل الاتصال بـ Firebase'));
}

function listenPlayersFromFirebase() {
  if (!window.db || !window.ref || !window.onValue) {
    setTimeout(listenPlayersFromFirebase, 500);
    return;
  }
  window.onValue(window.ref(window.db, 'players'), snapshot => {
    onlinePlayers = snapshot.val() || {};
  });
}

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

function makeGuestId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return 'GNJ' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = makeGuestId();
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

function setGuestId(id) {
  const clean = String(id || '').trim().toUpperCase();
  if (!/^GNJ[A-Z0-9]{3,12}$/.test(clean)) return false;
  localStorage.setItem(GUEST_KEY, clean);
  return true;
}

function getCurrentPlayerId() {
  const user = window.auth?.currentUser;
  if (user && !user.isAnonymous) return user.uid;
  return getPlayerId();
}

function currentOwner() {
  const user = window.auth?.currentUser;
  if (user && !user.isAnonymous) return user.uid;
  return 'guest:' + getGuestId();
}

function canEditCell(key) {
  const cell = world[key];
  return !cell || !cell.owner || cell.owner === currentOwner();
}

function ensureCell(key) {
  if (!world[key]) world[key] = { owner: currentOwner(), items: [] };
  if (!world[key].owner) world[key].owner = currentOwner();
  if (!Array.isArray(world[key].items)) world[key].items = [];
  return world[key];
}

function colName(n) {
  let text = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    text = String.fromCharCode(65 + m) + text;
    n = Math.floor((n - 1) / 26);
  }
  return text;
}

function parseCell(ref) {
  const match = String(ref || '').trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  let col = 0;
  for (const ch of match[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  const row = Number(match[2]);
  if (col < 1 || row < 1 || col > WORLD_COLS || row > WORLD_ROWS) return null;
  return { col, row, key: `${colName(col)}${row}` };
}

function worldToScreen(x, y) {
  return { x: (x - camX) * zoom, y: (y - camY) * zoom };
}

function screenToWorld(x, y) {
  return { x: x / zoom + camX, y: y / zoom + camY };
}

function cellFromWorld(x, y) {
  const col = Math.floor(x / CELL) + 1;
  const row = Math.floor(y / CELL) + 1;
  if (col < 1 || row < 1 || col > WORLD_COLS || row > WORLD_ROWS) return null;
  return { col, row, key: `${colName(col)}${row}`, x: (col - 1) * CELL, y: (row - 1) * CELL };
}

function getItems() {
  return Object.values(world).flatMap(cell => Array.isArray(cell.items) ? cell.items : []);
}

function itemRect(item) {
  const cell = parseCell(item.cell);
  if (!cell) return { x: 0, y: 0, w: item.w || 0, h: item.h || 0 };
  return { x: (cell.col - 1) * CELL + item.x, y: (cell.row - 1) * CELL + item.y, w: item.w, h: item.h };
}

function pushUndo() {
  undoStack.push(JSON.stringify(world));
  if (undoStack.length > 80) undoStack.shift();
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.style.display = 'none'; }, 1800);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(300, rect.width * devicePixelRatio);
  canvas.height = Math.max(300, rect.height * devicePixelRatio);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  clampCam();
}

function clampCam() {
  const maxX = Math.max(0, WORLD_COLS * CELL - canvas.clientWidth / zoom);
  const maxY = Math.max(0, WORLD_ROWS * CELL - canvas.clientHeight / zoom);
  camX = Math.max(0, Math.min(maxX, camX));
  camY = Math.max(0, Math.min(maxY, camY));
}

window.addEventListener('resize', resize);
resize();

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
  saveProfileData();
  savePlayerToFirebase();
  showToast('تم اختيار الشخصية');
}

function buildCharacterChoices() {
  const box = document.getElementById('characterChoices');
  if (!box) return;
  let html = '<h3>رجال</h3><div class="characterGrid">';
  for (let i = 1; i <= 10; i++) {
    const id = 'man-' + i;
    html += `<button class="characterChoice" data-id="${id}" type="button"><span class="characterPreviewFrame"><img class="characterPreviewImg" src="Characters/man/man-${i}.png" alt="رجل ${i}"></span><b>رجل ${i}</b></button>`;
  }
  html += '</div><h3>نساء</h3><div class="characterGrid">';
  for (let i = 1; i <= 10; i++) {
    const id = 'woman-' + i;
    html += `<button class="characterChoice" data-id="${id}" type="button"><span class="characterPreviewFrame"><img class="characterPreviewImg" src="Characters/woman/woman-${i}.png" alt="امرأة ${i}"></span><b>امرأة ${i}</b></button>`;
  }
  html += '</div>';
  box.innerHTML = html;
  box.querySelectorAll('.characterChoice').forEach(button => {
    button.classList.toggle('active', normalizeCharacterId(myCharacterId) === button.dataset.id);
    button.onclick = () => {
      box.querySelectorAll('.characterChoice').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      setCharacter(button.dataset.id);
    };
  });
}

function showCharacterModal(force = false) {
  myCharacterId = normalizeCharacterId(myCharacterId);
  if (myCharacterId && !force) return;
  buildCharacterChoices();
  document.getElementById('characterModal')?.classList.remove('hidden');
}

function drawFloorBackground(width, height) {
  if (!floorImage.complete || !floorImage.naturalWidth) return;
  const startCol = Math.max(1, Math.floor(camX / CELL) + 1);
  const endCol = Math.min(WORLD_COLS, Math.ceil((camX + width / zoom) / CELL) + 1);
  const startRow = Math.max(1, Math.floor(camY / CELL) + 1);
  const endRow = Math.min(WORLD_ROWS, Math.ceil((camY + height / zoom) / CELL) + 1);
  for (let col = startCol; col <= endCol; col++) {
    for (let row = startRow; row <= endRow; row++) {
      const sx = ((col - 1) * CELL - camX) * zoom;
      const sy = ((row - 1) * CELL - camY) * zoom;
      const size = CELL * zoom;
      ctx.drawImage(floorImage, sx, sy, size, size);
    }
  }
}

function drawGrid(width, height) {
  if (walkMode || gridOpacity <= 0) return;
  const startCol = Math.max(1, Math.floor(camX / CELL) + 1);
  const endCol = Math.min(WORLD_COLS, Math.ceil((camX + width / zoom) / CELL) + 1);
  const startRow = Math.max(1, Math.floor(camY / CELL) + 1);
  const endRow = Math.min(WORLD_ROWS, Math.ceil((camY + height / zoom) / CELL) + 1);
  ctx.lineWidth = 1;
  for (let col = startCol; col <= endCol; col++) {
    for (let row = startRow; row <= endRow; row++) {
      const sx = ((col - 1) * CELL - camX) * zoom;
      const sy = ((row - 1) * CELL - camY) * zoom;
      const size = CELL * zoom;
      ctx.strokeStyle = `rgba(147,197,253,${gridOpacity})`;
      ctx.strokeRect(sx, sy, size, size);
      ctx.fillStyle = `rgba(255,255,255,${gridOpacity})`;
      ctx.font = `${Math.max(10, 13 * zoom)}px Arial`;
      ctx.fillText(`${colName(col)}${row}`, sx + 6, sy + 16);
      ctx.strokeStyle = `rgba(255,255,255,${gridOpacity * 0.28})`;
      for (let i = 1; i < MINI; i++) {
        ctx.beginPath();
        ctx.moveTo(sx + i * size / MINI, sy);
        ctx.lineTo(sx + i * size / MINI, sy + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx, sy + i * size / MINI);
        ctx.lineTo(sx + size, sy + i * size / MINI);
        ctx.stroke();
      }
    }
  }
}

function drawItems() {
  const visibleItems = getItems().sort((a, b) => (a.layer || 1) - (b.layer || 1));
  for (const item of visibleItems) {
    const rect = itemRect(item);
    const point = worldToScreen(rect.x, rect.y);
    const tile = tileMap[item.tileId] || {};
    const img = getTileImage(tile.image);
    ctx.save();
    if (item.flipX) {
      ctx.translate(point.x + rect.w * zoom, point.y);
      ctx.scale(-1, 1);
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, rect.w * zoom, rect.h * zoom);
      else { ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, 0, rect.w * zoom, rect.h * zoom); }
    } else {
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, point.x, point.y, rect.w * zoom, rect.h * zoom);
      else { ctx.fillStyle = '#94a3b8'; ctx.fillRect(point.x, point.y, rect.w * zoom, rect.h * zoom); }
    }
    ctx.restore();

    if (!walkMode && (item.blocking || selectedIds.has(item.uid))) {
      ctx.strokeStyle = item.blocking ? '#ef4444' : '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(point.x, point.y, rect.w * zoom, rect.h * zoom);
    }

    if (!walkMode && selectedIds.has(item.uid)) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(point.x - 3, point.y - 3, rect.w * zoom + 6, rect.h * zoom + 6);
      ctx.lineWidth = 1;
    }
  }
}

function drawSpriteCharacter(x, y, dir, moving, name, characterId, isMe) {
  const point = worldToScreen(x, y);
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
  ctx.ellipse(point.x, point.y + 10 * zoom, 24 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  if (img.complete && img.naturalWidth) {
    const frameW = img.naturalWidth / SPRITE_COLS;
    const frameH = img.naturalHeight / SPRITE_ROWS;
    const sx = frame * frameW;
    const sy = row * frameH;
    ctx.drawImage(img, sx, sy, frameW, frameH, point.x - drawW / 2, point.y - drawH + 22 * zoom, drawW, drawH);
  } else {
    ctx.fillStyle = isMe ? '#22c55e' : '#f97316';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 15 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  const label = isMe ? (displayName || 'أنا') : (name || 'لاعب');
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(10, 13 * zoom)}px Arial`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.strokeText(label, point.x, point.y - drawH + 18 * zoom);
  ctx.fillText(label, point.x, point.y - drawH + 18 * zoom);
  ctx.textAlign = 'start';
  ctx.restore();
}

function drawPlayer() {
  drawSpriteCharacter(player.x, player.y, player.dir, playerMoving, 'أنا', myCharacterId || 'woman-1', true);
}

function drawOnlinePlayers() {
  const now = Date.now();
  for (const id in onlinePlayers) {
    if (id === getCurrentPlayerId()) continue;
    const data = onlinePlayers[id];
    if (!data || !data.walkMode) continue;
    if (now - (data.updatedAt || 0) > 20000) continue;
    drawSpriteCharacter(data.x || 0, data.y || 0, data.dir || 'down', !!data.moving, data.name || 'لاعب', data.character || 'woman-1', false);
  }
}

function drawSelectionBox() {
  if (!selectionBox || walkMode) return;
  ctx.strokeStyle = '#22c55e';
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
  ctx.setLineDash([]);
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, width, height);
  drawFloorBackground(width, height);
  drawGrid(width, height);
  drawItems();
  drawSelectionBox();
  drawOnlinePlayers();
  if (walkMode) drawPlayer();
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function initUI() {
  const cat = document.getElementById('categorySelect');
  if (cat) {
    cat.innerHTML = Object.entries(categories).map(([id, category]) => `<option value="${id}">${category.name}</option>`).join('');
    cat.onchange = () => { updateSizeFilter(); renderTiles(); };
  }

  document.getElementById('guestCodeBtn').onclick = loginWithGuestCode;
  document.getElementById('saveGuestCodeBtn').onclick = saveGuestCodePassword;
  document.getElementById('linkGuestEmailBtn').onclick = linkGuestToEmail;
  document.getElementById('deleteSelectedBtn').onclick = deleteSelectedItems;
  document.getElementById('displayNameInput').value = displayName;
  document.getElementById('displayNameInput').onchange = saveDisplayName;
  document.getElementById('aboutBtn').onclick = () => showInfo('من نحن', 'لعبة GameNjd هي لعبة بناء وتجول عربية، تقدر تبني داخل خلايا كبيرة وتختار شخصيتك وتتجول في العالم.');
  document.getElementById('shortcutsBtn').onclick = showShortcuts;
  document.getElementById('flipBtn').onclick = toggleFlip;
  document.getElementById('deleteAllBtn').onclick = deleteMyItems;
  document.getElementById('itemScale').oninput = updateItemScale;
  document.getElementById('stopWalkBtn').onclick = () => { if (walkMode) toggleWalk(); };
  document.getElementById('infoCloseBtn').onclick = () => document.getElementById('infoModal').classList.add('hidden');
  document.getElementById('changeCharacterBtn').onclick = () => showCharacterModal(true);
  document.getElementById('mobileGearBtn').onclick = () => panel.classList.toggle('closed');
  document.getElementById('zoomInBtn').onclick = () => { zoom = Math.min(3, zoom * 1.15); clampCam(); };
  document.getElementById('zoomOutBtn').onclick = () => { zoom = Math.max(0.2, zoom * 0.85); clampCam(); };
  document.getElementById('sizeFilter').onchange = renderTiles;
  document.getElementById('gridOpacity').oninput = e => { gridOpacity = Number(e.target.value); };
  document.getElementById('brushSize').oninput = e => { brushSize = Number(e.target.value || 1); };
  document.getElementById('layerInput').oninput = e => setActiveLayer(Number(e.target.value || 1));
  document.getElementById('eraseBtn').onclick = toggleEraser;
  document.getElementById('blockBtn').onclick = toggleBlocking;
  document.getElementById('undoBtn').onclick = undo;
  document.getElementById('jumpBtn').onclick = jump;
  document.getElementById('walkBtn').onclick = toggleWalk;
  document.getElementById('exportBtn').onclick = exportData;
  document.getElementById('importBtn').onclick = importData;
  document.getElementById('togglePanel').onclick = () => panel.classList.toggle('closed');
  document.getElementById('signupBtn').onclick = signup;
  document.getElementById('loginBtn').onclick = login;
  document.getElementById('logoutBtn').onclick = logout;

  document.querySelectorAll('.collapseBtn').forEach(button => {
    button.onclick = () => {
      button.classList.toggle('open');
      document.getElementById(button.dataset.target)?.classList.toggle('hidden');
    };
  });

  document.querySelectorAll('.layerBtn').forEach(button => {
    button.onclick = () => setActiveLayer(Number(button.dataset.layer));
  });

  const emailInput = document.getElementById('emailInput');
  if (emailInput && localStorage.getItem(LAST_EMAIL_KEY)) emailInput.value = localStorage.getItem(LAST_EMAIL_KEY);

  const guestInput = document.getElementById('guestCodeInput');
  if (guestInput) guestInput.value = getGuestId();

  updateSizeFilter();
  renderTiles();
  setActiveLayer(activeLayer);
  updateAuthUI();
}

function updateSizeFilter() {
  const catId = document.getElementById('categorySelect').value;
  const sizeSelect = document.getElementById('sizeFilter');
  const sizes = [...new Set(categories[catId].tiles.map(tile => tile.size))];
  const old = sizeSelect.value;
  sizeSelect.innerHTML = '<option value="all">الكل</option>' + sizes.map(size => `<option value="${size}">${SIZE_DATA[size]?.label || size}</option>`).join('');
  sizeSelect.value = sizes.includes(old) ? old : 'all';
}

function renderTiles() {
  const categoryId = document.getElementById('categorySelect').value;
  const selectedSize = document.getElementById('sizeFilter').value;
  const tiles = categories[categoryId].tiles.filter(tile => selectedSize === 'all' || tile.size === selectedSize);
  document.getElementById('tileset').innerHTML = tiles.map(tile => `
    <div class="tile" data-id="${tile.id}" title="${tile.name}">
      <img class="tileImg" src="${tile.image}" alt="${tile.name}" loading="lazy">
      <span>${tile.name}</span>
    </div>
  `).join('');

  document.querySelectorAll('.tile').forEach(tileElement => {
    tileElement.onclick = () => {
      document.querySelectorAll('.tile').forEach(item => item.classList.remove('active'));
      tileElement.classList.add('active');
      selectedTile = tileMap[tileElement.dataset.id];
      eraser = false;
      document.getElementById('eraseBtn').textContent = 'ممحاة: إيقاف';
    };
  });
}

function setActiveLayer(n) {
  activeLayer = Math.max(1, Math.min(99, Number(n || 1)));
  const input = document.getElementById('layerInput');
  if (input) input.value = activeLayer;
  document.querySelectorAll('.layerBtn').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.layer) === activeLayer);
  });
}

function updateAuthUI() {
  document.getElementById('statusText').textContent = walkMode ? 'وضع التجول' : `وضع البناء${currentUser ? ' - ' + currentUser : ''}`;
  const authState = document.getElementById('authState');
  if (authState) {
    authState.textContent = currentUser ? 'أنت مسجل دخول' : 'أنت لم تسجل دخول';
    authState.classList.toggle('online', !!currentUser);
    authState.classList.toggle('offline', !currentUser);
  }
  const guestBox = document.getElementById('guestIdBox');
  if (guestBox) guestBox.textContent = ` | معرفك: ${getGuestId()}`;
  const nameInput = document.getElementById('displayNameInput');
  if (nameInput && nameInput.value !== displayName) nameInput.value = displayName;
  const guestInput = document.getElementById('guestCodeInput');
  if (guestInput && !guestInput.value) guestInput.value = getGuestId();
}

function toggleEraser() {
  eraser = !eraser;
  document.getElementById('eraseBtn').textContent = `ممحاة: ${eraser ? 'تشغيل' : 'إيقاف'}`;
}

function getMouse(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { x, y, world: screenToWorld(x, y) };
}

function hitItem(x, y) {
  return getItems().sort((a, b) => (b.layer || 1) - (a.layer || 1)).find(item => {
    const rect = itemRect(item);
    return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
  });
}

function paintAt(x, y) {
  const baseCell = cellFromWorld(x, y);
  if (!baseCell) return;
  const half = Math.floor((brushSize - 1) / 2);
  for (let dx = -half; dx <= half; dx++) {
    for (let dy = -half; dy <= half; dy++) {
      paintOne(x + dx * (CELL / MINI), y + dy * (CELL / MINI));
    }
  }
}

function paintOne(x, y) {
  const cell = cellFromWorld(x, y);
  if (!cell) return;
  if (!canEditCell(cell.key)) return showToast('ممنوع البناء في أرض لاعب آخر');

  const localX = Math.max(2, Math.min(CELL - 2, x - cell.x));
  const localY = Math.max(2, Math.min(CELL - 2, y - cell.y));
  const snapX = Math.floor(localX / (CELL / MINI));
  const snapY = Math.floor(localY / (CELL / MINI));
  const key = `${cell.key}-${snapX}-${snapY}-${activeLayer}-${selectedTile?.id || 'none'}-${eraser}`;
  if (key === lastPaintKey) return;
  lastPaintKey = key;

  if (eraser) {
    eraseAt(x, y);
    return;
  }
  if (!selectedTile) return;

  const cellData = ensureCell(cell.key);
  const scaledW = Math.max(12, Math.min(CELL, Math.round(selectedTile.w * itemScale)));
  const scaledH = Math.max(12, Math.min(CELL, Math.round(selectedTile.h * itemScale)));
  const item = {
    uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    tileId: selectedTile.id,
    cell: cell.key,
    x: Math.max(0, Math.min(CELL - scaledW, localX - scaledW / 2)),
    y: Math.max(0, Math.min(CELL - scaledH, localY - scaledH / 2)),
    w: scaledW,
    h: scaledH,
    flipX: flipMode,
    layer: activeLayer,
    blocking: blockingMode || !!selectedTile.blocking
  };
  cellData.items.push(item);
  saveLocalWorld();
  saveCellToFirebase(cell.key);
}

function eraseAt(x, y) {
  const hit = hitItem(x, y);
  if (!hit) return;
  if (!canEditCell(hit.cell)) return showToast('ممنوع تعديل أرض لاعب آخر');
  world[hit.cell].items = world[hit.cell].items.filter(item => item.uid !== hit.uid);
  if (!world[hit.cell].items.length) delete world[hit.cell];
  saveLocalWorld();
  saveCellToFirebase(hit.cell);
}

function selectInBox(box) {
  selectedIds.clear();
  for (const item of getItems()) {
    const rect = itemRect(item);
    const point = worldToScreen(rect.x, rect.y);
    const iw = rect.w * zoom;
    const ih = rect.h * zoom;
    if (point.x < box.x + box.w && point.x + iw > box.x && point.y < box.y + box.h && point.y + ih > box.y) {
      selectedIds.add(item.uid);
    }
  }
}

function moveSelected(dx, dy) {
  if (!selectedIds.size) return;
  const changedCells = new Set();
  for (const item of getItems()) {
    if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
      item.x = Math.max(0, Math.min(CELL - item.w, item.x + dx));
      item.y = Math.max(0, Math.min(CELL - item.h, item.y + dy));
      changedCells.add(item.cell);
    }
  }
  saveLocalWorld();
  changedCells.forEach(saveCellToFirebase);
}

canvas.addEventListener('mousedown', event => {
  if (walkMode) return;
  isDown = true;
  lastPaintKey = '';
  const pos = getMouse(event);
  dragStart = pos;
  const hit = hitItem(pos.world.x, pos.world.y);
  if (event.button === 1 || event.altKey) dragMode = 'pan';
  else if (hit && !eraser) {
    dragMode = 'move';
    selectedIds = new Set([hit.uid]);
  } else if (!selectedTile && !eraser) {
    dragMode = 'select';
    selectionBox = { x: pos.x, y: pos.y, w: 0, h: 0 };
  } else {
    dragMode = 'paint';
    pushUndo();
    paintAt(pos.world.x, pos.world.y);
  }
});

canvas.addEventListener('mousemove', event => {
  if (!isDown || walkMode) return;
  const pos = getMouse(event);
  if (dragMode === 'paint') paintAt(pos.world.x, pos.world.y);
  if (dragMode === 'pan') {
    camX -= event.movementX / zoom;
    camY -= event.movementY / zoom;
    clampCam();
  }
  if (dragMode === 'select') {
    selectionBox = {
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y)
    };
  }
  if (dragMode === 'move') moveSelected(event.movementX / zoom, event.movementY / zoom);
});

window.addEventListener('mouseup', () => {
  if (dragMode === 'select' && selectionBox) selectInBox(selectionBox);
  isDown = false;
  dragMode = null;
  selectionBox = null;
  lastPaintKey = '';
});

canvas.addEventListener('wheel', event => {
  event.preventDefault();
  if (event.ctrlKey) {
    const before = getMouse(event);
    zoom *= event.deltaY < 0 ? 1.1 : 0.9;
    zoom = Math.max(0.2, Math.min(3, zoom));
    camX = before.world.x - before.x / zoom;
    camY = before.world.y - before.y / zoom;
  } else if (event.shiftKey) {
    camX += event.deltaY / zoom;
  } else {
    camY += event.deltaY / zoom;
  }
  clampCam();
}, { passive: false });

window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  keys[event.key] = true;

  if (!walkMode && (event.key === 'Delete' || event.key === 'Backspace') && selectedIds.size) {
    event.preventDefault();
    deleteSelectedItems();
    return;
  }

  if (!walkMode && event.ctrlKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undo();
    return;
  }

  if (walkMode) return;

  if (event.ctrlKey && event.key.toLowerCase() === 'c') {
    copyBuffer = getItems().filter(item => selectedIds.has(item.uid)).map(item => ({ ...item }));
    showToast('تم النسخ');
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'v') pasteItems();

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && selectedIds.size) {
    event.preventDefault();
    pushUndo();
    const move = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
    moveSelected(move[0], move[1]);
  }
});

window.addEventListener('keyup', event => {
  keys[event.key] = false;
});

function pasteItems() {
  if (!copyBuffer.length) return;
  pushUndo();
  selectedIds.clear();
  const changedCells = new Set();
  for (const old of copyBuffer) {
    if (!canEditCell(old.cell)) continue;
    const item = { ...old, uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), x: Math.min(CELL - old.w, old.x + 10), y: Math.min(CELL - old.h, old.y + 10) };
    ensureCell(item.cell).items.push(item);
    selectedIds.add(item.uid);
    changedCells.add(item.cell);
  }
  saveLocalWorld();
  changedCells.forEach(saveCellToFirebase);
  showToast('تم اللصق');
}

function undo() {
  const last = undoStack.pop();
  if (!last) return showToast('لا توجد خطوة سابقة');
  world = JSON.parse(last);
  saveWorld();
  selectedIds.clear();
  lastPaintKey = '';
  showToast('تم الرجوع خطوة');
}

function jump() {
  const cell = parseCell(document.getElementById('jumpInput').value);
  if (!cell) return showToast('اكتب خلية صحيحة مثل K90');
  camX = (cell.col - 1) * CELL - canvas.clientWidth / (2 * zoom) + CELL / 2;
  camY = (cell.row - 1) * CELL - canvas.clientHeight / (2 * zoom) + CELL / 2;
  clampCam();
}

function isBlocked(x, y) {
  return getItems().some(item => {
    if (!item.blocking) return false;
    const rect = itemRect(item);
    return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
  });
}

function toggleWalk() {
  const nextMode = !walkMode;
  if (nextMode) {
    previousBuildZoom = zoom;
    const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
    player.x = Math.max(20, Math.min(WORLD_COLS * CELL - 20, center.x));
    player.y = Math.max(20, Math.min(WORLD_ROWS * CELL - 20, center.y));
    zoom = Math.max(1.15, zoom);
    selectedIds.clear();
    selectionBox = null;
    isDown = false;
    dragMode = null;
    lastPaintKey = '';
  } else {
    zoom = previousBuildZoom || zoom;
    playerMoving = false;
    isDown = false;
    dragMode = null;
    lastPaintKey = '';
  }

  walkMode = nextMode;
  document.body.classList.toggle('walking', walkMode);
  document.getElementById('joystick').classList.toggle('hidden', !walkMode);
  document.getElementById('stopWalkBtn').classList.toggle('hidden', !walkMode);
  document.getElementById('walkBtn').textContent = walkMode ? 'رجوع للتصميم' : 'تجول';
  resize();
  updateAuthUI();
  savePlayerToFirebase();
}

function walkLoop() {
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
    const nx = Math.max(20, Math.min(WORLD_COLS * CELL - 20, player.x + dx));
    const ny = Math.max(20, Math.min(WORLD_ROWS * CELL - 20, player.y + dy));
    if (!isBlocked(nx, ny)) {
      player.x = nx;
      player.y = ny;
      if (dx || dy) savePlayerToFirebase();
    } else if (dx || dy) {
      playerMoving = false;
      savePlayerToFirebase();
    }
    camX = player.x - canvas.clientWidth / (2 * zoom);
    camY = player.y - canvas.clientHeight / (2 * zoom);
    clampCam();
  } else if (playerMoving) {
    playerMoving = false;
    savePlayerToFirebase();
  }
  requestAnimationFrame(walkLoop);
}
walkLoop();

function savePlayerToFirebase() {
  if (!window.db || !window.ref || !window.set) return;
  const id = getCurrentPlayerId();
  window.set(window.ref(window.db, 'players/' + id), {
    id,
    owner: currentOwner(),
    name: displayName || (currentUser ? 'لاعب' : getGuestId()),
    x: player.x,
    y: player.y,
    dir: player.dir,
    moving: playerMoving,
    walkMode,
    character: normalizeCharacterId(myCharacterId) || 'woman-1',
    updatedAt: Date.now()
  }).catch(error => console.error('Firebase player save error:', error));
}

function exportData() {
  document.getElementById('sheetData').value = JSON.stringify(world, null, 2);
  showToast('تم تجهيز البيانات للتصدير');
}

function importData() {
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

function setupJoystick() {
  const joy = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  let active = false;

  function resetStick() {
    active = false;
    stick.style.left = '36px';
    stick.style.top = '36px';
    keys.ArrowUp = keys.ArrowDown = keys.ArrowLeft = keys.ArrowRight = false;
  }

  joy.addEventListener('pointerdown', event => {
    active = true;
    joy.setPointerCapture(event.pointerId);
  });

  joy.addEventListener('pointerup', resetStick);
  joy.addEventListener('pointercancel', resetStick);

  joy.addEventListener('pointermove', event => {
    if (!active) return;
    const rect = joy.getBoundingClientRect();
    const center = rect.width / 2;
    const rawX = event.clientX - rect.left - center;
    const rawY = event.clientY - rect.top - center;
    const len = Math.min(42, Math.hypot(rawX, rawY));
    const angle = Math.atan2(rawY, rawX);
    const sx = Math.cos(angle) * len;
    const sy = Math.sin(angle) * len;
    stick.style.left = `${center - 24 + sx}px`;
    stick.style.top = `${center - 24 + sy}px`;
    keys.ArrowRight = sx > 15;
    keys.ArrowLeft = sx < -15;
    keys.ArrowDown = sy > 15;
    keys.ArrowUp = sy < -15;
  });
}

function setupTouchPan() {
  let lastTouch = null;
  canvas.addEventListener('touchstart', event => {
    if (!event.touches.length) return;
    const touch = event.touches[0];
    lastTouch = { x: touch.clientX, y: touch.clientY };
  }, { passive: false });

  canvas.addEventListener('touchmove', event => {
    if (!lastTouch || !event.touches.length) return;
    const touch = event.touches[0];
    const dx = touch.clientX - lastTouch.x;
    const dy = touch.clientY - lastTouch.y;
    if (!walkMode) {
      event.preventDefault();
      camX -= dx / zoom;
      camY -= dy / zoom;
      clampCam();
    }
    lastTouch = { x: touch.clientX, y: touch.clientY };
  }, { passive: false });

  canvas.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });
  canvas.addEventListener('touchcancel', () => { lastTouch = null; }, { passive: true });
}

function saveDisplayName(showMsg = true) {
  const input = document.getElementById('displayNameInput');
  displayName = (input?.value || '').trim().slice(0, 20);
  localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  saveProfileData();
  savePlayerToFirebase();
  if (showMsg) showToast('تم حفظ الاسم');
}

function showInfo(title, text) {
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoText').textContent = text;
  document.getElementById('infoModal').classList.remove('hidden');
}

function showShortcuts() {
  showInfo('شرح الاختصارات', 'Ctrl + عجلة: تقريب / إبعاد\nShift + عجلة: تحريك يمين ويسار\nCtrl + C: نسخ العناصر المحددة\nCtrl + V: لصق العناصر\nCtrl + Z: استعادة\nDelete أو Backspace: حذف العنصر المحدد\nالأسهم: تحريك العنصر المحدد أو الشخصية في وضع التجول');
}

function toggleFlip() {
  flipMode = !flipMode;
  document.getElementById('flipBtn').textContent = `عكس العنصر: ${flipMode ? 'تشغيل' : 'إيقاف'}`;
  if (!selectedIds.size) return;
  pushUndo();
  const changedCells = new Set();
  for (const item of getItems()) {
    if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
      item.flipX = !item.flipX;
      changedCells.add(item.cell);
    }
  }
  saveLocalWorld();
  changedCells.forEach(saveCellToFirebase);
}

function updateItemScale(event) {
  itemScale = Number(event.target.value || 1);
  if (!selectedIds.size) return;
  pushUndo();
  const changedCells = new Set();
  for (const item of getItems()) {
    if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
      const base = tileMap[item.tileId] || { w: item.w, h: item.h };
      item.w = Math.max(12, Math.min(CELL, Math.round(base.w * itemScale)));
      item.h = Math.max(12, Math.min(CELL, Math.round(base.h * itemScale)));
      item.x = Math.max(0, Math.min(CELL - item.w, item.x));
      item.y = Math.max(0, Math.min(CELL - item.h, item.y));
      changedCells.add(item.cell);
    }
  }
  saveLocalWorld();
  changedCells.forEach(saveCellToFirebase);
}

function deleteSelectedItems() {
  if (!selectedIds.size) return showToast('لم تحدد عنصرًا');
  pushUndo();
  const changedCells = new Set();
  for (const key in world) {
    const cell = world[key];
    if (!cell || !canEditCell(key)) continue;
    const before = (cell.items || []).length;
    cell.items = (cell.items || []).filter(item => !selectedIds.has(item.uid));
    if ((cell.items || []).length !== before) changedCells.add(key);
  }
  selectedIds.clear();
  lastPaintKey = '';
  for (const key of changedCells) {
    if (!world[key].items.length) delete world[key];
    saveCellToFirebase(key);
  }
  saveLocalWorld();
  showToast('تم حذف العنصر المحدد');
}

function deleteMyItems() {
  pushUndo();
  let changed = false;
  for (const key of Object.keys(world)) {
    if (canEditCell(key)) {
      delete world[key];
      removeCellFromFirebase(key);
      changed = true;
    }
  }
  selectedIds.clear();
  isDown = false;
  dragMode = null;
  lastPaintKey = '';
  if (changed) {
    saveLocalWorld();
    showToast('تم حذف جميع عناصرك');
  }
}

function toggleBlocking() {
  if (selectedIds.size) {
    pushUndo();
    const changedCells = new Set();
    for (const item of getItems()) {
      if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
        item.blocking = !item.blocking;
        changedCells.add(item.cell);
      }
    }
    saveLocalWorld();
    changedCells.forEach(saveCellToFirebase);
    showToast('تم تعديل عائق العنصر المحدد');
    return;
  }
  blockingMode = !blockingMode;
  document.getElementById('blockBtn').textContent = `جعل العنصر عائق: ${blockingMode ? 'تشغيل' : 'إيقاف'}`;
}

function centerStartOnce() {
  if (didInitialCenter) return;
  didInitialCenter = true;
  const occupied = Object.keys(world).filter(key => world[key]?.items?.length);
  let target = null;
  if (occupied.length) {
    const base = parseCell(occupied[Math.floor(Math.random() * occupied.length)]);
    if (base) {
      for (let radius = 1; radius <= 6 && !target; radius++) {
        for (let dc = -radius; dc <= radius && !target; dc++) {
          for (let dr = -radius; dr <= radius && !target; dr++) {
            const col = base.col + dc;
            const row = base.row + dr;
            if (col < 1 || row < 1 || col > WORLD_COLS || row > WORLD_ROWS) continue;
            const key = `${colName(col)}${row}`;
            if (!world[key] || !(world[key].items || []).length) target = { col, row, key };
          }
        }
      }
    }
  }
  if (!target) target = parseCell('CV100') || { col: 100, row: 100 };
  camX = (target.col - 1) * CELL - canvas.clientWidth / (2 * zoom) + CELL / 2;
  camY = (target.row - 1) * CELL - canvas.clientHeight / (2 * zoom) + CELL / 2;
  player.x = (target.col - 0.5) * CELL;
  player.y = (target.row - 0.5) * CELL;
  clampCam();
}

function simpleHash(text) {
  let h = 0;
  const value = String(text || '');
  for (let i = 0; i < value.length; i++) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return String(h >>> 0);
}

function safeEmailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/[.#$/\[\]]/g, '_');
}

function saveGuestCodePassword() {
  const input = document.getElementById('guestCodeInput');
  const code = (input.value.trim().toUpperCase() || getGuestId());
  const pass = document.getElementById('guestPassInput').value;
  if (!/^GNJ[A-Z0-9]{3,12}$/.test(code)) return showToast('اكتب معرف مثل GNJ8F3');
  if (!pass || pass.length < 4) return showToast('اكتب رقم سري 4 أحرف أو أكثر');
  if (!window.db || !window.ref || !window.set) return showToast('Firebase غير جاهز');
  window.set(window.ref(window.db, 'guestAccounts/' + code), {
    code,
    pass: simpleHash(pass),
    linkedUid: window.auth?.currentUser && !window.auth.currentUser.isAnonymous ? window.auth.currentUser.uid : '',
    emailOwner: currentUser || '',
    updatedAt: Date.now()
  }).then(() => {
    setGuestId(code);
    input.value = code;
    saveProfileData();
    updateAuthUI();
    showToast('تم حفظ رقم المعرف السري');
  }).catch(error => {
    console.error(error);
    showToast('فشل حفظ المعرف');
  });
}

function loginWithGuestCode() {
  const code = document.getElementById('guestCodeInput').value.trim().toUpperCase();
  const pass = document.getElementById('guestPassInput').value || '';
  if (!/^GNJ[A-Z0-9]{3,12}$/.test(code)) return showToast('معرف غير صحيح');
  if (!pass) return showToast('اكتب الرقم السري للمعرف');
  if (!window.db || !window.ref || !window.get) return showToast('Firebase غير جاهز');
  window.get(window.ref(window.db, 'guestAccounts/' + code)).then(snapshot => {
    const data = snapshot.val();
    if (!data || data.pass !== simpleHash(pass)) return showToast('المعرف أو الرقم السري غير صحيح');
    setGuestId(code);
    localStorage.setItem(LINKED_ID_KEY, code);
    updateAuthUI();
    saveProfileData();
    savePlayerToFirebase();
    showToast('تم الدخول بالمعرف');
  }).catch(error => {
    console.error(error);
    showToast('فشل الدخول بالمعرف');
  });
}

function transferGuestOwnership(oldGuestCode = getGuestId()) {
  const oldOwner = 'guest:' + oldGuestCode;
  const newOwner = currentOwner();
  if (oldOwner === newOwner) return false;
  let changed = false;
  for (const key in world) {
    if (world[key]?.owner === oldOwner) {
      world[key].owner = newOwner;
      changed = true;
      saveCellToFirebase(key);
    }
  }
  if (changed) {
    saveLocalWorld();
    showToast('تم نقل ملكية أرضك للحساب');
  }
  return changed;
}

function restoreLinkedGuestForCurrentUser() {
  const user = window.auth?.currentUser;
  if (!user || user.isAnonymous || !window.db || !window.ref || !window.get) return Promise.resolve(false);
  return window.get(window.ref(window.db, 'emailLinks/' + user.uid)).then(snapshot => {
    const data = snapshot.val();
    if (data && data.guestCode) {
      setGuestId(data.guestCode);
      localStorage.setItem(LINKED_ID_KEY, data.guestCode);
      const input = document.getElementById('guestCodeInput');
      if (input) input.value = data.guestCode;
      updateAuthUI();
      return true;
    }
    return false;
  }).catch(error => {
    console.error('restore linked guest error:', error);
    return false;
  });
}

function linkGuestToEmail() {
  const user = window.auth?.currentUser;
  if (!user || user.isAnonymous || !currentUser) return showToast('سجل دخول بالإيميل أولاً');
  if (!window.db || !window.ref || !window.set || !window.get) return showToast('Firebase غير جاهز');
  const code = getGuestId();
  const email = user.email || currentUser;
  const emailKey = safeEmailKey(email);
  window.get(window.ref(window.db, 'emailIndex/' + emailKey)).then(snapshot => {
    const used = snapshot.val();
    if (used && used.uid && used.uid !== user.uid) {
      showToast('هذا الإيميل مستخدم لمعرف معين');
      return;
    }
    transferGuestOwnership(code);
    return Promise.all([
      window.set(window.ref(window.db, 'emailLinks/' + user.uid), { guestCode: code, email, updatedAt: Date.now() }),
      window.set(window.ref(window.db, 'emailIndex/' + emailKey), { uid: user.uid, guestCode: code, updatedAt: Date.now() })
    ]).then(() => {
      localStorage.setItem(LINKED_ID_KEY, code);
      showToast('تم ربط المعرف بالإيميل');
    });
  }).catch(error => {
    console.error(error);
    showToast('فشل الربط');
  });
}

function saveProfileData() {
  if (!window.db || !window.ref || !window.set) return;
  const code = getGuestId();
  window.set(window.ref(window.db, 'profiles/' + code), {
    code,
    displayName: displayName || '',
    character: normalizeCharacterId(myCharacterId) || 'woman-1',
    linkedUid: window.auth?.currentUser && !window.auth.currentUser.isAnonymous ? window.auth.currentUser.uid : '',
    email: currentUser || '',
    updatedAt: Date.now()
  }).catch(error => console.error('profile save error:', error));
}

function signup() {
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const pass = document.getElementById('passInput').value;
  if (!email || !pass) return showToast('اكتب الإيميل والرقم السري');
  if (!window.auth) return showToast('Firebase Auth غير جاهز');
  window.createUserWithEmailAndPassword(window.auth, email, pass).then(() => {
    currentUser = email;
    localStorage.setItem(USER_KEY, email);
    localStorage.setItem(LAST_EMAIL_KEY, email);
    saveDisplayName(false);
    return restoreLinkedGuestForCurrentUser();
  }).then(() => {
    transferGuestOwnership();
    updateAuthUI();
    saveProfileData();
    savePlayerToFirebase();
    showToast('تم إنشاء الحساب');
  }).catch(error => {
    console.error(error);
    showToast('فشل إنشاء الحساب');
  });
}

function login() {
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const pass = document.getElementById('passInput').value;
  if (!email || !pass) return showToast('اكتب الإيميل والرقم السري');
  if (!window.auth) return showToast('Firebase Auth غير جاهز');
  window.signInWithEmailAndPassword(window.auth, email, pass).then(() => {
    currentUser = email;
    localStorage.setItem(USER_KEY, email);
    localStorage.setItem(LAST_EMAIL_KEY, email);
    saveDisplayName(false);
    return restoreLinkedGuestForCurrentUser();
  }).then(() => {
    transferGuestOwnership();
    updateAuthUI();
    saveProfileData();
    savePlayerToFirebase();
    showToast('تم تسجيل الدخول');
  }).catch(error => {
    console.error(error);
    showToast('بيانات الدخول غير صحيحة');
  });
}

function logout() {
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
    startAnonymousAuth();
    showToast('تم الخروج');
  });
}

function setupAuthState() {
  if (!window.auth || !window.onAuthStateChanged) {
    setTimeout(setupAuthState, 500);
    return;
  }
  window.onAuthStateChanged(window.auth, user => {
    if (user && !user.isAnonymous) {
      currentUser = user.email || currentUser || 'حساب مسجل';
      localStorage.setItem(USER_KEY, currentUser);
      localStorage.setItem(LAST_EMAIL_KEY, currentUser);
      const emailInput = document.getElementById('emailInput');
      if (emailInput) emailInput.value = user.email || '';
      restoreLinkedGuestForCurrentUser().then(() => {
        updateAuthUI();
        saveProfileData();
        savePlayerToFirebase();
      });
      return;
    }
    currentUser = '';
    localStorage.removeItem(USER_KEY);
    updateAuthUI();
    savePlayerToFirebase();
  });
}

function startAnonymousAuth() {
  if (!window.auth || !window.signInAnonymously) {
    setTimeout(startAnonymousAuth, 500);
    return;
  }
  if (window.auth.currentUser) {
    savePlayerToFirebase();
    return;
  }
  window.signInAnonymously(window.auth).then(() => savePlayerToFirebase()).catch(error => console.error('Anonymous login error:', error));
}

window.addEventListener('beforeunload', () => {
  savePlayerToFirebase();
});

setTimeout(() => document.body.classList.add('loaded'), 3000);

initUI();
myCharacterId = normalizeCharacterId(myCharacterId);
if (myCharacterId) localStorage.setItem(CHARACTER_KEY, myCharacterId);
showCharacterModal(false);
setupJoystick();
setupTouchPan();
setupAuthState();
startAnonymousAuth();
listenWorldFromFirebase();
listenPlayersFromFirebase();
setTimeout(centerStartOnce, 900);
savePlayerToFirebase();
