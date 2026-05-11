export const NPC_STARTS = {
  grocery: ['C4', 'R17'],
  pharmacy: ['D18', 'Q5'],
  spookyMan: ['B16','H3','N14','T8','K19'],
  wolf: ['E13','P2','S18','L7','C10'],
  caracal: ['F6','M16','R11','I20','T3'],
  oryx: ['B7','S14'],
  shepherd: ['G12'],
  camel: ['P18'],
  archaeologist: ['C3'],
  ruins: ['R4'],
  herbalist: ['N6'],
  rarePlant: ['D15','J4','T19'],
  messenger: ['M12'],
  messengerFriend: ['E19'],
  fireMan: ['K9'],
  burningTent: ['L9'],
  well: ['B20'],
  dateWoman: ['Q15'],
  dateHouse: ['R15'],
  palm: ['B5','J18','T12']
};

export const NPC_CONFIG = {
  grocery: { label: 'صاحب البقالة', src: 'All-Pic/npc/q5.png', mode: 'always', type: 'shop', shop: 'grocery', fixed: false, blocking: false },
  pharmacy: { label: 'الصيدلي', src: 'All-Pic/npc/q6.png', mode: 'always', type: 'shop', shop: 'pharmacy', fixed: false, blocking: false },
  spookyMan: { label: 'أبو فانوس', src: 'All-Pic/npc/q8.png', mode: 'night', type: 'enemy', light: true, damageHealth: 20, damageHunger: 10, damageMoney: 1, fixed: false },
  wolf: { label: 'الذيب الصحراوي', src: 'All-Pic/npc/q4.png', mode: 'night', type: 'enemy', damageHealth: 20, damageHunger: 10, damageMoney: 1, fixed: false },
  caracal: { label: 'القط البري', src: 'All-Pic/npc/q1.png', mode: 'day', type: 'enemy', damageHealth: 20, damageHunger: 10, damageMoney: 1, fixed: false },
  oryx: { label: 'المها العربية', src: 'All-Pic/npc/q2.png', mode: 'always', type: 'animal', fixed: false },
  shepherd: { label: 'الراعي', src: 'All-Pic/npc/q7.png', mode: 'always', type: 'quest', quest: 'camelQuest', fixed: false },
  camel: { label: 'الجمل الضائع', src: 'All-Pic/npc/q3.png', mode: 'always', type: 'quest', quest: 'camelQuest', fixed: false },
  archaeologist: { label: 'الباحثة الأثرية', src: 'All-Pic/npc/q09.png', mode: 'always', type: 'quest', quest: 'ruinsQuest', fixed: false },
  ruins: { label: 'الآثار', src: 'All-Pic/npc/q10.png', mode: 'always', type: 'quest', quest: 'ruinsQuest', fixed: true },
  herbalist: { label: 'العطارة', src: 'All-Pic/npc/q11.png', mode: 'always', type: 'quest', quest: 'plantQuest', fixed: false },
  rarePlant: { label: 'النبتة النادرة', src: 'All-Pic/npc/q12.png', mode: 'always', type: 'questItem', quest: 'plantQuest', fixed: true },
  messenger: { label: 'صاحب الرسالة', src: 'All-Pic/npc/q13.png', mode: 'always', type: 'quest', quest: 'messageQuest', fixed: false },
  messengerFriend: { label: 'صديق صاحب الرسالة', src: 'All-Pic/npc/q14.png', mode: 'always', type: 'quest', quest: 'messageQuest', fixed: false },
  fireMan: { label: 'صاحب الخيمة', src: 'All-Pic/npc/q15.png', mode: 'always', type: 'quest', quest: 'fireQuest', fixed: false },
  burningTent: { label: 'الخيمة المحترقة', src: 'All-Pic/npc/q16.gif', mode: 'always', type: 'questItem', quest: 'fireQuest', fixed: true, w: 160, h: 160, blocking: true },
  well: { label: 'البئر', src: 'All-Pic/npc/q17.png', mode: 'always', type: 'questItem', quest: 'fireQuest', fixed: true },
  dateWoman: { label: 'صاحبة الضيوف', src: 'All-Pic/npc/q18.png', mode: 'always', type: 'quest', quest: 'dateQuest', fixed: false },
  dateHouse: { label: 'بيت صاحبة الضيوف', src: 'All-Pic/npc/q19.png', mode: 'always', type: 'questInfo', quest: 'dateQuest', fixed: true, w: 180, h: 180, blocking: true },
  palm: { label: 'النخلة', src: 'All-Pic/npc/q20.png', mode: 'always', type: 'questItem', quest: 'dateQuest', fixed: true, w: 140, h: 140, blocking: true }
};

export function buildNpcList() {
  const list = [];
  Object.entries(NPC_STARTS).forEach(([kind, cells]) => {
    cells.forEach((cell, index) => {
      list.push({ id: `${kind}_${index + 1}`, kind, cell, ...NPC_CONFIG[kind] });
    });
  });
  return list;
}
