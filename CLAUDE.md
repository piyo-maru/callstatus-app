# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 会話ガイドライン

- 常に日本語で会話する

## プロジェクト概要

**コールステータスアプリ** - スタッフのスケジュール管理と在席状況をリアルタイムで追跡するシステムです。タイムライン形式のインターフェースでスケジュールの作成・編集・監視が可能で、全接続クライアントに即座に更新が反映されます。

**技術スタック:**
- フロントエンド: Next.js 14 + TypeScript + Tailwind CSS + Socket.IO
- バックエンド: NestJS + TypeScript + Prisma ORM + PostgreSQL + WebSockets
- 開発環境: Docker Compose（ライブリロード対応）

## 開発コマンド

### フルスタック開発
```bash
# 全サービス起動（フロントエンド、バックエンド、データベース）
docker-compose up -d

# コンテナ名を確認
docker ps

# フロントエンド開発用（コンテナ名を確認してから実行）
docker exec -it <frontend_container_name> /bin/bash
cd /app && npm run dev

# バックエンド開発用（コンテナ名を確認してから実行）
docker exec -it <backend_container_name> /bin/bash
cd /app && npm run start:dev

# ログ確認
docker-compose logs -f frontend
docker-compose logs -f backend
```

### バックエンド開発
```bash
# バックエンドコンテナ内またはbackend/ディレクトリ内で実行
npm run start:dev      # ホットリロード付き開発モード
npm run build          # プロダクションビルド
npm run lint           # ESLint（自動修正付き）
npm run format         # Prettier フォーマット
npm run test           # ユニットテスト
npm run test:watch     # ユニットテスト（ウォッチモード）
npm run test:e2e       # E2Eテスト
npm run test:cov       # テストカバレッジ

# データベース操作
npx prisma migrate dev     # マイグレーション実行
npx prisma generate        # Prismaクライアント生成
npx prisma studio         # データベースブラウザUI
```

### フロントエンド開発
```bash
# フロントエンドコンテナ内またはfrontend/ディレクトリ内で実行
npm run dev           # 開発サーバー
npm run build         # プロダクションビルド
npm run start         # プロダクションビルド実行
npm run lint          # Next.jsリンティング
```

## アーキテクチャ概要

### バックエンドアーキテクチャ
- **NestJSモジュラー構造** - 専用の`schedules`モジュール
- **WebSocketゲートウェイ** (`schedules.gateway.ts`) - リアルタイム更新用
- **Prismaサービス** - PostgreSQLデータベース連携
- **RESTful API** - パフォーマンス向上のための日付フィルタークエリ
- **UTC基準時間処理** - タイムゾーン問題回避

**主要ファイル:**
- `src/schedules/schedules.service.ts` - 時間変換を含むコアビジネスロジック
- `src/schedules/schedules.gateway.ts` - WebSocketイベント処理
- `src/schedules/schedules.controller.ts` - REST APIエンドポイント
- `prisma/schema.prisma` - データベーススキーマ（StaffとScheduleテーブル）

### フロントエンドアーキテクチャ
- **シングルページアプリケーション** - 全機能が`src/app/page.tsx`に集約（548行）
- **リアルタイムWebSocket統合** - Socket.IOクライアント
- **カスタムモーダルシステム** - Reactポータル使用
- **インタラクティブタイムラインUI** - ドラッグ&ドロップでスケジュール作成
- **日本語ローカライゼーション** - date-fns使用

**主要機能:**
- 非線形タイムラインスケーリング（9:00-18:00 vs 18:00以降の時間）
- 多段階フィルタリング（部署、グループ、在席状況）
- リアルタイム現在時刻インジケーター
- 15分間隔対応のカスタム時間変換関数

### Database Schema
```prisma
model Staff {
  id          Int        @id @default(autoincrement())
  name        String
  department  String  
  group       String
  schedules   Schedule[]
}

model Schedule {
  id        Int      @id @default(autoincrement())
  status    String   # 'working', 'break', 'unavailable', etc.
  start     DateTime
  end       DateTime
  staff     Staff    @relation(fields: [staffId], references: [id])
  staffId   Int
}
```

## API Structure

### REST Endpoints
- `GET /api/schedules?date=YYYY-MM-DD` - Get schedules for specific date
- `POST /api/schedules` - Create new schedule
- `PATCH /api/schedules/:id` - Update existing schedule  
- `DELETE /api/schedules/:id` - Delete schedule

### WebSocket Events
- `schedule:new` - Broadcast new schedule creation
- `schedule:updated` - Broadcast schedule updates
- `schedule:deleted` - Broadcast schedule deletion

## Development Patterns

### Time Handling
- All database times stored in UTC
- Frontend displays in local timezone
- Date parameter passed separately from time for proper conversion
- Special `toDate()` helper in service handles decimal hours → Date conversion

### Real-time Updates
- All CRUD operations broadcast via WebSocket
- Frontend automatically updates UI on receiving WebSocket events
- Socket.IO rooms not used - all clients receive all updates

### Frontend State Management
- React hooks (useState, useEffect, useMemo, useCallback)
- No external state management library
- Real-time data synchronized via WebSocket events

## Configuration Notes

### Docker Development Setup
- Frontend runs on port 3000
- Backend runs on port 3002 (modified from default 3001)
- PostgreSQL on port 5432
- Volume mounts enabled for live code reloading
- Database connection: `postgresql://user:password@db:5432/mydb`

### Japanese Localization
- All UI text in Japanese
- Date formats using Japanese locale (年月日)
- React DatePicker configured with Japanese locale

### API Configuration
- CORS enabled for all origins in development
- No global API prefix (disabled in main.ts)
- Socket.IO CORS configured for development

## Testing Notes
- Jest configured for both unit and e2e tests
- Minimal test coverage currently exists
- Test environment properly set up for expansion
- Database testing would require test database setup

## Common Development Tasks

### Adding New Schedule Status
1. Update frontend status options in page.tsx
2. Update backend validation if needed
3. Consider adding database enum constraint

### Modifying Time Intervals
- Update `STEP_MINUTES` constant in frontend
- Adjust time conversion logic in backend service
- Update timeline rendering calculations

### Adding Staff Management
- Create new staff module in backend
- Add staff CRUD endpoints
- Extend frontend with staff management UI
- Update WebSocket events for staff changes

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.