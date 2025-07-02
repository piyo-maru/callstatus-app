# Database Scripts Directory

このディレクトリには、データベース操作とデータ管理用のSQLスクリプトとJavaScriptファイルが格納されています。

## 📁 ファイル分類

### 📊 SQL Scripts
- `*.sql` - データベース直接操作用のSQLスクリプト
- `insert_pending_*.sql` - pending予定データの挿入スクリプト
- `correct_pending_with_presets.sql` - プリセット付きpending予定の修正
- `full_pending_adjustments.sql` - 完全なpending調整データ

### 🔧 JavaScript Scripts
- `api_registration.js` - API経由でのデータ登録
- `create-system-admin.js` - システム管理者の作成
- `create_*_schedules.js` - 各種スケジュールデータの作成
- `insert_*_via_api.js` - API経由でのデータ挿入
- `recreate_*.js` - データの再作成スクリプト

## 🎯 主要機能

### データ作成・管理
- pending予定の一括作成
- システムユーザーの初期化
- テストデータの生成

### API統合
- REST API経由でのデータ操作
- バッチ処理による効率的なデータ挿入
- エラーハンドリングとロールバック機能

## ⚠️ 実行時の注意事項

1. **実行前の確認**
   ```bash
   # データベース接続確認
   # バックアップの作成
   # 実行対象環境の確認
   ```

2. **順序の重要性**
   - 依存関係を考慮して実行順序を決定
   - 外部キー制約に注意

3. **本番環境での実行**
   - 必ずテスト環境で事前検証
   - 実行ログの記録
   - ロールバック計画の準備

## 📝 使用例

```bash
# システム管理者の作成
node database/create-system-admin.js

# pending予定の一括作成
node database/create_full_pending_schedules.js

# SQLスクリプトの実行（PostgreSQL）
psql -d callstatus -f database/insert_pending_schedules.sql
```

## 🔒 セキュリティ

- データベース認証情報は環境変数で管理
- SQLインジェクション対策の実装
- 実行ログに機密情報を含めない