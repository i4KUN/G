import { FirebaseService } from './firebase/firebaseService.js';
import { GameScene } from './scenes/GameScene.js';
import { StatsSystem } from './systems/StatsSystem.js';
import { InventorySystem } from './systems/InventorySystem.js';
import { DialogSystem } from './systems/DialogSystem.js';
import { Toast } from './systems/Toast.js';
import { tileGroups, buildTilesForGroup } from './data/tileData.js';
import { QUESTS, QUEST_REWARD } from './data/questData.js';
import { WORLD_WIDTH, WORLD_HEIGHT, BASE_ZOOM } from './config.js';

const firebase = new FirebaseService();
const toast = new Toast();
const dialog = new DialogSystem();
const stats = new StatsSystem(firebase, toast);
const inventory = new InventorySystem(firebase, stats, toast);
let gameScene = null;
let activeCategory = tileGroups[0].key;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0b1120',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: '100%', height: '100%' },
  physics: { default: 'arcade', arcade: { debug: false, gravity: { y: 0 } } },
  dom: { createContainer: true },
  scene: [GameScene]
});

game.scene.start('GameScene', { firebase, stats, inventory, dialog, toast });

const closeButtons = document.querySelectorAll('[data-close]');
closeButtons.forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.close)?.classList.add('hidden')));

document.getElementById('screenAdviceCloseBtn')?.addEventListener('click', () => {
  document.getElementById('screenAdviceModal')?.classList.add('hidden');
});
if (window.innerWidth < 780 && !sessionStorage.getItem('screenAdviceClosed')) {
  document.getElementById('screenAdviceModal')?.classList.remove('hidden');
  sessionStorage.setItem('screenAdviceClosed', '1');
}

window.addEventListener('online', () => document.getElementById('offlineNotice')?.classList.add('hidden'));
window.addEventListener('offline', () => document.getElementById('offlineNotice')?.classList.remove('hidden'));
if (!navigator.onLine) document.getElementById('offlineNotice')?.classList.remove('hidden');

function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function requireScene() { return gameScene; }

function updateAuthUi(user, profile) {
  const state = document.getElementById('authState');
  const openAuth = document.getElementById('openAuthBtn');
  const logout = document.getElementById('logoutBtn');
  const overlay = document.getElementById('guestPanelOverlay');
  if (user) {
    state.className = 'authState online';
    state.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${profile?.name || profile?.username || 'لاعب'}`;
    openAuth.classList.add('hidden');
    logout.classList.remove('hidden');
    overlay.classList.add('hidden');
    document.getElementById('settingsUsername').value = profile?.username || '';
    document.getElementById('settingsName').value = profile?.name || '';
    document.getElementById('settingsRealEmail').value = profile?.realEmail || '';
    buildCharacterChoices(profile?.character || 'woman-1');
  } else {
    state.className = 'authState offline';
    state.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> أنت لم تسجل دخول';
    openAuth.classList.remove('hidden');
    logout.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

firebase.addEventListener('auth', event => {
  const { user, profile } = event.detail;
  updateAuthUi(user, profile);
  gameScene?.setSession({ user, profile });
  if (user) {
    firebase.listenGameState(data => stats.applyRemote(data));
    firebase.listenBag(items => inventory.applyRemote(items));
    hideModal('authModal');
    toast.show('تم تسجيل الدخول');
  } else {
    stats.applyRemote(null);
    inventory.applyRemote([]);
  }
});
firebase.startAuthListener();

const interval = setInterval(() => {
  const scene = game.scene.getScene('GameScene');
  if (scene && scene.scene.isActive()) {
    gameScene = scene;
    clearInterval(interval);
    bindSceneUi();
  }
}, 100);

function bindSceneUi() {
  buildCategoryButtons();
  buildLayerButtons();
  buildTiles(activeCategory);
  document.getElementById('zoomInBtn')?.addEventListener('click', () => requireScene()?.zoomStep(1));
  document.getElementById('zoomOutBtn')?.addEventListener('click', () => requireScene()?.zoomStep(-1));
  document.getElementById('walkBtn')?.addEventListener('click', () => requireScene()?.setWalkMode(true));
  document.getElementById('stopWalkBtn')?.addEventListener('click', () => requireScene()?.setWalkMode(false));
  document.getElementById('setHomeBtn')?.addEventListener('click', () => requireScene()?.setHomeHere());
  document.getElementById('homeBtn')?.addEventListener('click', () => requireScene()?.goHome());
  document.getElementById('jumpBtn')?.addEventListener('click', () => requireScene()?.jumpToCell(document.getElementById('jumpCellInput').value));
  document.getElementById('deleteBtn')?.addEventListener('click', () => requireScene()?.deleteSelected());
  document.getElementById('deleteAllBtn')?.addEventListener('click', () => confirmDialog('حذف كل عناصرك في خلية البيت؟', () => requireScene()?.deleteAllInHomeCell()));
  document.getElementById('biggerBtn')?.addEventListener('click', () => changeItemScale(1));
  document.getElementById('smallerBtn')?.addEventListener('click', () => changeItemScale(-1));
  document.getElementById('blockBtn')?.addEventListener('click', () => toggleTool('blockingMode', 'blockBtn'));
  document.getElementById('eraseBtn')?.addEventListener('click', () => toggleTool('eraseMode', 'eraseBtn'));
  document.getElementById('flipBtn')?.addEventListener('click', () => toggleTool('flipXMode', 'flipBtn'));
  document.getElementById('flipYBtn')?.addEventListener('click', () => toggleTool('flipYMode', 'flipYBtn'));
  document.getElementById('mobileBlockBtn')?.addEventListener('click', () => toggleTool('blockingMode', 'mobileBlockBtn'));
  document.getElementById('mobileEraseBtn')?.addEventListener('click', () => toggleTool('eraseMode', 'mobileEraseBtn'));
  document.getElementById('mobileFlipBtn')?.addEventListener('click', () => toggleTool('flipXMode', 'mobileFlipBtn'));
  document.getElementById('mobileFlipYBtn')?.addEventListener('click', () => toggleTool('flipYMode', 'mobileFlipYBtn'));
  document.getElementById('mobileDeleteBtn')?.addEventListener('click', () => requireScene()?.deleteSelected());
  document.getElementById('toggleElementsBtn')?.addEventListener('click', () => document.getElementById('elementsContent')?.classList.toggle('hidden'));
  document.getElementById('togglePanel')?.addEventListener('click', () => document.getElementById('panel')?.classList.toggle('hiddenPanel'));
  document.getElementById('mobileGearBtn')?.addEventListener('click', () => document.getElementById('panel')?.classList.toggle('hiddenPanel'));
  document.getElementById('changeCharacterBtn')?.addEventListener('click', () => {
    if (!firebase.isLoggedIn()) return toast.show('سجل دخول أولًا');
    showModal('characterModal');
  });
  document.getElementById('openMissionsBtn')?.addEventListener('click', () => { renderMissions(); showModal('missionsModal'); });
}

function buildCategoryButtons() {
  const box = document.getElementById('categoryButtons');
  if (!box) return;
  box.innerHTML = tileGroups.map(group => `<button data-category="${group.key}" class="categoryBtn ${group.key === activeCategory ? 'active' : ''}" type="button"><i class="fa-solid ${group.icon}"></i>${group.name}</button>`).join('');
  box.querySelectorAll('.categoryBtn').forEach(btn => btn.addEventListener('click', () => {
    activeCategory = btn.dataset.category;
    box.querySelectorAll('.categoryBtn').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    buildTiles(activeCategory);
  }));
}

function buildTiles(category) {
  const group = tileGroups.find(x => x.key === category) || tileGroups[0];
  const box = document.getElementById('tileset');
  if (!box) return;
  const tiles = buildTilesForGroup(group);
  box.innerHTML = tiles.map(tile => `
    <button class="tile" type="button" data-id="${tile.id}">
      <img class="tileImg" src="${tile.src}" alt="${tile.name}">
      <span>${tile.name}</span>
    </button>
  `).join('');
  box.querySelectorAll('.tile').forEach(btn => btn.addEventListener('click', () => {
    const tile = tiles.find(x => x.id === btn.dataset.id);
    gameScene.selectedTile = tile;
    box.querySelectorAll('.tile').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    toast.show(`تم اختيار ${tile.name}`);
  }));
}

function buildLayerButtons() {
  const box = document.getElementById('layerChoices');
  if (!box) return;
  box.innerHTML = [1,2,3,4,5].map(n => `<button class="layerBtn ${n === 1 ? 'active' : ''}" data-layer="${n}" type="button">${n}</button>`).join('');
  box.querySelectorAll('.layerBtn').forEach(btn => btn.addEventListener('click', () => {
    const layer = Number(btn.dataset.layer);
    gameScene.activeLayer = layer;
    box.querySelectorAll('.layerBtn').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
  }));
}

function changeItemScale(dir) {
  if (!gameScene) return;
  gameScene.itemScale = Math.max(0.2, Math.min(1.0, gameScene.itemScale + dir * 0.04));
  toast.show(`حجم العنصر: ${Math.round(gameScene.itemScale * 100)}%`);
}

function toggleTool(prop, id) {
  if (!gameScene) return;
  gameScene[prop] = !gameScene[prop];
  document.getElementById(id)?.classList.toggle('active', gameScene[prop]);
  toast.show(gameScene[prop] ? 'تم تفعيل الأداة' : 'تم إيقاف الأداة');
}

function confirmDialog(text, onYes) {
  dialog.show('تأكيد', text, [
    { label: 'نعم', onClick: onYes },
    { label: 'لا' }
  ]);
}

function renderMissions() {
  const box = document.getElementById('missionsList');
  if (!box) return;
  box.innerHTML = Object.entries(QUESTS).map(([id, q]) => {
    const status = stats.questStatus(id);
    const text = status === 'done' ? 'مكتملة' : status === 'none' ? 'لم تبدأ' : 'جارية';
    return `<div class="missionCard"><b>${q.title}</b><p>${q.description}</p><small>الحالة: ${text} | الجائزة: ${QUEST_REWARD.money} ريال و ${QUEST_REWARD.levelPoints} نقطة</small></div>`;
  }).join('');
}

function buildCharacterChoices(activeId = 'woman-1') {
  const box = document.getElementById('characterChoices');
  if (!box) return;
  let html = '<h3>رجال</h3><div class="characterGrid">';
  for (let i = 1; i <= 10; i++) {
    const id = `man-${i}`;
    html += `<button class="characterChoice ${id === activeId ? 'active' : ''}" data-id="${id}" type="button"><span class="characterPreviewFrame"><img class="characterPreviewImg" src="All-Pic/Characters/man/${id}.png" alt="رجل ${i}"></span><b>رجل ${i}</b></button>`;
  }
  html += '</div><h3>نساء</h3><div class="characterGrid">';
  for (let i = 1; i <= 10; i++) {
    const id = `woman-${i}`;
    html += `<button class="characterChoice ${id === activeId ? 'active' : ''}" data-id="${id}" type="button"><span class="characterPreviewFrame"><img class="characterPreviewImg" src="All-Pic/Characters/woman/${id}.png" alt="امرأة ${i}"></span><b>امرأة ${i}</b></button>`;
  }
  html += '</div>';
  box.innerHTML = html;
  box.querySelectorAll('.characterChoice').forEach(btn => btn.addEventListener('click', () => {
    box.querySelectorAll('.characterChoice').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    gameScene?.setCharacter(btn.dataset.id);
    hideModal('characterModal');
    toast.show('تم اختيار الشخصية');
  }));
}

// Auth UI
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
loginTab?.addEventListener('click', () => {
  loginTab.classList.add('active'); signupTab.classList.remove('active');
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('signupForm').classList.add('hidden');
});
signupTab?.addEventListener('click', () => {
  signupTab.classList.add('active'); loginTab.classList.remove('active');
  document.getElementById('signupForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
});
document.getElementById('openAuthBtn')?.addEventListener('click', () => showModal('authModal'));
document.getElementById('openSettingsBtn')?.addEventListener('click', () => showModal('settingsModal'));
document.getElementById('logoutBtn')?.addEventListener('click', () => firebase.logout().then(() => toast.show('تم تسجيل الخروج')));
document.getElementById('loginSubmitBtn')?.addEventListener('click', async () => {
  try {
    await firebase.login({ username: document.getElementById('loginUsername').value, password: document.getElementById('loginPassword').value });
  } catch (err) { toast.show(err.message || 'فشل تسجيل الدخول'); }
});
document.getElementById('signupSubmitBtn')?.addEventListener('click', async () => {
  try {
    const p1 = document.getElementById('signupPassword').value;
    const p2 = document.getElementById('signupPassword2').value;
    if (p1 !== p2) return toast.show('كلمة المرور وتأكيدها غير متطابقين');
    await firebase.signup({ username: document.getElementById('signupUsername').value, password: p1, name: document.getElementById('signupName').value });
  } catch (err) { toast.show(err.message || 'فشل إنشاء الحساب'); }
});
document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
  try {
    const name = document.getElementById('settingsName').value.trim();
    if (name) await firebase.saveProfilePatch({ name });
    const email = document.getElementById('settingsRealEmail').value.trim();
    const password = document.getElementById('settingsPassword').value;
    if (email) await firebase.linkRealEmail({ email, password });
    hideModal('settingsModal');
    toast.show('تم حفظ الإعدادات');
  } catch (err) { toast.show(err.message || 'فشل حفظ الإعدادات'); }
});

export { game, firebase, stats, inventory };
