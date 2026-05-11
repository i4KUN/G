import { tileMap, categories, HOME_BUILD_RADIUS_CELLS } from '../data/constants.js';
import { cellFromWorld, parseCell } from '../core/utils.js';

export class BuildSystem {
  constructor(scene, world, state, ui, firebase) {
    this.scene = scene; this.world = world; this.state = state; this.ui = ui; this.firebase = firebase;
    this.selectedTile = null; this.activeCategory = ''; this.activeLayer = 1; this.itemScale = .7; this.blockingMode = false; this.flipX = false; this.flipY = false; this.eraser = false; this.selectedItem = null; this.copyBuffer = null;
  }
  bind() {
    this.scene.input.on('pointerdown', pointer => this.onPointer(pointer));
    this.scene.input.on('drag', (pointer, obj, dragX, dragY) => this.onDrag(obj, dragX, dragY));
    this.scene.input.on('dragend', (pointer, obj) => this.onDragEnd(obj));
    window.addEventListener('keydown', e => this.onKey(e));
  }
  canBuildAt(x, y) {
    if (!this.firebase.loggedIn()) { this.ui.toast('سجل دخولك أولاً'); return false; }
    const home = this.state.get().homeCell; if (!home) { this.ui.toast('حدد منزلك أولاً'); return false; }
    const a = parseCell(home); const b = cellFromWorld(x, y); if (!a || !b) return false;
    const ok = Math.abs(a.col - b.col) <= HOME_BUILD_RADIUS_CELLS && Math.abs(a.row - b.row) <= HOME_BUILD_RADIUS_CELLS;
    if (!ok) this.ui.toast('البناء مسموح داخل خلية البيت فقط'); return ok;
  }
  async onPointer(pointer) {
    if (this.scene.walkMode) return;
    const p = pointer.positionToCamera(this.scene.cameras.main);
    if (this.eraser) return this.eraseAt(p.x, p.y);
    if (this.selectedTile) { if (!this.canBuildAt(p.x, p.y)) return; await this.world.addItem(this.selectedTile, p.x, p.y, { layer: this.activeLayer, scale: this.itemScale, blocking: this.blockingMode || this.selectedTile.blocking, flipX: this.flipX, flipY: this.flipY }); this.ui.toast('تم حفظ العنصر'); this.ui.updateCounts(); }
  }
  async eraseAt(x, y) {
    const hit = [...this.world.itemSprites.values()].map(o => o.sprite).find(s => Phaser.Geom.Rectangle.Contains(s.getBounds(), x, y));
    const item = hit?.getData('item'); if (item && item.owner === this.firebase.uid()) { await this.world.deleteItem(item.uid); this.ui.toast('تم الحذف'); }
  }
  onDrag(obj, x, y) { const item = obj.getData('item'); if (!item || item.owner !== this.firebase.uid() || !this.canBuildAt(x, y)) return; obj.setPosition(x, y); }
  async onDragEnd(obj) { const item = obj.getData('item'); if (!item || item.owner !== this.firebase.uid()) return; item.x = obj.x; item.y = obj.y; const cell = cellFromWorld(obj.x, obj.y); if (cell) item.cell = cell.key; await this.world.saveCell(item.cell, this.world.getCellItems(item.cell).map(i => i.uid === item.uid ? item : i)); }
  setCategory(key) { this.activeCategory = this.activeCategory === key ? '' : key; this.ui.renderTiles(this.activeCategory); }
  selectTile(id) { this.selectedTile = tileMap[id] || null; this.eraser = false; this.ui.setSelectedTile(this.selectedTile); }
  onKey(e) {
    if (e.ctrlKey && e.key.toLowerCase() === 'c') { if (this.selectedItem) this.copyBuffer = { ...this.selectedItem }; }
    if (e.ctrlKey && e.key.toLowerCase() === 'v' && this.copyBuffer) { const c = this.scene.cameras.main.worldView; const tile = tileMap[this.copyBuffer.tileId]; if (tile) this.world.addItem(tile, c.centerX, c.centerY, { ...this.copyBuffer }); }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (this.selectedItem) this.world.deleteItem(this.selectedItem.uid); }
    if (/^[1-5]$/.test(e.key)) { this.activeLayer = Number(e.key); this.ui.syncToolState(); }
    if (e.key === '+' || e.key === '=') { this.itemScale = Math.min(1, this.itemScale + .04); this.ui.syncToolState(); }
    if (e.key === '-' || e.key === '_') { this.itemScale = Math.max(.2, this.itemScale - .04); this.ui.syncToolState(); }
  }
}
