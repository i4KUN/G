import { mapMoney } from '../data/constants.js';
export class MoneySystem {
  constructor(scene, loader, state, firebase, ui) { this.scene = scene; this.loader = loader; this.state = state; this.firebase = firebase; this.ui = ui; this.coins = new Map(); }
  async load() { if (this.firebase.loggedIn()) { const data = await this.firebase.get(`inventory/${this.firebase.uid()}/collectedMoney`); if (Array.isArray(data)) this.state.set({ collectedMoney: data }); } }
  create() { mapMoney.forEach(c => this.loader.ensure(c.src, key => { const img = this.scene.physics.add.image(c.x, c.y, key).setDisplaySize(34,34).setDepth(4500); img.body.setAllowGravity(false); img.setData('coin', c); this.coins.set(c.id, img); })); }
  update(player, walkMode) {
    const collected = new Set(this.state.get().collectedMoney || []);
    for (const [id, sprite] of this.coins) {
      sprite.setVisible(!collected.has(id)); if (!walkMode || collected.has(id)) continue;
      const c = sprite.getData('coin'); if (Phaser.Math.Distance.Between(sprite.x, sprite.y, player.x, player.y) <= 45) { collected.add(id); this.state.set({ collectedMoney: [...collected] }); this.state.addMoney(c.amount); this.ui.toast(`حصلت على ${c.amount} ريال`); if (this.firebase.loggedIn()) this.firebase.set(`inventory/${this.firebase.uid()}/collectedMoney`, [...collected]); }
    }
  }
}
