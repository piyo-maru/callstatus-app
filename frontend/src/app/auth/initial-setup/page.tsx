'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import LoadingSpinner from '../../components/LoadingSpinner';

function InitialSetupForm() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, setTransitioning } = useAuth();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('無効な設定リンクです');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('無効な設定トークンです');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードと確認パスワードが一致しません');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const apiHost = typeof window !== 'undefined' && window.location.hostname === '10.99.129.21'
        ? 'http://10.99.129.21:3003'
        : 'http://localhost:3003';

      const response = await fetch(`${apiHost}/api/auth/setup-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password, confirmPassword })
      });

      const data = await response.json();

      if (response.ok) {
        // 自動ログイン
        if (data.token && data.user) {
          login(data.token, {
            id: data.user.id,
            email: data.user.email,
            name: data.user.staff?.name || 'Administrator',
            role: data.user.userType === 'ADMIN' ? 'ADMIN' : 'STAFF',
            staffId: data.user.staffId,
            isActive: data.user.isActive || true
          });
          
          // 遷移ローディングを表示
          setTransitioning(true);
          
          // メイン画面にリダイレクト
          router.push('/');
        } else {
          setError('ログイン情報の取得に失敗しました');
        }
      } else {
        setError(data.error || '初回パスワード設定に失敗しました');
      }
    } catch (error) {
      console.error('初回パスワード設定エラー:', error);
      setError('通信エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#f5f5f5'}}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-white text-center py-4 mb-0" style={{backgroundColor: '#1F2937'}}>
          <h1 className="text-lg font-medium">出社状況管理ボード</h1>
          <h2 className="text-sm">初回パスワード設定</h2>
        </div>
        
        {/* Form */}
        <div className="bg-white p-8 shadow-lg">
          <div className="text-center mb-6">
            <p className="text-gray-600 text-sm">
              セキュアなパスワードを設定してください
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength={8}
                autoComplete="new-password"
                className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="password confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength={8}
                autoComplete="new-password"
                className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'パスワード設定中...' : '初回パスワードを設定'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              このリンクは24時間後に期限切れとなります
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InitialSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    }>
      <InitialSetupForm />
    </Suspense>
  );
}