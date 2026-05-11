import { tileMap, HOME_BUILD_RADIUS_CELLS } from '../data/constants.js';
import { cellFromWorld, parseCell } from '../core/utils.js';

export class BuildSystem {
  constructor(scene, world, state, ui, firebase) {
    this.scene = scene;
    this.world = world;
    this.state = state;
    this.ui = ui;
    this.firebase = firebase;
    this.selectedTile = null;
    this.activeCategory = '';
    this.activeLayer = 1;
    this.itemScale = 0.7;
    this.blockingMode = false;
    this.flipX = false;
    this.flipY = false;
    this.eraser = false;
    this.selectedItem = null;
    this.copyBuffer = null;
    this.history = [];
    this.justSelected = false;
    this.dragStart = null;
  }

  bind() {
    this.scene.input.on('gameobjectdown', (pointer, obj) => this.selectExisting(pointer, obj));
    this.scene.input.on('pointerdown', pointer => this.onPointer(pointer));
    this.scene.input.on('dragstart', (pointer, obj) => this.onDragStart(obj));
    this.scene.input.on('drag', (pointer, obj, dragX, dragY) => this.onDrag(obj, dragX, dragY));
    this.scene.input.on('dragend', (pointer, obj) => this.onDragEnd(obj));
    window.addEventListener('keydown', e => this.onKey(e));
  }

  canBuildAt(x, y, silent = false) {
    if (!this.firebase.loggedIn()) {
      if (!silent) this.ui.toast('سجل دخولك أولاً');
      return false;
    }
    const home = this.state.get().homeCell;
    if (!home) {
      if (!silent) this.ui.toast('حدد منزلك أولاً');
      return false;
    }
    const a = parseCell(home);
    const b = cellFromWorld(x, y);
    if (!a || !b) return false;
    const ok = Math.abs(a.col - b.col) <= HOME_BUILD_RADIUS_CELLS && Math.abs(a.row - b.row) <= HOME_BUILD_RADIUS_CELLS;
    if (!ok && !silent) this.ui.toast('البناء مسموح داخل خلية البيت فقط');
    return ok;
  }

  async onPointer(pointer) {
    if (this.scene.walkMode) return;
    if (this.justSelected) {
      this.justSelected = false;
      return;
    }

    const p = pointer.positionToCamera(this.scene.cameras.main);
    if (this.eraser) return this.eraseAt(p.x, p.y);

    if (this.selectedTile) {
      if (!this.canBuildAt(p.x, p.y)) return;
      try {
        const item = await this.world.addItem(this.selectedTile, p.x, p.y, {
          layer: this.activeLayer,
          scale: this.itemScale,
          blocking: this.blockingMode || this.selectedTile.blocking,
          flipX: this.flipX,
          flipY: this.flipY
        });
        if (item) this.pushHistory({ type: 'add', item: { ...item } });
        this.ui.toast('تم حفظ العنصر');
        this.ui.updateCounts();
      } catch (e) {
        this.ui.toast('تعذر حفظ العنصر');
        console.warn(e);
      }
    }
  }

  selectExisting(pointer, obj) {
    const item = obj?.getData?.('item');
    if (!item) return;
    this.selectedItem = item;
    this.justSelected = true;
    this.ui.setSelectedItem(item);
    pointer?.event?.stopPropagation?.();
    setTimeout(() => { this.justSelected = false; }, 0);
  }

  async eraseAt(x, y) {
    const hit = [...this.world.itemSprites.values()]
      .map(o => o.sprite)
      .reverse()
      .find(s => Phaser.Geom.Rectangle.Contains(s.getBounds(), x, y));

    const item = hit?.getData('item');
    if (!item) return;
    if (item.owner !== this.firebase.uid()) return this.ui.toast('لا يمكنك حذف عنصر لاعب آخر');

    const deleted = await this.world.deleteItem(item.uid);
    if (deleted) {
      this.pushHistory({ type: 'delete', item: { ...deleted } });
      this.selectedItem = null;
      this.ui.setSelectedItem(null);
      this.ui.toast('تم الحذف');
      this.ui.updateCounts();
    }
  }

  onDragStart(obj) {
    const item = obj.getData('item');
    if (!item || item.owner !== this.firebase.uid()) return;
    this.dragStart = { item: { ...item }, cell: item.cell, x: item.x, y: item.y };
  }

  onDrag(obj, x, y) {
    const item = obj.getData('item');
    if (!item || item.owner !== this.firebase.uid()) return;
    if (!this.canBuildAt(x, y, true)) return;
    obj.setPosition(x, y);
  }

  async onDragEnd(obj) {
    const item = obj.getData('item');
    if (!item || item.owner !== this.firebase.uid()) return;

    if (!this.canBuildAt(obj.x, obj.y)) {
      if (this.dragStart) obj.setPosition(this.dragStart.x, this.dragStart.y);
      return;
    }

    const old = this.dragStart?.item ? { ...this.dragStart.item } : { ...item };
    const oldCell = this.dragStart?.cell || item.cell;
    const cell = cellFromWorld(obj.x, obj.y);
    if (!cell) return;

    item.x = obj.x;
    item.y = obj.y;
    item.cell = cell.key;
    item.updatedAt = Date.now();

    await this.world.moveItem(item, oldCell);
    this.pushHistory({ type: 'move', before: old, after: { ...item } });
    this.dragStart = null;
    this.ui.updateCounts();
  }

  setCategory(key) {
    this.activeCategory = this.activeCategory === key ? '' : key;
    this.ui.renderTiles(this.activeCategory);
  }

  selectTile(id) {
    this.selectedTile = tileMap[id] || null;
    this.eraser = false;
    this.selectedItem = null;
    this.ui.setSelectedTile(this.selectedTile);
    this.ui.syncToolState();
  }

  async deleteSelected() {
    if (!this.selectedItem) return this.ui.toast('لم تحدد عنصرًا');
    if (this.selectedItem.owner !== this.firebase.uid()) return this.ui.toast('لا يمكنك حذف عنصر لاعب آخر');
    const deleted = await this.world.deleteItem(this.selectedItem.uid);
    if (deleted) {
      this.pushHistory({ type: 'delete', item: { ...deleted } });
      this.selectedItem = null;
      this.ui.setSelectedItem(null);
      this.ui.toast('تم حذف العنصر المحدد');
      this.ui.updateCounts();
    }
  }

  async deleteAllMine() {
    const count = await this.world.deleteAllOwned(this.firebase.uid());
    this.selectedItem = null;
    this.ui.setSelectedItem(null);
    this.ui.toast(count ? `تم حذف ${count} عنصر` : 'لا توجد عناصر لك في الخلايا المحملة');
    this.ui.updateCounts();
  }

  pushHistory(action) {
    this.history.push(action);
    if (this.history.length > 30) this.history.shift();
  }

  async undo() {
    const last = this.history.pop();
    if (!last) return this.ui.toast('لا يوجد شيء للاستعادة');

    if (last.type === 'add') await this.world.deleteItem(last.item.uid);
    if (last.type === 'delete') await this.world.upsertItem(last.item);
    if (last.type === 'move') await this.world.moveItem(last.before, last.after.cell);

    this.ui.toast('تمت الاستعادة');
    this.ui.updateCounts();
  }

  onKey(e) {
    const key = e.key.toLowerCase();

    if (e.ctrlKey && key === 'c') {
      if (this.selectedItem) {
        this.copyBuffer = { ...this.selectedItem };
        this.ui.toast('تم النسخ');
      }
      e.preventDefault();
    }

    if (e.ctrlKey && key === 'v' && this.copyBuffer) {
      const c = this.scene.cameras.main.worldView;
      const tile = tileMap[this.copyBuffer.tileId];
      if (tile && this.canBuildAt(c.centerX, c.centerY)) {
        this.world.addItem(tile, c.centerX, c.centerY, {
          scale: this.copyBuffer.scale,
          layer: this.copyBuffer.layer,
          blocking: this.copyBuffer.blocking,
          flipX: this.copyBuffer.flipX,
          flipY: this.copyBuffer.flipY
        }).then(item => item && this.pushHistory({ type: 'add', item: { ...item } }));
      }
      e.preventDefault();
    }

    if (e.ctrlKey && key === 'z') {
      this.undo();
      e.preventDefault();
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteSelected();
      e.preventDefault();
    }

    if (/^[1-5]$/.test(e.key)) {
      this.activeLayer = Number(e.key);
      this.ui.syncToolState();
    }

    if (e.key === '+' || e.key === '=') {
      this.itemScale = Math.min(1, this.itemScale + 0.04);
      this.ui.syncToolState();
    }

    if (e.key === '-' || e.key === '_') {
      this.itemScale = Math.max(0.2, this.itemScale - 0.04);
      this.ui.syncToolState();
    }
  }
}
