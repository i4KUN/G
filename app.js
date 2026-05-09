'use strict';
// GameNjd v12.7

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const panel = document.getElementById('panel');
const toast = document.getElementById('toast');

const WORLD_COLS = 100;
const WORLD_ROWS = 100;
const CELL = 500;
const MINI = 10;

const VERSION = '12.7';
const KEY_PREFIX = 'GameNjd_v' + VERSION.replace(/\D/g, '');

function storageKey(name) {
  return `${KEY_PREFIX}_${name}`;
}

function migrateStorageKey(oldKey, newKey) {
  try {
    if (localStorage.getItem(newKey) === null && localStorage.getItem(oldKey) !== null) {
      localStorage.setItem(newKey, localStorage.getItem(oldKey));
    }
  } catch {}
}

const SAVE_KEY = storageKey('world');
const CHARACTER_KEY = storageKey('character');
const DISPLAY_NAME_KEY = storageKey('display_name');
const LAST_EMAIL_KEY = storageKey('last_email');
const LAST_PLAYER_KEY = storageKey('last_player');
const HOME_KEY = storageKey('home_camera');
const SETTINGS_HELP_SEEN_KEY = storageKey('settings_help_seen');
const VISITED_CELLS_KEY = storageKey('visited_cells');

[
  ['GameNjd_v125_world', SAVE_KEY],
  ['GameNjd_v125_character', CHARACTER_KEY],
  ['GameNjd_v125_display_name', DISPLAY_NAME_KEY],
  ['GameNjd_v125_last_email', LAST_EMAIL_KEY],
  ['GameNjd_v125_last_player', LAST_PLAYER_KEY],
  ['GameNjd_v125_home_camera', HOME_KEY],
  ['GameNjd_v125_settings_help_seen', SETTINGS_HELP_SEEN_KEY]
].forEach(pair => migrateStorageKey(pair[0], pair[1]));

const MAX_ITEMS_PER_CELL = 300;
// تم إلغاء منع السفر البعيد حتى لا يمنع الانتقال بين المناطق
const MAX_PLAYER_JUMP = Infinity;
const CHUNK_RADIUS = 3; // نطاق الخلايا القريبة عند الحاجة
const USE_NEARBY_WORLD_LOADING = false; // إيقاف التحميل الجزئي مؤقتًا لضمان مزامنة الأونلاين مباشرة
const TILE_IMAGE_EXT = 'png'; // استخدام PNG حتى لا تختفي العناصر القديمة

// عدد خلايا البناء المسموحة حول البيت
const HOME_BUILD_RADIUS_CELLS = 5;

// حدود الزوم: التبعيد محدود، والتقريب واسع
const BASE_ZOOM = 0.55;
const ZOOM_STEP = 1.12;
const ZOOM_OUT_STEPS = 7;
const WALK_ZOOM_STEPS = 5; // وضع التجول: 5 تقريب و5 تبعيد فقط
const ZOOM_IN_STEPS = 10;
const WALK_BASE_ZOOM = 1.85;
const MIN_ZOOM = BASE_ZOOM / Math.pow(ZOOM_STEP, ZOOM_OUT_STEPS);
const MAX_ZOOM = BASE_ZOOM * Math.pow(ZOOM_STEP, ZOOM_IN_STEPS);

// أوقات النقصان والزيادة
const HUNGER_DECAY_MS = 5 * 60 * 1000; // الجوع ينقص 1% كل 5 دقائق
const HEALTH_DECAY_MS = 20 * 60 * 1000; // الصحة تنقص 1% كل 20 دقيقة
const LEVEL_POINT_MS = 60 * 1000; // نقطة لفل كل دقيقة
const POINTS_PER_RIYAL = 5; // كل 5 نقاط = 1 ريال

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
let mobileCameraLocked = false;
let longPressTimer = null;
let longPressGhost = false;
let touchStartPoint = null;
let touchMoved = false;
let pinchCenterWorld = null;
let pinchCenterScreen = null;

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
let worldListeners = {};
let lastSubscribedCenterCell = '';
let lastSafePlayerPosition = null;
let houseProfiles = {};
let houseRatings = {};
let lastNearbyNpc = null;
let activeTalkingNpc = null;
let lastGameStateSave = 0;
let buildBoundaryFlashUntil = 0;
let buildBoundaryFlashStart = 0;

const keys = {};
const imageCache = {};
const characterImageCache = {};
const alphaBoxCache = {};
const floorImage = new Image();
floorImage.src = DEFAULT_FLOOR_SRC;

let confirmCallback = null;

const snowflakes = [];
for (let i = 0; i < 140; i++) {
  snowflakes.push({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 3 + 1,
    speed: Math.random() * 1.5 + 0.5
  });
}




/* ===== Game Stats / NPC / Houses ===== */

// بيانات اللاعب الخاصة: الصحة، الجوع، الفلوس، النقاط، المهمات
const GAME_STATE_KEY = storageKey('game_state');
const COLLECTED_MONEY_KEY = storageKey('collected_money');
const HOUSE_NAME_KEY = storageKey('house_name');

function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function cleanPlayerName(name, max = 20) {
  return String(name || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanHouseName(name, max = 30) {
  return String(name || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function cleanUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(cleanUsername(username));
}

function usernameToEmail(username) {
  return `${cleanUsername(username)}@gamenjd.local`;
}

function emailToUsername(email) {
  const text = String(email || '');
  return text.endsWith('@gamenjd.local') ? text.replace('@gamenjd.local', '') : text;
}

function clampZoomValue(value) {
  const base = walkMode ? WALK_BASE_ZOOM : BASE_ZOOM;
  const outSteps = walkMode ? WALK_ZOOM_STEPS : ZOOM_OUT_STEPS;
  const inSteps = walkMode ? WALK_ZOOM_STEPS : ZOOM_IN_STEPS;
  const min = base / Math.pow(ZOOM_STEP, outSteps);
  const max = base * Math.pow(ZOOM_STEP, inSteps);
  return Math.max(min, Math.min(max, value));
}

function changeZoomByStep(direction, anchorEvent = null) {
  const before = anchorEvent ? getMouse(anchorEvent) : null;
  zoom = clampZoomValue(zoom * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
  if (before) {
    camX = before.world.x - before.x / zoom;
    camY = before.world.y - before.y / zoom;
  }
  clampCam();
}

function loadGameState() {
  const now = Date.now();
  try {
    const saved = JSON.parse(localStorage.getItem(GAME_STATE_KEY) || '{}');
    return {
      health: clampNumber(saved.health, 0, 100, 100),
      hunger: clampNumber(saved.hunger, 0, 100, 100),
      levelPoints: Math.max(0, Math.floor(Number(saved.levelPoints) || 0)),
      money: Math.max(0, Math.floor(Number(saved.money) || 0)),
      lastHungerAt: Number(saved.lastHungerAt) || now,
      lastHealthAt: Number(saved.lastHealthAt) || now,
      lastLevelAt: Number(saved.lastLevelAt) || now,
      quests: saved.quests && typeof saved.quests === 'object' ? saved.quests : {}
    };
  } catch {
    return { health: 100, hunger: 100, levelPoints: 0, money: 0, lastHungerAt: now, lastHealthAt: now, lastLevelAt: now, quests: {} };
  }
}

let gameState = loadGameState();

function saveGameState(localOnly = false) {
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
  if (localOnly || !isLoggedIn() || !window.db || !window.ref || !window.set) return;
  const user = window.auth.currentUser;
  window.set(window.ref(window.db, 'inventory/' + user.uid + '/gameState'), gameState).catch(console.error);
}

function loadGameStateFromFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.get) return;
  const user = window.auth.currentUser;
  window.get(window.ref(window.db, 'inventory/' + user.uid + '/gameState')).then(snapshot => {
    const data = snapshot.val();
    if (!data) return saveGameState();
    gameState = Object.assign(loadGameState(), data);
    const now = Date.now();
    gameState.lastHungerAt = now;
    gameState.lastHealthAt = now;
    if (!gameState.lastLevelAt) gameState.lastLevelAt = now;
    saveGameState(true);
    updateStatsPanel();
  }).catch(console.error);
}

function handleEmptyBars() {
  let changed = false;
  if (gameState.health <= 0) {
    gameState.levelPoints = Math.max(0, Math.floor(gameState.levelPoints * 0.5));
    gameState.money = Math.max(0, gameState.money - 5);
    gameState.health = 50;
    showToast('انتهت الصحة: تم خصم عقوبة وتمت تعبئتها للنصف');
    changed = true;
  }
  if (gameState.hunger <= 0) {
    gameState.levelPoints = Math.max(0, Math.floor(gameState.levelPoints * 0.5));
    gameState.money = Math.max(0, gameState.money - 5);
    gameState.hunger = 50;
    showToast('انتهى الجوع: تم خصم عقوبة وتمت تعبئته للنصف');
    changed = true;
  }
  if (changed) saveGameState();
}

function updateGameTimers() {
  if (!isLoggedIn()) return;
  const now = Date.now();

  // نقص الجوع كل 5 دقائق
  while (now - gameState.lastHungerAt >= HUNGER_DECAY_MS) {
    gameState.hunger = Math.max(0, gameState.hunger - 1);
    gameState.lastHungerAt += HUNGER_DECAY_MS;
  }

  // نقص الصحة كل 20 دقيقة
  while (now - gameState.lastHealthAt >= HEALTH_DECAY_MS) {
    gameState.health = Math.max(0, gameState.health - 1);
    gameState.lastHealthAt += HEALTH_DECAY_MS;
  }

  // زيادة نقاط المستوى كل دقيقة، وكل 5 نقاط تعطي ريال
  while (now - gameState.lastLevelAt >= LEVEL_POINT_MS) {
    gameState.levelPoints += 1;
    if (gameState.levelPoints % POINTS_PER_RIYAL === 0) gameState.money += 1;
    gameState.lastLevelAt += LEVEL_POINT_MS;
  }

  handleEmptyBars();
  updateStatsPanel();
  if (now - lastGameStateSave > 5000) {
    saveGameState();
    lastGameStateSave = now;
  }
}

function updateStatsPanel() {
  document.querySelectorAll('[data-stat="healthFill"]').forEach(el => el.style.width = `${gameState.health}%`);
  document.querySelectorAll('[data-stat="hungerFill"]').forEach(el => el.style.width = `${gameState.hunger}%`);
  document.querySelectorAll('[data-stat="healthText"]').forEach(el => el.textContent = `${gameState.health}%`);
  document.querySelectorAll('[data-stat="hungerText"]').forEach(el => el.textContent = `${gameState.hunger}%`);
  document.querySelectorAll('[data-stat="levelPoints"]').forEach(el => el.textContent = String(gameState.levelPoints));
  document.querySelectorAll('[data-stat="money"]').forEach(el => el.textContent = `${gameState.money} ريال`);
}

function spendMoney(price) {
  if (gameState.money < price) {
    showToast('ما عندك فلوس كافية');
    return false;
  }
  gameState.money -= price;
  saveGameState();
  updateStatsPanel();
  return true;
}

function addMoney(amount) {
  gameState.money += Math.max(0, Math.floor(amount));
  saveGameState();
  updateStatsPanel();
}

function addHealth(amount) {
  if (gameState.health >= 100) {
    showToast('الصحة ممتلئة أساسًا');
    return false;
  }
  gameState.health = Math.min(100, gameState.health + amount);
  saveGameState();
  updateStatsPanel();
  return true;
}

function addHunger(amount) {
  if (gameState.hunger >= 100) {
    showToast('الجوع ممتلئ أساسًا');
    return false;
  }
  gameState.hunger = Math.min(100, gameState.hunger + amount);
  saveGameState();
  updateStatsPanel();
  return true;
}

function getHomeData() {
  try { return JSON.parse(localStorage.getItem(HOME_KEY) || 'null'); } catch { return null; }
}

function getHomeCellKey() {
  const saved = getHomeData();
  if (!saved) return '';
  if (saved.cell) return saved.cell;
  const centerX = Number(saved.camX || 0) + canvas.clientWidth / Math.max(zoom, 0.1) / 2;
  const centerY = Number(saved.camY || 0) + canvas.clientHeight / Math.max(zoom, 0.1) / 2;
  return cellFromWorld(centerX, centerY)?.key || '';
}

function isCellNearHome(cellKey) {
  const homeCell = parseCell(getHomeCellKey());
  const targetCell = parseCell(cellKey);
  if (!homeCell || !targetCell) return false;
  return Math.abs(homeCell.col - targetCell.col) <= HOME_BUILD_RADIUS_CELLS && Math.abs(homeCell.row - targetCell.row) <= HOME_BUILD_RADIUS_CELLS;
}

function canUseBuildSettingsAtCell(cellKey, message = true) {
  if (!getHomeCellKey()) {
    if (message) showToast('حدد منزلك أولًا حتى تستطيع البناء حوله');
    return false;
  }
  if (!isCellNearHome(cellKey)) {
    if (message) {
      showToast('البناء مسموح حول بيتك فقط بمقدار 5 خلايا');
      flashBuildBoundary();
    }
    return false;
  }
  return true;
}

function flashBuildBoundary() {
  buildBoundaryFlashStart = Date.now();
  buildBoundaryFlashUntil = buildBoundaryFlashStart + 3000;
}

function drawBuildBoundaryFlash() {
  if (!buildBoundaryFlashUntil || Date.now() > buildBoundaryFlashUntil) return;
  const homeCell = parseCell(getHomeCellKey());
  if (!homeCell) return;
  const total = 3000;
  const left = Math.max(1, homeCell.col - HOME_BUILD_RADIUS_CELLS);
  const top = Math.max(1, homeCell.row - HOME_BUILD_RADIUS_CELLS);
  const right = Math.min(WORLD_COLS, homeCell.col + HOME_BUILD_RADIUS_CELLS);
  const bottom = Math.min(WORLD_ROWS, homeCell.row + HOME_BUILD_RADIUS_CELLS);
  const x = (left - 1) * CELL;
  const y = (top - 1) * CELL;
  const w = (right - left + 1) * CELL;
  const h = (bottom - top + 1) * CELL;
  const p = worldToScreen(x, y);
  const age = Date.now() - buildBoundaryFlashStart;
  const alpha = Math.max(0, 1 - age / total);
  ctx.save();
  ctx.strokeStyle = `rgba(239,68,68,${0.85 * alpha})`;
  ctx.fillStyle = `rgba(239,68,68,${0.10 * alpha})`;
  ctx.lineWidth = Math.max(2, 4 * zoom);
  ctx.fillRect(p.x, p.y, w * zoom, h * zoom);
  ctx.strokeRect(p.x, p.y, w * zoom, h * zoom);
  ctx.restore();
}

function saveHouseProfile() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;
  if (!getHomeCellKey()) return showToast('حدد منزلك أولًا قبل كتابة اسم البيت');
  const name = cleanHouseName(document.getElementById('houseNameInput')?.value || localStorage.getItem(HOUSE_NAME_KEY) || '', 30);
  if (!name) return showToast('اكتب اسم بيتك أولًا');
  localStorage.setItem(HOUSE_NAME_KEY, name);
  const user = window.auth.currentUser;
  window.set(window.ref(window.db, 'houseProfiles/' + user.uid), {
    owner: user.uid,
    name,
    homeCell: getHomeCellKey(),
    updatedAt: Date.now()
  }).then(() => {
    showToast('تم حفظ اسم البيت');
    updateHousePanel();
  }).catch(() => showToast('فشل حفظ اسم البيت'));
}

function listenHouseData() {
  if (!window.db || !window.ref || !window.onValue) return;
  window.onValue(window.ref(window.db, 'houseProfiles'), snapshot => {
    houseProfiles = snapshot.val() || {};
    updateHousePanel();
  });
  window.onValue(window.ref(window.db, 'houseRatings'), snapshot => {
    houseRatings = snapshot.val() || {};
    updateHousePanel();
  });
}

function getHouseRating(ownerId) {
  const values = Object.values(houseRatings[ownerId] || {}).map(Number).filter(n => n >= 1 && n <= 5);
  const count = values.length;
  const avg = count ? values.reduce((a, b) => a + b, 0) / count : 0;
  return { count, avg };
}

function rateHouse(ownerId, stars) {
  if (!isLoggedIn() || !ownerId || ownerId === currentOwner()) return;
  const user = window.auth.currentUser;
  window.set(window.ref(window.db, `houseRatings/${ownerId}/${user.uid}`), stars).then(() => {
    showToast('تم تقييم البيت');
  }).catch(() => showToast('فشل حفظ التقييم'));
}

function updateHousePanel() {
  const ownBox = document.getElementById('ownHouseBox');
  const visitBox = document.getElementById('visitedHouseBox');
  const input = document.getElementById('houseNameInput');
  if (input && !input.value) input.value = localStorage.getItem(HOUSE_NAME_KEY) || '';

  if (ownBox) ownBox.classList.toggle('hidden', !isLoggedIn());
  if (!visitBox) return;

  visitBox.classList.add('hidden');
  const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
  const cell = walkMode ? cellFromWorld(player.x, player.y) : cellFromWorld(center.x, center.y);
  const cellData = cell ? world[cell.key] : null;
  const ownerId = cellData?.owner || '';

  if (!ownerId || ownerId === currentOwner() || !houseProfiles[ownerId]) return;

  const profile = houseProfiles[ownerId];
  const rating = getHouseRating(ownerId);
  const title = document.getElementById('visitedHouseTitle');
  const stats = document.getElementById('visitedHouseStats');
  const starsBox = document.getElementById('visitedHouseStars');

  if (title) title.textContent = profile.name || 'بيت لاعب';
  if (stats) stats.textContent = `${rating.avg.toFixed(1)} من 5 | عدد المقيمين: ${rating.count}`;
  if (starsBox) {
    starsBox.innerHTML = [1,2,3,4,5].map(n => `<button class="starBtn" data-stars="${n}" type="button">★</button>`).join('');
    starsBox.querySelectorAll('.starBtn').forEach(btn => btn.onclick = () => rateHouse(ownerId, Number(btn.dataset.stars)));
  }

  visitBox.classList.remove('hidden');
}

const SHOP_ITEMS = {
  grocery: [
    { name: 'أناناس', price: 5, value: 5, img: 'All-Pic/level/Pineapple.png' },
    { name: 'موز', price: 10, value: 10, img: 'All-Pic/level/Banana.png' },
    { name: 'عنب', price: 15, value: 15, img: 'All-Pic/level/Grapes.png' },
    { name: 'تفاح', price: 20, value: 20, img: 'All-Pic/level/Apple.png' },
    { name: 'بطيخ', price: 25, value: 25, img: 'All-Pic/level/Watermelon.png' }
  ],
  pharmacy: [
    { name: 'صبار', price: 5, value: 5, img: 'All-Pic/level/Aloe-Vera.png' },
    { name: 'بابونج', price: 10, value: 10, img: 'All-Pic/level/Chamomile.png' },
    { name: 'كركم', price: 15, value: 15, img: 'All-Pic/level/Turmeric.png' },
    { name: 'لافندر', price: 20, value: 20, img: 'All-Pic/level/Lavender.png' },
    { name: 'نعناع', price: 25, value: 25, img: 'All-Pic/level/Mint.png' }
  ]
};

// أماكن NPC ثابتة ومتفرقة داخل الخريطة بعيدًا عن الحواف
const NPC_STARTS = {
  grocery: ['H12', 'BR73'], spookyMan: ['L22','Q45','AB18','AH66','AR33','BE84','BT21','CD58','CK77','CV39'], pharmacy: ['M78','CJ15'], oryx: ['AF41','BX64'], wolf: ['J35','P82','Y24','AL72','AZ44','BI27','BO91','CC52','CR18','CU70'], caracal: ['F57','N15','U88','AG36','AT61','BB13','BL48','CA83','CG29','CW55'], shepherd: ['R68'], camel: ['BQ28']
};

const NPC_CONFIG = {
  grocery: { label: 'صاحب البقالة', src: 'All-Pic/npc/q5.png', mode: 'always', type: 'shop' },
  spookyMan: { label: 'الرجل المرعب', src: 'All-Pic/npc/q8.png', mode: 'night', type: 'enemy' },
  pharmacy: { label: 'الصيدلي', src: 'All-Pic/npc/q6.png', mode: 'always', type: 'shop' },
  oryx: { label: 'المها العربية', src: 'All-Pic/npc/q2.png', mode: 'always', type: 'animal' },
  wolf: { label: 'ذيب صحراوي', src: 'All-Pic/npc/q4.png', mode: 'night', type: 'enemy' },
  caracal: { label: 'وشق', src: 'All-Pic/npc/q1.png', mode: 'day', type: 'enemy' },
  shepherd: { label: 'الراعي', src: 'All-Pic/npc/q7.png', mode: 'always', type: 'quest' },
  camel: { label: 'الجمل الضائع', src: 'All-Pic/npc/q3.png', mode: 'always', type: 'quest' }
};

const npcImageCache = {};
const npcs = [];

function makeNpc(id, kind, cellKey) {
  const cell = parseCell(cellKey) || { col: 50, row: 50 };
  const baseX = (cell.col - 0.5) * CELL;
  const baseY = (cell.row - 0.5) * CELL;
  return { id, kind, x: baseX, y: baseY, homeX: baseX, homeY: baseY, dir: 'down', moving: false, targetX: baseX, targetY: baseY, lastPick: 0, lastAttack: 0, chasing: false };
}

Object.entries(NPC_STARTS).forEach(([kind, cells]) => {
  cells.forEach((cell, i) => npcs.push(makeNpc(`${kind}_${i+1}`, kind, cell)));
});


let worldNpcsListenerStarted = false;
let worldNpcsLoaded = false;
let lastWorldNpcsSave = 0;

function npcToFirebaseData(npc) {
  return {
    id: npc.id,
    kind: npc.kind,
    x: Math.round(npc.x),
    y: Math.round(npc.y),
    homeX: Math.round(npc.homeX),
    homeY: Math.round(npc.homeY),
    dir: npc.dir || 'down',
    moving: !!npc.moving,
    chasing: !!npc.chasing,
    targetX: Math.round(npc.targetX || npc.x),
    targetY: Math.round(npc.targetY || npc.y),
    targetPlayer: npc.targetPlayer || '',
    updatedAt: Date.now()
  };
}

function applyWorldNpcsData(data) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    seedWorldNpcsToFirebase();
    return;
  }

  for (const npc of npcs) {
    const saved = data[npc.id];
    if (!saved || typeof saved !== 'object') continue;
    npc.x = clampNumber(saved.x, CELL, WORLD_COLS * CELL - CELL, npc.x);
    npc.y = clampNumber(saved.y, CELL, WORLD_ROWS * CELL - CELL, npc.y);
    npc.homeX = clampNumber(saved.homeX, CELL, WORLD_COLS * CELL - CELL, npc.homeX);
    npc.homeY = clampNumber(saved.homeY, CELL, WORLD_ROWS * CELL - CELL, npc.homeY);
    npc.targetX = clampNumber(saved.targetX, CELL, WORLD_COLS * CELL - CELL, npc.targetX || npc.x);
    npc.targetY = clampNumber(saved.targetY, CELL, WORLD_ROWS * CELL - CELL, npc.targetY || npc.y);
    npc.dir = ['up', 'down', 'left', 'right'].includes(saved.dir) ? saved.dir : npc.dir;
    npc.moving = !!saved.moving;
    npc.chasing = !!saved.chasing;
    npc.targetPlayer = typeof saved.targetPlayer === 'string' ? saved.targetPlayer : '';
  }
  worldNpcsLoaded = true;
}

function getNpcControllerUid() {
  const ids = Object.keys(onlinePlayers || {}).filter(Boolean);
  if (currentUser?.uid && !ids.includes(currentUser.uid)) ids.push(currentUser.uid);
  ids.sort();
  return ids[0] || '';
}

function isNpcController() {
  return !!(currentUser?.uid && currentUser.uid === getNpcControllerUid());
}

function seedWorldNpcsToFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;
  const data = {};
  npcs.forEach(npc => { data[npc.id] = npcToFirebaseData(npc); });
  window.set(window.ref(window.db, 'worldNpcs'), data).catch(error => console.error('worldNpcs seed error:', error));
}

function saveWorldNpcsToFirebase(force = false) {
  if (!force && !isNpcController()) return;
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;
  const data = {};
  npcs.forEach(npc => { data[npc.id] = npcToFirebaseData(npc); });
  window.set(window.ref(window.db, 'worldNpcs'), data).catch(error => console.error('worldNpcs save error:', error));
}

function listenWorldNpcsFromFirebase() {
  if (worldNpcsListenerStarted) return;
  if (!window.db || !window.ref || !window.onValue) {
    setTimeout(listenWorldNpcsFromFirebase, 400);
    return;
  }

  worldNpcsListenerStarted = true;
  window.onValue(window.ref(window.db, 'worldNpcs'), snapshot => {
    applyWorldNpcsData(snapshot.val());
  }, error => {
    console.error('worldNpcs listen error:', error);
    showToast('فشل تحميل الشخصيات المتجولة');
  });
}

function getNpcImage(src) {
  if (!npcImageCache[src]) {
    const img = new Image();
    img.src = src;
    npcImageCache[src] = img;
  }
  return npcImageCache[src];
}

function getDayNightVisibility(mode) {
  const night = getNightAlpha();
  if (mode === 'night') return night;
  if (mode === 'day') return 1 - night;
  return 1;
}

function isNpcActive(npc) {
  const mode = NPC_CONFIG[npc.kind]?.mode || 'always';
  return getDayNightVisibility(mode) > 0.03;
}

function pickNpcTarget(npc) {
  const range = CELL * 4; // مدى تجول NPC حول نقطة البداية
  npc.targetX = clampNumber(npc.homeX + (Math.random() - 0.5) * range, CELL * 2, WORLD_COLS * CELL - CELL * 2, npc.homeX);
  npc.targetY = clampNumber(npc.homeY + (Math.random() - 0.5) * range, CELL * 2, WORLD_ROWS * CELL - CELL * 2, npc.homeY);
  npc.lastPick = Date.now();
}

function updateNpcs() {
  const now = Date.now();
  const chaseDistance = CELL * 2;
  const stopChaseDistance = CELL * 1;
  const playerSpeed = player.speed || 5;
  const controller = isNpcController();

  for (const npc of npcs) {
    if (!isNpcActive(npc)) {
      if (controller) {
        npc.moving = false;
        npc.chasing = false;
        npc.targetPlayer = '';
      }
      continue;
    }

    if (activeTalkingNpc && activeTalkingNpc.id === npc.id) {
      npc.moving = false;
      npc.chasing = false;
      continue;
    }

    if (!controller) continue;

    const config = NPC_CONFIG[npc.kind];
    const distToPlayer = Math.hypot(player.x - npc.x, player.y - npc.y);
    const canChase = walkMode && config.type === 'enemy' && distToPlayer <= chaseDistance;

    if (canChase) {
      npc.chasing = true;
      npc.targetPlayer = currentUser?.uid || '';
    }
    if (!walkMode || distToPlayer > stopChaseDistance) {
      npc.chasing = false;
      npc.targetPlayer = '';
    }

    if (npc.chasing) {
      npc.targetX = player.x;
      npc.targetY = player.y;
    } else if (now - npc.lastPick > 2500 || Math.hypot(npc.targetX - npc.x, npc.targetY - npc.y) < 18) {
      pickNpcTarget(npc);
    }

    const dx = npc.targetX - npc.x;
    const dy = npc.targetY - npc.y;
    const len = Math.hypot(dx, dy);
    npc.moving = len > 2;

    if (npc.moving) {
      const slowWalk = (npc.kind === 'grocery' || npc.kind === 'pharmacy') ? 0.55 : 0.95;
      const speed = npc.chasing ? playerSpeed * 0.70 : slowWalk;
      const nx = dx / len;
      const ny = dy / len;
      npc.x = clampNumber(npc.x + nx * speed, CELL, WORLD_COLS * CELL - CELL, npc.x);
      npc.y = clampNumber(npc.y + ny * speed, CELL, WORLD_ROWS * CELL - CELL, npc.y);
      if (Math.abs(nx) > Math.abs(ny)) npc.dir = nx > 0 ? 'right' : 'left';
      else npc.dir = ny > 0 ? 'down' : 'up';
    }

    if (npc.chasing && distToPlayer < 42 && now - npc.lastAttack > 1800) {
      npc.lastAttack = now;
      gameState.health = Math.max(0, gameState.health - 10);
      handleEmptyBars();
      saveGameState();
      updateStatsPanel();
      showToast('تم نقص الصحة 10%');
    }
  }
}

function drawNpcSprite(npc) {
  if (!isNpcActive(npc)) return;
  const config = NPC_CONFIG[npc.kind];
  const npcAlpha = getDayNightVisibility(config.mode || 'always');
  const point = worldToScreen(npc.x, npc.y);
  if (point.x < -120 || point.y < -120 || point.x > canvas.clientWidth + 120 || point.y > canvas.clientHeight + 120) return;

  const img = getNpcImage(config.src);
  const drawW = PLAYER_DRAW_W * zoom;
  const drawH = PLAYER_DRAW_H * zoom;
  const rowMap = { down: 0, right: 1, up: 2, left: 3 }; // اتجاهات Sprite Sheet المعتمدة
  const row = rowMap[npc.dir] ?? 0;
  const frame = npc.moving ? Math.floor(Date.now() / 150) % SPRITE_COLS : 0;

  ctx.save();
  ctx.globalAlpha = npcAlpha;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(point.x, point.y + 8 * zoom, 20 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  if (img.complete && img.naturalWidth) {
    const frameW = img.naturalWidth / SPRITE_COLS;
    const frameH = img.naturalHeight / SPRITE_ROWS;
    const yOffset = npc.kind === 'caracal' ? 30 * zoom : 18 * zoom;
    ctx.drawImage(img, frame * frameW, row * frameH, frameW, frameH, point.x - drawW / 2, point.y - drawH + yOffset, drawW, drawH);
  } else {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(point.x - 12, point.y - 30, 24, 30);
  }

  if (npc.kind === 'spookyMan' && getNightAlpha() > 0.03) {
    drawPointLight(point.x - 10 * zoom, point.y - 22 * zoom, 85 * zoom, getNightAlpha() * npcAlpha, 0);
  }

  ctx.fillStyle = '#fff';
  ctx.font = `800 ${Math.max(9, 12 * zoom)}px "Baloo Bhaijaan 2", Arial, sans-serif`; 
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 3;
  ctx.strokeText(config.label, point.x, point.y - drawH + 14 * zoom);
  ctx.fillText(config.label, point.x, point.y - drawH + 14 * zoom);
  ctx.textAlign = 'start';
  ctx.restore();
}

function drawNpcs() {
  for (const npc of npcs) drawNpcSprite(npc);
}

function getNearestInteractNpc() {
  if (!walkMode) return null;
  let best = null;
  let bestDist = 999999;
  for (const npc of npcs) {
    if (!isNpcActive(npc)) continue;
    const type = NPC_CONFIG[npc.kind]?.type;
    if (!['shop', 'quest'].includes(type)) continue;
    const dist = Math.hypot(player.x - npc.x, player.y - npc.y);
    if (dist < 95 && dist < bestDist) { best = npc; bestDist = dist; }
  }
  return best;
}

function updateNpcInteractButton() {
  const btn = document.getElementById('npcInteractBtn');
  if (!btn) return;
  lastNearbyNpc = getNearestInteractNpc();
  btn.classList.toggle('hidden', !lastNearbyNpc);
  if (lastNearbyNpc) btn.textContent = `تحدث مع ${NPC_CONFIG[lastNearbyNpc.kind].label}`;
}

function openNpcInteraction(npc = lastNearbyNpc) {
  if (!npc) return;
  const config = NPC_CONFIG[npc.kind];
  activeTalkingNpc = npc;
  npc.targetX = player.x;
  npc.targetY = player.y;
  npc.moving = false;
  npc.dir = player.x > npc.x ? 'right' : 'left';

  if (npc.kind === 'grocery') return openShop('صاحب البقالة', 'grocery', 'hunger');
  if (npc.kind === 'pharmacy') return openShop('الصيدلي', 'pharmacy', 'health');
  if (npc.kind === 'shepherd' || npc.kind === 'camel') return openShepherdQuest(npc.kind);
}

function openShop(title, shopKey, target) {
  const modal = document.getElementById('npcModal');
  const titleBox = document.getElementById('npcTitle');
  const textBox = document.getElementById('npcText');
  const listBox = document.getElementById('npcShopList');
  if (!modal || !titleBox || !textBox || !listBox) return;

  titleBox.textContent = title;
  textBox.textContent = target === 'hunger' ? 'اختر غذاء لزيادة شريط الجوع.' : 'اختر نباتًا لزيادة شريط الصحة.';
  listBox.innerHTML = SHOP_ITEMS[shopKey].map((item, i) => `
    <div class="shopItemWrap">
      <button class="shopItemBtn" data-shop="${shopKey}" data-index="${i}" type="button">
        <img src="${item.img}" alt="${item.name}">
        <span>${item.name}</span>
        <b>${item.price} ريال</b>
        <small>+${item.value}%</small>
      </button>
      <div class="shopConfirm hidden"></div>
    </div>
  `).join('');
  listBox.querySelectorAll('.shopItemBtn').forEach(btn => {
    btn.onclick = () => showShopConfirm(btn, btn.dataset.shop, Number(btn.dataset.index), target);
  });
  modal.classList.remove('hidden');
}

function showShopConfirm(btn, shopKey, index, target) {
  const item = SHOP_ITEMS[shopKey][index];
  if (!item) return;
  const box = btn.parentElement?.querySelector('.shopConfirm');
  if (!box) return;
  document.querySelectorAll('.shopConfirm').forEach(el => { el.classList.add('hidden'); el.innerHTML = ''; });
  if (target === 'hunger' && gameState.hunger >= 100) { box.classList.remove('hidden'); box.textContent = 'الجوع ممتلئ، لا تحتاج الشراء.'; return; }
  if (target === 'health' && gameState.health >= 100) { box.classList.remove('hidden'); box.textContent = 'الصحة ممتلئة، لا تحتاج الشراء.'; return; }
  if (gameState.money < item.price) { box.classList.remove('hidden'); box.textContent = 'لا تستطيع الشراء، المال لا يكفي.'; return; }
  box.classList.remove('hidden');
  box.innerHTML = `<span>هل أنت متأكد من الشراء؟</span><button type="button" class="confirmBuyYes">نعم</button><button type="button" class="confirmBuyNo">لا</button>`;
  box.querySelector('.confirmBuyYes').onclick = () => buyShopItem(shopKey, index, target);
  box.querySelector('.confirmBuyNo').onclick = () => { box.classList.add('hidden'); box.innerHTML = ''; };
}

function buyShopItem(shopKey, index, target) {
  const item = SHOP_ITEMS[shopKey][index];
  if (!item) return;
  if (target === 'hunger' && gameState.hunger >= 100) return showToast('لا تشتري، الجوع ممتلئ أساسًا');
  if (target === 'health' && gameState.health >= 100) return showToast('لا تشتري، الصحة ممتلئة أساسًا');
  if (!spendMoney(item.price)) return;
  if (target === 'hunger') addHunger(item.value);
  if (target === 'health') addHealth(item.value);
  gameState.quests.usedShop = true;
  saveGameState();
  updateMissionsPanel();
}

function openShepherdQuest(kind) {
  const modal = document.getElementById('npcModal');
  const titleBox = document.getElementById('npcTitle');
  const textBox = document.getElementById('npcText');
  const listBox = document.getElementById('npcShopList');
  if (!modal || !titleBox || !textBox || !listBox) return;

  const q = gameState.quests.shepherdCamel || {};
  titleBox.textContent = kind === 'shepherd' ? 'الراعي' : 'الجمل الضائع';
  listBox.innerHTML = '';

  if (q.completed) {
    textBox.textContent = 'أنت أكملت هذه المهمة خلاص.';
  } else if (kind === 'shepherd' && q.foundCamel) {
    textBox.textContent = 'وجدت الجمل والراعي، حصلت على مكافأة 50 ريال.';
    gameState.quests.shepherdCamel = { completed: true };
    addMoney(50);
  } else if (kind === 'camel' && q.foundShepherd) {
    textBox.textContent = 'رجّعت خبر الجمل للراعي، حصلت على مكافأة 50 ريال.';
    gameState.quests.shepherdCamel = { completed: true };
    addMoney(50);
  } else if (kind === 'shepherd') {
    textBox.textContent = 'الراعي يبحث عن جمله الضائع. ابحث عن الجمل ثم ارجع له.';
    gameState.quests.shepherdCamel = Object.assign({}, q, { foundShepherd: true });
    saveGameState();
  } else {
    textBox.textContent = 'وجدت الجمل الضائع. ابحث عن الراعي لتحصل على 50 ريال.';
    gameState.quests.shepherdCamel = Object.assign({}, q, { foundCamel: true });
    saveGameState();
  }

  modal.classList.remove('hidden');
}

function loadCollectedMoney() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLLECTED_MONEY_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch { return new Set(); }
}

let collectedMoneyIds = loadCollectedMoney();
const mapMoney = Array.from({ length: 80 }, (_, i) => {
  const col = 4 + ((i * 37) % 92);
  const row = 4 + ((i * 53) % 92);
  return { id: 'money_' + i, x: (col - 0.5) * CELL, y: (row - 0.5) * CELL, amount: 1 + (i % 5) };
});

function saveCollectedMoney() {
  localStorage.setItem(COLLECTED_MONEY_KEY, JSON.stringify([...collectedMoneyIds]));
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;
  window.set(window.ref(window.db, 'inventory/' + window.auth.currentUser.uid + '/collectedMoney'), [...collectedMoneyIds]).catch(console.error);
}

function loadCollectedMoneyFromFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.get) return;
  window.get(window.ref(window.db, 'inventory/' + window.auth.currentUser.uid + '/collectedMoney')).then(snapshot => {
    const data = snapshot.val();
    if (Array.isArray(data)) collectedMoneyIds = new Set(data);
  }).catch(console.error);
}

function drawMapMoney() {
  ctx.save();
  ctx.font = `${Math.max(16, 26 * zoom)}px Arial`;
  ctx.textAlign = 'center';
  for (const coin of mapMoney) {
    if (collectedMoneyIds.has(coin.id)) continue;
    const p = worldToScreen(coin.x, coin.y);
    if (p.x < -50 || p.y < -50 || p.x > canvas.clientWidth + 50 || p.y > canvas.clientHeight + 50) continue;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#422006';
    ctx.fillText('﷼', p.x, p.y + 7 * zoom);
  }
  ctx.restore();
}

function collectNearbyMoney() {
  if (!walkMode) return;
  let changed = false;
  for (const coin of mapMoney) {
    if (collectedMoneyIds.has(coin.id)) continue;
    if (Math.hypot(player.x - coin.x, player.y - coin.y) <= 45) {
      collectedMoneyIds.add(coin.id);
      gameState.money += coin.amount;
      changed = true;
      showToast(`حصلت على ${coin.amount} ريال`);
    }
  }
  if (changed) {
    saveCollectedMoney();
    saveGameState();
    updateStatsPanel();
  }
}

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
  if (groupKey === 'floor') return { w: 220, h: 220 };
  if (groupKey === 'wall' && size === 'Big') return { w: 190, h: 190 };
  if (groupKey === 'wall' && size === 'Medium') return { w: 145, h: 145 };
  if (groupKey === 'carpet' && size === 'Medium') return { w: 145, h: 145 };
  if (groupKey === 'carpet' && size === 'Small') return { w: 85, h: 85 };
  if (groupKey === 'door' && size === 'Medium') return { w: 95, h: 95 };
  if (groupKey === 'door' && size === 'Precise') return { w: 45, h: 45 };

  const data = SIZE_DATA[size] || SIZE_DATA.Medium;
  return { w: data.w, h: data.h };
}

function isDefaultBlocking(groupKey) {
  return groupKey === 'wall' || groupKey === 'door';
}

function getImageName(group, size, index) {
  if (group.key === 'floor') return `${group.prefix}-big-${index}.png`;
  if (group.key === 'plant' && size === 'Precise') return `sprite_${33 + index}.png`;
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
        image: `${ASSET_BASE}/${group.folder}/${group.prefix}-${number}.${TILE_IMAGE_EXT}`,
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


function cleanPlayerName(name, max = 40) {
  return String(name || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function clampNumber(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeItemForSave(item, cellKey) {
  if (!item || !item.uid || !item.tileId) return null;

  return {
    uid: String(item.uid),
    tileId: String(item.tileId),
    cell: String(cellKey || item.cell),
    x: clampNumber(item.x, 0, CELL, 0),
    y: clampNumber(item.y, 0, CELL, 0),
    w: clampNumber(item.w, 12, 1000, 55),
    h: clampNumber(item.h, 12, 1000, 55),
    layer: clampNumber(item.layer, 1, 5, 1),
    blocking: !!item.blocking,
    owner: currentOwner() || String(item.owner || ''),
    ...(typeof item.flipX === 'boolean' ? { flipX: item.flipX } : {}),
    ...(typeof item.flipY === 'boolean' ? { flipY: item.flipY } : {})
  };
}

function nearbyCellKeys(centerKey, radius = CHUNK_RADIUS) {
  const center = parseCell(centerKey);
  if (!center) return [];

  const keys = [];
  for (let dc = -radius; dc <= radius; dc++) {
    for (let dr = -radius; dr <= radius; dr++) {
      const col = center.col + dc;
      const row = center.row + dr;
      if (col >= 1 && row >= 1 && col <= WORLD_COLS && row <= WORLD_ROWS) {
        keys.push(`${colName(col)}${row}`);
      }
    }
  }
  return keys;
}

function subscribeNearbyWorldCells(force = false) {
  if (!USE_NEARBY_WORLD_LOADING || !window.db || !window.ref || !window.onValue) return;
  const currentCell = cellFromWorld(player.x, player.y) || cellFromWorld(camX + canvas.clientWidth / zoom / 2, camY + canvas.clientHeight / zoom / 2);
  if (!currentCell) return;
  if (!force && currentCell.key === lastSubscribedCenterCell) return;

  lastSubscribedCenterCell = currentCell.key;
  const wanted = new Set(nearbyCellKeys(currentCell.key));

  Object.keys(worldListeners).forEach(key => {
    if (!wanted.has(key)) {
      if (window.off) window.off(window.ref(window.db, 'world/' + key), 'value', worldListeners[key]);
      delete worldListeners[key];
      delete world[key];
    }
  });

  wanted.forEach(key => {
    if (worldListeners[key]) return;

    const callback = snapshot => {
      if (dragMode || isDown) return;
      const val = snapshot.val();
      if (!val) {
        delete world[key];
      } else {
        const normalized = normalizeWorldData({ [key]: val });
        if (normalized[key]) world[key] = normalized[key];
      }
      saveLocalWorld();
      updateInfoPanel();
    };

    worldListeners[key] = callback;
    window.onValue(window.ref(window.db, 'world/' + key), callback, error => {
      console.error(error);
      showToast('فشل تحميل الخلايا القريبة');
    });
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

  if (cell.items.length > MAX_ITEMS_PER_CELL) {
    cell.items = cell.items.slice(0, MAX_ITEMS_PER_CELL);
    showToast('تم الوصول للحد الأقصى داخل الخلية');
  }

  const safeItems = cell.items
    .map(item => sanitizeItemForSave(item, cellKey))
    .filter(Boolean);

  window.set(window.ref(window.db, 'world/' + cellKey), {
    owner: cell.owner || currentOwner(),
    items: safeItems
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
  console.warn('saveWorldToFirebaseFull is disabled. Use saveCellToFirebase(cellKey) only.');
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

  if (USE_NEARBY_WORLD_LOADING) {
    subscribeNearbyWorldCells(true);
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
    const original = String(src);
    const candidates = Array.from(new Set([
      original,
      original.replace(/\.(webp|png|jpg|jpeg)$/i, '.png'),
      original.replace(/\.(webp|png|jpg|jpeg)$/i, '.webp'),
      original.replace(/\.(webp|png|jpg|jpeg)$/i, '.jpg'),
      original.replace(/\.(webp|png|jpg|jpeg)$/i, '.jpeg')
    ]));
    let index = 0;

    img.onerror = () => {
      index += 1;
      if (index < candidates.length) img.src = candidates[index];
    };

    img.src = candidates[index];
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
  if (textBox) textBox.textContent = text;
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
  const winterAlpha = getWinterAlpha();

  for (let col = startCol; col <= endCol; col++) {
    for (let row = startRow; row <= endRow; row++) {
      const src = getEdgeFloorSrc(col, row);
      const img = getTileImage(src);
      const iceImg = getTileImage(iceSrc(src));
      const sx = ((col - 1) * CELL - camX) * zoom;
      const sy = ((row - 1) * CELL - camY) * zoom;
      const size = CELL * zoom;
      const bleed = 1;

      if (img && img.complete && img.naturalWidth) {
        drawImageWithSeason(img, iceImg, sx - bleed, sy - bleed, size + bleed * 2, size + bleed * 2, winterAlpha);
      } else if (floorImage.complete && floorImage.naturalWidth) {
        const floorIce = getTileImage(iceSrc(DEFAULT_FLOOR_SRC));
        drawImageWithSeason(floorImage, floorIce, sx - bleed, sy - bleed, size + bleed * 2, size + bleed * 2, winterAlpha);
      } else {
        ctx.fillStyle = '#a16207';
        ctx.fillRect(sx - bleed, sy - bleed, size + bleed * 2, size + bleed * 2);
      }
    }
  }
}

function drawFixedGroundTiles() {
  const winterAlpha = getWinterAlpha();

  for (const ground of fixedGroundTiles) {
    const cell = parseCell(ground.cell);
    if (!isSafeFixedCell(cell)) continue;

    const img = getTileImage(ground.src);
    const iceImg = getTileImage(iceSrc(ground.src));
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
      drawImageWithSeason(img, iceImg, point.x, point.y, size, size, winterAlpha);
    }
  }
}


function drawFixedAnimals() {
  updateFixedAnimalsDom();
}


function iceSrc(src) {
  return String(src || '').replace(/(\.png|\.gif)$/i, '-ice$1');
}

function getWinterAlpha() {
	
	// تغيير وقت الشتاء 
	
  const period = 0.9 * 60 * 1000;
  const transition = 3000;
  const t = Date.now() % (period * 2);

  if (t < transition) return 1 - t / transition;
  if (t < period) return 0;
  if (t < period + transition) return (t - period) / transition;
  return 1;
}

function isWinterActive() {
  return getWinterAlpha() > 0.01;
}

function drawImageWithSeason(img, iceImg, x, y, w, h, alpha = getWinterAlpha()) {
  if (img && img.complete && img.naturalWidth) {
    ctx.drawImage(img, x, y, w, h);
  }

  if (alpha > 0.01 && iceImg && iceImg.complete && iceImg.naturalWidth) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(iceImg, x, y, w, h);
    ctx.restore();
  }
}

function drawSnow(width, height) {
  const alpha = getWinterAlpha();
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, 0, width, height);

// شفافية العاصفة الشتاء 
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';

  for (const snow of snowflakes) {
    const x = snow.x * width;
    const y = snow.y * height;

    ctx.beginPath();
    ctx.arc(x, y, snow.size, 0, Math.PI * 2);
    ctx.fill();

    snow.y += snow.speed / height;

    if (snow.y > 1) {
      snow.y = 0;
      snow.x = Math.random();
    }
  }

  ctx.restore();
}

function isSafeFixedCell(cell) {
  if (!cell) return false;
  return cell.col > 2 && cell.col < WORLD_COLS - 1 && cell.row > 2 && cell.row < WORLD_ROWS - 1;
}

function ensureAnimalLayer() {
  let layer = document.getElementById('animalLayer');

  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'animalLayer';
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '25';
    document.querySelector('.worldWrap')?.appendChild(layer);
  }

  return layer;
}

function updateFixedAnimalsDom() {
  const layer = ensureAnimalLayer();
  if (!layer) return;

  const alpha = getWinterAlpha();

  fixedAnimalTiles.forEach((animal, index) => {
    const cell = parseCell(animal.cell);
    if (!isSafeFixedCell(cell)) return;

    const sizeWorld = CELL * 0.22;
    const x = (cell.col - 1) * CELL + CELL / 2 - sizeWorld / 2;
    const y = (cell.row - 1) * CELL + CELL / 2 - sizeWorld / 2;
    const point = worldToScreen(x, y);
    const size = sizeWorld * zoom;

    let img = document.getElementById('fixedAnimal_' + index);

    if (!img) {
      img = document.createElement('img');
      img.id = 'fixedAnimal_' + index;
      img.alt = 'حيوان';
      img.style.position = 'absolute';
      img.style.objectFit = 'contain';
      img.style.imageRendering = 'pixelated';
      img.style.pointerEvents = 'none';
      layer.appendChild(img);
    }

    const nextSrc = alpha > 0.5 ? iceSrc(animal.src) : animal.src;

if (!img.dataset.currentSrc || img.dataset.currentSrc !== nextSrc) {
  img.src = nextSrc;
  img.dataset.currentSrc = nextSrc;
}
    img.style.left = `${point.x}px`;
    img.style.top = `${point.y}px`;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.display = (
      point.x + size < -80 ||
      point.y + size < -80 ||
      point.x > canvas.clientWidth + 80 ||
      point.y > canvas.clientHeight + 80
    ) ? 'none' : 'block';
  });
}

// نظام الليل التدريجي

function getNightAlpha() {

  const period = 0.5 * 60 * 1000;
  const transition = 3000;

  const t = Date.now() % (period * 2);

  if (t < transition) {
    return t / transition;
  }

  if (t < period) {
    return 1;
  }

  if (t < period + transition) {
    return 1 - ((t - period) / transition);
  }

  return 0;

}

function isNightActive() {
  return getNightAlpha() > 0.01;
}

function drawNightFilter(width, height) {
  if (!isNightActive()) return;

  ctx.fillStyle = `rgba(0,0,30,${0.45 * getNightAlpha()})`;
  
  ctx.fillRect(0, 0, width, height);
}

function drawPointLight(lightX, lightY, radius, alpha = 1, layer = 0) {
  if (alpha <= 0.01) return;
  const glow = ctx.createRadialGradient(lightX, lightY, 10, lightX, lightY, radius);
  glow.addColorStop(0, `rgba(255,235,130,${0.48 * alpha})`);
  glow.addColorStop(1, `rgba(255,255,230,${0.04 * alpha})`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lightX, lightY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLights(layer = 1) {
  const nightAlpha = getNightAlpha();
  if (nightAlpha <= 0.01) return;

  const visibleItems = getItems().filter(item => (item.layer || 1) === layer);

  for (const item of visibleItems) {
    if (!String(item.tileId || '').includes('Lighting')) continue;

    const rect = itemRect(item);
    const point = worldToScreen(rect.x, rect.y);

    const lightX = point.x + rect.w * zoom / 2;
    const lightY = point.y + rect.h * zoom / 2;
    const radius = 110 * zoom;

    drawPointLight(lightX, lightY, radius, nightAlpha, item.layer || 1);
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
  let currentLayer = 0;

  for (const item of visibleItems) {
    const itemLayer = item.layer || 1;
    if (itemLayer !== currentLayer) {
      if (currentLayer) drawLights(currentLayer);
      currentLayer = itemLayer;
    }
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
  if (currentLayer) drawLights(currentLayer);
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
  ctx.globalAlpha = npcAlpha;
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

  try {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);
    document.body.classList.toggle('nightActive', isNightActive());

    drawFloorBackground(width, height);
    drawFixedGroundTiles();
    drawFixedAnimals();
    drawMapMoney();
    drawItems();
    drawNpcs();
    drawGrid(width, height);
    drawBuildBoundaryFlash();
    drawGhostTile();
    drawSelectionBox();
    drawOnlinePlayers();

    if (walkMode) drawPlayer();

    // عتمة الليل فوق العناصر، ثم إضاءة إضافية فوق الفلتر حتى تظهر الإنارة ليلًا
    drawNightFilter(width, height);
    drawLights(1); drawLights(2); drawLights(3); drawLights(4); drawLights(5);
    drawSnow(width, height);

    if (Date.now() - lastUiUpdate > 300) {
      updateInfoPanel();
      lastUiUpdate = Date.now();
    }
  } catch (error) {
    console.error('draw error:', error);
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
  bind('guestPanelOverlay', 'click', openAuthModal);
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
      'لعبة GameNjd هي لعبة بناء وتجول عربية.\nابنِ عالمك داخل خلايا كبيرة، اختر شخصيتك، وتجول مع اللاعبين.\nالموقع يستخدم Firebase من Google لحفظ الحسابات والبيانات، مع قواعد أمان تمنع التعديل إلا من صاحب الحساب.'
    );
  });

  bind('settingsHelpBtn', 'click', showSettingsHelp);
  bind('shortcutsBtn', 'click', showShortcuts);
  bind('flipBtn', 'click', toggleFlip);
  bind('flipYBtn', 'click', toggleFlipY);
  bind('homeBtn', 'click', toggleHomeCamera);
  bind('setHomeBtn', 'click', setHomeCamera);
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
    document.body.classList.toggle('mobilePanelHidden');
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
  bind('mobileLockCameraBtn', 'click', toggleMobileCameraLock);

  bind('zoomInBtn', 'click', () => {
    // تكبير تدريجي: عشر ضغطات تقريبًا للوصول للتكبير العالي
    zoom = clampZoomValue(zoom * ZOOM_STEP);
    clampCam();
  });

  bind('zoomOutBtn', 'click', () => {
    // تصغير تدريجي: عشر ضغطات تقريبًا مع حد للتبعيد
    zoom = clampZoomValue(zoom / ZOOM_STEP);
    clampCam();
  });

  bind('eraseBtn', 'click', toggleEraser);
  bind('blockBtn', 'click', toggleBlocking);
  bind('undoBtn', 'click', undo);
  bind('jumpBtn', 'click', jump);
  bind('walkBtn', 'click', toggleWalk);
  bind('saveNameBtn', 'click', saveDisplayName);
  bind('saveHouseNameBtn', 'click', saveHouseProfile);
  bind('npcInteractBtn', 'click', () => openNpcInteraction());
  bind('npcCloseBtn', 'click', () => { activeTalkingNpc = null; document.getElementById('npcModal')?.classList.add('hidden'); });
  bind('openMissionsBtn', 'click', () => { updateMissionsPanel(); document.getElementById('missionsModal')?.classList.remove('hidden'); });
  bind('missionsCloseBtn', 'click', () => document.getElementById('missionsModal')?.classList.add('hidden'));

  const jumpInput = document.getElementById('jumpInput');
  if (jumpInput) {
    jumpInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        jump();
      }
    });
  }

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

  const signupNameInput = document.getElementById('signupDisplayNameInput');
  if (signupNameInput) signupNameInput.value = displayName;

  const lastUsername = localStorage.getItem(LAST_EMAIL_KEY);
  const usernameInput = document.getElementById('authUsernameInput');
  const signupUsernameInput = document.getElementById('signupUsernameInput');
  const resetEmailInput = document.getElementById('resetEmailInput');

  if (lastUsername) {
    if (usernameInput) usernameInput.value = emailToUsername(lastUsername);
    if (signupUsernameInput) signupUsernameInput.value = emailToUsername(lastUsername);
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
  updateHomeCellText();
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

  clearTimeout(showBigTilePreview.mobileTimer);
  if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
    showBigTilePreview.mobileTimer = setTimeout(hideBigTilePreview, 3000);
  }
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
  document.body.classList.toggle('loggedIn', isLoggedIn());

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
  const mobileLockCameraBtn = document.getElementById('mobileLockCameraBtn');

  if (eraseBtn) eraseBtn.innerHTML = `<i class="fa-solid fa-eraser"></i> ${eraseText}`;
  if (blockBtn) blockBtn.innerHTML = `<i class="fa-solid fa-ban"></i> ${blockText}`;
  if (flipBtn) flipBtn.innerHTML = `<i class="fa-solid fa-left-right"></i> ${flipText}`;
  if (flipYBtn) flipYBtn.innerHTML = `<i class="fa-solid fa-up-down"></i> ${flipYText}`;
  if (autoAlignBtn) autoAlignBtn.innerHTML = `<i class="fa-solid fa-border-all"></i> ${autoAlignText}`;

  if (mobileEraseBtn) mobileEraseBtn.classList.toggle('active', eraser);
  if (mobileBlockBtn) mobileBlockBtn.classList.toggle('active', blockingMode);
  if (mobileFlipBtn) mobileFlipBtn.classList.toggle('active', flipMode);
  if (mobileFlipYBtn) mobileFlipYBtn.classList.toggle('active', flipYMode);
  if (mobileLockCameraBtn) {
    mobileLockCameraBtn.classList.toggle('active', mobileCameraLocked);
    mobileLockCameraBtn.innerHTML = `<i class="fa-solid fa-lock"></i><span>${mobileCameraLocked ? 'مثبت' : 'تثبيت'}</span>`;
  }
  if (autoAlignBtn) autoAlignBtn.classList.toggle('active', autoAlignMode);
}


function updateHomeCellText() {
  const key = getHomeCellKey();
  document.querySelectorAll('[data-home-cell]').forEach(el => {
    el.textContent = key ? `بيتك في: ${key}` : 'لم تحدد بيتك بعد';
  });
}

function updateInfoPanel() {
  const countBox = document.getElementById('myItemsCount');
  const cellBox = document.getElementById('currentCellText');

  if (countBox) countBox.textContent = String(getMyItems().length);

  const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
  const cell = walkMode ? cellFromWorld(player.x, player.y) : cellFromWorld(center.x, center.y);

  if (cellBox) cellBox.textContent = cell ? cell.key : '--';
  document.querySelectorAll('[data-stat="currentCell"]').forEach(el => el.textContent = cell ? cell.key : '--');
  updateHomeCellText();
  if (cell) rememberVisitedCell(cell.key);

  updateSelectedPreview();
  updateMissionsPanel();
  updateHousePanel();
  updateNpcInteractButton();
  updateStatsPanel();
}

function getVisitedCells() {
  try {
    const saved = JSON.parse(localStorage.getItem(VISITED_CELLS_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function rememberVisitedCell(cellKey) {
  if (!cellKey) return;
  const cells = getVisitedCells();
  if (cells.includes(cellKey)) return;
  cells.push(cellKey);
  localStorage.setItem(VISITED_CELLS_KEY, JSON.stringify(cells.slice(-50)));
}

function updateMissionsPanel() {
  const box = document.getElementById('missionsList');
  if (!box) return;

  const myItems = getMyItems();
  const categoriesUsed = new Set(myItems.map(item => tileMap[item.tileId]?.category).filter(Boolean));
  const visitedCount = getVisitedCells().length;
  const hasHome = !!localStorage.getItem(HOME_KEY);
  const shepherdDone = !!gameState.quests.shepherdCamel?.completed;

  const missions = [
    { text: 'اختر شخصية', done: !!myCharacterId, money: 0, points: 5 },
    { text: 'ضع 5 عناصر في عالمك', done: myItems.length >= 5, money: 1, points: 5 },
    { text: 'استخدم 3 أقسام مختلفة', done: categoriesUsed.size >= 3, money: 2, points: 10 },
    { text: 'حدد منزلك', done: hasHome, money: 1, points: 5 },
    { text: 'زر 3 خلايا مختلفة', done: visitedCount >= 3, money: 1, points: 5 },
    { text: 'ابحث عن الراعي والجمل', done: shepherdDone, money: 50, points: 25 },
    { text: 'اجمع أول ريال من الخريطة', done: collectedMoneyIds.size > 0, money: 0, points: 5 },
    { text: 'تحدث مع صاحب البقالة أو الصيدلي', done: !!gameState.quests.usedShop, money: 0, points: 5 }
  ];

  box.innerHTML = missions.map(mission => `
    <div class="missionItem ${mission.done ? 'done' : ''}">
      <span>${mission.done ? '✅' : '⬜'} ${mission.text}</span>
      <small>الجائزة: ${mission.money} ريال | ${mission.points} نقطة</small>
    </div>
  `).join('');
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

function toggleMobileCameraLock() {
  if (!requireLogin()) return;

  mobileCameraLocked = !mobileCameraLocked;
  document.body.classList.toggle('mobileCameraLocked', mobileCameraLocked);
  updateToolButtons();
  showToast(mobileCameraLocked ? 'تم تثبيت الكاميرا' : 'تم إلغاء تثبيت الكاميرا');
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
    localStorage.setItem(HOME_KEY, JSON.stringify({ camX, camY, zoom, cell: cellFromWorld(camX + canvas.clientWidth / zoom / 2, camY + canvas.clientHeight / zoom / 2)?.key || '' }));
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

function setHomeCamera() {
  if (!requireLogin()) return;

  localStorage.setItem(HOME_KEY, JSON.stringify({ camX, camY, zoom, cell: cellFromWorld(camX + canvas.clientWidth / zoom / 2, camY + canvas.clientHeight / zoom / 2)?.key || '' }));
  updateHomeButton();
  updateHomeCellText();
  showToast('تم تحديد منزل جديد');
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

  // وضع العنصر بضغطة واحدة فقط، بدون ريشة أو رسم مستمر
  paintOne(x, y);
}


function applyAutoAlign(item, cellKey) {
  if (!autoAlignMode) return;

  const cellData = world[cellKey];
  if (!cellData || !Array.isArray(cellData.items)) return;

  const near = 75;

  for (const other of cellData.items) {
    if (!other || other.uid === item.uid) continue;
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

  if (!canUseBuildSettingsAtCell(cell.key)) return;

  if (!canEditCell(cell.key)) {
    showToast('التعديل ممنوع داخل مكان لاعب آخر');
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
  if (cellData.items.length >= MAX_ITEMS_PER_CELL) {
    showToast('وصلت للحد الأقصى للعناصر داخل هذه الخلية');
    return;
  }

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
  item.x = clampNumber(item.x, 0, CELL, 0);
  item.y = clampNumber(item.y, 0, CELL, 0);
  cellData.items.push(item);

  saveLocalWorld();
  saveCellToFirebase(cell.key);
  updateInfoPanel();
}

function eraseAt(x, y) {
  const hit = hitItem(x, y);
  if (!hit) return;

  if (!canUseBuildSettingsAtCell(hit.cell)) return;

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
    if (selectedIds.has(item.uid) && canEditCell(item.cell) && canUseBuildSettingsAtCell(item.cell, false)) {
      item.x += dx;
      item.y += dy;
      item.x = clampNumber(item.x, 0, CELL, item.x);
      item.y = clampNumber(item.y, 0, CELL, item.y);
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

canvas.addEventListener('contextmenu', event => event.preventDefault());

canvas.addEventListener('mousedown', event => {
  if (walkMode) return;

  isDown = true;
  lastPaintKey = '';

  const pos = getMouse(event);
  dragStart = pos;
  mouseWorldPos = pos.world;

  const rightClickHit = event.button === 2 ? hitItem(pos.world.x, pos.world.y) : null;
  if (rightClickHit) {
    if (!requireLogin()) return;
    if (!canUseBuildSettingsAtCell(rightClickHit.cell)) return;
    pushUndo();
    selectedTile = null;
    eraser = false;
    selectedIds = new Set([rightClickHit.uid]);
    dragMode = 'move';
    updateSelectedPreview();
    updateToolButtons();
    return;
  }

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

    dragMode = null;
    pushUndo();
    paintAt(pos.world.x, pos.world.y);
  }
});

canvas.addEventListener('mousemove', event => {
  const pos = getMouse(event);
  mouseWorldPos = pos.world;

  if (!isDown || walkMode) return;

  // تم إلغاء الرسم المستمر بالعناصر لمنع السبام واللاق

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

    zoom = clampZoomValue(zoom * (event.deltaY < 0 ? ZOOM_STEP : (1 / ZOOM_STEP)));

    camX = before.world.x - before.x / zoom;
    camY = before.world.y - before.y / zoom;
  } else if (event.shiftKey) {
    camX += event.deltaY / zoom;
  } else {
    camY += event.deltaY / zoom;
  }

  clampCam();
}, { passive: false });


// منع زوم المتصفح داخل اللعبة كلها، وتطبيق حدود زوم اللعبة بدلًا منه
window.addEventListener('wheel', event => {
  if (!(event.ctrlKey || event.metaKey)) return;
  if (event.target === canvas) return;
  event.preventDefault();
  changeZoomByStep(event.deltaY < 0 ? 1 : -1);
}, { passive: false, capture: true });

function closeAllModals() {
  activeTalkingNpc = null;
  ['authModal', 'confirmModal', 'characterModal', 'infoModal', 'npcModal', 'missionsModal'].forEach(id => {
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

  if (event.ctrlKey && (event.key === '+' || event.key === '=' || event.key === '-' || event.code === 'NumpadAdd' || event.code === 'NumpadSubtract')) {
    event.preventDefault();
    changeZoomByStep((event.key === '-' || event.code === 'NumpadSubtract') ? -1 : 1);
    return;
  }

  if (event.key === 'Escape') {
    closeAllModals();

    if (selectedTile || selectedIds.size || eraser) {
      selectedTile = null;
      selectedIds.clear();
      eraser = false;
      document.querySelectorAll('.tile').forEach(item => item.classList.remove('active'));
      updateSelectedPreview();
      updateToolButtons();
      showToast('تم إلغاء تحديد العنصر');
      return;
    }

    if (activeCategory) {
      activeCategory = '';
      document.querySelectorAll('.categoryBtn').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.tile').forEach(item => item.classList.remove('active'));
      const tileset = document.getElementById('tileset');
      if (tileset) {
        tileset.innerHTML = '';
        tileset.classList.add('hidden');
      }
      showToast('تم إلغاء القسم');
      return;
    }

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
    touchStartPoint = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    touchMoved = false;
    longPressGhost = false;

    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      if (!selectedTile || touchMoved || walkMode) return;
      const rect = canvas.getBoundingClientRect();
      mouseWorldPos = screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top);
      longPressGhost = true;
    }, 350);
  }

  if (event.touches.length === 2) {
    clearTimeout(longPressTimer);
    longPressGhost = false;

    pinchStartDistance = touchDistance(event.touches[0], event.touches[1]);
    pinchStartZoom = zoom;

    const rect = canvas.getBoundingClientRect();
    const cx = (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left;
    const cy = (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top;

    pinchCenterScreen = { x: cx, y: cy };
    pinchCenterWorld = screenToWorld(cx, cy);
  }
}, { passive: false });

canvas.addEventListener('touchmove', event => {
  if (walkMode) return;

  if (event.touches.length === 2 && pinchStartDistance > 0 && pinchCenterWorld && pinchCenterScreen) {
    const distance = touchDistance(event.touches[0], event.touches[1]);
    zoom = clampZoomValue(pinchStartZoom * (distance / pinchStartDistance));

    camX = pinchCenterWorld.x - pinchCenterScreen.x / zoom;
    camY = pinchCenterWorld.y - pinchCenterScreen.y / zoom;

    clampCam();
    event.preventDefault();
    return;
  }

  if (event.touches.length === 1 && touchPanLast) {
    const touch = event.touches[0];
    const dx = touch.clientX - touchPanLast.x;
    const dy = touch.clientY - touchPanLast.y;

    if (Math.hypot(dx, dy) > 3) touchMoved = true;

    const rect = canvas.getBoundingClientRect();
    mouseWorldPos = screenToWorld(touch.clientX - rect.left, touch.clientY - rect.top);

    if (mobileCameraLocked) {
      // تثبيت الكاميرا يمنع تحريك الخريطة بالكامل، ومع وجود عنصر محدد يحرك العنصر فقط
      if (selectedIds.size) moveSelected(dx / zoom, dy / zoom);
    } else if (longPressGhost && selectedTile) {
      // تحريك المعاينة الشفافة فقط
    } else {
      camX -= dx / zoom;
      camY -= dy / zoom;
      clampCam();
    }

    touchPanLast = { x: touch.clientX, y: touch.clientY };
    event.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('touchend', event => {
  clearTimeout(longPressTimer);

  const wasTap = touchStartPoint && !touchMoved && Date.now() - touchStartPoint.time < 350;

  if (!walkMode && selectedTile && touchStartPoint && (wasTap || longPressGhost)) {
    const rect = canvas.getBoundingClientRect();
    const worldPos = screenToWorld(touchStartPoint.x - rect.left, touchStartPoint.y - rect.top);

    pushUndo();
    paintAt(worldPos.x, worldPos.y);
  }

  touchPanLast = null;
  touchStartPoint = null;
  touchMoved = false;
  longPressGhost = false;
  pinchStartDistance = 0;
  pinchCenterWorld = null;
  pinchCenterScreen = null;
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

  const selectedItems = getItems().filter(item => selectedIds.has(item.uid));
  const owner = currentOwner();

  if (selectedItems.length && selectedItems.some(item => item.owner !== owner)) {
    showToast('التعديل ممنوع داخل مكان لاعب آخر');
    return;
  }

  pushUndo();

  const changedCells = new Set();
  let deletedCount = 0;

  for (const cellKey in world) {
    const cell = world[cellKey];
    if (!cell || !Array.isArray(cell.items)) continue;

    const before = cell.items.length;
    cell.items = cell.items.filter(item => !(selectedIds.has(item.uid) && item.owner === owner));
    deletedCount += before - cell.items.length;

    if (cell.items.length !== before) changedCells.add(cellKey);
    if (!cell.items.length) delete world[cellKey];
  }

  if (!deletedCount) {
    showToast('لا يوجد عنصر تملكه للحذف');
    return;
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
      if (!cell || !Array.isArray(cell.items)) continue;

      const before = cell.items.length;
      cell.items = cell.items.filter(item => item.owner !== owner);

      if (cell.items.length !== before) changedCells.add(cellKey);
      if (!cell.items.length && cell.owner === owner) delete world[cellKey];
    }

    selectedIds.clear();
    saveLocalWorld();

    changedCells.forEach(cellKey => {
      if (world[cellKey]) saveCellToFirebase(cellKey);
      else removeCellFromFirebase(cellKey);
    });

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
    `<div class="shortcutsList">
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-rotate-left"></i></span><span><b>Ctrl + Z</b> : استعادة آخر تعديل.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-trash"></i></span><span><b>Delete</b> : حذف العنصر المحدد.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-copy"></i></span><span><b>Ctrl + C</b> : نسخ العنصر المحدد.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-paste"></i></span><span><b>Ctrl + V</b> : لصق العنصر.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-layer-group"></i></span><span><b>1 إلى 5</b> : تغيير الطبقة.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-plus-minus"></i></span><span><b>+ و -</b> : تكبير وتصغير العنصر فقط.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-hand"></i></span><span><b>Alt + سحب</b> : تحريك الخريطة.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-magnifying-glass"></i></span><span><b>Ctrl + عجلة الماوس</b> : تكبير وتصغير الشاشة.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-arrows-up-down-left-right"></i></span><span><b>الأسهم</b> : تحريك العنصر المحدد.</span></div>
      <div class="shortcutRow"><span class="shortcutIcon"><i class="fa-solid fa-xmark"></i></span><span><b>ESC</b> : إلغاء التحديد أو إغلاق النوافذ.</span></div>
    </div>`,
    true
  );
}

function showSettingsHelp() {
  showInfo(
    'شرح الإعدادات',
    `<div class="helpList">
      <div class="helpRow"><span class="helpIcon walkHelp"><i class="fa-solid fa-person-walking"></i></span><span><b>تجول</b>: يدخل وضع التجول بالشخصية داخل العالم.</span></div>
      <div class="helpRow"><span class="helpIcon characterHelp"><i class="fa-solid fa-user-pen"></i></span><span><b>تغيير الشخصية</b>: يفتح نافذة اختيار الشخصية.</span></div>
      <div class="helpRow"><span class="helpIcon homeHelp"><i class="fa-solid fa-house"></i></span><span><b>العودة للمنزل</b>: يرجعك لمكان المنزل المحفوظ.</span></div>
      <div class="helpRow"><span class="helpIcon homeHelp"><i class="fa-solid fa-location-crosshairs"></i></span><span><b>تحديد جديد</b>: يحفظ مكان الكاميرا الحالي كمنزل جديد.</span></div>
      <div class="helpRow"><span class="helpIcon previewHelp"><i class="fa-solid fa-eye"></i></span><span><b>تكبير العناصر</b>: يعرض معاينة كبيرة عند المرور على عنصر.</span></div>
      <div class="helpRow"><span class="helpIcon autoAlignHelp"><i class="fa-solid fa-border-all"></i></span><span><b>الترتيب التلقائي</b>: يساعد في محاذاة العناصر بجانب بعض بقوة أكبر.</span></div>
      <div class="helpRow"><span class="helpIcon eraseHelp"><i class="fa-solid fa-eraser"></i></span><span><b>ممحاة</b>: تحذف العنصر الذي تضغط عليه.</span></div>
      <div class="helpRow"><span class="helpIcon undoHelp"><i class="fa-solid fa-rotate-left"></i></span><span><b>استعادة</b>: يرجع آخر تعديل.</span></div>
      <div class="helpRow"><span class="helpIcon blockHelp"><i class="fa-solid fa-ban"></i></span><span><b>عائق</b>: يجعل العنصر يمنع مرور الشخصية.</span></div>
      <div class="helpRow"><span class="helpIcon flipHelp"><i class="fa-solid fa-left-right"></i></span><span><b>يمين/يسار</b>: يعكس العنصر أفقيًا.</span></div>
      <div class="helpRow"><span class="helpIcon flipYHelp"><i class="fa-solid fa-up-down"></i></span><span><b>فوق/تحت</b>: يعكس العنصر عموديًا.</span></div>
      <div class="helpRow"><span class="helpIcon deleteHelp"><i class="fa-solid fa-trash"></i></span><span><b>حذف المحدد</b>: يحذف العنصر المحدد فقط.</span></div>
      <div class="helpRow"><span class="helpIcon deleteHelp"><i class="fa-solid fa-trash-can"></i></span><span><b>حذف جميع عناصري</b>: يحذف العناصر التي تملكها فقط.</span></div>
      <div class="helpRow"><span class="helpIcon flipHelp"><i class="fa-solid fa-lock"></i></span><span><b>تثبيت الكاميرا</b>: في الجوال يجعل السحب يحرك العنصر المحدد بدل الكاميرا.</span></div>
    </div>`,
    true
  );
}

/* ===== Profile / Auth ===== */

function saveDisplayName() {
  const input = document.getElementById('displayNameInput');

  displayName = cleanPlayerName(input?.value, 20);

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
    displayName: cleanPlayerName(displayName, 20) || '',
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
      displayName = cleanPlayerName(data.displayName, 20);
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
    loadGameStateFromFirebase();
    loadCollectedMoneyFromFirebase();
    listenHouseData();
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
  const username = cleanUsername(document.getElementById('signupUsernameInput')?.value);
  const pass = document.getElementById('signupPassInput')?.value;
  const nameInput = document.getElementById('signupDisplayNameInput');

  if (!isValidUsername(username)) return showAuthMessage('اسم المستخدم يجب أن يكون إنجليزي 3-20 حرف أو رقم أو _');
  if (!pass || pass.length < 6) return showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف أو أكثر');

  const email = usernameToEmail(username);
  displayName = cleanPlayerName(nameInput?.value || username, 20);
  localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  localStorage.setItem(LAST_EMAIL_KEY, username);

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
  const username = cleanUsername(document.getElementById('authUsernameInput')?.value);
  const pass = document.getElementById('authPassInput')?.value;

  if (!isValidUsername(username)) return showAuthMessage('اكتب اسم المستخدم الإنجليزي بشكل صحيح');
  if (!pass) return showAuthMessage('اكتب كلمة المرور');

  localStorage.setItem(LAST_EMAIL_KEY, username);

  window.signInWithEmailAndPassword(window.auth, usernameToEmail(username), pass).then(() => {
    showAuthMessage('تم تسجيل الدخول');
    closeAuthModal();
    updateAuthUI();
    loadProfileData();
    loadGameStateFromFirebase();
    loadCollectedMoneyFromFirebase();
    listenHouseData();
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

  if (!email) return showAuthMessage('اكتب الإيميل الحقيقي المربوط بحسابك');
  if (email.endsWith('@gamenjd.local')) return showAuthMessage('لن تصلك رسالة إذا لم تربط حسابك بإيميل حقيقي');

  window.sendPasswordResetEmail(window.auth, email).then(() => {
    showAuthMessage('تم إرسال رابط استعادة كلمة المرور إذا كان الإيميل مربوطًا بحسابك');
  }).catch(error => {
    showAuthMessage(authErrorMessage(error));
  });
}

function authErrorMessage(error) {
  const code = error?.code || '';

  if (code.includes('email-already-in-use')) return 'اسم المستخدم مستخدم مسبقًا، جرّب تسجيل الدخول';
  if (code.includes('invalid-email')) return 'اسم المستخدم غير صحيح';
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
    zoom = clampZoomValue(WALK_BASE_ZOOM);
    selectedIds.clear();
    clearPaintState();

    const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
    player.x = Math.max(18, Math.min(WORLD_COLS * CELL - 18, center.x));
    player.y = Math.max(28, Math.min(WORLD_ROWS * CELL - 8, center.y));

    document.body.classList.add('walking');
    panel?.classList.add('closed');
    subscribeNearbyWorldCells(true);

    showCharacterModal(false);
  } else {
    npcs.forEach(npc => { npc.chasing = false; npc.moving = false; pickNpcTarget(npc); });
    zoom = clampZoomValue(previousBuildZoom || BASE_ZOOM);
    document.body.classList.remove('walking');
    panel?.classList.remove('closed');
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
  const roundedX = Math.round(player.x);
  const roundedY = Math.round(player.y);

  if (Number.isFinite(MAX_PLAYER_JUMP) && lastSafePlayerPosition) {
    const dx = Math.abs(roundedX - lastSafePlayerPosition.x);
    const dy = Math.abs(roundedY - lastSafePlayerPosition.y);
    if (dx > MAX_PLAYER_JUMP || dy > MAX_PLAYER_JUMP) {
      player.x = lastSafePlayerPosition.x;
      player.y = lastSafePlayerPosition.y;
      showToast('تم منع حركة غير طبيعية');
      return;
    }
  }

  lastSafePlayerPosition = { x: roundedX, y: roundedY };

  window.set(window.ref(window.db, 'players/' + user.uid), {
    id: user.uid,
    name: cleanPlayerName(displayName || emailToUsername(user.email) || 'لاعب', 40),
    x: roundedX,
    y: roundedY,
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
  try {
    updateGameTimers();
    updateNpcs();
    collectNearbyMoney();
    movePlayer();

    if (isLoggedIn() && Date.now() - lastPlayerSave > 700) {
      if (walkMode) savePlayerToFirebase();
      if (Date.now() - lastWorldNpcsSave > 1200) {
        saveWorldNpcsToFirebase();
        lastWorldNpcsSave = Date.now();
      }
      subscribeNearbyWorldCells();
      saveLastPlayer();
      lastPlayerSave = Date.now();
    }
  } catch (error) {
    console.error('gameLoop error:', error);
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

    if (currentUserEmail) localStorage.setItem(LAST_EMAIL_KEY, emailToUsername(currentUserEmail));

    if (currentUser) {
      gameState.lastHungerAt = Date.now();
      gameState.lastHealthAt = Date.now();
      saveGameState(true);
      lastSafePlayerPosition = { x: Math.round(player.x), y: Math.round(player.y) };
      loadProfileData();
      loadGameStateFromFirebase();
      loadCollectedMoneyFromFirebase();
      listenHouseData();
    } else {
      if (walkMode) toggleWalk();
    }

    updateAuthUI();
    updateInfoPanel();
  });

  listenWorldFromFirebase();
  listenPlayersFromFirebase();
  listenWorldNpcsFromFirebase();
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
