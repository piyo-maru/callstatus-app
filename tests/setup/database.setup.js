const { test } = require('@playwright/test');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

test('データベースセットアップ', async () => {
  console.log('🔄 テストデータベース準備中...');
  
  try {
    // 1. Prismaクライアント生成
    console.log('Prismaクライアント生成中...');
    await execAsync('npx prisma generate', { cwd: './backend' });
    
    // 2. マイグレーション実行
    console.log('マイグレーション実行中...');
    await execAsync('npx prisma migrate deploy', { cwd: './backend' });
    
    // 3. シードデータ投入
    console.log('シードデータ投入中...');
    await execAsync('npm run db:seed', { cwd: './backend' });
    
    console.log('✅ データベースセットアップ完了');
  } catch (error) {
    console.error('❌ データベースセットアップエラー:', error);
    throw error;
  }
});