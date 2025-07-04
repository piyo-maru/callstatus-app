
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function insertDemoData() {
  try {
    console.log('🔄 申請予定をAdjustmentテーブルに直接登録中...');
    
    // 申請予定データ
    const applications = [
  {
    "staffId": 40,
    "date": "2025-07-07",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 215,
    "date": "2025-07-07",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 13,
    "date": "2025-07-07",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 206,
    "date": "2025-07-07",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 178,
    "date": "2025-07-07",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 209,
    "date": "2025-07-07",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 14,
    "date": "2025-07-07",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 157,
    "date": "2025-07-07",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 180,
    "date": "2025-07-07",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 179,
    "date": "2025-07-07",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 137,
    "date": "2025-07-07",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 184,
    "date": "2025-07-07",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 207,
    "date": "2025-07-07",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 33,
    "date": "2025-07-07",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 140,
    "date": "2025-07-07",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 198,
    "date": "2025-07-07",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 185,
    "date": "2025-07-07",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 72,
    "date": "2025-07-07",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 158,
    "date": "2025-07-07",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 132,
    "date": "2025-07-07",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 148,
    "date": "2025-07-07",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 106,
    "date": "2025-07-07",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 45,
    "date": "2025-07-07",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 97,
    "date": "2025-07-07",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 170,
    "date": "2025-07-07",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 7,
    "date": "2025-07-07",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 94,
    "date": "2025-07-07",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 175,
    "date": "2025-07-07",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 124,
    "date": "2025-07-07",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 75,
    "date": "2025-07-07",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 64,
    "date": "2025-07-07",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 160,
    "date": "2025-07-07",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 49,
    "date": "2025-07-07",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 69,
    "date": "2025-07-07",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 78,
    "date": "2025-07-07",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 76,
    "date": "2025-07-07",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 18,
    "date": "2025-07-07",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 44,
    "date": "2025-07-07",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 112,
    "date": "2025-07-07",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 16,
    "date": "2025-07-07",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 116,
    "date": "2025-07-07",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 47,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 174,
    "date": "2025-07-08",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 221,
    "date": "2025-07-08",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 175,
    "date": "2025-07-08",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 84,
    "date": "2025-07-08",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 41,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 126,
    "date": "2025-07-08",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 58,
    "date": "2025-07-08",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 48,
    "date": "2025-07-08",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 158,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 139,
    "date": "2025-07-08",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 35,
    "date": "2025-07-08",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 106,
    "date": "2025-07-08",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 116,
    "date": "2025-07-08",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 164,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 202,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 148,
    "date": "2025-07-08",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 185,
    "date": "2025-07-08",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 6,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 97,
    "date": "2025-07-08",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 95,
    "date": "2025-07-08",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 152,
    "date": "2025-07-08",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 87,
    "date": "2025-07-08",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 161,
    "date": "2025-07-08",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 76,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 53,
    "date": "2025-07-08",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 211,
    "date": "2025-07-08",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 62,
    "date": "2025-07-08",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 2,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 125,
    "date": "2025-07-08",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 133,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 122,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 27,
    "date": "2025-07-08",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 209,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 162,
    "date": "2025-07-08",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 160,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 212,
    "date": "2025-07-08",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 166,
    "date": "2025-07-08",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 99,
    "date": "2025-07-08",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 93,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 218,
    "date": "2025-07-08",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 141,
    "date": "2025-07-08",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 180,
    "date": "2025-07-08",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 118,
    "date": "2025-07-08",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 199,
    "date": "2025-07-09",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 41,
    "date": "2025-07-09",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 177,
    "date": "2025-07-09",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 159,
    "date": "2025-07-09",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 146,
    "date": "2025-07-09",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 65,
    "date": "2025-07-09",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 215,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 52,
    "date": "2025-07-09",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 154,
    "date": "2025-07-09",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 133,
    "date": "2025-07-09",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 102,
    "date": "2025-07-09",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 104,
    "date": "2025-07-09",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 68,
    "date": "2025-07-09",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 155,
    "date": "2025-07-09",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 178,
    "date": "2025-07-09",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 220,
    "date": "2025-07-09",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 111,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 210,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 100,
    "date": "2025-07-09",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 39,
    "date": "2025-07-09",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 216,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 60,
    "date": "2025-07-09",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 112,
    "date": "2025-07-09",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 135,
    "date": "2025-07-09",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 175,
    "date": "2025-07-09",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 98,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 196,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 113,
    "date": "2025-07-09",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 89,
    "date": "2025-07-09",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 179,
    "date": "2025-07-09",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 140,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 74,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 124,
    "date": "2025-07-09",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 204,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 156,
    "date": "2025-07-09",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 85,
    "date": "2025-07-09",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 170,
    "date": "2025-07-09",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 95,
    "date": "2025-07-09",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 96,
    "date": "2025-07-09",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 145,
    "date": "2025-07-09",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 16,
    "date": "2025-07-09",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 127,
    "date": "2025-07-09",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 84,
    "date": "2025-07-09",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 63,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 178,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 32,
    "date": "2025-07-10",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 160,
    "date": "2025-07-10",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 88,
    "date": "2025-07-10",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 76,
    "date": "2025-07-10",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 172,
    "date": "2025-07-10",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 34,
    "date": "2025-07-10",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 56,
    "date": "2025-07-10",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 216,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 204,
    "date": "2025-07-10",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 73,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 185,
    "date": "2025-07-10",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 177,
    "date": "2025-07-10",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 79,
    "date": "2025-07-10",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 96,
    "date": "2025-07-10",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 224,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 13,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 18,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 28,
    "date": "2025-07-10",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 162,
    "date": "2025-07-10",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 153,
    "date": "2025-07-10",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 209,
    "date": "2025-07-10",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 222,
    "date": "2025-07-10",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 116,
    "date": "2025-07-10",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 99,
    "date": "2025-07-10",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 166,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 89,
    "date": "2025-07-10",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 163,
    "date": "2025-07-10",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 124,
    "date": "2025-07-10",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 44,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 63,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 222,
    "date": "2025-07-11",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 109,
    "date": "2025-07-11",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 150,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 26,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 221,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 60,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 116,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 111,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 37,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 141,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 92,
    "date": "2025-07-11",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 72,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 96,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 178,
    "date": "2025-07-11",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 107,
    "date": "2025-07-11",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 46,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 212,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 98,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 75,
    "date": "2025-07-11",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 58,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 204,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 43,
    "date": "2025-07-11",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 161,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 45,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 69,
    "date": "2025-07-11",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 91,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 19,
    "date": "2025-07-11",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 22,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 154,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 73,
    "date": "2025-07-11",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 66,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 12,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 40,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 110,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 185,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 215,
    "date": "2025-07-11",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 158,
    "date": "2025-07-11",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 53,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 201,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 56,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 99,
    "date": "2025-07-11",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 206,
    "date": "2025-07-11",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 147,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 156,
    "date": "2025-07-11",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 125,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 165,
    "date": "2025-07-11",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 34,
    "date": "2025-07-11",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 183,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 79,
    "date": "2025-07-11",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 176,
    "date": "2025-07-11",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 157,
    "date": "2025-07-11",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 105,
    "date": "2025-07-11",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 134,
    "date": "2025-07-12",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 32,
    "date": "2025-07-12",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 190,
    "date": "2025-07-12",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 150,
    "date": "2025-07-12",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 96,
    "date": "2025-07-12",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 97,
    "date": "2025-07-12",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 158,
    "date": "2025-07-12",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 172,
    "date": "2025-07-12",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 44,
    "date": "2025-07-12",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 85,
    "date": "2025-07-12",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 225,
    "date": "2025-07-12",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 208,
    "date": "2025-07-12",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 127,
    "date": "2025-07-12",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 70,
    "date": "2025-07-12",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 121,
    "date": "2025-07-12",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 20,
    "date": "2025-07-12",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 68,
    "date": "2025-07-12",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 217,
    "date": "2025-07-12",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 14,
    "date": "2025-07-12",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 78,
    "date": "2025-07-12",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 30,
    "date": "2025-07-12",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 165,
    "date": "2025-07-12",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 178,
    "date": "2025-07-12",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 80,
    "date": "2025-07-12",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 195,
    "date": "2025-07-12",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 175,
    "date": "2025-07-12",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 183,
    "date": "2025-07-12",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 38,
    "date": "2025-07-12",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 203,
    "date": "2025-07-12",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 91,
    "date": "2025-07-13",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 65,
    "date": "2025-07-13",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 207,
    "date": "2025-07-13",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 6,
    "date": "2025-07-13",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 27,
    "date": "2025-07-13",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 18,
    "date": "2025-07-13",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 11,
    "date": "2025-07-13",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 98,
    "date": "2025-07-13",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 25,
    "date": "2025-07-13",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 146,
    "date": "2025-07-13",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 183,
    "date": "2025-07-13",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 138,
    "date": "2025-07-13",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 172,
    "date": "2025-07-13",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 44,
    "date": "2025-07-13",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 162,
    "date": "2025-07-13",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 66,
    "date": "2025-07-13",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 24,
    "date": "2025-07-13",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 198,
    "date": "2025-07-13",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 208,
    "date": "2025-07-13",
    "presetType": "half_afternoon_off",
    "presetName": "午後半休",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 13
      },
      {
        "status": "off",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 100,
    "date": "2025-07-13",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 178,
    "date": "2025-07-13",
    "presetType": "overtime",
    "presetName": "残業",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 20
      }
    ]
  },
  {
    "staffId": 36,
    "date": "2025-07-13",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 69,
    "date": "2025-07-13",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  },
  {
    "staffId": 33,
    "date": "2025-07-13",
    "presetType": "late_arrival",
    "presetName": "遅刻",
    "schedules": [
      {
        "status": "office",
        "start": 11,
        "end": 18
      }
    ]
  },
  {
    "staffId": 112,
    "date": "2025-07-13",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 15,
    "date": "2025-07-13",
    "presetType": "early_leave",
    "presetName": "早退",
    "schedules": [
      {
        "status": "office",
        "start": 9,
        "end": 16
      }
    ]
  },
  {
    "staffId": 39,
    "date": "2025-07-13",
    "presetType": "vacation",
    "presetName": "休暇",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 18
      }
    ]
  },
  {
    "staffId": 134,
    "date": "2025-07-13",
    "presetType": "half_morning_off",
    "presetName": "午前半休",
    "schedules": [
      {
        "status": "off",
        "start": 9,
        "end": 13
      },
      {
        "status": "office",
        "start": 13,
        "end": 18
      }
    ]
  }
];
    
    let successCount = 0;
    for (const app of applications) {
      try {
        await prisma.adjustment.create({
          data: {
            staffId: app.staffId,
            date: new Date(app.date + 'T00:00:00Z'),
            status: app.schedules[0].status,
            startTime: app.schedules[0].start,
            endTime: app.schedules[0].end,
            memo: app.presetName + ' (デモデータ)',
            isPending: false, // 承認済みとして登録
            approvedBy: 1,
            approvedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`  ✅ 申請予定 ${successCount}件 登録完了`);
        }
      } catch (error) {
        console.error(`  ❌ 申請予定登録エラー (Staff ${app.staffId}, ${app.date}):`, error.message);
      }
    }
    
    console.log(`\n📝 申請予定登録完了: ${successCount}件`);
    
    console.log('🔄 担当設定をResponsibilityテーブルに直接登録中...');
    
    // 担当設定データ
    const responsibilities = [
  {
    "staffId": 10,
    "date": "2025-07-07",
    "responsibilities": {
      "fax": true
    }
  },
  {
    "staffId": 170,
    "date": "2025-07-07",
    "responsibilities": {
      "subjectCheck": true
    }
  },
  {
    "staffId": 191,
    "date": "2025-07-07",
    "responsibilities": {
      "lunch": true
    }
  },
  {
    "staffId": 91,
    "date": "2025-07-07",
    "responsibilities": {
      "cs": true
    }
  },
  {
    "staffId": 42,
    "date": "2025-07-08",
    "responsibilities": {
      "fax": true
    }
  },
  {
    "staffId": 39,
    "date": "2025-07-08",
    "responsibilities": {
      "subjectCheck": true
    }
  },
  {
    "staffId": 221,
    "date": "2025-07-08",
    "responsibilities": {
      "lunch": true
    }
  },
  {
    "staffId": 21,
    "date": "2025-07-09",
    "responsibilities": {
      "fax": true
    }
  },
  {
    "staffId": 178,
    "date": "2025-07-09",
    "responsibilities": {
      "subjectCheck": true
    }
  },
  {
    "staffId": 184,
    "date": "2025-07-09",
    "responsibilities": {
      "lunch": true
    }
  },
  {
    "staffId": 169,
    "date": "2025-07-09",
    "responsibilities": {
      "cs": true
    }
  },
  {
    "staffId": 85,
    "date": "2025-07-10",
    "responsibilities": {
      "fax": true
    }
  },
  {
    "staffId": 181,
    "date": "2025-07-10",
    "responsibilities": {
      "subjectCheck": true
    }
  },
  {
    "staffId": 28,
    "date": "2025-07-10",
    "responsibilities": {
      "lunch": true
    }
  },
  {
    "staffId": 61,
    "date": "2025-07-10",
    "responsibilities": {
      "cs": true
    }
  },
  {
    "staffId": 11,
    "date": "2025-07-11",
    "responsibilities": {
      "fax": true
    }
  },
  {
    "staffId": 80,
    "date": "2025-07-11",
    "responsibilities": {
      "subjectCheck": true
    }
  },
  {
    "staffId": 191,
    "date": "2025-07-11",
    "responsibilities": {
      "lunch": true
    }
  },
  {
    "staffId": 175,
    "date": "2025-07-12",
    "responsibilities": {
      "fax": true
    }
  },
  {
    "staffId": 187,
    "date": "2025-07-12",
    "responsibilities": {
      "subjectCheck": true
    }
  },
  {
    "staffId": 207,
    "date": "2025-07-13",
    "responsibilities": {
      "fax": true
    }
  },
  {
    "staffId": 71,
    "date": "2025-07-13",
    "responsibilities": {
      "subjectCheck": true
    }
  },
  {
    "staffId": 144,
    "date": "2025-07-13",
    "responsibilities": {
      "lunch": true
    }
  }
];
    
    successCount = 0;
    for (const resp of responsibilities) {
      try {
        await prisma.responsibility.create({
          data: {
            staffId: resp.staffId,
            date: new Date(resp.date + 'T00:00:00Z'),
            responsibilities: resp.responsibilities,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        successCount++;
        console.log(`  ✅ 担当設定 ${successCount}件 登録完了`);
      } catch (error) {
        console.error(`  ❌ 担当設定登録エラー (Staff ${resp.staffId}, ${resp.date}):`, error.message);
      }
    }
    
    console.log(`\n👥 担当設定登録完了: ${successCount}件`);
    console.log('\n🎉 デモデータ直接登録が完了しました！');
    
  } catch (error) {
    console.error('❌ データ登録エラー:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

insertDemoData();
