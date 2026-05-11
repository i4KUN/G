import { WORLD_WIDTH, WORLD_HEIGHT, BUILD_ZOOM, WALK_ZOOM, MIN_ZOOM, MAX_ZOOM, characterList } from '../data/constants.js';
import { gameState } from '../core/GameState.js';
import { AssetLoader } from '../core/AssetLoader.js';
import { cellCenter, cellFromWorld, nearbyCells, parseCell, clamp } from '../core/utils.js';
import { firebaseClient } from '../firebase/firebaseClient.js';
import { Player } from '../entities/Player.js';
import { WorldSystem } from '../systems/WorldSystem.js';
import { BuildSystem } from '../systems/BuildSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { NpcSystem } from '../systems/NpcSystem.js';
import { MoneySystem } from '../systems/MoneySystem.js';
import { UISystem } from '../ui/UISystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.lastProfileSave = 0;
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).setZoom(BUILD_ZOOM);

    this.loader2 = new AssetLoader(this);
    this.ui = new UISystem(gameState, firebaseClient);
    this.world = new WorldSystem(this, this.loader2, firebaseClient, gameState);
    this.world.create();

    const d = gameState.get();
    const start = d.lastX && d.lastY ? { x: d.lastX, y: d.lastY } : cellCenter(d.homeCell || d.lastCell || 'J10');
    const character = characterList.find(c => c.id === d.characterId) || characterList[0];

    this.player = new Player(this, start.x, start.y, character);
    this.inventory = new InventorySystem(gameState, firebaseClient, this.ui);
    this.quests = new QuestSystem(gameState, this.inventory, this.ui);
    this.npcSystem = new NpcSystem(this, this.loader2, firebaseClient, gameState, this.inventory, this.quests, this.ui);
    this.moneySystem = new MoneySystem(this, this.loader2, gameState, firebaseClient, this.ui);
    this.build = new BuildSystem(this, this.world, gameState, this.ui, firebaseClient);
    this.build.bind();
    this.ui.attach(this, this.build, this.inventory);

    this.npcSystem.create();
    this.moneySystem.create();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.walkMode = false;

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        gameState.tick(Date.now());
        this.syncPlayerState();
      }
    });

    this.physics.add.collider(this.player.sprite, this.world.blockers);
    this.installAudioResume();
    this.installCameraDrag();
    this.installMobileJoystick();
    this.listenAuth();
    this.loadCurrentCells();
    this.hideLoader();
  }

  hideLoader() {
    setTimeout(() => document.getElementById('loadingScreen')?.classList.add('hidden'), 500);
  }

  listenAuth() {
    firebaseClient.onUser(async user => {
      this.world.resetOnlineCells();
      this.npcSystem.resetOnlineSubscription();

      if (!user) {
        this.loadCurrentCells();
        return;
      }

      await this.loadProfile();
      await this.inventory.load();
      await this.moneySystem.load();
      this.npcSystem.enableOnlineRead();
      this.loadCurrentCells(true);
      this.ui.toast('تم تحميل بياناتك');
    });
  }

  async loadProfile() {
    const uid = firebaseClient.uid();
    if (!uid) return;

    const inv = await firebaseClient.get(`inventory/${uid}/gameState`).catch(() => null);
    const home = await firebaseClient.get(`homes/${uid}`).catch(() => null);
    const prof = await firebaseClient.get(`profiles/${uid}`).catch(() => null);

    gameState.set({
      ...(inv || {}),
      homeCell: home?.homeCell || inv?.homeCell || gameState.get().homeCell,
      displayName: prof?.displayName || gameState.get().displayName,
      characterId: inv?.characterId || gameState.get().characterId
    });

    const d = gameState.get();
    if (d.lastX && d.lastY) this.player.setPosition(d.lastX, d.lastY);
    const c = characterList.find(x => x.id === d.characterId);
    if (c) this.player.setCharacter(c);
  }

  async saveProfile(force = false) {
    const uid = firebaseClient.uid();
    if (!uid) return;

    const now = Date.now();
    if (!force && now - this.lastProfileSave < 4500) return;
    this.lastProfileSave = now;

    const d = gameState.get();
    await firebaseClient.set(`inventory/${uid}/gameState`, d).catch(() => {});
    if (d.homeCell) {
      await firebaseClient.set(`homes/${uid}`, {
        homeCell: d.homeCell,
        x: d.lastX,
        y: d.lastY,
        updatedAt: Date.now()
      }).catch(() => {});
    }
  }

  syncPlayerState() {
    if (!this.player?.sprite) return;

    const cell = cellFromWorld(this.player.x, this.player.y);
    const d = gameState.get();
    let visited = d.visitedCells || [];

    if (cell && !visited.includes(cell.key)) visited = [...visited, cell.key].slice(-50);

    const patch = {
      lastX: Math.round(this.player.x),
      lastY: Math.round(this.player.y),
      lastCell: cell?.key || d.lastCell,
      visitedCells: visited
    };

    if (patch.lastX !== d.lastX || patch.lastY !== d.lastY || patch.lastCell !== d.lastCell || visited !== d.visitedCells) {
      gameState.set(patch);
      this.loadCurrentCells();
      this.saveProfile(false);
    }
  }

  loadCurrentCells(force = false) {
    const d = gameState.get();
    const center = d.lastCell || 'J10';
    const extras = [d.homeCell, d.lastBuildCell].filter(Boolean);
    const keys = nearbyCells(center, 3, extras);
    this.world.loadCells(keys, force);
  }

  update() {
    if (!this.player?.ready) return;
    this.player.update(this.cursors, this.keys);
    this.npcSystem.update(this.player, this.walkMode);
    this.moneySystem.update(this.player, this.walkMode);
  }

  setWalkMode(active) {
    this.walkMode = !!active;
    this.player.setWalkMode(this.walkMode);
    document.getElementById('stopWalkBtn')?.classList.toggle('hidden', !this.walkMode);
    document.getElementById('joystick')?.classList.toggle('hidden', !this.walkMode);
    this.cameras.main.setZoom(this.walkMode ? WALK_ZOOM : BUILD_ZOOM);

    if (this.walkMode) this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    else {
      this.cameras.main.stopFollow();
      this.player.mobileVector = { x: 0, y: 0 };
    }
  }

  zoomBy(factor) {
    const z = clamp(this.cameras.main.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.cameras.main.setZoom(z);
  }

  goHome() {
    const home = gameState.get().homeCell;
    if (!home) return this.ui.toast('لم تحدد منزلك');
    const p = cellCenter(home);
    this.player.setPosition(p.x, p.y);
    this.cameras.main.centerOn(p.x, p.y);
    this.setWalkMode(false);
    this.syncPlayerState();
  }

  setHomeHere() {
    if (!firebaseClient.loggedIn()) return this.ui.toast('سجل دخولك أولاً');
    const cell = cellFromWorld(this.player.x, this.player.y) || cellFromWorld(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y);
    if (!cell) return;
    gameState.set({ homeCell: cell.key });
    this.saveProfile(true);
    this.loadCurrentCells(true);
    this.ui.toast(`تم تحديد البيت: ${cell.key}`);
  }

  jumpToCell(value) {
    const cell = parseCell(value);
    if (!cell) return this.ui.toast('اكتب خلية صحيحة مثل K10 داخل خريطة 20×20');
    const p = cellCenter(cell.key);
    this.player.setPosition(p.x, p.y);
    this.cameras.main.centerOn(p.x, p.y);
    this.setWalkMode(false);
    this.syncPlayerState();
    this.world.loadCells([cell.key], true);
  }

  setCharacter(c) {
    this.player.setCharacter(c);
    this.saveProfile(true);
  }

  installAudioResume() {
    const resume = () => {
      const ctx = this.sound?.context;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    };
    this.input.once('pointerdown', resume);
    window.addEventListener('keydown', resume, { once: true });
  }

  installCameraDrag() {
    let dragging = false;
    let last = null;

    this.input.on('pointerdown', p => {
      if (!this.walkMode && !this.build.selectedTile && !this.build.eraser && !this.build.justSelected) {
        dragging = true;
        last = { x: p.x, y: p.y };
      }
    });

    this.input.on('pointermove', p => {
      if (!dragging || this.walkMode) return;
      const cam = this.cameras.main;
      cam.scrollX -= (p.x - last.x) / cam.zoom;
      cam.scrollY -= (p.y - last.y) / cam.zoom;
      last = { x: p.x, y: p.y };
    });

    this.input.on('pointerup', () => dragging = false);
    this.input.on('wheel', (p, objs, dx, dy) => this.zoomBy(dy > 0 ? 1 / 1.12 : 1.12));
  }

  installMobileJoystick() {
    const joy = document.getElementById('joystick');
    const stick = document.getElementById('stick');
    if (!joy || !stick) return;

    let active = false;
    const max = 46;

    const move = ev => {
      if (!active || !this.walkMode) return;
      const touch = ev.touches?.[0] || ev;
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = touch.clientX - cx;
      let dy = touch.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > max) {
        dx = dx / dist * max;
        dy = dy / dist * max;
      }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      this.player.mobileVector = { x: dx / max, y: dy / max };
      ev.preventDefault?.();
    };

    const end = () => {
      active = false;
      stick.style.transform = 'translate(0, 0)';
      this.player.mobileVector = { x: 0, y: 0 };
    };

    joy.addEventListener('pointerdown', ev => { active = true; joy.setPointerCapture?.(ev.pointerId); move(ev); });
    joy.addEventListener('pointermove', move);
    joy.addEventListener('pointerup', end);
    joy.addEventListener('pointercancel', end);
    joy.addEventListener('touchstart', ev => { active = true; move(ev); }, { passive: false });
    joy.addEventListener('touchmove', move, { passive: false });
    joy.addEventListener('touchend', end);
  }
}
