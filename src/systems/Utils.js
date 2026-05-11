import { WORLD_COLS, WORLD_ROWS, CELL, WORLD_WIDTH, WORLD_HEIGHT } from '../config.js';

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

export function colToLetters(col) {
  let n = Number(col);
  let text = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    text = String.fromCharCode(65 + r) + text;
    n = Math.floor((n - 1) / 26);
  }
  return text;
}

export function lettersToCol(letters) {
  let col = 0;
  String(letters || '').toUpperCase().split('').forEach(ch => {
    if (ch >= 'A' && ch <= 'Z') col = col * 26 + (ch.charCodeAt(0) - 64);
  });
  return col;
}

export function parseCell(cellKey) {
  const match = String(cellKey || '').toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col = lettersToCol(match[1]);
  const row = Number(match[2]);
  if (col < 1 || col > WORLD_COLS || row < 1 || row > WORLD_ROWS) return null;
  return { col, row, key: `${colToLetters(col)}${row}` };
}

export function cellKey(col, row) {
  return `${colToLetters(clamp(col, 1, WORLD_COLS))}${clamp(row, 1, WORLD_ROWS)}`;
}

export function cellCenter(cell) {
  const parsed = typeof cell === 'string' ? parseCell(cell) : cell;
  if (!parsed) return { x: CELL / 2, y: CELL / 2 };
  return { x: (parsed.col - 0.5) * CELL, y: (parsed.row - 0.5) * CELL };
}

export function worldToCell(x, y) {
  const col = clamp(Math.floor(clamp(x, 0, WORLD_WIDTH - 1) / CELL) + 1, 1, WORLD_COLS);
  const row = clamp(Math.floor(clamp(y, 0, WORLD_HEIGHT - 1) / CELL) + 1, 1, WORLD_ROWS);
  return { col, row, key: cellKey(col, row) };
}

export function textureKeyFromSrc(src) {
  return String(src || '').replace(/[^a-zA-Z0-9_]/g, '_');
}

export function nowId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isNight() {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
}
