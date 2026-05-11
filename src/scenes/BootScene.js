import { assetUrl, DEFAULT_FLOOR_SRC, edgeImagesSrc, NPC_CONFIG, characterList } from '../data/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.setCORS('anonymous');
    this.load.image('floor-default', assetUrl(DEFAULT_FLOOR_SRC));
    Object.entries(edgeImagesSrc).forEach(([k, path]) => this.load.image('edge-' + k, assetUrl(path)));
    Object.entries(NPC_CONFIG).forEach(([k, cfg]) => this.load.image('npc-' + k, assetUrl(cfg.src)));

    // صور الشخصيات في اللعبة صور كاملة وليست spritesheet، لذلك تُحمّل كـ image.
    characterList.forEach(c => this.load.image('char-' + c.id, assetUrl(c.src)));
  }

  create() {
    this.scene.start('GameScene');
  }
}
