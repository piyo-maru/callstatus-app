# 🤝 Contributing Guide

CallStatusプロジェクトへのコントリビューションを歓迎します！このガイドに従って、効果的な貢献をお願いします。

## 📋 目次
- [貢献方法](#貢献方法)
- [開発環境セットアップ](#開発環境セットアップ)
- [コードスタイル](#コードスタイル)
- [プルリクエスト](#プルリクエスト)
- [イシュー報告](#イシュー報告)
- [行動規範](#行動規範)

---

## 貢献方法

### 🎯 貢献できる分野

1. **バグ修正** - 動作不良の修正
2. **新機能開発** - 機能追加・改善
3. **ドキュメント改善** - README、API仕様書等の充実
4. **テスト追加** - テストカバレッジ向上
5. **パフォーマンス改善** - 最適化・高速化
6. **UI/UX改善** - ユーザビリティ向上

### 🚀 始め方

1. **Forkしてクローン**
   ```bash
   git clone https://github.com/your-username/callstatus-app.git
   cd callstatus-app
   ```

2. **機能ブランチ作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **開発・テスト**
   ```bash
   # 開発環境起動
   docker-compose up -d
   
   # テスト実行
   npm run test
   npm run test:e2e
   ```

4. **コミット・プッシュ**
   ```bash
   git commit -m \"feat: add new feature\"
   git push origin feature/your-feature-name
   ```

5. **プルリクエスト作成**

---

## 開発環境セットアップ

### 🛠 前提条件

- Node.js 18+
- Docker & Docker Compose
- Git

### 🔧 セットアップ手順

```bash
# 1. 依存関係インストール
npm install
cd frontend && npm install
cd ../backend && npm install

# 2. 環境設定
cp config.ini.sample config.ini
cp frontend/public/config.js.sample frontend/public/config.js

# 3. Docker環境起動
docker-compose up -d

# 4. データベース初期化
docker exec callstatus-app_backend_1 npx prisma generate
docker exec callstatus-app_backend_1 npx prisma migrate dev

# 5. 開発サーバー起動
# Terminal 1: Backend
docker exec -it callstatus-app_backend_1 bash -c \"cd /app && npm run start:dev\"

# Terminal 2: Frontend
docker exec -it callstatus-app_frontend_1 bash -c \"cd /app && npm run dev\"
```

---

## コードスタイル

### 📝 基本原則

1. **TypeScript First** - 完全な型安全性を保つ
2. **関数型プログラミング** - 純粋関数・不変性を重視
3. **コンポーネント分割** - 単一責任原則に従う
4. **可読性重視** - 明確な命名・適切なコメント

### 🎨 フォーマッター・リンター

```bash
# コード整形
npm run format

# リンター実行
npm run lint

# 型チェック
npm run type-check
```

### 📋 命名規則

#### **ファイル・ディレクトリ**
```
components/        # React コンポーネント
hooks/            # カスタムフック
utils/            # ユーティリティ関数
types/            # 型定義
constants/        # 定数
```

#### **変数・関数**
```typescript
// 変数: camelCase
const userName = 'John Doe';
const scheduleData = [];

// 関数: camelCase + 動詞
const fetchSchedules = async () => {};
const handleSubmit = () => {};

// コンポーネント: PascalCase
const ScheduleModal = () => {};
const TimelineGrid = () => {};

// 定数: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:3002';
const MAX_RETRY_COUNT = 3;
```

#### **型定義**
```typescript
// Interface: PascalCase + I prefix（省略可）
interface ScheduleData {
  id: number;
  staffId: number;
  status: string;
}

// Type: PascalCase
type StatusType = 'online' | 'remote' | 'off';

// Enum: PascalCase
enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}
```

### 🧪 テスト規則

#### **テストファイル命名**
```
component.test.tsx    # コンポーネントテスト
service.test.ts       # サービステスト
utils.test.ts         # ユーティリティテスト
e2e.spec.ts          # E2Eテスト
```

#### **テスト構造**
```typescript
describe('ScheduleService', () => {
  describe('createSchedule', () => {
    test('should create schedule successfully', async () => {
      // Arrange
      const scheduleData = { staffId: 1, date: '2025-01-01' };
      
      // Act
      const result = await scheduleService.create(scheduleData);
      
      // Assert
      expect(result).toHaveProperty('id');
      expect(result.staffId).toBe(1);
    });
    
    test('should throw error for invalid data', async () => {
      // Arrange
      const invalidData = { staffId: null };
      
      // Act & Assert
      await expect(scheduleService.create(invalidData))
        .rejects.toThrow('Invalid staff ID');
    });
  });
});
```

---

## プルリクエスト

### 📝 PR作成前チェックリスト

- [ ] **機能・修正が完全に動作する**
- [ ] **テストが全て通る**（`npm run test`）
- [ ] **E2Eテストが通る**（`npm run test:e2e`）
- [ ] **リンターエラーがない**（`npm run lint`）
- [ ] **型エラーがない**（`npm run type-check`）
- [ ] **適切なテストを追加している**
- [ ] **ドキュメントを更新している**（必要に応じて）

### 📋 PRテンプレート

```markdown
## 🎯 変更概要
簡潔に変更内容を説明してください。

## 🔧 変更種別
- [ ] 🐛 バグ修正
- [ ] ✨ 新機能
- [ ] 📚 ドキュメント更新
- [ ] 🎨 UI改善
- [ ] ⚡ パフォーマンス改善
- [ ] 🧪 テスト追加

## 📸 スクリーンショット（UI変更の場合）
変更前後の画像を添付してください。

## 🧪 テスト方法
レビュアーが確認すべきテスト手順を記載してください。

## 📋 関連Issue
Closes #123

## 🔍 その他
追加で伝えたいことがあれば記載してください。
```

### 🔄 レビュープロセス

1. **自動チェック**: CI/CDでテスト・リンター実行
2. **コードレビュー**: メンテナーによるレビュー
3. **修正対応**: 必要に応じて修正
4. **承認・マージ**: 問題なければメインブランチにマージ

---

## イシュー報告

### 🐛 バグレポート

```markdown
## 🐛 バグ概要
バグの内容を簡潔に説明してください。

## 🔄 再現手順
1. ...
2. ...
3. ...

## 💭 期待される動作
正常な場合の動作を説明してください。

## 🔍 実際の動作
実際に起こっている動作を説明してください。

## 🖼 スクリーンショット
可能であれば画像を添付してください。

## 🌍 環境情報
- OS: [e.g., Windows 10, macOS 11]
- ブラウザ: [e.g., Chrome 96, Safari 15]
- Node.js: [e.g., 18.15.0]
- Docker: [e.g., 20.10.8]
```

### 💡 機能リクエスト

```markdown
## 💡 機能概要
追加したい機能を簡潔に説明してください。

## 🎯 解決したい問題
この機能によってどのような問題が解決されますか？

## 💭 提案する解決方法
どのような実装を想定していますか？

## 📋 追加コンテキスト
その他、参考になる情報があれば記載してください。
```

---

## 行動規範

### 🤝 基本原則

1. **相互尊重** - 多様性を尊重し、建設的な議論を心がける
2. **協力的姿勢** - チーム全体の成功を目指す
3. **学習意欲** - 継続的な学習・改善を重視
4. **品質重視** - 高品質なコード・ドキュメントを追求

### 📜 詳細ガイドライン

- **包括的なコミュニティ**: 経験レベル、性別、性的指向、国籍、宗教などに関わらず全ての人を歓迎
- **建設的なフィードバック**: 問題を指摘する際は解決策も提案
- **責任ある行動**: 自分の発言・行動に責任を持つ
- **プライバシー尊重**: 個人情報の適切な取り扱い

### 🚫 禁止事項

- ハラスメント・差別的発言
- 攻撃的・侮辱的なコメント
- 個人情報の無断公開
- スパム・宣伝行為

---

## 📞 サポート・質問

### 💬 質問・相談

- **GitHub Discussions**: 一般的な質問・アイデア交換
- **GitHub Issues**: バグ報告・機能リクエスト
- **Discord**: リアルタイム相談（準備中）

### 🏆 貢献者認定

継続的な貢献者には以下の特典があります：

- **Contributor Badge**: GitHub プロフィールでの認定
- **Early Access**: 新機能の先行アクセス
- **Decision Making**: プロジェクト方針への参加権

---

## 🙏 謝辞

CallStatusプロジェクトは多くの貢献者によって支えられています。  
皆様の協力に心から感謝いたします！

### 🌟 主要貢献者

- **[Hiroshi Takahashi](https://github.com/your-username)** - Project Creator & Maintainer

*あなたの名前もここに載るかもしれません！*

---

*💡 **質問があれば遠慮なくお尋ねください。一緒に素晴らしいプロダクトを作りましょう！***