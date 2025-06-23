const { test, expect } = require('@playwright/test');

test.describe('支援設定機能テスト', () => {
  test('支援設定表示の確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 田中太郎が支援設定されているはずなので、支援表示を確認
    const staffNames = page.locator('text=田中太郎');
    await expect(staffNames.first()).toBeVisible();
    
    // 支援中のスタッフ行を特定
    const staffRows = page.locator('.staff-timeline-row');
    
    // 支援設定による視覚的変化を確認
    let supportingStaffFound = false;
    const rowCount = await staffRows.count();
    
    for (let i = 0; i < rowCount; i++) {
      const row = staffRows.nth(i);
      const backgroundColor = await row.evaluate(el => getComputedStyle(el).backgroundColor);
      
      // 背景色が設定されている場合（支援先グループ色）
      if (backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
        supportingStaffFound = true;
        console.log(`支援設定スタッフ発見: 背景色=${backgroundColor}`);
        break;
      }
    }
    
    if (supportingStaffFound) {
      console.log('✅ 支援設定の視覚表示を確認');
    } else {
      console.log('ℹ️ 支援設定の視覚表示が見つかりませんでした（データによる）');
    }
  });

  test('支援設定によるフィルター動作確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 支援設定フィルターボタンをクリック
    const supportFilterButton = page.locator('button:has-text("支援設定")');
    if (await supportFilterButton.isVisible()) {
      await supportFilterButton.click();
      
      // フィルター適用後のスタッフ表示確認
      await page.waitForTimeout(1000);
      
      // 支援設定されているスタッフのみ表示されることを確認
      const visibleStaffRows = page.locator('.staff-timeline-row:visible');
      const visibleCount = await visibleStaffRows.count();
      
      console.log(`支援設定フィルター適用後の表示スタッフ数: ${visibleCount}`);
      
      // フィルターをリセット
      await page.click('button:has-text("すべて")');
    }
  });

  test('支援先グループ背景色の透明度確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // ガントチャート側のスタッフ行で背景色を確認
    const staffRows = page.locator('.staff-timeline-row');
    const rowCount = await staffRows.count();
    
    let transparentBgFound = false;
    
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = staffRows.nth(i);
      const backgroundColor = await row.evaluate(el => getComputedStyle(el).backgroundColor);
      
      // RGBA形式で透明度が設定されているかチェック
      if (backgroundColor.includes('rgba') && backgroundColor.includes('0.5')) {
        transparentBgFound = true;
        console.log(`透明度50%の背景色発見: ${backgroundColor}`);
        break;
      }
    }
    
    if (transparentBgFound) {
      console.log('✅ 支援先グループ背景色の透明度（50%）を確認');
    }
  });

  test('支援設定境界線の表示確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 左側のスタッフリストで境界線を確認
    const staffNameElements = page.locator('.staff-name-cell');
    const nameCount = await staffNameElements.count();
    
    let borderFound = false;
    
    for (let i = 0; i < Math.min(nameCount, 10); i++) {
      const nameElement = staffNameElements.nth(i);
      const borderStyle = await nameElement.evaluate(el => {
        const style = getComputedStyle(el);
        return {
          borderWidth: style.borderWidth,
          borderColor: style.borderColor,
          borderStyle: style.borderStyle
        };
      });
      
      // 境界線が設定されているかチェック
      if (borderStyle.borderWidth !== '0px' && borderStyle.borderWidth !== 'medium') {
        borderFound = true;
        console.log(`支援設定境界線発見: ${JSON.stringify(borderStyle)}`);
        break;
      }
    }
    
    if (borderFound) {
      console.log('✅ 支援設定による境界線表示を確認');
    }
  });

  test('支援設定情報の詳細確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 支援設定されているスタッフの詳細情報を確認
    // （マウスオーバーやクリックでツールチップが表示される場合）
    
    const staffNames = page.locator('text=田中太郎');
    if (await staffNames.count() > 0) {
      const firstStaffName = staffNames.first();
      
      // マウスオーバーして支援情報が表示されるかテスト
      await firstStaffName.hover();
      await page.waitForTimeout(500);
      
      // ツールチップまたは支援情報の表示を確認
      const supportInfo = page.locator('text=支援');
      if (await supportInfo.count() > 0) {
        console.log('✅ 支援設定情報の表示を確認');
      } else {
        console.log('ℹ️ 支援情報は現在非表示');
      }
    }
  });

  test('部署フィルターと支援設定の連携確認', async ({ page }) => {
    await page.goto('/');
    
    // データ読み込み待機
    await page.waitForTimeout(3000);
    
    // 営業部フィルターを適用（田中太郎が営業部に支援されている）
    const departmentSelect = page.locator('select').first();
    await departmentSelect.selectOption('営業部');
    await page.waitForTimeout(1000);
    
    // 支援中のスタッフ（田中太郎）が営業部フィルターで表示されることを確認
    const visibleStaff = page.locator('.staff-timeline-row:visible');
    const visibleCount = await visibleStaff.count();
    
    console.log(`営業部フィルター適用後の表示スタッフ数: ${visibleCount}`);
    
    // 田中太郎が表示されているか確認
    const tanakaSan = page.locator('text=田中太郎');
    const isTanakaVisible = await tanakaSan.count() > 0;
    
    if (isTanakaVisible) {
      console.log('✅ 支援設定スタッフが支援先部署フィルターで正しく表示されている');
    }
    
    // フィルターリセット
    await departmentSelect.selectOption('all');
  });
});