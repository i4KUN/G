export const tileGroups = [
  { key: 'bag', name: 'أكياس', folder: 'Bag', prefix: 'Bag', count: 10, w: 23, h: 23, blocking: false, icon: 'fa-bag-shopping' },
  { key: 'lighting', name: 'إنارات', folder: 'Lighting', prefix: 'Lighting', count: 10, w: 21, h: 27, blocking: false, icon: 'fa-lightbulb' },
  { key: 'door', name: 'باب', folder: 'Door', prefix: 'Door', count: 11, w: 30, h: 36, blocking: true, icon: 'fa-door-open' },
  { key: 'coffee_pot', name: 'دلة', folder: 'teapot', prefix: 'teapot', count: 18, w: 21, h: 21, blocking: false, icon: 'fa-mug-hot' },
  { key: 'cabinet', name: 'دولاب', folder: 'Cabinet', prefix: 'Cabinet', count: 16, w: 36, h: 36, blocking: false, icon: 'fa-box-archive' },
  { key: 'decor', name: 'ديكورات', folder: 'Decor', prefix: 'Decor', count: 74, w: 21, h: 21, blocking: false, icon: 'fa-gem' },
  { key: 'carpet', name: 'زولية', folder: 'Carpet', prefix: 'Carpet', count: 13, w: 45, h: 36, blocking: false, icon: 'fa-rug' },
  { key: 'curtain', name: 'ستارة', folder: 'Curtain', prefix: 'Curtain', count: 14, w: 30, h: 36, blocking: false, icon: 'fa-table-columns' },
  { key: 'bed', name: 'سرير', folder: 'Bed', prefix: 'Bed', count: 5, w: 45, h: 33, blocking: false, icon: 'fa-bed' },
  { key: 'plant', name: 'شجرة', folder: 'Plant', prefix: 'Plant', count: 106, w: 24, h: 24, blocking: false, icon: 'fa-tree' },
  { key: 'bedsheet', name: 'شرشف', folder: 'Bedsheet', prefix: 'Bedsheet', count: 24, w: 39, h: 30, blocking: false, icon: 'fa-square' },
  { key: 'plate', name: 'صحن', folder: 'Plate', prefix: 'Plate', count: 83, w: 20, h: 20, blocking: false, icon: 'fa-circle' },
  { key: 'box', name: 'صندوق', folder: 'Box', prefix: 'Box', count: 8, w: 24, h: 24, blocking: false, icon: 'fa-box' },
  { key: 'table', name: 'طاولة', folder: 'Table', prefix: 'Table', count: 49, w: 36, h: 27, blocking: false, icon: 'fa-table' },
  { key: 'pottery', name: 'فخار', folder: 'Pottery', prefix: 'Pottery', count: 25, w: 23, h: 23, blocking: false, icon: 'fa-wine-bottle' },
  { key: 'cooking_pot', name: 'قدر', folder: 'Pot', prefix: 'Pot', count: 12, w: 23, h: 23, blocking: false, icon: 'fa-bowl-food' },
  { key: 'chair', name: 'كرسي', folder: 'Chair', prefix: 'Chair', count: 15, w: 29, h: 29, blocking: false, icon: 'fa-chair' },
  { key: 'cup', name: 'كوب', folder: 'Cup', prefix: 'Cup', count: 18, w: 17, h: 17, blocking: false, icon: 'fa-mug-saucer' },
  { key: 'painting', name: 'لوحة', folder: 'Painting', prefix: 'Painting', count: 20, w: 27, h: 23, blocking: false, icon: 'fa-image' },
  { key: 'pillow', name: 'مخدة', folder: 'Pillow', prefix: 'Pillow', count: 41, w: 21, h: 17, blocking: false, icon: 'fa-square' },
  { key: 'floor_mattress', name: 'مرتبة', folder: 'Mattress', prefix: 'Mattress', count: 12, w: 39, h: 30, blocking: false, icon: 'fa-layer-group' },
  { key: 'window', name: 'نافذة', folder: 'Window', prefix: 'Window', count: 15, w: 29, h: 29, blocking: false, icon: 'fa-border-all' },
  { key: 'floor', name: 'أرضيات', folder: 'Floof', prefix: 'Floof', count: 86, w: 66, h: 66, blocking: false, icon: 'fa-grip' },
  { key: 'wall', name: 'جدران', folder: 'Wall', prefix: 'Wall', count: 27, w: 48, h: 48, blocking: true, icon: 'fa-border-top-left' }
];

export function buildTilesForGroup(group) {
  const tiles = [];
  for (let i = 1; i <= group.count; i++) {
    const num = String(i).padStart(3, '0');
    const id = `${group.prefix}_${num}`;
    tiles.push({
      id,
      name: `${group.name} ${i}`,
      category: group.key,
      src: `All-Pic/tiles/${group.folder}/${group.prefix}-${num}.png`,
      w: group.w,
      h: group.h,
      blocking: group.blocking
    });
  }
  return tiles;
}

export function getAllBuildTiles() {
  return tileGroups.flatMap(buildTilesForGroup);
}
