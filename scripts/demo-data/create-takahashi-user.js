const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createTakahashiUser() {
  try {
    console.log('=== 高橋千尋さん（ID: 228）一般ユーザー認証アカウント作成 ===');
    
    // スタッフ情報確認
    const staff = await prisma.staff.findUnique({
      where: { id: 228 },
      include: { Contract: true, user_auth: true }
    });
    
    if (!staff) {
      console.log('❌ スタッフID 228が見つかりません');
      return;
    }
    
    console.log('✅ スタッフ情報:', {
      id: staff.id,
      empNo: staff.empNo,
      name: staff.name,
      department: staff.department,
      group: staff.group
    });
    
    // Contract確認
    if (!staff.Contract || staff.Contract.length === 0) {
      console.log('❌ Contractが見つかりません');
      return;
    }
    
    const contract = staff.Contract[0];
    console.log('✅ Contract情報:', {
      email: contract.email,
      name: contract.name
    });
    
    // 既存のuser_authをチェック
    const existingAuth = await prisma.user_auth.findUnique({
      where: { email: contract.email }
    });
    
    if (existingAuth) {
      console.log('✅ 認証アカウントは既に存在します:', {
        id: existingAuth.id,
        email: existingAuth.email,
        userType: existingAuth.userType,
        isActive: existingAuth.isActive,
        hasPassword: !!existingAuth.password
      });
      
      if (!existingAuth.password) {
        // パスワード未設定の場合は設定
        const password = 'takahashi123';
        const hashedPassword = await bcrypt.hash(password, 12);
        
        await prisma.user_auth.update({
          where: { id: existingAuth.id },
          data: {
            password: hashedPassword,
            passwordSetAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log('✅ パスワードを設定しました: takahashi123');
      }
      return;
    }
    
    // 新しい一般ユーザー認証アカウントを作成
    const password = 'takahashi123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const userAuth = await prisma.user_auth.create({
      data: {
        id: randomUUID(),
        email: contract.email,
        password: hashedPassword,
        userType: 'STAFF',  // 一般ユーザー
        isActive: true,
        staffId: staff.id,
        passwordSetAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ 一般ユーザー認証アカウントを作成しました:');
    console.log('Email:', userAuth.email);
    console.log('Password:', password);
    console.log('UserType:', userAuth.userType);
    console.log('StaffId:', userAuth.staffId);
    console.log('ID:', userAuth.id);
    
    console.log('\n=== 作成された一般ユーザーアカウント ===');
    console.log('一般ユーザー: takahashi-chihiro@abc.co.jp / takahashi123');
    console.log('スタッフ: 高橋千尋（ID: 228, 社員番号: 8854）');
    console.log('所属: 財務情報第一システムサポート課 / 財務会計グループ');
    console.log('権限: STAFF（一般ユーザー）');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTakahashiUser();