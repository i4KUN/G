import { NPC_STARTS, NPC_CONFIG } from '../data/constants.js';
import { Npc } from '../entities/Npc.js';

export class NpcSystem {
  constructor(scene, loader, firebase, state, inventory, quests, ui) { this.scene = scene; this.loader = loader; this.firebase = firebase; this.state = state; this.inventory = inventory; this.quests = quests; this.ui = ui; this.npcs = []; this.nearby = null; this.lastSave = 0; }
  create() {
    Object.entries(NPC_STARTS).forEach(([kind, cells]) => cells.forEach((cell, i) => this.npcs.push(new Npc(this.scene, this.loader, `${kind}_${i+1}`, kind, cell))));
    this.ui.onNpcInteract(() => this.interact());
    this.firebase.onValue('worldNpcs', data => this.apply(data));
  }
  apply(data) { if (!data) return; this.npcs.forEach(n => data[n.id] && n.applyData(data[n.id])); }
  update(player, walkMode) {
    let closest = null; let closestDist = 999999;
    for (const npc of this.npcs) {
      npc.update(player, walkMode);
      if (npc.sprite && npc.config.blocking) this.scene.physics.add.collider(player.sprite, npc.sprite);
      const d = npc.sprite ? Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) : 9999;
      if (d < 95 && d < closestDist) { closest = npc; closestDist = d; }
      if (walkMode && npc.config.type === 'enemy' && d < 42 && Date.now() - npc.lastAttack > 1800) { npc.lastAttack = Date.now(); this.state.damage(20, 10, 1); this.ui.toast('تم الهجوم عليك'); }
    }
    this.nearby = closest; this.ui.updateNpcButton(closest);
    if (this.firebase.loggedIn() && Date.now() - this.lastSave > 1800) { this.lastSave = Date.now(); this.save(); }
  }
  save() { const data = {}; this.npcs.forEach(n => data[n.id] = n.toData()); this.firebase.set('worldNpcs', data).catch(console.error); }
  interact() {
    const npc = this.nearby; if (!npc) return; const cfg = NPC_CONFIG[npc.kind];
    if (npc.kind === 'grocery') return this.inventory.openShop('grocery');
    if (npc.kind === 'pharmacy') return this.inventory.openShop('pharmacy');
    if (cfg.type === 'quest') return this.quests.handle(npc.kind);
    return this.ui.openText(cfg.label, 'لا يوجد تفاعل حالياً.');
  }
}
