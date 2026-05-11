import { SHOP_ITEMS } from '../data/constants.js';
export class InventorySystem {
  constructor(state, firebase, ui) { this.state = state; this.firebase = firebase; this.ui = ui; }
  items() { return this.state.get().bagItems || []; }
  async load() { if (!this.firebase.loggedIn()) return; const data = await this.firebase.get(`inventory/${this.firebase.uid()}/bagItems`); if (Array.isArray(data)) this.state.set({ bagItems: data }); }
  async save() { if (this.firebase.loggedIn()) await this.firebase.set(`inventory/${this.firebase.uid()}/bagItems`, this.items()); this.ui.updateBag(); }
  limit() { return 5; }
  add(item) {
    const list = [...this.items()]; const existing = list.find(x => x.id === item.id);
    if (existing) { if ((existing.count || 1) >= 3) { this.ui.toast('وصلت للحد الأعلى من هذا العنصر'); return false; } existing.count = (existing.count || 1) + 1; }
    else { if (list.length >= this.limit()) { this.ui.toast('الحقيبة ممتلئة'); return false; } list.push({ ...item, count: 1 }); }
    this.state.set({ bagItems: list }); this.save(); return true;
  }
  remove(id) { let list = [...this.items()]; const item = list.find(x => x.id === id); if (!item) return false; item.count = (item.count || 1) - 1; if (item.count <= 0) list = list.filter(x => x.id !== id); this.state.set({ bagItems: list }); this.save(); return true; }
  use(id) { const item = this.items().find(x => x.id === id); if (!item) return; if (item.type === 'food' && this.state.addHunger(item.value || 0)) this.remove(id); else if (item.type === 'medicine' && this.state.addHealth(item.value || 0)) this.remove(id); else if (item.type === 'quest') this.remove(id); }
  openShop(shopKey) {
    const title = shopKey === 'grocery' ? 'صاحب البقالة' : 'الصيدلي';
    const target = shopKey === 'grocery' ? 'food' : 'medicine';
    this.ui.openShop(title, shopKey, SHOP_ITEMS[shopKey], (item, index) => {
      if (!this.state.spendMoney(item.price)) return this.ui.toast('المال لا يكفي');
      if (!this.add({ id: `${shopKey}_${index}`, name: item.name, type: target, value: item.value, img: item.img })) { this.state.addMoney(item.price); return; }
      this.state.set({ quests: { ...this.state.get().quests, usedShop: true } }); this.ui.toast('تم الشراء');
    });
  }
}
