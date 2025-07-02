# 🔒 Security Policy

## 🛡 セキュリティ方針

CallStatusは**エンタープライズ級のセキュリティ**を重視し、ユーザーのデータ保護と安全な運用を最優先に開発されています。

---

## 📋 サポート対象バージョン

セキュリティアップデートは以下のバージョンで提供されます：

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ 完全サポート      |
| 0.9.x   | ✅ 重要な修正のみ    |
| < 0.9   | ❌ サポート終了      |

---

## 🚨 脆弱性報告

### 📧 報告方法

セキュリティの脆弱性を発見した場合は、**公開のIssueではなく**以下の方法で報告してください：

#### **優先連絡先**
- **Email**: security@your-email.com
- **件名**: `[SECURITY] CallStatus Vulnerability Report`

#### **報告内容**
以下の情報を含めてください：

1. **脆弱性の概要** - 簡潔な説明
2. **影響範囲** - 影響を受けるコンポーネント・バージョン
3. **再現手順** - 詳細なステップ
4. **概念実証** - 可能であればPoC コード
5. **推奨対策** - 修正案があれば
6. **発見者情報** - クレジット希望の場合

### ⏱ 対応タイムライン

| 段階 | 期間 | 内容 |
|------|------|------|
| 受領確認 | 24時間以内 | 報告受領の自動返信 |
| 初期評価 | 72時間以内 | 脆弱性の重要度評価 |
| 詳細調査 | 1-2週間 | 影響範囲・修正方法の検討 |
| 修正・リリース | 2-4週間 | パッチ開発・テスト・リリース |
| 公開 | 修正後30日 | 脆弱性詳細の公開（必要に応じて） |

---

## 🔐 実装済みセキュリティ対策

### 🛡 認証・認可

#### **JWT実装**
```typescript
// 安全なトークン生成
const token = jwt.sign(
  { userId, email, role },
  process.env.JWT_SECRET,
  { 
    expiresIn: '24h',
    issuer: 'callstatus-app',
    audience: 'callstatus-users'
  }
);
```

#### **権限チェック**
- Role-based Access Control (RBAC)
- API エンドポイント毎の権限検証
- フロントエンド・バックエンド双方での検証

### 🔒 データ保護

#### **暗号化**
- **保存時**: データベース暗号化（PostgreSQL TDE）
- **通信時**: HTTPS/TLS 1.3強制
- **パスワード**: bcrypt ハッシュ化（ソルト付き）

#### **入力検証**
```typescript
// バリデーション例
@IsEmail()
@IsNotEmpty()
email: string;

@IsStrongPassword({
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1
})
password: string;
```

### 🛡 攻撃対策

#### **SQLインジェクション**
- Prisma ORM による自動エスケープ
- パラメータ化クエリの徹底

#### **XSS対策**
```typescript
// サニタイゼーション
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(userInput);
```

#### **CSRF対策**
```typescript
// SameSite Cookie設定
app.use(session({
  cookie: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));
```

#### **CORS設定**
```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
```

---

## 📊 セキュリティチェックリスト

### ✅ 開発時チェック

- [ ] **入力検証**: 全ての外部入力を検証
- [ ] **出力エスケープ**: XSS対策の実装
- [ ] **権限チェック**: APIアクセス権限の確認
- [ ] **エラーハンドリング**: 機密情報の漏洩防止
- [ ] **ログ記録**: セキュリティイベントの記録

### ✅ 運用時チェック

- [ ] **HTTPS化**: SSL/TLS証明書の設定
- [ ] **ファイアウォール**: 不要ポートの閉鎖
- [ ] **定期更新**: 依存関係の脆弱性チェック
- [ ] **バックアップ**: データベースの暗号化バックアップ
- [ ] **監視**: 異常アクセスの検知

---

## 🔍 セキュリティスキャン

### 🤖 自動スキャン

#### **依存関係チェック**
```bash
# npm audit
npm audit

# Snyk スキャン
npx snyk test

# OWASP Dependency Check
dependency-check --project callstatus --scan .
```

#### **静的解析**
```bash
# ESLint セキュリティルール
npm run lint:security

# SonarQube
sonar-scanner -Dsonar.projectKey=callstatus
```

### 🔎 手動検査

定期的に以下の検査を実施：

1. **ペネトレーションテスト** - 外部専門機関による検査
2. **コードレビュー** - セキュリティ専門家による監査  
3. **脆弱性評価** - OWASP Top 10 対策状況確認

---

## 📋 セキュリティベストプラクティス

### 👩‍💻 開発者向け

#### **コード作成時**
```typescript
// ❌ 悪い例
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ 良い例
const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

#### **環境変数管理**
```bash
# ❌ 悪い例 - ハードコード
const secret = 'my-secret-key';

# ✅ 良い例 - 環境変数
const secret = process.env.JWT_SECRET;
```

### 🏢 運用者向け

#### **環境設定**
```bash
# セキュアヘッダー設定
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

#### **定期メンテナンス**
- 依存関係の月次更新
- ログの定期的な監査
- アクセス権限の四半期レビュー

---

## 🏆 セキュリティ認定・準拠

### 📜 準拠基準

- **OWASP Top 10** - Webアプリケーション脆弱性対策
- **NIST Cybersecurity Framework** - セキュリティ管理基準
- **ISO 27001** - 情報セキュリティマネジメント（準拠予定）

### 🔍 第三者検証

- **定期的なペネトレーションテスト**
- **コードセキュリティ監査**
- **インフラセキュリティ検査**

---

## 📞 緊急連絡先

### 🚨 インシデント報告

重大なセキュリティインシデントの場合：

- **緊急連絡**: security-emergency@your-email.com
- **電話**: +81-XX-XXXX-XXXX（24時間対応）
- **PGP Key**: [0xABCDEF12](link-to-pgp-key)

### 💬 一般的な質問

- **GitHub Issues**: セキュリティに関わらない質問
- **Email**: security-questions@your-email.com
- **Discord**: セキュリティチャンネル（準備中）

---

## 🙏 謝辞

### 🔍 責任ある開示

脆弱性を責任を持って報告してくださった方々に感謝いたします：

- **Hall of Fame** - [セキュリティ貢献者一覧](SECURITY_CONTRIBUTORS.md)

### 🎁 報奨制度

重要な脆弱性を発見・報告いただいた方には：

- **公式感謝状**
- **GitHub Profile での言及**
- **Amazon ギフト券**（重要度に応じて）

---

## 📝 更新履歴

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-01 | 1.0.0 | 初版作成 |
| 2025-01-15 | 1.1.0 | JWT実装詳細追加 |

---

*🔒 **Security is everyone's responsibility** - セキュリティは全員の責任です*