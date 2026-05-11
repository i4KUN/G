import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'gameContainer',
  backgroundColor: '#0f172a',
  scale: { mode: Phaser.Scale.RESIZE, parent: 'gameContainer', width: window.innerWidth, height: window.innerHeight },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, GameScene],
  render: { pixelArt: false, antialias: true, roundPixels: false }
};
window.GameNjdPhaser = new Phaser.Game(config);
