import { CELL, WORLD_COLS, WORLD_ROWS } from '../data/constants.js';

export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function cleanNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
export function uid(prefix = 'item') { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
export function storageKey(name) { return `GameNjd_v172_${name}`; }

export function colToLetters(col) {
  let s = '';
  while (col > 0) { const m = (col - 1) % 26; s = String.fromCharCode(65 + m) + s; col = Math.floor((col - m) / 26); }
  return s;
}
export function lettersToCol(letters) {
  return String(letters || '').toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}
export function parseCell(key) {
  const match = String(key || '').trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col = lettersToCol(match[1]); const row = Number(match[2]);
  if (col < 1 || col > WORLD_COLS || row < 1 || row > WORLD_ROWS) return null;
  return { key: `${colToLetters(col)}${row}`, col, row };
}
export function cellFromWorld(x, y) {
  const col = Math.floor(x / CELL) + 1; const row = Math.floor(y / CELL) + 1;
  if (col < 1 || col > WORLD_COLS || row < 1 || row > WORLD_ROWS) return null;
  return { key: `${colToLetters(col)}${row}`, col, row };
}
export function cellCenter(cellKey) {
  const c = parseCell(cellKey) || { col: 10, row: 10 };
  return { x: (c.col - 0.5) * CELL, y: (c.row - 0.5) * CELL, cell: c };
}
export function nearbyCells(centerKey, radius = 3, includeExtra = []) {
  const c = parseCell(centerKey) || { col: 10, row: 10 };
  const keys = new Set(includeExtra.filter(Boolean));
  for (let row = c.row - radius; row <= c.row + radius; row++) {
    for (let col = c.col - radius; col <= c.col + radius; col++) {
      if (col >= 1 && col <= WORLD_COLS && row >= 1 && row <= WORLD_ROWS) keys.add(`${colToLetters(col)}${row}`);
    }
  }
  return [...keys];
}
export function safeJsonParse(text, fallback) { try { return JSON.parse(text); } catch { return fallback; } }
export function setHidden(id, hidden) { document.getElementById(id)?.classList.toggle('hidden', !!hidden); }
export function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
export function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
export function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }
