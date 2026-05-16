'use strict';
// GameNjd missions-data exported from editor

const SHOP_ITEMS = {
  "grocery": [
    {
      "name": "أناناس",
      "price": 5,
      "value": 5,
      "img": "All-Pic/level/Pineapple.png"
    },
    {
      "name": "موز",
      "price": 10,
      "value": 10,
      "img": "All-Pic/level/Banana.png"
    },
    {
      "name": "عنب",
      "price": 15,
      "value": 15,
      "img": "All-Pic/level/Grapes.png"
    },
    {
      "name": "تفاح",
      "price": 20,
      "value": 20,
      "img": "All-Pic/level/Apple.png"
    },
    {
      "name": "بطيخ",
      "price": 25,
      "value": 25,
      "img": "All-Pic/level/Watermelon.png"
    }
  ],
  "pharmacy": [
    {
      "name": "صبار",
      "price": 5,
      "value": 5,
      "img": "All-Pic/level/Aloe-Vera.png"
    },
    {
      "name": "بابونج",
      "price": 10,
      "value": 10,
      "img": "All-Pic/level/Chamomile.png"
    },
    {
      "name": "كركم",
      "price": 15,
      "value": 15,
      "img": "All-Pic/level/Turmeric.png"
    },
    {
      "name": "لافندر",
      "price": 20,
      "value": 20,
      "img": "All-Pic/level/Lavender.png"
    },
    {
      "name": "نعناع",
      "price": 25,
      "value": 25,
      "img": "All-Pic/level/Mint.png"
    }
  ]
};

const NPC_STARTS = {
  "grocery": [
    "C4",
    "Q5"
  ],
  "pharmacy": [
    "E5",
    "R4"
  ],
  "spookyMan": [
    "M4",
    "Q7",
    "B17",
    "H18",
    "S17"
  ],
  "wolf": [
    "C15",
    "D18",
    "N16",
    "S13",
    "K8"
  ],
  "caracal": [
    "G13",
    "P18",
    "S11",
    "L17"
  ],
  "oryx": [
    "I10",
    "S18"
  ],
  "shepherd": [
    "I14"
  ],
  "camel": [
    "L15"
  ],
  "archaeologist": [
    "R3"
  ],
  "ruins": [
    "Q4"
  ],
  "herbalist": [
    "P15"
  ],
  "rarePlant": [
    "C10",
    "O18",
    "G12"
  ],
  "messenger": [
    "K10"
  ],
  "messengerFriend": [
    "E17"
  ],
  "fireMan": [
    "J17"
  ],
  "burningTent": [
    "I17"
  ],
  "well": [
    "D4"
  ],
  "dateWoman": [
    "O13"
  ],
  "dateHouse": [
    "P13"
  ],
  "palm": [
    "O16"
  ]
};

const NPC_CONFIG = {
  "grocery": {
    "label": "صاحب البقالة",
    "src": "All-Pic/npc/q5.png",
    "mode": "always",
    "type": "shop"
  },
  "pharmacy": {
    "label": "الصيدلي",
    "src": "All-Pic/npc/q6.png",
    "mode": "always",
    "type": "shop"
  },
  "spookyMan": {
    "label": "أبو فانوس",
    "src": "All-Pic/npc/q8.png",
    "mode": "night",
    "type": "enemy",
    "light": true
  },
  "wolf": {
    "label": "الذيب الصحراوي",
    "src": "All-Pic/npc/q4.png",
    "mode": "night",
    "type": "enemy"
  },
  "caracal": {
    "label": "القط البري",
    "src": "All-Pic/npc/q1.png",
    "mode": "day",
    "type": "enemy"
  },
  "oryx": {
    "label": "المها العربية",
    "src": "All-Pic/npc/q2.png",
    "mode": "always",
    "type": "animal"
  },
  "shepherd": {
    "label": "الراعي",
    "src": "All-Pic/npc/q7.png",
    "mode": "always",
    "type": "quest"
  },
  "camel": {
    "label": "الجمل الضائع",
    "src": "All-Pic/npc/q3.png",
    "mode": "always",
    "type": "quest"
  },
  "archaeologist": {
    "label": "الباحثة الأثرية",
    "src": "All-Pic/npc/q09.png",
    "mode": "always",
    "type": "quest"
  },
  "ruins": {
    "label": "الآثار",
    "src": "All-Pic/npc/q10.png",
    "mode": "always",
    "type": "quest",
    "fixed": true,
    "scale": 1
  },
  "herbalist": {
    "label": "العطارة",
    "src": "All-Pic/npc/q11.png",
    "mode": "always",
    "type": "quest"
  },
  "rarePlant": {
    "label": "النبتة النادرة",
    "src": "All-Pic/npc/q12.png",
    "mode": "always",
    "type": "quest",
    "fixed": true,
    "scale": 0.57
  },
  "messenger": {
    "label": "صاحب الرسالة",
    "src": "All-Pic/npc/q13.png",
    "mode": "always",
    "type": "quest"
  },
  "messengerFriend": {
    "label": "صديق صاحب الرسالة",
    "src": "All-Pic/npc/q14.png",
    "mode": "always",
    "type": "quest"
  },
  "fireMan": {
    "label": "صاحب الخيمة",
    "src": "All-Pic/npc/q15.png",
    "mode": "always",
    "type": "quest"
  },
  "burningTent": {
    "label": "الخيمة المحترقة",
    "src": "All-Pic/npc/q16.gif",
    "mode": "always",
    "type": "quest",
    "fixed": true,
    "light": true,
    "scale": 3.57,
    "blocking": true
  },
  "well": {
    "label": "البئر",
    "src": "All-Pic/npc/q17.png",
    "mode": "always",
    "type": "quest",
    "fixed": true,
    "scale": 0.71
  },
  "dateWoman": {
    "label": "صاحبة الضيوف",
    "src": "All-Pic/npc/q18.png",
    "mode": "always",
    "type": "quest"
  },
  "dateHouse": {
    "label": "بيت صاحبة الضيوف",
    "src": "All-Pic/npc/q19.png",
    "mode": "always",
    "type": "quest",
    "fixed": true,
    "scale": 3.57,
    "blocking": true
  },
  "palm": {
    "label": "النخلة",
    "src": "All-Pic/npc/q20.png",
    "mode": "always",
    "type": "quest",
    "fixed": true,
    "scale": 2.86,
    "blocking": true
  }
};

const MISSION_DEFINITIONS = [
  {
    "key": "chooseCharacter",
    "text": "اختر شخصية",
    "money": 5,
    "points": 5
  },
  {
    "key": "placeFiveItems",
    "text": "ضع 5 عناصر في عالمك",
    "money": 5,
    "points": 5
  },
  {
    "key": "useThreeCategories",
    "text": "استخدم 3 أقسام مختلفة",
    "money": 5,
    "points": 5
  },
  {
    "key": "setHome",
    "text": "حدد منزلك",
    "money": 5,
    "points": 5
  },
  {
    "key": "visitThreeCells",
    "text": "زر 3 خلايا مختلفة",
    "money": 5,
    "points": 5
  },
  {
    "key": "shepherdCamel",
    "text": "ابحث عن الراعي والجمل",
    "money": 20,
    "points": 20
  },
  {
    "key": "archaeology",
    "text": "مهمة الباحثة الأثرية",
    "money": 20,
    "points": 20
  },
  {
    "key": "rarePlants",
    "text": "مهمة النباتات النادرة",
    "money": 20,
    "points": 20
  },
  {
    "key": "messageQuest",
    "text": "مهمة الرسالة",
    "money": 20,
    "points": 20
  },
  {
    "key": "fireQuest",
    "text": "مهمة الخيمة والبئر",
    "money": 20,
    "points": 20
  },
  {
    "key": "dateQuest",
    "text": "مهمة التمر",
    "money": 20,
    "points": 20
  },
  {
    "key": "collectFirstMoney",
    "text": "اجمع أول ريال من الخريطة",
    "money": 5,
    "points": 5
  },
  {
    "key": "usedShop",
    "text": "تحدث مع صاحب البقالة أو الصيدلي",
    "money": 5,
    "points": 5
  }
];
