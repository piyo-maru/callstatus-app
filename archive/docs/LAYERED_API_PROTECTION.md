# LayeredAPI保護ガイドライン

## 🚨 LayeredAPI無効化防止の絶対ルール

### 1. 無効化される原因
- **依存関係エラー**: LayerManagerServiceとSchedulesServiceの循環参照
- **コンパイルエラー**: モジュールインポートでの設定ミス
- **起動時エラー**: 一つでもエラーがあると自動で無効化される

### 2. 確認必須事項（変更前）
```bash
# 必ずこれらを確認してから変更すること
curl -s "http://localhost:3002/api/schedules/layered?date=2025-06-23" | jq '.schedules | length'
curl -s "http://localhost:3002/api/schedules/test-contracts" | jq '.contractCount'
```

### 3. 変更時の必須手順
1. **変更前状態保存**: `git add . && git commit -m "変更前の動作状態保存"`
2. **段階的変更**: 一度に複数ファイルを変更しない
3. **変更後確認**: 必ず上記APIで動作確認
4. **エラー時の即復旧**: `git reset --hard HEAD~1`

### 4. 絶対に変更してはいけないファイル（LayeredAPI関連）
- `/backend/src/layer-manager/layer-manager.service.ts`
- `/backend/src/schedules/schedules.controller.ts` の layered エンドポイント
- `/backend/src/schedules/schedules.module.ts` の LayerManagerModule インポート

### 5. エラーが発生した場合の復旧手順
1. **即座に前の状態に戻す**: `git reset --hard HEAD~1`
2. **原因特定**: 何が問題だったかを分析
3. **最小限の変更**: 1行ずつ慎重に修正
4. **都度確認**: 各変更後にAPIテスト

### 6. 開発者への重要な注意
- **LayeredAPIは2層データ構造の核心機能**
- **無効化すると契約データ（レイヤー1）が表示されなくなる**
- **必ず変更前後でAPIテストを実行する**
- **エラーログを軽視しない**