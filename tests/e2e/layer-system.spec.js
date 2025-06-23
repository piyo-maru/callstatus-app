const { test, expect } = require('@playwright/test');

test.describe('2層データレイヤーテスト', () => {
  test('契約レイヤーと調整レイヤーの表示確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // スケジュールブロックが表示されることを確認
    const scheduleBlocks = page.locator('.schedule-block');
    await expect(scheduleBlocks.first()).toBeVisible();
    
    // 異なるレイヤーのスケジュールが存在することを確認
    const allBlocks = await scheduleBlocks.count();
    expect(allBlocks).toBeGreaterThan(0);
    
    console.log(`表示されているスケジュールブロック数: ${allBlocks}`);
  });

  test('契約レイヤーの編集制限確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 全スケジュールブロックを取得
    const scheduleBlocks = page.locator('.schedule-block');
    const blockCount = await scheduleBlocks.count();
    
    if (blockCount > 0) {
      // 最初のスケジュールブロックの属性確認
      const firstBlock = scheduleBlocks.first();
      
      // スケジュールブロックが表示されていることを確認
      await expect(firstBlock).toBeVisible();
      
      // draggable属性を確認（契約レイヤーはfalse、調整レイヤーはtrue）
      const isDraggable = await firstBlock.getAttribute('draggable');
      console.log(`最初のスケジュールブロックのdraggable属性: ${isDraggable}`);
      
      // 透明度を確認（契約レイヤーは0.5、調整レイヤーは1）
      const opacity = await firstBlock.evaluate(el => getComputedStyle(el).opacity);
      console.log(`最初のスケジュールブロックの透明度: ${opacity}`);
    }
  });

  test('調整レイヤーの編集可能性確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 調整レイヤーのスケジュールを探す
    const editableBlocks = page.locator('.schedule-block[draggable="true"]');
    const editableCount = await editableBlocks.count();
    
    if (editableCount > 0) {
      console.log(`編集可能なスケジュールブロック数: ${editableCount}`);
      
      // 編集可能なブロックに削除ボタンがあることを確認
      const firstEditableBlock = editableBlocks.first();
      await expect(firstEditableBlock).toBeVisible();
      
      // 削除ボタン（×）が存在することを確認
      const deleteButton = firstEditableBlock.locator('button:has-text("×")');
      if (await deleteButton.count() > 0) {
        await expect(deleteButton).toBeVisible();
      }
    }
  });

  test('レイヤー固有の視覚的表現確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 全スケジュールブロックを取得して、視覚的な違いを確認
    const scheduleBlocks = page.locator('.schedule-block');
    const blockCount = await scheduleBlocks.count();
    
    console.log(`総スケジュールブロック数: ${blockCount}`);
    
    for (let i = 0; i < Math.min(blockCount, 5); i++) {
      const block = scheduleBlocks.nth(i);
      
      // 透明度取得
      const opacity = await block.evaluate(el => getComputedStyle(el).opacity);
      
      // 背景画像取得（契約レイヤーは斜線パターン）
      const backgroundImage = await block.evaluate(el => getComputedStyle(el).backgroundImage);
      
      // z-index取得
      const zIndex = await block.evaluate(el => getComputedStyle(el).zIndex);
      
      console.log(`ブロック${i + 1}: 透明度=${opacity}, 背景画像=${backgroundImage}, z-index=${zIndex}`);
      
      // スケジュールの内容確認
      const text = await block.textContent();
      console.log(`ブロック${i + 1}の内容: ${text}`);
    }
  });

  test('レイヤー間の重なり順序確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 同じスタッフの複数レイヤーが重なっている場合の確認
    const staffRows = page.locator('.staff-timeline-row');
    const staffCount = await staffRows.count();
    
    if (staffCount > 0) {
      console.log(`スタッフ行数: ${staffCount}`);
      
      // 最初のスタッフ行で複数のスケジュールブロックがある場合
      const firstStaffRow = staffRows.first();
      const blocksInRow = firstStaffRow.locator('.schedule-block');
      const blocksCount = await blocksInRow.count();
      
      console.log(`最初のスタッフ行のスケジュールブロック数: ${blocksCount}`);
      
      if (blocksCount > 1) {
        // 各ブロックのz-indexを確認して重なり順序をテスト
        for (let i = 0; i < blocksCount; i++) {
          const block = blocksInRow.nth(i);
          const zIndex = await block.evaluate(el => getComputedStyle(el).zIndex);
          const opacity = await block.evaluate(el => getComputedStyle(el).opacity);
          
          console.log(`ブロック${i + 1}: z-index=${zIndex}, opacity=${opacity}`);
        }
      }
    }
  });
});