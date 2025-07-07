const { test, expect } = require('@playwright/test');

// タイムアウト設定を延長
test.setTimeout(60000);

test.describe('UI統一性テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // 基本認証処理
    await authenticateUser(page);
  });

  test.describe('トグルスイッチサイズ統一テスト', () => {
    
    test('出社状況ページ: 全トグルスイッチが32×16pxに統一されている', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 標準コンパクト切替トグル
      const standardCompactToggle = page.locator('[data-testid="standard-compact-toggle"]');
      if (await standardCompactToggle.isVisible()) {
        const toggleBox = await standardCompactToggle.boundingBox();
        expect(toggleBox.width).toBeCloseTo(32, 2);
        expect(toggleBox.height).toBeCloseTo(16, 2);
        
        // CSS クラス確認
        await expect(standardCompactToggle).toHaveClass(/w-8.*h-4/);
      }
      
      // リアルタイム更新トグル
      const realtimeToggle = page.locator('[data-testid="realtime-toggle"]');
      if (await realtimeToggle.isVisible()) {
        const toggleBox = await realtimeToggle.boundingBox();
        expect(toggleBox.width).toBeCloseTo(32, 2);
        expect(toggleBox.height).toBeCloseTo(16, 2);
        await expect(realtimeToggle).toHaveClass(/w-8.*h-4/);
      }
      
      // 部分更新トグル（システム管理者のみ）
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      const partialUpdateToggle = page.locator('[data-testid="partial-update-toggle"]');
      if (await partialUpdateToggle.isVisible()) {
        const toggleBox = await partialUpdateToggle.boundingBox();
        expect(toggleBox.width).toBeCloseTo(32, 2);
        expect(toggleBox.height).toBeCloseTo(16, 2);
        await expect(partialUpdateToggle).toHaveClass(/w-8.*h-4/);
      }
    });

    test('個人ページ: コンパクトモードトグルが32×16px', async ({ page }) => {
      await page.goto('/personal');
      await page.waitForTimeout(2000);
      
      // コンパクトモードトグル
      const compactModeToggle = page.locator('[data-testid="compact-mode-toggle"]');
      await expect(compactModeToggle).toBeVisible();
      
      const toggleBox = await compactModeToggle.boundingBox();
      expect(toggleBox.width).toBeCloseTo(32, 2);
      expect(toggleBox.height).toBeCloseTo(16, 2);
      
      // CSS クラス確認
      await expect(compactModeToggle).toHaveClass(/w-8.*h-4/);
      
      // 内側の円サイズ確認（12×12px）
      const innerCircle = compactModeToggle.locator('div').first();
      await expect(innerCircle).toHaveClass(/w-3.*h-3/);
    });

    test('月次計画ページ: 承認モードトグルが32×16px', async ({ page }) => {
      await page.goto('/monthly-planner');
      await page.waitForTimeout(2000);
      
      // 承認モードトグル
      const approvalModeToggle = page.locator('[data-testid="approval-mode-toggle"]');
      await expect(approvalModeToggle).toBeVisible();
      
      const toggleBox = await approvalModeToggle.boundingBox();
      expect(toggleBox.width).toBeCloseTo(32, 2);
      expect(toggleBox.height).toBeCloseTo(16, 2);
      
      // CSS クラス確認
      await expect(approvalModeToggle).toHaveClass(/w-8.*h-4/);
      
      // 内側の円移動距離確認（translate-x-4 = 16px）
      await approvalModeToggle.click();
      const innerCircle = approvalModeToggle.locator('div').first();
      await expect(innerCircle).toHaveClass(/translate-x-4/);
    });

    test('全ページトグルスイッチ統一性横断チェック', async ({ page }) => {
      const pages = [
        { url: '/', name: '出社状況' },
        { url: '/personal', name: '個人ページ' },
        { url: '/monthly-planner', name: '月次計画' }
      ];
      
      const toggleSizes = [];
      
      for (const pageInfo of pages) {
        await page.goto(pageInfo.url);
        await page.waitForTimeout(2000);
        
        // 各ページのトグルスイッチを収集
        const toggles = page.locator('button').filter({ 
          hasText: /relative.*w-8.*h-4.*rounded-full/ 
        });
        
        const count = await toggles.count();
        for (let i = 0; i < count; i++) {
          const toggle = toggles.nth(i);
          if (await toggle.isVisible()) {
            const box = await toggle.boundingBox();
            toggleSizes.push({
              page: pageInfo.name,
              width: box.width,
              height: box.height
            });
          }
        }
      }
      
      // 全トグルスイッチが同一サイズであることを確認
      if (toggleSizes.length > 1) {
        const firstSize = toggleSizes[0];
        for (const size of toggleSizes) {
          expect(size.width).toBeCloseTo(firstSize.width, 2);
          expect(size.height).toBeCloseTo(firstSize.height, 2);
        }
      }
    });

  });

  test.describe('ボタン配置・スタイル統一テスト', () => {
    
    test('ヘッダーボタン配置統一: 月次計画→管理者設定の順序', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // ヘッダー内のボタン順序確認
      const headerButtons = page.locator('header button, header a');
      const buttonTexts = await headerButtons.allTextContents();
      
      // 月次計画ボタンのインデックス
      const monthlyPlannerIndex = buttonTexts.findIndex(text => 
        text.includes('月次計画') || text.includes('Monthly')
      );
      
      // 管理者設定ボタンのインデックス
      const adminSettingsIndex = buttonTexts.findIndex(text => 
        text.includes('管理者設定') || text.includes('Admin')
      );
      
      if (monthlyPlannerIndex >= 0 && adminSettingsIndex >= 0) {
        // 管理者設定が月次計画の右側（後）にあることを確認
        expect(adminSettingsIndex).toBeGreaterThan(monthlyPlannerIndex);
      }
    });

    test('システム監視ボタンと部分更新トグル配置関係', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // システム監視ボタン
      const monitoringButton = page.locator('[data-testid="system-monitoring"]');
      await expect(monitoringButton).toBeVisible();
      
      // 部分更新トグル
      const partialUpdateToggle = page.locator('[data-testid="partial-update-toggle"]');
      await expect(partialUpdateToggle).toBeVisible();
      
      // 位置関係確認（部分更新がシステム監視の右側）
      const monitoringBox = await monitoringButton.boundingBox();
      const toggleBox = await partialUpdateToggle.boundingBox();
      
      expect(toggleBox.x).toBeGreaterThan(monitoringBox.x + monitoringBox.width);
    });

    test('ボタン高さ統一: 全要素が28px (h-7)に統一', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 主要ボタン要素を取得
      const buttons = page.locator('button:visible, .btn:visible');
      const buttonCount = await buttons.count();
      
      const heights = [];
      for (let i = 0; i < Math.min(buttonCount, 10); i++) { // 最初の10個をサンプル
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box && box.height > 0) {
          heights.push(box.height);
        }
      }
      
      // 多くのボタンが28px (h-7)であることを確認
      const targetHeight = 28;
      const normalizedHeights = heights.filter(h => Math.abs(h - targetHeight) <= 2);
      expect(normalizedHeights.length).toBeGreaterThan(heights.length * 0.7); // 70%以上が統一サイズ
    });

    test('青色背景統一テスト: システム監視・管理者設定ボタン', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // システム監視ボタンの青色確認
      const monitoringButton = page.locator('[data-testid="system-monitoring"]');
      await expect(monitoringButton).toBeVisible();
      await expect(monitoringButton).toHaveClass(/bg-blue-/);
      
      // 管理者設定ボタンの青色確認
      const adminButton = page.locator('button:has-text("管理者設定")');
      if (await adminButton.isVisible()) {
        await expect(adminButton).toHaveClass(/bg-blue-/);
        
        // 同じ青色系統であることを確認
        const monitoringColor = await monitoringButton.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        const adminColor = await adminButton.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        expect(monitoringColor).toBe(adminColor);
      }
    });

  });

  test.describe('カードデザイン統一テスト', () => {
    
    test('統一カードデザイン: rounded-xl + shadow-sm + border', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // カード要素を取得
      const cards = page.locator('[class*="rounded-xl"], [class*="card"]');
      const cardCount = await cards.count();
      
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const card = cards.nth(i);
        if (await card.isVisible()) {
          // rounded-xl クラス確認
          await expect(card).toHaveClass(/rounded-xl/);
          
          // shadow-sm または shadow クラス確認
          const hasShadow = await card.evaluate(el => 
            el.className.includes('shadow')
          );
          expect(hasShadow).toBeTruthy();
          
          // border クラス確認
          const hasBorder = await card.evaluate(el => 
            el.className.includes('border') && !el.className.includes('border-none')
          );
          expect(hasBorder).toBeTruthy();
        }
      }
    });

    test('カード間隔統一: 8px (space-x-2, gap-2)', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 複数カードが並んでいるコンテナを確認
      const cardContainers = page.locator('[class*="space-x-2"], [class*="gap-2"]');
      const containerCount = await cardContainers.count();
      
      expect(containerCount).toBeGreaterThan(0);
      
      // 実際の間隔測定（最初のコンテナ）
      if (containerCount > 0) {
        const container = cardContainers.first();
        const childCards = container.locator('> *');
        const childCount = await childCards.count();
        
        if (childCount >= 2) {
          const firstCard = childCards.nth(0);
          const secondCard = childCards.nth(1);
          
          const firstBox = await firstCard.boundingBox();
          const secondBox = await secondCard.boundingBox();
          
          const gap = secondBox.x - (firstBox.x + firstBox.width);
          expect(gap).toBeCloseTo(8, 4); // 8px ± 4px
        }
      }
    });

    test('レスポンシブ幅制御確認', async ({ page }) => {
      // フルHD解像度設定
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // ガントチャートの最小幅確認 (min-w-[1360px])
      const ganttChart = page.locator('[data-testid="gantt-chart"], [class*="min-w-"]');
      if (await ganttChart.count() > 0) {
        const chartBox = await ganttChart.first().boundingBox();
        expect(chartBox.width).toBeGreaterThanOrEqual(1360);
      }
      
      // カードが画面幅に収まることを確認（最初の3枚）
      const mainCards = page.locator('[data-testid="main-card"]');
      const cardCount = await mainCards.count();
      
      if (cardCount >= 3) {
        const cards = await Promise.all([
          mainCards.nth(0).boundingBox(),
          mainCards.nth(1).boundingBox(),
          mainCards.nth(2).boundingBox()
        ]);
        
        const totalWidth = cards.reduce((sum, box) => sum + box.width, 0);
        expect(totalWidth).toBeLessThan(1920); // フルHD幅内
      }
    });

  });

  test.describe('色統一・視覚的統一性テスト', () => {
    
    test('青色系統統一確認: システム要素の色整合性', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 青色系統の要素を取得
      const blueElements = [
        page.locator('[data-testid="system-monitoring"]'),
        page.locator('button:has-text("管理者設定")'),
        page.locator('[data-testid="partial-update-toggle"]').locator('.bg-blue-50')
      ];
      
      const blueColors = [];
      
      for (const element of blueElements) {
        if (await element.isVisible()) {
          const color = await element.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
          );
          if (color.includes('rgb')) {
            blueColors.push(color);
          }
        }
      }
      
      // 青色系統であることを確認（RGB値で判定）
      for (const color of blueColors) {
        const rgbMatch = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch.map(Number);
          // 青要素が他の色要素より強いことを確認
          expect(b).toBeGreaterThanOrEqual(Math.max(r, g));
        }
      }
    });

    test('ステータス色の統一性確認', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 各ステータスの色統一確認
      const statusColors = {
        online: 'green',
        meeting: 'blue', 
        remote: 'purple',
        training: 'orange',
        off: 'gray'
      };
      
      for (const [status, expectedColor] of Object.entries(statusColors)) {
        const statusElements = page.locator(`[data-status="${status}"]`);
        const count = await statusElements.count();
        
        if (count > 0) {
          // 最初の要素の色確認
          const element = statusElements.first();
          const hasExpectedColor = await element.evaluate((el, color) => {
            const className = el.className;
            return className.includes(`bg-${color}-`) || className.includes(`text-${color}-`);
          }, expectedColor);
          
          expect(hasExpectedColor).toBeTruthy();
        }
      }
    });

    test('ダークモード対応確認（存在する場合）', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // ダークモードトグル存在確認
      const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');
      
      if (await darkModeToggle.isVisible()) {
        // ライトモード初期状態確認
        const initialBodyClass = await page.locator('body').getAttribute('class');
        
        // ダークモード切替
        await darkModeToggle.click();
        await page.waitForTimeout(500);
        
        // ダークモード適用確認
        const darkBodyClass = await page.locator('body').getAttribute('class');
        expect(darkBodyClass).toContain('dark');
        
        // 元に戻す
        await darkModeToggle.click();
        await page.waitForTimeout(500);
        
        const restoredBodyClass = await page.locator('body').getAttribute('class');
        expect(restoredBodyClass).not.toContain('dark');
      }
    });

  });

  test.describe('フォント・テキスト統一性テスト', () => {
    
    test('フォントサイズ統一確認', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 同レベル要素のフォントサイズ統一確認
      const buttonTexts = page.locator('button:visible');
      const buttonCount = await buttonTexts.count();
      
      const fontSizes = [];
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttonTexts.nth(i);
        const fontSize = await button.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        fontSizes.push(parseFloat(fontSize));
      }
      
      // 主要なフォントサイズが統一されていることを確認
      const uniqueSizes = [...new Set(fontSizes)];
      expect(uniqueSizes.length).toBeLessThanOrEqual(3); // 最大3種類までの統一
    });

    test('ラベル・説明文のフォントサイズ統一', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // システム監視ボタンと部分更新トグルのフォントサイズ比較
      const monitoringButton = page.locator('[data-testid="system-monitoring"]');
      const partialUpdateText = page.locator('[data-testid="partial-update-toggle"]').locator('span');
      
      if (await monitoringButton.isVisible() && await partialUpdateText.isVisible()) {
        const monitoringFontSize = await monitoringButton.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        const toggleFontSize = await partialUpdateText.evaluate(el => 
          window.getComputedStyle(el).fontSize
        );
        
        // フォントサイズが同じまたは近似していることを確認
        const sizeDiff = Math.abs(parseFloat(monitoringFontSize) - parseFloat(toggleFontSize));
        expect(sizeDiff).toBeLessThan(2); // 2px未満の差
      }
    });

  });

});

// ヘルパー関数
async function authenticateUser(page) {
  await page.goto('/');
  const loginButton = page.locator('button:has-text("ログイン")');
  if (await loginButton.isVisible()) {
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button:has-text("ログイン")');
    await page.waitForTimeout(2000);
  }
}

async function authenticateAsSystemAdmin(page) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'admin_password');
  await page.click('button:has-text("ログイン")');
  await page.waitForTimeout(2000);
}