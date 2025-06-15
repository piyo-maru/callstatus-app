FROM node:18
WORKDIR /app
# package.jsonだけを先にコピーして、npm installを効率化
COPY package*.json ./
RUN npm install
# 残りのソースコードをコピー
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]