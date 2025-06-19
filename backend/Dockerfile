FROM node:18
WORKDIR /app
# 必要なコマンドラインツールをグローバルインストール
RUN npm install -g prisma @nestjs/cli
# package.jsonだけを先にコピーして、npm installを効率化
COPY package*.json ./
RUN npm install
# 残りのソースコードをコピー
COPY . .
EXPOSE 3001
CMD ["sleep", "infinity"]