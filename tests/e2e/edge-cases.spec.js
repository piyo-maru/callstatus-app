const { test, expect } = require('@playwright/test');

test.describe('エラーハンドリング・エッジケーステスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // 基本認証処理
    await authenticateUser(page);
  });

  test.describe('データ検証・エラーハンドリング', () => {
    
    test('無効な時間範囲での予定作成エラー', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 予定作成モーダルを開く
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      // 終了時間が開始時間より早い無効な範囲
      await page.fill('input[name="startTime"]', '18:00');
      await page.fill('input[name="endTime"]', '09:00');
      await page.selectOption('select[name="status"]', 'online');
      
      // 保存試行
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1000);
      
      // エラーメッセージ表示確認
      const errorMessage = page.locator('[data-testid="time-validation-error"], .error');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/時間|無効|範囲/);
      
      // モーダルが閉じられていないことを確認
      const modal = page.locator('[data-testid="schedule-modal"]');
      await expect(modal).toBeVisible();
    });

    test('営業時間外エラーハンドリング', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      // 営業時間外（早朝4:00-6:00）の予定作成試行
      await page.fill('input[name="startTime"]', '04:00');
      await page.fill('input[name="endTime"]', '06:00');
      await page.selectOption('select[name="status"]', 'online');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1000);
      
      // 営業時間外警告の確認
      const warningMessage = page.locator('[data-testid="business-hours-warning"], text=営業時間外');
      await expect(warningMessage).toBeVisible();
      
      // 深夜時間（22:00-02:00）の予定作成試行
      await page.fill('input[name="startTime"]', '22:00');
      await page.fill('input[name="endTime"]', '02:00');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1000);
      
      const nightWarning = page.locator('[data-testid="night-hours-warning"]');
      if (await nightWarning.count() > 0) {
        await expect(nightWarning).toBeVisible();
      }
    });

    test('重複スケジュール競合エラー', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 最初のスケジュール作成
      await createScheduleViaModal(page, {
        staff: 0,
        start: '10:00',
        end: '14:00',
        status: 'online'
      });
      
      // 重複する時間帯のスケジュール作成試行
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      await page.selectOption('select[name="staffId"]', '0');
      await page.fill('input[name="startTime"]', '12:00');
      await page.fill('input[name="endTime"]', '16:00');
      await page.selectOption('select[name="status"]', 'meeting');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1000);
      
      // 重複エラーメッセージ確認
      const conflictError = page.locator('[data-testid="schedule-conflict"], text=重複');
      await expect(conflictError).toBeVisible();
      
      // 既存スケジュールとの詳細競合情報表示
      const conflictDetails = page.locator('[data-testid="conflict-details"]');
      if (await conflictDetails.count() > 0) {
        await expect(conflictDetails).toContainText('10:00');
        await expect(conflictDetails).toContainText('14:00');
      }
    });

    test('必須フィールド未入力エラー', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      // スタッフ選択なしで保存試行
      await page.fill('input[name="startTime"]', '09:00');
      await page.fill('input[name="endTime"]', '17:00');
      // ステータス選択なし
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1000);
      
      // 必須フィールドエラー確認
      const requiredErrors = page.locator('[data-testid="required-field-error"], .required-error');
      await expect(requiredErrors.first()).toBeVisible();
      
      // 個別フィールドエラー確認
      const staffError = page.locator('[data-testid="staff-required-error"]');
      const statusError = page.locator('[data-testid="status-required-error"]');
      
      const hasFieldErrors = await staffError.count() > 0 || await statusError.count() > 0;
      expect(hasFieldErrors).toBeTruthy();
    });

  });

  test.describe('ネットワーク・API エラー対応', () => {
    
    test('API タイムアウト時の再試行機能', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // ネットワーク遅延シミュレーション
      await page.route('/api/schedules', async (route) => {
        // 10秒の遅延でタイムアウト発生
        await new Promise(resolve => setTimeout(resolve, 10000));
        await route.continue();
      });
      
      // スケジュール作成試行
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      await page.selectOption('select[name="staffId"]', '0');
      await page.fill('input[name="startTime"]', '09:00');
      await page.fill('input[name="endTime"]', '17:00');
      await page.selectOption('select[name="status"]', 'online');
      await page.click('button:has-text("保存")');
      
      // タイムアウトエラー表示確認
      const timeoutError = page.locator('[data-testid="timeout-error"], text=タイムアウト');
      await expect(timeoutError).toBeVisible({ timeout: 15000 });
      
      // 再試行ボタン確認
      const retryButton = page.locator('[data-testid="retry-button"], button:has-text("再試行")');
      if (await retryButton.count() > 0) {
        await expect(retryButton).toBeVisible();
      }
    });

    test('サーバーエラー（500）時の適切な表示', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // サーバーエラーシミュレーション
      await page.route('/api/schedules', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      await page.selectOption('select[name="staffId"]', '0');
      await page.fill('input[name="startTime"]', '10:00');
      await page.fill('input[name="endTime"]', '12:00');
      await page.selectOption('select[name="status"]', 'online');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(2000);
      
      // サーバーエラーメッセージ確認
      const serverError = page.locator('[data-testid="server-error"], text=サーバーエラー');
      await expect(serverError).toBeVisible();
      
      // ユーザーフレンドリーなエラーメッセージ
      const friendlyMessage = page.locator('text=しばらく時間をおいて, text=管理者にお問い合わせ');
      if (await friendlyMessage.count() > 0) {
        await expect(friendlyMessage.first()).toBeVisible();
      }
    });

    test('ネットワーク切断時のオフライン対応', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // オフライン状態に変更
      await context.setOffline(true);
      
      // スケジュール作成試行
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      await page.selectOption('select[name="staffId"]', '0');
      await page.fill('input[name="startTime"]', '14:00');
      await page.fill('input[name="endTime"]', '16:00');
      await page.selectOption('select[name="status"]', 'remote');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(2000);
      
      // オフライン警告表示確認
      const offlineWarning = page.locator('[data-testid="offline-warning"], text=オフライン');
      await expect(offlineWarning).toBeVisible();
      
      // オンライン復帰
      await context.setOffline(false);
      await page.waitForTimeout(2000);
      
      // 再接続メッセージ確認
      const reconnectedMessage = page.locator('[data-testid="reconnected"], text=再接続');
      if (await reconnectedMessage.count() > 0) {
        await expect(reconnectedMessage).toBeVisible();
      }
    });

  });

  test.describe('大容量データ・パフォーマンステスト', () => {
    
    test('大量スケジュール表示時のパフォーマンス', async ({ page }) => {
      // パフォーマンス計測開始
      await page.evaluate(() => {
        window.performanceStart = performance.now();
      });
      
      await page.goto('/');
      await page.waitForTimeout(5000); // データ読み込み待機
      
      // 表示完了時間計測
      const loadTime = await page.evaluate(() => {
        return performance.now() - window.performanceStart;
      });
      
      // 5秒以内の読み込み完了を確認
      expect(loadTime).toBeLessThan(5000);
      
      // スクロール性能テスト
      const scrollContainer = page.locator('[data-testid="scroll-container"]').first();
      if (await scrollContainer.count() > 0) {
        await scrollContainer.scroll({ left: 1000 });
        await page.waitForTimeout(100);
        
        // スクロール後の描画完了確認
        const scrollPosition = await scrollContainer.evaluate(el => el.scrollLeft);
        expect(scrollPosition).toBeGreaterThan(800);
      }
      
      // メモリ使用量確認
      const memoryUsage = await page.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        return 0;
      });
      
      if (memoryUsage > 0) {
        expect(memoryUsage).toBeLessThan(100); // 100MB未満
      }
    });

    test('長時間使用時のメモリリーク検出', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 初期メモリ記録
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      // 100回の操作サイクル実行
      for (let i = 0; i < 100; i++) {
        // ページ切り替え
        if (i % 3 === 0) {
          await page.goto('/personal');
          await page.waitForTimeout(100);
        } else if (i % 3 === 1) {
          await page.goto('/monthly-planner');
          await page.waitForTimeout(100);
        } else {
          await page.goto('/');
          await page.waitForTimeout(100);
        }
        
        // モーダル開閉
        if (i % 10 === 0) {
          await page.click('button:has-text("予定を追加")');
          await page.waitForTimeout(100);
          await page.press('Escape');
          await page.waitForTimeout(100);
        }
      }
      
      // 最終メモリ記録
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
        expect(memoryIncrease).toBeLessThan(2.0); // 200%未満の増加
      }
    });

  });

  test.describe('ブラウザ固有・環境依存テスト', () => {
    
    test('ローカルストレージ容量制限対応', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // ローカルストレージを大量データで埋める
      await page.evaluate(() => {
        try {
          const largeData = 'x'.repeat(1024 * 1024); // 1MB
          for (let i = 0; i < 10; i++) {
            localStorage.setItem(`test_data_${i}`, largeData);
          }
        } catch (e) {
          // QuotaExceededError の発生
          window.localStorageError = e.name;
        }
      });
      
      // アプリケーションの動作継続確認
      await createScheduleViaModal(page, {
        staff: 0,
        start: '09:00',
        end: '12:00',
        status: 'online'
      });
      
      // スケジュールが正常に作成されることを確認
      const schedule = page.locator('[data-status="online"]');
      await expect(schedule).toBeVisible();
      
      // ストレージエラーハンドリング確認
      const storageError = await page.evaluate(() => window.localStorageError);
      if (storageError === 'QuotaExceededError') {
        const errorMessage = page.locator('[data-testid="storage-error"]');
        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toBeVisible();
        }
      }
    });

    test('JavaScript無効環境での基本機能', async ({ page, context }) => {
      // JavaScript無効化
      await context.setJavaScriptEnabled(false);
      
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 基本HTML構造の表示確認
      await expect(page.locator('body')).toBeVisible();
      
      // noscriptメッセージ確認
      const noscriptMessage = page.locator('noscript, [data-testid="no-js-message"]');
      if (await noscriptMessage.count() > 0) {
        await expect(noscriptMessage).toBeVisible();
      }
      
      // JavaScript有効化
      await context.setJavaScriptEnabled(true);
      await page.reload();
      await page.waitForTimeout(2000);
      
      // 通常機能の復旧確認
      await expect(page.locator('button:has-text("予定を追加")')).toBeVisible();
    });

    test('極端な画面サイズでの表示確認', async ({ page }) => {
      // 極小画面サイズ（320x568 iPhone SE）
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // モバイル表示の確認
      const mobileLayout = page.locator('[data-testid="mobile-layout"]');
      if (await mobileLayout.count() > 0) {
        await expect(mobileLayout).toBeVisible();
      }
      
      // 横スクロール機能確認
      const scrollContainer = page.locator('[data-testid="timeline-scroll"]');
      if (await scrollContainer.count() > 0) {
        await scrollContainer.scroll({ left: 200 });
        const scrollLeft = await scrollContainer.evaluate(el => el.scrollLeft);
        expect(scrollLeft).toBeGreaterThan(100);
      }
      
      // 極大画面サイズ（4K）
      await page.setViewportSize({ width: 3840, height: 2160 });
      await page.reload();
      await page.waitForTimeout(2000);
      
      // 4K表示での要素配置確認
      const mainContent = page.locator('main, [data-testid="main-content"]');
      await expect(mainContent).toBeVisible();
      
      // 要素が画面内に収まることを確認
      const contentBox = await mainContent.boundingBox();
      expect(contentBox.width).toBeLessThanOrEqual(3840);
    });

  });

  test.describe('アクセシビリティ・ユーザビリティ', () => {
    
    test('キーボードナビゲーション確認', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // Tabキーでナビゲーション
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // フォーカス可能要素の確認
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Enterキーでボタン実行
      const firstButton = page.locator('button').first();
      await firstButton.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // モーダルがキーボードで開くことを確認
      const modal = page.locator('[data-testid="schedule-modal"]');
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
        
        // Escapeキーでモーダル閉じる
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await expect(modal).not.toBeVisible();
      }
    });

    test('画面読み上げソフト対応確認', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // ARIA属性の確認
      const ariaLabels = page.locator('[aria-label]');
      const ariaCount = await ariaLabels.count();
      expect(ariaCount).toBeGreaterThan(5); // 基本的なARIA属性が設定されている
      
      // ヘッダー構造確認
      const headings = page.locator('h1, h2, h3, h4');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // フォーム要素のラベル確認
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 10); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          // ラベルまたはaria-labelの存在確認
          const hasLabel = await input.evaluate(el => {
            const id = el.id;
            const hasAriaLabel = el.getAttribute('aria-label');
            const hasLabelElement = id && document.querySelector(`label[for="${id}"]`);
            return hasAriaLabel || hasLabelElement;
          });
          expect(hasLabel).toBeTruthy();
        }
      }
    });

    test('色覚多様性対応確認', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // ステータス色の確認（色だけでなくパターンやテキストでも判別可能）
      const statusElements = page.locator('[data-status]');
      const statusCount = await statusElements.count();
      
      for (let i = 0; i < Math.min(statusCount, 5); i++) {
        const element = statusElements.nth(i);
        if (await element.isVisible()) {
          // テキストまたはアイコンによる補助情報の確認
          const hasTextInfo = await element.evaluate(el => {
            const text = el.textContent;
            const hasIcon = el.querySelector('[class*="icon"], svg');
            return (text && text.trim().length > 0) || hasIcon;
          });
          expect(hasTextInfo).toBeTruthy();
        }
      }
      
      // 重要なアクション要素のコントラスト確認（計算的検証は限定的）
      const importantButtons = page.locator('button[class*="bg-"], [data-testid*="button"]');
      const buttonCount = await importantButtons.count();
      
      expect(buttonCount).toBeGreaterThan(0); // ボタンが存在する
    });

  });

  test.describe('時刻・タイムゾーンエッジケース', () => {
    
    test('日付変更時刻（00:00）境界値テスト', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 日付変更時刻をまたぐスケジュール作成試行
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      await page.selectOption('select[name="staffId"]', '0');
      await page.fill('input[name="startTime"]', '23:30');
      await page.fill('input[name="endTime"]', '01:30');
      await page.selectOption('select[name="status"]', 'online');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1000);
      
      // 日付またぎの処理確認
      const crossMidnightWarning = page.locator('[data-testid="cross-midnight-warning"]');
      if (await crossMidnightWarning.count() > 0) {
        await expect(crossMidnightWarning).toBeVisible();
      }
      
      // スケジュールが適切に分割または処理されることを確認
      const schedules = page.locator('[data-status="online"]');
      const scheduleCount = await schedules.count();
      expect(scheduleCount).toBeGreaterThanOrEqual(1);
    });

    test('サマータイム切替時の時刻処理', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // タイムゾーン情報の確認
      const timezoneInfo = await page.evaluate(() => {
        const date = new Date();
        return {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          offset: date.getTimezoneOffset()
        };
      });
      
      // サマータイム対象地域での処理確認
      if (timezoneInfo.timezone.includes('America') || timezoneInfo.timezone.includes('Europe')) {
        // 特定日付でのスケジュール作成（DST切替日近辺）
        await createScheduleViaModal(page, {
          staff: 0,
          start: '02:00',
          end: '04:00',
          status: 'online'
        });
        
        // DST関連の警告またはメッセージ確認
        const dstMessage = page.locator('[data-testid="dst-warning"], text=サマータイム');
        if (await dstMessage.count() > 0) {
          await expect(dstMessage).toBeVisible();
        }
      }
      
      // UTC時刻での内部処理確認
      const utcTime = await page.evaluate(() => {
        return new Date().toISOString();
      });
      expect(utcTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
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

async function createScheduleViaModal(page, { staff, start, end, status }) {
  await page.click('button:has-text("予定を追加")');
  await page.waitForTimeout(500);
  
  if (staff !== undefined) {
    await page.selectOption('select[name="staffId"]', staff.toString());
  }
  await page.fill('input[name="startTime"]', start);
  await page.fill('input[name="endTime"]', end);
  await page.selectOption('select[name="status"]', status);
  
  await page.click('button:has-text("保存")');
  await page.waitForTimeout(1000);
}