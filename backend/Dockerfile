FROM node:18
WORKDIR /app

# システムパッケージ更新とPostgreSQLクライアントインストール（バックアップ機能用）
RUN apt-get update && \
    apt-get install -y postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# 必要なコマンドラインツールをグローバルインストール
RUN npm install -g prisma @nestjs/cli

# package.jsonとpackage-lock.jsonをコピーして依存関係をインストール
COPY package*.json ./
RUN npm ci --only=production=false && npm cache clean --force

# Prismaクライアント用の生成ディレクトリを作成
RUN mkdir -p node_modules/@prisma/client

# 残りのソースコードをコピー
COPY . .

# Prismaクライアントを生成（スキーマファイルがコピーされた後）
RUN npx prisma generate

EXPOSE 3001
CMD ["sleep", "infinity"]