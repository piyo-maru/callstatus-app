const { test, expect } = require('@playwright/test');

test.describe('システム監視・認証権限テスト', () => {

  test.describe('認証システムテスト', () => {
    
    test('ログイン・ログアウト基本フロー', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      // 未ログイン状態でのリダイレクト確認
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/signin') || currentUrl.includes('/login')) {
        // ログインページへのリダイレクト成功
        expect(currentUrl).toMatch(/\/(auth\/signin|login)/);
      }
      
      // ログイン実行
      await page.fill('input[name="email"]', 'user@test.com');
      await page.fill('input[name="password"]', 'password');
      await page.click('button:has-text("ログイン")');
      await page.waitForTimeout(2000);
      
      // ログイン成功後のリダイレクト確認
      await expect(page.url()).not.toMatch(/\/(auth\/signin|login)/);
      
      // ユーザー情報表示確認
      const userInfo = page.locator('[data-testid="user-info"], text=user@test.com');
      if (await userInfo.count() > 0) {
        await expect(userInfo.first()).toBeVisible();
      }
      
      // ログアウト実行
      const logoutButton = page.locator('button:has-text("ログアウト"), [data-testid="logout"]');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
        
        // ログアウト後のリダイレクト確認
        const postLogoutUrl = page.url();
        expect(postLogoutUrl).toMatch(/\/(auth\/signin|login|$)/);
      }
    });

    test('無効な認証情報でのログイン拒否', async ({ page }) => {
      await page.goto('/auth/signin');
      await page.waitForTimeout(1000);
      
      // 無効なメールアドレス
      await page.fill('input[name="email"]', 'invalid@test.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button:has-text("ログイン")');
      await page.waitForTimeout(2000);
      
      // エラーメッセージ表示確認
      const errorMessage = page.locator('[data-testid="login-error"], .error, text=認証に失敗');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }
      
      // ログインページに留まることを確認
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(auth\/signin|login)/);
    });

    test('JWT トークン有効期限テスト', async ({ page }) => {
      // 正常ログイン
      await authenticateUser(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // JWT トークンの確認
      const token = await page.evaluate(() => {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
      });
      
      if (token) {
        // トークンが存在することを確認
        expect(token).toBeTruthy();
        expect(token.split('.').length).toBe(3); // JWT の3部構成確認
        
        // トークンを手動で削除（期限切れシミュレート）
        await page.evaluate(() => {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        });
        
        // API呼び出し時の認証エラー確認
        await page.reload();
        await page.waitForTimeout(2000);
        
        // ログインページへリダイレクトされることを確認
        const redirectedUrl = page.url();
        expect(redirectedUrl).toMatch(/\/(auth\/signin|login)/);
      }
    });

  });

  test.describe('権限管理テスト', () => {
    
    test('一般ユーザー権限制限確認', async ({ page }) => {
      await authenticateAsUser(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // システム管理者専用機能が非表示であることを確認
      const systemAdminFeatures = [
        page.locator('[data-testid="system-monitoring"]'),
        page.locator('[data-testid="partial-update-toggle"]'),
        page.locator('button:has-text("管理者設定")')
      ];
      
      for (const feature of systemAdminFeatures) {
        const isVisible = await feature.isVisible();
        expect(isVisible).toBeFalsy();
      }
      
      // 管理者専用ページへの直接アクセス拒否確認
      await page.goto('/admin/pending-approval');
      await page.waitForTimeout(1000);
      
      // アクセス拒否メッセージまたはリダイレクト確認
      const accessDenied = page.locator('text=アクセス拒否, text=権限がありません, text=403');
      const isRedirected = !page.url().includes('/admin/');
      
      expect(await accessDenied.count() > 0 || isRedirected).toBeTruthy();
    });

    test('管理者権限確認', async ({ page }) => {
      await authenticateAsManager(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 管理者機能へのアクセス確認
      const managerFeatures = [
        page.locator('button:has-text("管理者設定")'),
        page.locator('[data-testid="admin-panel"]')
      ];
      
      for (const feature of managerFeatures) {
        if (await feature.count() > 0) {
          await expect(feature).toBeVisible();
        }
      }
      
      // 承認管理ページへのアクセス確認
      await page.goto('/admin/pending-approval');
      await page.waitForTimeout(2000);
      
      // ページが正常に表示されることを確認
      const pageTitle = page.locator('h1, h2, [data-testid="page-title"]');
      if (await pageTitle.count() > 0) {
        await expect(pageTitle.first()).toBeVisible();
      }
      
      // システム管理者専用機能は非表示
      const systemAdminFeatures = [
        page.locator('[data-testid="system-monitoring"]'),
        page.locator('[data-testid="partial-update-toggle"]')
      ];
      
      for (const feature of systemAdminFeatures) {
        const isVisible = await feature.isVisible();
        expect(isVisible).toBeFalsy();
      }
    });

    test('システム管理者最高権限確認', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // 全機能へのアクセス確認
      const systemAdminFeatures = [
        page.locator('[data-testid="system-monitoring"]'),
        page.locator('[data-testid="partial-update-toggle"]'),
        page.locator('button:has-text("管理者設定")')
      ];
      
      for (const feature of systemAdminFeatures) {
        await expect(feature).toBeVisible();
      }
      
      // システム監視ダッシュボードアクセス確認
      const monitoringButton = page.locator('[data-testid="system-monitoring"]');
      await monitoringButton.click();
      await page.waitForTimeout(1000);
      
      const monitoringModal = page.locator('[data-testid="system-monitoring-modal"]');
      await expect(monitoringModal).toBeVisible();
    });

    test('権限昇格攻撃防止テスト', async ({ page }) => {
      await authenticateAsUser(page);
      
      // 一般ユーザーのトークンを取得
      const userToken = await page.evaluate(() => {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
      });
      
      // 管理者専用APIへの直接アクセス試行
      const response = await page.request.get('/api/system-monitoring/metrics', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      // アクセス拒否（401 or 403）確認
      expect([401, 403]).toContain(response.status());
      
      // システム設定変更APIへのアクセス試行
      const settingsResponse = await page.request.post('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        data: { 
          setting: 'malicious_change' 
        }
      });
      
      expect([401, 403]).toContain(settingsResponse.status());
    });

  });

  test.describe('システム監視ダッシュボードテスト', () => {
    
    test('システム監視モーダル表示・実データ確認', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // システム監視ボタンクリック
      const monitoringButton = page.locator('[data-testid="system-monitoring"]');
      await expect(monitoringButton).toBeVisible();
      await monitoringButton.click();
      await page.waitForTimeout(1000);
      
      // モーダル表示確認
      const modal = page.locator('[data-testid="system-monitoring-modal"]');
      await expect(modal).toBeVisible();
      
      // CPU使用率表示確認（実データのみ）
      const cpuUsage = page.locator('[data-testid="cpu-usage"]');
      await expect(cpuUsage).toBeVisible();
      const cpuText = await cpuUsage.textContent();
      expect(cpuText).toMatch(/^\d+\.\d+%$/); // 数字.数字% 形式
      
      // メモリ使用量表示確認
      const memoryUsage = page.locator('[data-testid="memory-usage"]');
      await expect(memoryUsage).toBeVisible();
      const memoryText = await memoryUsage.textContent();
      expect(memoryText).toMatch(/^\d+\.\d+ MB$/); // 数字.数字 MB 形式
      
      // DB応答時間表示確認
      const dbResponse = page.locator('[data-testid="db-response-time"]');
      await expect(dbResponse).toBeVisible();
      const dbText = await dbResponse.textContent();
      expect(dbText).toMatch(/^\d+ms$/); // 数字ms 形式
      
      // モックデータ警告が表示されないことを確認
      const mockWarning = page.locator('[data-testid="mock-data-warning"]');
      await expect(mockWarning).not.toBeVisible();
    });

    test('システムメトリクス自動更新テスト', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // システム監視モーダルを開く
      await page.click('[data-testid="system-monitoring"]');
      await page.waitForTimeout(1000);
      
      // 初期値記録
      const initialCpu = await page.locator('[data-testid="cpu-usage"]').textContent();
      const initialMemory = await page.locator('[data-testid="memory-usage"]').textContent();
      const initialDb = await page.locator('[data-testid="db-response-time"]').textContent();
      
      // 10秒待機（自動更新確認）
      await page.waitForTimeout(10000);
      
      // 更新後の値確認
      const updatedCpu = await page.locator('[data-testid="cpu-usage"]').textContent();
      const updatedMemory = await page.locator('[data-testid="memory-usage"]').textContent();
      const updatedDb = await page.locator('[data-testid="db-response-time"]').textContent();
      
      // 値が更新されているか、または同じ形式を維持していることを確認
      expect(updatedCpu).toMatch(/^\d+\.\d+%$/);
      expect(updatedMemory).toMatch(/^\d+\.\d+ MB$/);
      expect(updatedDb).toMatch(/^\d+ms$/);
      
      // 少なくとも一つの値が変更されているか確認（リアルタイムデータ）
      const hasUpdated = initialCpu !== updatedCpu || 
                        initialMemory !== updatedMemory || 
                        initialDb !== updatedDb;
      expect(hasUpdated).toBeTruthy();
    });

    test('システム監視APIエンドポイント確認', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      
      // システム管理者のトークン取得
      const adminToken = await page.evaluate(() => {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
      });
      
      // システム監視APIへのアクセス
      const response = await page.request.get('/api/system-monitoring/metrics', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      // 必要なメトリクスが含まれていることを確認
      expect(data).toHaveProperty('cpu');
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('database');
      
      // 数値データ型確認
      expect(typeof data.cpu).toBe('number');
      expect(typeof data.memory).toBe('number');
      expect(typeof data.database).toBe('number');
      
      // 妥当な範囲の値確認
      expect(data.cpu).toBeGreaterThanOrEqual(0);
      expect(data.cpu).toBeLessThanOrEqual(100);
      expect(data.memory).toBeGreaterThan(0);
      expect(data.database).toBeGreaterThan(0);
    });

    test('システム警告・アラート機能テスト', async ({ page }) => {
      await authenticateAsSystemAdmin(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // システム監視モーダルを開く
      await page.click('[data-testid="system-monitoring"]');
      await page.waitForTimeout(1000);
      
      // 高負荷状態のシミュレーション（可能であれば）
      const cpuText = await page.locator('[data-testid="cpu-usage"]').textContent();
      const cpuValue = parseFloat(cpuText.replace('%', ''));
      
      // CPU使用率が高い場合の警告表示確認
      if (cpuValue > 80) {
        const highCpuWarning = page.locator('[data-testid="high-cpu-warning"]');
        if (await highCpuWarning.count() > 0) {
          await expect(highCpuWarning).toBeVisible();
        }
      }
      
      // メモリ使用量の警告確認
      const memoryText = await page.locator('[data-testid="memory-usage"]').textContent();
      const memoryValue = parseFloat(memoryText.replace(' MB', ''));
      
      if (memoryValue > 1000) { // 1GB以上
        const highMemoryWarning = page.locator('[data-testid="high-memory-warning"]');
        if (await highMemoryWarning.count() > 0) {
          await expect(highMemoryWarning).toBeVisible();
        }
      }
      
      // DB応答時間の警告確認
      const dbText = await page.locator('[data-testid="db-response-time"]').textContent();
      const dbValue = parseInt(dbText.replace('ms', ''));
      
      if (dbValue > 1000) { // 1秒以上
        const slowDbWarning = page.locator('[data-testid="slow-db-warning"]');
        if (await slowDbWarning.count() > 0) {
          await expect(slowDbWarning).toBeVisible();
        }
      }
    });

  });

  test.describe('セキュリティテスト', () => {
    
    test('CSRF 保護確認', async ({ page }) => {
      await authenticateAsUser(page);
      
      // CSRFトークンなしでのPOSTリクエスト
      const response = await page.request.post('/api/schedules', {
        data: {
          staffId: 1,
          startTime: '09:00',
          endTime: '17:00',
          status: 'online'
        }
      });
      
      // CSRF保護により拒否されることを確認（403 or 400）
      expect([400, 403, 422]).toContain(response.status());
    });

    test('XSS 防止確認', async ({ page }) => {
      await authenticateAsUser(page);
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      // XSSスクリプト注入試行
      const maliciousScript = '<script>alert("XSS")</script>';
      
      // スケジュール作成でのXSS試行
      await page.click('button:has-text("予定を追加")');
      await page.waitForTimeout(500);
      
      const memoField = page.locator('[data-testid="memo-input"]');
      if (await memoField.isVisible()) {
        await memoField.fill(maliciousScript);
        await page.fill('input[name="startTime"]', '10:00');
        await page.fill('input[name="endTime"]', '12:00');
        await page.selectOption('select[name="status"]', 'online');
        await page.click('button:has-text("保存")');
        await page.waitForTimeout(1000);
        
        // スクリプトが実行されずエスケープされていることを確認
        const displayedMemo = page.locator('[data-testid="schedule-memo"]');
        if (await displayedMemo.count() > 0) {
          const memoText = await displayedMemo.textContent();
          expect(memoText).not.toContain('<script>');
          expect(memoText).toContain('&lt;script&gt;'); // エスケープされたHTML
        }
      }
    });

    test('SQLインジェクション防止確認', async ({ page }) => {
      await authenticateAsUser(page);
      
      // SQLインジェクション試行
      const sqlInjection = "1'; DROP TABLE staff; --";
      
      const response = await page.request.get(`/api/staff/${sqlInjection}`);
      
      // 不正なリクエストとして処理されることを確認
      expect([400, 404, 422]).toContain(response.status());
    });

  });

});

// ヘルパー関数
async function authenticateUser(page) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', 'user@test.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button:has-text("ログイン")');
  await page.waitForTimeout(2000);
}

async function authenticateAsManager(page) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', 'manager@test.com');
  await page.fill('input[name="password"]', 'manager_password');
  await page.click('button:has-text("ログイン")');
  await page.waitForTimeout(2000);
}

async function authenticateAsSystemAdmin(page) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'admin_password');
  await page.click('button:has-text("ログイン")');
  await page.waitForTimeout(2000);
}