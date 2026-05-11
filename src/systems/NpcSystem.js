import { NPC_STARTS, NPC_CONFIG } from '../data/constants.js';
import { Npc } from '../entities/Npc.js';

export class NpcSystem {
  constructor(scene, loader, firebase, state, inventory, quests, ui) {
    this.scene = scene;
    this.loader = loader;
    this.firebase = firebase;
    this.state = state;
    this.inventory = inventory;
    this.quests = quests;
    this.ui = ui;
    this.npcs = [];
    this.nearby = null;
    this.unsub = null;
  }

  create() {
    Object.entries(NPC_STARTS).forEach(([kind, cells]) => {
      cells.forEach((cell, i) => this.npcs.push(new Npc(this.scene, this.loader, `${kind}_${i + 1}`, kind, cell)));
    });
    this.ui.onNpcInteract(() => this.interact());
  }

  enableOnlineRead() {
    if (!this.firebase.loggedIn() || this.unsub) return;
    this.unsub = this.firebase.onValue('worldNpcs', data => this.apply(data), err => {
      console.warn('تعذر قراءة worldNpcs:', err?.message || err);
    });
  }

  resetOnlineSubscription() {
    if (this.unsub) {
      try { this.unsub(); } catch {}
      this.unsub = null;
    }
  }

  apply(data) {
    if (!data) return;
    this.npcs.forEach(n => data[n.id] && n.applyData(data[n.id]));
  }

  isActiveByTime(npc) {
    const mode = npc.config.mode || 'always';
    if (mode === 'always') return true;
    const hour = new Date().getHours();
    const night = hour >= 18 || hour < 6;
    if (mode === 'night') return night;
    if (mode === 'day') return !night;
    return true;
  }

  update(player, walkMode) {
    let closest = null;
    let closestDist = 999999;

    for (const npc of this.npcs) {
      const active = this.isActiveByTime(npc);
      npc.update(player, walkMode, active);

      if (npc.sprite && npc.config.blocking && !npc.colliderAdded) {
        this.scene.physics.add.collider(player.sprite, npc.sprite);
        npc.colliderAdded = true;
      }

      const d = npc.sprite && active ? Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) : 9999;
      if (d < 95 && d < closestDist) {
        closest = npc;
        closestDist = d;
      }

      if (walkMode && active && npc.config.type === 'enemy' && d < 42 && Date.now() - npc.lastAttack > 1800) {
        npc.lastAttack = Date.now();
        this.state.damage(20, 10, 1);
        this.ui.toast('تم الهجوم عليك');
      }
    }

    this.nearby = closest;
    this.ui.updateNpcButton(closest);

    // مهم: لا نحفظ NPC داخل update حتى لا تتكرر أخطاء permission_denied ولا تزيد طلبات Firebase.
  }

  interact() {
    const npc = this.nearby;
    if (!npc) return;
    const cfg = NPC_CONFIG[npc.kind];
    if (npc.kind === 'grocery') return this.inventory.openShop('grocery');
    if (npc.kind === 'pharmacy') return this.inventory.openShop('pharmacy');
    if (cfg.type === 'quest') return this.quests.handle(npc.kind);
    return this.ui.openText(cfg.label, 'لا يوجد تفاعل حالياً.');
  }
}
