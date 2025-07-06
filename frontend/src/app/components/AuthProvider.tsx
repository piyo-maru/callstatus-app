'use client';

import { createContext, useContext, ReactNode } from 'react';

// ポートフォリオ版: 認証機能を削除し、常にログイン状態とする
export type UserRole = 'STAFF' | 'ADMIN' | 'READONLY' | 'SYSTEM_ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  staffId?: number;
  isActive: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  
  // 簡略化された権限チェック関数
  canEditSchedule: (targetStaffId?: number) => boolean;
  canManageDepartment: (department: string) => boolean;
  canApproveSchedules: () => boolean;
  isSystemAdmin: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // ポートフォリオ版: 固定のデモユーザー
  const user: AuthUser = {
    id: 'portfolio-demo-user',
    email: 'demo@portfolio.com',
    name: 'デモユーザー',
    role: 'ADMIN',
    staffId: 1,
    isActive: true
  };

  const token = 'portfolio-demo-token';
  const loading = false;
  const isAuthenticated = true;

  // 簡略化された権限チェック（ポートフォリオ用）
  const canEditSchedule = () => true;
  const canManageDepartment = () => true;
  const canApproveSchedules = () => true;
  const isSystemAdmin = () => true;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        canEditSchedule,
        canManageDepartment,
        canApproveSchedules,
        isSystemAdmin,
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