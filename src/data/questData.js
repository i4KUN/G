export const QUEST_REWARD = { money: 20, levelPoints: 20 };

export const QUESTS = {
  camelQuest: {
    title: 'مهمة الراعي والجمل',
    description: 'ابحث عن الجمل الضائع ثم أرجعه إلى الراعي.',
    item: { id: 'camel', name: 'الجمل الضائع', type: 'quest', img: 'All-Pic/npc/q33.png' }
  },
  ruinsQuest: {
    title: 'مهمة الآثار',
    description: 'افحص الآثار ثم أخبر الباحثة الأثرية بمكانها.'
  },
  plantQuest: {
    title: 'مهمة النبتة النادرة',
    description: 'خذ نبتة نادرة وسلمها للعطارة.',
    item: { id: 'rarePlant', name: 'النبتة النادرة', type: 'quest', img: 'All-Pic/npc/q34.png' }
  },
  messageQuest: {
    title: 'مهمة الرسالة',
    description: 'خذ الرسالة من صاحبها وسلمها إلى صديقه.',
    item: { id: 'message_note', name: 'الرسالة', type: 'quest', img: 'All-Pic/npc/q30.png' }
  },
  fireQuest: {
    title: 'مهمة الخيمة والبئر',
    description: 'عبئ الماء من البئر وأطفئ الخيمة المحترقة.',
    item: { id: 'water_bucket', name: 'سطل الماء', type: 'quest', img: 'All-Pic/npc/q23.png' }
  },
  dateQuest: {
    title: 'مهمة التمر',
    description: 'خذ التمر من النخلة وسلمه لصاحبة الضيوف.',
    item: { id: 'dates', name: 'تمر', type: 'quest', img: 'All-Pic/npc/q31.png' }
  }
};
