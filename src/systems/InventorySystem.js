import { BAG_OPEN_SLOTS, BAG_TOTAL_SLOTS, BAG_STACK_LIMIT } from '../config.js';

export class InventorySystem {
  constructor(firebase, stats, toast) {
    this.firebase = firebase;
    this.stats = stats;
    this.toast = toast;
    this.items = [];
    this.slotBox = document.getElementById('topBagSlots');
    this.dialog = {
      modal: document.getElementById('dialogModal'),
      title: document.getElementById('dialogTitle'),
      text: document.getElementById('dialogText'),
      actions: document.getElementById('dialogActions')
    };
  }

  applyRemote(items) {
    this.items = Array.isArray(items) ? items.filter(Boolean) : [];
    this.render();
  }

  add(item) {
    const existing = this.items.find(x => x.id === item.id && x.type === item.type);
    if (existing) {
      if ((existing.count || 1) >= BAG_STACK_LIMIT) {
        this.toast.show('وصلت للحد الأعلى من هذا العنصر');
        return false;
      }
      existing.count = (existing.count || 1) + 1;
      this.toast.show(`تمت إضافة ${item.name} إلى الحقيبة`);
      this.save();
      this.render();
      return true;
    }
    if (this.items.length >= BAG_OPEN_SLOTS) {
      this.toast.show('الحقيبة ممتلئة');
      return false;
    }
    this.items.push({ ...item, count: 1 });
    this.toast.show(`تمت إضافة ${item.name} إلى الحقيبة`);
    this.save();
    this.render();
    return true;
  }

  has(id) { return this.items.some(x => x.id === id && (x.count || 1) > 0); }

  removeOne(id) {
    const item = this.items.find(x => x.id === id);
    if (!item) return false;
    item.count = (item.count || 1) - 1;
    if (item.count <= 0) this.items = this.items.filter(x => x !== item);
    this.save();
    this.render();
    return true;
  }

  render() {
    if (!this.slotBox) return;
    this.slotBox.innerHTML = '';
    for (let i = 0; i < BAG_TOTAL_SLOTS; i++) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'bagSlot' + (i >= BAG_OPEN_SLOTS ? ' locked' : '');
      const item = this.items[i];
      if (i >= BAG_OPEN_SLOTS) {
        slot.innerHTML = '<i class="fa-solid fa-lock"></i>';
      } else if (item) {
        slot.innerHTML = `<img src="${item.img}" alt="${item.name}"><span class="bagCount">${item.count || 1}x</span>`;
        slot.onclick = () => this.openItemMenu(item);
      }
      this.slotBox.appendChild(slot);
    }
  }

  openItemMenu(item) {
    this.dialog.title.textContent = item.name;
    this.dialog.text.textContent = item.type === 'food' ? 'ماذا تريد أن تفعل بهذا الطعام؟'
      : item.type === 'medicine' ? 'ماذا تريد أن تفعل بهذا العلاج؟'
      : 'هذا عنصر مهمة. تستطيع حذفه وأخذه من المهمة مرة أخرى.';
    this.dialog.actions.innerHTML = '';
    const addButton = (label, icon, fn, danger = false) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = danger ? 'dangerBtn' : 'mainBtn';
      btn.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
      btn.onclick = () => { fn(); this.dialog.modal.classList.add('hidden'); };
      this.dialog.actions.appendChild(btn);
    };
    if (item.type === 'food') addButton('أكل', 'fa-utensils', () => { if (this.stats.addHunger(item.value || 0)) this.removeOne(item.id); });
    else if (item.type === 'medicine') addButton('علاج', 'fa-kit-medical', () => { if (this.stats.addHealth(item.value || 0)) this.removeOne(item.id); });
    else addButton('حذف', 'fa-trash', () => this.removeOne(item.id), true);
    addButton('إلغاء', 'fa-xmark', () => {}, false);
    this.dialog.modal.classList.remove('hidden');
  }

  save() { return this.firebase.saveBag(this.items).catch(console.error); }
}
