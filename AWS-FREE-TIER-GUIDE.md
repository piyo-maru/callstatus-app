# 💰 AWS無料枠完全活用ガイド

CallStatus App デモサイトを**12ヶ月間完全無料**で運用するための詳細ガイドです。

## 🎯 AWS無料枠の詳細

### EC2無料枠
```
対象: 新規AWSアカウント作成から12ヶ月間
インスタンス: t2.micro
月間時間: 750時間 (24時間×31日 = 744時間)
実質: 1台なら完全無料で24時間稼働可能
リージョン: 全リージョン対象
```

### EBS無料枠
```
ストレージ: 汎用SSD (gp2) 30GB/月
スナップショット: 2GB/月
実質: callstatus-appには十分な容量
```

### データ転送無料枠
```
アウトバウンド: 15GB/月
デモサイト程度: 余裕で収まる
```

## 📊 無料枠使用量監視の設定

### 1. AWS Billing Dashboard設定

#### アクセス方法
```bash
1. AWSコンソール右上のアカウント名をクリック
2. 「請求ダッシュボード」を選択
3. 「無料利用枠」タブをクリック
```

#### 監視項目
```bash
# 重要な監視項目
✅ Amazon EC2 Running Hours: 750時間/月
✅ Amazon EBS General Purpose (gp2): 30GB/月
✅ Data Transfer Out: 15GB/月

# 使用量の確認頻度
推奨: 週1回の定期確認
```

### 2. 課金アラート設定（必須）

#### CloudWatch課金アラーム作成
```bash
1. CloudWatchコンソール → アラーム → 「アラームの作成」
2. メトリクス選択:
   - 名前空間: AWS/Billing
   - メトリクス名: EstimatedCharges
   - Currency: USD
3. 条件設定:
   - しきい値タイプ: 静的
   - より大きい: $1.00 (予防的アラート)
4. アクション設定:
   - 新しいSNSトピック作成
   - トピック名: aws-billing-alert
   - メールアドレス: あなたのメール
5. アラーム名: "AWS-Free-Tier-Alert"
```

#### より詳細なアラート設定
```bash
# 段階的アラート設定
$1.00: 予防的警告
$5.00: 注意レベル
$10.00: 危険レベル

# 個別サービスアラート
EC2: 月700時間使用時
EBS: 月25GB使用時
```

### 3. AWS Cost Explorer設定

#### 日次コスト追跡
```bash
1. Cost Explorer → 「日別のコストとUsage」
2. フィルター: サービス = EC2-Instance, EBS
3. グルーピング: サービス別
4. 期間: 直近30日間
```

## ⚠️ 無料枠超過リスク管理

### 超過しやすいポイント

#### 1. インスタンス稼働時間
```bash
# リスクケース
複数インスタンス起動: 750時間を分割消費
停止し忘れ: 不要なインスタンスの24時間稼働

# 対策
単一インスタンス運用徹底
定期的な稼働状況確認
```

#### 2. データ転送量
```bash
# リスクケース  
大量アクセス: YouTubeなどで公開
ファイルダウンロード: 大容量ファイル配信

# 対策
面接・ポートフォリオ用途に限定
画像・動画の軽量化
```

#### 3. EBSストレージ
```bash
# リスクケース
スナップショット蓄積: 自動バックアップ
ログファイル肥大化: Docker logs蓄積

# 対策
定期的なdocker system prune
スナップショット手動管理
```

### 緊急時対応

#### 想定外課金が発生した場合
```bash
1. 即座にインスタンス停止
   aws ec2 stop-instances --instance-ids i-xxxxx

2. 課金原因の特定
   Cost Explorer → 詳細分析

3. 不要リソース削除
   - 未使用EBSボリューム
   - 古いスナップショット
   - Elastic IP未使用分

4. AWSサポートへ連絡（無料枠誤課金の場合）
   - サポートケース作成
   - 無料枠内使用の証明
```

## 🚀 t2.micro性能最適化技術

### メモリ最適化

#### スワップファイル設定
```bash
# 2GBスワップファイル作成
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# スワップ使用状況確認
free -h
swapon --show
```

#### Node.js メモリ制限
```bash
# 環境変数でメモリ制限
export NODE_OPTIONS="--max-old-space-size=512"

# Docker Compose設定
environment:
  - NODE_OPTIONS=--max-old-space-size=512
```

### CPU最適化

#### バーストクレジット管理
```bash
# CPUクレジット確認
aws ec2 describe-instance-credit-specifications \
  --instance-ids i-xxxxx

# CPUクレジット残高確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUCreditBalance \
  --dimensions Name=InstanceId,Value=i-xxxxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

#### 処理の軽量化
```bash
# Docker最適化
docker system prune -f  # 不要イメージ削除
docker-compose down     # 不要時停止

# プロセス最適化
htop                    # CPU使用率確認
systemctl disable snapd # 不要サービス停止
```

## 📈 パフォーマンス監視

### システムモニタリング

#### 基本監視コマンド
```bash
# メモリ使用量
free -h

# CPU使用率
top -n 1 | head -n 5

# ディスク使用量
df -h

# Docker使用量
docker system df
```

#### 継続監視スクリプト
```bash
#!/bin/bash
# monitoring.sh

echo "=== $(date) ==="
echo "Memory:"
free -m | awk 'NR==2{printf "  Used: %.1f%% (%s/%s MB)\n", $3*100/$2, $3, $2}'

echo "Swap:"
free -m | awk 'NR==3{printf "  Used: %.1f%% (%s/%s MB)\n", $3*100/$2, $3, $2}'

echo "CPU Load:"
cat /proc/loadavg

echo "Disk:"
df -h | grep -E '^/dev/'

echo "Docker:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}"
echo ""
```

## 💡 13ヶ月目以降の戦略

### 無料枠終了後の選択肢

#### 選択肢1: t2.micro継続
```bash
コスト: $8.50/月（インスタンス） + $3/月（EBS） = $11.50/月
メリット: 設定変更不要、継続運用
デメリット: 性能制限継続
```

#### 選択肢2: t3.medium移行
```bash
コスト: $35/月（インスタンス） + $3/月（EBS） = $38/月
メリット: 性能向上、制限解除
デメリット: コスト増加
```

#### 選択肢3: 時間制限運用
```bash
面接時のみ起動:
- t3.medium 80時間/月: $4/月
- t2.micro 継続: $11.50/月
最適解: 面接頻度に応じて選択
```

### 移行計画

#### スムーズな移行手順
```bash
1. データバックアップ
   - EBSスナップショット作成
   - 設定ファイル保存

2. 新インスタンス作成
   - 同じキーペア使用
   - セキュリティグループ複製

3. データ移行
   - git clone で最新コード取得
   - docker-compose で環境再構築

4. DNS切り替え（必要に応じて）
   - Elastic IP移管
   - ドメイン設定更新
```

## 🎯 転職活動での活用法

### 面接でのアピール例

#### コスト最適化への取り組み
```
「個人学習でもコスト意識を持ち、AWS無料枠の制限内で
フルスタックアプリを12ヶ月間運用しました。
t2.microの制約下でメモリ・CPU最適化を実践し、
実際の本番環境での制約対応能力を身につけました。」
```

#### 技術的深掘り
```
「無料枠の監視設定、課金アラート、CloudWatch活用など、
AWSの基本的な運用スキルを実践的に習得しています。
また、リソース制約下でのパフォーマンス最適化により、
効率的なシステム運用への理解を深めました。」
```

### ポートフォリオとしての価値

#### 24時間アクセス可能
- 面接官がいつでも確認可能
- リアルタイム機能の実証
- WebSocket動作確認

#### 継続運用実績
- 12ヶ月間の安定稼働
- 監視・アラート体制
- 予算管理の実践

## 🏆 成功のポイント

### 必須チェック項目
- [ ] 課金アラート設定完了
- [ ] 週次使用量確認の習慣化
- [ ] バックアップ計画策定
- [ ] パフォーマンス監視体制構築
- [ ] 13ヶ月目移行計画準備

### トラブル予防
- 定期的な無料枠使用量確認
- 予防的アラート設定（$1）
- 不要リソースの定期削除
- 緊急停止手順の準備

**AWS無料枠を最大限活用し、転職活動に活かせるクラウド実績を構築しましょう！**