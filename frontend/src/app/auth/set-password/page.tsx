'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SetPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      router.push('/auth/signin');
    }
  }, [searchParams, router]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('すべての項目を入力してください');
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

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${getApiHost()}/api/auth/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'パスワード設定に失敗しました');
      }

      setSuccess('パスワードが正常に設定されました。ログインページに移動します...');
      
      // 2秒後にログインページに遷移
      setTimeout(() => {
        router.push(`/auth/signin?email=${encodeURIComponent(email)}`);
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'パスワード設定中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            パスワード設定
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            初回ログイン用のパスワードを設定してください
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
              {success}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSetPassword}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                新しいパスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="8文字以上のパスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                パスワード確認
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="上記と同じパスワード"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="text-sm text-gray-600">
              <p>パスワードの要件：</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>8文字以上</li>
                <li>英数字・記号を組み合わせることを推奨</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!success}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'パスワード設定中...' : 'パスワードを設定'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/auth/signin')}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                ログインページに戻る
              </button>
            </div>
          </form>
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