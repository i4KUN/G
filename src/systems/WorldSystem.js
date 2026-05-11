import { CELL, WORLD_COLS, WORLD_ROWS, WORLD_WIDTH, WORLD_HEIGHT, DEFAULT_FLOOR_SRC, edgeImagesSrc, fixedGroundTiles, fixedAnimalTiles, randomSceneryTiles, tileMap, assetUrl } from '../data/constants.js';
import { cellFromWorld, parseCell, cellCenter, uid } from '../core/utils.js';

export class WorldSystem {
  constructor(scene, loader, firebase, state) {
    this.scene = scene; this.loader = loader; this.firebase = firebase; this.state = state;
    this.itemsByCell = new Map(); this.itemSprites = new Map(); this.loadedCells = new Set(); this.unsubCells = new Map();
    this.blockers = scene.physics.add.staticGroup();
    this.layers = { floor: scene.add.layer().setDepth(0), fixed: scene.add.layer().setDepth(1000), items: scene.add.layer().setDepth(3000), grid: scene.add.layer().setDepth(9000) };
  }
  create() { this.createFloors(); this.createFixedObjects(); this.drawGrid(); }
  createFloors() {
    this.loader.ensure(DEFAULT_FLOOR_SRC, key => {
      for (let row = 1; row <= WORLD_ROWS; row++) for (let col = 1; col <= WORLD_COLS; col++) {
        const srcKey = this.getEdgeKey(col, row); const x = (col - .5) * CELL; const y = (row - .5) * CELL;
        if (srcKey) this.loader.ensure(srcKey, k => this.layers.floor.add(this.scene.add.image(x, y, k || key).setDisplaySize(CELL, CELL)));
        else this.layers.floor.add(this.scene.add.image(x, y, key).setDisplaySize(CELL, CELL));
      }
    });
    fixedGroundTiles.forEach(t => this.loader.ensure(t.src, key => { const p = cellCenter(t.cell); this.layers.floor.add(this.scene.add.image(p.x, p.y, key).setDisplaySize(CELL, CELL).setDepth(5)); }));
  }
  getEdgeKey(col, row) {
    if (col === 1 && row === 1) return edgeImagesSrc.topLeft;
    if (col === WORLD_COLS && row === 1) return edgeImagesSrc.topRight;
    if (col === 1 && row === WORLD_ROWS) return edgeImagesSrc.bottomLeft;
    if (col === WORLD_COLS && row === WORLD_ROWS) return edgeImagesSrc.bottomRight;
    if (row === 1) return edgeImagesSrc.top; if (row === WORLD_ROWS) return edgeImagesSrc.bottom;
    if (col === 1) return edgeImagesSrc.left; if (col === WORLD_COLS) return edgeImagesSrc.right; return '';
  }
  createFixedObjects() {
    fixedAnimalTiles.forEach((t, i) => this.loader.ensure(t.src, key => { const p = cellCenter(t.cell); this.layers.fixed.add(this.scene.add.image(p.x, p.y, key).setDisplaySize(120, 120).setDepth(1200 + i)); }));
    randomSceneryTiles.forEach((t, i) => this.loader.ensure(t.src, key => {
      if (!key && t.fallback) return this.loader.ensure(t.fallback, k => this.addScenery(t, k, i));
      this.addScenery(t, key, i);
    }));
  }
  addScenery(t, key, i) {
    if (!key) return; const p = cellCenter(t.cell); const img = this.scene.add.image(p.x, p.y, key).setDisplaySize(t.w, t.h).setDepth(1400 + i); this.layers.fixed.add(img);
    if (t.blocking) { this.addBlocker(p.x, p.y, t.w * (t.hitbox || 1), t.h * (t.hitbox || 1)); }
  }
  drawGrid() {
    const g = this.scene.add.graphics().setDepth(9100); g.lineStyle(1, 0xffffff, 0.18);
    for (let x = 0; x <= WORLD_WIDTH; x += CELL) g.lineBetween(x, 0, x, WORLD_HEIGHT);
    for (let y = 0; y <= WORLD_HEIGHT; y += CELL) g.lineBetween(0, y, WORLD_WIDTH, y);
    this.layers.grid.add(g);
  }
  async loadCells(keys) {
    for (const key of keys) {
      if (this.loadedCells.has(key)) continue; this.loadedCells.add(key);
      const unsub = this.firebase.onValue(`world/${key}`, data => this.applyCellData(key, data));
      this.unsubCells.set(key, unsub);
      if (!this.firebase.ready) this.applyCellData(key, null);
    }
  }
  applyCellData(cellKey, data) {
    const items = data?.items ? Object.values(data.items) : [];
    this.itemsByCell.set(cellKey, items.map(it => this.sanitizeItem(it, cellKey)).filter(Boolean));
    this.renderCell(cellKey);
  }
  sanitizeItem(item, cellKey) {
    if (!item || !tileMap[item.tileId]) return null;
    return { uid: item.uid || uid('item'), tileId: item.tileId, owner: item.owner || '', ownerName: item.ownerName || '', cell: item.cell || cellKey, x: Number(item.x) || cellCenter(cellKey).x, y: Number(item.y) || cellCenter(cellKey).y, w: Number(item.w) || tileMap[item.tileId].w, h: Number(item.h) || tileMap[item.tileId].h, scale: Number(item.scale) || 1, layer: Number(item.layer) || 1, blocking: !!item.blocking, flipX: !!item.flipX, flipY: !!item.flipY, updatedAt: item.updatedAt || Date.now() };
  }
  renderCell(cellKey) {
    [...this.itemSprites.entries()].forEach(([id, obj]) => { if (obj.cell === cellKey) { obj.sprite.destroy(); obj.blocker?.destroy(); this.itemSprites.delete(id); } });
    const items = this.itemsByCell.get(cellKey) || [];
    items.sort((a,b) => (a.layer - b.layer) || (a.y - b.y));
    for (const item of items) this.addItemSprite(item);
  }
  addItemSprite(item) {
    const tile = tileMap[item.tileId]; if (!tile) return;
    this.loader.ensure(tile.image, key => {
      if (!key) return;
      const sprite = this.scene.add.image(item.x, item.y, key).setDisplaySize(item.w * item.scale, item.h * item.scale).setOrigin(.5).setDepth(3000 + item.layer * 100 + item.y / 10000);
      sprite.setFlipX(!!item.flipX); sprite.setFlipY(!!item.flipY); sprite.setInteractive({ draggable: true }); sprite.setData('item', item); this.layers.items.add(sprite);
      let blocker = null; if (item.blocking) { blocker = this.addBlocker(item.x, item.y, item.w * item.scale, item.h * item.scale); }
      this.itemSprites.set(item.uid, { sprite, blocker, cell: item.cell });
    });
  }
  addBlocker(x, y, w, h) {
    const zone = this.scene.add.zone(x, y, w, h).setOrigin(0.5);
    this.scene.physics.add.existing(zone, true);
    zone.body.setSize(w, h);
    this.blockers.add(zone);
    return zone;
  }
  getCellItems(cellKey) { return this.itemsByCell.get(cellKey) || []; }
  getAllItems() { return [...this.itemsByCell.values()].flat(); }
  async saveCell(cellKey, items) {
    const clean = items.map(i => this.sanitizeItem(i, cellKey)).filter(Boolean).slice(0, 150);
    this.itemsByCell.set(cellKey, clean); this.renderCell(cellKey);
    if (this.firebase.loggedIn()) await this.firebase.set(`world/${cellKey}`, { items: Object.fromEntries(clean.map(i => [i.uid, i])), updatedAt: Date.now() });
  }
  async addItem(tile, x, y, options = {}) {
    const cell = cellFromWorld(x, y); if (!cell) return null;
    const items = this.getCellItems(cell.key); if (items.length >= 150) throw new Error('الخلية ممتلئة');
    const item = { uid: uid('item'), tileId: tile.id, owner: this.firebase.uid(), ownerName: this.state.get().displayName || '', cell: cell.key, x, y, w: tile.w, h: tile.h, scale: options.scale || .7, layer: options.layer || 1, blocking: options.blocking ?? tile.blocking, flipX: !!options.flipX, flipY: !!options.flipY, updatedAt: Date.now() };
    await this.saveCell(cell.key, [...items, item]); return item;
  }
  async deleteItem(uidValue) {
    const found = this.getAllItems().find(i => i.uid === uidValue); if (!found) return;
    await this.saveCell(found.cell, this.getCellItems(found.cell).filter(i => i.uid !== uidValue));
  }
}
