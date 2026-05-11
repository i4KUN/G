import { PLAYER_DRAW_W, PLAYER_DRAW_H, PLAYER_SPEED } from '../data/constants.js';

export class Player {
  constructor(scene, x, y, character) {
    this.scene = scene;
    this.character = character;
    this.key = 'char-' + (character?.id || 'man-1');
    this.dir = 'down';
    this.walkMode = false;
    this.mobileVector = { x: 0, y: 0 };
    this.create(x, y);
  }

  create(x, y) {
    this.sprite = this.scene.physics.add.image(x, y, this.key)
      .setDisplaySize(PLAYER_DRAW_W, PLAYER_DRAW_H)
      .setDepth(8000);

    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setAllowGravity(false);
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, PLAYER_SPEED);
    this.sprite.body.setSize(46, 58);
    this.ready = true;
  }

  setCharacter(character) {
    if (!character) return;
    this.character = character;
    this.key = 'char-' + character.id;
    if (this.scene.textures.exists(this.key)) {
      this.sprite.setTexture(this.key).setDisplaySize(PLAYER_DRAW_W, PLAYER_DRAW_H);
    }
  }

  setWalkMode(active) {
    this.walkMode = !!active;
    if (!active && this.sprite) this.sprite.setVelocity(0, 0);
  }

  update(cursors, keys) {
    if (!this.sprite || !this.walkMode) return;

    let vx = 0;
    let vy = 0;

    if (cursors?.left?.isDown || keys?.A?.isDown) vx -= PLAYER_SPEED;
    if (cursors?.right?.isDown || keys?.D?.isDown) vx += PLAYER_SPEED;
    if (cursors?.up?.isDown || keys?.W?.isDown) vy -= PLAYER_SPEED;
    if (cursors?.down?.isDown || keys?.S?.isDown) vy += PLAYER_SPEED;

    if (this.mobileVector.x || this.mobileVector.y) {
      vx += this.mobileVector.x * PLAYER_SPEED;
      vy += this.mobileVector.y * PLAYER_SPEED;
    }

    if (vx && vy) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.sprite.setVelocity(vx, vy);

    if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'right' : vx < 0 ? 'left' : this.dir;
    else if (vy) this.dir = vy > 0 ? 'down' : 'up';

    this.sprite.setFlipX(this.dir === 'left');
  }

  get x() { return this.sprite?.x || 0; }
  get y() { return this.sprite?.y || 0; }
  setPosition(x, y) { this.sprite?.setPosition(x, y); }
}
