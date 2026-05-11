import {
  WORLD_COLS, WORLD_ROWS, CELL, WORLD_WIDTH, WORLD_HEIGHT,
  BASE_ZOOM, MIN_ZOOM, MAX_ZOOM, WALK_BASE_ZOOM, WALK_MIN_ZOOM, WALK_MAX_ZOOM, ZOOM_STEP,
  HOME_BUILD_RADIUS_CELLS, MAX_ITEMS_PER_CELL, PLAYER_W, PLAYER_H, NPC_W, NPC_H,
  ITEM_SCALE_DEFAULT, ITEM_SCALE_MIN, ITEM_SCALE_MAX, ITEM_SCALE_STEP
} from '../config.js';
import { fixedGroundTiles, fixedAnimalTiles, sceneryTiles, coinSpawns } from '../data/worldData.js';
import { buildNpcList, NPC_CONFIG } from '../data/npcData.js';
import { SHOP_ITEMS } from '../data/shopData.js';
import { QUESTS, QUEST_REWARD } from '../data/questData.js';
import { tileGroups, buildTilesForGroup } from '../data/tileData.js';
import { PlayerEntity } from '../entities/Player.js';
import { cellCenter, cellKey, parseCell, textureKeyFromSrc, worldToCell, nowId, clamp, isNight } from '../systems/Utils.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.firebase = null;
    this.stats = null;
    this.inventory = null;
    this.dialog = null;
    this.toast = null;
    this.profile = null;
    this.currentUser = null;
    this.home = null;
    this.walkMode = false;
    this.selectedTile = null;
    this.activeLayer = 1;
    this.itemScale = ITEM_SCALE_DEFAULT;
    this.blockingMode = false;
    this.eraseMode = false;
    this.flipXMode = false;
    this.flipYMode = false;
    this.worldCells = {};
    this.itemObjects = new Map();
    this.selectedItem = null;
    this.npcs = [];
    this.coins = [];
    this.staticObjects = [];
    this.lastPlayerSave = 0;
    this.lastInteractTarget = null;
    this.pointerHitObject = false;
    this.remotePlayers = new Map();
    this.undoStack = [];
    this.copyBuffer = null;
    this.resizeHandle = null;
    this.joystickVector = { x: 0, y: 0 };
    this.currentWorldSubscriptionKey = '';
    this.collectedCoins = {};
    this.houseProfiles = {};
    this.houseRatings = {};
  }

  init(data) {
    this.firebase = data.firebase;
    this.stats = data.stats;
    this.inventory = data.inventory;
    this.dialog = data.dialog;
    this.toast = data.toast;
  }

  preload() {
    this.load.image('ground_default', 'All-Pic/map-pic/00.png');
    this.load.image('build_marker', 'All-Pic/map-pic/09.png');
    this.load.image('character_woman-1', 'All-Pic/Characters/woman/woman-1.png');
    const staticAssets = new Set();
    [...fixedGroundTiles, ...fixedAnimalTiles, ...sceneryTiles, ...coinSpawns].forEach(x => staticAssets.add(x.src));
    buildNpcList().forEach(npc => staticAssets.add(npc.src));
    Object.values(SHOP_ITEMS).flat().forEach(item => staticAssets.add(item.img));
    Object.values(QUESTS).forEach(q => { if (q.item?.img) staticAssets.add(q.item.img); });
    staticAssets.forEach(src => this.load.image(textureKeyFromSrc(src), src));
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(BASE_ZOOM);

    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'ground_default').setDepth(-1000);
    this.grid = this.add.grid(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, CELL, CELL, 0x000000, 0, 0x60a5fa, 0.22).setDepth(-900);
    this.homeMarker = this.add.rectangle(0, 0, CELL, CELL, 0x16a34a, 0.09).setStrokeStyle(8, 0x22c55e, 0.72).setDepth(-850).setVisible(false);

    this.blockers = this.physics.add.staticGroup();
    this.itemsLayer = this.add.layer().setDepth(10);
    this.npcLayer = this.add.layer().setDepth(20);
    this.effectsLayer = this.add.layer().setDepth(30);
    this.selectionBox = this.add.rectangle(0, 0, 1, 1).setStrokeStyle(4, 0xfacc15, 1).setDepth(999).setVisible(false);
    this.resizeHandle = this.add.circle(0, 0, 11, 0x22c55e, 0.95).setStrokeStyle(3, 0xffffff, 1).setDepth(1000).setVisible(false);
    this.resizeHandle.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.resizeHandle);
    this.resizeHandle.on('drag', pointer => this.resizeSelectedTo(pointer.worldX, pointer.worldY));
    this.resizeHandle.on('dragend', () => { const item = this.getSelectedItemData(); if (item) this.saveCell(item.cell); });

    this.createCharacterFrames('character_woman-1');
    const start = cellCenter('J10');
    this.player = new PlayerEntity(this, start.x, start.y, 'woman-1');
    this.player.sprite.setDepth(200);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ left: 'A', right: 'D', up: 'W', down: 'S' });
    this.input.keyboard.on('keydown-DELETE', () => this.deleteSelected());
    this.input.keyboard.on('keydown-BACKSPACE', () => this.deleteSelected());
    this.input.keyboard.on('keydown-ESC', () => this.clearSelection());
    this.input.keyboard.on('keydown-PLUS', () => this.scaleSelected(1));
    this.input.keyboard.on('keydown-NUMPAD_ADD', () => this.scaleSelected(1));
    this.input.keyboard.on('keydown-MINUS', () => this.scaleSelected(-1));
    this.input.keyboard.on('keydown-NUMPAD_SUBTRACT', () => this.scaleSelected(-1));
    this.input.keyboard.on('keydown-Z', event => { if (event.ctrlKey || event.metaKey) this.undoLast(); });
    this.input.keyboard.on('keydown-C', event => { if (event.ctrlKey || event.metaKey) this.copySelected(); });
    this.input.keyboard.on('keydown-V', event => { if (event.ctrlKey || event.metaKey) this.pasteCopied(); });
    this.bindJoystick();

    this.input.on('pointerdown', pointer => {
      this.pointerHitObject = false;
      this.time.delayedCall(0, () => {
        if (!this.pointerHitObject) this.handleWorldClick(pointer);
      });
    });

    this.drawStaticWorld();
    this.createNpcs();
    this.createCoins();
    this.physics.add.collider(this.player.sprite, this.blockers);

    this.events.emit('ready', this);
    document.body.classList.add('loaded');
  }

  update(time, delta) {
    if (this.walkMode) this.player.update(this.cursors, this.wasd, this.joystickVector);
    else this.player.sprite.body.setVelocity(0, 0);
    this.updateNpcs(time, delta);
    this.updateHudCell();
    if (this.firebase.isLoggedIn()) this.subscribeVisibleWorldCells();
    this.stats.tick();
    if (this.firebase.isLoggedIn() && time - this.lastPlayerSave > 1000) {
      this.lastPlayerSave = time;
      this.firebase.savePlayer(this.player.toJSON({ name: this.profile?.name || this.profile?.username || 'لاعب' })).catch(() => {});
    }
  }

  setSession({ user, profile }) {
    this.currentUser = user;
    this.profile = profile;
    if (profile?.character) this.setCharacter(profile.character);
    if (user) {
      this.currentWorldSubscriptionKey = '';
      this.firebase.listenHome(home => { this.home = home; this.applyHome(home); this.subscribeVisibleWorldCells(true); });
      this.firebase.listenPlayers(players => this.renderOnlinePlayers(players));
      this.firebase.listenCollectedMoney(data => { this.collectedCoins = data || {}; this.createCoins(); });
      this.firebase.listenHouseProfiles(data => { this.houseProfiles = data || {}; this.updateVisitedHousePanel(); });
      this.firebase.listenHouseRatings(data => { this.houseRatings = data || {}; this.updateVisitedHousePanel(); });
      this.subscribeVisibleWorldCells(true);
    } else {
      this.worldCells = {};
      this.renderWorldItems();
      this.home = null;
      this.applyHome(null);
      this.renderOnlinePlayers({});
      this.collectedCoins = {};
    }
  }

  requireLogin() {
    if (!this.firebase.isLoggedIn()) {
      this.toast.show('يجب تسجيل الدخول أولًا');
      return false;
    }
    return true;
  }

  drawStaticWorld() {
    this.staticObjects.forEach(obj => obj.destroy?.());
    this.staticObjects = [];
    fixedGroundTiles.forEach(tile => this.addStaticImage(tile.cell, tile.src, 460, 460, false, -500));
    fixedAnimalTiles.forEach(tile => this.addStaticImage(tile.cell, tile.src, 120, 120, false, -100));
    sceneryTiles.forEach(tile => this.addStaticImage(tile.cell, tile.src, tile.w, tile.h, !!tile.blocking, -50, tile.hitbox || 1));
  }

  addStaticImage(cell, src, w, h, blocking = false, depth = 0, hitbox = 1) {
    const pos = cellCenter(cell);
    const key = textureKeyFromSrc(src);
    const img = this.add.image(pos.x, pos.y, key).setDisplaySize(w, h).setDepth(depth);
    this.staticObjects.push(img);
    if (blocking) this.addBlocker(pos.x, pos.y, w * hitbox, h * hitbox);
    return img;
  }

  createCoins() {
    this.coins.forEach(c => c.destroy?.());
    this.coins = [];
    coinSpawns.forEach((coin, index) => {
      const id = coin.id || `coin_${coin.cell}_${index}`;
      if (this.collectedCoins[id]) return;
      const pos = cellCenter(coin.cell);
      const key = textureKeyFromSrc(coin.src);
      const obj = this.physics.add.image(pos.x + (index % 3) * 28 - 28, pos.y + Math.floor(index % 5) * 18 - 36, key).setDisplaySize(36, 36).setDepth(12);
      obj.value = coin.value;
      obj.coinId = id;
      this.coins.push(obj);
      this.physics.add.overlap(this.player.sprite, obj, () => this.collectCoin(obj));
    });
  }

  collectCoin(obj) {
    if (!obj.active || !this.firebase.isLoggedIn()) return;
    obj.disableBody(true, true);
    this.collectedCoins[obj.coinId] = true;
    this.firebase.markCoinCollected(obj.coinId).catch(() => {});
    this.stats.addReward({ money: obj.value, levelPoints: 0 });
    this.toast.show(`جمعت ${obj.value} ريال`);
  }

  createNpcs() {
    this.npcs.forEach(n => n.sprite.destroy());
    this.npcs = [];
    buildNpcList().forEach(data => {
      const pos = cellCenter(data.cell);
      const key = textureKeyFromSrc(data.src);
      const w = data.w || NPC_W;
      const h = data.h || NPC_H;
      const sprite = this.physics.add.sprite(pos.x, pos.y, key).setDisplaySize(w, h).setDepth(data.fixed ? 40 : 160);
      sprite.body.setSize(Math.max(30, w * 0.45), Math.max(30, h * 0.45));
      if (data.fixed) sprite.body.setImmovable(true).setVelocity(0, 0);
      if (data.blocking) this.addBlocker(pos.x, pos.y, w * 0.55, h * 0.55);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => { this.pointerHitObject = true; this.interactWithNpc(data); });
      const npc = { ...data, sprite, home: pos, target: pos, lastPick: 0, lastAttack: 0 };
      this.npcs.push(npc);
    });
  }

  updateNpcs(time) {
    const night = isNight();
    this.npcs.forEach(npc => {
      const cfg = NPC_CONFIG[npc.kind];
      const visible = cfg.mode === 'always' || (cfg.mode === 'night' && night) || (cfg.mode === 'day' && !night);
      npc.sprite.setVisible(visible).body.enable = visible;
      if (!visible) return;
      const dist = Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, this.player.sprite.x, this.player.sprite.y);
      if (cfg.type === 'enemy' && dist < 650) {
        this.physics.moveToObject(npc.sprite, this.player.sprite, 120);
        if (dist < 60 && time - npc.lastAttack > 1500) {
          npc.lastAttack = time;
          this.stats.damage({ health: cfg.damageHealth || 0, hunger: cfg.damageHunger || 0, money: cfg.damageMoney || 0 });
        }
        return;
      }
      if (npc.fixed) { npc.sprite.body.setVelocity(0, 0); return; }
      if (time - npc.lastPick > 2500 || Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, npc.target.x, npc.target.y) < 18) {
        npc.lastPick = time;
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const radius = Phaser.Math.Between(40, CELL * 0.42);
        npc.target = {
          x: clamp(npc.home.x + Math.cos(angle) * radius, 40, WORLD_WIDTH - 40),
          y: clamp(npc.home.y + Math.sin(angle) * radius, 40, WORLD_HEIGHT - 40)
        };
      }
      this.physics.moveTo(npc.sprite, npc.target.x, npc.target.y, 45);
    });
  }


  bindJoystick() {
    const joy = document.getElementById('joystick');
    const stick = document.getElementById('stick');
    if (!joy || !stick) return;
    const reset = () => {
      this.joystickVector = { x: 0, y: 0 };
      stick.style.left = '35px';
      stick.style.top = '35px';
    };
    const move = clientEvent => {
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientEvent.clientX - cx;
      const dy = clientEvent.clientY - cy;
      const max = rect.width * 0.32;
      const len = Math.min(max, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const sx = Math.cos(angle) * len;
      const sy = Math.sin(angle) * len;
      this.joystickVector = { x: sx / max, y: sy / max };
      stick.style.left = `${35 + sx}px`;
      stick.style.top = `${35 + sy}px`;
    };
    joy.addEventListener('pointerdown', event => {
      joy.setPointerCapture?.(event.pointerId);
      move(event);
    });
    joy.addEventListener('pointermove', event => {
      if (event.buttons || event.pressure > 0) move(event);
    });
    joy.addEventListener('pointerup', reset);
    joy.addEventListener('pointercancel', reset);
    reset();
  }

  nearbyCellKeys(radius = 1) {
    const center = worldToCell(this.player.sprite.x, this.player.sprite.y);
    const keys = new Set();
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const key = cellKey(center.col + dc, center.row + dr);
        if (parseCell(key)) keys.add(key);
      }
    }
    const home = this.getHomeCellKey();
    if (home) keys.add(home);
    return [...keys];
  }

  subscribeVisibleWorldCells(force = false) {
    if (!this.firebase.isLoggedIn()) return;
    const keys = this.nearbyCellKeys(2).sort();
    const next = keys.join('|');
    if (!force && next === this.currentWorldSubscriptionKey) return;
    this.currentWorldSubscriptionKey = next;
    this.firebase.listenWorldCells(keys, (key, cell) => {
      if (!cell) delete this.worldCells[key];
      else this.worldCells[key] = this.normalizeWorld({ [key]: cell })[key] || { owner: cell.owner || '', items: [] };
      this.renderWorldItems();
    });
  }

  renderOnlinePlayers(players) {
    const now = Date.now();
    const seen = new Set();
    Object.entries(players || {}).forEach(([uid, data]) => {
      if (!uid || uid === this.firebase.uid() || !data) return;
      if (data.updatedAt && now - Number(data.updatedAt) > 30000) return;
      seen.add(uid);
      const character = String(data.character || 'woman-1');
      const src = character.startsWith('man-') ? `All-Pic/Characters/man/${character}.png` : `All-Pic/Characters/woman/${character}.png`;
      const key = `character_${character}`;
      const apply = () => {
        let obj = this.remotePlayers.get(uid);
        if (!obj) {
          const sprite = this.physics.add.sprite(Number(data.x) || 0, Number(data.y) || 0, key, 0).setDisplaySize(PLAYER_W, PLAYER_H).setDepth(190);
          const label = this.add.text(sprite.x, sprite.y - 60, data.name || 'لاعب', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', stroke: '#111827', strokeThickness: 4 }).setOrigin(0.5).setDepth(191);
          obj = { sprite, label };
          this.remotePlayers.set(uid, obj);
        }
        obj.sprite.setTexture(key, 0).setPosition(Number(data.x) || obj.sprite.x, Number(data.y) || obj.sprite.y);
        obj.label.setText(data.name || 'لاعب').setPosition(obj.sprite.x, obj.sprite.y - 60);
      };
      this.ensureTexture(src, () => { this.createCharacterFrames(key); apply(); }, key);
    });
    for (const [uid, obj] of this.remotePlayers.entries()) {
      if (!seen.has(uid)) {
        obj.sprite.destroy();
        obj.label.destroy();
        this.remotePlayers.delete(uid);
      }
    }
  }

  addNpcBlockers() {
    this.npcs.forEach(npc => {
      if (!npc.blocking) return;
      const w = npc.w || NPC_W;
      const h = npc.h || NPC_H;
      this.addBlocker(npc.sprite.x, npc.sprite.y, w * 0.55, h * 0.55);
    });
  }


  normalizeWorld(world) {
    const result = {};
    Object.entries(world || {}).forEach(([key, cell]) => {
      const parsed = parseCell(key);
      if (!parsed || !cell || typeof cell !== 'object') return;
      const items = Array.isArray(cell.items) ? cell.items.filter(Boolean) : Object.values(cell.items || {}).filter(Boolean);
      result[parsed.key] = { owner: cell.owner || '', items };
    });
    return result;
  }

  renderWorldItems() {
    this.itemObjects.forEach(obj => obj.destroy());
    this.itemObjects.clear();
    this.blockers.clear(true, true);
    this.drawStaticWorld();
    this.addNpcBlockers();
    Object.entries(this.worldCells).forEach(([key, cell]) => {
      const parsed = parseCell(key);
      if (!parsed) return;
      (cell.items || []).forEach(item => this.createItemObject(item));
    });
    this.updateItemCount();
  }

  createItemObject(item) {
    if (!item || !item.src) return;
    const parsed = parseCell(item.cell);
    if (!parsed) return;
    const baseX = (parsed.col - 1) * CELL;
    const baseY = (parsed.row - 1) * CELL;
    const x = baseX + Number(item.x || CELL / 2);
    const y = baseY + Number(item.y || CELL / 2);
    this.ensureTexture(item.src, key => {
      const img = this.add.image(x, y, key).setDisplaySize(Number(item.w || 50), Number(item.h || 50)).setDepth(20 + Number(item.layer || 1));
      img.setFlip(!!item.flipX, !!item.flipY);
      img.setData('item', item);
      img.setInteractive({ useHandCursor: true, draggable: true });
      img.on('pointerdown', () => { this.pointerHitObject = true; this.selectItem(item.uid); });
      this.input.setDraggable(img);
      img.on('drag', (pointer, dragX, dragY) => {
        if (!this.canEditItem(item)) return;
        const homeKey = this.getHomeCellKey();
        const target = worldToCell(dragX, dragY);
        if (target.key !== homeKey) return;
        img.setPosition(dragX, dragY);
        item.x = clamp(dragX - (target.col - 1) * CELL, -500, 1000);
        item.y = clamp(dragY - (target.row - 1) * CELL, -500, 1000);
        this.updateSelectionBox(img);
      });
      img.on('dragend', () => this.saveCell(item.cell));
      this.itemObjects.set(item.uid, img);
      if (item.blocking) this.addBlocker(x, y, Number(item.w || 50) * 0.75, Number(item.h || 50) * 0.75);
      if (this.selectedItem === item.uid) this.updateSelectionBox(img);
    });
  }

  ensureTexture(src, callback, forcedKey = '') {
    const key = forcedKey || textureKeyFromSrc(src);
    if (this.textures.exists(key)) return callback(key);
    this.load.image(key, src);
    this.load.once('complete', () => callback(key));
    if (!this.load.isLoading()) this.load.start();
  }

  addBlocker(x, y, w, h) {
    const zone = this.add.zone(x, y, w, h).setOrigin(0.5);
    this.physics.add.existing(zone, true);
    this.blockers.add(zone);
  }

  handleWorldClick(pointer) {
    if (!this.firebase.isLoggedIn()) return;
    const world = pointer.positionToCamera(this.cameras.main);
    if (this.eraseMode) return this.eraseAt(world.x, world.y);
    if (this.selectedTile) return this.placeTile(world.x, world.y);
    this.clearSelection();
  }

  placeTile(worldX, worldY) {
    if (!this.requireLogin()) return;
    const cell = worldToCell(worldX, worldY);
    if (!this.canBuildAt(cell.key)) return;
    const current = this.worldCells[cell.key] || { owner: this.firebase.uid(), items: [] };
    this.pushUndo(cell.key);
    if (current.owner && current.owner !== this.firebase.uid()) return this.toast.show('هذه خلية لاعب آخر');
    if ((current.items || []).length >= MAX_ITEMS_PER_CELL) return this.toast.show('وصلت الخلية للحد الأعلى');
    const scale = this.itemScale;
    const tile = this.selectedTile;
    const item = {
      uid: nowId('item'),
      tileId: tile.id,
      category: tile.category,
      name: tile.name,
      src: tile.src,
      cell: cell.key,
      x: clamp(worldX - (cell.col - 1) * CELL, -500, 1000),
      y: clamp(worldY - (cell.row - 1) * CELL, -500, 1000),
      w: Math.max(1, Math.round(tile.w * scale)),
      h: Math.max(1, Math.round(tile.h * scale)),
      baseW: tile.w,
      baseH: tile.h,
      layer: this.activeLayer,
      blocking: this.blockingMode || !!tile.blocking,
      owner: this.firebase.uid(),
      flipX: this.flipXMode,
      flipY: this.flipYMode
    };
    this.worldCells[cell.key] = { owner: this.firebase.uid(), items: [...(current.items || []), item] };
    this.renderWorldItems();
    this.saveCell(cell.key, 'تم حفظ العنصر');
  }

  eraseAt(x, y) {
    const cell = worldToCell(x, y);
    const current = this.worldCells[cell.key];
    if (!current || current.owner !== this.firebase.uid()) return;
    this.pushUndo(cell.key);
    let removed = false;
    current.items = (current.items || []).filter(item => {
      const px = (cell.col - 1) * CELL + item.x;
      const py = (cell.row - 1) * CELL + item.y;
      const hit = Math.abs(px - x) < (item.w || 40) / 2 && Math.abs(py - y) < (item.h || 40) / 2;
      if (hit) removed = true;
      return !hit;
    });
    if (removed) {
      this.renderWorldItems();
      this.saveCell(cell.key, 'تم حذف العنصر');
    }
  }

  canEditItem(item) { return item?.owner === this.firebase.uid(); }

  canBuildAt(key) {
    const homeKey = this.getHomeCellKey();
    if (!homeKey) { this.toast.show('حدد بيتك أولًا'); return false; }
    if (key !== homeKey) { this.toast.show('البناء مسموح داخل خلية بيتك فقط'); return false; }
    const cell = this.worldCells[key];
    if (cell?.owner && cell.owner !== this.firebase.uid()) { this.toast.show('هذه خلية لاعب آخر'); return false; }
    return true;
  }

  sanitizeCell(key) {
    const cell = this.worldCells[key] || { owner: this.firebase.uid(), items: [] };
    return {
      owner: this.firebase.uid(),
      items: (cell.items || []).filter(Boolean).slice(0, MAX_ITEMS_PER_CELL).map(item => ({
        uid: String(item.uid || nowId('item')),
        tileId: String(item.tileId || item.id || 'unknown'),
        category: String(item.category || ''),
        name: String(item.name || item.tileId || 'عنصر'),
        src: String(item.src || ''),
        cell: key,
        x: clamp(item.x, -500, 1000),
        y: clamp(item.y, -500, 1000),
        w: clamp(item.w, 1, 1500),
        h: clamp(item.h, 1, 1500),
        baseW: clamp(item.baseW || item.w, 1, 1500),
        baseH: clamp(item.baseH || item.h, 1, 1500),
        layer: clamp(item.layer || 1, 1, 5),
        blocking: !!item.blocking,
        owner: this.firebase.uid(),
        flipX: !!item.flipX,
        flipY: !!item.flipY
      }))
    };
  }

  async saveCell(key, successMessage = '') {
    try {
      const data = this.sanitizeCell(key);
      if (!data.items.length) {
        delete this.worldCells[key];
        await this.firebase.removeCell(key);
      } else {
        this.worldCells[key] = data;
        await this.firebase.saveCell(key, data);
      }
      if (successMessage) this.toast.show(successMessage, 1400);
      this.updateItemCount();
    } catch (err) {
      console.error('Firebase cell save error:', err);
      this.toast.show('فشل حفظ الخلية');
    }
  }


  pushUndo(cellKey) {
    if (!cellKey) return;
    const snapshot = this.worldCells[cellKey] ? JSON.parse(JSON.stringify(this.worldCells[cellKey])) : null;
    this.undoStack.push({ cellKey, snapshot });
    if (this.undoStack.length > 30) this.undoStack.shift();
  }

  undoLast() {
    const last = this.undoStack.pop();
    if (!last) return this.toast.show('لا يوجد شيء لاستعادته');
    if (last.snapshot) this.worldCells[last.cellKey] = last.snapshot;
    else delete this.worldCells[last.cellKey];
    this.renderWorldItems();
    this.saveCell(last.cellKey, 'تمت الاستعادة');
  }

  getSelectedItemData() {
    const obj = this.itemObjects.get(this.selectedItem);
    return obj?.getData('item') || null;
  }

  copySelected() {
    const item = this.getSelectedItemData();
    if (!item) return this.toast.show('حدد عنصرًا أولًا');
    this.copyBuffer = JSON.parse(JSON.stringify(item));
    this.toast.show('تم نسخ العنصر');
  }

  pasteCopied() {
    if (!this.copyBuffer) return this.toast.show('لا يوجد عنصر منسوخ');
    if (!this.canBuildAt(this.getHomeCellKey())) return;
    const key = this.getHomeCellKey();
    const cell = this.worldCells[key] || { owner: this.firebase.uid(), items: [] };
    if ((cell.items || []).length >= MAX_ITEMS_PER_CELL) return this.toast.show('وصلت الخلية للحد الأعلى');
    this.pushUndo(key);
    const item = {
      ...this.copyBuffer,
      uid: nowId('item'),
      cell: key,
      owner: this.firebase.uid(),
      x: clamp((this.copyBuffer.x || CELL / 2) + 20, -500, 1000),
      y: clamp((this.copyBuffer.y || CELL / 2) + 20, -500, 1000)
    };
    this.worldCells[key] = { owner: this.firebase.uid(), items: [...(cell.items || []), item] };
    this.renderWorldItems();
    this.saveCell(key, 'تم لصق العنصر');
  }

  resizeSelectedTo(worldX, worldY) {
    const obj = this.itemObjects.get(this.selectedItem);
    if (!obj) return;
    const item = obj.getData('item');
    if (!this.canEditItem(item)) return;
    const baseW = item.baseW || item.w || 1;
    const baseH = item.baseH || item.h || 1;
    const desiredW = Math.abs(worldX - obj.x) * 2;
    const desiredH = Math.abs(worldY - obj.y) * 2;
    const nextScale = clamp(Math.max(desiredW / baseW, desiredH / baseH), ITEM_SCALE_MIN, ITEM_SCALE_MAX);
    item.w = Math.max(1, Math.round(baseW * nextScale));
    item.h = Math.max(1, Math.round(baseH * nextScale));
    obj.setDisplaySize(item.w, item.h);
    this.updateSelectionBox(obj);
  }


  selectItem(uid) {
    this.selectedItem = uid;
    const obj = this.itemObjects.get(uid);
    if (!obj) return;
    this.updateSelectionBox(obj);
    const item = obj.getData('item');
    document.getElementById('selectedPreviewBox')?.classList.remove('hidden');
    const img = document.getElementById('selectedItemPreview');
    if (img) img.src = item.src;
  }

  updateSelectionBox(obj) {
    this.selectionBox.setPosition(obj.x, obj.y).setSize(obj.displayWidth + 12, obj.displayHeight + 12).setVisible(true);
    this.resizeHandle?.setPosition(obj.x + obj.displayWidth / 2 + 9, obj.y + obj.displayHeight / 2 + 9).setVisible(true);
  }

  clearSelection() {
    this.selectedItem = null;
    this.selectionBox.setVisible(false);
    this.resizeHandle?.setVisible(false);
    document.getElementById('selectedPreviewBox')?.classList.add('hidden');
  }

  scaleSelected(dir) {
    const obj = this.itemObjects.get(this.selectedItem);
    if (!obj) return;
    const item = obj.getData('item');
    if (!this.canEditItem(item)) return;
    this.pushUndo(item.cell);
    const currentScale = clamp((item.w || item.baseW || 1) / (item.baseW || item.w || 1), ITEM_SCALE_MIN, ITEM_SCALE_MAX);
    const nextScale = clamp(currentScale + dir * ITEM_SCALE_STEP, ITEM_SCALE_MIN, ITEM_SCALE_MAX);
    item.w = Math.max(1, Math.round((item.baseW || item.w) * nextScale));
    item.h = Math.max(1, Math.round((item.baseH || item.h) * nextScale));
    obj.setDisplaySize(item.w, item.h);
    this.updateSelectionBox(obj);
    this.saveCell(item.cell);
  }

  deleteSelected() {
    const obj = this.itemObjects.get(this.selectedItem);
    if (!obj) return;
    const item = obj.getData('item');
    if (!this.canEditItem(item)) return;
    const cell = this.worldCells[item.cell];
    if (!cell) return;
    this.pushUndo(item.cell);
    cell.items = (cell.items || []).filter(x => x.uid !== item.uid);
    this.clearSelection();
    this.renderWorldItems();
    this.saveCell(item.cell, 'تم حذف العنصر');
  }

  deleteAllInHomeCell() {
    const key = this.getHomeCellKey();
    if (!key) return this.toast.show('حدد بيتك أولًا');
    const cell = this.worldCells[key];
    if (!cell || cell.owner !== this.firebase.uid()) return this.toast.show('لا يوجد عناصر لك هنا');
    this.pushUndo(key);
    cell.items = [];
    this.renderWorldItems();
    this.saveCell(key, 'تم حذف كل العناصر في الخلية');
  }

  updateItemCount() {
    const count = Object.values(this.worldCells).flatMap(c => c.items || []).filter(i => i.owner === this.firebase.uid()).length;
    const el = document.getElementById('myItemsCount');
    if (el) el.textContent = String(count);
  }


  saveHouseName(name) {
    if (!this.requireLogin()) return;
    const clean = String(name || '').replace(/[<>]/g, '').trim().slice(0, 30);
    if (!clean) return this.toast.show('اكتب اسم بيتك أولًا');
    this.firebase.saveHouseProfile({ name: clean, homeCell: this.getHomeCellKey() }).then(() => {
      this.toast.show('تم حفظ اسم البيت');
    }).catch(() => this.toast.show('فشل حفظ اسم البيت'));
  }

  updateVisitedHousePanel() {
    const box = document.getElementById('visitedHouseBox');
    if (!box) return;
    box.classList.add('hidden');
    const cell = worldToCell(this.player.sprite.x, this.player.sprite.y).key;
    const owner = this.worldCells[cell]?.owner || '';
    if (!owner || owner === this.firebase.uid()) return;
    const profile = this.houseProfiles[owner];
    if (!profile) return;
    const ratings = Object.values(this.houseRatings[owner] || {}).map(Number).filter(n => n >= 1 && n <= 5);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    box.innerHTML = `<b>${profile.name || 'بيت لاعب'}</b><small>${avg.toFixed(1)} من 5 | عدد التقييمات: ${ratings.length}</small><div class="starsBox">${[1,2,3,4,5].map(n => `<button class="starBtn" data-stars="${n}" type="button">★</button>`).join('')}</div>`;
    box.querySelectorAll('.starBtn').forEach(btn => btn.onclick = () => this.firebase.rateHouse(owner, Number(btn.dataset.stars)).then(() => this.toast.show('تم تقييم البيت')).catch(() => this.toast.show('فشل حفظ التقييم')));
    box.classList.remove('hidden');
  }


  setHomeHere() {
    if (!this.requireLogin()) return;
    const cell = worldToCell(this.player.sprite.x, this.player.sprite.y);
    const existing = this.worldCells[cell.key];
    if (existing?.owner && existing.owner !== this.firebase.uid()) return this.toast.show('هذه خلية لاعب آخر');
    this.home = { cell: cell.key, x: this.player.sprite.x, y: this.player.sprite.y };
    this.firebase.saveHome(this.home).then(() => this.toast.show(`تم تحديد بيتك في ${cell.key}`)).catch(() => this.toast.show('فشل حفظ البيت'));
    if (!this.worldCells[cell.key]) this.worldCells[cell.key] = { owner: this.firebase.uid(), items: [] };
    this.applyHome(this.home);
  }

  applyHome(home) {
    if (!home?.cell || !parseCell(home.cell)) {
      this.homeMarker.setVisible(false);
      document.querySelectorAll('[data-home-cell]').forEach(el => el.textContent = 'لم تحدد بيتك بعد');
      return;
    }
    const pos = cellCenter(home.cell);
    this.homeMarker.setPosition(pos.x, pos.y).setVisible(true);
    document.querySelectorAll('[data-home-cell]').forEach(el => el.textContent = home.cell);
  }

  goHome() {
    const key = this.getHomeCellKey();
    if (!key) return this.toast.show('لم تحدد بيتك بعد');
    const pos = cellCenter(key);
    this.player.sprite.setPosition(pos.x, pos.y);
    this.cameras.main.centerOn(pos.x, pos.y);
  }

  getHomeCellKey() { return parseCell(this.home?.cell)?.key || ''; }

  setWalkMode(on) {
    this.walkMode = !!on;
    document.body.classList.toggle('walking', this.walkMode);
    document.getElementById('joystick')?.classList.toggle('hidden', !this.walkMode);
    this.cameras.main.setZoom(this.walkMode ? WALK_BASE_ZOOM : BASE_ZOOM);
    this.toast.show(this.walkMode ? 'تم تفعيل التجول' : 'تم إيقاف التجول');
  }

  zoomStep(dir) {
    const cam = this.cameras.main;
    const min = this.walkMode ? WALK_MIN_ZOOM : MIN_ZOOM;
    const max = this.walkMode ? WALK_MAX_ZOOM : MAX_ZOOM;
    cam.setZoom(clamp(cam.zoom * (dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP), min, max));
  }

  jumpToCell(input) {
    const parsed = parseCell(input);
    if (!parsed) return this.toast.show('اكتب خلية صحيحة مثل M5');
    const pos = cellCenter(parsed);
    this.player.sprite.setPosition(pos.x, pos.y);
    this.cameras.main.centerOn(pos.x, pos.y);
  }

  updateHudCell() {
    const cell = worldToCell(this.player.sprite.x, this.player.sprite.y);
    document.querySelectorAll('[data-stat="currentCell"]').forEach(el => el.textContent = cell.key);
    const current = document.getElementById('currentCellText');
    if (current) current.textContent = cell.key;
    this.updateVisitedHousePanel();
  }

  setCharacter(id) {
    const characterId = String(id || 'woman-1');
    const src = characterId.startsWith('man-') ? `All-Pic/Characters/man/${characterId}.png` : `All-Pic/Characters/woman/${characterId}.png`;
    const key = `character_${characterId}`;
    this.ensureTexture(src, () => {
      this.createCharacterFrames(key);
      this.player.setCharacter(characterId);
      this.firebase.saveProfilePatch({ character: characterId }).catch(() => {});
    }, key);
  }

  createCharacterFrames(key) {
    const tex = this.textures.get(key);
    if (!tex || tex.getFrameNames().includes('0')) return;
    const img = tex.getSourceImage();
    const fw = Math.floor(img.width / 4);
    const fh = Math.floor(img.height / 4);
    if (!fw || !fh) return;
    for (let i = 0; i < 16; i++) {
      try { tex.add(i, 0, (i % 4) * fw, Math.floor(i / 4) * fh, fw, fh); } catch {}
    }
  }

  interactWithNpc(npc) {
    if (!this.requireLogin()) return;
    if (npc.type === 'shop') return this.openShop(npc);
    if (npc.kind === 'dateHouse') return this.dialog.show('بيت صاحبة الضيوف', 'ابحث عن صاحبة البيت لأجل إرسالك لمهمة', [{ label: 'حسنًا' }]);
    if (npc.type === 'animal') return this.dialog.show(npc.label, 'حيوان مسالم يتجول في الخريطة.', [{ label: 'حسنًا' }]);
    return this.handleQuestNpc(npc);
  }

  openShop(npc) {
    const items = SHOP_ITEMS[npc.shop] || [];
    const actions = items.map(item => ({
      close: false,
      html: `<img src="${item.img}" alt=""><span><b>${item.name}</b><small>${item.type === 'food' ? 'يزيد الجوع' : 'يزيد الصحة'} +${item.value}%</small></span><b>${item.price} ريال</b>`,
      className: 'shopItemBtn',
      onClick: () => {
        if (!this.stats.spend(item.price)) return;
        this.inventory.add({ id: item.id, name: item.name, type: item.type, value: item.value, img: item.img });
        this.toast.show(`تم شراء ${item.name} ووضعه في الحقيبة`);
      }
    }));
    actions.push({ label: 'إغلاق' });
    this.dialog.show(npc.label, 'اختر العنصر الذي تريد شراءه.', actions);
  }

  handleQuestNpc(npc) {
    const questId = npc.quest;
    const quest = QUESTS[questId];
    const status = this.stats.questStatus(questId);
    const complete = () => {
      this.stats.setQuestStatus(questId, 'done');
      this.stats.addReward(QUEST_REWARD);
      if (quest.item) this.inventory.removeOne(quest.item.id);
      this.dialog.show(quest.title, `تم إكمال المهمة. حصلت على ${QUEST_REWARD.money} ريال و ${QUEST_REWARD.levelPoints} نقطة.`, [{ label: 'تم' }]);
    };

    if (status === 'done') return this.dialog.show(quest.title, 'أكملت هذه المهمة سابقًا.', [{ label: 'حسنًا' }]);

    if (questId === 'camelQuest') {
      if (npc.kind === 'shepherd') {
        if (this.inventory.has('camel')) return complete();
        this.stats.setQuestStatus(questId, 'started');
        return this.dialog.show(quest.title, 'أبحث عن جملي الضائع. إذا وجدته أعده لي.', [{ label: 'حسنًا' }]);
      }
      if (npc.kind === 'camel') {
        this.stats.setQuestStatus(questId, 'hasItem');
        this.inventory.add(quest.item);
        return this.dialog.show(quest.title, 'تمت إضافة الجمل إلى الحقيبة. ارجع إلى الراعي.', [{ label: 'حسنًا' }]);
      }
    }

    if (questId === 'ruinsQuest') {
      if (npc.kind === 'ruins') {
        this.stats.setQuestStatus(questId, 'found');
        return this.dialog.show(quest.title, 'تم فحص الآثار. ارجع إلى الباحثة الأثرية.', [{ label: 'حسنًا' }]);
      }
      if (npc.kind === 'archaeologist') {
        if (status === 'found') return complete();
        this.stats.setQuestStatus(questId, 'started');
        return this.dialog.show(quest.title, 'ابحث عن الآثار ثم أخبرني بمكانها.', [{ label: 'حسنًا' }]);
      }
    }

    if (questId === 'plantQuest') {
      if (npc.kind === 'rarePlant') {
        this.stats.setQuestStatus(questId, 'hasItem');
        this.inventory.add(quest.item);
        return this.dialog.show(quest.title, 'تمت إضافة النبتة النادرة إلى الحقيبة. سلمها للعطارة.', [{ label: 'حسنًا' }]);
      }
      if (npc.kind === 'herbalist') {
        if (this.inventory.has('rarePlant')) return complete();
        this.stats.setQuestStatus(questId, 'started');
        return this.dialog.show(quest.title, 'أحتاج نبتة نادرة. ابحث عنها ثم أحضرها لي.', [{ label: 'حسنًا' }]);
      }
    }

    if (questId === 'messageQuest') {
      if (npc.kind === 'messenger') {
        this.stats.setQuestStatus(questId, 'hasItem');
        this.inventory.add(quest.item);
        return this.dialog.show(quest.title, 'تمت إضافة الرسالة إلى الحقيبة. أوصلها إلى صديقي.', [{ label: 'حسنًا' }]);
      }
      if (npc.kind === 'messengerFriend') {
        if (this.inventory.has('message_note')) return complete();
        return this.dialog.show(quest.title, 'سمعت أن صاحبي يريد إرسال رسالة، ابحث عنه أولًا.', [{ label: 'حسنًا' }]);
      }
    }

    if (questId === 'fireQuest') {
      if (npc.kind === 'well') {
        this.stats.setQuestStatus(questId, 'hasItem');
        this.inventory.add(quest.item);
        return this.dialog.show(quest.title, 'تم تعبئة الماء في السطل. اذهب لصاحب الخيمة.', [{ label: 'حسنًا' }]);
      }
      if (npc.kind === 'fireMan') {
        if (this.inventory.has('water_bucket')) return complete();
        this.stats.setQuestStatus(questId, 'started');
        return this.dialog.show(quest.title, 'خيمتي تحترق. ابحث عن بئر واملأ السطل بالماء.', [{ label: 'حسنًا' }]);
      }
      if (npc.kind === 'burningTent') return this.dialog.show(quest.title, 'الخيمة تحترق. تحتاج ماء من البئر.', [{ label: 'حسنًا' }]);
    }

    if (questId === 'dateQuest') {
      if (npc.kind === 'palm') {
        this.stats.setQuestStatus(questId, 'hasItem');
        this.inventory.add(quest.item);
        return this.dialog.show(quest.title, 'تمت إضافة التمر إلى الحقيبة. ارجع إلى صاحبة الضيوف.', [{ label: 'حسنًا' }]);
      }
      if (npc.kind === 'dateWoman') {
        if (this.inventory.has('dates')) return complete();
        this.stats.setQuestStatus(questId, 'started');
        return this.dialog.show(quest.title, 'سيأتيني ضيوف وأحتاج تمرًا. اذهب إلى النخلة وأحضر تمرًا.', [{ label: 'حسنًا' }]);
      }
    }

    this.dialog.show(npc.label, 'لا يوجد تفاعل جديد الآن.', [{ label: 'حسنًا' }]);
  }
}
