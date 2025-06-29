'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiBaseUrlSync, initializeApiConfig } from '../../lib/api-config';

// 認証状態の型定義（バックエンドのUserTypeと一致させる）
export type UserRole = 'STAFF' | 'ADMIN' | 'READONLY' | 'SYSTEM_ADMIN';

// 管理者権限の種類
export type ManagerPermission = 'READ' | 'WRITE' | 'APPROVE' | 'DELETE';

export type AuthUser = {
  id: string; // バックエンドのCUIDに合わせて文字列に変更
  email: string;
  name: string;
  role: UserRole;
  staffId?: number;
  isActive: boolean;
  
  // 管理者権限関連（既存ユーザーには影響しない）
  isManager?: boolean;
  managerDepartments?: string[];  // 管理対象部署
  managerPermissions?: ManagerPermission[];  // 管理者権限レベル
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (authToken: string, authUser: AuthUser) => void;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setPassword: (email: string, password: string, confirmPassword: string) => Promise<void>;
  changePassword: (email: string, currentPassword: string, newPassword: string) => Promise<void>;
  checkUserExists: (email: string) => Promise<{ exists: boolean; hasPassword: boolean; name?: string }>;
  loading: boolean;
  isAuthenticated: boolean;
  isTransitioning: boolean;
  setTransitioning: (transitioning: boolean) => void;
  
  // 権限チェック関数（既存機能を損なわない）
  canEditSchedule: (targetStaffId?: number) => boolean;
  canManageDepartment: (department: string) => boolean;
  canApproveSchedules: () => boolean;
  isSystemAdmin: () => boolean;
  getAvailableDepartments: () => string[];
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // API URLを動的に取得（統一設定を使用）
  const getApiUrl = () => getApiBaseUrlSync();

  // 初期化時にAPIとローカルストレージを設定
  useEffect(() => {
    const initialize = () => {
      // ローカルストレージから認証情報を復元
      const savedToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');
      
      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);
          console.log('認証情報を復元しました:', parsedUser.email);
        } catch (error) {
          console.error('認証情報の復元に失敗:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
      
      setLoading(false);
    };
    
    initialize();
  }, []);

  // ログイン（メールアドレス・パスワード形式）
  const loginWithCredentials = async (email: string, password: string) => {
    console.log('=== ログイン試行開始 ===', { email, apiUrl: getApiUrl() });
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('ログインレスポンス:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const error = await response.json();
        console.error('ログインエラーレスポンス:', error);
        const errorMessage = error.error || error.message || 'ログインに失敗しました';
        const errorDetails = error.details ? ` (${error.details})` : '';
        throw new Error(errorMessage + errorDetails);
      }

      const data = await response.json();
      console.log('ログイン成功データ:', data);
      
      // バックエンドのuserTypeをフロントエンドのroleに変換
      const mappedUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.staff?.name || data.user.email.split('@')[0] || 'User',
        role: data.user.userType as UserRole, // userType → role
        staffId: data.user.staffId,
        isActive: data.user.isActive
      };
      
      console.log('マッピング後のユーザー情報:', mappedUser);
      
      setToken(data.token);
      setUser(mappedUser);
      
      // ローカルストレージに保存
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(mappedUser));
      
      console.log('=== ログイン完了 ===');
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  };

  // ログイン（トークン・ユーザー情報直接設定）
  const login = (authToken: string, authUser: AuthUser) => {
    setToken(authToken);
    setUser(authUser);
    
    // ローカルストレージに保存
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('auth_user', JSON.stringify(authUser));
  };

  // ログアウト
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  // パスワード設定（初回設定）
  const setPassword = async (email: string, password: string, confirmPassword: string) => {
    console.log('=== パスワード設定試行開始 ===', { email, passwordLength: password.length, confirmPasswordLength: confirmPassword.length });
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'パスワード設定に失敗しました');
      }

      const data = await response.json();
      
      // バックエンドのuserTypeをフロントエンドのroleに変換
      const mappedUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.staff?.name || data.user.email.split('@')[0] || 'User',
        role: data.user.userType as UserRole, // userType → role
        staffId: data.user.staffId,
        isActive: data.user.isActive
      };
      
      setToken(data.token);
      setUser(mappedUser);
      
      // ローカルストレージに保存
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(mappedUser));
      
    } catch (error) {
      console.error('パスワード設定エラー:', error);
      throw error;
    }
  };

  // パスワード変更
  const changePassword = async (email: string, currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email, currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'パスワード変更に失敗しました');
      }

    } catch (error) {
      console.error('パスワード変更エラー:', error);
      throw error;
    }
  };

  // ユーザー存在確認
  const checkUserExists = async (email: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/user?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        return { exists: false, hasPassword: false };
      }

      const data = await response.json();
      return {
        exists: true,
        hasPassword: data.hasPassword,
        name: data.name
      };
    } catch (error) {
      console.error('ユーザー確認エラー:', error);
      return { exists: false, hasPassword: false };
    }
  };

  const isAuthenticated = !!user && !!token;

  const setTransitioning = (transitioning: boolean) => {
    setIsTransitioning(transitioning);
  };

  // 権限チェック関数群（シンプル3層構造）
  const canEditSchedule = (targetStaffId?: number) => {
    if (!user) return false;
    
    // システム管理者は全て編集可能
    if (user.role === 'SYSTEM_ADMIN') return true;
    
    // 管理者は他人の予定も編集可能
    if (user.role === 'ADMIN') return true;
    
    // 本人の予定は常に編集可能
    if (targetStaffId === user.staffId) return true;
    
    return false;
  };

  const canManageDepartment = (department: string) => {
    if (!user) return false;
    
    // システム管理者・管理者は全部署管理可能
    if (user.role === 'SYSTEM_ADMIN' || user.role === 'ADMIN') return true;
    
    return false;
  };

  const canApproveSchedules = () => {
    if (!user) return false;
    
    // システム管理者・管理者は承認可能
    if (user.role === 'SYSTEM_ADMIN' || user.role === 'ADMIN') return true;
    
    return false;
  };

  const isSystemAdmin = () => {
    return user?.role === 'SYSTEM_ADMIN' || user?.email === 'system@example.com';
  };

  const getAvailableDepartments = () => {
    if (!user) return [];
    
    // システム管理者・管理者は全部署
    if (user.role === 'SYSTEM_ADMIN' || user.role === 'ADMIN') {
      return []; // 空配列は「全部署」を意味する
    }
    
    return [];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        loginWithCredentials,
        logout,
        setPassword,
        changePassword,
        checkUserExists,
        loading,
        isAuthenticated,
        isTransitioning,
        setTransitioning,
        // 権限チェック関数
        canEditSchedule,
        canManageDepartment,
        canApproveSchedules,
        isSystemAdmin,
        getAvailableDepartments,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}