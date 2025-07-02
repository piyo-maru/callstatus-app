# Test Data Directory

このディレクトリには、テストとデバッグ用のサンプルデータファイルが格納されています。

## 📁 ファイル分類

### 📋 Employee/Staff データ
- `test-employee-data*.json` - スタッフ情報のテストデータ
- `test-two-users.json` - 2ユーザー用の簡単なテストデータ
- `test-large-data.json` - 大量データのパフォーマンステスト用

### 📅 Schedule データ
- `pending_schedules_*.json` - pending予定のテストデータ
- `test-schedule-import.csv` - スケジュールインポート用CSVサンプル

### 🔧 Contract データ
- `test-contract-patterns.json` - 契約パターンのテストデータ

## 🎯 使用目的

1. **開発時のテスト**: 新機能の動作確認
2. **デバッグ**: 問題の再現と解決
3. **パフォーマンステスト**: 大量データでの動作確認
4. **API テスト**: エンドポイントの動作確認

## ⚠️ 注意事項

- これらのファイルは **テスト専用** です
- 本番環境では使用しないでください
- 個人情報は含まれていませんが、機密性に注意してください
- ファイルを追加・修正する際は、適切な命名規則に従ってください

## 📝 ファイル命名規則

```
test-[データ種別]-[用途].json
例：test-employee-data.json, test-schedule-import.csv
```