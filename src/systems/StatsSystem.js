import { HUNGER_DECAY_MS, HEALTH_DECAY_MS, LEVEL_POINT_MS, POINTS_PER_RIYAL } from '../config.js';
import { clamp } from './Utils.js';

export class StatsSystem extends EventTarget {
  constructor(firebase, toast) {
    super();
    this.firebase = firebase;
    this.toast = toast;
    this.state = this.defaultState();
    this.lastSave = 0;
  }

  defaultState() {
    const now = Date.now();
    return { health: 100, hunger: 100, levelPoints: 0, money: 0, lastHungerAt: now, lastHealthAt: now, lastLevelAt: now, quests: {} };
  }

  applyRemote(data) {
    if (data && typeof data === 'object') {
      this.state = { ...this.defaultState(), ...data, quests: data.quests || {} };
    } else {
      this.state = this.defaultState();
      this.save();
    }
    this.render();
  }

  tick() {
    if (!this.firebase.isLoggedIn()) return;
    const now = Date.now();
    let changed = false;
    while (now - this.state.lastHungerAt >= HUNGER_DECAY_MS) {
      this.state.hunger = Math.max(0, this.state.hunger - 1);
      this.state.lastHungerAt += HUNGER_DECAY_MS;
      changed = true;
    }
    while (now - this.state.lastHealthAt >= HEALTH_DECAY_MS) {
      this.state.health = Math.max(0, this.state.health - 1);
      this.state.lastHealthAt += HEALTH_DECAY_MS;
      changed = true;
    }
    while (now - this.state.lastLevelAt >= LEVEL_POINT_MS) {
      this.state.levelPoints += 1;
      if (this.state.levelPoints % POINTS_PER_RIYAL === 0) this.state.money += 1;
      this.state.lastLevelAt += LEVEL_POINT_MS;
      changed = true;
    }
    if (this.state.health <= 0) {
      this.state.health = 30;
      this.state.money = Math.max(0, this.state.money - 5);
      this.state.levelPoints = Math.floor(this.state.levelPoints * 0.5);
      this.toast.show('انتهت الصحة: تم خصم عقوبة ورجعت إلى 30%');
      changed = true;
    }
    if (this.state.hunger <= 0) {
      this.state.hunger = 30;
      this.state.money = Math.max(0, this.state.money - 5);
      this.state.levelPoints = Math.floor(this.state.levelPoints * 0.5);
      this.toast.show('انتهى الجوع: تم خصم عقوبة ورجع إلى 30%');
      changed = true;
    }
    if (changed || now - this.lastSave > 5000) {
      this.render();
      this.save();
      this.lastSave = now;
    }
  }

  damage({ health = 0, hunger = 0, money = 0 }) {
    this.state.health = clamp(this.state.health - health, 0, 100);
    this.state.hunger = clamp(this.state.hunger - hunger, 0, 100);
    this.state.money = Math.max(0, Math.floor(this.state.money - money));
    this.toast.show(`تم الهجوم عليك: نقصت الصحة ${health}% والجوع ${hunger}% والفلوس ${money} ريال`);
    this.render();
    this.save();
  }

  addReward({ money = 0, levelPoints = 0 }) {
    this.state.money += money;
    this.state.levelPoints += levelPoints;
    this.render();
    this.save();
  }

  spend(price) {
    if (this.state.money < price) {
      this.toast.show('ما عندك فلوس كافية');
      return false;
    }
    this.state.money -= price;
    this.render();
    this.save();
    return true;
  }

  addHunger(value) {
    if (this.state.hunger >= 100) return this.toast.show('الجوع ممتلئ أساسًا'), false;
    this.state.hunger = clamp(this.state.hunger + value, 0, 100);
    this.render();
    this.save();
    return true;
  }

  addHealth(value) {
    if (this.state.health >= 100) return this.toast.show('الصحة ممتلئة أساسًا'), false;
    this.state.health = clamp(this.state.health + value, 0, 100);
    this.render();
    this.save();
    return true;
  }

  questStatus(id) { return this.state.quests[id] || 'none'; }
  setQuestStatus(id, status) {
    this.state.quests[id] = status;
    this.render();
    this.save();
  }

  render() {
    const s = this.state;
    document.querySelectorAll('[data-stat="healthFill"]').forEach(el => el.style.width = `${s.health}%`);
    document.querySelectorAll('[data-stat="hungerFill"]').forEach(el => el.style.width = `${s.hunger}%`);
    document.querySelectorAll('[data-stat="healthText"]').forEach(el => el.textContent = `${s.health}%`);
    document.querySelectorAll('[data-stat="hungerText"]').forEach(el => el.textContent = `${s.hunger}%`);
    document.querySelectorAll('[data-stat="levelPoints"]').forEach(el => el.textContent = String(s.levelPoints));
    document.querySelectorAll('[data-stat="money"]').forEach(el => el.textContent = `${s.money} ريال`);
    this.dispatchEvent(new Event('change'));
  }

  save() { return this.firebase.saveGameState(this.state).catch(console.error); }
}
