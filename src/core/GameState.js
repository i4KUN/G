import { HUNGER_DECAY_MS, HEALTH_DECAY_MS, LEVEL_POINT_MS } from '../data/constants.js';

const DEFAULT_STATE = {
  health: 100, hunger: 100, money: 0, levelPoints: 0,
  quests: {}, visitedCells: [], collectedMoney: [], bagItems: [],
  displayName: '', characterId: '', homeCell: '', lastCell: 'J10', lastX: 4750, lastY: 4750,
  lastHealthTick: Date.now(), lastHungerTick: Date.now(), lastLevelTick: Date.now()
};

export class GameState {
  constructor() { this.data = { ...DEFAULT_STATE }; this.listeners = new Set(); }
  get() { return this.data; }
  set(patch = {}) { this.data = { ...this.data, ...patch }; this.emit(); }
  onChange(fn) { this.listeners.add(fn); fn(this.data); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach(fn => fn(this.data)); }
  addMoney(amount) { this.set({ money: Math.max(0, Number(this.data.money || 0) + amount) }); }
  spendMoney(amount) { if ((this.data.money || 0) < amount) return false; this.addMoney(-amount); return true; }
  addHealth(value) { const next = Math.min(100, (this.data.health || 0) + value); if (next === this.data.health) return false; this.set({ health: next }); return true; }
  addHunger(value) { const next = Math.min(100, (this.data.hunger || 0) + value); if (next === this.data.hunger) return false; this.set({ hunger: next }); return true; }
  damage(health = 20, hunger = 10, money = 1) {
    const d = this.data;
    this.set({ health: Math.max(0, d.health - health), hunger: Math.max(0, d.hunger - hunger), money: Math.max(0, d.money - money) });
    if (this.data.health <= 0 || this.data.hunger <= 0) this.set({ health: Math.max(30, this.data.health), hunger: Math.max(30, this.data.hunger), money: Math.max(0, this.data.money - 5), levelPoints: Math.floor((this.data.levelPoints || 0) / 2) });
  }
  tick(now = Date.now()) {
    const d = this.data; let patch = {};
    if (now - d.lastHungerTick >= HUNGER_DECAY_MS) patch = { ...patch, hunger: Math.max(0, d.hunger - 1), lastHungerTick: now };
    if (now - d.lastHealthTick >= HEALTH_DECAY_MS) patch = { ...patch, health: Math.max(0, d.health - 1), lastHealthTick: now };
    if (now - d.lastLevelTick >= LEVEL_POINT_MS) patch = { ...patch, levelPoints: (d.levelPoints || 0) + 1, lastLevelTick: now };
    if (Object.keys(patch).length) this.set(patch);
  }
}
export const gameState = new GameState();
