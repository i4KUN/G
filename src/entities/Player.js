import { PLAYER_SPEED } from '../data/constants.js';

export class Player {
  constructor(scene, x, y, character) {
    this.scene = scene; this.character = character; this.key = 'char-' + (character?.id || 'man-1'); this.dir = 'down'; this.walkMode = false;
    this.create(x, y);
  }
  create(x, y) {
    this.sprite = this.scene.physics.add.sprite(x, y, this.key, 0).setSize(46, 58).setOffset(17, 20).setDepth(8000);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, PLAYER_SPEED);
    this.makeAnims(); this.ready = true;
  }
  makeAnims() {
    const rows = { down: 0, left: 1, right: 2, up: 3 };
    Object.entries(rows).forEach(([dir, row]) => {
      const key = `${this.key}-${dir}`;
      if (!this.scene.anims.exists(key)) this.scene.anims.create({ key, frames: this.scene.anims.generateFrameNumbers(this.key, { start: row * 4, end: row * 4 + 3 }), frameRate: 8, repeat: -1 });
    });
  }
  setCharacter(character) { this.character = character; this.key = 'char-' + character.id; if (this.scene.textures.exists(this.key)) { this.sprite.setTexture(this.key, 0); this.makeAnims(); } }
  setWalkMode(active) { this.walkMode = !!active; if (!active && this.sprite) this.sprite.setVelocity(0, 0); }
  update(cursors, keys) {
    if (!this.sprite || !this.walkMode) return;
    let vx = 0, vy = 0;
    if (cursors.left.isDown || keys.A.isDown) vx -= PLAYER_SPEED;
    if (cursors.right.isDown || keys.D.isDown) vx += PLAYER_SPEED;
    if (cursors.up.isDown || keys.W.isDown) vy -= PLAYER_SPEED;
    if (cursors.down.isDown || keys.S.isDown) vy += PLAYER_SPEED;
    if (vx && vy) { vx *= 0.707; vy *= 0.707; }
    this.sprite.setVelocity(vx, vy);
    if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'right' : vx < 0 ? 'left' : this.dir;
    else if (vy) this.dir = vy > 0 ? 'down' : 'up';
    if (vx || vy) this.sprite.anims.play(`${this.key}-${this.dir}`, true); else this.sprite.anims.stop();
  }
  get x() { return this.sprite?.x || 0; } get y() { return this.sprite?.y || 0; }
  setPosition(x, y) { this.sprite?.setPosition(x, y); }
}
