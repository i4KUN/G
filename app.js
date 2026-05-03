'use strict';

/* =========================
   GameNjd v11.5
   ========================= */

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');

const panel = document.getElementById('panel');
const toast = document.getElementById('toast');

/* =========================
   إعدادات العالم
   ========================= */

const WORLD_COLS = 200;
const WORLD_ROWS = 200;
const CELL = 320;
const MINI = 6;

const SAVE_KEY = 'GameNjd_v11_5_world_cache';
const PROFILE_ID_KEY = 'GameNjd_v11_5_profile_id';
const PROFILE_PASS_KEY = 'GameNjd_v11_5_profile_pass_flag';
const CHARACTER_KEY = 'GameNjd_v11_5_character';
const DISPLAY_NAME_KEY = 'GameNjd_v11_5_display_name';
const LAST_EMAIL_KEY = 'GameNjd_v11_5_last_email';

const CHARACTER_BASE = 'Characters';
const ASSET_BASE = 'All-Pic-tiles';

const FLOOR_TILE_SRC = 'All-Pic-tiles/04-Floors/Big/Floors-big-36.png';

const SPRITE_COLS = 4;
const SPRITE_ROWS = 4;

const PLAYER_DRAW_W = 120;
const PLAYER_DRAW_H = 120;

const BUILD_ZOOM_DEFAULT = 0.7;
const WALK_ZOOM_DEFAULT = 1.25;

let zoom = BUILD_ZOOM_DEFAULT;
let previousBuildZoom = BUILD_ZOOM_DEFAULT;

let camX = 0;
let camY = 0;

let gridOpacity = 0.75;
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

let displayName = localStorage.getItem(DISPLAY_NAME_KEY) || '';
let currentEmail = localStorage.getItem(LAST_EMAIL_KEY) || '';

let flipMode = false;
let itemScale = 1;

let didInitialCenter = false;
let playerMoving = false;

let isTouchPanning = false;
let lastTouch = null;

let world = loadWorld();
let onlinePlayers = {};

let player = {
  x: (Math.ceil(WORLD_COLS / 2) - 0.5) * CELL,
  y: (Math.ceil(WORLD_ROWS / 2) - 0.5) * CELL,
  speed: 4,
  dir: 'down'
};

let myCharacterId = normalizeCharacterId(localStorage.getItem(CHARACTER_KEY) || '');

const keys = {};
const imageCache = {};
const characterImageCache = {};

const floorImage = new Image();
floorImage.src = FLOOR_TILE_SRC;

/* =========================
   بيانات التايلز
   ========================= */

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
  if (groupKey === 'walls' && size === 'Big') return { w: 170, h: 170 };
  if (groupKey === 'walls' && size === 'Medium') return { w: 130, h: 130 };
  if (groupKey === 'carpets' && size === 'Medium') return { w: 130, h: 130 };
  if (groupKey === 'carpets' && size === 'Small') return { w: 75, h: 75 };
  if (groupKey === 'doors' && size === 'Medium') return { w: 90, h: 90 };
  if (groupKey === 'doors' && size === 'Precise') return { w: 42, h: 42 };

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

    result[group.key] = {
      name: group.name,
      tiles
    };
  }

  return result;
}

const categories = buildCategories();
const tileMap = Object.fromEntries(
  Object.values(categories).flatMap(category => category.tiles.map(tile => [tile.id, tile]))
);

/* =========================
   أدوات عامة
   ========================= */

function showToast(msg) {
  if (!toast) return;

  toast.textContent = msg;
  toast.style.display = 'block';

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 1800);
}

function safeJSON(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function loadWorld() {
  return safeJSON(localStorage.getItem(SAVE_KEY), {});
}

function saveWorldCache() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(world));
}

function pushUndo() {
  undoStack.push(JSON.stringify(world));

  if (undoStack.length > 80) {
    undoStack.shift();
  }
}

function resetPointerState() {
  isDown = false;
  dragMode = null;
  dragStart = null;
  selectionBox = null;
  lastPaintKey = '';
}

function normalizeId(id) {
  return String(id || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function makeProfileId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';

  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }

  return id;
}

function getProfileId() {
  let id = normalizeId(localStorage.getItem(PROFILE_ID_KEY));

  if (!id) {
    id = makeProfileId();
    localStorage.setItem(PROFILE_ID_KEY, id);
  }

  return id;
}

function setProfileId(id) {
  const clean = normalizeId(id);

  if (!/^[A-Z0-9]{4,16}$/.test(clean)) {
    return false;
  }

  localStorage.setItem(PROFILE_ID_KEY, clean);
  return true;
}

function currentOwner() {
  return getProfileId();
}

function currentPlayerId() {
  return getProfileId();
}

function updateProfileBox() {
  const box = document.getElementById('profileIdBox');
  const input = document.getElementById('profileIdInput');

  const id = getProfileId();

  if (box) box.textContent = `معرفك: ${id}`;
  if (input && !input.value) input.value = id;
}

function setAuthBadge(isLogged, text) {
  const badge = document.getElementById('authStateBadge');

  if (!badge) return;

  badge.classList.toggle('on', !!isLogged);
  badge.classList.toggle('off', !isLogged);
  badge.textContent = text || (isLogged ? 'أنت مسجل دخول' : 'أنت لم تسجل دخول');
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

/* =========================
   الشخصيات
   ========================= */

function normalizeCharacterId(id) {
  if (!id) return '';

  if (id.startsWith('male_')) {
    return 'man-' + Number(id.split('_')[1] || 1);
  }

  if (id.startsWith('female_')) {
    return 'woman-' + Number(id.split('_')[1] || 1);
  }

  return id;
}

function getCharacterSrc(id) {
  const fixedId = normalizeCharacterId(id || 'woman-1');

  if (fixedId.startsWith('man-')) {
    return `${CHARACTER_BASE}/man/${fixedId}.png`;
  }

  if (fixedId.startsWith('woman-')) {
    return `${CHARACTER_BASE}/woman/${fixedId}.png`;
  }

  return `${CHARACTER_BASE}/woman/woman-1.png`;
}

function getCharacterName(id) {
  const fixedId = normalizeCharacterId(id || 'woman-1');

  if (fixedId.startsWith('man-')) {
    return 'رجل ' + Number(fixedId.split('-')[1] || 1);
  }

  if (fixedId.startsWith('woman-')) {
    return 'امرأة ' + Number(fixedId.split('-')[1] || 1);
  }

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

  if (!myCharacterId) {
    myCharacterId = 'woman-1';
  }

  localStorage.setItem(CHARACTER_KEY, myCharacterId);

  document.getElementById('characterModal')?.classList.add('hidden');

  saveProfileToFirebase();
  savePlayerToFirebase();

  showToast('تم اختيار الشخصية');
}

function buildCharacterChoices() {
  const box = document.getElementById('characterChoices');

  if (!box) return;

  let html = '<h3>رجال</h3><div class="characterGrid">';

  for (let i = 1; i <= 10; i++) {
    const id = `man-${i}`;
    const src = `Characters/man/${id}.png`;

    html += `
      <button class="characterChoice" data-id="${id}" type="button">
        <div class="characterPreview" style="background-image:url('${src}')"></div>
        <b>رجل ${i}</b>
      </button>
    `;
  }

  html += '</div><h3>نساء</h3><div class="characterGrid">';

  for (let i = 1; i <= 10; i++) {
    const id = `woman-${i}`;
    const src = `Characters/woman/${id}.png`;

    html += `
      <button class="characterChoice" data-id="${id}" type="button">
        <div class="characterPreview" style="background-image:url('${src}')"></div>
        <b>امرأة ${i}</b>
      </button>
    `;
  }

  html += '</div>';

  box.innerHTML = html;

  box.querySelectorAll('.characterChoice').forEach(btn => {
    if (normalizeCharacterId(myCharacterId) === btn.dataset.id) {
      btn.classList.add('active');
    }

    btn.onclick = () => {
      box.querySelectorAll('.characterChoice').forEach(item => item.classList.remove('active'));
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

/* =========================
   Firebase
   ========================= */

function firebaseReady() {
  return !!(window.db && window.ref && window.set && window.get && window.update && window.remove && window.onValue);
}

function profilePath(id = getProfileId()) {
  return `profiles/${id}`;
}

function playerPath(id = currentPlayerId()) {
  return `players/${id}`;
}

function worldPath(cellKey) {
  return `world/${cellKey}`;
}

async function saveProfileToFirebase(extra = {}) {
  if (!firebaseReady()) return;

  const id = getProfileId();

  const data = {
    id,
    displayName: displayName || '',
    email: currentEmail || '',
    linkedUid: window.auth?.currentUser?.uid || '',
    character: normalizeCharacterId(myCharacterId) || 'woman-1',
    updatedAt: Date.now(),
    ...extra
  };

  try {
    await window.update(window.ref(window.db, profilePath(id)), data);
  } catch (err) {
    console.error('profile save error:', err);
  }
}

async function saveProfilePassword() {
  if (!firebaseReady()) return showToast('Firebase غير جاهز');

  const idInput = document.getElementById('profileIdInput');
  const passInput = document.getElementById('profilePassInput');

  const id = normalizeId(idInput?.value || getProfileId());
  const pass = String(passInput?.value || '').trim();

  if (!setProfileId(id)) {
    return showToast('المعرف غير صحيح');
  }

  if (pass.length < 4) {
    return showToast('اكتب رقم سري للمعرف 4 أحرف أو أكثر');
  }

  try {
    const snap = await window.get(window.ref(window.db, profilePath(id)));
    const old = snap.val();

    if (old && old.pass && old.pass !== pass) {
      return showToast('هذا المعرف له رقم سري مختلف');
    }

    localStorage.setItem(PROFILE_PASS_KEY, '1');

    await saveProfileToFirebase({ pass });

    updateProfileBox();
    updateAuthUI();
    savePlayerToFirebase();

    showToast('تم حفظ المعرف');
  } catch (err) {
    console.error(err);
    showToast('فشل حفظ المعرف');
  }
}

async function loginWithProfile() {
  if (!firebaseReady()) return showToast('Firebase غير جاهز');

  const id = normalizeId(document.getElementById('profileIdInput')?.value);
  const pass = String(document.getElementById('profilePassInput')?.value || '').trim();

  if (!/^[A-Z0-9]{4,16}$/.test(id)) {
    return showToast('المعرف غير صحيح');
  }

  if (pass.length < 4) {
    return showToast('اكتب الرقم السري للمعرف');
  }

  try {
    const snap = await window.get(window.ref(window.db, profilePath(id)));
    const data = snap.val();

    if (!data || data.pass !== pass) {
      return showToast('المعرف أو الرقم السري غير صحيح');
    }

    setProfileId(id);

    displayName = data.displayName || displayName || '';
    myCharacterId = normalizeCharacterId(data.character || myCharacterId || 'woman-1');

    localStorage.setItem(DISPLAY_NAME_KEY, displayName);
    localStorage.setItem(CHARACTER_KEY, myCharacterId);
    localStorage.setItem(PROFILE_PASS_KEY, '1');

    document.getElementById('displayNameInput').value = displayName;
    document.getElementById('profileIdInput').value = id;

    updateProfileBox();
    updateAuthUI();
    savePlayerToFirebase();

    showToast('تم الدخول بالمعرف');
  } catch (err) {
    console.error(err);
    showToast('فشل الدخول بالمعرف');
  }
}

async function linkProfileWithEmail() {
  if (!firebaseReady()) return showToast('Firebase غير جاهز');

  const user = window.auth?.currentUser;

  if (!user || user.isAnonymous) {
    return showToast('سجل دخول بالإيميل أولًا');
  }

  const id = getProfileId();
  const email = user.email || currentEmail || '';

  try {
    const emailKey = email.replace(/[.#$[\]]/g, '_');
    const linkSnap = await window.get(window.ref(window.db, `emailLinks/${emailKey}`));
    const oldLink = linkSnap.val();

    if (oldLink && oldLink.profileId && oldLink.profileId !== id) {
      return showToast('هذا الإيميل مربوط بمعرف آخر');
    }

    await window.update(window.ref(window.db), {
      [`profiles/${id}/linkedUid`]: user.uid,
      [`profiles/${id}/email`]: email,
      [`profiles/${id}/updatedAt`]: Date.now(),
      [`emailLinks/${emailKey}`]: {
        email,
        profileId: id,
        uid: user.uid,
        updatedAt: Date.now()
      }
    });

    currentEmail = email;
    localStorage.setItem(LAST_EMAIL_KEY, email);

    updateAuthUI();
    showToast('تم ربط المعرف بالإيميل');
  } catch (err) {
    console.error(err);
    showToast('فشل ربط المعرف بالإيميل');
  }
}

async function loadProfileByEmail(email) {
  if (!firebaseReady() || !email) return false;

  const emailKey = email.replace(/[.#$[\]]/g, '_');

  try {
    const linkSnap = await window.get(window.ref(window.db, `emailLinks/${emailKey}`));
    const link = linkSnap.val();

    if (!link || !link.profileId) return false;

    const profileSnap = await window.get(window.ref(window.db, profilePath(link.profileId)));
    const profile = profileSnap.val();

    if (!profile) return false;

    setProfileId(link.profileId);

    displayName = profile.displayName || displayName || '';
    myCharacterId = normalizeCharacterId(profile.character || myCharacterId || 'woman-1');

    localStorage.setItem(DISPLAY_NAME_KEY, displayName);
    localStorage.setItem(CHARACTER_KEY, myCharacterId);

    document.getElementById('displayNameInput').value = displayName;
    document.getElementById('profileIdInput').value = link.profileId;

    updateProfileBox();
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function signup() {
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const pass = document.getElementById('passInput').value;

  if (!email || !pass) return showToast('اكتب الإيميل والرقم السري');

  if (!window.auth || !window.createUserWithEmailAndPassword) {
    return showToast('Firebase Auth غير جاهز');
  }

  try {
    const cred = await window.createUserWithEmailAndPassword(window.auth, email, pass);

    currentEmail = cred.user.email || email;
    localStorage.setItem(LAST_EMAIL_KEY, currentEmail);

    saveDisplayName(false);
    await saveProfileToFirebase({ linkedUid: cred.user.uid, email: currentEmail });
    await linkProfileWithEmail();

    updateAuthUI();
    savePlayerToFirebase();

    showToast('تم إنشاء الحساب');
  } catch (err) {
    console.error(err);
    showToast('فشل إنشاء الحساب');
  }
}

async function login() {
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const pass = document.getElementById('passInput').value;

  if (!email || !pass) return showToast('اكتب الإيميل والرقم السري');

  if (!window.auth || !window.signInWithEmailAndPassword) {
    return showToast('Firebase Auth غير جاهز');
  }

  try {
    const cred = await window.signInWithEmailAndPassword(window.auth, email, pass);

    currentEmail = cred.user.email || email;
    localStorage.setItem(LAST_EMAIL_KEY, currentEmail);

    await loadProfileByEmail(currentEmail);
    await saveProfileToFirebase({ linkedUid: cred.user.uid, email: currentEmail });

    updateAuthUI();
    savePlayerToFirebase();

    showToast('تم تسجيل الدخول');
  } catch (err) {
    console.error(err);
    showToast('بيانات الدخول غير صحيحة');
  }
}

async function logout() {
  if (!window.auth || !window.signOut) {
    currentEmail = '';
    localStorage.removeItem(LAST_EMAIL_KEY);
    updateAuthUI();
    savePlayerToFirebase();
    showToast('تم الخروج');
    return;
  }

  try {
    await window.signOut(window.auth);

    currentEmail = '';
    localStorage.removeItem(LAST_EMAIL_KEY);

    await startAnonymousAuth();

    updateAuthUI();
    savePlayerToFirebase();

    showToast('تم الخروج');
  } catch (err) {
    console.error(err);
    showToast('فشل تسجيل الخروج');
  }
}

async function startAnonymousAuth() {
  if (!window.auth || !window.signInAnonymously) {
    setTimeout(startAnonymousAuth, 500);
    return;
  }

  if (window.auth.currentUser) return;

  try {
    await window.signInAnonymously(window.auth);
  } catch (err) {
    console.error('anonymous auth error:', err);
  }
}

function initAuthListener() {
  if (!window.auth || !window.onAuthStateChanged) {
    setTimeout(initAuthListener, 500);
    return;
  }

  window.onAuthStateChanged(window.auth, async user => {
    if (user && !user.isAnonymous) {
      currentEmail = user.email || currentEmail || '';
      localStorage.setItem(LAST_EMAIL_KEY, currentEmail);

      await loadProfileByEmail(currentEmail);
      await saveProfileToFirebase({ linkedUid: user.uid, email: currentEmail });
    }

    updateAuthUI();
    savePlayerToFirebase();
  });
}

/* =========================
   Firebase world / players
   ========================= */

function saveCellToFirebase(cellKey) {
  if (!firebaseReady()) return;

  const cell = world[cellKey];
  const hasItems = cell && Array.isArray(cell.items) && cell.items.length > 0;

  if (!hasItems) {
    window.remove(window.ref(window.db, worldPath(cellKey)))
      .catch(err => console.error('Firebase cell remove error:', err));
    return;
  }

  window.set(window.ref(window.db, worldPath(cellKey)), cell)
    .catch(err => {
      console.error('Firebase cell save error:', err);
      showToast('فشل حفظ الخلية');
    });
}

function saveWorldToFirebase() {
  for (const key in world) {
    if (canEditCell(key)) {
      saveCellToFirebase(key);
    }
  }
}

function listenWorldFromFirebase() {
  if (!firebaseReady()) {
    setTimeout(listenWorldFromFirebase, 500);
    return;
  }

  window.onValue(
    window.ref(window.db, 'world'),
    snapshot => {
      world = snapshot.val() || {};
      saveWorldCache();
      centerStartOnce();
    },
    err => {
      console.error(err);
      showToast('فشل الاتصال بالعالم');
    }
  );
}

function savePlayerToFirebase() {
  if (!firebaseReady()) return;

  const id = currentPlayerId();

  const data = {
    id,
    name: displayName || 'لاعب',
    x: player.x,
    y: player.y,
    dir: player.dir,
    moving: playerMoving,
    walkMode: walkMode,
    character: normalizeCharacterId(myCharacterId) || 'woman-1',
    updatedAt: Date.now()
  };

  window.set(window.ref(window.db, playerPath(id)), data)
    .catch(err => console.error('Firebase player save error:', err));
}

function listenPlayersFromFirebase() {
  if (!firebaseReady()) {
    setTimeout(listenPlayersFromFirebase, 500);
    return;
  }

  window.onValue(window.ref(window.db, 'players'), snapshot => {
    onlinePlayers = snapshot.val() || {};
  });
}

/* =========================
   الخلايا والإحداثيات
   ========================= */

function colName(n) {
  let s = '';

  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }

  return s;
}

function parseCell(refText) {
  const m = String(refText || '').trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);

  if (!m) return null;

  let col = 0;

  for (const ch of m[1]) {
    col = col * 26 + ch.charCodeAt(0) - 64;
  }

  const row = Number(m[2]);

  if (col < 1 || col > WORLD_COLS || row < 1 || row > WORLD_ROWS) {
    return null;
  }

  return {
    col,
    row,
    key: `${colName(col)}${row}`,
    x: (col - 1) * CELL,
    y: (row - 1) * CELL
  };
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

  if (col < 1 || row < 1 || col > WORLD_COLS || row > WORLD_ROWS) {
    return null;
  }

  return {
    col,
    row,
    key: `${colName(col)}${row}`,
    x: (col - 1) * CELL,
    y: (row - 1) * CELL
  };
}

function getItems() {
  return Object.values(world).flatMap(cell => cell.items || []);
}

function itemRect(item) {
  const cell = parseCell(item.cell);

  if (!cell) {
    return { x: item.x, y: item.y, w: item.w, h: item.h };
  }

  return {
    x: cell.x + item.x,
    y: cell.y + item.y,
    w: item.w,
    h: item.h
  };
}

function canEditCell(key) {
  const cell = world[key];
  return !cell || !cell.owner || cell.owner === currentOwner();
}

function ensureCell(key) {
  world[key] ||= {
    owner: currentOwner(),
    items: []
  };

  world[key].owner ||= currentOwner();

  return world[key];
}

/* =========================
   الرسم
   ========================= */

function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.width = Math.max(300, Math.floor(rect.width * ratio));
  canvas.height = Math.max(300, Math.floor(rect.height * ratio));

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function drawFloorBackground(w, h) {
  if (!floorImage.complete || !floorImage.naturalWidth) return;

  const startCol = Math.max(1, Math.floor(camX / CELL) + 1);
  const endCol = Math.min(WORLD_COLS, Math.ceil((camX + w / zoom) / CELL) + 1);
  const startRow = Math.max(1, Math.floor(camY / CELL) + 1);
  const endRow = Math.min(WORLD_ROWS, Math.ceil((camY + h / zoom) / CELL) + 1);

  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      const sx = ((c - 1) * CELL - camX) * zoom;
      const sy = ((r - 1) * CELL - camY) * zoom;
      const size = CELL * zoom;

      ctx.drawImage(floorImage, sx, sy, size, size);
    }
  }
}

function drawGrid(w, h) {
  if (walkMode || gridOpacity <= 0) return;

  const startCol = Math.max(1, Math.floor(camX / CELL) + 1);
  const endCol = Math.min(WORLD_COLS, Math.ceil((camX + w / zoom) / CELL) + 1);
  const startRow = Math.max(1, Math.floor(camY / CELL) + 1);
  const endRow = Math.min(WORLD_ROWS, Math.ceil((camY + h / zoom) / CELL) + 1);

  ctx.lineWidth = 1;

  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      const sx = ((c - 1) * CELL - camX) * zoom;
      const sy = ((r - 1) * CELL - camY) * zoom;
      const size = CELL * zoom;

      ctx.strokeStyle = `rgba(147,197,253,${gridOpacity})`;
      ctx.strokeRect(sx, sy, size, size);

      ctx.fillStyle = `rgba(255,255,255,${gridOpacity})`;
      ctx.font = `${Math.max(10, 13 * zoom)}px Arial`;
      ctx.fillText(`${colName(c)}${r}`, sx + 6, sy + 16);
    }
  }
}

function drawItems() {
  const visibleItems = getItems().sort((a, b) => a.layer - b.layer);

  for (const item of visibleItems) {
    const rect = itemRect(item);
    const pos = worldToScreen(rect.x, rect.y);
    const tile = tileMap[item.tileId] || {};
    const img = getTileImage(tile.image);

    ctx.save();

    if (item.flipX) {
      ctx.translate(pos.x + rect.w * zoom, pos.y);
      ctx.scale(-1, 1);

      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, 0, 0, rect.w * zoom, rect.h * zoom);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, 0, rect.w * zoom, rect.h * zoom);
      }
    } else {
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, pos.x, pos.y, rect.w * zoom, rect.h * zoom);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(pos.x, pos.y, rect.w * zoom, rect.h * zoom);
      }
    }

    ctx.restore();

    if (!walkMode && item.blocking) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x, pos.y, rect.w * zoom, rect.h * zoom);
    }

    if (!walkMode && selectedIds.has(item.uid)) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x - 3, pos.y - 3, rect.w * zoom + 6, rect.h * zoom + 6);
      ctx.lineWidth = 1;
    }
  }
}

function drawSpriteCharacter(x, y, dir, moving, name, characterId, isMe) {
  const p = worldToScreen(x, y);
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

  const img = getCharacterImage(characterId || myCharacterId || 'woman-1');

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
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
    ctx.arc(p.x, p.y, 15 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  const label = isMe ? (displayName || 'أنا') : (name || 'لاعب');

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.lineWidth = 3;
  ctx.font = `${Math.max(10, 13 * zoom)}px Arial`;
  ctx.textAlign = 'center';

  ctx.strokeText(label, p.x, p.y - drawH + 18 * zoom);
  ctx.fillText(label, p.x, p.y - drawH + 18 * zoom);

  ctx.restore();
}

function drawPlayer() {
  if (!walkMode) return;

  drawSpriteCharacter(
    player.x,
    player.y,
    player.dir,
    playerMoving,
    displayName || 'أنا',
    myCharacterId || 'woman-1',
    true
  );
}

function drawOnlinePlayers() {
  const now = Date.now();
  const myId = currentPlayerId();

  for (const id in onlinePlayers) {
    if (id === myId) continue;

    const data = onlinePlayers[id];

    if (!data) continue;
    if (!data.walkMode) continue;
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

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, w, h);

 if (floorImage.complete && floorImage.naturalWidth) {
  drawFloorBackground(w, h);
} else {
  ctx.fillStyle = '#d6b36a';
  ctx.fillRect(0, 0, w, h);
}

drawGrid(w, h);

  drawItems();
  drawSelectionBox();
  drawOnlinePlayers();
  drawPlayer();

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

/* =========================
   التفاعل مع العناصر
   ========================= */

function getMouse(e) {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;

  return {
    x,
    y,
    world: screenToWorld(x, y)
  };
}

function hitItem(x, y) {
  return getItems()
    .sort((a, b) => b.layer - a.layer)
    .find(item => {
      const r = itemRect(item);
      return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
    });
}

function paintAt(x, y) {
  const cell = cellFromWorld(x, y);
  if (!cell) return;

  if (!canEditCell(cell.key)) {
    return showToast('ممنوع البناء في أرض لاعب آخر');
  }

  const localX = Math.max(2, Math.min(CELL - 2, x - cell.x));
  const localY = Math.max(2, Math.min(CELL - 2, y - cell.y));

  const snapX = Math.floor(localX / (CELL / MINI));
  const snapY = Math.floor(localY / (CELL / MINI));

  const key = `${cell.key}-${snapX}-${snapY}-${activeLayer}-${selectedTile?.id}-${eraser}-${itemScale}-${flipMode}`;

  if (key === lastPaintKey) return;

  lastPaintKey = key;

  if (eraser) {
    eraseAt(x, y);
    return;
  }

  if (!selectedTile) return;

  const brush = Math.max(1, Math.min(4, Number(brushSize) || 1));

  for (let bx = 0; bx < brush; bx++) {
    for (let by = 0; by < brush; by++) {
      const px = localX + bx * 12;
      const py = localY + by * 12;

      const scaledW = Math.max(12, Math.min(CELL, Math.round(selectedTile.w * itemScale)));
      const scaledH = Math.max(12, Math.min(CELL, Math.round(selectedTile.h * itemScale)));

      const item = {
        uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        tileId: selectedTile.id,
        cell: cell.key,
        x: Math.max(0, Math.min(CELL - scaledW, px - scaledW / 2)),
        y: Math.max(0, Math.min(CELL - scaledH, py - scaledH / 2)),
        w: scaledW,
        h: scaledH,
        layer: activeLayer,
        flipX: flipMode,
        blocking: blockingMode || !!selectedTile.blocking
      };

      ensureCell(cell.key).items.push(item);
    }
  }

  saveWorldCache();
  saveCellToFirebase(cell.key);
}

function eraseAt(x, y) {
  const hit = hitItem(x, y);

  if (!hit) return;

  if (!canEditCell(hit.cell)) {
    return showToast('ممنوع تعديل أرض لاعب آخر');
  }

  world[hit.cell].items = world[hit.cell].items.filter(item => item.uid !== hit.uid);

  if (!world[hit.cell].items.length) {
    delete world[hit.cell];
  }

  saveWorldCache();
  saveCellToFirebase(hit.cell);
}

function selectInBox(box) {
  selectedIds.clear();

  for (const item of getItems()) {
    const rect = itemRect(item);
    const p = worldToScreen(rect.x, rect.y);

    const iw = rect.w * zoom;
    const ih = rect.h * zoom;

    if (
      p.x < box.x + box.w &&
      p.x + iw > box.x &&
      p.y < box.y + box.h &&
      p.y + ih > box.y
    ) {
      selectedIds.add(item.uid);
    }
  }
}

function moveSelected(dx, dy) {
  if (!selectedIds.size) return;

  const changedCells = new Set();

  for (const item of getItems()) {
    if (!selectedIds.has(item.uid)) continue;
    if (!canEditCell(item.cell)) continue;

    item.x = Math.max(0, Math.min(CELL - item.w, item.x + dx));
    item.y = Math.max(0, Math.min(CELL - item.h, item.y + dy));

    changedCells.add(item.cell);
  }

  saveWorldCache();
  changedCells.forEach(saveCellToFirebase);
}

function deleteSelectedItems() {
  if (!selectedIds.size) return showToast('لا يوجد عنصر محدد');

  pushUndo();

  const changedCells = new Set();

  for (const key in world) {
    if (!canEditCell(key)) continue;

    const before = world[key].items.length;
    world[key].items = world[key].items.filter(item => !selectedIds.has(item.uid));

    if (world[key].items.length !== before) {
      changedCells.add(key);
    }

    if (!world[key].items.length) {
      delete world[key];
    }
  }

  selectedIds.clear();
  resetPointerState();

  saveWorldCache();
  changedCells.forEach(saveCellToFirebase);

  showToast('تم حذف العنصر المحدد');
}

function deleteMyItems() {
  pushUndo();

  const changedCells = [];

  for (const key in world) {
    if (canEditCell(key)) {
      changedCells.push(key);
      delete world[key];
    }
  }

  selectedIds.clear();
  resetPointerState();

  saveWorldCache();
  changedCells.forEach(saveCellToFirebase);

  showToast('تم حذف جميع عناصرك');
}

function toggleSelectedBlocking() {
  if (!selectedIds.size) {
    blockingMode = !blockingMode;
    document.getElementById('blockBtn').textContent = `جعل العنصر عائق: ${blockingMode ? 'تشغيل' : 'إيقاف'}`;
    return;
  }

  pushUndo();

  const changedCells = new Set();

  for (const item of getItems()) {
    if (!selectedIds.has(item.uid)) continue;
    if (!canEditCell(item.cell)) continue;

    item.blocking = !item.blocking;
    changedCells.add(item.cell);
  }

  saveWorldCache();
  changedCells.forEach(saveCellToFirebase);

  showToast('تم تعديل العائق');
}

function toggleFlip() {
  if (!selectedIds.size) {
    flipMode = !flipMode;
    document.getElementById('flipBtn').textContent = `عكس العنصر: ${flipMode ? 'تشغيل' : 'إيقاف'}`;
    return;
  }

  pushUndo();

  const changedCells = new Set();

  for (const item of getItems()) {
    if (!selectedIds.has(item.uid)) continue;
    if (!canEditCell(item.cell)) continue;

    item.flipX = !item.flipX;
    changedCells.add(item.cell);
  }

  saveWorldCache();
  changedCells.forEach(saveCellToFirebase);

  showToast('تم عكس العنصر');
}

function updateItemScale(e) {
  itemScale = Number(e.target.value || 1);

  if (!selectedIds.size) return;

  pushUndo();

  const changedCells = new Set();

  for (const item of getItems()) {
    if (!selectedIds.has(item.uid)) continue;
    if (!canEditCell(item.cell)) continue;

    const base = tileMap[item.tileId] || { w: item.w, h: item.h };

    item.w = Math.max(12, Math.min(CELL, Math.round(base.w * itemScale)));
    item.h = Math.max(12, Math.min(CELL, Math.round(base.h * itemScale)));

    item.x = Math.max(0, Math.min(CELL - item.w, item.x));
    item.y = Math.max(0, Math.min(CELL - item.h, item.y));

    changedCells.add(item.cell);
  }

  saveWorldCache();
  changedCells.forEach(saveCellToFirebase);
}

/* =========================
   التحكم بالكانفاس
   ========================= */

canvas.addEventListener('mousedown', e => {
  if (walkMode) return;

  isDown = true;
  lastPaintKey = '';

  const pos = getMouse(e);
  dragStart = pos;

  const hit = hitItem(pos.world.x, pos.world.y);

  if (e.button === 1 || e.altKey) {
    dragMode = 'pan';
  } else if (hit && !eraser) {
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

canvas.addEventListener('mousemove', e => {
  if (!isDown || walkMode) return;

  const pos = getMouse(e);

  if (dragMode === 'paint') {
    paintAt(pos.world.x, pos.world.y);
  }

  if (dragMode === 'pan') {
    camX -= e.movementX / zoom;
    camY -= e.movementY / zoom;
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

  if (dragMode === 'move') {
    moveSelected(e.movementX / zoom, e.movementY / zoom);
  }
});

window.addEventListener('mouseup', () => {
  if (dragMode === 'select' && selectionBox) {
    selectInBox(selectionBox);
  }

  resetPointerState();
});

canvas.addEventListener(
  'wheel',
  e => {
    e.preventDefault();

    if (e.ctrlKey) {
      zoom *= e.deltaY < 0 ? 1.1 : 0.9;
      zoom = Math.max(0.25, Math.min(3, zoom));

      const m = getMouse(e);

      camX = m.world.x - m.x / zoom;
      camY = m.world.y - m.y / zoom;
    } else if (e.shiftKey) {
      camX += e.deltaY / zoom;
    } else {
      camY += e.deltaY / zoom;
    }

    clampCam();
  },
  { passive: false }
);

canvas.addEventListener('touchstart', e => {
  if (walkMode) return;
  if (!e.touches.length) return;

  isTouchPanning = true;
  lastTouch = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY
  };
}, { passive: true });

canvas.addEventListener('touchmove', e => {
  if (walkMode) return;
  if (!isTouchPanning || !lastTouch || !e.touches.length) return;

  const t = e.touches[0];
  const dx = t.clientX - lastTouch.x;
  const dy = t.clientY - lastTouch.y;

  camX -= dx / zoom;
  camY -= dy / zoom;

  clampCam();

  lastTouch = {
    x: t.clientX,
    y: t.clientY
  };
}, { passive: true });

canvas.addEventListener('touchend', () => {
  isTouchPanning = false;
  lastTouch = null;
});

/* =========================
   الكيبورد
   ========================= */

window.addEventListener('keydown', e => {
  keys[e.key] = true;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
    return;
  }

  if (walkMode) return;

  if (e.key === 'Delete') {
    deleteSelectedItems();
    return;
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'c') {
    copyBuffer = getItems().filter(item => selectedIds.has(item.uid)).map(item => ({ ...item }));
    showToast('تم النسخ');
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'v') {
    pasteItems();
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.size) {
    pushUndo();

    const d = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0]
    }[e.key];

    moveSelected(d[0], d[1]);
  }
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

/* =========================
   النسخ واللصق والاستعادة
   ========================= */

function pasteItems() {
  if (!copyBuffer.length) return;

  pushUndo();
  selectedIds.clear();

  const changedCells = new Set();

  for (const old of copyBuffer) {
    if (!canEditCell(old.cell)) continue;

    const item = {
      ...old,
      uid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      x: Math.min(CELL - old.w, old.x + 15),
      y: Math.min(CELL - old.h, old.y + 15)
    };

    ensureCell(item.cell).items.push(item);
    selectedIds.add(item.uid);
    changedCells.add(item.cell);
  }

  saveWorldCache();
  changedCells.forEach(saveCellToFirebase);

  showToast('تم اللصق');
}

function undo() {
  const last = undoStack.pop();

  if (!last) {
    return showToast('لا توجد خطوة سابقة');
  }

  const oldWorld = world;
  world = JSON.parse(last);

  const changedCells = new Set([...Object.keys(oldWorld), ...Object.keys(world)]);

  saveWorldCache();
  changedCells.forEach(saveCellToFirebase);

  resetPointerState();

  showToast('تم الرجوع خطوة');
}

/* =========================
   التجول والكاميرا
   ========================= */

function clampPlayer() {
  player.x = Math.max(20, Math.min(WORLD_COLS * CELL - 20, player.x));
  player.y = Math.max(20, Math.min(WORLD_ROWS * CELL - 20, player.y));
}

function clampCam() {
  camX = Math.max(0, Math.min(WORLD_COLS * CELL - canvas.clientWidth / zoom, camX));
  camY = Math.max(0, Math.min(WORLD_ROWS * CELL - canvas.clientHeight / zoom, camY));
}

function isBlocked(x, y) {
  return getItems().some(item => {
    if (!item.blocking) return false;

    const r = itemRect(item);

    return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
  });
}

function toggleWalk() {
  const next = !walkMode;

  if (next) {
    previousBuildZoom = zoom;

    const center = screenToWorld(canvas.clientWidth / 2, canvas.clientHeight / 2);
    player.x = center.x;
    player.y = center.y;

    clampPlayer();

    zoom = WALK_ZOOM_DEFAULT;
  } else {
    zoom = previousBuildZoom || BUILD_ZOOM_DEFAULT;
    playerMoving = false;
  }

  walkMode = next;

  selectedIds.clear();
  resetPointerState();

  document.body.classList.toggle('walking', walkMode);
  document.getElementById('joystick').classList.toggle('hidden', !walkMode);
  document.getElementById('stopWalkBtn').classList.toggle('hidden', !walkMode);
  document.getElementById('walkBtn').textContent = walkMode ? 'رجوع للتصميم' : 'تجول';

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

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) player.dir = 'right';
      if (dx < 0) player.dir = 'left';
    } else if (dy !== 0) {
      player.dir = dy > 0 ? 'down' : 'up';
    }

    playerMoving = !!(dx || dy);

    const nx = Math.max(20, Math.min(WORLD_COLS * CELL - 20, player.x + dx));
    const ny = Math.max(20, Math.min(WORLD_ROWS * CELL - 20, player.y + dy));

    if (!isBlocked(nx, ny)) {
      player.x = nx;
      player.y = ny;
    } else {
      playerMoving = false;
    }

    camX = player.x - canvas.clientWidth / (2 * zoom);
    camY = player.y - canvas.clientHeight / (2 * zoom);

    clampCam();

    if (playerMoving) {
      savePlayerToFirebase();
    }
  } else if (playerMoving) {
    playerMoving = false;
    savePlayerToFirebase();
  }

  requestAnimationFrame(walkLoop);
}

requestAnimationFrame(walkLoop);

/* =========================
   واجهة التحكم
   ========================= */

function initUI() {
  document.getElementById('displayNameInput').value = displayName;

  document.getElementById('displayNameInput').onchange = () => saveDisplayName(true);

  document.getElementById('signupBtn').onclick = signup;
  document.getElementById('loginBtn').onclick = login;
  document.getElementById('logoutBtn').onclick = logout;

  document.getElementById('profileCreateBtn').onclick = saveProfilePassword;
  document.getElementById('profileLoginBtn').onclick = loginWithProfile;
  document.getElementById('profileLinkEmailBtn').onclick = linkProfileWithEmail;

  document.getElementById('walkBtn').onclick = toggleWalk;
  document.getElementById('stopWalkBtn').onclick = () => {
    if (walkMode) toggleWalk();
  };

  document.getElementById('changeCharacterBtn').onclick = () => showCharacterModal(true);

  document.getElementById('toggleTilesBtn').onclick = () => {
    document.getElementById('tilesControls').classList.toggle('hidden');
  };

  document.getElementById('mobileGearBtn').onclick = () => {
    panel.classList.toggle('closed');
  };

  document.getElementById('togglePanel').onclick = () => {
    panel.classList.toggle('closed');
  };

  document.getElementById('gridOpacity').oninput = e => {
    gridOpacity = Number(e.target.value);
  };

  document.getElementById('brushSize').oninput = e => {
    brushSize = Number(e.target.value);
  };

  document.getElementById('itemScale').oninput = updateItemScale;

  document.getElementById('eraseBtn').onclick = () => {
    eraser = !eraser;
    document.getElementById('eraseBtn').textContent = `ممحاة: ${eraser ? 'تشغيل' : 'إيقاف'}`;
  };

  document.getElementById('blockBtn').onclick = toggleSelectedBlocking;
  document.getElementById('flipBtn').onclick = toggleFlip;
  document.getElementById('deleteSelectedBtn').onclick = deleteSelectedItems;
  document.getElementById('deleteAllBtn').onclick = deleteMyItems;
  document.getElementById('undoBtn').onclick = undo;
  document.getElementById('jumpBtn').onclick = jump;

  document.getElementById('aboutBtn').onclick = () => {
    showInfo('من نحن', 'أنا مصمم مبتدئ في الألعاب.');
  };

  document.getElementById('shortcutsBtn').onclick = () => {
    showInfo(
      'شرح الاختصارات',
      'Ctrl + عجلة: تقريب / إبعاد\nShift + عجلة: تحريك يمين ويسار\nCtrl + C: نسخ العناصر المحددة\nCtrl + V: لصق العناصر\nCtrl + Z: استعادة\nDelete: حذف العنصر المحدد\nالأسهم: تحريك العنصر المحدد أو تحريك الشخصية في وضع التجول'
    );
  };

  document.getElementById('infoCloseBtn').onclick = () => {
    document.getElementById('infoModal').classList.add('hidden');
  };

  document.getElementById('zoomInBtn').onclick = () => {
    zoom = Math.min(3, zoom * 1.15);
    clampCam();
  };

  document.getElementById('zoomOutBtn').onclick = () => {
    zoom = Math.max(0.25, zoom * 0.85);
    clampCam();
  };

  initCategories();
  initLayers();

  updateProfileBox();
  updateAuthUI();
}

function initCategories() {
  const cat = document.getElementById('categorySelect');

  cat.innerHTML = Object.entries(categories)
    .map(([id, c]) => `<option value="${id}">${c.name}</option>`)
    .join('');

  cat.onchange = () => {
    updateSizeFilter();
    renderTiles();
  };

  document.getElementById('sizeFilter').onchange = renderTiles;

  updateSizeFilter();
  renderTiles();
}

function updateSizeFilter() {
  const catId = document.getElementById('categorySelect').value;
  const sizeSelect = document.getElementById('sizeFilter');

  const sizes = [...new Set(categories[catId].tiles.map(t => t.size))];
  const old = sizeSelect.value;

  sizeSelect.innerHTML =
    '<option value="all">الكل</option>' +
    sizes.map(size => `<option value="${size}">${SIZE_DATA[size]?.label || size}</option>`).join('');

  sizeSelect.value = sizes.includes(old) ? old : 'all';
}

function renderTiles() {
  const catId = document.getElementById('categorySelect').value;
  const size = document.getElementById('sizeFilter').value;

  const tiles = categories[catId].tiles.filter(tile => size === 'all' || tile.size === size);

  document.getElementById('tileset').innerHTML = tiles.map(tile => `
    <div class="tile" data-id="${tile.id}" title="${tile.name}">
      <img class="tileImg" src="${tile.image}" alt="${tile.name}" loading="lazy">
      <span>${tile.name}</span>
    </div>
  `).join('');

  document.querySelectorAll('.tile').forEach(el => {
    el.onclick = () => {
      document.querySelectorAll('.tile').forEach(x => x.classList.remove('active'));

      el.classList.add('active');
      selectedTile = tileMap[el.dataset.id];

      eraser = false;
      document.getElementById('eraseBtn').textContent = 'ممحاة: إيقاف';
    };
  });
}

function initLayers() {
  document.querySelectorAll('#layerButtons button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#layerButtons button').forEach(x => x.classList.remove('active'));

      btn.classList.add('active');

      activeLayer = Number(btn.dataset.layer);
      document.getElementById('layerInput').value = activeLayer;
    };
  });
}

function updateAuthUI() {
  const user = window.auth?.currentUser;
  const isEmailUser = !!(user && !user.isAnonymous);

  setAuthBadge(isEmailUser, isEmailUser ? 'أنت مسجل دخول' : 'أنت لم تسجل دخول');

  document.getElementById('statusText').textContent = walkMode ? 'وضع التجول' : 'وضع البناء';

  updateProfileBox();

  const nameInput = document.getElementById('displayNameInput');

  if (nameInput && nameInput.value !== displayName) {
    nameInput.value = displayName;
  }
}

function saveDisplayName(showMsg = true) {
  displayName = String(document.getElementById('displayNameInput')?.value || '').trim().slice(0, 20);

  localStorage.setItem(DISPLAY_NAME_KEY, displayName);

  saveProfileToFirebase();
  savePlayerToFirebase();

  if (showMsg) showToast('تم حفظ الاسم');
}

function showInfo(title, text) {
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoText').textContent = text;
  document.getElementById('infoModal').classList.remove('hidden');
}

function jump() {
  const cell = parseCell(document.getElementById('jumpInput').value);

  if (!cell) {
    return showToast('اكتب خلية صحيحة مثل IP100');
  }

  camX = cell.x - canvas.clientWidth / (2 * zoom) + CELL / 2;
  camY = cell.y - canvas.clientHeight / (2 * zoom) + CELL / 2;

  clampCam();
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

            if (!world[key] || !(world[key].items || []).length) {
              target = { col, row, key };
            }
          }
        }
      }
    }
  }

  if (!target) {
    target = {
      col: Math.ceil(WORLD_COLS / 2),
      row: Math.ceil(WORLD_ROWS / 2)
    };
  }

  camX = (target.col - 1) * CELL - canvas.clientWidth / (2 * zoom) + CELL / 2;
  camY = (target.row - 1) * CELL - canvas.clientHeight / (2 * zoom) + CELL / 2;

  player.x = (target.col - 0.5) * CELL;
  player.y = (target.row - 0.5) * CELL;

  clampPlayer();
  clampCam();
}

/* =========================
   عصا الجوال
   ========================= */

function setupJoystick() {
  const joy = document.getElementById('joystick');
  const stick = document.getElementById('stick');

  let active = false;

  joy.addEventListener('pointerdown', e => {
    active = true;
    joy.setPointerCapture(e.pointerId);
  });

  joy.addEventListener('pointerup', () => {
    active = false;

    stick.style.left = '36px';
    stick.style.top = '36px';

    keys.ArrowUp = false;
    keys.ArrowDown = false;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  });

  joy.addEventListener('pointermove', e => {
    if (!active) return;

    const r = joy.getBoundingClientRect();

    const x = e.clientX - r.left - 60;
    const y = e.clientY - r.top - 60;

    const len = Math.min(42, Math.hypot(x, y));
    const a = Math.atan2(y, x);

    const sx = Math.cos(a) * len;
    const sy = Math.sin(a) * len;

    stick.style.left = `${36 + sx}px`;
    stick.style.top = `${36 + sy}px`;

    keys.ArrowRight = sx > 15;
    keys.ArrowLeft = sx < -15;
    keys.ArrowDown = sy > 15;
    keys.ArrowUp = sy < -15;
  });
}

/* =========================
   بدء التشغيل
   ========================= */

window.addEventListener('beforeunload', () => {
  savePlayerToFirebase();
});

setTimeout(() => {
  document.body.classList.add('loaded');
}, 3000);

function startGame() {
  initUI();
  setupJoystick();

  myCharacterId = normalizeCharacterId(myCharacterId);

  if (myCharacterId) {
    localStorage.setItem(CHARACTER_KEY, myCharacterId);
  }

  startAnonymousAuth();
  initAuthListener();

  showCharacterModal(false);

  listenWorldFromFirebase();
  listenPlayersFromFirebase();

  setTimeout(centerStartOnce, 900);
  setTimeout(savePlayerToFirebase, 1200);
}

startGame();
