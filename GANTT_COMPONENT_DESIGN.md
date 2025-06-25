# ガントチャート共通コンポーネント設計書

## 概要

メイン画面（FullMainApp.tsx）と個人ページ（PersonalSchedulePage.tsx）で重複しているガントチャート関連のコードを共通コンポーネント化し、保守性と再利用性を向上させる。

## 現状の重複コード分析

### 1. 時間関連ユーティリティ（重複度：100%）
```typescript
// 両ファイルで同一のコード
const timeToPositionPercent = (time: number): number => { ... }
const positionPercentToTime = (percent: number): number => { ... }
const generateTimeOptions = (startHour: number, endHour: number) => { ... }
```

### 2. タイムライン描画（重複度：95%）
- 時間ヘッダー（8:00-21:00）
- 15分間隔グリッド線
- 早朝・夜間エリア背景
- 現在時刻インジケーター

### 3. スケジュールバー描画（重複度：90%）
- バー配置ロジック
- レイヤー優先順位
- ステータス色設定
- ドラッグ&ドロップ処理

## 提案する共通コンポーネント構成

### 1. **TimelineUtils.ts** - ユーティリティ関数集
```typescript
export const TIMELINE_CONFIG = {
  START_HOUR: 8,
  END_HOUR: 21,
  MINUTES_STEP: 15,
  TOTAL_QUARTERS: (21 - 8) * 4  // 52マス
};

export const timeToPositionPercent = (time: number): number => { ... }
export const positionPercentToTime = (percent: number): number => { ... }
export const generateTimeOptions = (startHour: number, endHour: number) => { ... }
```

### 2. **TimelineHeader.tsx** - 時間ヘッダーコンポーネント
```typescript
interface TimelineHeaderProps {
  startHour?: number;
  endHour?: number;
  className?: string;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({ ... }) => {
  // 時間ヘッダーの描画ロジック
}
```

### 3. **TimelineGrid.tsx** - グリッド線コンポーネント
```typescript
interface TimelineGridProps {
  showMinorLines?: boolean;
  currentTime?: Date;
  highlightAreas?: Array<{start: number, end: number, className: string}>;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({ ... }) => {
  // グリッド線・背景・現在時刻インジケーターの描画
}
```

### 4. **ScheduleBar.tsx** - スケジュールバーコンポーネント
```typescript
interface ScheduleBarProps {
  schedule: Schedule;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (scheduleId: number) => void;
  isDraggable?: boolean;
  showMemo?: boolean;
  statusColors: Record<string, string>;
}

export const ScheduleBar: React.FC<ScheduleBarProps> = ({ ... }) => {
  // スケジュールバーの描画・インタラクション
}
```

### 5. **GanttTimeline.tsx** - 統合タイムラインコンポーネント
```typescript
interface GanttTimelineProps {
  schedules: Schedule[];
  onScheduleEdit?: (schedule: Schedule) => void;
  onScheduleDelete?: (scheduleId: number) => void;
  onNewScheduleCreate?: (date: Date, timeRange: {start: number, end: number}) => void;
  enableDragDrop?: boolean;
  variant: 'daily' | 'monthly';  // 表示形式
  currentDate: Date;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({ ... }) => {
  // 完全なタイムライン機能を統合
}
```

## 段階的実装計画

### Phase 1: ユーティリティ分離（1日）
1. `TimelineUtils.ts` の作成
2. FullMainApp.tsx での TimelineUtils 使用
3. PersonalSchedulePage.tsx での TimelineUtils 使用

### Phase 2: 基本コンポーネント化（2日）
1. `TimelineHeader.tsx` の作成・適用
2. `TimelineGrid.tsx` の作成・適用
3. 既存機能の動作確認

### Phase 3: 高度なコンポーネント化（2日）
1. `ScheduleBar.tsx` の作成・適用
2. `GanttTimeline.tsx` の統合実装
3. 全機能のテスト・最適化

## 利点

### 1. **保守性向上**
- バグ修正・機能追加が1箇所で済む
- コードの一貫性保証

### 2. **再利用性向上**
- 新しい画面でのタイムライン機能追加が容易
- カスタマイズ可能なプロパティ設計

### 3. **パフォーマンス向上**
- 共通ロジックの最適化
- 不要な再レンダリング削減

### 4. **開発効率向上**
- 重複コード削減（推定 40% のコード削減）
- テストコードの共通化

## 互換性確保

### 1. **既存API維持**
- 現在のpropsインターフェースを保持
- 段階的移行で機能停止なし

### 2. **柔軟性確保**
- カスタマイズ可能なプロパティ
- ディフォルト値での後方互換性

### 3. **TypeScript安全性**
- 厳密な型定義
- ランタイムエラー防止

## 実装時の注意点

### 1. **状態管理**
- 各画面固有の状態は外部で管理
- コンポーネントはプレゼンテーション層に特化

### 2. **イベント処理**
- コールバック関数でのイベント委譲
- 親コンポーネントでの状態更新

### 3. **スタイリング**
- Tailwind CSS クラスの統一
- カスタムクラス対応

## リスク評価

### Low Risk
- ユーティリティ関数の分離
- プレゼンテーションコンポーネント化

### Medium Risk
- 複雑なイベント処理の統合
- ドラッグ&ドロップ機能の共通化

### High Risk
- 既存機能への影響
- パフォーマンスの劣化

## 成功指標

1. **コード削減率**: 30-40% のコード削減
2. **バグ数減少**: タイムライン関連バグの 50% 削減
3. **開発速度**: 新機能追加時間の 30% 短縮
4. **テスト可能性**: ユニットテストカバレッジ 80% 以上

---

**次のアクション**: Phase 1（ユーティリティ分離）から開始し、段階的に実装する