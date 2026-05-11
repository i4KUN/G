import { PLAYER_W, PLAYER_H, CELL, WORLD_WIDTH, WORLD_HEIGHT } from '../config.js';
import { clamp } from '../systems/Utils.js';

export class PlayerEntity {
  constructor(scene, x, y, characterId = 'woman-1') {
    this.scene = scene;
    this.characterId = characterId;
    this.key = this.textureKey(characterId);
    this.sprite = scene.physics.add.sprite(x, y, this.key, 0);
    this.sprite.setDisplaySize(PLAYER_W, PLAYER_H);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(42, 52).setOffset(18, 24);
    this.dir = 'down';
    this.moving = false;
    this.speed = 210;
  }

  textureKey(id) { return `character_${id}`; }

  setCharacter(characterId) {
    this.characterId = characterId || 'woman-1';
    this.key = this.textureKey(this.characterId);
    if (this.scene.textures.exists(this.key)) this.sprite.setTexture(this.key, 0);
  }

  update(cursors, wasd) {
    const body = this.sprite.body;
    let vx = 0;
    let vy = 0;
    if (cursors.left.isDown || wasd.left.isDown) vx -= 1;
    if (cursors.right.isDown || wasd.right.isDown) vx += 1;
    if (cursors.up.isDown || wasd.up.isDown) vy -= 1;
    if (cursors.down.isDown || wasd.down.isDown) vy += 1;
    if (vx && vy) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
    body.setVelocity(vx * this.speed, vy * this.speed);
    this.moving = vx !== 0 || vy !== 0;
    if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'right' : 'left';
    else if (vy !== 0) this.dir = vy > 0 ? 'down' : 'up';
    this.sprite.x = clamp(this.sprite.x, 0, WORLD_WIDTH);
    this.sprite.y = clamp(this.sprite.y, 0, WORLD_HEIGHT);
  }

  toJSON(extra = {}) {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
      dir: this.dir,
      moving: this.moving,
      walkMode: true,
      character: this.characterId,
      ...extra
    };
  }
}
