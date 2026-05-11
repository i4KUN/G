import { categories, tileGroups, tileMap, characterList, assetUrl, VERSION } from '../data/constants.js';
import { showModal, hideModal, setHidden } from '../core/utils.js';

export class UISystem {
  constructor(state, firebase) {
    this.state = state;
    this.firebase = firebase;
    this.gameScene = null;
    this.inventory = null;
    this.build = null;
  }

  attach(scene, build, inventory) {
    this.gameScene = scene;
    this.build = build;
    this.inventory = inventory;
    this.bind();
    this.state.onChange(() => {
      this.updateStats();
      this.updateBag();
      this.updateMissions();
      this.updateCounts();
      this.updateHomeText();
    });
  }

  $(id) { return document.getElementById(id); }

  toast(text) {
    const box = this.$('toast');
    if (!box) return;
    box.textContent = text;
    box.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => box.classList.remove('show'), 2200);
  }

  bind() {
    const bind = (id, ev, fn) => this.$(id)?.addEventListener(ev, fn);

    document.title = `GameNjd v${VERSION}`;

    bind('zoomInBtn', 'click', () => this.gameScene.zoomBy(1.12));
    bind('zoomOutBtn', 'click', () => this.gameScene.zoomBy(1 / 1.12));
    bind('stopWalkBtn', 'click', () => this.gameScene.setWalkMode(false));
    bind('walkBtn', 'click', () => this.gameScene.setWalkMode(true));
    bind('homeBtn', 'click', () => this.gameScene.goHome());
    bind('setHomeBtn', 'click', () => this.gameScene.setHomeHere());
    bind('changeCharacterBtn', 'click', () => this.openCharacters());

    bind('eraseBtn', 'click', () => this.toggleEraser());
    bind('blockBtn', 'click', () => { this.build.blockingMode = !this.build.blockingMode; this.syncToolState(); });
    bind('flipBtn', 'click', () => { this.build.flipX = !this.build.flipX; this.syncToolState(); });
    bind('flipYBtn', 'click', () => { this.build.flipY = !this.build.flipY; this.syncToolState(); });
    bind('undoBtn', 'click', () => this.build.undo());
    bind('deleteSelectedBtn', 'click', () => this.build.deleteSelected());
    bind('deleteAllBtn', 'click', () => this.confirm('حذف جميع عناصري', 'هل تريد حذف جميع عناصرك في الخلايا المحملة؟', () => this.build.deleteAllMine()));

    bind('mobileGearBtn', 'click', () => this.$('panel')?.classList.toggle('collapsed'));
    bind('mobileUndoBtn', 'click', () => this.build.undo());
    bind('mobileEraseBtn', 'click', () => this.toggleEraser());
    bind('mobileBlockBtn', 'click', () => { this.build.blockingMode = !this.build.blockingMode; this.syncToolState(); });
    bind('mobileFlipBtn', 'click', () => { this.build.flipX = !this.build.flipX; this.syncToolState(); });
    bind('mobileFlipYBtn', 'click', () => { this.build.flipY = !this.build.flipY; this.syncToolState(); });
    bind('mobileDeleteBtn', 'click', () => this.build.deleteSelected());
    bind('mobileLockCameraBtn', 'click', () => this.gameScene.setWalkMode(!this.gameScene.walkMode));

    bind('layerInput', 'change', e => { this.build.activeLayer = Number(e.target.value) || 1; this.syncToolState(); });
    bind('itemScale', 'input', e => { this.build.itemScale = Number(e.target.value) || 0.7; this.syncToolState(); });
    bind('gridOpacity', 'input', e => this.gameScene.world.setGridOpacity(e.target.value));
    document.querySelectorAll('.layerBtn').forEach(btn => btn.onclick = () => { this.build.activeLayer = Number(btn.dataset.layer) || 1; this.syncToolState(); });

    bind('jumpBtn', 'click', () => this.gameScene.jumpToCell(this.$('jumpInput')?.value));
    bind('toggleElementsBtn', 'click', () => this.$('elementsContent')?.classList.toggle('hidden'));
    bind('openMissionsBtn', 'click', () => showModal('missionsModal'));
    bind('missionsCloseBtn', 'click', () => hideModal('missionsModal'));
    bind('npcCloseBtn', 'click', () => hideModal('npcModal'));
    bind('infoCloseBtn', 'click', () => hideModal('infoModal'));

    bind('openAuthBtn', 'click', () => showModal('authModal'));
    bind('authCloseBtn', 'click', () => hideModal('authModal'));
    bind('authBottomCloseBtn', 'click', () => hideModal('authModal'));
    document.querySelectorAll('.authTab').forEach(b => b.onclick = () => this.setAuthTab(b.dataset.authTab));

    bind('logoutBtn', 'click', () => this.firebase.logout());
    bind('loginBtn', 'click', () => this.login());
    bind('signupBtn', 'click', () => this.signup());
    bind('resetPasswordBtn', 'click', () => this.reset());

    bind('openSettingsBtn', 'click', () => this.openSettings());
    bind('settingsCloseBtn', 'click', () => hideModal('settingsModal'));
    bind('settingsChangeCharacterBtn', 'click', () => this.openCharacters());
    bind('settingsSaveNameBtn', 'click', () => this.saveDisplayName());
    bind('linkEmailBtn', 'click', () => this.linkEmail());
    bind('saveHouseNameBtn', 'click', () => this.saveHouseName());

    bind('togglePanel', 'click', () => this.$('panel')?.classList.toggle('collapsed'));
    bind('shortcutsBtn', 'click', () => this.openShortcuts());
    bind('settingsHelpBtn', 'click', () => this.openSettingsHelp());
    bind('aboutBtn', 'click', () => this.openAbout());
    bind('screenAdviceCloseBtn', 'click', () => hideModal('screenAdviceModal'));

    window.addEventListener('online', () => setHidden('offlineNotice', true));
    window.addEventListener('offline', () => setHidden('offlineNotice', false));
    setHidden('offlineNotice', navigator.onLine);

    document.querySelectorAll('.categoryBtn').forEach(btn => btn.onclick = () => this.build.setCategory(btn.dataset.category));

    this.renderCategories();
    this.renderCharacters();
    this.updateStats();
    this.updateBag();
    this.updateAuthState();
    this.updateHomeText();
    this.firebase.onUser(user => this.updateAuthState(user));
  }

  toggleEraser() {
    this.build.eraser = !this.build.eraser;
    if (this.build.eraser) this.build.selectedTile = null;
    this.syncToolState();
  }

  setAuthTab(tab) {
    document.querySelectorAll('.authTab').forEach(b => b.classList.toggle('active', b.dataset.authTab === tab));
    this.$('authLoginPanel')?.classList.toggle('hidden', tab !== 'login');
    this.$('authSignupPanel')?.classList.toggle('hidden', tab !== 'signup');
    this.$('authResetPanel')?.classList.toggle('hidden', tab !== 'reset');
  }

  renderCategories() {
    const select = this.$('categorySelect');
    if (select) select.innerHTML = `<option value="">اختر قسم</option>` + tileGroups.map(g => `<option value="${g.key}">${g.name}</option>`).join('');
    document.querySelectorAll('[data-category-list]').forEach(box => {
      box.innerHTML = tileGroups.map(g => `<button class="categoryBtn" data-category="${g.key}" type="button">${g.name}</button>`).join('');
      box.querySelectorAll('.categoryBtn').forEach(btn => btn.onclick = () => this.build.setCategory(btn.dataset.category));
    });
  }

  renderTiles(category) {
    const box = this.$('tileset');
    if (!box) return;
    if (!category || !categories[category]) {
      box.innerHTML = '';
      box.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');
    box.innerHTML = categories[category].tiles.map(t => `<div class="tile" data-id="${t.id}" title="${t.name}"><img class="tileImg" src="${assetUrl(t.image)}" alt="${t.name}" loading="lazy"><span>${t.name}</span></div>`).join('');
    box.querySelectorAll('.tile').forEach(el => el.onclick = () => this.build.selectTile(el.dataset.id));
  }

  setSelectedTile(tile) {
    const box = this.$('selectedPreviewBox');
    const img = this.$('selectedItemPreview');
    if (!box || !img) return;
    box.classList.toggle('hidden', !tile);
    if (tile) img.src = assetUrl(tile.image);
  }

  setSelectedItem(item) {
    const box = this.$('selectedPreviewBox');
    const img = this.$('selectedItemPreview');
    if (!box || !img) return;
    box.classList.toggle('hidden', !item);
    const tile = item ? tileMap[item.tileId] : null;
    if (tile) img.src = assetUrl(tile.image);
  }

  syncToolState() {
    ['eraseBtn', 'mobileEraseBtn'].forEach(id => this.$(id)?.classList.toggle('active', !!this.build.eraser));
    ['blockBtn', 'mobileBlockBtn'].forEach(id => this.$(id)?.classList.toggle('active', !!this.build.blockingMode));
    ['flipBtn', 'mobileFlipBtn'].forEach(id => this.$(id)?.classList.toggle('active', !!this.build.flipX));
    ['flipYBtn', 'mobileFlipYBtn'].forEach(id => this.$(id)?.classList.toggle('active', !!this.build.flipY));
    document.querySelectorAll('.layerBtn').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.layer) === this.build.activeLayer));
    const layer = this.$('layerInput');
    if (layer) layer.value = this.build.activeLayer;
    const scale = this.$('itemScale');
    if (scale) scale.value = this.build.itemScale;
  }

  updateStats() {
    const d = this.state.get();
    document.querySelector('[data-stat="healthText"]')?.replaceChildren(`${Math.round(d.health)}%`);
    document.querySelector('[data-stat="hungerText"]')?.replaceChildren(`${Math.round(d.hunger)}%`);
    const hf = document.querySelector('[data-stat="healthFill"]');
    if (hf) hf.style.width = `${d.health}%`;
    const hu = document.querySelector('[data-stat="hungerFill"]');
    if (hu) hu.style.width = `${d.hunger}%`;
    document.querySelector('[data-stat="money"]')?.replaceChildren(`${d.money || 0} ريال`);
    document.querySelector('[data-stat="levelPoints"]')?.replaceChildren(`${d.levelPoints || 0}`);
    document.querySelector('[data-stat="currentCell"]')?.replaceChildren(d.lastCell || '--');
    const ct = this.$('currentCellText');
    if (ct) ct.textContent = d.lastCell || '--';
  }

  updateHomeText() {
    const el = document.querySelector('[data-home-cell]');
    if (el) el.textContent = this.state.get().homeCell ? `بيتك: ${this.state.get().homeCell}` : 'لم تحدد بيتك بعد';
  }

  updateBag() {
    const bag = this.$('topBagSlots');
    if (!bag) return;
    const list = this.state.get().bagItems || [];
    let html = '';
    for (let i = 0; i < 10; i++) {
      const item = list[i];
      const locked = i >= 5;
      html += `<button type="button" class="bagSlot ${locked ? 'locked' : ''}" data-i="${i}">${locked ? '<i class="fa-solid fa-lock"></i>' : (item ? `<img src="${assetUrl(item.img)}" alt="${item.name}"><b>${item.count > 1 ? item.count + 'x' : ''}</b>` : '')}</button>`;
    }
    bag.innerHTML = html;
    bag.querySelectorAll('.bagSlot:not(.locked)').forEach(b => b.onclick = () => {
      const item = list[Number(b.dataset.i)];
      if (!item) return this.toast('الخانة فارغة');
      this.openText('الحقيبة', `<div class="bagActionBox"><p>${item.name}</p><button id="useBagNow" type="button">${item.type === 'food' ? 'أكل' : item.type === 'medicine' ? 'علاج' : 'حذف'}</button></div>`, true);
      setTimeout(() => this.$('useBagNow')?.addEventListener('click', () => { this.inventory.use(item.id); hideModal('infoModal'); }), 0);
    });
  }

  updateMissions() {
    const box = this.$('missionsList');
    if (!box) return;
    const d = this.state.get();
    const q = d.quests || {};
    const items = this.gameScene?.world?.getAllItems?.().filter(i => i.owner === this.firebase.uid()) || [];
    const cats = new Set(items.map(i => tileMap[i.tileId]?.category));
    const missions = [
      ['اختر شخصية', !!d.characterId, 0, 5],
      ['ضع 5 عناصر في عالمك', items.length >= 5, 1, 5],
      ['استخدم 3 أقسام مختلفة', cats.size >= 3, 2, 10],
      ['حدد منزلك', !!d.homeCell, 1, 5],
      ['زر 3 خلايا مختلفة', (d.visitedCells || []).length >= 3, 1, 5],
      ['ابحث عن الراعي والجمل', !!q.shepherdCamel?.completed, 20, 20],
      ['مهمة الباحثة الأثرية', !!q.archaeology?.completed, 20, 20],
      ['مهمة النباتات النادرة', !!q.rarePlants?.completed, 20, 20],
      ['مهمة الرسالة', !!q.messageQuest?.completed, 20, 20],
      ['مهمة الخيمة والبئر', !!q.fireQuest?.completed, 20, 20],
      ['مهمة التمر', !!q.dateQuest?.completed, 20, 20],
      ['اجمع أول ريال من الخريطة', (d.collectedMoney || []).length > 0, 0, 5],
      ['تحدث مع صاحب البقالة أو الصيدلي', !!q.usedShop, 0, 5]
    ];
    box.innerHTML = missions.map(m => `<div class="missionItem ${m[1] ? 'done' : ''}"><span><i class="fa-solid ${m[1] ? 'fa-square-check' : 'fa-square'}"></i> ${m[0]}</span><small>الجائزة: ${m[2]} ريال | ${m[3]} نقطة</small></div>`).join('');
  }

  updateCounts() {
    const box = this.$('myItemsCount');
    if (box) box.textContent = (this.gameScene?.world?.getAllItems?.().filter(i => i.owner === this.firebase.uid()).length || 0);
    this.updateMissions();
  }

  updateNpcButton(npc) {
    const btn = this.$('npcInteractBtn');
    if (!btn) return;
    btn.classList.toggle('hidden', !npc);
    if (!npc) return;
    const labels = { ruins: 'فحص الآثار', well: 'تعبئة الماء', palm: 'أخذ التمر', rarePlant: 'أخذ النبتة', burningTent: 'إطفاء الخيمة', dateHouse: 'فحص البيت' };
    btn.textContent = labels[npc.kind] || (npc.config.type === 'shop' ? 'شراء' : 'تحدث');
  }

  onNpcInteract(fn) { this.$('npcInteractBtn')?.addEventListener('click', fn); }

  openShop(title, key, items, buy) {
    this.$('npcTitle').textContent = title;
    this.$('npcText').textContent = key === 'grocery' ? 'اختر غذاء لزيادة الجوع.' : 'اختر علاجًا لزيادة الصحة.';
    const box = this.$('npcShopList');
    box.innerHTML = items.map((it, i) => `<div class="shopItemWrap"><button class="shopItemBtn" data-i="${i}" type="button"><img src="${assetUrl(it.img)}"><span>${it.name}</span><b>${it.price} ريال</b><small>+${it.value}%</small></button></div>`).join('');
    box.querySelectorAll('.shopItemBtn').forEach(btn => btn.onclick = () => buy(items[Number(btn.dataset.i)], Number(btn.dataset.i)));
    showModal('npcModal');
  }

  openText(title, text, html = false) {
    const modal = html ? 'infoModal' : 'npcModal';
    if (html) {
      this.$('infoTitle').textContent = title;
      this.$('infoText').innerHTML = text;
    } else {
      this.$('npcTitle').textContent = title;
      this.$('npcText').textContent = text;
      this.$('npcShopList').innerHTML = '';
    }
    showModal(modal);
  }

  renderCharacters() {
    const box = this.$('characterChoices');
    if (!box) return;
    box.innerHTML = characterList.map(c => `<button class="characterChoice" data-id="${c.id}" type="button"><img src="${assetUrl(c.src)}"><span>${c.name}</span></button>`).join('');
    box.querySelectorAll('.characterChoice').forEach(btn => btn.onclick = () => {
      const c = characterList.find(x => x.id === btn.dataset.id);
      this.state.set({ characterId: c.id });
      this.gameScene?.setCharacter(c);
      hideModal('characterModal');
    });
  }

  openCharacters() { showModal('characterModal'); }

  updateAuthState(user = this.firebase.user) {
    const auth = this.$('authState');
    if (auth) {
      auth.innerHTML = user ? '<i class="fa-solid fa-circle-check"></i> أنت مسجل دخول' : '<i class="fa-solid fa-circle-xmark"></i> أنت لم تسجل دخول';
      auth.classList.toggle('online', !!user);
      auth.classList.toggle('offline', !user);
    }
    document.body.classList.toggle('loggedIn', !!user);
    setHidden('openAuthBtn', !!user);
    setHidden('logoutBtn', !user);
    setHidden('guestPanelOverlay', !!user);
    const usernameInput = this.$('settingsUsernameInput');
    if (usernameInput && user) usernameInput.value = user.email || '';
  }

  async login() {
    try {
      await this.firebase.login(this.$('authUsernameInput').value.trim(), this.$('authPassInput').value);
      hideModal('authModal');
      this.toast('تم تسجيل الدخول');
    } catch (e) {
      this.toast('فشل تسجيل الدخول');
    }
  }

  async signup() {
    try {
      const pass = this.$('signupPassInput').value;
      const pass2 = this.$('signupPassConfirmInput').value;
      if (pass !== pass2) return this.toast('كلمة المرور غير متطابقة');
      await this.firebase.signUp(this.$('signupUsernameInput').value.trim(), pass, this.$('signupDisplayNameInput').value.trim());
      hideModal('authModal');
      this.toast('تم إنشاء الحساب');
    } catch (e) {
      this.toast('فشل إنشاء الحساب');
    }
  }

  async reset() {
    try {
      await this.firebase.reset(this.$('resetEmailInput').value.trim());
      this.toast('تم إرسال رابط الاستعادة');
    } catch (e) {
      this.toast('تعذر الإرسال');
    }
  }

  openSettings() {
    const d = this.state.get();
    const name = this.$('settingsNameInput');
    if (name) name.value = d.displayName || '';
    showModal('settingsModal');
  }

  async saveDisplayName() {
    const name = this.$('settingsNameInput')?.value.trim();
    if (!name) return this.toast('اكتب اسمًا');
    this.state.set({ displayName: name });
    await this.firebase.saveDisplayName(name).catch(() => {});
    this.gameScene.saveProfile(true);
    this.toast('تم حفظ الاسم');
  }

  async saveHouseName() {
    if (!this.firebase.loggedIn()) return this.toast('سجل دخولك أولاً');
    const name = this.$('houseNameInput')?.value.trim().slice(0, 30);
    if (!name) return this.toast('اكتب اسم البيت');
    await this.firebase.set(`houseProfiles/${this.firebase.uid()}`, {
      owner: this.firebase.uid(),
      name,
      homeCell: this.state.get().homeCell || '',
      updatedAt: Date.now()
    }).catch(() => {});
    this.toast('تم حفظ اسم البيت');
  }

  async linkEmail() {
    try {
      await this.firebase.linkEmail(this.$('linkEmailInput').value, this.$('linkPasswordInput').value);
      this.toast('تم ربط الإيميل');
    } catch (e) {
      this.toast('تعذر ربط الإيميل');
    }
  }

  confirm(title, text, yes) {
    this.$('confirmTitle').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${title}`;
    this.$('confirmText').textContent = text;
    showModal('confirmModal');
    const yesBtn = this.$('confirmYesBtn');
    const noBtn = this.$('confirmNoBtn');
    const close = () => hideModal('confirmModal');
    yesBtn.onclick = async () => { close(); await yes?.(); };
    noBtn.onclick = close;
  }

  openShortcuts() {
    this.openText('شرح الاختصارات', 'WASD أو الأسهم للحركة، Ctrl+Z استعادة، Ctrl+C نسخ، Ctrl+V لصق، Delete حذف، الأرقام 1-5 للطبقات، + و - لتغيير حجم العنصر.');
  }

  openSettingsHelp() {
    this.openText('شرح الإعدادات', 'حدد منزلك أولًا، ثم اختر قسمًا وعنصرًا وضعه داخل خلية البيت. زر التجول يشغل حركة اللاعب والكاميرا، والعودة للمنزل ترجعك لخلية بيتك.');
  }

  openAbout() {
    this.openText('من نحن', `GameNjd v${VERSION} - لعبة بناء وتجول عربية بطابع نجدي.`);
  }
}
