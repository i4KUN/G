import { CELL, NPC_CONFIG } from '../data/constants.js';
import { cellCenter, clamp } from '../core/utils.js';
export class Npc {
  constructor(scene, loader, id, kind, cellKey) {
    this.scene = scene; this.loader = loader; this.id = id; this.kind = kind; this.config = NPC_CONFIG[kind];
    const p = cellCenter(cellKey); this.homeX = p.x; this.homeY = p.y; this.targetX = p.x; this.targetY = p.y; this.dir = 'down'; this.lastPick = 0; this.lastAttack = 0; this.chasing = false;
    this.loader.ensure(this.config.src, key => this.create(key, p.x, p.y));
  }
  create(key, x, y) {
    const scale = this.config.scale || 1;
    this.sprite = this.scene.physics.add.sprite(x, y, key).setDisplaySize(80 * scale, 80 * scale).setDepth(5000);
    this.sprite.body.setAllowGravity(false); this.sprite.setImmovable(!!this.config.fixed);
    if (this.config.fixed) this.sprite.body.setSize(40 * scale, 40 * scale);
    this.sprite.setData('npc', this);
    this.ready = true;
  }
  applyData(d) { if (!d || !this.sprite) return; this.sprite.setPosition(Number(d.x) || this.sprite.x, Number(d.y) || this.sprite.y); this.targetX = Number(d.targetX) || this.sprite.x; this.targetY = Number(d.targetY) || this.sprite.y; this.chasing = !!d.chasing; }
  toData() { return { id: this.id, kind: this.kind, x: Math.round(this.x), y: Math.round(this.y), homeX: Math.round(this.homeX), homeY: Math.round(this.homeY), targetX: Math.round(this.targetX), targetY: Math.round(this.targetY), chasing: !!this.chasing, dir: this.dir, updatedAt: Date.now() }; }
  pickTarget() { const range = CELL * 4; this.targetX = clamp(this.homeX + (Math.random() - .5) * range, CELL, 20 * CELL - CELL); this.targetY = clamp(this.homeY + (Math.random() - .5) * range, CELL, 20 * CELL - CELL); this.lastPick = Date.now(); }
  update(player, walkMode) {
    if (!this.sprite || this.config.fixed) return;
    const now = Date.now(); const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const enemy = this.config.type === 'enemy';
    this.chasing = !!(walkMode && enemy && dist <= CELL * 2);
    if (this.chasing) { this.targetX = player.x; this.targetY = player.y; }
    else if (now - this.lastPick > 2500 || Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY) < 20) this.pickTarget();
    const speed = this.chasing ? 190 : (this.kind === 'grocery' || this.kind === 'pharmacy' ? 45 : 75);
    this.scene.physics.moveTo(this.sprite, this.targetX, this.targetY, speed);
    if (Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY) < 12) this.sprite.setVelocity(0, 0);
  }
  get x() { return this.sprite?.x || this.homeX; } get y() { return this.sprite?.y || this.homeY; }
}
