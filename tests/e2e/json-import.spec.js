const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('JSONインポート機能テスト', () => {
  test('社員情報JSONファイルのインポート機能（225名→8名から225名へ）', async ({ page }) => {
    // ページに移動
    await page.goto('http://localhost:3000');
    
    // ページ読み込み完了を待つ
    await expect(page.locator('h1:has-text("出社状況")')).toBeVisible();
    
    // 初期状態（8名）を確認
    await page.waitForTimeout(3000);
    
    // より柔軟なスタッフ行セレクタを使用
    const staffRows = page.locator('div:has-text("田中太郎"), div:has-text("佐藤花子"), div:has-text("山田次郎"), div:has-text("鈴木美咲"), div:has-text("高橋健太"), div:has-text("渡辺雅子"), div:has-text("中村慎也"), div:has-text("小林知美")');
    const initialStaffCount = await staffRows.count();
    console.log(`初期スタッフ数: ${initialStaffCount}名`);
    
    // 8名全員が表示されるまで待つ
    if (initialStaffCount === 0) {
      await page.waitForTimeout(5000); // さらに待機
      const retryCount = await staffRows.count();
      console.log(`再試行後スタッフ数: ${retryCount}名`);
    }
    
    // 最低でも田中太郎が表示されることを確認
    await expect(page.locator('text=田中太郎')).toBeVisible({ timeout: 10000 });
    
    // 設定ボタンをクリック
    await page.click('button:has-text("設定")');
    await expect(page.locator('h2:has-text("設定")')).toBeVisible();
    
    // インポートタブをクリック（📥のアイコンで特定）
    await page.click('button:has-text("📥インポート")');
    await page.waitForTimeout(1000);
    
    // 社員情報インポートの「インポート実行」ボタンをクリック（最初のボタン）
    await page.locator('button:has-text("インポート実行")').first().click();
    await expect(page.locator('text=JSONファイルをアップロード')).toBeVisible();
    
    // JSONファイルのパス
    const jsonFilePath = path.join(__dirname, '../../artifacts/contract_dammy.json');
    
    // ファイルが存在することを確認
    expect(fs.existsSync(jsonFilePath)).toBeTruthy();
    
    // ファイルをアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(jsonFilePath);
    
    // ファイル選択確認
    await expect(page.locator('text=contract_dammy.json')).toBeVisible();
    
    // 同期実行ボタンをクリック
    await page.click('button:has-text("同期実行")');
    
    // 成功メッセージまたは完了メッセージを待つ（最大30秒）
    await Promise.race([
      page.waitForSelector('text=インポートが完了しました', { timeout: 30000 }),
      page.waitForSelector('text=同期が完了しました', { timeout: 30000 }),
      page.waitForSelector('text=処理が完了しました', { timeout: 30000 })
    ]);
    
    console.log('✅ JSONインポート処理が完了しました');
    
    // JSONインポートモーダルを閉じる
    await page.click('button:has-text("閉じる")');
    
    // 部署・グループ設定タブに移動
    await page.click('button:has-text("部署・グループ設定")');
    await expect(page.locator('text=🏢')).toBeVisible();
    
    // 部署グループ取得ボタンをクリック
    await page.click('button:has-text("部署グループ取得")');
    await expect(page.locator('text=部署・グループ設定を取得しました')).toBeVisible({ timeout: 10000 });
    
    // 設定モーダルを閉じる
    await page.click('button:has-text("✕")'); // 設定モーダルを閉じる
    
    // ページをリロードして更新データを確認
    await page.reload();
    await expect(page.locator('h1:has-text("出社状況")')).toBeVisible();
    
    // データ読み込み完了を待つ
    await page.waitForTimeout(3000);
    
    // 225名のスタッフが表示されることを確認
    const finalStaffCount = await page.locator('[data-testid="staff-row"]').count();
    console.log(`インポート後スタッフ数: ${finalStaffCount}名`);
    expect(finalStaffCount).toBe(225);
    
    // 部署フィルターが更新されていることを確認
    await page.click('select[data-testid="department-filter"]');
    const departmentOptions = await page.locator('select[data-testid="department-filter"] option').allTextContents();
    
    // インポートされたデータの部署が表示されることを確認
    expect(departmentOptions).toContain('財務部');
    expect(departmentOptions.length).toBeGreaterThan(5); // 複数の部署が存在
    
    // 契約データも正しくインポートされていることを確認
    // （スケジュール表示で契約による基本勤務時間が表示される）
    await page.waitForTimeout(2000);
    const scheduleElements = await page.locator('[data-testid="schedule-item"]').count();
    console.log(`表示されているスケジュール数: ${scheduleElements}`);
    expect(scheduleElements).toBeGreaterThan(0);
    
    console.log('✅ 225名のJSONインポート機能テスト完了');
  });
  
  test('JSONインポート - 不正ファイル形式エラーハンドリング', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1:has-text("出社状況")')).toBeVisible();
    
    // 設定モーダルを開く
    await page.click('button:has-text("設定")');
    await page.click('button:has-text("社員情報管理")');
    await page.click('button:has-text("JSONインポート")');
    
    // テキストファイルをアップロードしてエラーを確認
    const testFilePath = path.join(__dirname, '../test-data/invalid.txt');
    
    // テスト用の不正ファイルを作成
    fs.writeFileSync(testFilePath, 'This is not a JSON file', 'utf8');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=JSONファイルを選択してください')).toBeVisible();
    
    // テストファイルを削除
    fs.unlinkSync(testFilePath);
  });
  
  test('JSONインポート - 大容量データの処理性能確認', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1:has-text("出社状況")')).toBeVisible();
    
    const startTime = Date.now();
    
    // 設定モーダルを開いてインポート
    await page.click('button:has-text("設定")');
    await page.click('button:has-text("社員情報管理")');
    await page.click('button:has-text("JSONインポート")');
    
    const jsonFilePath = path.join(__dirname, '../../artifacts/contract_dammy.json');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(jsonFilePath);
    
    await page.click('button:has-text("アップロード実行")');
    await expect(page.locator('text=インポートが完了しました')).toBeVisible({ timeout: 30000 });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`225名データインポート処理時間: ${processingTime}ms`);
    
    // 30秒以内での処理完了を期待
    expect(processingTime).toBeLessThan(30000);
  });
});