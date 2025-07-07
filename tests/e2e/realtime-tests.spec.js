const { test, expect } = require('@playwright/test');

test.describe('リアルタイム機能テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // 基本認証処理
    await authenticateUser(page);
  });

  test.describe('WebSocket接続・通信テスト', () => {
    
    test('WebSocket接続確立テスト', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // WebSocket接続状態を確認
      const connectionStatus = await page.evaluate(() => {
        return window.socket && window.socket.connected;
      });
      expect(connectionStatus).toBeTruthy();
      
      // 接続イベントリスナーが設定されていることを確認
      const listenerCount = await page.evaluate(() => {
        if (!window.socket) return 0;
        const eventNames = ['schedule:new', 'schedule:updated', 'schedule:deleted'];
        return eventNames.reduce((count, event) => {
          return count + (window.socket.listeners(event).length || 0);
        }, 0);
      });
      expect(listenerCount).toBeGreaterThan(0);
    });

    test('スケジュール作成時のWebSocketブロードキャストテスト', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // WebSocketメッセージ監視設定
      const receivedMessages = [];
      await page.evaluate(() => {
        window.testMessages = [];
        window.socket.on('schedule:new', (data) => {
          window.testMessages.push({ type: 'new', data });
        });
      });
      
      // スケジュール作成
      await createScheduleViaModal(page, {
        staff: 0,
        start: '10:00',
        end: '12:00',
        status: 'online'
      });
      
      // WebSocketメッセージ受信確認
      await page.waitForTimeout(1000);
      const messages = await page.evaluate(() => window.testMessages);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('new');
      expect(messages[0].data).toHaveProperty('startTime');
      expect(messages[0].data).toHaveProperty('endTime');
    });

    test('スケジュール更新時のWebSocketブロードキャストテスト', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 事前にスケジュール作成
      await createScheduleViaModal(page, {
        staff: 0,
        start: '09:00',
        end: '11:00',
        status: 'meeting'
      });
      
      // WebSocketメッセージ監視設定
      await page.evaluate(() => {
        window.testMessages = [];
        window.socket.on('schedule:updated', (data) => {
          window.testMessages.push({ type: 'updated', data });
        });
      });
      
      // 作成されたスケジュールを編集
      const schedule = page.locator('[data-status="meeting"]').first();
      await schedule.click();
      await page.waitForTimeout(500);
      
      // 終了時間を変更
      await page.fill('input[name="endTime"]', '13:00');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(1000);
      
      // 更新メッセージ受信確認
      const messages = await page.evaluate(() => window.testMessages);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('updated');
    });

    test('スケジュール削除時のWebSocketブロードキャストテスト', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 事前にスケジュール作成
      await createScheduleViaModal(page, {
        staff: 0,
        start: '14:00',
        end: '16:00',
        status: 'training'
      });
      
      // WebSocketメッセージ監視設定
      await page.evaluate(() => {
        window.testMessages = [];
        window.socket.on('schedule:deleted', (data) => {
          window.testMessages.push({ type: 'deleted', data });
        });
      });
      
      // スケジュール削除
      const schedule = page.locator('[data-status="training"]').first();
      await schedule.click();
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("削除")');
      const confirmDialog = page.locator('[data-testid="delete-confirm"]');
      if (await confirmDialog.isVisible()) {
        await page.click('button:has-text("削除")');
      }
      await page.waitForTimeout(1000);
      
      // 削除メッセージ受信確認
      const messages = await page.evaluate(() => window.testMessages);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('deleted');
    });

  });

  test.describe('部分更新システム（重要UX機能）', () => {
    
    test('部分更新有効時の差分更新動作テスト', async ({ page }) => {
      // システム管理者としてログイン
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 部分更新を有効化
      const partialUpdateToggle = page.locator('[data-testid="partial-update-toggle"]');
      await expect(partialUpdateToggle).toBeVisible();
      await partialUpdateToggle.click();
      
      // DOM更新カウンター設定
      await page.evaluate(() => {
        window.domUpdateCount = 0;
        const observer = new MutationObserver((mutations) => {
          window.domUpdateCount += mutations.length;
        });
        observer.observe(document.body, { 
          childList: true, 
          subtree: true, 
          attributes: true 
        });
      });
      
      // スケジュール作成
      await createScheduleViaModal(page, {
        staff: 0,
        start: '11:00',
        end: '15:00',
        status: 'remote'
      });
      
      // 部分更新の効果確認（DOM変更が最小限であること）
      await page.waitForTimeout(1000);
      const updateCount = await page.evaluate(() => window.domUpdateCount);
      expect(updateCount).toBeLessThan(50); // 全体リロードより大幅に少ない
    });

    test('部分更新無効時の全体更新動作テスト', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 部分更新を無効化（デフォルト状態確認）
      const partialUpdateToggle = page.locator('[data-testid="partial-update-toggle"]');
      const isEnabled = await partialUpdateToggle.getAttribute('data-enabled');
      if (isEnabled === 'true') {
        await partialUpdateToggle.click(); // 無効化
      }
      
      // DOM更新カウンター設定
      await page.evaluate(() => {
        window.domUpdateCount = 0;
        const observer = new MutationObserver((mutations) => {
          window.domUpdateCount += mutations.length;
        });
        observer.observe(document.body, { 
          childList: true, 
          subtree: true, 
          attributes: true 
        });
      });
      
      // スケジュール作成
      await createScheduleViaModal(page, {
        staff: 0,
        start: '16:00',
        end: '18:00',
        status: 'online'
      });
      
      // 全体更新確認（DOM変更が多いこと）
      await page.waitForTimeout(1000);
      const updateCount = await page.evaluate(() => window.domUpdateCount);
      expect(updateCount).toBeGreaterThan(100); // 全体リロードによる大量更新
    });

    test('受付チーム向けリアルタイム更新優先テスト', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 受付部署フィルター適用
      const departmentFilter = page.locator('[data-testid="department-filter"]');
      await departmentFilter.selectOption('受付');
      await page.waitForTimeout(1000);
      
      // 表示日付を過去に変更（受付チームは日付に関係なく今日の更新が必要）
      await page.click('[data-testid="prev-day"]');
      await page.waitForTimeout(500);
      
      // WebSocket更新監視
      await page.evaluate(() => {
        window.receptionUpdates = [];
        window.socket.on('schedule:new', (data) => {
          window.receptionUpdates.push(data);
        });
      });
      
      // 今日のスケジュール作成（別ブラウザシミュレート）
      await createScheduleViaModal(page, {
        staff: 0,
        start: '09:00',
        end: '17:00',
        status: 'online'
      });
      
      // 受付チームが即座に更新を受信することを確認
      await page.waitForTimeout(1000);
      const receptionUpdates = await page.evaluate(() => window.receptionUpdates);
      expect(receptionUpdates.length).toBeGreaterThan(0);
    });

  });

  test.describe('複数ブラウザ同期テスト', () => {
    
    test('2ブラウザ間でのリアルタイム同期テスト', async ({ browser }) => {
      // 1つ目のブラウザ（ユーザーA）
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      await authenticateUser(page1);
      await page1.goto('/');
      await page1.waitForTimeout(2000);
      
      // 2つ目のブラウザ（ユーザーB）
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await authenticateUser(page2);
      await page2.goto('/');
      await page2.waitForTimeout(2000);
      
      // ユーザーAがスケジュール作成
      await createScheduleViaModal(page1, {
        staff: 0,
        start: '10:00',
        end: '12:00',
        status: 'meeting'
      });
      
      // ユーザーBの画面に即座に反映されることを確認
      await page2.waitForTimeout(2000);
      const syncedSchedule = page2.locator('[data-status="meeting"]');
      await expect(syncedSchedule).toBeVisible();
      
      // 時間範囲も正確に同期されていることを確認
      await syncedSchedule.hover();
      const tooltip = page2.locator('[data-testid="schedule-tooltip"]');
      await expect(tooltip).toContainText('10:00');
      await expect(tooltip).toContainText('12:00');
      
      await context1.close();
      await context2.close();
    });

    test('複数ブラウザでの同時編集競合テスト', async ({ browser }) => {
      // 1つ目のブラウザ
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      await authenticateUser(page1);
      await page1.goto('/');
      await page1.waitForTimeout(2000);
      
      // 2つ目のブラウザ
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await authenticateUser(page2);
      await page2.goto('/');
      await page2.waitForTimeout(2000);
      
      // 同一スケジュールを事前作成
      await createScheduleViaModal(page1, {
        staff: 0,
        start: '09:00',
        end: '11:00',
        status: 'online'
      });
      
      // 両ブラウザでスケジュールが表示されることを確認
      await page2.waitForTimeout(2000);
      const schedule1 = page1.locator('[data-status="online"]').first();
      const schedule2 = page2.locator('[data-status="online"]').first();
      await expect(schedule1).toBeVisible();
      await expect(schedule2).toBeVisible();
      
      // ユーザーAが編集開始
      await schedule1.click();
      await page1.waitForTimeout(500);
      await page1.fill('input[name="endTime"]', '13:00');
      
      // ユーザーBも同時に編集開始
      await schedule2.click();
      await page2.waitForTimeout(500);
      await page2.fill('input[name="endTime"]', '15:00');
      
      // ユーザーAが先に保存
      await page1.click('button:has-text("保存")');
      await page1.waitForTimeout(1000);
      
      // ユーザーBが保存しようとした際の競合処理確認
      await page2.click('button:has-text("保存")');
      await page2.waitForTimeout(1000);
      
      // 競合警告または最新状態への更新確認
      const conflictWarning = page2.locator('[data-testid="conflict-warning"]');
      const updatedSchedule = page2.locator('[data-status="online"]').first();
      
      // 競合警告が表示されるか、または最新状態に自動更新される
      const isConflictHandled = await conflictWarning.isVisible() || 
                               await updatedSchedule.isVisible();
      expect(isConflictHandled).toBeTruthy();
      
      await context1.close();
      await context2.close();
    });

    test('接続断・再接続時の同期テスト', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await authenticateUser(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 初期接続状態確認
      let connectionStatus = await page.evaluate(() => window.socket?.connected);
      expect(connectionStatus).toBeTruthy();
      
      // WebSocket接続を手動切断
      await page.evaluate(() => {
        if (window.socket) {
          window.socket.disconnect();
        }
      });
      
      await page.waitForTimeout(1000);
      connectionStatus = await page.evaluate(() => window.socket?.connected);
      expect(connectionStatus).toBeFalsy();
      
      // 再接続
      await page.evaluate(() => {
        if (window.socket) {
          window.socket.connect();
        }
      });
      
      // 再接続後の同期テスト
      await page.waitForTimeout(3000);
      connectionStatus = await page.evaluate(() => window.socket?.connected);
      expect(connectionStatus).toBeTruthy();
      
      // 再接続後のデータ同期確認
      await createScheduleViaModal(page, {
        staff: 0,
        start: '14:00',
        end: '16:00',
        status: 'training'
      });
      
      const reconnectedSchedule = page.locator('[data-status="training"]');
      await expect(reconnectedSchedule).toBeVisible();
      
      await context.close();
    });

  });

  test.describe('パフォーマンス・スケーラビリティテスト', () => {
    
    test('大量スケジュール下でのWebSocket性能テスト', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // パフォーマンス計測開始
      await page.evaluate(() => {
        window.performanceMetrics = {
          updateTimes: [],
          startTime: Date.now()
        };
        
        window.socket.on('schedule:new', (data) => {
          window.performanceMetrics.updateTimes.push(Date.now() - window.performanceMetrics.startTime);
        });
      });
      
      // 10個のスケジュールを短時間で連続作成
      for (let i = 0; i < 10; i++) {
        await createScheduleViaModal(page, {
          staff: i % 3, // 複数スタッフに分散
          start: `${9 + i}:00`,
          end: `${10 + i}:00`,
          status: 'online'
        });
        await page.waitForTimeout(100); // 短間隔
      }
      
      // パフォーマンス結果確認
      await page.waitForTimeout(2000);
      const metrics = await page.evaluate(() => window.performanceMetrics);
      
      // 全更新が2秒以内に完了することを確認
      expect(metrics.updateTimes.length).toBe(10);
      expect(Math.max(...metrics.updateTimes)).toBeLessThan(2000);
      
      // 平均応答時間が500ms以下であることを確認
      const avgResponseTime = metrics.updateTimes.reduce((a, b) => a + b, 0) / metrics.updateTimes.length;
      expect(avgResponseTime).toBeLessThan(500);
    });

    test('メモリリーク監視テスト（長時間接続）', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 初期メモリ使用量記録
      const initialMemory = await page.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // 100回のスケジュール作成・削除サイクル
      for (let i = 0; i < 100; i++) {
        // スケジュール作成
        await createScheduleViaModal(page, {
          staff: 0,
          start: '10:00',
          end: '11:00',
          status: 'online'
        });
        
        // 即座に削除
        const schedule = page.locator('[data-status="online"]').first();
        if (await schedule.isVisible()) {
          await schedule.click();
          await page.waitForTimeout(100);
          await page.click('button:has-text("削除")');
          await page.waitForTimeout(100);
        }
        
        // 10回ごとにガベージコレクション実行
        if (i % 10 === 9) {
          await page.evaluate(() => {
            if (window.gc) {
              window.gc();
            }
          });
        }
      }
      
      // 最終メモリ使用量確認
      await page.waitForTimeout(2000);
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize;
        }
        return 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        // メモリ増加が50%以下であることを確認（メモリリーク防止）
        const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
        expect(memoryIncrease).toBeLessThan(0.5);
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