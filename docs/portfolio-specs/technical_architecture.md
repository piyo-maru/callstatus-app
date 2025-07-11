# 技術アーキテクチャ仕様書

## 1. システム概要

### 1.1 プロジェクト概要
- **システム名**: コールステータスアプリケーション
- **対象規模**: 300名規模企業
- **主要機能**: リアルタイムスケジュール管理、在席状況追跡、承認ワークフロー
- **開発期間**: 2024年6月〜2025年7月
- **技術スタック**: Full-stack TypeScript (Next.js 14 + NestJS)

### 1.2 ビジネス要件
- **リアルタイム性**: 1分単位精度でのスケジュール管理
- **業務継続性**: 受付業務の中断防止（顧客満足度への直接影響考慮）
- **柔軟性**: 基本契約＋個別調整の2層データ管理
- **スケーラビリティ**: 300名規模に最適化された設計

## 2. アーキテクチャ設計

### 2.1 アーキテクチャパターン
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Main View     │ │  Personal View  │ │ Monthly Planner ││
│  │  (Real-time)    │ │   (Schedule)    │ │  (Approval)     ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                    WebSocket Client                         │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Controllers   │ │   WebSocket     │ │      Guards     ││
│  │   (REST API)    │ │   (Real-time)   │ │  (JWT Auth)     ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │    Services     │ │  Layer Manager  │ │   Prisma ORM    ││
│  │ (Business Logic)│ │  (Data Layer)   │ │  (DB Access)    ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                                │
                                │ SQL
                                │
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Contract      │ │   Adjustment    │ │    Snapshot     ││
│  │  (Base Hours)   │ │  (Exceptions)   │ │   (History)     ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │     Staff       │ │   Pending       │ │   Audit Log     ││
│  │   (Users)       │ │  (Approval)     │ │  (Tracking)     ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 モジュラーモノリス設計
**設計思想**: 開発速度と保守性のバランス
- **利点**: 単一デプロイメント、データ整合性、開発効率
- **将来対応**: マイクロサービス分離への段階的移行可能性

**モジュール構成**:
```typescript
// Backend Module Structure
app.module.ts
├── auth/              // 認証・認可
├── schedules/         // スケジュール管理
├── staff/             // スタッフ管理
├── pending/           // 承認ワークフロー
├── csv-import/        // データインポート
├── snapshots/         // 履歴スナップショット
├── contracts/         // 契約管理
├── layer-manager/     // 2層データ統合
└── responsibilities/  // 担当設定
```

## 3. 技術スタック詳細

### 3.1 フロントエンド
```typescript
// Core Stack
Next.js 14        // App Router, Server Components
TypeScript        // 型安全性
Tailwind CSS      // デザインシステム
Socket.IO Client  // リアルタイム通信

// UI/UX Libraries
React DnD         // ドラッグ&ドロップ
date-fns          // 日付処理
recharts          // データ可視化
```

**フロントエンドアーキテクチャ**:
```
src/app/
├── components/
│   ├── timeline/      // 共通タイムライン
│   ├── modals/        // CRUD操作
│   ├── responsibility/ // 担当設定
│   └── types/         // 型定義
├── hooks/
│   ├── useResponsibilityData.ts
│   ├── useGlobalDisplaySettings.ts
│   └── usePresetSettings.ts
└── utils/
    ├── MainAppUtils.ts
    └── TimelineUtils.ts
```

### 3.2 バックエンド
```typescript
// Core Stack
NestJS            // エンタープライズフレームワーク
TypeScript        // 型安全性
Prisma ORM        // データベースアクセス
PostgreSQL        // メインデータベース
Socket.IO         // WebSocket通信

// Additional Libraries
bcrypt            // パスワードハッシュ
jsonwebtoken      // JWT認証
multer            // ファイルアップロード
```

**バックエンドアーキテクチャ**:
```
src/
├── auth/
│   ├── guards/        // 認証ガード
│   ├── strategies/    // JWT戦略
│   └── decorators/    // 権限デコレーター
├── schedules/
│   ├── schedules.controller.ts
│   ├── schedules.service.ts
│   └── schedules.gateway.ts    // WebSocket
├── layer-manager/
│   └── layer-manager.service.ts // 2層データ統合
└── utils/
    └── time-utils.ts           // 時刻処理
```

## 4. 重要な設計原則

### 4.1 時刻処理統一ルール
```typescript
// 内部処理は完全UTC
const utcTime = new Date().toISOString(); // "2025-07-11T12:00:00.000Z"

// 入出力層のみJST変換
const jstTime = TimeUtils.utcToJst(utcTime);

// データベース型
// TIMESTAMP WITH TIME ZONE (PostgreSQL)
```

### 4.2 2層データレイヤー
```typescript
// Layer 1: Contract (基本勤務時間)
interface Contract {
  mondayHours: string;    // "09:00-18:00"
  tuesdayHours: string;   // "09:00-18:00"
  // ... 曜日別設定
}

// Layer 2: Adjustment (個別調整)
interface Adjustment {
  date: string;           // "2025-07-11"
  startTime: string;      // "10:00"
  endTime: string;        // "17:00"
  isPending: boolean;     // 承認待ち
}

// 統合表示
const unifiedSchedule = LayerManager.merge(contract, adjustments);
```

### 4.3 リアルタイム通信設計
```typescript
// WebSocket Events
'schedule:new'      // 新規作成
'schedule:updated'  // 更新
'schedule:deleted'  // 削除
'schedule:approved' // 承認

// 部分更新システム (受付業務継続性重視)
const shouldUpdateRealtime = (
  displayDate: string,
  currentDate: string
) => {
  // 表示日付に関係なく今日の更新は必須
  return displayDate === currentDate || 
         staff.department.includes('受付');
};
```

## 5. スケーラビリティ考慮

### 5.1 現在の制約
- **WebSocket**: 50人同時接続が実用限界
- **データベース**: 単一PostgreSQLインスタンス
- **ファイル処理**: サーバー内メモリ処理

### 5.2 スケーリング戦略
```typescript
// Phase 1: 垂直スケーリング (現在)
- CPU/メモリ増強
- データベース最適化
- インデックス最適化

// Phase 2: 水平スケーリング (将来)
- Redis clustering (WebSocket)
- Read replica (PostgreSQL)
- CDN (静的ファイル)

// Phase 3: マイクロサービス化 (長期)
- 認証サービス分離
- スケジュール管理サービス
- 通知サービス
```

## 6. セキュリティ設計

### 6.1 認証・認可
```typescript
// JWT認証
@UseGuards(JwtAuthGuard)
@Roles('ADMIN', 'STAFF')
export class SchedulesController {
  // 権限チェック
  @Post()
  async createSchedule(@CurrentUser() user: User) {
    // STAFF権限は自分のスケジュールのみ
    if (user.role === 'STAFF' && data.staffId !== user.staffId) {
      throw new ForbiddenException();
    }
  }
}
```

### 6.2 データ保護
- パスワード: bcryptハッシュ化
- 通信: HTTPS強制
- 監査ログ: 全CRUD操作記録
- 履歴保護: 過去データマスキング

## 7. 運用監視

### 7.1 システム監視
```typescript
// メトリクス監視
interface SystemMetrics {
  cpu: number;              // CPU使用率
  memory: number;           // メモリ使用率
  dbResponseTime: number;   // DB応答時間
  activeConnections: number; // アクティブ接続数
  errorRate: number;        // エラー率
}
```

### 7.2 ビジネス監視
- スケジュール変更頻度
- 承認待ち件数
- システム利用状況
- パフォーマンス異常検知

## 8. 技術的成果

### 8.1 パフォーマンス成果
- **API応答時間**: 平均200ms以下を目標とした設計
- **WebSocket遅延**: 100ms以下を目標とした設計
- **データベース処理**: 複雑クエリ500ms以下を目標とした設計
- **メモリ使用量**: 1GB以下（80人同時接続を目標）

### 8.2 開発効率成果
- **TypeScript型安全性**: 実行時エラーの大幅削減を実現
- **コード再利用**: 共通コンポーネント化による効率向上
- **自動テスト**: 包括的なテストカバレッジを実現
- **デプロイ効率**: Docker化による迅速なデプロイを実現

### 8.3 運用性成果
- **稼働率**: 99.5%以上を目標とした設計
- **障害対応**: 迅速な復旧を可能とする設計
- **データ整合性**: 2層レイヤーによる堅牢な整合性保証
- **監査対応**: 完全な操作履歴追跡

---

*この技術仕様書は、実際の企業環境での大規模システム開発・運用経験に基づいて作成されています。*