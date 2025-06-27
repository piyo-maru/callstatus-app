'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from './AuthProvider';
import LoadingSpinner from './LoadingSpinner';

type AuthGuardProps = {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallback?: ReactNode;
};

export default function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const { user, loading, isAuthenticated, isTransitioning, setTransitioning } = useAuth();
  const router = useRouter();

  // 認証完了後にメイン画面が表示されたら遷移状態を解除
  useEffect(() => {
    if (isAuthenticated && isTransitioning) {
      const timer = setTimeout(() => {
        setTransitioning(false);
      }, 500); // 500ms後に遷移状態を解除
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isTransitioning, setTransitioning]);

  // 未認証の場合はログインページにリダイレクト
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [loading, isAuthenticated, router]);

  // ローディング中
  if (loading) {
    return <LoadingSpinner message="認証情報を確認中..." />;
  }

  // 遷移中
  if (isTransitioning) {
    return <LoadingSpinner message="メイン画面に移動中..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">ログインページに移動中...</div>
      </div>
    );
  }

  // 権限チェック
  if (requiredRole && user) {
    const userRole = user.role;
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // ADMIN は常にアクセス可能
    const hasPermission = userRole === 'ADMIN' || allowedRoles.includes(userRole);
    
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              アクセス権限がありません
            </h2>
            <p className="text-gray-600 mb-6">
              この機能を利用するには適切な権限が必要です。
            </p>
            <p className="text-sm text-gray-500">
              現在の権限: {(() => {
                const role = userRole as UserRole;
                switch (role) {
                  case 'STAFF': return '一般ユーザー';
                  case 'ADMIN': return '管理者';
                  case 'READONLY': return '閲覧専用';
                  default: return '不明';
                }
              })()}
            </p>
            {fallback}
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}