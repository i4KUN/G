'use strict';
// GameNjd v12.6

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const panel = document.getElementById('panel');
const toast = document.getElementById('toast');

const WORLD_COLS = 100;
const WORLD_ROWS = 100;
const CELL = 500;
const MINI = 10;

const VERSION = '12.5';

const SAVE_KEY = 'GameNjd_v125_world';
const CHARACTER_KEY = 'GameNjd_v125_character';
const DISPLAY_NAME_KEY = 'GameNjd_v125_display_name';
const LAST_EMAIL_KEY = 'GameNjd_v125_last_email';
const LAST_PLAYER_KEY = 'GameNjd_v125_last_player';
const HOME_KEY = 'GameNjd_v125_home_camera';
const SETTINGS_HELP_SEEN_KEY = 'GameNjd_v125_settings_help_seen';

const CHARACTER_BASE = 'Characters';
const ASSET_BASE = 'All-Pic/tiles';

const SPRITE_COLS = 4;
const SPRITE_ROWS = 4;
const PLAYER_DRAW_W = 92;
const PLAYER_DRAW_H = 92;

const DEFAULT_FLOOR_SRC = 'All-Pic/map-pic/00.png';

const edgeImagesSrc = {
  topRight: 'All-Pic/map-pic/01.png',
  bottomRight: 'All-Pic/map-pic/02.png',
  topLeft: 'All-Pic/map-pic/03.png',
  bottomLeft: 'All-Pic/map-pic/04.png',
  top: 'All-Pic/map-pic/05.png',
  bottom: 'All-Pic/map-pic/06.png',
  right: 'All-Pic/map-pic/07.png',
  left: 'All-Pic/map-pic/08.png'
};

const fixedGroundTiles = [
  { cell: 'H12', src: 'All-Pic/map-pic/09.png' },
  { cell: 'R18', src: 'All-Pic/map-pic/09.png' },
  { cell: 'AF15', src: 'All-Pic/map-pic/09.png' },
  { cell: 'BQ20', src: 'All-Pic/map-pic/09.png' },
  { cell: 'CN14', src: 'All-Pic/map-pic/09.png' },
  { cell: 'J76', src: 'All-Pic/map-pic/09.png' },
  { cell: 'AD84', src: 'All-Pic/map-pic/09.png' },
  { cell: 'BK78', src: 'All-Pic/map-pic/09.png' },
  { cell: 'CV86', src: 'All-Pic/map-pic/09.png' },
  { cell: 'CX35', src: 'All-Pic/map-pic/09.png' },

  { cell: 'M28', src: 'All-Pic/map-pic/10.png' },
  { cell: 'X9', src: 'All-Pic/map-pic/10.png' },
  { cell: 'AL31', src: 'All-Pic/map-pic/10.png' },
  { cell: 'BA11', src: 'All-Pic/map-pic/10.png' },
  { cell: 'CS25', src: 'All-Pic/map-pic/10.png' },
  { cell: 'F63', src: 'All-Pic/map-pic/10.png' },
  { cell: 'AH69', src: 'All-Pic/map-pic/10.png' },
  { cell: 'BP90', src: 'All-Pic/map-pic/10.png' },
  { cell: 'CD72', src: 'All-Pic/map-pic/10.png' },
  { cell: 'CJ54', src: 'All-Pic/map-pic/10.png' }
];


const fixedAnimalTiles = [
  { cell: 'E8', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'P17', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'AB9', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'AO25', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'BH13', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'CS31', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'K64', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'AD77', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'BP88', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'CV55', src: 'All-Pic/animal/animal-01.gif' }
];

const SIZE_DATA = {
  Big: { label: 'كبير', w: 160, h: 160 },
  Medium: { label: 'متوسط', w: 95, h: 95 },
  Small: { label: 'صغير', w: 55, h: 55 },
  Precise: { label: 'دقيق', w: 30, h: 30 }
};

const tileGroups = [
  { key: 'bag', name: 'أكياس', folder: 'Bag', prefix: 'Bag', count: 10, w: 75, h: 75, blocking: false },
  { key: 'lighting', name: 'إنارات', folder: 'Lighting', prefix: 'Lighting', count: 10, w: 70, h: 90, blocking: false },
  { key: 'door', name: 'باب', folder: 'Door', prefix: 'Door', count: 11, w: 100, h: 120, blocking: true },
  { key: 'coffee_pot', name: 'دلة', folder: 'teapot', prefix: 'teapot', count: 18, w: 70, h: 70, blocking: false },
  { key: 'cabinet', name: 'دولاب', folder: 'Cabinet', prefix: 'Cabinet', count: 16, w: 120, h: 120, blocking: false },
  { key: 'decor', name: 'ديكورات', folder: 'Decor', prefix: 'Decor', count: 74, w: 70, h: 70, blocking: false },
  { key: 'carpet', name: 'زولية', folder: 'Carpet', prefix: 'Carpet', count: 13, w: 150, h: 120, blocking: false },
  { key: 'curtain', name: 'ستارة', folder: 'Curtain', prefix: 'Curtain', count: 14, w: 100, h: 120, blocking: false },
  { key: 'bed', name: 'سرير', folder: 'Bed', prefix: 'Bed', count: 5, w: 150, h: 110, blocking: false },
  { key: 'plant', name: 'شجرة', folder: 'Plant', prefix: 'Plant', count: 106, w: 80, h: 80, blocking: false },
  { key: 'bedsheet', name: 'شرشف', folder: 'Bedsheet', prefix: 'Bedsheet', count: 24, w: 130, h: 100, blocking: false },
  { key: 'plate', name: 'صحن', folder: 'Plate', prefix: 'Plate', count: 83, w: 65, h: 65, blocking: false },
  { key: 'box', name: 'صندوق', folder: 'Box', prefix: 'Box', count: 8, w: 80, h: 80, blocking: false },
  { key: 'table', name: 'طاولة', folder: 'Table', prefix: 'Table', count: 49, w: 120, h: 90, blocking: false },
  { key: 'pottery', name: 'فخار', folder: 'Pottery', prefix: 'Pottery', count: 25, w: 75, h: 75, blocking: false },
  { key: 'cooking_pot', name: 'قدر', folder: 'Pot', prefix: 'Pot', count: 12, w: 75, h: 75, blocking: false },
  { key: 'chair', name: 'كرسي', folder: 'Chair', prefix: 'Chair', count: 15, w: 95, h: 95, blocking: false },
  { key: 'cup', name: 'كوب', folder: 'Cup', prefix: 'Cup', count: 18, w: 55, h: 55, blocking: false },
  { key: 'painting', name: 'لوحة', folder: 'Painting', prefix: 'Painting', count: 20, w: 90, h: 75, blocking: false },
  { key: 'pillow', name: 'مخدة', folder: 'Pillow', prefix: 'Pillow', count: 41, w: 70, h: 55, blocking: false },
  { key: 'floor_mattress', name: 'مرتبة', folder: 'Mattress', prefix: 'Mattress', count: 12, w: 130, h: 100, blocking: false },
  { key: 'window', name: 'نافذة', folder: 'Window', prefix: 'Window', count: 15, w: 95, h: 95, blocking: false },
  { key: 'floor', name: 'ارضيات', folder: 'Floof', prefix: 'Floof', count: 86, w: 220, h: 220, blocking: false },
  { key: 'wall', name: 'جدران', folder: 'Wall', prefix: 'Wall', count: 27, w: 160, h: 160, blocking: true }
];

let zoom = 0.55;
let camX = 0;
let camY = 0;
let gridOpacity = 0.45;

let selectedTile = null;
let activeCategory = '';
let activeLayer = 1;
let brushSize = 1;
let eraser = false;
let blockingMode = false;
let flipMode = false;
let flipYMode = false;
let autoAlignMode = false;
let itemScale = 1.10;

let walkMode = false;
let isDown = false;
let lastPaintKey = '';
let selectedIds = new Set();
let selectionBox = null;
let dragMode = null;
let dragStart = null;
let copyBuffer = [];
let undoStack = [];
let selectedResize = null;
let tilePreviewEnabled = true;

let currentUser = null;
let currentUserEmail = '';
let displayName = localStorage.getItem(DISPLAY_NAME_KEY) || '';
let myCharacterId = localStorage.getItem(CHARACTER_KEY) || '';
let onlinePlayers = {};
let world = loadWorld();
let player = loadLastPlayer();

let previousBuildZoom = zoom;
let playerMoving = false;
let didInitialCenter = false;
let lastUiUpdate = 0;
let lastSavedSnapshot = '';

const keys = {};
const imageCache = {};
const characterImageCache = {};
const alphaBoxCache = {};
const floorImage = new Image();
floorImage.src = DEFAULT_FLOOR_SRC;

let confirmCallback = null;

/* ===== Data ===== */

function loadLastPlayer() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_PLAYER_KEY));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      return {
        x: saved.x,
        y: saved.y,
        speed: 5,
        dir: saved.dir || 'down'
      };
    }
  } catch {}

  return {
    x: (50 - 0.5) * CELL,
    y: (50 - 0.5) * CELL,
    speed: 5,
    dir: 'down'
  };
}

function saveLastPlayer() {
  localStorage.setItem(LAST_PLAYER_KEY, JSON.stringify({
    x: player.x,
    y: player.y,
    dir: player.dir
  }));
}

function getTileSize(groupKey, size) {
  if (groupKey === 'floors') return { w: 220, h: 220 };
  if (groupKey === 'walls' && size === 'Big') return { w: 190, h: 190 };
  if (groupKey === 'walls' && size === 'Medium') return { w: 145, h: 145 };
  if (groupKey === 'carpets' && size === 'Medium') return { w: 145, h: 145 };
  if (groupKey === 'carpets' && size === 'Small') return { w: 85, h: 85 };
  if (groupKey === 'doors' && size === 'Medium') return { w: 95, h: 95 };
  if (groupKey === 'doors' && size === 'Precise') return { w: 45, h: 45 };

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
    if (!result[group.key]) {
      result[group.key] = {
        name: group.name,
        tiles: []
      };
    }

    for (let i = 1; i <= group.count; i++) {
      const number = String(i).padStart(3, '0');

      result[group.key].tiles.push({
        id: `${group.folder}_${number}`,
        name: `${group.name} ${number}`,
        image: `${ASSET_BASE}/${group.folder}/${group.prefix}-${number}.png`,
        w: group.w,
        h: group.h,
        size: 'auto',
        category: group.key,
        blocking: !!group.blocking
      });
    }
  }

  return result;
}

const categories = buildCategories();

const tileMap = Object.fromEntries(
  Object.values(categories).flatMap(category => category.tiles.map(tile => [tile.id, tile]))
);

function loadWorld() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLocalWorld() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(world));
}

function normalizeWorldData(data) {
  const result = {};

  for (const key in data || {}) {
    const cell = data[key];

    if (!cell || typeof cell !== 'object' || cell === true) continue;

    const items = Array.isArray(cell.items) ? cell.items : Object.values(cell.items || {});

    result[key] = {
      owner: cell.owner || '',
      items: items.filter(item => item && item.uid && item.tileId)
    };
  }

  return result;
}

/* ===== Auth ===== */

function isLoggedIn() {
  return !!(window.auth && window.auth.currentUser && !window.auth.currentUser.isAnonymous);
}

function requireLogin(message = 'يجب تسجيل الدخول أو إنشاء حساب للعب') {
  if (isLoggedIn()) return true;

  showToast(message);
  openAuthModal();
  return false;
}

function currentOwner() {
  return isLoggedIn() ? window.auth.currentUser.uid : '';
}

function canEditCell(key) {
  const cell = world[key];
  return isLoggedIn() && (!cell || !cell.owner || cell.owner === currentOwner());
}

function ensureCell(key) {
  if (!world[key]) world[key] = { owner: currentOwner(), items: [] };
  if (!world[key].owner) world[key].owner = currentOwner();
  if (!Array.isArray(world[key].items)) world[key].items = Object.values(world[key].items || {});
  return world[key];
}

function disablePlayButtonsIfGuest() {
  const mustLoginIds = [
    'walkBtn',
    'changeCharacterBtn',
    'eraseBtn',
    'undoBtn',
    'blockBtn',
    'flipBtn',
    'deleteSelectedBtn',
    'deleteAllBtn',
    'mobileUndoBtn',
    'mobileEraseBtn',
    'mobileBlockBtn',
    'mobileFlipBtn',
    'mobileFlipYBtn',
    'mobileDeleteBtn',
    'flipYBtn',
    'homeBtn',
    'autoAlignBtn'
  ];

  mustLoginIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isLoggedIn();
  });
}

/* ===== Firebase ===== */

function saveCellToFirebase(cellKey) {
  if (!window.db || !window.ref || !window.set || !window.remove) return;

  const cell = world[cellKey];

  if (!cell || !Array.isArray(cell.items) || cell.items.length === 0) {
    removeCellFromFirebase(cellKey);
    return;
  }

  window.set(window.ref(window.db, 'world/' + cellKey), {
    owner: cell.owner,
    items: cell.items
  }).catch(error => {
    console.error('Firebase cell save error:', error);
    showToast('فشل حفظ الخلية');
  });
}

function removeCellFromFirebase(cellKey) {
  if (!window.db || !window.ref || !window.remove) return;

  window.remove(window.ref(window.db, 'world/' + cellKey)).catch(error => {
    console.error('Firebase cell remove error:', error);
    showToast('فشل حذف الخلية من Firebase');
  });
}

function saveWorldToFirebaseFull() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;

  window.set(window.ref(window.db, 'world'), world).catch(error => {
    console.error('Firebase world save error:', error);
    showToast('فشل حفظ العالم');
  });
}

function saveWorld() {
  saveLocalWorld();

  if (!isLoggedIn()) return;

  for (const key in world) {
    if (canEditCell(key)) saveCellToFirebase(key);
  }
}

function listenWorldFromFirebase() {
  if (!window.db || !window.ref || !window.onValue) {
    setTimeout(listenWorldFromFirebase, 400);
    return;
  }

  window.onValue(window.ref(window.db, 'world'), snapshot => {
    if (dragMode || isDown) return;

    world = normalizeWorldData(snapshot.val() || {});
    saveLocalWorld();
    lastSavedSnapshot = JSON.stringify(world);
    centerStartOnce();
    updateInfoPanel();
  }, error => {
    console.error(error);
    showToast('فشل الاتصال بالعالم');
  });
}

function listenPlayersFromFirebase() {
  if (!window.db || !window.ref || !window.onValue) {
    setTimeout(listenPlayersFromFirebase, 400);
    return;
  }

  window.onValue(window.ref(window.db, 'players'), snapshot => {
    onlinePlayers = snapshot.val() || {};
  });
}

/* ===== Helpers ===== */

function getTileImage(src) {
  if (!src) return null;

  if (!imageCache[src]) {
    const img = new Image();
    img.src = src;
    imageCache[src] = img;
  }

  return imageCache[src];
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
  return {
    x: (x - camX) * zoom,
    y: (y - camY) * zoom
  };
}

function screenToWorld(x, y) {
  return {
    x: x / zoom + camX,
    y: y / zoom + camY
  };
}

function cellFromWorld(x, y) {
  const col = Math.floor(x / CELL) + 1;
  const row = Math.floor(y / CELL) + 1;

  if (col < 1 || row < 1 || col > WORLD_COLS || row > WORLD_ROWS) return null;

  return {
    col,
    row,
    key: `${colName(col)}${row}`,
    x: (col - 1) * CELL,
    y: (row - 1) * CELL
  };
}

function getItems() {
  return Object.values(world).flatMap(cell => Array.isArray(cell.items) ? cell.items : []);
}

function getMyItems() {
  const owner = currentOwner();
  if (!owner) return [];
  return getItems().filter(item => item.owner === owner || world[item.cell]?.owner === owner);
}

function itemRect(item) {
  const cell = parseCell(item.cell);

  if (!cell) return { x: 0, y: 0, w: item.w || 0, h: item.h || 0 };

  return {
    x: (cell.col - 1) * CELL + item.x,
    y: (cell.row - 1) * CELL + item.y,
    w: item.w,
    h: item.h
  };
}

function getAlphaBox(item) {
  const tile = tileMap[item.tileId];
  if (!tile) return { left: 0.12, top: 0.12, right: 0.88, bottom: 0.88 };

  const img = getTileImage(tile.image);

  if (!img || !img.complete || !img.naturalWidth) {
    return { left: 0.12, top: 0.12, right: 0.88, bottom: 0.88 };
  }

  if (alphaBoxCache[tile.image]) return alphaBoxCache[tile.image];

  const small = document.createElement('canvas');
  const sctx = small.getContext('2d', { willReadFrequently: true });
  const w = 64;
  const h = 64;

  small.width = w;
  small.height = h;

  try {
    sctx.drawImage(img, 0, 0, w, h);

    const data = sctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];

        if (alpha > 20) {
          found = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (found) {
      alphaBoxCache[tile.image] = {
        left: minX / w,
        top: minY / h,
        right: maxX / w,
        bottom: maxY / h
      };

      return alphaBoxCache[tile.image];
    }
  } catch {}

  alphaBoxCache[tile.image] = { left: 0.12, top: 0.12, right: 0.88, bottom: 0.88 };
  return alphaBoxCache[tile.image];
}

function visualRect(item) {
  const rect = itemRect(item);
  const box = getAlphaBox(item);

  return {
    x: rect.x + rect.w * box.left,
    y: rect.y + rect.h * box.top,
    w: rect.w * (box.right - box.left),
    h: rect.h * (box.bottom - box.top)
  };
}

function collisionRect(item) {
  const rect = visualRect(item);
  const shrink = 0.05;

  return {
    x: rect.x + rect.w * shrink,
    y: rect.y + rect.h * shrink,
    w: rect.w * (1 - shrink * 2),
    h: rect.h * (1 - shrink * 2)
  };
}

function rectsHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function getMouse(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  return { x, y, world: screenToWorld(x, y) };
}

function pushUndo() {
  undoStack.push(JSON.stringify(world));
  if (undoStack.length > 80) undoStack.shift();
}

function clearPaintState() {
  lastPaintKey = '';
  isDown = false;
  dragMode = null;
  selectionBox = null;
  selectedResize = null;
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(300, rect.width);
  const h = Math.max(300, rect.height);

  canvas.width = Math.round(w * devicePixelRatio);
  canvas.height = Math.round(h * devicePixelRatio);

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

/* ===== Toast / Modals ===== */

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.style.display = 'block';

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 2400);
}

function showAuthMessage(message) {
  const box = document.getElementById('authMessage');
  if (box) box.textContent = message || '';
}

function openAuthModal() {
  document.getElementById('authModal')?.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal')?.classList.add('hidden');
  showAuthMessage('');
}

function showInfo(title, text, isHtml = false) {
  const modal = document.getElementById('infoModal');
  const titleBox = document.getElementById('infoTitle');
  const textBox = document.getElementById('infoText');

  if (titleBox) titleBox.textContent = title;
  if (textBox) {
    if (isHtml) textBox.innerHTML = text;
    else textBox.textContent = text;
  }
  if (modal) modal.classList.remove('hidden');
}

function openConfirm(title, text, callback) {
  confirmCallback = callback;

  const modal = document.getElementById('confirmModal');
  const titleBox = document.getElementById('confirmTitle');
  const textBox = document.getElementById('confirmText');

  if (titleBox) titleBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${title}`;
  if (textBox) {
    if (isHtml) textBox.innerHTML = text;
    else textBox.textContent = text;
  }
  if (modal) modal.classList.remove('hidden');
}

function closeConfirm(answer) {
  document.getElementById('confirmModal')?.classList.add('hidden');

  const cb = confirmCallback;
  confirmCallback = null;

  if (answer && typeof cb === 'function') cb();
}

/* ===== Characters ===== */

function normalizeCharacterId(id) {
  if (!id) return '';
  if (id.startsWith('male_')) return 'man-' + Number(id.split('_')[1] || 1);
  if (id.startsWith('female_')) return 'woman-' + Number(id.split('_')[1] || 1);
  return id;
}

function getCharacterSrc(id) {
  const fixedId = normalizeCharacterId(id || 'woman-1');

  if (fixedId.startsWith('man-')) return `All-Pic/${CHARACTER_BASE}/man/${fixedId}.png`;
  if (fixedId.startsWith('woman-')) return `All-Pic/${CHARACTER_BASE}/woman/${fixedId}.png`;

  return `All-Pic/${CHARACTER_BASE}/woman/woman-1.png`;
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
  if (!requireLogin()) return;

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
    html += `
      <button class="characterChoice" data-id="${id}" type="button">
        <span class="characterPreviewFrame">
          <img class="characterPreviewImg" src="All-Pic/Characters/man/man-${i}.png" alt="رجل ${i}">
        </span>
        <b>رجل ${i}</b>
      </button>
    `;
  }

  html += '</div><h3>نساء</h3><div class="characterGrid">';

  for (let i = 1; i <= 10; i++) {
    const id = 'woman-' + i;
    html += `
      <button class="characterChoice" data-id="${id}" type="button">
        <span class="characterPreviewFrame">
          <img class="characterPreviewImg" src="All-Pic/Characters/woman/woman-${i}.png" alt="امرأة ${i}">
        </span>
        <b>امرأة ${i}</b>
      </button>
    `;
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
  if (!requireLogin()) return;

  myCharacterId = normalizeCharacterId(myCharacterId);

  if (myCharacterId && !force) return;

  buildCharacterChoices();
  document.getElementById('characterModal')?.classList.remove('hidden');
}

/* ===== Drawing ===== */

function getEdgeFloorSrc(col, row) {
  const isTop = row === 1;
  const isBottom = row === WORLD_ROWS;
  const isLeft = col === 1;
  const isRight = col === WORLD_COLS;

  if (isTop && isRight) return edgeImagesSrc.topRight;
  if (isBottom && isRight) return edgeImagesSrc.bottomRight;
  if (isTop && isLeft) return edgeImagesSrc.topLeft;
  if (isBottom && isLeft) return edgeImagesSrc.bottomLeft;
  if (isTop) return edgeImagesSrc.top;
  if (isBottom) return edgeImagesSrc.bottom;
  if (isRight) return edgeImagesSrc.right;
  if (isLeft) return edgeImagesSrc.left;

  return DEFAULT_FLOOR_SRC;
}

function drawFloorBackground(width, height) {
  const startCol = Math.max(1, Math.floor(camX / CELL) + 1);
  const endCol = Math.min(WORLD_COLS, Math.ceil((camX + width / zoom) / CELL) + 1);
  const startRow = Math.max(1, Math.floor(camY / CELL) + 1);
  const endRow = Math.min(WORLD_ROWS, Math.ceil((camY + height / zoom) / CELL) + 1);

  for (let col = startCol; col <= endCol; col++) {
    for (let row = startRow; row <= endRow; row++) {
      const src = getEdgeFloorSrc(col, row);
      const img = getTileImage(src);
      const sx = ((col - 1) * CELL - camX) * zoom;
      const sy = ((row - 1) * CELL - camY) * zoom;
      const size = CELL * zoom;
      const bleed = 1;

      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, sx - bleed, sy - bleed, size + bleed * 2, size + bleed * 2);
      } else if (floorImage.complete && floorImage.naturalWidth) {
        ctx.drawImage(floorImage, sx - bleed, sy - bleed, size + bleed * 2, size + bleed * 2);
      } else {
        ctx.fillStyle = '#a16207';
        ctx.fillRect(sx - bleed, sy - bleed, size + bleed * 2, size + bleed * 2);
      }
    }
  }
}

function drawFixedGroundTiles() {
  for (const ground of fixedGroundTiles) {
    const cell = parseCell(ground.cell);
    if (!cell) continue;

    const img = getTileImage(ground.src);
    const x = (cell.col - 1) * CELL;
    const y = (cell.row - 1) * CELL;
    const point = worldToScreen(x, y);
    const size = CELL * zoom;

    if (
      point.x + size < -100 ||
      point.y + size < -100 ||
      point.x > canvas.clientWidth + 100 ||
      point.y > canvas.clientHeight + 100
    ) {
      continue;
    }

    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, point.x, point.y, size, size);
    }
  }
}


function drawFixedAnimals() {
  for (const animal of fixedAnimalTiles) {
    const cell = parseCell(animal.cell);
    if (!cell) continue;

    const img = getTileImage(animal.src);
    const sizeWorld = CELL * 0.22;
    const x = (cell.col - 1) * CELL + CELL / 2 - sizeWorld / 2;
    const y = (cell.row - 1) * CELL + CELL / 2 - sizeWorld / 2;
    const point = worldToScreen(x, y);
    const size = sizeWorld * zoom;

    if (
      point.x + size < -100 ||
      point.y + size < -100 ||
      point.x > canvas.clientWidth + 100 ||
      point.y > canvas.clientHeight + 100
    ) {
      continue;
    }

    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, point.x, point.y, size, size);
    }
  }
}

function isNightActive() {
  return Math.floor(Date.now() / (60 * 60 * 1000)) % 2 === 1;
}

function drawNightFilter(width, height) {
  if (!isNightActive()) return;

  ctx.fillStyle = 'rgba(0, 20, 60, 0)';
  ctx.fillRect(0, 0, width, height);
}

function drawLights() {
  if (!isNightActive()) return;

  const visibleItems = getItems();

  for (const item of visibleItems) {
    if (!String(item.tileId || '').includes('Lighting')) continue;

    const rect = itemRect(item);
    const point = worldToScreen(rect.x, rect.y);

    const lightX = point.x + rect.w * zoom / 2;
    const lightY = point.y + rect.h * zoom / 2;
    const radius = 160 * zoom;

    const glow = ctx.createRadialGradient(lightX, lightY, 10, lightX, lightY, radius);
    glow.addColorStop(0, 'rgb(255 254 0 / 55%)');
    glow.addColorStop(1, 'rgb(255 255 230 / 5%)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lightX, lightY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrid(width, height) {
  if (walkMode) return;
  if (gridOpacity <= 0) return;

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
      ctx.fillText(`${colName(col)}${row}`, sx + 8, sy + 18);

      if (gridOpacity > 0.05) {
        ctx.strokeStyle = `rgba(255,255,255,${gridOpacity * 0.22})`;

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
}

function drawItems() {
  const visibleItems = getItems().sort((a, b) => (a.layer || 1) - (b.layer || 1));

  for (const item of visibleItems) {
    const rect = itemRect(item);
    const point = worldToScreen(rect.x, rect.y);
    const tile = tileMap[item.tileId] || {};
    const img = getTileImage(tile.image);

    if (
      point.x + rect.w * zoom < -100 ||
      point.y + rect.h * zoom < -100 ||
      point.x > canvas.clientWidth + 100 ||
      point.y > canvas.clientHeight + 100
    ) {
      continue;
    }

    drawImageItem(img, point.x, point.y, rect.w * zoom, rect.h * zoom, !!item.flipX, 1, !!item.flipY);

    if (!walkMode && selectedIds.has(item.uid)) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(point.x - 3, point.y - 3, rect.w * zoom + 6, rect.h * zoom + 6);
      drawResizeHandles(item);
      ctx.lineWidth = 1;
    }

    if (!walkMode && item.blocking && gridOpacity > 0) {
      const cr = collisionRect(item);
      const cp = worldToScreen(cr.x, cr.y);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(cp.x, cp.y, cr.w * zoom, cr.h * zoom);
    }
  }
}

function drawImageItem(img, x, y, w, h, flip, alpha, flipY = false) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + (flip ? w : 0), y + (flipY ? h : 0));
  ctx.scale(flip ? -1 : 1, flipY ? -1 : 1);

  if (img && img.complete && img.naturalWidth) {
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

function drawGhostTile() {
  if (walkMode || !selectedTile || !mouseWorldPos || selectedIds.size) return;

  const cell = cellFromWorld(mouseWorldPos.x, mouseWorldPos.y);
  if (!cell) return;

  const img = getTileImage(selectedTile.image);
  const w = Math.max(12, Math.min(CELL * 2, Math.round(selectedTile.w * itemScale)));
  const h = Math.max(12, Math.min(CELL * 2, Math.round(selectedTile.h * itemScale)));
  const x = mouseWorldPos.x - w / 2;
  const y = mouseWorldPos.y - h / 2;
  const p = worldToScreen(x, y);

  drawImageItem(img, p.x, p.y, w * zoom, h * zoom, flipMode, 0.45, flipYMode);

  ctx.strokeStyle = 'rgba(34,197,94,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x, p.y, w * zoom, h * zoom);
}

function getResizeHandles(item) {
  const rect = itemRect(item);
  const p = worldToScreen(rect.x, rect.y);
  const w = rect.w * zoom;
  const h = rect.h * zoom;
  const s = 12;

  return [
    { name: 'tl', x: p.x - s / 2, y: p.y - s / 2, w: s, h: s },
    { name: 'tr', x: p.x + w - s / 2, y: p.y - s / 2, w: s, h: s },
    { name: 'bl', x: p.x - s / 2, y: p.y + h - s / 2, w: s, h: s },
    { name: 'br', x: p.x + w - s / 2, y: p.y + h - s / 2, w: s, h: s }
  ];
}

function drawResizeHandles(item) {
  for (const h of getResizeHandles(item)) {
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function hitResizeHandle(screenX, screenY) {
  if (selectedIds.size !== 1) return null;

  const selected = getItems().find(item => selectedIds.has(item.uid));
  if (!selected) return null;

  for (const handle of getResizeHandles(selected)) {
    if (
      screenX >= handle.x &&
      screenY >= handle.y &&
      screenX <= handle.x + handle.w &&
      screenY <= handle.y + handle.h
    ) {
      return { item: selected, handle: handle.name };
    }
  }

  return null;
}

function drawSpriteCharacter(x, y, dir, moving, name, characterId, isMe) {
  const point = worldToScreen(x, y);
  const drawW = PLAYER_DRAW_W * zoom;
  const drawH = PLAYER_DRAW_H * zoom;

  const rowMap = {
    down: 0,
    right: 1,
    up: 2,
    left: 3
  };

  const row = rowMap[dir] ?? 0;
  const frame = moving ? Math.floor(Date.now() / 150) % SPRITE_COLS : 0;
  const img = getCharacterImage(characterId || 'woman-1');

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(point.x, point.y + 8 * zoom, 20 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  if (img.complete && img.naturalWidth) {
    const frameW = img.naturalWidth / SPRITE_COLS;
    const frameH = img.naturalHeight / SPRITE_ROWS;
    const sx = frame * frameW;
    const sy = row * frameH;

    ctx.drawImage(
      img,
      sx,
      sy,
      frameW,
      frameH,
      point.x - drawW / 2,
      point.y - drawH + 18 * zoom,
      drawW,
      drawH
    );
  } else {
    ctx.fillStyle = isMe ? '#22c55e' : '#f97316';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 13 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  const label = isMe ? (displayName || 'أنا') : (name || 'لاعب');

  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(10, 13 * zoom)}px Arial`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.strokeText(label, point.x, point.y - drawH + 14 * zoom);
  ctx.fillText(label, point.x, point.y - drawH + 14 * zoom);
  ctx.textAlign = 'start';

  ctx.restore();
}

function drawPlayer() {
  drawSpriteCharacter(
    player.x,
    player.y,
    player.dir,
    playerMoving,
    'أنا',
    myCharacterId || 'woman-1',
    true
  );
}

function drawOnlinePlayers() {
  const now = Date.now();

  for (const id in onlinePlayers) {
    if (isLoggedIn() && id === window.auth.currentUser.uid) continue;

    const data = onlinePlayers[id];

    if (!data || !data.walkMode) continue;
    if (now - (data.updatedAt || 0) > 20000) continue;

    drawSpriteCharacter(
      data.x || 0,
      data.y || 0,
      data.dir || 'down',
      !!data.moving,
      data.name || 'لاعب',
      data.character || 'woman-1',
      false
    );
  }
}

function drawSelectionBox() {
  if (!selectionBox || walkMode) return;

  ctx.strokeStyle = '#22c55e';
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
  ctx.setLineDash([]);
}

let mouseWorldPos = null;

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, width, height);

  drawFloorBackground(width, height);
  drawFixedGroundTiles();
  drawFixedAnimals();
  drawGrid(width, height);
  drawItems();
  drawNightFilter(width, height);
  drawLights();
  drawGhostTile();
  drawSelectionBox();
  drawOnlinePlayers();

  if (walkMode) drawPlayer();

  if (Date.now() - lastUiUpdate > 300) {
    updateInfoPanel();
    lastUiUpdate = Date.now();
  }

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

/* ===== UI ===== */

function bind(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
}

function initUI() {
  bind('openAuthBtn', 'click', openAuthModal);
  bind('authCloseBtn', 'click', closeAuthModal);
  bind('authBottomCloseBtn', 'click', closeAuthModal);
  bind('loginBtn', 'click', login);
  bind('signupBtn', 'click', signup);
  bind('logoutBtn', 'click', logout);
  bind('resetPasswordBtn', 'click', resetPassword);

  bind('deleteSelectedBtn', 'click', deleteSelectedItems);
  bind('aboutBtn', 'click', () => {
    showInfo(
      'من نحن',
      'لعبة GameNjd هي لعبة بناء وتجول عربية.\nابنِ عالمك داخل خلايا كبيرة، اختر شخصيتك، وتجول مع اللاعبين.'
    );
  });

  bind('settingsHelpBtn', 'click', showSettingsHelp);
  bind('shortcutsBtn', 'click', showShortcuts);
  bind('flipBtn', 'click', toggleFlip);
  bind('flipYBtn', 'click', toggleFlipY);
  bind('homeBtn', 'click', toggleHomeCamera);
  bind('autoAlignBtn', 'click', toggleAutoAlign);
  bind('deleteAllBtn', 'click', deleteMyItems);

  bind('confirmYesBtn', 'click', () => closeConfirm(true));
  bind('confirmNoBtn', 'click', () => closeConfirm(false));

  bind('stopWalkBtn', 'click', () => {
    if (walkMode) toggleWalk();
  });

  bind('infoCloseBtn', 'click', () => document.getElementById('infoModal')?.classList.add('hidden'));
  bind('changeCharacterBtn', 'click', () => showCharacterModal(true));

  bind('mobileGearBtn', 'click', () => {
    panel?.classList.toggle('closed');
    resize();
  });

  bind('togglePanel', 'click', () => {
    panel?.classList.toggle('closed');
    resize();
  });

  bind('mobileUndoBtn', 'click', undo);
  bind('mobileEraseBtn', 'click', toggleEraser);
  bind('mobileBlockBtn', 'click', toggleBlocking);
  bind('mobileFlipBtn', 'click', toggleFlip);
  bind('mobileFlipYBtn', 'click', toggleFlipY);
  bind('mobileDeleteBtn', 'click', deleteSelectedItems);

  bind('zoomInBtn', 'click', () => {
    zoom = Math.min(3, zoom * 1.15);
    clampCam();
  });

  bind('zoomOutBtn', 'click', () => {
    zoom = Math.max(0.2, zoom * 0.85);
    clampCam();
  });

  bind('eraseBtn', 'click', toggleEraser);
  bind('blockBtn', 'click', toggleBlocking);
  bind('undoBtn', 'click', undo);
  bind('jumpBtn', 'click', jump);
  bind('walkBtn', 'click', toggleWalk);

  bind('tilePreviewToggle', 'click', () => {
    tilePreviewEnabled = !tilePreviewEnabled;
    updatePreviewToggle();
    hideBigTilePreview();
  });

  document.querySelectorAll('.authTab').forEach(button => {
    button.onclick = () => setAuthTab(button.dataset.authTab);
  });

  document.querySelectorAll('.categoryBtn').forEach(button => {
    button.onclick = () => toggleCategory(button.dataset.category);
  });

  const displayNameInput = document.getElementById('displayNameInput');
  if (displayNameInput) {
    displayNameInput.value = displayName;
    displayNameInput.onchange = saveDisplayName;
  }

  const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
  const emailInput = document.getElementById('authEmailInput');
  const signupEmailInput = document.getElementById('signupEmailInput');
  const resetEmailInput = document.getElementById('resetEmailInput');

  if (lastEmail) {
    if (emailInput) emailInput.value = lastEmail;
    if (signupEmailInput) signupEmailInput.value = lastEmail;
    if (resetEmailInput) resetEmailInput.value = lastEmail;
  }

  const gridInput = document.getElementById('gridOpacity');
  if (gridInput) {
    gridInput.oninput = event => {
      gridOpacity = Number(event.target.value);
    };
  }

  const brushInput = document.getElementById('brushSize');
  if (brushInput) {
    brushInput.oninput = event => {
      brushSize = Number(event.target.value || 1);
    };
  }

  const scaleInput = document.getElementById('itemScale');
  if (scaleInput) {
    scaleInput.value = itemScale;
    scaleInput.oninput = updateItemScale;
  }

  document.querySelectorAll('.layerBtn').forEach(button => {
    button.onclick = () => setActiveLayer(Number(button.dataset.layer));
  });

  renderTiles();
  setActiveLayer(activeLayer);
  updateAuthUI();
  updateToolButtons();
  updateHomeButton();
  updatePreviewToggle();
  updateInfoPanel();
}

function setAuthTab(tab) {
  document.querySelectorAll('.authTab').forEach(button => {
    button.classList.toggle('active', button.dataset.authTab === tab);
  });

  document.getElementById('authLoginPanel')?.classList.toggle('hidden', tab !== 'login');
  document.getElementById('authSignupPanel')?.classList.toggle('hidden', tab !== 'signup');
  document.getElementById('authResetPanel')?.classList.toggle('hidden', tab !== 'reset');

  showAuthMessage('');
}

function toggleCategory(category) {
  const tileset = document.getElementById('tileset');

  if (activeCategory === category) {
    activeCategory = '';
    selectedTile = null;

    document.querySelectorAll('.categoryBtn').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tile').forEach(item => item.classList.remove('active'));
    tileset?.classList.add('hidden');

    return;
  }

  activeCategory = category;

  document.querySelectorAll('.categoryBtn').forEach(item => {
    item.classList.toggle('active', item.dataset.category === category);
  });

  const hidden = document.getElementById('categorySelect');
  if (hidden) hidden.value = activeCategory;

  tileset?.classList.remove('hidden');
  renderTiles();
}

function renderTiles() {
  const tileset = document.getElementById('tileset');
  if (!tileset) return;

  if (!activeCategory || !categories[activeCategory]) {
    tileset.innerHTML = '';
    tileset.classList.add('hidden');
    return;
  }

  const tiles = categories[activeCategory].tiles;

  tileset.innerHTML = tiles.map(tile => `
    <div class="tile" data-id="${tile.id}" title="${tile.name}">
      <img class="tileImg" src="${tile.image}" alt="${tile.name}" loading="lazy">
      <span>${tile.name}</span>
    </div>
  `).join('');

  tileset.classList.remove('hidden');

  document.querySelectorAll('.tile').forEach(tileElement => {
    tileElement.onclick = () => {
      if (!requireLogin('سجل دخولك حتى تستطيع اختيار العناصر')) return;

      if (selectedTile && selectedTile.id === tileElement.dataset.id) {
        selectedTile = null;
        tileElement.classList.remove('active');
        return;
      }

      document.querySelectorAll('.tile').forEach(item => item.classList.remove('active'));
      tileElement.classList.add('active');

      selectedTile = tileMap[tileElement.dataset.id];
      eraser = false;
      selectedIds.clear();
      updateSelectedPreview();
      updateToolButtons();
    };

    tileElement.onmouseenter = () => {
      if (!tilePreviewEnabled) return;

      const tile = tileMap[tileElement.dataset.id];
      if (tile) showBigTilePreview(tile.image);
    };

    tileElement.onmouseleave = hideBigTilePreview;
  });
}

function updatePreviewToggle() {
  const btn = document.getElementById('tilePreviewToggle');
  if (!btn) return;

  btn.classList.toggle('active', tilePreviewEnabled);
  btn.innerHTML = `<i class="fa-solid fa-eye"></i> تكبير العناصر عند المرور: ${tilePreviewEnabled ? 'تشغيل' : 'إيقاف'}`;
}

function showBigTilePreview(src) {
  const box = document.getElementById('bigTilePreview');
  const img = document.getElementById('bigTilePreviewImg');

  if (!box || !img) return;

  img.src = src;
  box.classList.remove('hidden');
}

function hideBigTilePreview() {
  document.getElementById('bigTilePreview')?.classList.add('hidden');
}

function setActiveLayer(n) {
  activeLayer = Math.max(1, Math.min(5, Number(n || 1)));

  const input = document.getElementById('layerInput');
  if (input) input.value = activeLayer;

  document.querySelectorAll('.layerBtn').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.layer) === activeLayer);
  });

  if (selectedIds.size && isLoggedIn()) {
    pushUndo();

    const changedCells = new Set();

    for (const item of getItems()) {
      if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
        item.layer = activeLayer;
        changedCells.add(item.cell);
      }
    }

    saveLocalWorld();
    changedCells.forEach(saveCellToFirebase);
  }
}

function updateAuthUI() {
  const statusText = document.getElementById('statusText');
  const authState = document.getElementById('authState');
  const openAuthBtn = document.getElementById('openAuthBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginHint = document.getElementById('loginHint');

  if (statusText) statusText.textContent = walkMode ? 'وضع التجول' : 'وضع البناء';

  if (authState) {
    if (isLoggedIn()) {
      authState.innerHTML = '<i class="fa-solid fa-circle-check"></i> أنت مسجل دخول';
      authState.classList.add('online');
      authState.classList.remove('offline');
    } else {
      authState.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> أنت لم تسجل دخول';
      authState.classList.add('offline');
      authState.classList.remove('online');
    }
  }

  if (openAuthBtn) openAuthBtn.classList.toggle('hidden', isLoggedIn());
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !isLoggedIn());
  if (loginHint) loginHint.classList.toggle('hidden', isLoggedIn());

  const nameInput = document.getElementById('displayNameInput');
  if (nameInput && nameInput.value !== displayName) nameInput.value = displayName;

  disablePlayButtonsIfGuest();
}

function updateToolButtons() {
  const eraseText = `ممحاة: ${eraser ? 'تشغيل' : 'إيقاف'}`;
  const blockText = `جعل العنصر عائق: ${blockingMode ? 'تشغيل' : 'إيقاف'}`;
  const flipText = `عكس العنصر: ${flipMode ? 'تشغيل' : 'إيقاف'}`;
  const flipYText = `عكس علوي وسفلي: ${flipYMode ? 'تشغيل' : 'إيقاف'}`;
  const autoAlignText = `الترتيب التلقائي: ${autoAlignMode ? 'تشغيل' : 'إيقاف'}`;

  const eraseBtn = document.getElementById('eraseBtn');
  const blockBtn = document.getElementById('blockBtn');
  const flipBtn = document.getElementById('flipBtn');
  const flipYBtn = document.getElementById('flipYBtn');
  const autoAlignBtn = document.getElementById('autoAlignBtn');
  const mobileEraseBtn = document.getElementById('mobileEraseBtn');
  const mobileBlockBtn = document.getElementById('mobileBlockBtn');
  const mobileFlipBtn = document.getElementById('mobileFlipBtn');
  const mobileFlipYBtn = document.getElementById('mobileFlipYBtn');

  if (eraseBtn) eraseBtn.innerHTML = `<i class="fa-solid fa-eraser"></i> ${eraseText}`;
  if (blockBtn) blockBtn.innerHTML = `<i class="fa-solid fa-ban"></i> ${blockText}`;
  if (flipBtn) flipBtn.innerHTML = `<i class="fa-solid fa-left-right"></i> ${flipText}`;
  if (flipYBtn) flipYBtn.innerHTML = `<i class="fa-solid fa-up-down"></i> ${flipYText}`;
  if (autoAlignBtn) autoAlignBtn.innerHTML = `<i class="fa-solid fa-border-all"></i> ${autoAlignText}`;

  if (mobileEraseBtn) mobileEraseBtn.classList.toggle('active', eraser);
  if (mobileBlockBtn) mobileBlockBtn.classList.toggle('active', blockingMode);
  if (mobileFlipBtn) mobileFlipBtn.classList.toggle('active', flipMode);
  if (mobileFlipYBtn) mobileFlipYBtn.classList.toggle('active', flipYMode);
  if (autoAlignBtn) autoAlignBtn.classList.toggle('active', autoAlignMode);
}

function updateInfoPanel() {
  const countBox = document.getElementById('myItemsCount');
  const cellBox = document.getElementById('currentCellText');

  if (countBox) countBox.textContent = String(getMyItems().length);

  const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
  const cell = walkMode ? cellFromWorld(player.x, player.y) : cellFromWorld(center.x, center.y);

  if (cellBox) cellBox.textContent = cell ? cell.key : '--';

  updateSelectedPreview();
}

function updateSelectedPreview() {
  const box = document.getElementById('selectedPreviewBox');
  const img = document.getElementById('selectedItemPreview');

  if (!box || !img) return;

  if (selectedIds.size !== 1) {
    box.classList.add('hidden');
    img.removeAttribute('src');
    return;
  }

  const selected = getItems().find(item => selectedIds.has(item.uid));
  const tile = selected ? tileMap[selected.tileId] : null;

  if (tile) {
    img.src = tile.image;
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
    img.removeAttribute('src');
  }
}

/* ===== Tools ===== */

function toggleEraser() {
  if (!requireLogin()) return;

  eraser = !eraser;

  if (eraser) {
    selectedTile = null;
    selectedIds.clear();
    document.querySelectorAll('.tile').forEach(item => item.classList.remove('active'));
  }

  clearPaintState();
  updateSelectedPreview();
  updateToolButtons();
}

function toggleBlocking() {
  if (!requireLogin()) return;

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
    showToast('تم تعديل حالة العائق');
    return;
  }

  blockingMode = !blockingMode;
  updateToolButtons();
}

function toggleFlip() {
  if (!requireLogin()) return;

  if (selectedIds.size) {
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
    showToast('تم عكس العنصر المحدد');
    return;
  }

  flipMode = !flipMode;
  updateToolButtons();
}


function toggleFlipY() {
  if (!requireLogin()) return;

  if (selectedIds.size) {
    pushUndo();

    const changedCells = new Set();

    for (const item of getItems()) {
      if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
        item.flipY = !item.flipY;
        changedCells.add(item.cell);
      }
    }

    saveLocalWorld();
    changedCells.forEach(saveCellToFirebase);
    showToast('تم عكس العنصر علوي وسفلي');
    return;
  }

  flipYMode = !flipYMode;
  updateToolButtons();
}

function toggleAutoAlign() {
  if (!requireLogin()) return;

  autoAlignMode = !autoAlignMode;
  updateToolButtons();
  showToast(autoAlignMode ? 'تم تشغيل الترتيب التلقائي' : 'تم إيقاف الترتيب التلقائي');
}

function toggleHomeCamera() {
  if (!requireLogin()) return;

  const saved = JSON.parse(localStorage.getItem(HOME_KEY) || 'null');
  const btn = document.getElementById('homeBtn');

  if (!saved || typeof saved.camX !== 'number' || typeof saved.camY !== 'number') {
    localStorage.setItem(HOME_KEY, JSON.stringify({ camX, camY, zoom }));
    if (btn) btn.innerHTML = '<i class="fa-solid fa-house-chimney"></i> العودة للمنزل';
    showToast('تم تحديد المنزل');
    return;
  }

  camX = saved.camX;
  camY = saved.camY;
  if (typeof saved.zoom === 'number') zoom = saved.zoom;
  clampCam();
  showToast('تمت العودة للمنزل');
}

function updateHomeButton() {
  const btn = document.getElementById('homeBtn');
  if (!btn) return;

  const saved = JSON.parse(localStorage.getItem(HOME_KEY) || 'null');
  btn.innerHTML = saved ? '<i class="fa-solid fa-house-chimney"></i> العودة للمنزل' : '<i class="fa-solid fa-house"></i> تحديد المنزل';
}

function changeItemScale(delta) {
  itemScale = Math.max(0.85, Math.min(1.35, Number((itemScale + delta).toFixed(2))));

  const scaleInput = document.getElementById('itemScale');
  if (scaleInput) scaleInput.value = itemScale;

  if (!selectedIds.size) return;

  scaleSelectedItems(delta > 0 ? 1.08 : 0.92);
}

function updateItemScale(event) {
  const newScale = Math.max(0.85, Math.min(1.35, Number(event.target.value || 1.10)));
  const factor = newScale / itemScale;
  itemScale = newScale;

  if (selectedIds.size) scaleSelectedItems(factor);
}

function scaleSelectedItems(factor) {
  if (!selectedIds.size || !requireLogin()) return;

  pushUndo();

  const changedCells = new Set();

  for (const item of getItems()) {
    if (!selectedIds.has(item.uid) || !canEditCell(item.cell)) continue;

    const centerX = item.x + item.w / 2;
    const centerY = item.y + item.h / 2;

    item.w = Math.max(12, Math.min(CELL * 2, item.w * factor));
    item.h = Math.max(12, Math.min(CELL * 2, item.h * factor));

    item.x = centerX - item.w / 2;
    item.y = centerY - item.h / 2;

    changedCells.add(item.cell);
  }

  saveLocalWorld();
  changedCells.forEach(saveCellToFirebase);
}

function hitItem(x, y) {
  return getItems()
    .sort((a, b) => (b.layer || 1) - (a.layer || 1))
    .find(item => {
      const rect = visualRect(item);
      return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
    });
}

function paintAt(x, y) {
  if (!requireLogin('سجل دخولك حتى تستطيع البناء')) return;

  const baseCell = cellFromWorld(x, y);
  if (!baseCell) return;

  const half = Math.floor((brushSize - 1) / 2);

  for (let dx = -half; dx <= half; dx++) {
    for (let dy = -half; dy <= half; dy++) {
      paintOne(x + dx * (CELL / MINI), y + dy * (CELL / MINI));
    }
  }
}


function applyAutoAlign(item, cellKey) {
  if (!autoAlignMode) return;

  const cellData = world[cellKey];
  if (!cellData || !Array.isArray(cellData.items)) return;

  const near = 22;

  for (const other of cellData.items) {
    if (!other || other.uid === item.uid || other.tileId !== item.tileId) continue;
    if (Math.abs((other.layer || 1) - (item.layer || 1)) > 1) continue;

    const sameHeight = Math.abs(other.h - item.h) <= 8;
    const sameWidth = Math.abs(other.w - item.w) <= 8;

    if (sameHeight && Math.abs(item.y - other.y) <= near) item.y = other.y;
    if (sameWidth && Math.abs(item.x - other.x) <= near) item.x = other.x;

    const rightEdge = other.x + other.w;
    const leftEdge = other.x - item.w;
    const bottomEdge = other.y + other.h;
    const topEdge = other.y - item.h;

    if (sameHeight && Math.abs(item.x - rightEdge) <= near) item.x = rightEdge;
    if (sameHeight && Math.abs(item.x - leftEdge) <= near) item.x = leftEdge;
    if (sameWidth && Math.abs(item.y - bottomEdge) <= near) item.y = bottomEdge;
    if (sameWidth && Math.abs(item.y - topEdge) <= near) item.y = topEdge;
  }
}

function paintOne(x, y) {
  const cell = cellFromWorld(x, y);
  if (!cell) return;

  if (!canEditCell(cell.key)) {
    showToast('ممنوع البناء في أرض لاعب آخر');
    return;
  }

  const localX = x - cell.x;
  const localY = y - cell.y;
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
  const scaledW = Math.max(12, Math.min(CELL * 2, Math.round(selectedTile.w * itemScale)));
  const scaledH = Math.max(12, Math.min(CELL * 2, Math.round(selectedTile.h * itemScale)));

  const item = {
    uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    tileId: selectedTile.id,
    cell: cell.key,
    x: localX - scaledW / 2,
    y: localY - scaledH / 2,
    w: scaledW,
    h: scaledH,
    flipX: flipMode,
    flipY: flipYMode,
    layer: activeLayer,
    blocking: blockingMode || !!selectedTile.blocking,
    owner: currentOwner()
  };

  applyAutoAlign(item, cell.key);
  cellData.items.push(item);

  saveLocalWorld();
  saveCellToFirebase(cell.key);
  updateInfoPanel();
}

function eraseAt(x, y) {
  const hit = hitItem(x, y);
  if (!hit) return;

  if (!canEditCell(hit.cell)) {
    showToast('ممنوع تعديل أرض لاعب آخر');
    return;
  }

  world[hit.cell].items = world[hit.cell].items.filter(item => item.uid !== hit.uid);

  if (!world[hit.cell].items.length) {
    delete world[hit.cell];
    removeCellFromFirebase(hit.cell);
  } else {
    saveCellToFirebase(hit.cell);
  }

  selectedIds.delete(hit.uid);
  saveLocalWorld();
  updateInfoPanel();
}

function selectInBox(box, add = false) {
  if (!add) selectedIds.clear();

  for (const item of getItems()) {
    const rect = itemRect(item);
    const point = worldToScreen(rect.x, rect.y);
    const iw = rect.w * zoom;
    const ih = rect.h * zoom;

    if (
      point.x < box.x + box.w &&
      point.x + iw > box.x &&
      point.y < box.y + box.h &&
      point.y + ih > box.y
    ) {
      selectedIds.add(item.uid);
    }
  }

  updateSelectedPreview();
}

function moveSelected(dx, dy) {
  if (!selectedIds.size) return;

  const changedCells = new Set();

  for (const item of getItems()) {
    if (selectedIds.has(item.uid) && canEditCell(item.cell)) {
      item.x += dx;
      item.y += dy;
      changedCells.add(item.cell);
    }
  }

  saveLocalWorld();
  changedCells.forEach(saveCellToFirebase);
}

function resizeSelected(pos) {
  if (!selectedResize) return;

  const item = selectedResize.item;
  if (!item || !canEditCell(item.cell)) return;

  const rect = itemRect(item);
  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;
  const distance = Math.hypot(pos.world.x - centerX, pos.world.y - centerY);
  const startDistance = selectedResize.startDistance || distance;
  const factor = Math.max(0.2, Math.min(4, distance / startDistance));

  const cell = parseCell(item.cell);
  if (!cell) return;

  const cellX = (cell.col - 1) * CELL;
  const cellY = (cell.row - 1) * CELL;

  item.w = Math.max(12, Math.min(CELL * 2, selectedResize.startW * factor));
  item.h = Math.max(12, Math.min(CELL * 2, selectedResize.startH * factor));
  item.x = centerX - cellX - item.w / 2;
  item.y = centerY - cellY - item.h / 2;

  saveLocalWorld();
  saveCellToFirebase(item.cell);
}

/* ===== Mouse ===== */

canvas.addEventListener('mousedown', event => {
  if (walkMode) return;

  isDown = true;
  lastPaintKey = '';

  const pos = getMouse(event);
  dragStart = pos;
  mouseWorldPos = pos.world;

  const resizeHit = hitResizeHandle(pos.x, pos.y);
  if (resizeHit) {
    if (!requireLogin()) return;
    pushUndo();

    const rect = itemRect(resizeHit.item);
    const centerX = rect.x + rect.w / 2;
    const centerY = rect.y + rect.h / 2;

    selectedResize = {
      item: resizeHit.item,
      handle: resizeHit.handle,
      startW: resizeHit.item.w,
      startH: resizeHit.item.h,
      startDistance: Math.hypot(pos.world.x - centerX, pos.world.y - centerY)
    };

    dragMode = 'resize';
    return;
  }

  const hit = hitItem(pos.world.x, pos.world.y);

  if (event.button === 1 || event.altKey) {
    dragMode = 'pan';
  } else if (hit && !eraser && !selectedTile) {
    if (!requireLogin()) return;

    dragMode = 'move';

    if (event.ctrlKey || event.metaKey) {
      if (selectedIds.has(hit.uid)) selectedIds.delete(hit.uid);
      else selectedIds.add(hit.uid);
    } else if (!selectedIds.has(hit.uid)) {
      selectedIds = new Set([hit.uid]);
    }

    updateSelectedPreview();
  } else if (!selectedTile && !eraser) {
    dragMode = 'select';
    selectionBox = { x: pos.x, y: pos.y, w: 0, h: 0, add: event.ctrlKey || event.metaKey };
  } else {
    if (!requireLogin()) return;

    dragMode = 'paint';
    pushUndo();
    paintAt(pos.world.x, pos.world.y);
  }
});

canvas.addEventListener('mousemove', event => {
  const pos = getMouse(event);
  mouseWorldPos = pos.world;

  if (!isDown || walkMode) return;

  if (dragMode === 'paint') paintAt(pos.world.x, pos.world.y);

  if (dragMode === 'resize') resizeSelected(pos);

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
      h: Math.abs(pos.y - dragStart.y),
      add: selectionBox?.add || false
    };
  }

  if (dragMode === 'move') {
    moveSelected(event.movementX / zoom, event.movementY / zoom);
  }
});

canvas.addEventListener('mouseleave', () => {
  mouseWorldPos = null;
});

window.addEventListener('mouseup', () => {
  if (dragMode === 'select' && selectionBox) selectInBox(selectionBox, selectionBox.add);
  clearPaintState();
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


function closeAllModals() {
  ['authModal', 'confirmModal', 'characterModal', 'infoModal'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  hideBigTilePreview();
  showAuthMessage('');
}

/* ===== Keyboard ===== */

window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
    event.preventDefault();
  }

  keys[event.key] = true;

  const key = event.key.toLowerCase();
  const code = event.code;

  if (event.key === 'Escape') {
    closeAllModals();
    return;
  }

  if (!walkMode && /^[1-5]$/.test(event.key)) {
    setActiveLayer(Number(event.key));
    return;
  }

  if (!walkMode && (event.key === '+' || event.key === '=' || code === 'NumpadAdd')) {
    event.preventDefault();
    changeItemScale(0.05);
    return;
  }

  if (!walkMode && (event.key === '-' || code === 'NumpadSubtract')) {
    event.preventDefault();
    changeItemScale(-0.05);
    return;
  }

  if (!walkMode && (event.key === 'Delete' || event.key === 'Backspace') && selectedIds.size) {
    event.preventDefault();
    deleteSelectedItems();
    return;
  }

  if (!walkMode && event.ctrlKey && (key === 'z' || code === 'KeyZ')) {
    event.preventDefault();
    undo();
    return;
  }

  if (walkMode) return;

  if (event.ctrlKey && (key === 'c' || code === 'KeyC')) {
    event.preventDefault();
    copyBuffer = getItems().filter(item => selectedIds.has(item.uid)).map(item => ({ ...item }));
    if (copyBuffer.length) showToast('تم النسخ');
  }

  if (event.ctrlKey && (key === 'v' || code === 'KeyV')) {
    event.preventDefault();
    pasteItems();
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && selectedIds.size) {
    event.preventDefault();
    pushUndo();

    const move = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0]
    }[event.key];

    moveSelected(move[0], move[1]);
  }
});

window.addEventListener('keyup', event => {
  keys[event.key] = false;
});

/* ===== Touch Mobile ===== */

let touchPanLast = null;
let pinchStartDistance = 0;
let pinchStartZoom = zoom;

canvas.addEventListener('touchstart', event => {
  if (walkMode) {
    touchPanLast = null;
    return;
  }

  if (event.touches.length === 1) {
    const touch = event.touches[0];
    touchPanLast = { x: touch.clientX, y: touch.clientY };
  }

  if (event.touches.length === 2) {
    pinchStartDistance = touchDistance(event.touches[0], event.touches[1]);
    pinchStartZoom = zoom;
  }
}, { passive: false });

canvas.addEventListener('touchmove', event => {
  if (walkMode) return;

  if (event.touches.length === 2 && pinchStartDistance > 0) {
    const distance = touchDistance(event.touches[0], event.touches[1]);
    zoom = Math.max(0.2, Math.min(3, pinchStartZoom * (distance / pinchStartDistance)));
    clampCam();
    event.preventDefault();
    return;
  }

  if (event.touches.length === 1 && touchPanLast && !selectedTile && !eraser) {
    const touch = event.touches[0];

    camX -= (touch.clientX - touchPanLast.x) / zoom;
    camY -= (touch.clientY - touchPanLast.y) / zoom;

    touchPanLast = { x: touch.clientX, y: touch.clientY };

    clampCam();
    event.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('touchend', () => {
  touchPanLast = null;
  pinchStartDistance = 0;
}, { passive: false });

function touchDistance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/* ===== Copy / Delete / Undo ===== */

function pasteItems() {
  if (!requireLogin()) return;
  if (!copyBuffer.length) return;

  pushUndo();

  selectedIds.clear();

  const changedCells = new Set();

  for (const old of copyBuffer) {
    if (!canEditCell(old.cell)) continue;

    const item = {
      ...old,
      uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      x: old.x + 18,
      y: old.y + 18,
      owner: currentOwner()
    };

    ensureCell(item.cell).items.push(item);
    selectedIds.add(item.uid);
    changedCells.add(item.cell);
  }

  saveLocalWorld();
  changedCells.forEach(saveCellToFirebase);
  updateInfoPanel();
  showToast('تم اللصق');
}

function deleteSelectedItems() {
  if (!requireLogin()) return;

  if (!selectedIds.size) {
    showToast('لا يوجد عنصر محدد');
    return;
  }

  pushUndo();

  const changedCells = new Set();

  for (const cellKey in world) {
    if (!canEditCell(cellKey)) continue;

    const before = world[cellKey].items.length;
    world[cellKey].items = world[cellKey].items.filter(item => !selectedIds.has(item.uid));

    if (world[cellKey].items.length !== before) changedCells.add(cellKey);

    if (!world[cellKey].items.length) delete world[cellKey];
  }

  selectedIds.clear();
  saveLocalWorld();

  changedCells.forEach(cellKey => {
    if (world[cellKey]) saveCellToFirebase(cellKey);
    else removeCellFromFirebase(cellKey);
  });

  clearPaintState();
  updateInfoPanel();
  showToast('تم حذف العنصر المحدد');
}

function deleteMyItems() {
  if (!requireLogin()) return;

  openConfirm('حذف جميع عناصرك', 'هل تريد حذف جميع عناصرك؟', () => {
    pushUndo();

    const changedCells = new Set();
    const owner = currentOwner();

    for (const cellKey in world) {
      const cell = world[cellKey];
      if (!cell || cell.owner !== owner) continue;

      delete world[cellKey];
      changedCells.add(cellKey);
    }

    selectedIds.clear();
    saveLocalWorld();

    changedCells.forEach(removeCellFromFirebase);

    clearPaintState();
    updateInfoPanel();
    showToast('تم حذف جميع عناصرك');
  });
}

function undo() {
  if (!requireLogin()) return;

  if (!undoStack.length) {
    showToast('لا يوجد شيء للاستعادة');
    return;
  }

  try {
    const oldWorld = world;
    const restoredWorld = normalizeWorldData(JSON.parse(undoStack.pop()) || {});
    const changedCells = new Set();
    const owner = currentOwner();

    for (const cellKey in oldWorld) {
      if (oldWorld[cellKey]?.owner === owner) changedCells.add(cellKey);
    }

    for (const cellKey in restoredWorld) {
      if (restoredWorld[cellKey]?.owner === owner) changedCells.add(cellKey);
    }

    world = restoredWorld;
    saveLocalWorld();

    changedCells.forEach(cellKey => {
      if (world[cellKey]) saveCellToFirebase(cellKey);
      else removeCellFromFirebase(cellKey);
    });

    selectedIds.clear();
    clearPaintState();
    updateInfoPanel();

    showToast('تمت الاستعادة');
  } catch {
    showToast('فشل الاستعادة');
  }
}

/* ===== Jump / Help ===== */

function jump() {
  const input = document.getElementById('jumpInput');
  const cell = parseCell(input?.value);

  if (!cell) {
    showToast('اكتب خلية صحيحة مثل K90 — علمًا أن حدود الخريطة 100×100');
    return;
  }

  camX = (cell.col - 1) * CELL - canvas.clientWidth / zoom / 2 + CELL / 2;
  camY = (cell.row - 1) * CELL - canvas.clientHeight / zoom / 2 + CELL / 2;

  clampCam();
}

function showShortcuts() {
  showInfo(
    'شرح الاختصارات',
    `Ctrl + Z : استعادة
Delete : حذف العنصر المحدد
Ctrl + C : نسخ العنصر المحدد
Ctrl + V : لصق
Ctrl + ضغط : تحديد متعدد
1 إلى 5 : تغيير الطبقة
+ و - : تكبير وتصغير العنصر
Alt + سحب : تحريك الخريطة
Ctrl + عجلة الماوس : تكبير وتصغير الشاشة
الأسهم : تحريك العنصر المحدد`
  );
}

function showSettingsHelp() {
  showInfo(
    'شرح الإعدادات',
    `<div class="helpList">
      <div class="helpItem"><button class="sampleBtn walkColorBtn"><i class="fa-solid fa-person-walking"></i> تجول</button><p>يدخل وضع التجول بالشخصية داخل العالم.</p></div>
      <div class="helpItem"><button class="sampleBtn characterColorBtn"><i class="fa-solid fa-user-pen"></i> تغيير الشخصية</button><p>يفتح نافذة اختيار الشخصية.</p></div>
      <div class="helpItem"><button class="sampleBtn homeColorBtn"><i class="fa-solid fa-house"></i> تحديد المنزل</button><p>يحفظ مكان الكاميرا، وبعدها يتحول إلى العودة للمنزل.</p></div>
      <div class="helpItem"><button class="sampleBtn previewColorBtn"><i class="fa-solid fa-eye"></i> تكبير العناصر</button><p>يعرض معاينة كبيرة عند المرور على عنصر.</p></div>
      <div class="helpItem"><button class="sampleBtn autoAlignColorBtn"><i class="fa-solid fa-border-all"></i> الترتيب التلقائي</button><p>يساعد في محاذاة العناصر المتشابهة بجانب بعض بشكل خفيف.</p></div>
      <div class="helpItem"><button class="sampleBtn eraseColorBtn"><i class="fa-solid fa-eraser"></i> ممحاة</button><p>تحذف العنصر الذي تضغط عليه.</p></div>
      <div class="helpItem"><button class="sampleBtn undoColorBtn"><i class="fa-solid fa-rotate-left"></i> استعادة</button><p>يرجع آخر تعديل.</p></div>
      <div class="helpItem"><button class="sampleBtn blockColorBtn"><i class="fa-solid fa-ban"></i> عائق</button><p>يجعل العنصر يمنع مرور الشخصية.</p></div>
      <div class="helpItem"><button class="sampleBtn flipColorBtn"><i class="fa-solid fa-left-right"></i> يمين/يسار</button><p>يعكس العنصر أفقيًا.</p></div>
      <div class="helpItem"><button class="sampleBtn flipYColorBtn"><i class="fa-solid fa-up-down"></i> فوق/تحت</button><p>يعكس العنصر عموديًا.</p></div>
      <div class="helpItem"><button class="sampleBtn deleteOneColorBtn"><i class="fa-solid fa-trash"></i> حذف المحدد</button><p>يحذف العنصر المحدد فقط.</p></div>
      <div class="helpItem"><button class="sampleBtn dangerBtn"><i class="fa-solid fa-trash-can"></i> حذف جميع عناصري</button><p>يحذف فقط العناصر التي تملكها.</p></div>
    </div>`,
    true
  );
}

/* ===== Profile / Auth ===== */

function saveDisplayName() {
  const input = document.getElementById('displayNameInput');

  displayName = String(input?.value || '').trim().slice(0, 20);

  localStorage.setItem(DISPLAY_NAME_KEY, displayName);

  saveProfileData();
  savePlayerToFirebase();
  updateAuthUI();

  showToast('تم حفظ الاسم');
}

function saveProfileData() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;

  const user = window.auth.currentUser;

  window.set(window.ref(window.db, 'profiles/' + user.uid), {
    uid: user.uid,
    email: user.email || '',
    displayName: displayName || '',
    character: myCharacterId || 'woman-1',
    lastX: Math.round(player.x),
    lastY: Math.round(player.y),
    lastDir: player.dir,
    updatedAt: Date.now()
  }).catch(error => {
    console.error('profile save error:', error);
  });
}

function loadProfileData() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.get) return;

  const user = window.auth.currentUser;

  window.get(window.ref(window.db, 'profiles/' + user.uid)).then(snapshot => {
    const data = snapshot.val();

    if (!data) {
      saveProfileData();
      return;
    }

    if (data.displayName) {
      displayName = String(data.displayName).slice(0, 20);
      localStorage.setItem(DISPLAY_NAME_KEY, displayName);
    }

    if (data.character) {
      myCharacterId = normalizeCharacterId(data.character);
      localStorage.setItem(CHARACTER_KEY, myCharacterId);
    }

    if (typeof data.lastX === 'number' && typeof data.lastY === 'number') {
      player.x = data.lastX;
      player.y = data.lastY;
      player.dir = data.lastDir || player.dir;
      saveLastPlayer();

      camX = player.x - canvas.clientWidth / zoom / 2;
      camY = player.y - canvas.clientHeight / zoom / 2;
      clampCam();
    }

    updateAuthUI();
    updateInfoPanel();
  }).catch(error => {
    console.error('profile load error:', error);
  });
}


function showSettingsHelpOnce() {
  if (localStorage.getItem(SETTINGS_HELP_SEEN_KEY) === '1') return;

  localStorage.setItem(SETTINGS_HELP_SEEN_KEY, '1');
  setTimeout(showSettingsHelp, 700);
}

function signup() {
  const email = document.getElementById('signupEmailInput')?.value.trim();
  const pass = document.getElementById('signupPassInput')?.value;
  const nameInput = document.getElementById('displayNameInput');

  if (!email) return showAuthMessage('اكتب الإيميل');
  if (!pass || pass.length < 6) return showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف أو أكثر');

  displayName = String(nameInput?.value || '').trim().slice(0, 20);
  localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  localStorage.setItem(LAST_EMAIL_KEY, email);

  window.createUserWithEmailAndPassword(window.auth, email, pass).then(() => {
    showAuthMessage('تم إنشاء الحساب');
    closeAuthModal();
    saveProfileData();
    updateAuthUI();
    showCharacterModal(true);
    showSettingsHelpOnce();
  }).catch(error => {
    showAuthMessage(authErrorMessage(error));
  });
}

function login() {
  const email = document.getElementById('authEmailInput')?.value.trim();
  const pass = document.getElementById('authPassInput')?.value;

  if (!email) return showAuthMessage('اكتب الإيميل');
  if (!pass) return showAuthMessage('اكتب كلمة المرور');

  localStorage.setItem(LAST_EMAIL_KEY, email);

  window.signInWithEmailAndPassword(window.auth, email, pass).then(() => {
    showAuthMessage('تم تسجيل الدخول');
    closeAuthModal();
    updateAuthUI();
  }).catch(error => {
    showAuthMessage(authErrorMessage(error));
  });
}

function logout() {
  if (walkMode) toggleWalk();

  if (!window.auth || !window.signOut) return;

  saveProfileData();

  window.signOut(window.auth).then(() => {
    currentUser = null;
    currentUserEmail = '';
    updateAuthUI();
    showToast('تم تسجيل الخروج');
  }).catch(() => {
    showToast('فشل تسجيل الخروج');
  });
}

function resetPassword() {
  const email = document.getElementById('resetEmailInput')?.value.trim();

  if (!email) return showAuthMessage('اكتب الإيميل أولًا');

  window.sendPasswordResetEmail(window.auth, email).then(() => {
    showAuthMessage('تم إرسال رابط استعادة كلمة المرور إلى الإيميل، ربما تجدها في علبة الرسائل غير المرغوب فيها');
  }).catch(error => {
    showAuthMessage(authErrorMessage(error));
  });
}

function authErrorMessage(error) {
  const code = error?.code || '';

  if (code.includes('email-already-in-use')) return 'هذا الإيميل مستخدم مسبقًا، جرّب تسجيل الدخول بدل إنشاء حساب جديد';
  if (code.includes('invalid-email')) return 'الإيميل غير صحيح';
  if (code.includes('weak-password')) return 'كلمة المرور ضعيفة';
  if (code.includes('user-not-found')) return 'هذا الحساب غير مسجل، يمكنك إنشاء حساب جديد';
  if (code.includes('wrong-password')) return 'كلمة المرور غير صحيحة';
  if (code.includes('invalid-credential')) return 'هذا الحساب غير مسجل أو أن كلمة المرور غير صحيحة، تأكد من البيانات أو أنشئ حسابًا جديدًا';
  if (code.includes('too-many-requests')) return 'محاولات كثيرة، حاول لاحقًا';

  return 'حدث خطأ، حاول مرة أخرى';
}

/* ===== Walk Mode ===== */

function centerStartOnce() {
  if (didInitialCenter) return;

  didInitialCenter = true;

  camX = player.x - canvas.clientWidth / zoom / 2;
  camY = player.y - canvas.clientHeight / zoom / 2;

  clampCam();
}

function getPlayerRect(x = player.x, y = player.y) {
  return {
    x: x - 14,
    y: y - 24,
    w: 28,
    h: 30
  };
}

function isBlockedAt(x, y) {
  const playerRect = getPlayerRect(x, y);

  for (const item of getItems()) {
    if (!item.blocking) continue;

    const blockRect = collisionRect(item);

    if (rectsHit(playerRect, blockRect)) return true;
  }

  return false;
}

function movePlayer() {
  if (!walkMode) return;

  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp || keys.w || keys.W) dy -= 1;
  if (keys.ArrowDown || keys.s || keys.S) dy += 1;
  if (keys.ArrowLeft || keys.a || keys.A) dx -= 1;
  if (keys.ArrowRight || keys.d || keys.D) dx += 1;

  if (joystickVector.x || joystickVector.y) {
    dx += joystickVector.x;
    dy += joystickVector.y;
  }

  const length = Math.hypot(dx, dy);

  playerMoving = length > 0.05;

  if (playerMoving) {
    dx /= length;
    dy /= length;

    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
    else player.dir = dy > 0 ? 'down' : 'up';

    const nextX = Math.max(18, Math.min(WORLD_COLS * CELL - 18, player.x + dx * player.speed));
    const nextY = Math.max(28, Math.min(WORLD_ROWS * CELL - 8, player.y + dy * player.speed));

    if (!isBlockedAt(nextX, player.y)) player.x = nextX;
    if (!isBlockedAt(player.x, nextY)) player.y = nextY;

    saveLastPlayer();
  }

  camX = player.x - canvas.clientWidth / zoom / 2;
  camY = player.y - canvas.clientHeight / zoom / 2;
  clampCam();
}

function toggleWalk() {
  if (!walkMode && !requireLogin('سجل دخولك حتى تستطيع التجول')) return;

  walkMode = !walkMode;

  if (walkMode) {
    previousBuildZoom = zoom;
    zoom = 1.85;
    selectedIds.clear();
    clearPaintState();

    const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
    player.x = Math.max(18, Math.min(WORLD_COLS * CELL - 18, center.x));
    player.y = Math.max(28, Math.min(WORLD_ROWS * CELL - 8, center.y));

    document.body.classList.add('walking');
    panel?.classList.add('closed');

    showCharacterModal(false);
  } else {
    zoom = previousBuildZoom || 0.55;
    document.body.classList.remove('walking');
    resetJoystick();
    saveLastPlayer();
    saveProfileData();
  }

  resize();
  clampCam();
  savePlayerToFirebase();
  updateAuthUI();
}

function savePlayerToFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;

  const user = window.auth.currentUser;

  window.set(window.ref(window.db, 'players/' + user.uid), {
    id: user.uid,
    name: displayName || user.email || 'لاعب',
    x: Math.round(player.x),
    y: Math.round(player.y),
    dir: player.dir,
    moving: !!playerMoving,
    walkMode: !!walkMode,
    character: myCharacterId || 'woman-1',
    updatedAt: Date.now()
  }).catch(error => {
    console.error('player save error:', error);
  });
}

function removePlayerFromFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.remove) return;

  const user = window.auth.currentUser;

  window.remove(window.ref(window.db, 'players/' + user.uid)).catch(error => {
    console.error('player remove error:', error);
  });
}

let lastPlayerSave = 0;

function gameLoop() {
  movePlayer();

  if (isLoggedIn() && Date.now() - lastPlayerSave > 700) {
    if (walkMode) savePlayerToFirebase();
    saveLastPlayer();
    lastPlayerSave = Date.now();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

/* ===== Joystick ===== */

const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
const joystickVector = { x: 0, y: 0 };
let joystickActive = false;

function resetJoystick() {
  joystickVector.x = 0;
  joystickVector.y = 0;
  joystickActive = false;

  if (stick) {
    stick.style.left = '35px';
    stick.style.top = '35px';
  }
}

function updateJoystick(clientX, clientY) {
  if (!joystick || !stick) return;

  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = clientX - centerX;
  let dy = clientY - centerY;
  const max = rect.width / 2 - 25;
  const len = Math.hypot(dx, dy);

  if (len > max) {
    dx = dx / len * max;
    dy = dy / len * max;
  }

  joystickVector.x = dx / max;
  joystickVector.y = dy / max;

  stick.style.left = `${rect.width / 2 - 25 + dx}px`;
  stick.style.top = `${rect.height / 2 - 25 + dy}px`;
}

if (joystick) {
  joystick.addEventListener('touchstart', event => {
    if (!walkMode) return;
    joystickActive = true;
    updateJoystick(event.touches[0].clientX, event.touches[0].clientY);
    event.preventDefault();
  }, { passive: false });

  joystick.addEventListener('touchmove', event => {
    if (!walkMode || !joystickActive) return;
    updateJoystick(event.touches[0].clientX, event.touches[0].clientY);
    event.preventDefault();
  }, { passive: false });

  joystick.addEventListener('touchend', event => {
    resetJoystick();
    event.preventDefault();
  }, { passive: false });
}

/* ===== Firebase Ready ===== */

function waitFirebaseReady() {
  if (!window.auth || !window.onAuthStateChanged) {
    setTimeout(waitFirebaseReady, 300);
    return;
  }

  window.onAuthStateChanged(window.auth, user => {
    currentUser = user && !user.isAnonymous ? user : null;
    currentUserEmail = currentUser?.email || '';

    if (currentUserEmail) localStorage.setItem(LAST_EMAIL_KEY, currentUserEmail);

    if (currentUser) {
      loadProfileData();
    } else {
      if (walkMode) toggleWalk();
    }

    updateAuthUI();
    updateInfoPanel();
  });

  listenWorldFromFirebase();
  listenPlayersFromFirebase();
}

window.addEventListener('beforeunload', () => {
  saveLastPlayer();
  saveProfileData();
  if (walkMode) removePlayerFromFirebase();
});

window.addEventListener('load', () => {
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 350);
});

initUI();
waitFirebaseReady();
centerStartOnce();
updateToolButtons();


document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;

  document.querySelectorAll('.modal,.characterModal,.infoModal,.confirmModal').forEach(el => {
    el.classList.add('hidden');
  });

  selectedTile = null;
  selectedIds.clear();

  const tileset = document.getElementById('tileset');
  if (tileset) {
    tileset.querySelectorAll('.tile').forEach(tile => {
      tile.classList.remove('active');
    });
  }

  showToast('تم إلغاء التحديد');
});



function autoAlignPosition(x, y, currentCellKey) {
  if (!autoAlignMode) return { x, y };

  const SNAP_DISTANCE = 18;

  const nearby = getItems().filter(item => item.cell === currentCellKey);

  for (const item of nearby) {
    const rect = itemRect(item);

    if (Math.abs(x - rect.x) <= SNAP_DISTANCE) x = rect.x;
    if (Math.abs(y - rect.y) <= SNAP_DISTANCE) y = rect.y;
    if (Math.abs(x - (rect.x + rect.w)) <= SNAP_DISTANCE) x = rect.x + rect.w;
    if (Math.abs(y - (rect.y + rect.h)) <= SNAP_DISTANCE) y = rect.y + rect.h;
  }

  return { x, y };
}
