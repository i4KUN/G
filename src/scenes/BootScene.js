import { assetUrl, DEFAULT_FLOOR_SRC, edgeImagesSrc, NPC_CONFIG, characterList } from '../data/constants.js';
export class BootScene extends Phaser.Scene {
  constructor(){ super('BootScene'); }
  preload(){
    this.load.setCORS('anonymous');
    this.load.image('floor-default', assetUrl(DEFAULT_FLOOR_SRC));
    Object.entries(edgeImagesSrc).forEach(([k,path])=>this.load.image('edge-'+k, assetUrl(path)));
    Object.entries(NPC_CONFIG).forEach(([k,cfg])=>this.load.image('npc-'+k, assetUrl(cfg.src)));
    characterList.forEach(c => this.load.spritesheet('char-' + c.id, assetUrl(c.src), { frameWidth: 80, frameHeight: 80 }));
  }
  create(){ this.scene.start('GameScene'); }
}
