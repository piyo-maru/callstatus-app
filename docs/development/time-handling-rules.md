# 時刻処理厳格ルール

## 🕐 基本原則（必須遵守）

コードを生成・変更する際は以下を厳守すること：

1. **内部時刻は完全UTC**：JST は入出力層でのみ使用
2. **文字列はISO-8601 (Z付き)固定**：ミリ秒不要なら丸めてもよい
3. **日時型はTZ情報を持つ型選択**：TIMESTAMP WITH TIME ZONE など
4. **変数・カラム名は *_utc に統一**：*_jst 禁止
5. **UTC→JST→UTC round-tripテストをユニットに追加**

違反があれば生成を中止し、エラーメッセージを返すこと。

## 🗄️ タイムゾーン設定詳細（2025-06-22更新）

### データベース設定
```sql
-- データベースレベルでUTC設定
ALTER DATABASE mydb SET timezone TO 'UTC';

-- セッションレベルでUTC強制
SET timezone TO 'UTC';
```

### PrismaService設定
```typescript
// backend/src/prisma.service.ts
await this.$executeRaw`SET timezone TO 'UTC'`; // 接続時にUTC強制
```

## 🔄 時刻変換フロー

### 標準変換パターン
1. **入力（フロントエンド）**: JST小数点時刻（例: 9.5 = 9:30 JST）
2. **変換（バックエンド）**: `jstToUtc()` で JST → UTC変換
3. **保存（データベース）**: UTC時刻として保存（例: 2025-06-22 00:30:00）
4. **取得（バックエンド）**: `utcToJstDecimal()` で UTC → JST変換
5. **出力（フロントエンド）**: JST小数点時刻（例: 9.5 = 9:30 JST）

### 変換メソッド例
```typescript
// JST 9.5 (9:30) + "2025-06-22" → UTC "2025-06-22T00:30:00Z"
private jstToUtc(decimalHour: number, baseDateString: string): Date {
  const jstIsoString = `${baseDateString}T${hours}:${minutes}:00+09:00`;
  return new Date(jstIsoString); // 内部的にUTCで保存
}

// UTC "2025-06-22T00:30:00Z" → JST 9.5 (9:30)
private utcToJstDecimal(utcDate: Date): number {
  const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  return jstDate.getHours() + jstDate.getMinutes() / 60;
}
```

## ⚠️ よくある問題と解決法

### トラブルシューティング
- **症状**: 予定が9時間ずれて表示される
- **原因**: データベースタイムゾーンがAsia/Tokyo設定
- **解決**: 上記設定でUTCに統一

### フロントエンド時刻処理の注意点
```typescript
// ❌ 間違い - UTC時刻にZ suffix
const convertTimeToDate = (time: number, baseDate: string): Date => {
  const jstIsoString = `${baseDate}T${hours}:${minutes}:00.000Z`;
  return new Date(jstIsoString); // これはUTCとして解釈される
}

// ✅ 正しい - JST時刻に+09:00 timezone
const convertTimeToDate = (time: number, baseDate: string): Date => {
  const jstIsoString = `${baseDate}T${hours}:${minutes}:00+09:00`;
  return new Date(jstIsoString); // 自動的にUTCに変換される
}
```

## 🔧 時刻処理パターン

### バックエンドサービス内の特別ヘルパー
```typescript
// 小数点時間→Dateオブジェクト変換を処理
private toDate(decimalHour: number): Date {
  // 小数点時間をDate形式に変換
  // 例: 9.5 → 9:30
}
```

### リアルタイム更新
- すべてのCRUD操作をWebSocket経由で配信
- フロントエンドはWebSocketイベント受信時にUIを自動更新
- Socket.IOルームは使用せず、全クライアントが全更新を受信

### 日本語ローカライゼーション
- すべてのUIテキストが日本語
- 日本語ロケールを使用した日付フォーマット（年月日）
- React DatePickerを日本語ロケールで設定

## 📊 タイムゾーン統一仕様

### システム全体での統一
- **PostgreSQL**: UTC タイムゾーン
- **バックエンド**: UTC基準での時刻処理、JST変換は入出力のみ
- **フロントエンド**: JST基準での表示、UTC変換は通信時のみ
- **全システム**: 内部処理はUTC、ユーザー表示はJST

### データベース時刻カラム仕様
```sql
-- 推奨: タイムゾーン付きタイムスタンプ
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

-- 日付のみの場合
event_date DATE

-- 時刻のみの場合（タイムゾーン情報なし、JST前提）
start_time TIME
```

## 🧪 テスト要件

### 必須テストケース
1. **UTC→JST→UTC ラウンドトリップテスト**
2. **境界値テスト**（23:59、00:00等）
3. **夏時間なし確認**（日本は夏時間なし）
4. **データベース保存・取得の一貫性**

### テスト例
```typescript
describe('Time Conversion', () => {
  it('should maintain consistency in UTC→JST→UTC conversion', () => {
    const originalUtc = new Date('2025-06-22T00:30:00Z');
    const jstDecimal = utcToJstDecimal(originalUtc); // 9.5
    const backToUtc = jstToUtc(jstDecimal, '2025-06-22');
    expect(backToUtc.getTime()).toBe(originalUtc.getTime());
  });
});
```

---

**関連ドキュメント**: [CLAUDE.md](../../CLAUDE.md)  
**作成日**: 2025-06-26  
**ステータス**: 運用中（厳格遵守）