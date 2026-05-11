export const fixedGroundTiles = [
  { cell: 'B2', src: 'All-Pic/map-pic/09.png' },
  { cell: 'E5', src: 'All-Pic/map-pic/09.png' },
  { cell: 'H8', src: 'All-Pic/map-pic/09.png' },
  { cell: 'L12', src: 'All-Pic/map-pic/09.png' },
  { cell: 'P16', src: 'All-Pic/map-pic/09.png' },
  { cell: 'D18', src: 'All-Pic/map-pic/10.png' },
  { cell: 'G14', src: 'All-Pic/map-pic/10.png' },
  { cell: 'K4', src: 'All-Pic/map-pic/10.png' },
  { cell: 'O9', src: 'All-Pic/map-pic/10.png' },
  { cell: 'T19', src: 'All-Pic/map-pic/10.png' }
];

export const fixedAnimalTiles = [
  { cell: 'C7', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'F17', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'J10', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'P4', src: 'All-Pic/animal/animal-01.gif' },
  { cell: 'S15', src: 'All-Pic/animal/animal-01.gif' }
];

export const sceneryTiles = [
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
  { cell: 'D11', src: 'All-Pic/npc/q45.png', w: 70, h: 70, blocking: false },
  { cell: 'G5', src: 'All-Pic/npc/q46.png', w: 70, h: 70, blocking: false },
  { cell: 'J20', src: 'All-Pic/npc/q47.png', w: 70, h: 70, blocking: false },
  { cell: 'M8', src: 'All-Pic/npc/q45.png', w: 70, h: 70, blocking: false },
  { cell: 'P13', src: 'All-Pic/npc/q46.png', w: 70, h: 70, blocking: false },
  { cell: 'S6', src: 'All-Pic/npc/q47.png', w: 70, h: 70, blocking: false },
  { cell: 'A18', src: 'All-Pic/npc/q45.png', w: 70, h: 70, blocking: false },
  { cell: 'I2', src: 'All-Pic/npc/q46.png', w: 70, h: 70, blocking: false },
  { cell: 'O16', src: 'All-Pic/npc/q47.png', w: 70, h: 70, blocking: false },
  { cell: 'T11', src: 'All-Pic/npc/q45.png', w: 70, h: 70, blocking: false }
];

export const coinSpawns = [
  'C3','E6','H9','K12','N15','Q18','T4','B17','F11','J5','M19','P8','S14','D20','G2','L7','O13','R10','A8','I16','T20','C13','N3','Q6','K17'
].map((cell, index) => ({ cell, value: (index % 5) + 1, src: 'All-Pic/npc/coin.gif' }));
