#!/bin/bash

# バックエンド起動スクリプト
# 既存のプロセスを確実に停止してから起動

echo "既存のNestJSプロセスを停止中..."
pkill -f "nest start" || true
pkill -f "node.*nest" || true
pkill -f "node.*main" || true

# プロセス終了を待機
sleep 3

echo "NestJSアプリケーションを起動中..."
cd /app && npm run start:dev