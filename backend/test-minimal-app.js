const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();

// Multer設定（メモリ内でファイルを処理）
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// セキュリティヘッダーの設定
app.use((req, res, next) => {
  // XSS攻撃防止
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HTTPS強制（本番環境用）
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // CSP設定（開発環境は緩く、本番環境では厳しく）
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; " +
      "connect-src 'self'; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "media-src 'self'; " +
      "frame-src 'none';"
    );
  }
  
  // 権限ポリシー
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );
  
  // リファラーポリシー
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// セキュリティ設定
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15分間

// 監査ログヘルパー関数
async function logAuditEvent(userId, action, resource, details = null, ipAddress = null, userAgent = null, success = true, errorMessage = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || 'UNKNOWN',
        action,
        resource,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
        success,
        errorMessage,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('監査ログ記録エラー:', error);
  }
}

// レート制限チェック関数
async function checkLoginRateLimit(email, ipAddress) {
  const user = await prisma.userAuth.findUnique({
    where: { email },
    select: { id: true, loginAttempts: true, lockedAt: true },
  });

  if (!user) {
    return { isBlocked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  // アカウントロック状態チェック
  if (user.lockedAt && new Date() < new Date(user.lockedAt.getTime() + LOCKOUT_DURATION)) {
    const lockoutUntil = new Date(user.lockedAt.getTime() + LOCKOUT_DURATION);
    return {
      isBlocked: true,
      remainingAttempts: 0,
      lockoutUntil,
      nextAttemptAllowed: lockoutUntil,
    };
  }

  // ロックアウト期間が過ぎている場合はリセット
  if (user.lockedAt && new Date() >= new Date(user.lockedAt.getTime() + LOCKOUT_DURATION)) {
    await prisma.userAuth.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedAt: null },
    });
    return { isBlocked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - user.loginAttempts);
  return {
    isBlocked: remainingAttempts === 0,
    remainingAttempts,
  };
}

// ログイン失敗記録関数
async function recordLoginFailure(email, ipAddress) {
  const user = await prisma.userAuth.findUnique({
    where: { email },
    select: { id: true, loginAttempts: true },
  });

  if (user) {
    const newAttempts = user.loginAttempts + 1;
    const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

    await prisma.userAuth.update({
      where: { id: user.id },
      data: {
        loginAttempts: newAttempts,
        lockedAt: shouldLock ? new Date() : undefined,
      },
    });
  }
}

// ログイン成功記録関数
async function recordLoginSuccess(email) {
  const user = await prisma.userAuth.findUnique({
    where: { email },
    select: { id: true },
  });

  if (user) {
    await prisma.userAuth.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedAt: null, lastLoginAt: new Date() },
    });
  }
}

// Simple user lookup endpoint
app.get('/api/auth/user', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'メールアドレスが必要です' });
    }

    console.log('=== Simple Auth: getUserByEmail ===', { email });

    // 1. 既存の UserAuth をチェック
    const existingUserAuth = await prisma.userAuth.findUnique({
      where: { email },
      include: { staff: true }
    });

    if (existingUserAuth && existingUserAuth.isActive && !existingUserAuth.deletedAt) {
      console.log('Found existing UserAuth:', { email, userType: existingUserAuth.userType });
      return res.json({
        exists: true,
        email: existingUserAuth.email,
        name: existingUserAuth.staff?.name || 'Administrator',
        hasPassword: !!existingUserAuth.password,
        userType: existingUserAuth.userType,
        isActive: existingUserAuth.isActive,
        staff: existingUserAuth.staff
      });
    }

    // 2. Contract から新規スタッフをチェック
    const contracts = await prisma.contract.findMany({
      where: { 
        email: email,
        staff: {
          isActive: true
        }
      },
      include: { staff: true },
      orderBy: { updatedAt: 'desc' } // 最新の契約を優先
    });

    const activeContract = contracts.length > 0 ? contracts[0] : null;

    if (activeContract?.staff) {
      console.log('Found active contract for new user:', { email, staffName: activeContract.staff.name });
      
      // 新規スタッフ - UserAuth を自動作成
      const newUserAuth = await prisma.userAuth.create({
        data: {
          email,
          userType: 'STAFF',
          staffId: activeContract.staff.id,
          isActive: true
        },
        include: { staff: true }
      });

      console.log('Created new UserAuth:', { email, id: newUserAuth.id });

      return res.json({
        exists: true,
        email: newUserAuth.email,
        name: newUserAuth.staff.name,
        hasPassword: false,
        userType: 'STAFF',
        isActive: true,
        staff: newUserAuth.staff,
        autoCreated: true
      });
    }

    console.log('No user found for email:', { email });
    return res.status(400).json({ error: 'ユーザーが見つかりません' });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    console.log('=== ログイン試行 ===', { email, ipAddress });

    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードが必要です' });
    }

    // レート制限チェック
    const rateLimitInfo = await checkLoginRateLimit(email, ipAddress);
    if (rateLimitInfo.isBlocked) {
      console.log('レート制限によりブロック:', { email, ipAddress, rateLimitInfo });
      
      // ログイン失敗を監査ログに記録
      await logAuditEvent('UNKNOWN', 'LOGIN_BLOCKED', 'auth', {
        email,
        reason: 'Rate limit exceeded',
        remainingAttempts: rateLimitInfo.remainingAttempts,
        lockoutUntil: rateLimitInfo.lockoutUntil
      }, ipAddress, userAgent, false, 'Rate limit exceeded');

      return res.status(429).json({ 
        error: 'ログイン試行回数が上限に達しました',
        details: `しばらく時間をおいてから再試行してください`,
        nextAttemptAllowed: rateLimitInfo.nextAttemptAllowed,
        remainingAttempts: rateLimitInfo.remainingAttempts
      });
    }

    // UserAuthからユーザーを検索
    const userAuth = await prisma.userAuth.findUnique({
      where: { email },
      include: { staff: true }
    });

    if (!userAuth) {
      console.log('ユーザーが見つからない:', { email });
      await recordLoginFailure(email, ipAddress);
      await logAuditEvent('UNKNOWN', 'LOGIN_FAILED', 'auth', {
        email, reason: 'User not found'
      }, ipAddress, userAgent, false, 'User not found');
      
      return res.status(401).json({ 
        error: 'このメールアドレスは登録されていません',
        details: 'ユーザーが見つかりません'
      });
    }

    if (!userAuth.isActive) {
      console.log('ユーザーが無効:', { email });
      await recordLoginFailure(email, ipAddress);
      await logAuditEvent(userAuth.id, 'LOGIN_FAILED', 'auth', {
        email, reason: 'Account inactive'
      }, ipAddress, userAgent, false, 'Account inactive');
      
      return res.status(401).json({ 
        error: 'このアカウントは無効化されています',
        details: 'アカウントが無効です'
      });
    }

    if (userAuth.deletedAt) {
      console.log('ユーザーが削除済み:', { email });
      await recordLoginFailure(email, ipAddress);
      await logAuditEvent(userAuth.id, 'LOGIN_FAILED', 'auth', {
        email, reason: 'Account deleted'
      }, ipAddress, userAgent, false, 'Account deleted');
      
      return res.status(401).json({ 
        error: 'このアカウントは削除されています',
        details: 'アカウントが削除済みです'
      });
    }

    if (!userAuth.password) {
      console.log('パスワードが設定されていない:', { email });
      return res.status(400).json({ 
        error: 'パスワードが設定されていません',
        requirePasswordSetup: true
      });
    }

    // パスワード検証
    console.log('🔍 パスワード比較中:', { 
      email, 
      providedPassword: password, 
      storedHashStart: userAuth.password?.substring(0, 10) + '...' 
    });
    
    const isPasswordValid = await bcrypt.compare(password, userAuth.password);
    console.log('🔑 パスワード検証結果:', { email, isValid: isPasswordValid });
    
    if (!isPasswordValid) {
      console.log('❌ パスワードが正しくない:', { email });
      await recordLoginFailure(email, ipAddress);
      await logAuditEvent(userAuth.id, 'LOGIN_FAILED', 'auth', {
        email, reason: 'Invalid password'
      }, ipAddress, userAgent, false, 'Invalid password');
      
      return res.status(401).json({ 
        error: 'パスワードが間違っています',
        details: 'パスワードが一致しません'
      });
    }

    // ログイン成功処理
    await recordLoginSuccess(email);
    await logAuditEvent(userAuth.id, 'LOGIN_SUCCESS', 'auth', {
      email, userType: userAuth.userType, staffId: userAuth.staffId
    }, ipAddress, userAgent, true);

    // JWTトークン生成
    const payload = {
      sub: userAuth.id,
      email: userAuth.email,
      userType: userAuth.userType,
      staffId: userAuth.staffId,
      adminRole: userAuth.adminRole
    };
    
    const token = jwt.sign(payload, 'your-super-secret-key-here', { expiresIn: '24h' });

    console.log('✅ ログイン成功:', { email, userType: userAuth.userType });

    const { password: _, ...userWithoutPassword } = userAuth;
    res.json({
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ error: 'ログインに失敗しました' });
  }
});

// Set password endpoint  
app.post('/api/auth/set-password', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    console.log('=== パスワード設定試行 ===', { email });

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ error: '全ての項目を入力してください' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'パスワードと確認パスワードが一致しません' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'パスワードは8文字以上で設定してください' });
    }

    const userAuth = await prisma.userAuth.findUnique({
      where: { email },
      include: { staff: true }
    });

    if (!userAuth) {
      return res.status(400).json({ error: 'ユーザーが見つかりません' });
    }

    if (userAuth.password) {
      return res.status(400).json({ error: 'パスワードは既に設定されています' });
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // パスワード設定
    const updatedUser = await prisma.userAuth.update({
      where: { id: userAuth.id },
      data: {
        password: hashedPassword,
        passwordSetAt: new Date(),
        lastLoginAt: new Date()
      },
      include: { staff: true }
    });

    console.log('パスワード設定成功:', { email });

    // 自動ログイン用のJWT生成
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      userType: updatedUser.userType,
      staffId: updatedUser.staffId,
      adminRole: updatedUser.adminRole
    };
    const token = jwt.sign(payload, 'your-super-secret-key-here', { expiresIn: '24h' });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('パスワード設定エラー:', error);
    res.status(500).json({ error: 'パスワード設定に失敗しました' });
  }
});

// Mock staff import endpoint - フォームデータとJSONデータ両対応
app.post('/api/staff/sync-from-json', upload.single('file'), async (req, res) => {
  try {
    console.log('=== 社員情報インポート（モック）開始 ===');
    console.log('Request Content-Type:', req.headers['content-type']);
    console.log('Request body:', req.body);
    
    // 現在のデータ状況を確認
    const currentStaff = await prisma.staff.count();
    const currentContract = await prisma.contract.count();
    const currentUserAuth = await prisma.userAuth.count();
    
    console.log('インポート前のデータ:', {
      staff: currentStaff,
      contract: currentContract,
      userAuth: currentUserAuth
    });
    
    // フォームデータまたはJSONデータを処理
    let uploadedData = null;
    let uploadType = 'unknown';
    let staffData = [];
    
    if (req.file) {
      // multerで処理されたファイルがある場合
      console.log('ファイルアップロード検出:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
      
      try {
        // ファイルの内容をJSONとして解析
        const fileContent = req.file.buffer.toString('utf8');
        console.log('ファイル内容（最初の500文字）:', fileContent.substring(0, 500));
        
        uploadedData = JSON.parse(fileContent);
        
        // ネストされたデータ構造に対応
        if (Array.isArray(uploadedData)) {
          // 直接配列の場合
          staffData = uploadedData;
        } else if (uploadedData.employeeData && Array.isArray(uploadedData.employeeData)) {
          // {employeeData: [...]} 形式の場合
          staffData = uploadedData.employeeData;
        } else if (uploadedData.staff && Array.isArray(uploadedData.staff)) {
          // {staff: [...]} 形式の場合
          staffData = uploadedData.staff;
        } else {
          // 単一オブジェクトの場合
          staffData = [uploadedData];
        }
        
        uploadType = 'file';
        
        console.log('ファイル内容解析成功:', {
          isArray: Array.isArray(uploadedData),
          recordCount: staffData.length,
          firstRecord: staffData[0],
          secondRecord: staffData[1] || 'なし'
        });
      } catch (parseError) {
        console.error('ファイル解析エラー:', parseError);
        return res.status(400).json({
          success: false,
          error: 'JSONファイルの解析に失敗しました',
          details: parseError.message
        });
      }
    } else if (req.body && Object.keys(req.body).length > 0) {
      // JSONまたはフォームデータの場合
      console.log('リクエストボディ検出:', req.body);
      uploadedData = req.body;
      staffData = Array.isArray(req.body) ? req.body : [req.body];
      uploadType = 'json';
    } else {
      console.log('空のリクエスト - モックデータでテスト実行');
      // モック社員データ（テスト用）
      staffData = [
        {
          empNo: 'EMP001',
          name: '田中太郎',
          dept: '営業部',
          team: '第一営業課',
          email: 'tanaka@example.com'
        },
        {
          empNo: 'EMP002', 
          name: '佐藤花子',
          dept: '開発部',
          team: 'システム開発課',
          email: 'sato@example.com'
        },
        {
          empNo: 'EMP003',
          name: '鈴木一郎',
          dept: '総務部', 
          team: '人事課',
          email: 'suzuki@example.com'
        }
      ];
      uploadedData = 'テストリクエスト';
      uploadType = 'test';
    }
    
    console.log('インポート予定データ:', {
      recordCount: staffData.length,
      uploadType: uploadType,
      sampleRecord: staffData[0]
    });
    
    // 認証への影響分析
    const authImpactAnalysis = {
      currentUserAuth: currentUserAuth,
      currentContracts: currentContract,
      newContracts: staffData.length,
      potentialImpact: {
        existingUsers: [
          {
            email: 'user@example.com',
            status: '削除される可能性',
            reason: '新しい契約データに含まれていない場合'
          }
        ],
        adminUsers: [
          {
            email: 'admin@example.com',
            status: '保護される',
            reason: 'ADMIN権限は独立して管理'
          }
        ]
      }
    };
    
    // 成功レスポンス（アップロードされた実際のデータに基づく）
    res.json({
      success: true,
      message: `【モック実行】社員情報インポートをシミュレートしました（${staffData.length}件）`,
      added: staffData.length,
      updated: 0,
      deleted: 0,
      preview: {
        uploadType: uploadType,
        uploadedData: uploadType === 'file' ? `${staffData.length}件のレコード` : uploadedData,
        newStaffCount: staffData.length,
        currentData: {
          staff: currentStaff,
          contract: currentContract, 
          userAuth: currentUserAuth
        },
        warning: '実際のインポートでは既存のStaff・Contractデータが置換されます',
        authImpact: authImpactAnalysis,
        recommendations: [
          '重要: インポート前にデータベースのバックアップを取得してください',
          '管理者権限ユーザー（ADMIN）は影響を受けません',
          '一般ユーザーの認証情報は7日間の猶予期間があります',
          'テスト環境での動作確認後に本番実行することを推奨します'
        ]
      },
      actualData: staffData
    });
    
  } catch (error) {
    console.error('社員情報インポートエラー:', error);
    res.status(500).json({ 
      success: false,
      error: '社員情報インポートに失敗しました',
      details: error.message 
    });
  }
});

// Mock schedule import endpoint - CSVファイル解析対応
app.post('/api/csv-import/schedules', upload.single('file'), async (req, res) => {
  try {
    console.log('=== スケジュールインポート（モック）開始 ===');
    console.log('Request Content-Type:', req.headers['content-type']);
    
    const currentAdjustments = await prisma.adjustment.count();
    console.log('インポート前の調整データ:', { adjustments: currentAdjustments });
    
    // CSVファイルを処理
    let scheduleData = [];
    let uploadType = 'unknown';
    
    if (req.file) {
      try {
        // CSVファイルの内容を解析
        const fileContent = req.file.buffer.toString('utf8');
        console.log('CSVファイル内容（最初の500文字）:', fileContent.substring(0, 500));
        
        // CSVを行ごとに分割（改行区切り）
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        const header = lines[0]; // ヘッダー行
        const dataRows = lines.slice(1); // データ行
        
        console.log('CSV解析結果:', {
          totalLines: lines.length,
          header: header,
          dataRowCount: dataRows.length
        });
        
        // 簡易CSV解析（カンマ区切り）
        const headerColumns = header.split(',').map(col => col.trim());
        scheduleData = dataRows.map(row => {
          const values = row.split(',').map(val => val.trim());
          const rowData = {};
          headerColumns.forEach((col, index) => {
            rowData[col] = values[index] || '';
          });
          return rowData;
        });
        
        uploadType = 'csv';
        console.log('CSVデータ解析成功:', {
          recordCount: scheduleData.length,
          firstRecord: scheduleData[0],
          columns: headerColumns
        });
        
      } catch (parseError) {
        console.error('CSV解析エラー:', parseError);
        return res.status(400).json({
          success: false,
          error: 'CSVファイルの解析に失敗しました',
          details: parseError.message
        });
      }
    } else {
      // ファイルがない場合はモックデータ
      console.log('ファイルなし - モックデータでテスト実行');
      scheduleData = [
        {
          empNo: 'EMP001',
          date: '2025-06-23',
          status: 'Online',
          startTime: '09:00',
          endTime: '18:00'
        },
        {
          empNo: 'EMP002',
          date: '2025-06-23', 
          status: 'Remote',
          startTime: '10:00',
          endTime: '19:00'
        },
        {
          empNo: 'EMP003',
          date: '2025-06-23',
          status: 'Meeting',
          startTime: '09:30',
          endTime: '17:30'
        }
      ];
      uploadType = 'mock';
    }
    
    console.log('インポート予定スケジュール:', {
      recordCount: scheduleData.length,
      uploadType: uploadType,
      sampleRecord: scheduleData[0]
    });
    
    res.json({
      success: true,
      message: `【モック実行】スケジュールインポートをシミュレートしました（${scheduleData.length}件）`,
      imported: scheduleData.length,
      conflicts: [],
      batchId: `mock_${Date.now()}`,
      currentData: {
        adjustments: currentAdjustments
      },
      warning: '実際のインポートではAdjustmentテーブルにデータが追加されます',
      actualData: scheduleData,
      uploadInfo: {
        type: uploadType,
        recordCount: scheduleData.length
      }
    });
    
  } catch (error) {
    console.error('スケジュールインポートエラー:', error);
    res.status(500).json({ 
      success: false,
      error: 'スケジュールインポートに失敗しました',
      details: error.message 
    });
  }
});

// Mock import history endpoint
app.get('/api/csv-import/history', async (req, res) => {
  try {
    console.log('=== インポート履歴取得（モック） ===');
    
    // モック履歴データ
    const mockHistory = [
      {
        id: 'mock_1750500000000',
        batchId: 'mock_1750500000000',
        fileName: 'test_schedule_20250622.csv',
        importedCount: 45,
        conflictCount: 2,
        status: 'completed',
        createdAt: new Date('2025-06-22T10:00:00Z').toISOString(),
        importType: 'schedule',
        staffList: ['田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '山田健一', '松本真由美'],
        canRollback: true
      },
      {
        id: 'mock_1750450000000',
        batchId: 'mock_1750450000000', 
        fileName: 'staff_data_20250621.json',
        importedCount: 150,
        conflictCount: 0,
        status: 'completed',
        createdAt: new Date('2025-06-21T15:30:00Z').toISOString(),
        importType: 'staff',
        staffList: ['全社員データ'],
        canRollback: false
      }
    ];
    
    res.json(mockHistory);
    
  } catch (error) {
    console.error('インポート履歴取得エラー:', error);
    res.status(500).json({ error: 'インポート履歴の取得に失敗しました' });
  }
});

// Mock staff endpoint
app.get('/api/staff', async (req, res) => {
  try {
    console.log('=== スタッフ一覧取得（モック） ===');
    
    // モックスタッフデータ（実際のデータベースと一致させる）
    const mockStaff = [
      {
        id: 1,
        empNo: 'EMP001',
        name: '田中太郎',
        department: '営業部',
        group: '第一営業課',
        isActive: true
      },
      {
        id: 2,
        empNo: 'EMP002',
        name: '佐藤花子',
        department: '開発部',
        group: 'システム開発課',
        isActive: true
      },
      {
        id: 3,
        empNo: 'EMP003',
        name: '鈴木一郎',
        department: '総務部',
        group: '人事課',
        isActive: true
      }
    ];
    
    res.json(mockStaff);
  } catch (error) {
    console.error('スタッフ一覧取得エラー:', error);
    res.status(500).json({ error: 'スタッフ一覧の取得に失敗しました' });
  }
});

// Mock main data endpoints
app.get('/api/schedules/layered', async (req, res) => {
  try {
    const { date } = req.query;
    console.log('=== スケジュールデータ取得（モック） ===', { date });
    
    // モック2層スケジュールデータ（スタッフデータと一致させる）
    const mockSchedules = [
      {
        id: 1,
        staffId: 1,
        status: 'Online',
        start: `${date}T09:00:00.000Z`,
        end: `${date}T18:00:00.000Z`,
        memo: null,
        layer: 'contract',
        canMove: false,
        staff: { id: 1, name: '田中太郎', department: '営業部', group: '第一営業課' }
      },
      {
        id: 2,
        staffId: 2,
        status: 'Remote',
        start: `${date}T10:00:00.000Z`,
        end: `${date}T19:00:00.000Z`,
        memo: null,
        layer: 'contract',
        canMove: false,
        staff: { id: 2, name: '佐藤花子', department: '開発部', group: 'システム開発課' }
      },
      {
        id: 3,
        staffId: 1,
        status: 'Meeting',
        start: `${date}T14:00:00.000Z`,
        end: `${date}T16:00:00.000Z`,
        memo: 'プロジェクト会議',
        layer: 'adjustment',
        canMove: true,
        staff: { id: 1, name: '田中太郎', department: '営業部', group: '第一営業課' }
      }
    ];
    
    // スタッフリストも追加（フロントエンドが期待する形式）
    const staffList = [
      {
        id: 1,
        empNo: 'EMP001',
        name: '田中太郎',
        department: '営業部',
        group: '第一営業課',
        isActive: true,
        currentStatus: 'Online'
      },
      {
        id: 2,
        empNo: 'EMP002',
        name: '佐藤花子',
        department: '開発部',
        group: 'システム開発課',
        isActive: true,
        currentStatus: 'Remote'
      },
      {
        id: 3,
        empNo: 'EMP003',
        name: '鈴木一郎',
        department: '総務部',
        group: '人事課',
        isActive: true,
        currentStatus: 'Online'
      }
    ];

    res.json({ 
      schedules: mockSchedules,
      staff: staffList
    });
  } catch (error) {
    res.status(500).json({ error: 'スケジュールデータの取得に失敗しました' });
  }
});

app.get('/api/assignments/status', async (req, res) => {
  try {
    console.log('=== 支援状況取得（モック） ===');
    res.json({ assignments: [] });
  } catch (error) {
    res.status(500).json({ error: '支援状況の取得に失敗しました' });
  }
});

app.get('/api/responsibilities/status', async (req, res) => {
  try {
    const { date } = req.query;
    console.log('=== 担当状況取得（モック） ===', { date });
    res.json({ responsibilities: [] });
  } catch (error) {
    res.status(500).json({ error: '担当状況の取得に失敗しました' });
  }
});

// Initial password setup request endpoint
app.post('/api/auth/request-initial-setup', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('=== 初回パスワード設定申請 ===', { email });

    if (!email) {
      return res.status(400).json({ error: 'メールアドレスが必要です' });
    }

    // ユーザーを検索
    const userAuth = await prisma.userAuth.findUnique({
      where: { email },
      include: { staff: true }
    });

    if (!userAuth || !userAuth.isActive || userAuth.deletedAt) {
      // セキュリティ上、存在しないメールアドレスでも成功として返す
      console.log('存在しないメールアドレス:', { email });
      return res.json({
        success: true,
        message: '初回パスワード設定用のメールを送信しました。メールをご確認ください。'
      });
    }

    if (userAuth.password) {
      // 既にパスワードが設定済みの場合
      console.log('パスワード設定済みユーザー:', { email });
      return res.json({
        success: true,
        message: '初回パスワード設定用のメールを送信しました。メールをご確認ください。'
      });
    }

    // 既存の未使用初回設定トークンを無効化
    await prisma.passwordResetToken.updateMany({
      where: {
        userAuthId: userAuth.id,
        tokenType: 'INITIAL_PASSWORD_SETUP',
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      data: { isUsed: true }
    });

    // 新しい初回設定トークンを生成
    const crypto = require('crypto');
    const setupToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    const passwordSetupToken = await prisma.passwordResetToken.create({
      data: {
        userAuthId: userAuth.id,
        token: setupToken,
        tokenType: 'INITIAL_PASSWORD_SETUP',
        expiresAt,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    console.log('初回パスワード設定トークン作成:', {
      tokenId: passwordSetupToken.id,
      email,
      expiresAt
    });

    // 【モック】メール送信シミュレーション
    const setupUrl = `http://localhost:3000/auth/initial-setup?token=${setupToken}`;
    console.log('\n=== 【モック】初回設定メール送信内容 ===');
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: 初回パスワード設定のご案内`);
    console.log(`BODY:`);
    console.log(`${userAuth.staff?.name || 'ユーザー'}様`);
    console.log('');
    console.log('システムへの初回ログイン用パスワード設定のご案内です。');
    console.log('以下のURLをクリックして、パスワードを設定してください。');
    console.log('');
    console.log(`${setupUrl}`);
    console.log('');
    console.log('このURLは24時間後に期限切れとなります。');
    console.log('このメールに心当たりがない場合は、無視してください。');
    console.log('=======================================');

    res.json({
      success: true,
      message: '初回パスワード設定用のメールを送信しました。メールをご確認ください。',
      debug: {
        email,
        setupUrl,
        expiresAt: expiresAt.toISOString(),
        tokenId: passwordSetupToken.id
      }
    });

  } catch (error) {
    console.error('初回パスワード設定申請エラー:', error);
    res.status(500).json({ error: '初回パスワード設定申請に失敗しました' });
  }
});

// Password reset request endpoint
app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('=== パスワードリセット申請 ===', { email });

    if (!email) {
      return res.status(400).json({ error: 'メールアドレスが必要です' });
    }

    // ユーザーを検索
    const userAuth = await prisma.userAuth.findUnique({
      where: { email },
      include: { staff: true }
    });

    if (!userAuth || !userAuth.isActive || userAuth.deletedAt) {
      // セキュリティ上、存在しないメールアドレスでも成功として返す
      console.log('存在しないメールアドレス:', { email });
      return res.json({
        success: true,
        message: 'パスワードリセット用のメールを送信しました。メールをご確認ください。'
      });
    }

    // 既存の未使用トークンを無効化
    await prisma.passwordResetToken.updateMany({
      where: {
        userAuthId: userAuth.id,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      data: { isUsed: true }
    });

    // 新しいリセットトークンを生成
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間後

    const passwordResetToken = await prisma.passwordResetToken.create({
      data: {
        userAuthId: userAuth.id,
        token: resetToken,
        tokenType: 'PASSWORD_RESET',
        expiresAt,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    console.log('パスワードリセットトークン作成:', {
      tokenId: passwordResetToken.id,
      email,
      expiresAt
    });

    // 【モック】メール送信シミュレーション
    const resetUrl = `http://localhost:3000/auth/reset-password?token=${resetToken}`;
    console.log('\n=== 【モック】メール送信内容 ===');
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: パスワードリセットのご案内`);
    console.log(`BODY:`);
    console.log(`${userAuth.staff?.name || 'ユーザー'}様`);
    console.log('');
    console.log('パスワードリセットのご依頼を承りました。');
    console.log('以下のURLをクリックして、新しいパスワードを設定してください。');
    console.log('');
    console.log(`${resetUrl}`);
    console.log('');
    console.log('このURLは1時間後に期限切れとなります。');
    console.log('このメールに心当たりがない場合は、無視してください。');
    console.log('=================================');

    res.json({
      success: true,
      message: 'パスワードリセット用のメールを送信しました。メールをご確認ください。',
      debug: {
        email,
        resetUrl,
        expiresAt: expiresAt.toISOString(),
        tokenId: passwordResetToken.id
      }
    });

  } catch (error) {
    console.error('パスワードリセット申請エラー:', error);
    res.status(500).json({ error: 'パスワードリセット申請に失敗しました' });
  }
});

// Password setup/reset verification endpoint (handles both initial setup and reset)
app.post('/api/auth/setup-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    console.log('=== パスワード設定実行 ===', { token: token?.substring(0, 8) + '...' });

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: '全ての項目を入力してください' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'パスワードと確認パスワードが一致しません' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'パスワードは8文字以上で設定してください' });
    }

    // トークンを検証
    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { userAuth: { include: { staff: true } } }
    });

    if (!resetTokenRecord) {
      return res.status(400).json({ error: '無効なリセットトークンです' });
    }

    if (resetTokenRecord.isUsed) {
      return res.status(400).json({ error: 'このリセットトークンは既に使用済みです' });
    }

    if (resetTokenRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'リセットトークンの有効期限が切れています' });
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // パスワードを更新
    const updatedUser = await prisma.userAuth.update({
      where: { id: resetTokenRecord.userAuthId },
      data: {
        password: hashedPassword,
        passwordSetAt: new Date(),
        lastLoginAt: new Date(),
        loginAttempts: 0, // ログイン試行回数をリセット
        lockedAt: null    // アカウントロックを解除
      },
      include: { staff: true }
    });

    // トークンを使用済みにマーク
    await prisma.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: {
        isUsed: true,
        usedAt: new Date()
      }
    });

    const actionType = resetTokenRecord.tokenType === 'INITIAL_PASSWORD_SETUP' ? '初回設定' : 'リセット';
    console.log(`パスワード${actionType}成功:`, {
      email: updatedUser.email,
      tokenId: resetTokenRecord.id,
      tokenType: resetTokenRecord.tokenType
    });

    // 自動ログイン用のJWT生成
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      userType: updatedUser.userType,
      staffId: updatedUser.staffId,
      adminRole: updatedUser.adminRole
    };
    const jwtToken = jwt.sign(payload, 'your-super-secret-key-here', { expiresIn: '24h' });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({
      success: true,
      message: `パスワード${actionType}が完了しました`,
      token: jwtToken,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('パスワードリセット実行エラー:', error);
    res.status(500).json({ error: 'パスワードリセットに失敗しました' });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});