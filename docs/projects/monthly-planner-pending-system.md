# 月次プランナー pending/approval システム実装計画書

## 📋 プロジェクト概要

### 目的
月次プランナーに承認ワークフロー機能を追加し、スケジュール登録の段階的管理を実現する。

### 基本コンセプト
```
一般ユーザー: 予定登録（pending状態）
     ↓
管理者: 承認・却下判断
     ↓
システム: pending → active 変換
```

## 🎯 機能要件

### 1. Pending機能
- **月次プランナーでの予定入力**: カレンダーセルクリックでpending作成
- **Pending状態管理**: 編集可能・視覚的区別・承認待ち表示
- **ユーザー権限**: 自分のpendingのみ編集可能

### 2. 承認機能
- **管理者画面**: pending一覧・承認・却下操作
- **一括処理**: 複数pending同時承認
- **承認履歴**: 承認者・承認日時・理由記録

### 3. 統合表示
- **メイン画面**: pending + active スケジュール表示
- **個人ページ**: 承認状況確認
- **履歴機能**: 承認・却下履歴閲覧

## 🗄️ データベース設計

### Adjustmentテーブル拡張
```sql
ALTER TABLE "Adjustment" ADD COLUMN "isPending" BOOLEAN DEFAULT false;
ALTER TABLE "Adjustment" ADD COLUMN "approvedBy" INTEGER;
ALTER TABLE "Adjustment" ADD COLUMN "approvedAt" TIMESTAMP;
ALTER TABLE "Adjustment" ADD COLUMN "pendingType" VARCHAR(50);
ALTER TABLE "Adjustment" ADD COLUMN "rejectedAt" TIMESTAMP;
ALTER TABLE "Adjustment" ADD COLUMN "rejectedBy" INTEGER;
ALTER TABLE "Adjustment" ADD COLUMN "rejectionReason" TEXT;
```

### 新規テーブル: PendingApprovalLog
```sql
CREATE TABLE "PendingApprovalLog" (
  "id" SERIAL PRIMARY KEY,
  "adjustmentId" INTEGER NOT NULL,
  "action" VARCHAR(20) NOT NULL, -- 'approved', 'rejected'
  "actorId" INTEGER NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY ("adjustmentId") REFERENCES "Adjustment"("id"),
  FOREIGN KEY ("actorId") REFERENCES "Staff"("id")
);
```

## 🔌 API設計

### Pending管理API
```typescript
// Pending CRUD
POST   /api/schedules/pending
GET    /api/schedules/pending?staffId=123&date=2025-06-23
PUT    /api/schedules/pending/:id
DELETE /api/schedules/pending/:id

// 承認ワークフロー
POST   /api/schedules/pending/:id/approve
POST   /api/schedules/pending/:id/reject
GET    /api/admin/pending-schedules
POST   /api/admin/pending-schedules/bulk-approve

// 統合取得
GET    /api/schedules/unified-with-pending?date=2025-06-23
```

### リクエスト・レスポンス仕様
```typescript
// Pending作成
interface CreatePendingRequest {
  staffId: number;
  date: string;
  status: string;
  start: number;
  end: number;
  memo?: string;
  pendingType: 'monthly-planner' | 'manual';
}

// 承認リクエスト
interface ApprovalRequest {
  reason?: string;
}

// Pending付きスケジュール
interface ScheduleWithPending extends Schedule {
  isPending: boolean;
  approvedBy?: number;
  approvedAt?: string;
  pendingType?: string;
}
```

## 🎨 フロントエンド設計

### 1. 月次プランナー改修 (`/monthly-planner/page.tsx`)

#### 主要機能
- **セル入力**: クリックでpending作成
- **Pending表示**: オレンジ枠 + 半透明 + "承認待ち"ラベル
- **編集機能**: pending状態のみ編集・削除可能
- **視覚的区別**: active/pending/rejected の明確な区別

#### UI仕様
```typescript
// Pendingセルスタイル
className={`
  border-2 border-orange-400 border-dashed
  bg-orange-50 opacity-70
  relative
`}

// 承認待ちラベル
<div className="absolute top-0 right-0 bg-orange-500 text-white text-xs px-1 rounded-bl">
  承認待ち
</div>
```

### 2. 管理者承認画面 (`/admin/pending-approvals/page.tsx`)

#### 画面構成
- **フィルター**: 部署・グループ・日付範囲・申請者
- **一覧表示**: pending リスト（申請者・日付・内容・申請日時）
- **操作パネル**: 個別承認・一括承認・却下
- **履歴表示**: 承認・却下履歴

#### 一括処理機能
```typescript
interface BulkApprovalRequest {
  pendingIds: number[];
  action: 'approve' | 'reject';
  reason?: string;
}
```

### 3. 既存画面統合

#### メイン画面 (`/page.tsx`)
- Pending表示: 半透明 + "P"マーク
- ツールチップ: 承認状況表示

#### 個人ページ (`/personal/page.tsx`)
- Pending一覧: 自分の申請状況
- 承認履歴: 過去の承認・却下記録

## 🚀 実装フェーズ

### Phase 1: データ基盤 (Week 1)
**目標**: Pending データ管理基盤構築

**実装項目**:
- [ ] データベースマイグレーション実行
- [ ] PendingService実装
- [ ] Pending CRUD API実装
- [ ] 統合取得API実装

**成果物**:
- マイグレーションファイル
- PendingService クラス
- API テストケース

### Phase 2: 月次プランナー改修 (Week 2)
**目標**: Pending作成・表示・編集機能

**実装項目**:
- [ ] `/monthly-planner/page.tsx` 完全書き換え
- [ ] Pending作成フロー実装
- [ ] 視覚的区別実装
- [ ] 編集・削除機能実装

**成果物**:
- 新しい月次プランナーコンポーネント
- Pending状態管理ロジック
- UI/UXテスト

### Phase 3: 承認システム (Week 3)
**目標**: 管理者承認画面・ワークフロー

**実装項目**:
- [ ] 承認・却下API実装
- [ ] 管理者画面実装
- [ ] 一括処理機能実装
- [ ] 権限チェック強化

**成果物**:
- 管理者承認画面
- 承認ワークフローAPI
- 権限管理システム

### Phase 4: 統合・最適化 (Week 4)
**目標**: 既存システム統合・パフォーマンス最適化

**実装項目**:
- [ ] メイン画面・個人ページ統合
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化
- [ ] ドキュメント整備

**成果物**:
- 統合システム
- 最適化レポート
- 運用ドキュメント

## 🔒 セキュリティ・権限設計

### 権限レベル
```typescript
enum PendingPermission {
  CREATE_OWN = 'create_own_pending',      // 自分のpending作成
  EDIT_OWN = 'edit_own_pending',          // 自分のpending編集
  VIEW_ALL = 'view_all_pending',          // 全pending閲覧
  APPROVE = 'approve_pending',            // pending承認
  BULK_APPROVE = 'bulk_approve_pending'   // 一括承認
}
```

### アクセス制御
- **一般ユーザー**: 自分のpendingのみ作成・編集
- **管理者**: 全pending閲覧・承認・却下
- **スーパー管理者**: 一括処理・システム設定

## 📊 監査・ログ機能

### 監査対象
- Pending作成・編集・削除
- 承認・却下操作
- 一括処理実行
- 権限変更

### ログ形式
```typescript
interface PendingAuditLog {
  id: string;
  action: string;           // 'create', 'approve', 'reject', etc.
  actorId: number;         // 実行者
  targetPendingId: number; // 対象pending
  reason?: string;         // 理由
  metadata: object;        // 追加情報
  timestamp: Date;
}
```

## 🧪 テスト戦略

### ユニットテスト
- PendingService メソッド
- API エンドポイント
- 権限チェック機能

### 統合テスト
- Pending → Active 変換フロー
- 承認ワークフロー
- 権限ベースアクセス制御

### E2Eテスト
- ユーザー申請フロー
- 管理者承認フロー
- エラーケース処理

## 🚀 本番デプロイ計画

### デプロイ戦略
1. **段階的ロールアウト**: 特定部署での限定運用開始
2. **フィードバック収集**: 2週間の試行期間
3. **全社展開**: 問題なければ全社導入

### 運用監視
- Pending滞留アラート
- 承認率・却下率統計
- パフォーマンス監視

## 📈 成功指標・KPI

### 機能指標
- [ ] Pending作成成功率: 99%以上
- [ ] 承認処理時間: 平均24時間以内
- [ ] システム可用性: 99.9%以上

### 業務指標
- [ ] スケジュール管理効率向上: 30%改善
- [ ] 承認プロセス透明性向上
- [ ] ユーザー満足度: 80%以上

---

## 📝 更新履歴
- 2025-06-26: 初版作成
- 今後のアップデートをここに記録