import { CELL, WORLD_WIDTH, WORLD_HEIGHT, BUILD_ZOOM, WALK_ZOOM, MIN_ZOOM, MAX_ZOOM, characterList } from '../data/constants.js';
import { gameState } from '../core/GameState.js';
import { AssetLoader } from '../core/AssetLoader.js';
import { cellCenter, cellFromWorld, nearbyCells, parseCell, clamp } from '../core/utils.js';
import { firebaseClient } from '../firebase/firebaseClient.js';
import { Player } from '../entities/Player.js';
import { WorldSystem } from '../systems/WorldSystem.js';
import { BuildSystem } from '../systems/BuildSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { NpcSystem } from '../systems/NpcSystem.js';
import { MoneySystem } from '../systems/MoneySystem.js';
import { UISystem } from '../ui/UISystem.js';

export class GameScene extends Phaser.Scene {
  constructor(){ super('GameScene'); }
  create(){
    this.physics.world.setBounds(0,0,WORLD_WIDTH,WORLD_HEIGHT);
    this.cameras.main.setBounds(0,0,WORLD_WIDTH,WORLD_HEIGHT).setZoom(BUILD_ZOOM);
    this.loader2 = new AssetLoader(this);
    this.ui = new UISystem(gameState, firebaseClient);
    this.world = new WorldSystem(this, this.loader2, firebaseClient, gameState); this.world.create();
    const d = gameState.get(); const start = d.lastX && d.lastY ? {x:d.lastX,y:d.lastY} : cellCenter(d.homeCell || d.lastCell || 'J10');
    const character = characterList.find(c=>c.id===d.characterId) || characterList[0];
    this.player = new Player(this, start.x, start.y, character);
    this.inventory = new InventorySystem(gameState, firebaseClient, this.ui);
    this.quests = new QuestSystem(gameState, this.inventory, this.ui);
    this.npcSystem = new NpcSystem(this, this.loader2, firebaseClient, gameState, this.inventory, this.quests, this.ui);
    this.moneySystem = new MoneySystem(this, this.loader2, gameState, firebaseClient, this.ui);
    this.build = new BuildSystem(this, this.world, gameState, this.ui, firebaseClient); this.build.bind();
    this.ui.attach(this, this.build, this.inventory);
    this.npcSystem.create(); this.moneySystem.create();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.walkMode = false;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { gameState.tick(Date.now()); this.syncPlayerState(); } });
    this.physics.add.collider(this.player.sprite, this.world.blockers);
    this.loadCurrentCells(); this.listenAuth(); this.installCameraDrag(); this.hideLoader();
  }
  hideLoader(){ setTimeout(()=>document.getElementById('loadingScreen')?.classList.add('hidden'), 800); }
  listenAuth(){ firebaseClient.onUser(async user => { if (!user) return; await this.loadProfile(); await this.inventory.load(); await this.moneySystem.load(); this.loadCurrentCells(); }); }
  async loadProfile(){ const uid=firebaseClient.uid(); if(!uid)return; const inv = await firebaseClient.get(`inventory/${uid}/gameState`); const home = await firebaseClient.get(`homes/${uid}`); const prof = await firebaseClient.get(`profiles/${uid}`); gameState.set({ ...(inv||{}), homeCell: home?.homeCell || inv?.homeCell || gameState.get().homeCell, displayName: prof?.displayName || gameState.get().displayName }); }
  async saveProfile(){ const uid=firebaseClient.uid(); if(!uid)return; const d=gameState.get(); await firebaseClient.set(`inventory/${uid}/gameState`, d); if(d.homeCell) await firebaseClient.set(`homes/${uid}`, { homeCell:d.homeCell, x:d.lastX, y:d.lastY, updatedAt:Date.now() }); }
  syncPlayerState(){ if(!this.player?.sprite)return; const cell=cellFromWorld(this.player.x,this.player.y); const d=gameState.get(); let visited=d.visitedCells||[]; if(cell && !visited.includes(cell.key)) visited=[...visited, cell.key].slice(-50); gameState.set({ lastX:Math.round(this.player.x), lastY:Math.round(this.player.y), lastCell:cell?.key||d.lastCell, visitedCells:visited }); this.loadCurrentCells(); this.saveProfile(); }
  loadCurrentCells(){ const d=gameState.get(); const center=d.lastCell||'J10'; const keys=nearbyCells(center,3,[d.homeCell]); this.world.loadCells(keys); }
  update(){ if(!this.player?.ready)return; this.player.update(this.cursors,this.keys); this.npcSystem.update(this.player,this.walkMode); this.moneySystem.update(this.player,this.walkMode); if(this.walkMode){ this.cameras.main.startFollow(this.player.sprite,true,.1,.1); } }
  setWalkMode(active){ this.walkMode=!!active; this.player.setWalkMode(this.walkMode); document.getElementById('stopWalkBtn')?.classList.toggle('hidden',!this.walkMode); this.cameras.main.setZoom(this.walkMode?WALK_ZOOM:BUILD_ZOOM); if(this.walkMode) this.cameras.main.startFollow(this.player.sprite,true,.1,.1); else this.cameras.main.stopFollow(); }
  zoomBy(factor){ const z=clamp(this.cameras.main.zoom*factor,MIN_ZOOM,MAX_ZOOM); this.cameras.main.setZoom(z); }
  goHome(){ const home=gameState.get().homeCell; if(!home)return this.ui.toast('لم تحدد منزلك'); const p=cellCenter(home); this.player.setPosition(p.x,p.y); this.cameras.main.centerOn(p.x,p.y); this.setWalkMode(false); }
  setHomeHere(){ if(!firebaseClient.loggedIn())return this.ui.toast('سجل دخولك أولاً'); const cell=cellFromWorld(this.player.x,this.player.y) || cellFromWorld(this.cameras.main.midPoint.x,this.cameras.main.midPoint.y); if(!cell)return; gameState.set({homeCell:cell.key}); this.saveProfile(); this.ui.toast(`تم تحديد البيت: ${cell.key}`); }
  jumpToCell(value){ const cell=parseCell(value); if(!cell)return this.ui.toast('اكتب خلية صحيحة مثل K10 داخل خريطة 20×20'); const p=cellCenter(cell.key); this.player.setPosition(p.x,p.y); this.cameras.main.centerOn(p.x,p.y); this.setWalkMode(false); this.syncPlayerState(); }
  setCharacter(c){ this.player.setCharacter(c); }
  installCameraDrag(){ let dragging=false,last=null; this.input.on('pointerdown',p=>{ if(!this.walkMode && !this.build.selectedTile && !this.build.eraser){ dragging=true; last={x:p.x,y:p.y}; }}); this.input.on('pointermove',p=>{ if(!dragging||this.walkMode)return; const cam=this.cameras.main; cam.scrollX -= (p.x-last.x)/cam.zoom; cam.scrollY -= (p.y-last.y)/cam.zoom; last={x:p.x,y:p.y}; }); this.input.on('pointerup',()=>dragging=false); this.input.on('wheel',(p, objs, dx, dy)=>this.zoomBy(dy>0?1/1.12:1.12)); }
}
