'use strict';
// GameNjd v20.1

// تم إلغاء الحفظ المحلي داخل كود اللعبة، والاعتماد على Firebase فقط.
const __memoryStore = {};
const offlineStore = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(__memoryStore, key) ? __memoryStore[key] : null; },
  setItem(key, value) { __memoryStore[key] = String(value); },
  removeItem(key) { delete __memoryStore[key]; }
};

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const panel = document.getElementById('panel');
const toast = document.getElementById('toast');

const WORLD_COLS = 20;
const WORLD_ROWS = 20;
const CELL = 500;
const MINI = 10;

const VERSION = '20.1';
const KEY_PREFIX = 'GameNjd_v' + VERSION.replace(/\D/g, '');

function storageKey(name) {
  return `${KEY_PREFIX}_${name}`;
}

function migrateStorageKey(oldKey, newKey) {
  try {
    if (offlineStore.getItem(newKey) === null && offlineStore.getItem(oldKey) !== null) {
      offlineStore.setItem(newKey, offlineStore.getItem(oldKey));
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
  ['GameNjd_v201_world', SAVE_KEY],
  ['GameNjd_v201_character', CHARACTER_KEY],
  ['GameNjd_v201_display_name', DISPLAY_NAME_KEY],
  ['GameNjd_v201_last_email', LAST_EMAIL_KEY],
  ['GameNjd_v201_last_player', LAST_PLAYER_KEY],
  ['GameNjd_v201_home_camera', HOME_KEY],
  ['GameNjd_v201_settings_help_seen', SETTINGS_HELP_SEEN_KEY]
].forEach(pair => migrateStorageKey(pair[0], pair[1]));

const MAX_ITEMS_PER_CELL = 150;
// تم إلغاء منع السفر البعيد حتى لا يمنع الانتقال بين المناطق
const MAX_PLAYER_JUMP = Infinity;
const CHUNK_RADIUS = 3; // نطاق الخلايا القريبة عند الحاجة
const USE_NEARBY_WORLD_LOADING = true; // تحميل الخلايا القريبة فقط لتقليل اللاق
const TILE_IMAGE_EXT = 'png'; // استخدام PNG حتى لا تختفي العناصر القديمة

// عدد خلايا البناء المسموحة حول البيت
const HOME_BUILD_RADIUS_CELLS = 0;
const PLAYER_SAVE_MOVING_MS = 220;
const PLAYER_SAVE_IDLE_MS = 900;
const NPC_STALE_MS = 30000;
const HOME_MOVE_MODE_KEY = storageKey('home_move_mode');


// حدود الزوم: التبعيد محدود، والتقريب واسع
const BASE_ZOOM = 0.30;
const BUILD_BASE_ZOOM = 1.80;
const ZOOM_STEP = 1.10;
const ZOOM_OUT_STEPS = 3;
const WALK_ZOOM_OUT_STEPS = 3;
const WALK_ZOOM_IN_STEPS = 3; // زوم التجول بين 1 و2 تقريبًا
const ZOOM_IN_STEPS = 10;
const WALK_BASE_ZOOM = 1.50;
const MIN_ZOOM = 1.10;
const MAX_ZOOM = 2.80;
const WALK_MIN_ZOOM = 1.40;
const WALK_MAX_ZOOM = 2.00;

// أوقات النقصان والزيادة
const HUNGER_DECAY_MS = 10 * 60 * 1000; // الجوع ينقص 1% كل 10 دقائق
const HEALTH_DECAY_MS = 20 * 60 * 1000; // الصحة تنقص 1% كل 20 دقيقة
const LEVEL_POINT_MS = 60 * 1000; // نقطة لفل كل دقيقة
const POINTS_PER_RIYAL = 10; // كل 10 نقاط = 1 ريال

const CHARACTER_BASE = 'Characters';
const ASSET_BASE = 'All-Pic/tiles';

const SPRITE_COLS = 4;
const SPRITE_ROWS = 4;
const PLAYER_DRAW_W = 70;
const PLAYER_DRAW_H = 70;














// بيانات العناصر الثابتة في الخريطة موجودة في map-data.js

const SIZE_DATA = {
  Big: { label: 'كبير', w: 160, h: 160 },
  Medium: { label: 'متوسط', w: 95, h: 95 },
  Small: { label: 'صغير', w: 55, h: 55 },
  Precise: { label: 'دقيق', w: 30, h: 30 }
};

const tileGroups = [
  { key: 'bag', name: 'أكياس', folder: 'Bag', prefix: 'Bag', count: 10, w: 27, h: 27, blocking: false },
  { key: 'lighting', name: 'إنارات', folder: 'Lighting', prefix: 'Lighting', count: 10, w: 25, h: 32, blocking: false },
  { key: 'door', name: 'باب', folder: 'Door', prefix: 'Door', count: 11, w: 35, h: 42, blocking: true },
  { key: 'coffee_pot', name: 'دلة', folder: 'teapot', prefix: 'teapot', count: 18, w: 25, h: 25, blocking: false },
  { key: 'cabinet', name: 'دولاب', folder: 'Cabinet', prefix: 'Cabinet', count: 16, w: 42, h: 42, blocking: false },
  { key: 'decor', name: 'ديكورات', folder: 'Decor', prefix: 'Decor', count: 74, w: 25, h: 25, blocking: false },
  { key: 'carpet', name: 'زولية', folder: 'Carpet', prefix: 'Carpet', count: 13, w: 52, h: 42, blocking: false },
  { key: 'curtain', name: 'ستارة', folder: 'Curtain', prefix: 'Curtain', count: 14, w: 35, h: 42, blocking: false },
  { key: 'bed', name: 'سرير', folder: 'Bed', prefix: 'Bed', count: 5, w: 52, h: 38, blocking: false },
  { key: 'plant', name: 'شجرة', folder: 'Plant', prefix: 'Plant', count: 106, w: 28, h: 28, blocking: false },
  { key: 'bedsheet', name: 'شرشف', folder: 'Bedsheet', prefix: 'Bedsheet', count: 24, w: 45, h: 35, blocking: false },
  { key: 'plate', name: 'صحن', folder: 'Plate', prefix: 'Plate', count: 83, w: 23, h: 23, blocking: false },
  { key: 'box', name: 'صندوق', folder: 'Box', prefix: 'Box', count: 8, w: 28, h: 28, blocking: false },
  { key: 'table', name: 'طاولة', folder: 'Table', prefix: 'Table', count: 49, w: 42, h: 32, blocking: false },
  { key: 'pottery', name: 'فخار', folder: 'Pottery', prefix: 'Pottery', count: 25, w: 27, h: 27, blocking: false },
  { key: 'cooking_pot', name: 'قدر', folder: 'Pot', prefix: 'Pot', count: 12, w: 27, h: 27, blocking: false },
  { key: 'chair', name: 'كرسي', folder: 'Chair', prefix: 'Chair', count: 15, w: 33, h: 33, blocking: false },
  { key: 'cup', name: 'كوب', folder: 'Cup', prefix: 'Cup', count: 18, w: 20, h: 20, blocking: false },
  { key: 'painting', name: 'لوحة', folder: 'Painting', prefix: 'Painting', count: 20, w: 32, h: 27, blocking: false },
  { key: 'pillow', name: 'مخدة', folder: 'Pillow', prefix: 'Pillow', count: 41, w: 25, h: 20, blocking: false },
  { key: 'floor_mattress', name: 'مرتبة', folder: 'Mattress', prefix: 'Mattress', count: 12, w: 45, h: 35, blocking: false },
  { key: 'window', name: 'نافذة', folder: 'Window', prefix: 'Window', count: 15, w: 33, h: 33, blocking: false },
  { key: 'floor', name: 'ارضيات', folder: 'Floof', prefix: 'Floof', count: 86, w: 77, h: 77, blocking: false },
  { key: 'wall', name: 'جدران', folder: 'Wall', prefix: 'Wall', count: 27, w: 57, h: 57, blocking: true }
];

let zoom = BASE_ZOOM;
let camX = 0;
let camY = 0;
let gridOpacity = 0.45;

let selectedTile = null;
let activeCategory = '';
let activeLayer = 1;
let eraser = false;
let blockingMode = false;
let flipMode = false;
let flipYMode = false;
let autoAlignMode = false;
let itemScale = 0.60;
const ITEM_SCALE_MIN = 0.10;
const ITEM_SCALE_MAX = 2.00;
const ITEM_SCALE_STEP = 0.09;

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
let displayName = offlineStore.getItem(DISPLAY_NAME_KEY) || '';
let myCharacterId = offlineStore.getItem(CHARACTER_KEY) || '';
let onlinePlayers = {};
let onlinePlayerSmooth = {};
let cellOwners = {};
let homeMoveMode = offlineStore.getItem(HOME_MOVE_MODE_KEY) === '1';
let homeHighlight = null;
let world = loadWorld();
let player = loadLastPlayer();

let previousBuildZoom = zoom;
let playerMoving = false;
let didInitialCenter = false;
let lastUiUpdate = 0;
let lastSavedSnapshot = '';
let worldListeners = {};
let playersListenerOff = null;
let worldNpcsListenerOff = null;
let cellOwnersListenerOff = null;
let houseProfilesListenerOff = null;
let houseRatingsListenerOff = null;
let lastSubscribedCenterCell = '';
let lastSafePlayerPosition = null;
let houseProfiles = {};
let houseRatings = {};
let lastNearbyNpc = null;
let activeTalkingNpc = null;
const BAG_KEY = storageKey('bag_items');
let bagItems = loadBagItems();
let lastBagRenderSnapshot = '';
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
  const min = walkMode ? WALK_MIN_ZOOM : MIN_ZOOM;
  const max = walkMode ? WALK_MAX_ZOOM : MAX_ZOOM;
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
    const saved = JSON.parse(offlineStore.getItem(GAME_STATE_KEY) || '{}');
    return {
      health: clampNumber(saved.health, 0, 100, 100),
      hunger: clampNumber(saved.hunger, 0, 100, 100),
      levelPoints: Math.max(0, Math.floor(Number(saved.levelPoints) || 0)),
      money: Math.max(0, Math.floor(Number(saved.money) || 0)),
      lastHungerAt: Number(saved.lastHungerAt) || now,
      lastHealthAt: Number(saved.lastHealthAt) || now,
      lastLevelAt: Number(saved.lastLevelAt) || now,
      visitedCells: Array.isArray(saved.visitedCells) ? saved.visitedCells.filter(Boolean).slice(-50) : [],
      quests: saved.quests && typeof saved.quests === 'object' ? saved.quests : {}
    };
  } catch {
    return { health: 100, hunger: 100, levelPoints: 0, money: 0, lastHungerAt: now, lastHealthAt: now, lastLevelAt: now, visitedCells: [], quests: {} };
  }
}

let gameState = loadGameState();
let gameStateFirebaseReady = false;
let lastGameStateSnapshot = '';

function normalizeGameState(data = {}) {
  const base = loadGameState();
  const now = Date.now();
  return {
    health: clampNumber(data.health ?? base.health, 0, 100, 100),
    hunger: clampNumber(data.hunger ?? base.hunger, 0, 100, 100),
    levelPoints: Math.max(0, Math.floor(Number(data.levelPoints ?? base.levelPoints) || 0)),
    money: Math.max(0, Math.floor(Number(data.money ?? base.money) || 0)),
    lastHungerAt: Number(data.lastHungerAt) || now,
    lastHealthAt: Number(data.lastHealthAt) || now,
    lastLevelAt: Number(data.lastLevelAt) || now,
    visitedCells: Array.isArray(data.visitedCells) ? data.visitedCells.filter(Boolean).slice(-50) : (base.visitedCells || []),
    quests: data.quests && typeof data.quests === 'object' ? data.quests : (base.quests || {}),
    updatedAt: Number(data.updatedAt) || Date.now()
  };
}

function saveGameState(localOnly = false) {
  gameState.updatedAt = Date.now();
  offlineStore.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
  if (localOnly || !isLoggedIn() || !window.db || !window.ref || !window.set) return;
  if (!gameStateFirebaseReady) return; // لا نكتب الحالة الافتراضية فوق بيانات قديمة قبل انتهاء التحميل
  const user = window.auth.currentUser;
  const snapshot = JSON.stringify({
    health: gameState.health,
    hunger: gameState.hunger,
    levelPoints: gameState.levelPoints,
    money: gameState.money,
    visitedCells: gameState.visitedCells,
    quests: gameState.quests,
    lastHungerAt: gameState.lastHungerAt,
    lastHealthAt: gameState.lastHealthAt,
    lastLevelAt: gameState.lastLevelAt
  });
  if (snapshot === lastGameStateSnapshot) return;
  lastGameStateSnapshot = snapshot;
  window.set(window.ref(window.db, 'inventory/' + user.uid + '/gameState'), gameState).catch(error => {
    lastGameStateSnapshot = '';
    console.error(error);
  });
}

function loadGameStateFromFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.get) return;
  const user = window.auth.currentUser;
  gameStateFirebaseReady = false;
  window.get(window.ref(window.db, 'inventory/' + user.uid + '/gameState')).then(snapshot => {
    const data = snapshot.val();
    gameState = normalizeGameState(data || gameState);
    const now = Date.now();
    gameState.lastHungerAt = Number(gameState.lastHungerAt) || now;
    gameState.lastHealthAt = Number(gameState.lastHealthAt) || now;
    gameState.lastLevelAt = Number(gameState.lastLevelAt) || now;
    gameStateFirebaseReady = true;
    saveGameState(true);
    if (!data) saveGameState();
    updateStatsPanel();
  }).catch(error => {
    console.error(error);
    gameStateFirebaseReady = true;
  });
}

function handleEmptyBars() {
  let changed = false;
  if (gameState.health <= 0) {
    gameState.levelPoints = Math.max(0, Math.floor(gameState.levelPoints * 0.5));
    gameState.money = Math.max(0, gameState.money - 5);
    gameState.health = 30;
    showToast('انتهت الصحة: تم خصم عقوبة ورجعت إلى 30%');
    changed = true;
  }
  if (gameState.hunger <= 0) {
    gameState.levelPoints = Math.max(0, Math.floor(gameState.levelPoints * 0.5));
    gameState.money = Math.max(0, gameState.money - 5);
    gameState.hunger = 30;
    showToast('انتهى الجوع: تم خصم عقوبة ورجع إلى 30%');
    changed = true;
  }
  if (changed) saveGameState();
}

function updateGameTimers() {
  if (!isLoggedIn()) return;
  const now = Date.now();

  // نقص الجوع كل 10 دقائق
  while (now - gameState.lastHungerAt >= HUNGER_DECAY_MS) {
    gameState.hunger = Math.max(0, gameState.hunger - 1);
    gameState.lastHungerAt += HUNGER_DECAY_MS;
  }

  // نقص الصحة كل 20 دقيقة
  while (now - gameState.lastHealthAt >= HEALTH_DECAY_MS) {
    gameState.health = Math.max(0, gameState.health - 1);
    gameState.lastHealthAt += HEALTH_DECAY_MS;
  }

  // زيادة نقاط المستوى كل دقيقة، وكل 10 نقاط تعطي ريال
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
  // الحقيبة لا تتحدث مع كل فريم حتى لا تضيع ضغطات اللاعب
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
  try { return JSON.parse(offlineStore.getItem(HOME_KEY) || 'null'); } catch { return null; }
}

function currentCenterCell() {
  const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
  return cellFromWorld(center.x, center.y);
}

function cameraForCell(cellKey, z = zoom) {
  const cell = parseCell(cellKey);
  if (!cell) return { camX, camY, zoom: z };
  const safeZoom = clampZoomValue(Number(z) || zoom || BASE_ZOOM);
  const centerX = (cell.col - 0.5) * CELL;
  const centerY = (cell.row - 0.5) * CELL;
  return {
    camX: centerX - canvas.clientWidth / safeZoom / 2,
    camY: centerY - canvas.clientHeight / safeZoom / 2,
    zoom: safeZoom
  };
}

function centerCameraOnCell(cellKey, z = zoom) {
  const data = cameraForCell(cellKey, z);
  camX = data.camX;
  camY = data.camY;
  zoom = data.zoom;
  clampCam();
  subscribeNearbyWorldCells(true);
}

function saveHomeDataLocal(data) {
  if (!data || !data.cell) return;
  const cellKey = String(data.cell);
  const camera = cameraForCell(cellKey, Number(data.zoom) || zoom || BUILD_BASE_ZOOM);
  const safe = {
    cell: cellKey,
    camX: camera.camX,
    camY: camera.camY,
    zoom: camera.zoom,
    updatedAt: Number(data.updatedAt) || Date.now()
  };
  offlineStore.setItem(HOME_KEY, JSON.stringify(safe));
}

function saveHomeToFirebase(data) {
  if (!isLoggedIn() || !data?.cell || !window.db || !window.ref || !window.set) return Promise.resolve();
  const user = window.auth.currentUser;
  const cellKey = String(data.cell);
  const camera = cameraForCell(cellKey, Number(data.zoom) || zoom || BUILD_BASE_ZOOM);
  const safe = {
    uid: user.uid,
    cell: cellKey,
    camX: camera.camX,
    camY: camera.camY,
    zoom: camera.zoom,
    updatedAt: Date.now()
  };
  return window.set(window.ref(window.db, 'homes/' + user.uid), safe)
    .then(() => reserveCellOwner(safe.cell));
}

function reserveCellOwner(cellKey) {
  if (!isLoggedIn() || !cellKey || !window.db || !window.ref || !window.set) return Promise.resolve();
  cellOwners[cellKey] = currentOwner();
  return window.set(window.ref(window.db, 'cellOwners/' + cellKey), currentOwner()).catch(error => {
    console.error('cell owner save error:', error);
    showToast('فشل حفظ ملكية الخلية');
  });
}

function releaseCellOwner(cellKey) {
  if (!isLoggedIn() || !cellKey || !window.db || !window.ref || !window.remove) return Promise.resolve();
  if (cellOwners[cellKey] === currentOwner()) delete cellOwners[cellKey];
  return window.remove(window.ref(window.db, 'cellOwners/' + cellKey)).catch(error => {
    console.error('cell owner remove error:', error);
  });
}

function loadHomeFromFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.get) return;
  const user = window.auth.currentUser;
  window.get(window.ref(window.db, 'homes/' + user.uid)).then(snapshot => {
    const data = snapshot.val();
    if (data && data.cell) {
      saveHomeDataLocal(data);
      reserveCellOwner(data.cell);
      if (!walkMode) centerCameraOnCell(data.cell, Number(data.zoom) || BUILD_BASE_ZOOM);
    }
    updateHomeButton();
    updateHomeCellText();
    subscribeNearbyWorldCells(true);
  }).catch(error => console.error('home load error:', error));
}

function setHomeMoveMode(value) {
  homeMoveMode = !!value;
  if (homeMoveMode) offlineStore.setItem(HOME_MOVE_MODE_KEY, '1');
  else offlineStore.removeItem(HOME_MOVE_MODE_KEY);
  updateHomeButton();
}

function flashHomeCell(cellKey, color = '#22c55e') {
  if (!cellKey) return;
  homeHighlight = { cellKey, color, start: Date.now(), until: Date.now() + 3000 };
}

function drawHomeHighlight() {
  if (!homeHighlight || Date.now() > homeHighlight.until) return;
  const cell = parseCell(homeHighlight.cellKey);
  if (!cell) return;
  const age = Date.now() - homeHighlight.start;
  const alpha = Math.max(0, 1 - age / 3000);
  const x = (cell.col - 1) * CELL;
  const y = (cell.row - 1) * CELL;
  const p = worldToScreen(x, y);
  const size = CELL * zoom;
  ctx.save();
  ctx.strokeStyle = `rgba(34,197,94,${0.9 * alpha})`;
  ctx.fillStyle = `rgba(34,197,94,${0.08 * alpha})`;
  ctx.lineWidth = Math.max(2, 5 * zoom);
  ctx.fillRect(p.x, p.y, size, size);
  ctx.strokeRect(p.x, p.y, size, size);
  ctx.restore();
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
      showToast('البناء مسموح داخل خلية بيتك فقط');
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
  const name = cleanHouseName(document.getElementById('houseNameInput')?.value || offlineStore.getItem(HOUSE_NAME_KEY) || '', 30);
  if (!name) return showToast('اكتب اسم بيتك أولًا');
  offlineStore.setItem(HOUSE_NAME_KEY, name);
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
  if (houseProfilesListenerOff || houseRatingsListenerOff) return;

  houseProfilesListenerOff = window.onValue(window.ref(window.db, 'houseProfiles'), snapshot => {
    houseProfiles = snapshot.val() || {};
    updateHousePanel();
  }, error => console.error('houseProfiles listen error:', error));

  houseRatingsListenerOff = window.onValue(window.ref(window.db, 'houseRatings'), snapshot => {
    houseRatings = snapshot.val() || {};
    updateHousePanel();
  }, error => console.error('houseRatings listen error:', error));
}

function stopHouseDataListeners() {
  try { if (typeof houseProfilesListenerOff === 'function') houseProfilesListenerOff(); } catch {}
  try { if (typeof houseRatingsListenerOff === 'function') houseRatingsListenerOff(); } catch {}
  houseProfilesListenerOff = null;
  houseRatingsListenerOff = null;
  houseProfiles = {};
  houseRatings = {};
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
  if (input && !input.value) input.value = offlineStore.getItem(HOUSE_NAME_KEY) || '';

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



// أماكن NPC ثابتة ومتفرقة داخل الخريطة بعيدًا عن الحواف




// بيانات المتاجر والـ NPC والمهمات موجودة في missions-data.js

const npcImageCache = {};
const npcs = [];

function makeNpc(id, kind, cellKey) {
  const cell = parseCell(cellKey) || { col: 10, row: 10 };
  const baseX = (cell.col - 0.5) * CELL;
  const baseY = (cell.row - 0.5) * CELL;
  return { id, kind, x: baseX, y: baseY, homeX: baseX, homeY: baseY, dir: 'down', moving: false, targetX: baseX, targetY: baseY, lastPick: 0, lastAttack: 0, chasing: false };
}

Object.entries(NPC_STARTS).forEach(([kind, cells]) => {
  cells.forEach((cell, i) => npcs.push(makeNpc(`${kind}_${i+1}`, kind, cell)));
});

const initialNpcPositions = {};
npcs.forEach(npc => { initialNpcPositions[npc.id] = { x: npc.x, y: npc.y, homeX: npc.homeX, homeY: npc.homeY }; });


let worldNpcsListenerStarted = false;
let worldNpcsLoaded = false;
let lastWorldNpcsSave = 0;
let worldNpcControllerUid = '';
let worldNpcControllerUpdatedAt = 0;

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
    controllerUid: getNpcControllerUid() || currentUser?.uid || '',
    updatedAt: Date.now()
  };
}

function applyWorldNpcsData(data) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    seedWorldNpcsToFirebase();
    return;
  }
  const controllerRows = Object.values(data || {}).filter(item => item && typeof item === 'object' && item.controllerUid);
  if (controllerRows.length) {
    controllerRows.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    worldNpcControllerUid = String(controllerRows[0].controllerUid || '');
    worldNpcControllerUpdatedAt = Number(controllerRows[0].updatedAt || 0);
  }

  const ids = new Set(npcs.map(n => n.id));
  const savedIds = Object.keys(data || {});
  const missing = [...ids].some(id => !data[id]);
  const extra = savedIds.some(id => !ids.has(id));
  if (missing || extra) {
    resetNpcsToInitialPositions();
    seedWorldNpcsToFirebase();
    worldNpcsLoaded = true;
    return;
  }

  for (const npc of npcs) {
    const saved = data[npc.id];
    if (!saved || typeof saved !== 'object') continue;
    const initial = initialNpcPositions[npc.id] || { x: npc.x, y: npc.y, homeX: npc.homeX, homeY: npc.homeY };
    const stale = !saved.updatedAt || Date.now() - Number(saved.updatedAt) > NPC_STALE_MS;
    npc.homeX = clampNumber(saved.homeX, CELL, WORLD_COLS * CELL - CELL, initial.homeX);
    npc.homeY = clampNumber(saved.homeY, CELL, WORLD_ROWS * CELL - CELL, initial.homeY);
    const savedX = clampNumber(saved.x, CELL, WORLD_COLS * CELL - CELL, initial.x);
    const savedY = clampNumber(saved.y, CELL, WORLD_ROWS * CELL - CELL, initial.y);
    const savedTargetX = clampNumber(saved.targetX, CELL, WORLD_COLS * CELL - CELL, savedX);
    const savedTargetY = clampNumber(saved.targetY, CELL, WORLD_ROWS * CELL - CELL, savedY);
    npc.dir = ['up', 'down', 'left', 'right'].includes(saved.dir) ? saved.dir : npc.dir;
    npc.chasing = !!saved.chasing;
    npc.targetPlayer = typeof saved.targetPlayer === 'string' ? saved.targetPlayer : '';
    const homeCell = cellFromWorld(npc.homeX, npc.homeY);
    const savedCell = cellFromWorld(savedX, savedY);
    if (stale || !homeCell || !savedCell || homeCell.key !== savedCell.key) {
      npc.x = initial.x; npc.y = initial.y; npc.homeX = initial.homeX; npc.homeY = initial.homeY;
      npc.targetX = initial.x; npc.targetY = initial.y; npc.syncTargetX = initial.x; npc.syncTargetY = initial.y;
      npc.moving = false; npc.chasing = false; npc.targetPlayer = '';
      continue;
    }
    if (isNpcController()) {
      npc.x = savedX;
      npc.y = savedY;
      npc.targetX = savedTargetX;
      npc.targetY = savedTargetY;
      npc.moving = !!saved.moving;
    } else {
      if (!npc.__syncReady) {
        npc.x = savedX;
        npc.y = savedY;
        npc.__syncReady = true;
      }
      npc.syncTargetX = savedX;
      npc.syncTargetY = savedY;
      npc.targetX = savedTargetX;
      npc.targetY = savedTargetY;
      npc.moving = !!saved.moving || Math.hypot((npc.syncTargetX || npc.x) - npc.x, (npc.syncTargetY || npc.y) - npc.y) > 2;
    }
    clampNpcToHomeCell(npc);
  }
  if (hasBadNpcCluster()) {
    resetNpcsToInitialPositions();
    seedWorldNpcsToFirebase();
  }
  worldNpcsLoaded = true;
}


function resetNpcsToInitialPositions() {
  for (const npc of npcs) {
    const pos = initialNpcPositions[npc.id];
    if (!pos) continue;
    npc.x = pos.x;
    npc.y = pos.y;
    npc.homeX = pos.homeX;
    npc.homeY = pos.homeY;
    npc.targetX = pos.x;
    npc.targetY = pos.y;
    npc.moving = false;
    npc.chasing = false;
    npc.targetPlayer = '';
    npc.__syncReady = false;
    npc.syncTargetX = pos.x;
    npc.syncTargetY = pos.y;
  }
}

function hasBadNpcCluster() {
  const counts = {};
  for (const npc of npcs) {
    const cell = cellFromWorld(npc.x, npc.y);
    if (!cell) return true;
    counts[cell.key] = (counts[cell.key] || 0) + 1;
    if (counts[cell.key] >= 5) return true;
  }
  return false;
}

function getNpcControllerUid() {
  if (worldNpcControllerUid && Date.now() - worldNpcControllerUpdatedAt < NPC_STALE_MS) {
    return worldNpcControllerUid;
  }

  const ids = Object.keys(onlinePlayers || {}).filter(Boolean);
  if (currentUser?.uid && !ids.includes(currentUser.uid)) ids.push(currentUser.uid);
  ids.sort();
  return ids[0] || '';
}

function isNpcController() {
  return !!(currentUser?.uid && currentUser.uid === getNpcControllerUid());
}

function seedWorldNpcsToFirebase() {
  if (!isLoggedIn() || !isNpcController() || !window.db || !window.ref || !window.set) return;
  Promise.all(npcs.map(npc => window.set(window.ref(window.db, 'worldNpcs/' + npc.id), npcToFirebaseData(npc))))
    .catch(error => console.error('worldNpcs seed error:', error));
}

function saveWorldNpcsToFirebase(force = false) {
  if (!force && !isNpcController()) return;
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;
  Promise.all(npcs.map(npc => window.set(window.ref(window.db, 'worldNpcs/' + npc.id), npcToFirebaseData(npc))))
    .catch(error => console.error('worldNpcs save error:', error));
}

function listenWorldNpcsFromFirebase() {
  if (worldNpcsListenerStarted) return;
  if (!window.db || !window.ref || !window.onValue) return;

  worldNpcsListenerStarted = true;
  worldNpcsListenerOff = window.onValue(window.ref(window.db, 'worldNpcs'), snapshot => {
    applyWorldNpcsData(snapshot.val());
  }, error => {
    console.error('worldNpcs listen error:', error);
  });
}

function stopWorldNpcsListener() {
  try { if (typeof worldNpcsListenerOff === 'function') worldNpcsListenerOff(); } catch {}
  worldNpcsListenerOff = null;
  worldNpcsListenerStarted = false;
  worldNpcsLoaded = false;
  worldNpcControllerUid = '';
  worldNpcControllerUpdatedAt = 0;
  resetNpcsToInitialPositions();
}

function getNpcImage(src) {
  if (!npcImageCache[src]) {
    const img = new Image();
    img.onerror = () => { img.__failed = true; };
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

function getNpcHomeBounds(npc) {
  const cell = cellFromWorld(npc.homeX, npc.homeY) || cellFromWorld(npc.x, npc.y) || { col: 10, row: 10 };
  const pad = 42;
  return {
    minX: (cell.col - 1) * CELL + pad,
    maxX: cell.col * CELL - pad,
    minY: (cell.row - 1) * CELL + pad,
    maxY: cell.row * CELL - pad,
    key: cell.key
  };
}

function clampNpcToHomeCell(npc) {
  const b = getNpcHomeBounds(npc);
  npc.x = clampNumber(npc.x, b.minX, b.maxX, npc.homeX);
  npc.y = clampNumber(npc.y, b.minY, b.maxY, npc.homeY);
  npc.targetX = clampNumber(npc.targetX, b.minX, b.maxX, npc.x);
  npc.targetY = clampNumber(npc.targetY, b.minY, b.maxY, npc.y);
}

function pickNpcTarget(npc) {
  const b = getNpcHomeBounds(npc);
  npc.targetX = clampNumber(b.minX + Math.random() * (b.maxX - b.minX), b.minX, b.maxX, npc.homeX);
  npc.targetY = clampNumber(b.minY + Math.random() * (b.maxY - b.minY), b.minY, b.maxY, npc.homeY);
  npc.lastPick = Date.now();
}

function updateNpcs() {
  const now = Date.now();
  const chaseDistance = CELL * 2;
  const stopChaseDistance = CELL * 1;
  const playerSpeed = player.speed || 5;
  const controller = isNpcController() || !isLoggedIn();

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

    if (!controller) {
      const sx = Number(npc.syncTargetX);
      const sy = Number(npc.syncTargetY);
      if (Number.isFinite(sx) && Number.isFinite(sy)) {
        const npcHome = getNpcHomeBounds(npc);
        const dx = sx - npc.x;
        const dy = sy - npc.y;
        const dist = Math.hypot(dx, dy);
        npc.moving = dist > 1.5;
        if (dist > 0.5) {
          const step = Math.min(dist, Math.max(1.2, dist * 0.16));
          npc.x = clampNumber(npc.x + dx / dist * step, npcHome.minX, npcHome.maxX, npc.x);
          npc.y = clampNumber(npc.y + dy / dist * step, npcHome.minY, npcHome.maxY, npc.y);
        }
      }
      continue;
    }

    const config = NPC_CONFIG[npc.kind];
    if (config.fixed) { npc.moving = false; continue; }
    const distToPlayer = Math.hypot(player.x - npc.x, player.y - npc.y);
    const npcHome = getNpcHomeBounds(npc);
    const playerCell = cellFromWorld(player.x, player.y);
    const canChase = walkMode && config.type === 'enemy' && playerCell?.key === npcHome.key && distToPlayer <= chaseDistance;

    if (canChase) {
      npc.chasing = true;
      npc.targetPlayer = currentUser?.uid || '';
    }
    if (!walkMode || distToPlayer > stopChaseDistance) {
      npc.chasing = false;
      npc.targetPlayer = '';
    }

    if (npc.chasing) {
      npc.targetX = clampNumber(player.x, npcHome.minX, npcHome.maxX, npc.x);
      npc.targetY = clampNumber(player.y, npcHome.minY, npcHome.maxY, npc.y);
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
      npc.x = clampNumber(npc.x + nx * speed, npcHome.minX, npcHome.maxX, npc.x);
      npc.y = clampNumber(npc.y + ny * speed, npcHome.minY, npcHome.maxY, npc.y);
      if (Math.abs(nx) > Math.abs(ny)) npc.dir = nx > 0 ? 'right' : 'left';
      else npc.dir = ny > 0 ? 'down' : 'up';
    }

    if (npc.chasing && distToPlayer < 42 && now - npc.lastAttack > 1800) {
      npc.lastAttack = now;
      gameState.health = Math.max(0, gameState.health - 20);
      gameState.hunger = Math.max(0, gameState.hunger - 10);
      gameState.money = Math.max(0, gameState.money - 1);
      handleEmptyBars();
      saveGameState();
      updateStatsPanel();
      showToast('تم الهجوم عليك: نقصت الصحة 20% والجوع 10% والفلوس 1 ريال');
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
  const npcScale = Number(config.scale || 1);
  const drawW = PLAYER_DRAW_W * npcScale * zoom;
  const drawH = PLAYER_DRAW_H * npcScale * zoom;
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
    const yOffset = npc.kind === 'caracal' ? 30 * zoom : 18 * zoom;
    if (config.fixed) {
      ctx.drawImage(img, point.x - drawW / 2, point.y - drawH + yOffset, drawW, drawH);
      if (isGifSrc(config.src)) placeGifDom('npc_' + npc.id, config.src, point.x - drawW / 2, point.y - drawH + yOffset, drawW, drawH, true);
    } else {
      const frameW = img.naturalWidth / SPRITE_COLS;
      const frameH = img.naturalHeight / SPRITE_ROWS;
      ctx.drawImage(img, frame * frameW, row * frameH, frameW, frameH, point.x - drawW / 2, point.y - drawH + yOffset, drawW, drawH);
    }
  } else {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(point.x - 12, point.y - 30, 24, 30);
  }

  if ((npc.kind === 'spookyMan' || npc.kind === 'burningTent') && getNightAlpha() > 0.03) {
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
  if (lastNearbyNpc) {
    const cfg = NPC_CONFIG[lastNearbyNpc.kind];
    const label = cfg.label;
    if (cfg.fixed && ['rarePlant','well','palm'].includes(lastNearbyNpc.kind)) btn.textContent = `أخذ ${label}`;
    else if (cfg.fixed) btn.textContent = `فحص ${label}`;
    else btn.textContent = `تحدث مع ${label}`;
  }
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
  return handleQuestNpc(npc.kind);
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
  if (gameState.money < item.price) { box.classList.remove('hidden'); box.textContent = 'لا تستطيع الشراء، المال لا يكفي.'; return; }
  box.classList.remove('hidden');
  box.innerHTML = `<span>هل أنت متأكد من الشراء؟</span><button type="button" class="confirmBuyYes">نعم</button><button type="button" class="confirmBuyNo">لا</button>`;
  box.querySelector('.confirmBuyYes').onclick = () => buyShopItem(shopKey, index, target, box);
  box.querySelector('.confirmBuyNo').onclick = () => { box.classList.add('hidden'); box.innerHTML = ''; };
}

function buyShopItem(shopKey, index, target, confirmBox = null) {
  const item = SHOP_ITEMS[shopKey][index];
  if (!item) return;
  if (!spendMoney(item.price)) return;
  const added = addBagItem({
    id: `${shopKey}_${index}`,
    name: item.name,
    type: target === 'hunger' ? 'food' : 'medicine',
    value: item.value,
    img: item.img
  });
  if (!added) {
    gameState.money += item.price;
    saveGameState();
    updateStatsPanel();
    return;
  }
  gameState.quests.usedShop = true;
  saveGameState();
  updateMissionsPanel();
  if (confirmBox) {
    confirmBox.classList.remove('hidden');
    confirmBox.innerHTML = '<span class="shopDoneMsg"><i class="fa-solid fa-circle-check"></i> تم الشراء</span>';
    setTimeout(() => { confirmBox.classList.add('hidden'); confirmBox.innerHTML = ''; }, 2000);
  } else showToast('تم الشراء');
}


function completeQuestReward(questKey = '') {
  if (questKey && gameState.quests[questKey]?.completed) return false;
  if (questKey) gameState.quests[questKey] = Object.assign({}, gameState.quests[questKey], { completed: true });
  gameState.money += 20;
  gameState.levelPoints += 20;
  saveGameState();
  updateStatsPanel();
  updateMissionsPanel();
  return true;
}

const AUTOMATIC_MISSION_REWARD_KEYS = new Set([
  'chooseCharacter',
  'placeFiveItems',
  'useThreeCategories',
  'setHome',
  'visitThreeCells',
  'collectFirstMoney',
  'usedShop'
]);

function claimAutomaticMissionRewards(missions, missionDone) {
  if (!isLoggedIn() || !gameStateFirebaseReady) return;
  if (!gameState.quests || typeof gameState.quests !== 'object') gameState.quests = {};
  if (!gameState.quests.missionRewards || typeof gameState.quests.missionRewards !== 'object') {
    gameState.quests.missionRewards = {};
  }

  let changed = false;
  for (const mission of missions) {
    if (!AUTOMATIC_MISSION_REWARD_KEYS.has(mission.key)) continue;
    if (!missionDone[mission.key]) continue;
    if (gameState.quests.missionRewards[mission.key]) continue;

    gameState.quests.missionRewards[mission.key] = true;
    gameState.money += 5;
    gameState.levelPoints += 5;
    changed = true;
  }

  if (changed) {
    saveGameState();
    updateStatsPanel();
  }
}

function loadBagItems() {
  try {
    const saved = JSON.parse(offlineStore.getItem(BAG_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function saveBagItems() {
  offlineStore.setItem(BAG_KEY, JSON.stringify(bagItems));
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;
  window.set(window.ref(window.db, 'inventory/' + window.auth.currentUser.uid + '/bagItems'), bagItems).catch(console.error);
  updateBagUI();
}

function loadBagFromFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.get) return;
  window.get(window.ref(window.db, 'inventory/' + window.auth.currentUser.uid + '/bagItems')).then(snapshot => {
    const data = snapshot.val();
    if (Array.isArray(data)) {
      bagItems = data;
      saveBagItems();
    } else {
      updateBagUI(true);
    }
  }).catch(console.error);
}

function getBagLimit() { return 10; }
function getBagCount() { return bagItems.reduce((sum, item) => sum + (Number(item.count) || 1), 0); }
function findBagItem(id) { return bagItems.find(item => item.id === id); }

function addBagItem(item) {
  const current = findBagItem(item.id);
  if (current) {
    if ((current.count || 1) >= 3) { showToast('وصلت للحد الأعلى من هذا العنصر'); return false; }
    current.count = (current.count || 1) + 1;
  } else {
    if (bagItems.length >= getBagLimit()) { showToast('الحقيبة ممتلئة'); return false; }
    bagItems.push({ id: item.id, name: item.name, type: item.type || 'quest', value: item.value || 0, img: item.img || '', count: 1 });
  }
  saveBagItems();
  return true;
}

function removeBagItem(id) {
  const item = findBagItem(id);
  if (!item) return false;
  item.count = (item.count || 1) - 1;
  if (item.count <= 0) bagItems = bagItems.filter(x => x.id !== id);
  saveBagItems();
  return true;
}

function useBagItem(id) {
  const item = findBagItem(id);
  if (!item) return;
  if (item.type === 'food') { if (addHunger(item.value || 0)) { removeBagItem(id); showToast('تم الأكل'); } return; }
  if (item.type === 'medicine') { if (addHealth(item.value || 0)) { removeBagItem(id); showToast('تم العلاج'); } return; }
  if (item.type === 'quest') { showToast('هذا عنصر مهمة، احذفه فقط إذا لا تحتاجه'); return; }
  showToast('لا يمكن استخدام هذا العنصر الآن');
}

function deleteBagItemWithConfirm(id) {
  const item = findBagItem(id);
  if (!item) return;
  openConfirm('حذف من الحقيبة', `هل تريد حذف ${item.name} من الحقيبة؟`, () => {
    removeBagItem(id);
    document.getElementById('infoModal')?.classList.add('hidden');
    showToast(item.type === 'quest' ? 'تم حذف عنصر المهمة ويمكنك أخذه مرة أخرى' : 'تم حذف العنصر');
  });
}

function updateBagUI(force = false) {
  const bag = document.getElementById('topBagSlots');
  if (!bag) return;
  const limit = getBagLimit();
  const slots = 10;
  const snapshot = JSON.stringify(bagItems.map(item => item ? [item.id, item.name, item.type, item.value, item.img, item.count] : null));
  if (!force && snapshot === lastBagRenderSnapshot && bag.children.length === slots) return;
  lastBagRenderSnapshot = snapshot;

  let html = '';
  for (let i = 0; i < slots; i++) {
    const item = bagItems[i];
    const locked = i >= limit;
    html += `<button type="button" class="bagSlot ${locked ? 'locked' : ''}" data-bag-index="${i}" title="${locked ? 'مغلقة' : (item?.name || 'فارغ')}">${locked ? '<i class="fa-solid fa-lock"></i>' : (item ? `<img src="${item.img}" alt="${item.name}"><b>${item.count > 1 ? item.count + 'x' : ''}</b>` : '')}</button>`;
  }
  bag.innerHTML = html;
  bag.querySelectorAll('.bagSlot:not(.locked)').forEach(btn => {
    const open = event => {
      event.preventDefault();
      event.stopPropagation();
      openBagItemMenu(Number(btn.dataset.bagIndex));
    };
    btn.onclick = open;
    btn.onpointerdown = open;
  });
}

function bagActionHtml(item, actionText, yesClass, yesHandler, extraText = '') {
  const safeId = String(item.id).replace(/'/g, "\\'");
  const img = item.img ? `<img class="bagModalImg" src="${item.img}" alt="${item.name}">` : '';
  return `<div class="bagActionBox">
    ${img}
    <h3>${item.name}</h3>
    <p>${actionText}</p>
    ${extraText ? `<small class="bagMissionHint">${extraText}</small>` : ''}
    <div class="bagActionButtons">
      <button type="button" class="${yesClass}" onclick="${yesHandler}('${safeId}')"><i class="fa-solid fa-check"></i> نعم</button>
      <button type="button" onclick="document.getElementById('infoModal')?.classList.add('hidden')"><i class="fa-solid fa-xmark"></i> لا</button>
    </div>
  </div>`;
}

function openBagItemMenu(index) {
  const item = bagItems[index];
  if (!item) return showToast('الخانة فارغة');

  if (item.type === 'food') {
    return showInfo('الحقيبة', bagActionHtml(item, 'هل تريد الأكل؟', 'bagUseBtn', 'window.__useBagItem'), true);
  }

  if (item.type === 'medicine') {
    return showInfo('الحقيبة', bagActionHtml(item, 'هل تريد استخدام العلاج؟', 'bagUseBtn', 'window.__useBagItem'), true);
  }

  const hint = item.type === 'quest' ? 'تستطيع أخذ المهمة مرة أخرى' : '';
  showInfo('الحقيبة', bagActionHtml(item, 'هل تريد حذف العنصر؟', 'bagDeleteBtn', 'window.__deleteBagItem', hint), true);
}

window.__useBagItem = id => { useBagItem(id); document.getElementById('infoModal')?.classList.add('hidden'); };
window.__deleteBagItem = id => {
  const item = findBagItem(id);
  if (!item) return;
  removeBagItem(id);
  document.getElementById('infoModal')?.classList.add('hidden');
  showToast(item.type === 'quest' ? 'تم حذف عنصر المهمة ويمكنك أخذه مرة أخرى' : 'تم حذف العنصر');
};

function handleQuestNpc(kind) {
  const q = gameState.quests;
  if (kind === 'archaeologist' || kind === 'ruins') return openPairQuest('archaeology', kind, 'الباحثة الأثرية', 'الآثار', 'ابحث عن الآثار ثم ارجع للباحثة الأثرية.', 'وجدت الآثار. ارجع للباحثة الأثرية.', 'أخبرت الباحثة عن مكان الآثار.');
  if (kind === 'herbalist') return openCollectQuest('rarePlants', 'rarePlant', 'العطارة', 'ابحث عن نبتة نادرة واحدة وضعها في الحقيبة ثم ارجع للعطارة.', 'سلمت النبتة النادرة للعطارة.');
  if (kind === 'rarePlant') { if (!q.rarePlants?.completed && !findBagItem('rarePlant') && addBagItem({ id:'rarePlant', name:'نبتة نادرة', type:'quest', img:'All-Pic/npc/q34.png' })) showToast('تمت إضافة النبتة إلى الحقيبة'); return openQuestText('نبتة نادرة', findBagItem('rarePlant') ? 'تمت إضافة النبتة إلى الحقيبة. ارجع للعطارة.' : 'تم العثور على نبتة نادرة.'); }
  if (kind === 'messenger') return openDeliveryQuest('messageQuest', 'message_note', 'صاحب الرسالة', 'صديق صاحب الرسالة', 'خذ الرسالة إلى صديقه.', 'أخذت الرسالة. ابحث عن الصديق.', 'تم تسليم الرسالة.');
  if (kind === 'messengerFriend') return openDeliveryQuest('messageQuest', 'message_note', 'صديق صاحب الرسالة', 'صاحب الرسالة', 'ابحث عن صاحب الرسالة وخذ منه الرسالة.', 'سلم الرسالة هنا بعد أخذها.', 'وصلت الرسالة إلى الصديق.');
  if (kind === 'fireMan') return openDeliveryQuest('fireQuest', 'water_bucket', 'صاحب الخيمة', 'البئر', 'ابحث عن البئر وخذ الماء لإطفاء النار.', 'خذ الماء من البئر ثم ارجع.', 'تم إطفاء النار.');
  if (kind === 'well') { if (!q.fireQuest?.completed && !findBagItem('water_bucket') && addBagItem({ id:'water_bucket', name:'سطل ماء', type:'quest', img:'All-Pic/npc/q23.png' })) showToast('تمت تعبئة الماء وإضافته إلى الحقيبة'); return openQuestText('البئر', 'تمت تعبئة الماء. ارجع إلى صاحب الخيمة.'); }
  if (kind === 'dateWoman') return openDeliveryQuest('dateQuest', 'dates', 'صاحبة الضيوف', 'النخلة', 'ابحث عن النخلة وخذ التمر.', 'خذ التمر من النخلة ثم ارجع.', 'تم تسليم التمر.');
  if (kind === 'palm') { if (!q.dateQuest?.completed && !findBagItem('dates') && addBagItem({ id:'dates', name:'تمر', type:'quest', img:'All-Pic/npc/q31.png' })) showToast('تمت إضافة التمر إلى الحقيبة'); return openQuestText('النخلة', 'تمت إضافة التمر إلى الحقيبة. ارجع إلى صاحبة البيت.'); }
  if (kind === 'burningTent' || kind === 'dateHouse') return openQuestText(NPC_CONFIG[kind].label, kind === 'dateHouse' ? 'ابحث عن صاحبة البيت لأجل إرسالك لمهمة' : 'هذا مكان مرتبط بمهمة.');
}

function openQuestText(title, text) {
  const modal = document.getElementById('npcModal');
  document.getElementById('npcTitle').textContent = title;
  document.getElementById('npcText').textContent = text;
  document.getElementById('npcShopList').innerHTML = '';
  modal?.classList.remove('hidden');
}

function openPairQuest(key, kind, giverTitle, targetTitle, startText, foundText, doneText) {
  const q = gameState.quests[key] || {};
  if (q.completed) return openQuestText(giverTitle, 'أنت أكملت هذه المهمة خلاص.');
  if (kind === 'ruins') { gameState.quests[key] = Object.assign({}, q, { foundTarget: true }); saveGameState(); return openQuestText(targetTitle, foundText); }
  if (q.foundTarget) { completeQuestReward(key); return openQuestText(giverTitle, doneText + ' حصلت على 20 ريال و20 نقطة مستوى.'); }
  gameState.quests[key] = Object.assign({}, q, { started: true }); saveGameState(); return openQuestText(giverTitle, startText);
}

function openCollectQuest(key, itemId, title, startText, doneText) {
  const q = gameState.quests[key] || {};
  if (q.completed) return openQuestText(title, 'أنت أكملت هذه المهمة خلاص.');
  const item = findBagItem(itemId);
  if (item && (item.count || 1) >= 1) { removeBagItem(itemId); completeQuestReward(key); return openQuestText(title, doneText + ' حصلت على 20 ريال و20 نقطة مستوى.'); }
  gameState.quests[key] = Object.assign({}, q, { started: true }); saveGameState(); return openQuestText(title, startText);
}

function openDeliveryQuest(key, itemId, title, targetTitle, startText, carryingText, doneText) {
  const q = gameState.quests[key] || {};
  if (q.completed) return openQuestText(title, 'أنت أكملت هذه المهمة خلاص.');
  if (findBagItem(itemId) && ['صديق صاحب الرسالة','صاحب الخيمة','صاحبة الضيوف'].includes(title)) {
    removeBagItem(itemId); completeQuestReward(key); return openQuestText(title, doneText + ' حصلت على 20 ريال و20 نقطة مستوى.');
  }
  if (!findBagItem(itemId) && ['صاحب الرسالة'].includes(title)) addBagItem({ id:itemId, name:'رسالة', type:'quest', img:'All-Pic/npc/q30.png' });
  gameState.quests[key] = Object.assign({}, q, { started: true }); saveGameState();
  return openQuestText(title, findBagItem(itemId) ? carryingText : startText);
}

function openShepherdQuest(kind) {
  const modal = document.getElementById('npcModal');
  const titleBox = document.getElementById('npcTitle');
  const textBox = document.getElementById('npcText');
  const listBox = document.getElementById('npcShopList');
  if (!modal || !titleBox || !textBox || !listBox) return;

  const q = gameState.quests.shepherdCamel || {};
  const camelItem = findBagItem('camel');
  titleBox.textContent = kind === 'shepherd' ? 'الراعي' : 'الجمل الضائع';
  listBox.innerHTML = '';

  if (q.completed) {
    textBox.textContent = 'أنت أكملت هذه المهمة خلاص.';
  } else if (kind === 'shepherd' && (q.foundCamel || camelItem)) {
    if (camelItem) removeBagItem('camel');
    gameState.quests.shepherdCamel = Object.assign({}, q, { completed: true });
    completeQuestReward();
    textBox.textContent = 'رجعت الجمل للراعي، حصلت على 20 ريال و20 نقطة مستوى.';
  } else if (kind === 'shepherd') {
    textBox.textContent = 'الراعي يبحث عن جمله الضائع. ابحث عن الجمل ثم ارجع له.';
    gameState.quests.shepherdCamel = Object.assign({}, q, { foundShepherd: true });
    saveGameState();
  } else {
    if (!camelItem) addBagItem({ id:'camel', name:'الجمل الضائع', type:'quest', img:'All-Pic/npc/q33.png' });
    textBox.textContent = 'وجدت الجمل الضائع، تم وضعه في الحقيبة. ارجع إلى الراعي.';
    gameState.quests.shepherdCamel = Object.assign({}, q, { foundCamel: true });
    saveGameState();
  }

  modal.classList.remove('hidden');
}

function loadCollectedMoney() {
  try {
    const saved = JSON.parse(offlineStore.getItem(COLLECTED_MONEY_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch { return new Set(); }
}

let collectedMoneyIds = loadCollectedMoney();
const mapMoney = Array.from({ length: 25 }, (_, i) => {
  const col = 2 + ((i * 7) % 18);
  const row = 2 + ((i * 11) % 18);
  return { id: 'money_' + i, x: (col - 0.5) * CELL, y: (row - 0.5) * CELL, amount: 1 + (i % 5) };
});

function saveCollectedMoney() {
  offlineStore.setItem(COLLECTED_MONEY_KEY, JSON.stringify([...collectedMoneyIds]));
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

const coinImage = new Image();
coinImage.src = 'All-Pic/npc/coin.gif';

function ensureCoinLayer() {
  let layer = document.getElementById('coinLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'coinLayer';
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '26';
    document.querySelector('.worldWrap')?.appendChild(layer);
  }
  return layer;
}

function drawMapMoney() {
  const layer = ensureCoinLayer();
  if (!layer) return;

  for (const coin of mapMoney) {
    let img = document.getElementById('coin_' + coin.id);
    if (collectedMoneyIds.has(coin.id)) {
      if (img) img.style.display = 'none';
      continue;
    }

    const p = worldToScreen(coin.x, coin.y);
    const size = 30 * zoom;
    if (!img) {
      img = document.createElement('img');
      img.id = 'coin_' + coin.id;
      img.src = 'All-Pic/npc/coin.gif';
      img.alt = 'ريال';
      img.style.position = 'absolute';
      img.style.objectFit = 'contain';
      img.style.imageRendering = 'auto';
      img.style.pointerEvents = 'none';
      layer.appendChild(img);
    }
    img.style.left = `${p.x - size / 2}px`;
    img.style.top = `${p.y - size / 2}px`;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.display = (p.x + size < -50 || p.y + size < -50 || p.x > canvas.clientWidth + 50 || p.y > canvas.clientHeight + 50) ? 'none' : 'block';
  }
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
    const saved = JSON.parse(offlineStore.getItem(LAST_PLAYER_KEY));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      return {
        x: clampNumber(saved.x, 18, WORLD_COLS * CELL - 18, (10 - 0.5) * CELL),
        y: clampNumber(saved.y, 28, WORLD_ROWS * CELL - 8, (10 - 0.5) * CELL),
        speed: 5,
        dir: saved.dir || 'down'
      };
    }
  } catch {}

  return {
    x: (10 - 0.5) * CELL,
    y: (10 - 0.5) * CELL,
    speed: 5,
    dir: 'down'
  };
}

function saveLastPlayer() {
  offlineStore.setItem(LAST_PLAYER_KEY, JSON.stringify({
    x: player.x,
    y: player.y,
    dir: player.dir
  }));
}

function getTileSize(groupKey, size) {
  const group = tileGroups.find(g => g.key === groupKey);
  if (group) return { w: group.w, h: group.h };
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
    return JSON.parse(offlineStore.getItem(SAVE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLocalWorld() {
  offlineStore.setItem(SAVE_KEY, JSON.stringify(world));
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
  const reservedOwner = cellOwners[key] || '';
  return isLoggedIn() && (!reservedOwner || reservedOwner === currentOwner()) && (!cell || !cell.owner || cell.owner === currentOwner());
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


function sanitizeItemForSave(item, cellKey) {
  if (!item || !item.uid || !item.tileId) return null;

  return {
    uid: String(item.uid),
    tileId: String(item.tileId),
    cell: String(cellKey || item.cell),
    x: clampNumber(item.x, -CELL, CELL * 2, 0),
    y: clampNumber(item.y, -CELL, CELL * 2, 0),
    w: clampNumber(item.w, 12, 1000, 55),
    h: clampNumber(item.h, 12, 1000, 55),
    layer: clampNumber(item.layer, 1, 5, 1),
    blocking: !!item.blocking,
    owner: String(currentOwner() || item.owner || ''),
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
  const currentCell = walkMode ? cellFromWorld(player.x, player.y) : cellFromWorld(camX + canvas.clientWidth / zoom / 2, camY + canvas.clientHeight / zoom / 2);
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
      updateHousePanel();
    };

    worldListeners[key] = callback;
    window.onValue(window.ref(window.db, 'world/' + key), callback, error => {
      console.error(error);
      showToast('فشل تحميل الخلايا القريبة');
    });
  });
}

/* ===== Firebase ===== */

const cellSaveChains = {};

function buildCellFirebasePayload(cellKey) {
  const cell = world[cellKey];
  if (!cell || !Array.isArray(cell.items) || cell.items.length === 0) return null;

  if (cell.items.length > MAX_ITEMS_PER_CELL) {
    cell.items = cell.items.slice(0, MAX_ITEMS_PER_CELL);
    showToast('تم الوصول للحد الأقصى داخل الخلية');
  }

  const safeItems = cell.items
    .map(item => sanitizeItemForSave(item, cellKey))
    .filter(Boolean);

  if (!safeItems.length) return null;
  return { owner: currentOwner(), items: safeItems };
}

function saveCellToFirebase(cellKey) {
  if (!window.db || !window.ref || !window.set || !window.remove) return Promise.resolve();

  const doSave = () => {
    const payload = buildCellFirebasePayload(cellKey);
    const action = payload
      ? window.set(window.ref(window.db, 'world/' + cellKey), payload)
      : window.remove(window.ref(window.db, 'world/' + cellKey));

    return action.catch(error => {
      console.error('Firebase cell save error:', error);
      showToast('فشل حفظ الخلية');
      throw error;
    });
  };

  const previous = cellSaveChains[cellKey] || Promise.resolve();
  const next = previous.catch(() => {}).then(doSave);
  cellSaveChains[cellKey] = next.finally(() => {
    if (cellSaveChains[cellKey] === next) delete cellSaveChains[cellKey];
  });
  return next;
}

function removeCellFromFirebase(cellKey) {
  if (!window.db || !window.ref || !window.remove) return Promise.resolve();

  const doRemove = () => {
    const payload = buildCellFirebasePayload(cellKey);
    if (payload) return window.set(window.ref(window.db, 'world/' + cellKey), payload);
    return window.remove(window.ref(window.db, 'world/' + cellKey));
  };

  const previous = cellSaveChains[cellKey] || Promise.resolve();
  const next = previous.catch(() => {}).then(doRemove).catch(error => {
    console.error('Firebase cell remove error:', error);
    showToast('فشل حذف الخلية من Firebase');
    throw error;
  });
  cellSaveChains[cellKey] = next.finally(() => {
    if (cellSaveChains[cellKey] === next) delete cellSaveChains[cellKey];
  });
  return next;
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
  if (!window.db || !window.ref || !window.onValue) return;

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
  if (!isLoggedIn()) return;
  if (!window.db || !window.ref || !window.onValue) return;
  if (playersListenerOff) return;

  playersListenerOff = window.onValue(window.ref(window.db, 'players'), snapshot => {
    const raw = snapshot.val() || {};
    onlinePlayers = raw;

    Object.keys(raw).forEach(id => {
      const data = raw[id] || {};
      const sx = Number(data.x) || 0;
      const sy = Number(data.y) || 0;
      if (!onlinePlayerSmooth[id]) onlinePlayerSmooth[id] = { x: sx, y: sy, targetX: sx, targetY: sy };
      onlinePlayerSmooth[id].targetX = sx;
      onlinePlayerSmooth[id].targetY = sy;
      onlinePlayerSmooth[id].updatedAt = data.updatedAt || Date.now();
    });

    Object.keys(onlinePlayerSmooth).forEach(id => {
      if (!raw[id]) delete onlinePlayerSmooth[id];
    });
  }, error => console.error('players listen error:', error));
}

function listenCellOwnersFromFirebase() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.onValue) return;
  if (cellOwnersListenerOff) return;
  cellOwnersListenerOff = window.onValue(window.ref(window.db, 'cellOwners'), snapshot => {
    cellOwners = snapshot.val() || {};
    updateInfoPanel();
  }, error => console.error('cellOwners listen error:', error));
}

function stopWorldListeners() {
  Object.keys(worldListeners).forEach(key => {
    try {
      if (window.off) window.off(window.ref(window.db, 'world/' + key), 'value', worldListeners[key]);
    } catch {}
    delete worldListeners[key];
  });
  lastSubscribedCenterCell = '';
}

function resetRealtimeSession() {
  stopWorldListeners();
  stopWorldNpcsListener();
  stopHouseDataListeners();
  try { if (typeof playersListenerOff === 'function') playersListenerOff(); } catch {}
  try { if (typeof cellOwnersListenerOff === 'function') cellOwnersListenerOff(); } catch {}
  playersListenerOff = null;
  cellOwnersListenerOff = null;
  onlinePlayers = {};
  onlinePlayerSmooth = {};
  cellOwners = {};
}

/* ===== Helpers ===== */
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
  const tileId = String(item.tileId || '');
  const isWall = tileId.startsWith('wall_') || tileId.includes('wall');

  if (isWall) {
    return {
      x: rect.x + rect.w * 0.08,
      y: rect.y + rect.h * 0.58,
      w: rect.w * 0.84,
      h: rect.h * 0.34
    };
  }

  return {
    x: rect.x + rect.w * shrink,
    y: rect.y + rect.h * shrink,
    w: rect.w * (1 - shrink * 2),
    h: rect.h * (1 - shrink * 2)
  };
}

function clampItemToCellByVisiblePixels(item) {
  const box = getAlphaBox(item);
  item.x = clampNumber(item.x, -item.w * box.left, CELL - item.w * box.right, item.x);
  item.y = clampNumber(item.y, -item.h * box.top, CELL - item.h * box.bottom, item.y);
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
  offlineStore.setItem(CHARACTER_KEY, myCharacterId);

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


function sceneryWorldRect(item) {
  const cell = parseCell(item.cell);
  if (!cell) return null;
  const x = (cell.col - 1) * CELL + CELL / 2 - item.w / 2;
  const y = (cell.row - 1) * CELL + CELL / 2 - item.h / 2;
  return { x, y, w: item.w, h: item.h };
}

function sceneryCollisionRect(item) {
  const rect = sceneryWorldRect(item);
  if (!rect) return null;
  const hit = Number(item.hitbox || 0.6);
  const shrinkX = (1 - hit) / 2;
  const shrinkY = 0.50;
  return {
    x: rect.x + rect.w * shrinkX,
    y: rect.y + rect.h * shrinkY,
    w: rect.w * hit,
    h: rect.h * 0.35
  };
}

function fixedNpcCollisionRect(npc) {
  const config = NPC_CONFIG[npc.kind];
  if (!config?.blocking) return null;
  const scale = Number(config.scale || 1);
  const w = PLAYER_DRAW_W * scale * 0.70;
  const h = PLAYER_DRAW_H * scale * 0.45;
  return { x: npc.x - w / 2, y: npc.y - h / 2, w, h };
}

function drawRandomScenery() {
  const winterAlpha = getWinterAlpha();

  for (const item of randomSceneryTiles) {
    const cell = parseCell(item.cell);
    if (!isSafeFixedCell(cell)) continue;
    const img = getTileImage(item.src);
    const iceImg = winterAlpha > 0.01 ? getTileImage(iceSrc(item.src)) : null;
    const hasIce = iceImg && iceImg.complete && iceImg.naturalWidth;
    const x = (cell.col - 1) * CELL + CELL / 2 - item.w / 2;
    const y = (cell.row - 1) * CELL + CELL / 2 - item.h / 2;
    const p = worldToScreen(x, y);
    const w = item.w * zoom;
    const h = item.h * zoom;
    if (p.x + w < -80 || p.y + h < -80 || p.x > canvas.clientWidth + 80 || p.y > canvas.clientHeight + 80) continue;

    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = hasIce ? (1 - winterAlpha) : 1;
      ctx.drawImage(img, p.x, p.y, w, h);
      ctx.restore();
    }

    if (hasIce) {
      ctx.save();
      ctx.globalAlpha = winterAlpha;
      ctx.drawImage(iceImg, p.x, p.y, w, h);
      ctx.restore();
    }
  }
}


let fixedEditorMapTilesSortedCache = null;

function getSortedFixedEditorMapTiles() {
  if (!fixedEditorMapTilesSortedCache) {
    fixedEditorMapTilesSortedCache = getFixedEditorMapTiles()
      .slice()
      .sort((a, b) => Number(a.layer || 1) - Number(b.layer || 1));
  }
  return fixedEditorMapTilesSortedCache;
}

function getFixedEditorMapTiles() {
  return (typeof fixedEditorMapTiles !== 'undefined' && Array.isArray(fixedEditorMapTiles)) ? fixedEditorMapTiles : [];
}

function getFixedEditorMapHitboxes() {
  return (typeof fixedEditorMapHitboxes !== 'undefined' && fixedEditorMapHitboxes) ? fixedEditorMapHitboxes : {};
}

function getFixedEditorMapAlphaBounds() {
  return (typeof fixedEditorMapAlphaBounds !== 'undefined' && fixedEditorMapAlphaBounds) ? fixedEditorMapAlphaBounds : {};
}

function editorMapItemRect(item) {
  const cell = parseCell(item.cell);
  if (!cell) return null;
  return {
    x: (cell.col - 1) * CELL + Number(item.x || 0),
    y: (cell.row - 1) * CELL + Number(item.y || 0),
    w: Number(item.w || 0),
    h: Number(item.h || 0)
  };
}

const editorMapHitboxBoundsCache = {};
const editorMapAlphaBoundsCache = {};

function normalizeBoundsBox(bounds) {
  if (!bounds) return null;
  const left = clampNumber(Number(bounds.left), 0, 1, 0);
  const top = clampNumber(Number(bounds.top), 0, 1, 0);
  const right = clampNumber(Number(bounds.right), 0, 1, 1);
  const bottom = clampNumber(Number(bounds.bottom), 0, 1, 1);
  if (right - left < 0.02 || bottom - top < 0.02) return null;
  return { left, top, right, bottom };
}

function boundsArea(bounds) {
  if (!bounds) return 0;
  return Math.max(0, bounds.right - bounds.left) * Math.max(0, bounds.bottom - bounds.top);
}

function intersectBounds(a, b) {
  if (!a && !b) return null;
  if (!a) return normalizeBoundsBox(b);
  if (!b) return normalizeBoundsBox(a);
  const merged = normalizeBoundsBox({
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom)
  });
  if (merged) return merged;
  return boundsArea(a) <= boundsArea(b) ? normalizeBoundsBox(a) : normalizeBoundsBox(b);
}

function editorMapAlphaBounds(item) {
  const key = String(item?.tileId || item?.src || '');
  if (editorMapAlphaBoundsCache[key]) return editorMapAlphaBoundsCache[key];
  const bounds = normalizeBoundsBox(getFixedEditorMapAlphaBounds()[key]);
  if (bounds) editorMapAlphaBoundsCache[key] = bounds;
  return bounds || null;
}

function editorMapHitboxBounds(item) {
  const key = String(item.tileId || item.src || '');
  if (editorMapHitboxBoundsCache[key]) return editorMapHitboxBoundsCache[key];

  const hitbox = getFixedEditorMapHitboxes()[key];
  if (!hitbox || !Array.isArray(hitbox.strokes)) return null;

  let minX = 1, minY = 1, maxX = 0, maxY = 0, found = false;
  for (const stroke of hitbox.strokes) {
    if (!stroke || stroke.erase || !Array.isArray(stroke.points)) continue;
    const pad = Math.max(0, Number(stroke.size || 0) / 2);
    for (const point of stroke.points) {
      if (!Array.isArray(point) || point.length < 2) continue;
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      found = true;
      minX = Math.min(minX, x - pad);
      minY = Math.min(minY, y - pad);
      maxX = Math.max(maxX, x + pad);
      maxY = Math.max(maxY, y + pad);
    }
  }
  if (!found) return null;
  const bounds = normalizeBoundsBox({ left: minX, top: minY, right: maxX, bottom: maxY });
  if (bounds) editorMapHitboxBoundsCache[key] = bounds;
  return bounds;
}

function editorMapCollisionRect(item) {
  if (!item?.blocking) return null;
  const rect = editorMapItemRect(item);
  if (!rect) return null;
  const drawnBounds = editorMapHitboxBounds(item);
  const alphaBounds = editorMapAlphaBounds(item);
  const bounds = intersectBounds(drawnBounds, alphaBounds);
  if (bounds) {
    return {
      x: rect.x + rect.w * bounds.left,
      y: rect.y + rect.h * bounds.top,
      w: rect.w * Math.max(0.02, bounds.right - bounds.left),
      h: rect.h * Math.max(0.02, bounds.bottom - bounds.top)
    };
  }
  return {
    x: rect.x + rect.w * 0.12,
    y: rect.y + rect.h * 0.55,
    w: rect.w * 0.76,
    h: rect.h * 0.35
  };
}

function drawFixedEditorMapTiles() {
  const tiles = getSortedFixedEditorMapTiles();
  if (!tiles.length) return;

  const winterAlpha = getWinterAlpha();

  for (const item of tiles) {
    const rect = editorMapItemRect(item);
    if (!rect) continue;

    const p = worldToScreen(rect.x, rect.y);
    const w = rect.w * zoom;
    const h = rect.h * zoom;

    if (
      p.x + w < -120 ||
      p.y + h < -120 ||
      p.x > canvas.clientWidth + 120 ||
      p.y > canvas.clientHeight + 120
    ) continue;

    const img = getTileImage(item.src);
    const iceImg = winterAlpha > 0.01 ? getTileImage(iceSrc(item.src)) : null;
    const hasIce = iceImg && iceImg.complete && iceImg.naturalWidth;

    if (img && img.complete && img.naturalWidth) {
      const summerAlpha = hasIce ? (1 - winterAlpha) : 1;

      if (summerAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = summerAlpha;
        ctx.translate(p.x + (item.flipX ? w : 0), p.y + (item.flipY ? h : 0));
        ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();
      }
    }

    if (hasIce) {
      ctx.save();
      ctx.globalAlpha = winterAlpha;
      ctx.translate(p.x + (item.flipX ? w : 0), p.y + (item.flipY ? h : 0));
      ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
      ctx.drawImage(iceImg, 0, 0, w, h);
      ctx.restore();
    }
  }
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
  return cell.col >= 1 && cell.col <= WORLD_COLS && cell.row >= 1 && cell.row <= WORLD_ROWS;
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

    const nextSrc = animal.src;

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
  const glow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, radius);
  glow.addColorStop(0, `rgba(255,238,150,${0.34 * alpha})`);
  glow.addColorStop(0.35, `rgba(255,230,120,${0.18 * alpha})`);
  glow.addColorStop(0.72, `rgba(255,245,190,${0.06 * alpha})`);
  glow.addColorStop(1, 'rgba(255,255,230,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = glow;
  ctx.fillRect(lightX - radius, lightY - radius, radius * 2, radius * 2);
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

function isGifSrc(src) {
  return /\.gif(\?|#|$)/i.test(String(src || ''));
}

function ensureGifLayer() {
  let layer = document.getElementById('gifLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'gifLayer';
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '26';
    document.querySelector('.worldWrap')?.appendChild(layer);
  }
  return layer;
}

function placeGifDom(id, src, x, y, w, h, visible = true, flipX = false, flipY = false) {
  const layer = ensureGifLayer();
  if (!layer) return;
  let img = document.getElementById('gif_' + id);
  if (!img) {
    img = document.createElement('img');
    img.id = 'gif_' + id;
    img.alt = '';
    img.style.position = 'absolute';
    img.style.objectFit = 'contain';
    img.style.pointerEvents = 'none';
    img.style.imageRendering = 'pixelated';
    layer.appendChild(img);
  }
  if (img.dataset.currentSrc !== src) { img.src = src; img.dataset.currentSrc = src; }
  img.dataset.touched = String(Date.now());
  img.style.left = `${x}px`;
  img.style.top = `${y}px`;
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.style.transform = `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`;
  img.style.display = visible ? 'block' : 'none';
}

function cleanupGifLayer() {
  const layer = document.getElementById('gifLayer');
  if (!layer) return;
  const now = Date.now();
  [...layer.children].forEach(el => {
    if (now - Number(el.dataset.touched || 0) > 250) el.style.display = 'none';
  });
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
    if (isGifSrc(tile.image)) placeGifDom(item.uid, tile.image, point.x, point.y, rect.w * zoom, rect.h * zoom, true, !!item.flipX, !!item.flipY);

    if (!walkMode && selectedIds.has(item.uid)) {
      const vr = visualRect(item);
      const vp = worldToScreen(vr.x, vr.y);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(vp.x - 3, vp.y - 3, vr.w * zoom + 6, vr.h * zoom + 6);
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
  const rect = visualRect(item);
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
  ctx.globalAlpha = 1;
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

    const smooth = onlinePlayerSmooth[id] || { x: Number(data.x) || 0, y: Number(data.y) || 0, targetX: Number(data.x) || 0, targetY: Number(data.y) || 0 };
    onlinePlayerSmooth[id] = smooth;
    smooth.targetX = Number(data.x) || smooth.targetX || 0;
    smooth.targetY = Number(data.y) || smooth.targetY || 0;
    smooth.x += (smooth.targetX - smooth.x) * 0.22;
    smooth.y += (smooth.targetY - smooth.y) * 0.22;
    const stillMoving = !!data.moving || Math.hypot(smooth.targetX - smooth.x, smooth.targetY - smooth.y) > 1;

    drawSpriteCharacter(
      smooth.x,
      smooth.y,
      data.dir || 'down',
      stillMoving,
      data.name || 'لاعب',
      data.character || 'woman-1',
      false
    );
  }
}

function drawHouseLabels() {
  if (!walkMode) return;
  const owners = {};
  for (const item of getItems()) {
    const owner = item.owner || world[item.cell]?.owner || '';
    if (!owner || owner === currentOwner()) continue;
    const profile = houseProfiles[owner];
    if (!profile) continue;
    const rect = visualRect(item);
    if (!owners[owner]) owners[owner] = { minX: rect.x, minY: rect.y, maxX: rect.x + rect.w, maxY: rect.y + rect.h, profile };
    else {
      owners[owner].minX = Math.min(owners[owner].minX, rect.x);
      owners[owner].minY = Math.min(owners[owner].minY, rect.y);
      owners[owner].maxX = Math.max(owners[owner].maxX, rect.x + rect.w);
      owners[owner].maxY = Math.max(owners[owner].maxY, rect.y + rect.h);
    }
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const ownerId of Object.keys(owners)) {
    const box = owners[ownerId];
    const name = cleanHouseName(box.profile?.name || 'بيت لاعب', 30);
    if (!name) continue;
    const rating = getHouseRating(ownerId);
    const stars = rating.count ? '★'.repeat(Math.max(1, Math.round(rating.avg))) + '☆'.repeat(Math.max(0, 5 - Math.round(rating.avg))) : '☆☆☆☆☆';
    const centerX = (box.minX + box.maxX) / 2;
    const topY = box.minY - 36;
    const p = worldToScreen(centerX, topY);
    if (p.x < -120 || p.x > canvas.clientWidth + 120 || p.y < -80 || p.y > canvas.clientHeight + 80) continue;
    const fontSize = Math.max(14, 20 * zoom);
    ctx.font = `800 ${fontSize}px "Baloo Bhaijaan 2", Arial, sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.68)';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(name, p.x, p.y);
    ctx.fillText(name, p.x, p.y);
    ctx.font = `800 ${Math.max(11, 15 * zoom)}px Arial, sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.fillStyle = '#facc15';
    ctx.strokeText(stars, p.x, p.y + fontSize * 0.95);
    ctx.fillText(stars, p.x, p.y + fontSize * 0.95);
  }
  ctx.restore();
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
    drawRandomScenery();
    drawFixedEditorMapTiles();
    drawMapMoney();
    drawItems();
    drawHouseLabels();
    drawNpcs();
    drawGrid(width, height);
    drawHomeHighlight();
    drawBuildBoundaryFlash();
    drawGhostTile();
    drawSelectionBox();
    drawOnlinePlayers();

    if (walkMode) drawPlayer();

    // عتمة الليل فوق العناصر، ثم إضاءة إضافية فوق الفلتر حتى تظهر الإنارة ليلًا
    drawNightFilter(width, height);
    drawLights(1); drawLights(2); drawLights(3); drawLights(4); drawLights(5);
    drawSnow(width, height);
    cleanupGifLayer();

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

function updateOnlineNotice() {
  const box = document.getElementById('offlineNotice');
  if (box) box.classList.toggle('hidden', navigator.onLine);
}

function showSmallScreenAdviceOnce() {
  const modal = document.getElementById('screenAdviceModal');
  if (!modal) return;
  if (window.innerWidth <= 760 && !sessionStorage.getItem('screenAdviceClosed')) modal.classList.remove('hidden');
}

function initUI() {
  bind('screenAdviceCloseBtn', 'click', () => { sessionStorage.setItem('screenAdviceClosed', '1'); document.getElementById('screenAdviceModal')?.classList.add('hidden'); });
  window.addEventListener('online', updateOnlineNotice);
  window.addEventListener('offline', updateOnlineNotice);
  updateOnlineNotice();
  showSmallScreenAdviceOnce();

  bind('openAuthBtn', 'click', openAuthModal);
  bind('openSettingsBtn', 'click', openSettingsModal);
  bind('settingsCloseBtn', 'click', closeSettingsModal);
  bind('settingsSaveNameBtn', 'click', saveSettingsName);
  bind('settingsChangeCharacterBtn', 'click', () => { closeSettingsModal(); showCharacterModal(true); });
  bind('settingsChangeHomeBtn', 'click', requestHomeCellChange);
  bind('linkEmailBtn', 'click', linkRealEmail);
  bind('toggleElementsBtn', 'click', () => {
    const box = document.getElementById('elementsContent');
    const btn = document.getElementById('toggleElementsBtn');
    box?.classList.toggle('hidden');
    btn?.classList.toggle('active', !box?.classList.contains('hidden'));
  });
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

  const signupNameInput = document.getElementById('signupDisplayNameInput');
  if (signupNameInput) signupNameInput.value = displayName;

  const lastUsername = offlineStore.getItem(LAST_EMAIL_KEY);
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

function updateActiveLayerLabel() {
  const label = document.getElementById('layerCurrentText');
  if (label) label.textContent = `الطبقة الحالية: ${activeLayer}`;
}

function setActiveLayer(n) {
  activeLayer = Math.max(1, Math.min(5, Number(n || 1)));

  const input = document.getElementById('layerInput');
  if (input) input.value = activeLayer;

  document.querySelectorAll('.layerBtn').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.layer) === activeLayer);
  });
  updateActiveLayerLabel();

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
  const authState = document.getElementById('authState');
  const openAuthBtn = document.getElementById('openAuthBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginHint = document.getElementById('loginHint');

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

  updateHomeButton();
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
  if (Array.isArray(gameState.visitedCells)) return gameState.visitedCells;
  gameState.visitedCells = [];
  return gameState.visitedCells;
}

function rememberVisitedCell(cellKey) {
  if (!cellKey || !isLoggedIn()) return;
  const cells = getVisitedCells();
  if (cells.includes(cellKey)) return;
  cells.push(cellKey);
  gameState.visitedCells = cells.slice(-50);
  saveGameState();
}

function updateMissionsPanel() {
  const box = document.getElementById('missionsList');
  if (!box) return;

  const myItems = getMyItems();
  const categoriesUsed = new Set(myItems.map(item => tileMap[item.tileId]?.category).filter(Boolean));
  const visitedCount = getVisitedCells().length;
  const hasHome = !!offlineStore.getItem(HOME_KEY);

  const missionDone = {
    chooseCharacter: !!myCharacterId,
    placeFiveItems: myItems.length >= 5,
    useThreeCategories: categoriesUsed.size >= 3,
    setHome: hasHome,
    visitThreeCells: visitedCount >= 3,
    shepherdCamel: !!gameState.quests.shepherdCamel?.completed,
    archaeology: !!gameState.quests.archaeology?.completed,
    rarePlants: !!gameState.quests.rarePlants?.completed,
    messageQuest: !!gameState.quests.messageQuest?.completed,
    fireQuest: !!gameState.quests.fireQuest?.completed,
    dateQuest: !!gameState.quests.dateQuest?.completed,
    collectFirstMoney: collectedMoneyIds.size > 0,
    usedShop: !!gameState.quests.usedShop
  };

  const missions = MISSION_DEFINITIONS.map(mission => ({
    ...mission,
    done: !!missionDone[mission.key]
  }));

  claimAutomaticMissionRewards(missions, missionDone);

  box.innerHTML = missions.map(mission => `
    <div class="missionItem ${mission.done ? 'done' : ''}">
      <span><i class="fa-solid ${mission.done ? 'fa-square-check' : 'fa-square'}"></i> ${mission.text}</span>
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

  if (homeMoveMode) {
    moveHomeToCurrentCell();
    return;
  }

  const saved = getHomeData();

  if (!saved || !saved.cell) {
    setHomeCamera();
    return;
  }

  centerCameraOnCell(saved.cell, Number(saved.zoom) || BUILD_BASE_ZOOM);
  flashHomeCell(saved.cell);
  showToast('تمت العودة للمنزل');
}

function setHomeCamera() {
  if (!requireLogin()) return;

  const oldHome = getHomeData();
  if (oldHome?.cell && !homeMoveMode) {
    showToast('لتغيير الخلية اذهب إلى الإعدادات ثم تغيير الخلية');
    return;
  }

  const cell = currentCenterCell();
  if (!cell) return;
  if (!canEditCell(cell.key)) return showToast('هذه الخلية مملوكة للاعب آخر');

  const data = { ...cameraForCell(cell.key, zoom || BUILD_BASE_ZOOM), cell: cell.key, updatedAt: Date.now() };
  saveHomeDataLocal(data);
  saveHomeToFirebase(data).then(() => {
    flashHomeCell(cell.key);
    updateHomeButton();
    updateHomeCellText();
    showToast('تم تحديد المنزل');
  }).catch(() => showToast('فشل حفظ المنزل'));
}

function requestHomeCellChange() {
  if (!requireLogin()) return;
  if (!getHomeCellKey()) return showToast('حدد منزلك أولًا');
  openConfirm('تغيير الخلية', 'مسموح لك بخلية واحدة فقط. سوف يتم نقل عناصرك ومنزلك وبيتك إلى الخلية الجديدة. هل أنت متأكد؟', () => {
    setHomeMoveMode(true);
    closeSettingsModal();
    showToast('اذهب للخلية الجديدة واضغط نقل العفش إلى خلية جديدة');
  });
}

function readWorldCellFromFirebase(cellKey) {
  if (!isLoggedIn() || !window.db || !window.ref || !window.get || !cellKey) return Promise.resolve(world[cellKey] || null);
  return window.get(window.ref(window.db, 'world/' + cellKey)).then(snapshot => {
    const val = snapshot.val();
    if (!val) return world[cellKey] || null;
    const normalized = normalizeWorldData({ [cellKey]: val });
    return normalized[cellKey] || { owner: val.owner || '', items: [] };
  });
}

function moveHomeToCurrentCell() {
  if (!requireLogin()) return;
  const oldCell = getHomeCellKey();
  const newCell = currentCenterCell()?.key || '';
  if (!oldCell || !newCell) return showToast('حدد الخلية الجديدة');
  if (newCell === oldCell) return showToast('هذه هي خلية منزلك الحالية');
  if (!canEditCell(newCell)) return showToast('لا يمكن نقل البيت إلى خلية لاعب آخر');

  Promise.all([readWorldCellFromFirebase(oldCell), readWorldCellFromFirebase(newCell)]).then(([oldData, newData]) => {
    const oldItems = Array.isArray(oldData?.items) ? oldData.items : [];
    const newItems = Array.isArray(newData?.items) ? newData.items : [];
    if ((oldItems.length + newItems.length) > MAX_ITEMS_PER_CELL) return showToast('العناصر كثيرة ولا يمكن نقلها لهذه الخلية');

    const movedItems = oldItems.map(item => ({ ...item, cell: newCell, owner: currentOwner() }));
    const mergedItems = [...newItems, ...movedItems].slice(0, MAX_ITEMS_PER_CELL);
    if (mergedItems.length) world[newCell] = { owner: currentOwner(), items: mergedItems };
    else delete world[newCell];
    delete world[oldCell];
    saveLocalWorld();

    const safeItems = mergedItems.map(item => sanitizeItemForSave(item, newCell)).filter(Boolean);
    const writeNewCell = safeItems.length
      ? window.set(window.ref(window.db, 'world/' + newCell), { owner: currentOwner(), items: safeItems })
      : Promise.resolve();
    return writeNewCell
      .then(() => window.remove(window.ref(window.db, 'world/' + oldCell)).catch(() => {}))
      .then(() => releaseCellOwner(oldCell))
      .then(() => {
        const data = { ...cameraForCell(newCell, zoom || BUILD_BASE_ZOOM), cell: newCell, updatedAt: Date.now() };
        saveHomeDataLocal(data);
        return saveHomeToFirebase(data);
      })
      .then(() => {
        setHomeMoveMode(false);
        flashHomeCell(newCell);
        subscribeNearbyWorldCells(true);
        updateInfoPanel();
        showToast('تم نقل العفش والمنزل إلى الخلية الجديدة');
      });
  }).catch(error => {
    console.error('home move error:', error);
    showToast('فشل نقل العفش');
  });
}

function updateHomeButton() {
  const btn = document.getElementById('homeBtn');
  if (!btn) return;

  const saved = getHomeData();
  if (homeMoveMode) {
    btn.innerHTML = '<i class="fa-solid fa-truck-moving"></i><span>نقل العفش إلى خلية جديدة</span><small>اختر الخلية الجديدة ثم اضغط هنا</small>';
    btn.classList.add('moveMode');
    return;
  }
  btn.classList.remove('moveMode');

  if (saved?.cell) {
    btn.innerHTML = `<i class="fa-solid fa-house-chimney"></i><span>العودة للمنزل</span><small>بيتك في: ${saved.cell} | لتغيير الخلية من الإعدادات</small>`;
  } else {
    btn.innerHTML = '<i class="fa-solid fa-house"></i><span>تحديد المنزل</span><small>لم تحدد بيتك بعد</small>';
  }
}

function changeItemScale(delta) {
  itemScale = Math.max(ITEM_SCALE_MIN, Math.min(ITEM_SCALE_MAX, Number((itemScale + delta).toFixed(2))));

  const scaleInput = document.getElementById('itemScale');
  if (scaleInput) scaleInput.value = itemScale;

  if (!selectedIds.size) return;

  scaleSelectedItems(delta > 0 ? 1.08 : 0.92);
}

function updateItemScale(event) {
  const newScale = Math.max(ITEM_SCALE_MIN, Math.min(ITEM_SCALE_MAX, Number(event.target.value || 0.60))); 
  const factor = newScale / itemScale;
  itemScale = newScale;

  if (selectedIds.size) scaleSelectedItems(factor);
}

function getBaseTileSize(tileId) {
  const id = String(tileId || '');
  const groupKey = id.split('_')[0];
  const group = tileGroups.find(g => g.key === groupKey) || tileGroups.find(g => id.startsWith(g.key));
  return group ? { w: group.w, h: group.h } : { w: 55, h: 55 };
}

function scaleSelectedItems(factor) {
  if (!selectedIds.size || !requireLogin()) return;

  pushUndo();

  const changedCells = new Set();

  for (const item of getItems()) {
    if (!selectedIds.has(item.uid) || !canEditCell(item.cell)) continue;

    const centerX = item.x + item.w / 2;
    const centerY = item.y + item.h / 2;

    const baseSize = getBaseTileSize(item.tileId);
    const minW = Math.max(12, baseSize.w * ITEM_SCALE_MIN);
    const maxW = Math.max(minW, baseSize.w * ITEM_SCALE_MAX);
    const minH = Math.max(12, baseSize.h * ITEM_SCALE_MIN);
    const maxH = Math.max(minH, baseSize.h * ITEM_SCALE_MAX);

    item.w = Math.max(minW, Math.min(maxW, item.w * factor));
    item.h = Math.max(minH, Math.min(maxH, item.h * factor));

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

  const snapRange = Math.max(18, Math.min(item.w, item.h) * 0.55);
  const candidates = [];

  for (const other of cellData.items) {
    if (!other || other.uid === item.uid) continue;
    if ((other.layer || 1) !== (item.layer || 1)) continue;

    const sameHeight = Math.abs(other.h - item.h) <= 10;
    const sameWidth = Math.abs(other.w - item.w) <= 10;

    if (sameHeight) {
      candidates.push({ x: other.x + other.w, y: other.y, score: Math.hypot(item.x - (other.x + other.w), item.y - other.y) });
      candidates.push({ x: other.x - item.w, y: other.y, score: Math.hypot(item.x - (other.x - item.w), item.y - other.y) });
    }

    if (sameWidth) {
      candidates.push({ x: other.x, y: other.y + other.h, score: Math.hypot(item.x - other.x, item.y - (other.y + other.h)) });
      candidates.push({ x: other.x, y: other.y - item.h, score: Math.hypot(item.x - other.x, item.y - (other.y - item.h)) });
    }
  }

  const best = candidates
    .filter(c => c.score <= snapRange)
    .sort((a, b) => a.score - b.score)[0];

  if (best) {
    item.x = best.x;
    item.y = best.y;
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
  clampItemToCellByVisiblePixels(item);
  cellData.items.push(item);

  saveLocalWorld();
  saveCellToFirebase(cell.key).catch(() => {
    const rollbackCell = world[cell.key];
    if (rollbackCell && Array.isArray(rollbackCell.items)) {
      rollbackCell.items = rollbackCell.items.filter(x => x.uid !== item.uid);
      if (!rollbackCell.items.length) delete world[cell.key];
      saveLocalWorld();
      updateInfoPanel();
    }
  });
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
      clampItemToCellByVisiblePixels(item);
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
  const baseSize = getBaseTileSize(item.tileId);
  const currentStartScale = selectedResize.startW / Math.max(1, baseSize.w);
  const nextScale = Math.max(ITEM_SCALE_MIN, Math.min(ITEM_SCALE_MAX, currentStartScale * (distance / startDistance)));
  const factor = nextScale / Math.max(0.01, currentStartScale);

  const cell = parseCell(item.cell);
  if (!cell) return;

  const cellX = (cell.col - 1) * CELL;
  const cellY = (cell.row - 1) * CELL;

  item.w = Math.max(12, Math.min(baseSize.w * ITEM_SCALE_MAX, selectedResize.startW * factor));
  item.h = Math.max(12, Math.min(baseSize.h * ITEM_SCALE_MAX, selectedResize.startH * factor));
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
  ['authModal', 'confirmModal', 'characterModal', 'infoModal', 'npcModal', 'missionsModal', 'settingsModal'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  hideBigTilePreview();
  showAuthMessage('');
}

/* ===== Keyboard ===== */

function isTypingTarget(target) {
  const tag = String(target?.tagName || '').toLowerCase();
  return !!(target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag));
}

window.addEventListener('keydown', event => {
  if (isTypingTarget(event.target)) return;

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
    changeItemScale(ITEM_SCALE_STEP);
    return;
  }

  if (!walkMode && (event.key === '-' || code === 'NumpadSubtract')) {
    event.preventDefault();
    changeItemScale(-ITEM_SCALE_STEP);
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
  showToast('تم حذف العناصر المحددة');
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
    showToast('اكتب خلية صحيحة مثل K10 أو T20 — حدود الخريطة 20×20');
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

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const input = document.getElementById('settingsNameInput');
  const msg = document.getElementById('settingsMessage');
  const usernameBox = document.getElementById('settingsUsernameInput');
  if (usernameBox) usernameBox.value = emailToUsername(currentUserEmail || window.auth?.currentUser?.email || '');
  if (input) input.value = displayName || '';
  if (msg) msg.textContent = '';
  modal?.classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal')?.classList.add('hidden');
}

function saveSettingsName() {
  const input = document.getElementById('settingsNameInput');
  displayName = cleanPlayerName(input?.value, 20);
  offlineStore.setItem(DISPLAY_NAME_KEY, displayName);
  saveProfileData();
  savePlayerToFirebase();
  updateAuthUI();
  const msg = document.getElementById('settingsMessage');
  if (msg) msg.textContent = 'تم حفظ الاسم';
}

function linkRealEmail() {
  const emailRaw = document.getElementById('linkEmailInput')?.value || '';
  const email = String(emailRaw).trim().toLowerCase();
  const pass = document.getElementById('linkPasswordInput')?.value || '';
  const msg = document.getElementById('settingsMessage');

  if (!isLoggedIn()) { if (msg) msg.textContent = 'سجل دخولك أولًا'; return; }
  if (!email || !email.includes('@') || email.endsWith('@gamenjd.local')) { if (msg) msg.textContent = 'اكتب إيميل حقيقي صحيح'; return; }
  if (!pass) { if (msg) msg.textContent = 'اكتب كلمة المرور الحالية أولًا'; return; }

  const user = window.auth.currentUser;
  const currentEmail = String(user?.email || '').toLowerCase();
  const username = cleanUsername(emailToUsername(currentEmail));

  const rememberPendingEmail = () => {
    currentUserEmail = user.email || currentEmail;
    return saveUsernameMapping(username, usernameToEmail(username), { uid: user.uid }).then(() => {
      if (window.db && window.ref && window.update) {
        return window.update(window.ref(window.db, 'profiles/' + user.uid), {
          realEmail: email,
          pendingRealEmail: email,
          updatedAt: Date.now()
        }).catch(console.error);
      }
    });
  };

  const applyDirectUpdate = () => window.updateEmail(user, email).then(() => {
    currentUserEmail = email;
    return saveUsernameMapping(username, usernameToEmail(username), { uid: user.uid });
  }).then(() => {
    saveProfileData();
    updateAuthUI();
    if (msg) msg.textContent = 'تم ربط الإيميل الحقيقي وحفظه في ملفك الشخصي';
  });

  const sendVerifyUpdate = () => {
    if (window.verifyBeforeUpdateEmail) {
      return window.verifyBeforeUpdateEmail(user, email).then(rememberPendingEmail).then(() => {
        if (msg) msg.textContent = 'تم إرسال رابط تأكيد للإيميل. بعد التأكيد يتم حفظ الإيميل في ملفك الشخصي.';
      });
    }
    if (window.updateEmail) return applyDirectUpdate();
    if (msg) msg.textContent = 'خدمة ربط الإيميل غير جاهزة';
    return Promise.resolve();
  };

  const run = () => {
    if (currentEmail && window.reauthenticateWithCredential && window.EmailAuthProvider) {
      const credential = window.EmailAuthProvider.credential(currentEmail, pass);
      return window.reauthenticateWithCredential(user, credential).then(sendVerifyUpdate);
    }
    return sendVerifyUpdate();
  };

  run().catch(error => {
    if (msg) msg.textContent = authErrorMessage(error);
  });
}

function saveProfileData() {
  if (!isLoggedIn() || !window.db || !window.ref || !window.set) return;

  const user = window.auth.currentUser;

  const writeProfile = window.update || window.set;
  writeProfile(window.ref(window.db, 'profiles/' + user.uid), {
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
      offlineStore.setItem(DISPLAY_NAME_KEY, displayName);
    }

    if (data.character) {
      myCharacterId = normalizeCharacterId(data.character);
      offlineStore.setItem(CHARACTER_KEY, myCharacterId);
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
    loadBagFromFirebase();
    listenHouseData();
  }).catch(error => {
    console.error('profile load error:', error);
  });
}


function showSettingsHelpOnce() {
  if (offlineStore.getItem(SETTINGS_HELP_SEEN_KEY) === '1') return;

  offlineStore.setItem(SETTINGS_HELP_SEEN_KEY, '1');
  setTimeout(showSettingsHelp, 700);
}

function saveUsernameMapping(username, email, extra = {}) {
  const clean = cleanUsername(username);
  const loginEmail = usernameToEmail(clean);
  const uid = String(extra?.uid || currentUser?.uid || window.auth?.currentUser?.uid || '');
  if (!clean || !loginEmail || !uid || !window.db || !window.ref || !window.set) return Promise.resolve();

  const payload = {
    username: clean,
    loginEmail,
    email: loginEmail,
    uid,
    updatedAt: Date.now()
  };

  return window.set(window.ref(window.db, 'usernames/' + clean), payload).catch(console.error);
}

function uniqueEmails(list) {
  const seen = new Set();
  return list.map(v => String(v || '').trim().toLowerCase()).filter(v => {
    if (!v || !v.includes('@') || seen.has(v)) return false;
    seen.add(v);
    return true;
  });
}

function resolveLoginEmails(usernameOrEmail) {
  const raw = String(usernameOrEmail || '').trim().toLowerCase();
  if (raw.includes('@')) return Promise.resolve([raw]);
  const username = cleanUsername(raw);
  const fallback = usernameToEmail(username);
  if (!window.db || !window.ref || !window.get) return Promise.resolve([fallback]);
  return window.get(window.ref(window.db, 'usernames/' + username)).then(snapshot => {
    const data = snapshot.val();
    if (typeof data === 'string') return uniqueEmails([data, fallback]);
    if (data && typeof data === 'object') {
      return uniqueEmails([data.loginEmail, data.email, fallback]);
    }
    return [fallback];
  }).catch(() => [fallback]);
}

function resolveLoginEmail(usernameOrEmail) {
  return resolveLoginEmails(usernameOrEmail).then(list => list[0] || usernameToEmail(cleanUsername(usernameOrEmail)));
}

function signup() {
  const username = cleanUsername(document.getElementById('signupUsernameInput')?.value);
  const pass = document.getElementById('signupPassInput')?.value;
  const pass2 = document.getElementById('signupPassConfirmInput')?.value;
  const nameInput = document.getElementById('signupDisplayNameInput');

  if (!isValidUsername(username)) return showAuthMessage('اسم المستخدم يجب أن يكون إنجليزي 3-20 حرف أو رقم أو _');
  if (!pass || pass.length < 6) return showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف أو أكثر');
  if (pass !== pass2) return showAuthMessage('تأكيد كلمة المرور غير مطابق');

  const email = usernameToEmail(username);
  displayName = cleanPlayerName(nameInput?.value || username, 20);
  offlineStore.setItem(DISPLAY_NAME_KEY, displayName);
  offlineStore.setItem(LAST_EMAIL_KEY, username);

  window.createUserWithEmailAndPassword(window.auth, email, pass).then(credential => {
    saveUsernameMapping(username, email, { uid: credential?.user?.uid || window.auth.currentUser?.uid });
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
  const rawLogin = String(document.getElementById('authUsernameInput')?.value || '').trim().toLowerCase();
  const pass = document.getElementById('authPassInput')?.value;
  const username = cleanUsername(rawLogin);

  if (!rawLogin) return showAuthMessage('اكتب اسم المستخدم أو الإيميل');
  if (!rawLogin.includes('@') && !isValidUsername(username)) return showAuthMessage('اكتب اسم المستخدم الإنجليزي بشكل صحيح');
  if (!pass) return showAuthMessage('اكتب كلمة المرور');

  offlineStore.setItem(LAST_EMAIL_KEY, rawLogin.includes('@') ? rawLogin : username);

  const tryEmails = emails => {
    const list = Array.isArray(emails) && emails.length ? emails : [usernameToEmail(username)];
    let index = 0;
    const tryNext = lastError => {
      if (index >= list.length) return Promise.reject(lastError);
      const email = list[index++];
      return window.signInWithEmailAndPassword(window.auth, email, pass).catch(tryNext);
    };
    return tryNext();
  };

  resolveLoginEmails(rawLogin).then(tryEmails).then(() => {
    if (!rawLogin.includes('@')) {
      saveUsernameMapping(username, usernameToEmail(username), { uid: window.auth.currentUser.uid });
    }
    showAuthMessage('تم تسجيل الدخول');
    closeAuthModal();
    updateAuthUI();
    listenCellOwnersFromFirebase();
    loadProfileData();
    loadHomeFromFirebase();
    loadGameStateFromFirebase();
    loadCollectedMoneyFromFirebase();
    loadBagFromFirebase();
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
  const code = String(error?.code || '');
  if (code.includes('email-already-in-use')) return 'هذا الإيميل مستخدم في حساب آخر';
  if (code.includes('operation-not-allowed')) return 'طريقة الدخول أو تغيير الإيميل غير مفعلة في Firebase';
  if (code.includes('requires-recent-login')) return 'سجل خروج وادخل مرة ثانية ثم حاول';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'اسم المستخدم أو كلمة المرور غير صحيحة';
  if (code.includes('invalid-email')) return 'الإيميل غير صحيح';
  if (code.includes('weak-password')) return 'كلمة المرور ضعيفة';
  if (code.includes('user-not-found')) return 'الحساب غير موجود';
  if (code.includes('too-many-requests')) return 'محاولات كثيرة، انتظر قليلًا';
  if (code.includes('network-request-failed')) return 'تأكد من اتصال الإنترنت';
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

  for (const item of randomSceneryTiles) {
    if (!item.blocking) continue;
    const rect = sceneryCollisionRect(item);
    if (rect && rectsHit(playerRect, rect)) return true;
  }

  for (const item of getFixedEditorMapTiles()) {
    if (!item.blocking) continue;
    const rect = editorMapCollisionRect(item);
    if (rect && rectsHit(playerRect, rect)) return true;
  }

  for (const npc of npcs) {
    const rect = fixedNpcCollisionRect(npc);
    if (rect && rectsHit(playerRect, rect)) return true;
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
    previousBuildZoom = zoom < MIN_ZOOM ? BUILD_BASE_ZOOM : zoom;
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
    zoom = clampZoomValue(previousBuildZoom || BUILD_BASE_ZOOM);
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

    const playerSaveInterval = playerMoving ? PLAYER_SAVE_MOVING_MS : PLAYER_SAVE_IDLE_MS;
    if (isLoggedIn() && Date.now() - lastPlayerSave > playerSaveInterval) {
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

    if (currentUserEmail) offlineStore.setItem(LAST_EMAIL_KEY, emailToUsername(currentUserEmail));

    resetRealtimeSession();

    if (currentUser) {
      gameStateFirebaseReady = false;
      lastGameStateSnapshot = '';
      gameState.lastHungerAt = Date.now();
      gameState.lastHealthAt = Date.now();
      saveGameState(true);
      lastSafePlayerPosition = { x: Math.round(player.x), y: Math.round(player.y) };
      listenCellOwnersFromFirebase();
      loadProfileData();
      loadHomeFromFirebase();
      loadGameStateFromFirebase();
      loadCollectedMoneyFromFirebase();
      listenHouseData();
      listenWorldFromFirebase();
      listenPlayersFromFirebase();
      listenWorldNpcsFromFirebase();
    } else {
      if (walkMode) toggleWalk();
      listenHouseData();
      listenWorldFromFirebase();
      listenWorldNpcsFromFirebase();
    }

    updateAuthUI();
    updateInfoPanel();
  });

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
