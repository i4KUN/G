export const VERSION = '17.1';
export const WORLD_COLS = 20;
export const WORLD_ROWS = 20;
export const CELL = 500;
export const MINI = 10;
export const WORLD_WIDTH = WORLD_COLS * CELL;
export const WORLD_HEIGHT = WORLD_ROWS * CELL;
export const ASSET_ROOT = 'https://raw.githubusercontent.com/i4KUN/G/main/';
export const assetUrl = path => /^https?:\/\//.test(path) ? path : ASSET_ROOT + path.replace(/^\.\//, '');

export const PLAYER_DRAW_W = 80;
export const PLAYER_DRAW_H = 80;
export const PLAYER_SPEED = 270;
export const BUILD_ZOOM = 0.30;
export const WALK_ZOOM = 1.00;
export const MIN_ZOOM = 0.10;
export const MAX_ZOOM = 2.00;
export const MAX_ITEMS_PER_CELL = 150;
export const HOME_BUILD_RADIUS_CELLS = 0;
export const HUNGER_DECAY_MS = 10 * 60 * 1000;
export const HEALTH_DECAY_MS = 20 * 60 * 1000;
export const LEVEL_POINT_MS = 60 * 1000;
export const POINTS_PER_RIYAL = 10;

export const DEFAULT_FLOOR_SRC = 'All-Pic/map-pic/00.png';
export const edgeImagesSrc = {
  topRight: 'All-Pic/map-pic/01.png', bottomRight: 'All-Pic/map-pic/02.png',
  topLeft: 'All-Pic/map-pic/03.png', bottomLeft: 'All-Pic/map-pic/04.png',
  top: 'All-Pic/map-pic/05.png', bottom: 'All-Pic/map-pic/06.png', right: 'All-Pic/map-pic/07.png', left: 'All-Pic/map-pic/08.png'
};

export const fixedGroundTiles = [
  { cell: 'B2', src: 'All-Pic/map-pic/09.png' },{ cell: 'E5', src: 'All-Pic/map-pic/09.png' },{ cell: 'H8', src: 'All-Pic/map-pic/09.png' },{ cell: 'L12', src: 'All-Pic/map-pic/09.png' },{ cell: 'P16', src: 'All-Pic/map-pic/09.png' },
  { cell: 'D18', src: 'All-Pic/map-pic/10.png' },{ cell: 'G14', src: 'All-Pic/map-pic/10.png' },{ cell: 'K4', src: 'All-Pic/map-pic/10.png' },{ cell: 'O9', src: 'All-Pic/map-pic/10.png' },{ cell: 'T19', src: 'All-Pic/map-pic/10.png' }
];

export const fixedAnimalTiles = [
  { cell: 'C7', src: 'All-Pic/animal/animal-01.gif' },{ cell: 'F17', src: 'All-Pic/animal/animal-01.gif' },{ cell: 'J10', src: 'All-Pic/animal/animal-01.gif' },{ cell: 'P4', src: 'All-Pic/animal/animal-01.gif' },{ cell: 'S15', src: 'All-Pic/animal/animal-01.gif' }
];

export const randomSceneryTiles = [
  { cell: 'B2', src: 'All-Pic/npc/q40.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'E8', src: 'All-Pic/npc/q41.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'H17', src: 'All-Pic/npc/q42.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'K4', src: 'All-Pic/npc/q43.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'N19', src: 'All-Pic/npc/q44.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'Q9', src: 'All-Pic/npc/q40.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'T2', src: 'All-Pic/npc/q41.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'C14', src: 'All-Pic/npc/q42.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'L12', src: 'All-Pic/npc/q43.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'R18', src: 'All-Pic/npc/q44.png', w: 220, h: 220, blocking: true, hitbox: 0.34 },
  { cell: 'D11', src: 'All-Pic/npc/q45.png', w: 70, h: 70 },
  { cell: 'G5', src: 'All-Pic/npc/q46.png', fallback: 'All-Pic/npc/46.png', w: 70, h: 70 },
  { cell: 'J20', src: 'All-Pic/npc/q47.png', w: 70, h: 70 },
  { cell: 'M8', src: 'All-Pic/npc/q45.png', w: 70, h: 70 },
  { cell: 'P13', src: 'All-Pic/npc/q46.png', fallback: 'All-Pic/npc/46.png', w: 70, h: 70 },
  { cell: 'S6', src: 'All-Pic/npc/q47.png', w: 70, h: 70 },
  { cell: 'A18', src: 'All-Pic/npc/q45.png', w: 70, h: 70 },
  { cell: 'I2', src: 'All-Pic/npc/q46.png', fallback: 'All-Pic/npc/46.png', w: 70, h: 70 },
  { cell: 'O16', src: 'All-Pic/npc/q47.png', w: 70, h: 70 },
  { cell: 'T11', src: 'All-Pic/npc/q45.png', w: 70, h: 70 }
];

export const tileGroups = [
  { key: 'bag', name: 'أكياس', folder: 'Bag', prefix: 'Bag', count: 10, w: 23, h: 23, blocking: false },
  { key: 'lighting', name: 'إنارات', folder: 'Lighting', prefix: 'Lighting', count: 10, w: 21, h: 27, blocking: false },
  { key: 'door', name: 'باب', folder: 'Door', prefix: 'Door', count: 11, w: 30, h: 36, blocking: true },
  { key: 'coffee_pot', name: 'دلة', folder: 'teapot', prefix: 'teapot', count: 18, w: 21, h: 21, blocking: false },
  { key: 'cabinet', name: 'دولاب', folder: 'Cabinet', prefix: 'Cabinet', count: 16, w: 36, h: 36, blocking: false },
  { key: 'decor', name: 'ديكورات', folder: 'Decor', prefix: 'Decor', count: 74, w: 21, h: 21, blocking: false },
  { key: 'carpet', name: 'زولية', folder: 'Carpet', prefix: 'Carpet', count: 13, w: 45, h: 36, blocking: false },
  { key: 'curtain', name: 'ستارة', folder: 'Curtain', prefix: 'Curtain', count: 14, w: 30, h: 36, blocking: false },
  { key: 'bed', name: 'سرير', folder: 'Bed', prefix: 'Bed', count: 5, w: 45, h: 33, blocking: false },
  { key: 'plant', name: 'شجرة', folder: 'Plant', prefix: 'Plant', count: 106, w: 24, h: 24, blocking: false },
  { key: 'bedsheet', name: 'شرشف', folder: 'Bedsheet', prefix: 'Bedsheet', count: 24, w: 39, h: 30, blocking: false },
  { key: 'plate', name: 'صحن', folder: 'Plate', prefix: 'Plate', count: 83, w: 20, h: 20, blocking: false },
  { key: 'box', name: 'صندوق', folder: 'Box', prefix: 'Box', count: 8, w: 24, h: 24, blocking: false },
  { key: 'table', name: 'طاولة', folder: 'Table', prefix: 'Table', count: 49, w: 36, h: 27, blocking: false },
  { key: 'pottery', name: 'فخار', folder: 'Pottery', prefix: 'Pottery', count: 25, w: 23, h: 23, blocking: false },
  { key: 'cooking_pot', name: 'قدر', folder: 'Pot', prefix: 'Pot', count: 12, w: 23, h: 23, blocking: false },
  { key: 'chair', name: 'كرسي', folder: 'Chair', prefix: 'Chair', count: 15, w: 29, h: 29, blocking: false },
  { key: 'cup', name: 'كوب', folder: 'Cup', prefix: 'Cup', count: 18, w: 17, h: 17, blocking: false },
  { key: 'painting', name: 'لوحة', folder: 'Painting', prefix: 'Painting', count: 20, w: 27, h: 23, blocking: false },
  { key: 'pillow', name: 'مخدة', folder: 'Pillow', prefix: 'Pillow', count: 41, w: 21, h: 17, blocking: false },
  { key: 'floor_mattress', name: 'مرتبة', folder: 'Mattress', prefix: 'Mattress', count: 12, w: 39, h: 30, blocking: false },
  { key: 'window', name: 'نافذة', folder: 'Window', prefix: 'Window', count: 15, w: 29, h: 29, blocking: false },
  { key: 'floor', name: 'ارضيات', folder: 'Floof', prefix: 'Floof', count: 86, w: 66, h: 66, blocking: false },
  { key: 'wall', name: 'جدران', folder: 'Wall', prefix: 'Wall', count: 27, w: 48, h: 48, blocking: true }
];

export const tileMap = {};
export const categories = {};
for (const group of tileGroups) {
  const tiles = [];
  for (let i = 1; i <= group.count; i++) {
    const num = String(i).padStart(3, '0');
    const id = `${group.key}_${num}`;
    const image = `All-Pic/tiles/${group.folder}/${group.prefix}-${num}.png`;
    const tile = { id, category: group.key, name: `${group.name} ${i}`, image, w: group.w, h: group.h, blocking: group.blocking };
    tileMap[id] = tile;
    tiles.push(tile);
  }
  categories[group.key] = { name: group.name, tiles };
}

export const NPC_STARTS = {
  grocery: ['C4', 'R17'], pharmacy: ['D18', 'Q5'], spookyMan: ['B16','H3','N14','T8','K19'], wolf: ['E13','P2','S18','L7','C10'], caracal: ['F6','M16','R11','I20','T3'], oryx: ['B7','S14'], shepherd: ['G12'], camel: ['P18'], archaeologist: ['C3'], ruins: ['R4'], herbalist: ['N6'], rarePlant: ['D15','J4','T19'], messenger: ['M12'], messengerFriend: ['E19'], fireMan: ['K9'], burningTent: ['L9'], well: ['B20'], dateWoman: ['Q15'], dateHouse: ['R15'], palm: ['B5','J18','T12']
};

export const NPC_CONFIG = {
  grocery: { label: 'صاحب البقالة', src: 'All-Pic/npc/q5.png', mode: 'always', type: 'shop' },
  pharmacy: { label: 'الصيدلي', src: 'All-Pic/npc/q6.png', mode: 'always', type: 'shop' },
  spookyMan: { label: 'أبو فانوس', src: 'All-Pic/npc/q8.png', mode: 'night', type: 'enemy', light: true },
  wolf: { label: 'الذيب الصحراوي', src: 'All-Pic/npc/q4.png', mode: 'night', type: 'enemy' },
  caracal: { label: 'القط البري', src: 'All-Pic/npc/q1.png', mode: 'day', type: 'enemy' },
  oryx: { label: 'المها العربية', src: 'All-Pic/npc/q2.png', mode: 'always', type: 'animal' },
  shepherd: { label: 'الراعي', src: 'All-Pic/npc/q7.png', mode: 'always', type: 'quest' },
  camel: { label: 'الجمل الضائع', src: 'All-Pic/npc/q3.png', mode: 'always', type: 'quest' },
  archaeologist: { label: 'الباحثة الأثرية', src: 'All-Pic/npc/q09.png', mode: 'always', type: 'quest' },
  ruins: { label: 'الآثار', src: 'All-Pic/npc/q10.png', mode: 'always', type: 'quest', fixed: true },
  herbalist: { label: 'العطارة', src: 'All-Pic/npc/q11.png', mode: 'always', type: 'quest' },
  rarePlant: { label: 'النبتة النادرة', src: 'All-Pic/npc/q12.png', mode: 'always', type: 'quest', fixed: true },
  messenger: { label: 'صاحب الرسالة', src: 'All-Pic/npc/q13.png', mode: 'always', type: 'quest' },
  messengerFriend: { label: 'صديق صاحب الرسالة', src: 'All-Pic/npc/q14.png', mode: 'always', type: 'quest' },
  fireMan: { label: 'صاحب الخيمة', src: 'All-Pic/npc/q15.png', mode: 'always', type: 'quest' },
  burningTent: { label: 'الخيمة المحترقة', src: 'All-Pic/npc/q16.gif', mode: 'always', type: 'quest', fixed: true, scale: 2.2, blocking: true },
  well: { label: 'البئر', src: 'All-Pic/npc/q17.png', mode: 'always', type: 'quest', fixed: true },
  dateWoman: { label: 'صاحبة الضيوف', src: 'All-Pic/npc/q18.png', mode: 'always', type: 'quest' },
  dateHouse: { label: 'بيت صاحبة الضيوف', src: 'All-Pic/npc/q19.png', mode: 'always', type: 'quest', fixed: true, scale: 2.2, blocking: true },
  palm: { label: 'النخلة', src: 'All-Pic/npc/q20.png', mode: 'always', type: 'quest', fixed: true, scale: 1.4, blocking: true }
};

export const SHOP_ITEMS = {
  grocery: [
    { name: 'أناناس', price: 5, value: 5, img: 'All-Pic/level/Pineapple.png' }, { name: 'موز', price: 10, value: 10, img: 'All-Pic/level/Banana.png' }, { name: 'عنب', price: 15, value: 15, img: 'All-Pic/level/Grapes.png' }, { name: 'تفاح', price: 20, value: 20, img: 'All-Pic/level/Apple.png' }, { name: 'بطيخ', price: 25, value: 25, img: 'All-Pic/level/Watermelon.png' }
  ],
  pharmacy: [
    { name: 'صبار', price: 5, value: 5, img: 'All-Pic/level/Aloe-Vera.png' }, { name: 'بابونج', price: 10, value: 10, img: 'All-Pic/level/Chamomile.png' }, { name: 'كركم', price: 15, value: 15, img: 'All-Pic/level/Turmeric.png' }, { name: 'لافندر', price: 20, value: 20, img: 'All-Pic/level/Lavender.png' }, { name: 'نعناع', price: 25, value: 25, img: 'All-Pic/level/Mint.png' }
  ]
};

export const mapMoney = Array.from({ length: 25 }, (_, i) => {
  const col = 2 + ((i * 7) % 18);
  const row = 2 + ((i * 11) % 18);
  return { id: 'money_' + i, x: (col - 0.5) * CELL, y: (row - 0.5) * CELL, amount: 1 + (i % 5), src: 'All-Pic/npc/coin.gif' };
});

export const characterList = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: `man-${i+1}`, name: `رجل ${i+1}`, src: `All-Pic/Characters/man/man-${i+1}.png` })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `woman-${i+1}`, name: `امرأة ${i+1}`, src: `All-Pic/Characters/woman/woman-${i+1}.png` }))
];
