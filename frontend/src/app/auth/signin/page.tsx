'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleEmailCheck = async () => {
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // バックエンドでユーザー情報確認
      const response = await fetch(`${getApiHost()}/api/auth/user?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error('ユーザーが見つかりません');
      }

      const userData = await response.json();
      
      if (!userData.hasPassword) {
        // パスワード未設定の場合は設定ページに遷移
        router.push(`/auth/set-password?email=${encodeURIComponent(email)}`);
      } else {
        // パスワード設定済みの場合はパスワード入力欄を表示
        setNeedsPassword(true);
      }
    } catch (error) {
      setError('ユーザーの確認に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
        return;
      }

      if (result?.ok) {
        // セッション情報を更新
        await getSession();
        router.push(callbackUrl);
      }
    } catch (error) {
      setError('ログイン処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            コールステータスシステム
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            ログインしてください
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {!needsPassword ? (
            // メール入力フェーズ
            <div>
              <label htmlFor="email" className="sr-only">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEmailCheck()}
              />
              
              <button
                type="button"
                onClick={handleEmailCheck}
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 mt-4"
              >
                {isLoading ? '確認中...' : '次へ'}
              </button>
            </div>
          ) : (
            // パスワード入力フェーズ
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div>
                <label htmlFor="email-display" className="block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  id="email-display"
                  type="email"
                  value={email}
                  disabled
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => {setNeedsPassword(false); setPassword(''); setError('');}}
                  className="mt-1 text-sm text-indigo-600 hover:text-indigo-500"
                >
                  メールアドレスを変更
                </button>
              </div>

              <div>
                <label htmlFor="password" className="sr-only">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              テストアカウント：
              <br />
              管理者: admin@example.com
              <br />
              一般ユーザー: user@example.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getApiHost(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXTAUTH_BACKEND_URL || 'http://localhost:3002';
  }
  
  const currentHost = window.location.hostname;
  if (currentHost === '10.99.129.21') {
    return 'http://10.99.129.21:3002';
  }
  return 'http://localhost:3002';
}