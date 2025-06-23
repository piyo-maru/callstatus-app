-- レイヤー1テスト用の契約データを投入

-- まずStaffテーブルにテストデータを追加（存在しない場合）
INSERT INTO "Staff" (name, department, "group", "empNo") 
VALUES 
('田中太郎', '営業部', '第一営業課', '8339'),
('佐藤花子', '開発部', 'システム開発課', '7764'),
('鈴木一郎', '総務部', '人事課', '1234')
ON CONFLICT ("empNo") DO NOTHING;

-- 契約データを投入
INSERT INTO "Contract" ("empNo", name, dept, team, email, "mondayHours", "tuesdayHours", "wednesdayHours", "thursdayHours", "fridayHours", "saturdayHours", "sundayHours", "staffId", "updatedAt") 
VALUES 
('8339', '田中太郎', '営業部', '第一営業課', 'tanaka@example.com', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-18:00', NULL, NULL, (SELECT id FROM "Staff" WHERE "empNo" = '8339'), NOW()),
('7764', '佐藤花子', '開発部', 'システム開発課', 'sato@example.com', '10:00-19:00', '10:00-19:00', '10:00-19:00', '10:00-19:00', '10:00-19:00', NULL, NULL, (SELECT id FROM "Staff" WHERE "empNo" = '7764'), NOW()),
('1234', '鈴木一郎', '総務部', '人事課', 'suzuki@example.com', '08:30-17:30', '08:30-17:30', '08:30-17:30', '08:30-17:30', '08:30-17:30', NULL, NULL, (SELECT id FROM "Staff" WHERE "empNo" = '1234'), NOW())
ON CONFLICT ("empNo") DO UPDATE SET
  name = EXCLUDED.name,
  dept = EXCLUDED.dept,
  team = EXCLUDED.team,
  email = EXCLUDED.email,
  "mondayHours" = EXCLUDED."mondayHours",
  "tuesdayHours" = EXCLUDED."tuesdayHours",
  "wednesdayHours" = EXCLUDED."wednesdayHours",
  "thursdayHours" = EXCLUDED."thursdayHours",
  "fridayHours" = EXCLUDED."fridayHours",
  "saturdayHours" = EXCLUDED."saturdayHours",
  "sundayHours" = EXCLUDED."sundayHours",
  "updatedAt" = NOW();