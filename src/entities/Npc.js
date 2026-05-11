import { CELL, NPC_CONFIG, WORLD_WIDTH, WORLD_HEIGHT } from '../data/constants.js';
import { cellCenter, clamp } from '../core/utils.js';

export class Npc {
  constructor(scene, loader, id, kind, cellKey) {
    this.scene = scene;
    this.loader = loader;
    this.id = id;
    this.kind = kind;
    this.config = NPC_CONFIG[kind];
    const p = cellCenter(cellKey);
    this.homeX = p.x;
    this.homeY = p.y;
    this.targetX = p.x;
    this.targetY = p.y;
    this.dir = 'down';
    this.lastPick = 0;
    this.lastAttack = 0;
    this.chasing = false;
    this.moving = false;
    this.colliderAdded = false;
    this.loader.ensure(this.config.src, key => this.create(key, p.x, p.y));
  }

  create(key, x, y) {
    if (!key) return;
    const scale = this.config.scale || 1;
    this.sprite = this.scene.physics.add.image(x, y, key)
      .setDisplaySize(80 * scale, 80 * scale)
      .setDepth(5000);

    this.sprite.body.setAllowGravity(false);
    this.sprite.setImmovable(!!this.config.fixed);
    this.sprite.body.setSize(40 * scale, 40 * scale);
    this.sprite.setData('npc', this);
    this.ready = true;
  }

  applyData(d) {
    if (!d || !this.sprite) return;
    this.sprite.setPosition(Number(d.x) || this.sprite.x, Number(d.y) || this.sprite.y);
    this.targetX = Number(d.targetX) || this.sprite.x;
    this.targetY = Number(d.targetY) || this.sprite.y;
    this.chasing = !!d.chasing;
    this.moving = !!d.moving;
    this.dir = d.dir || this.dir;
  }

  toData() {
    return {
      id: this.id,
      kind: this.kind,
      x: Math.round(this.x),
      y: Math.round(this.y),
      homeX: Math.round(this.homeX),
      homeY: Math.round(this.homeY),
      targetX: Math.round(this.targetX),
      targetY: Math.round(this.targetY),
      chasing: !!this.chasing,
      moving: !!this.moving,
      dir: this.dir,
      updatedAt: Date.now()
    };
  }

  pickTarget() {
    const range = CELL * 4;
    this.targetX = clamp(this.homeX + (Math.random() - 0.5) * range, CELL * 0.5, WORLD_WIDTH - CELL * 0.5);
    this.targetY = clamp(this.homeY + (Math.random() - 0.5) * range, CELL * 0.5, WORLD_HEIGHT - CELL * 0.5);
    this.lastPick = Date.now();
  }

  update(player, walkMode, active = true) {
    if (!this.sprite) return;

    this.sprite.setVisible(active);
    this.sprite.body.enable = active;
    if (!active || this.config.fixed) {
      this.sprite.setVelocity(0, 0);
      this.moving = false;
      return;
    }

    const now = Date.now();
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const enemy = this.config.type === 'enemy';

    this.chasing = !!(walkMode && enemy && dist <= CELL * 2);
    if (this.chasing) {
      this.targetX = player.x;
      this.targetY = player.y;
    } else if (now - this.lastPick > 2500 || Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY) < 20) {
      this.pickTarget();
    }

    const speed = this.chasing ? 190 : (this.kind === 'grocery' || this.kind === 'pharmacy' ? 45 : 75);
    this.scene.physics.moveTo(this.sprite, this.targetX, this.targetY, speed);

    const vx = this.sprite.body.velocity.x;
    const vy = this.sprite.body.velocity.y;
    this.moving = Math.abs(vx) > 1 || Math.abs(vy) > 1;
    if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'right' : vx < 0 ? 'left' : this.dir;
    else if (vy) this.dir = vy > 0 ? 'down' : 'up';

    this.sprite.setFlipX(this.dir === 'left');
    if (Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY) < 12) {
      this.sprite.setVelocity(0, 0);
      this.moving = false;
    }
  }

  get x() { return this.sprite?.x || this.homeX; }
  get y() { return this.sprite?.y || this.homeY; }
}
