'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrlSync } from '../../../lib/api-config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const apiHost = getApiBaseUrlSync();

      const response = await fetch(`${apiHost}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        console.log('パスワードリセット申請成功:', data.debug);
      } else {
        const errorMessage = data.error || data.message || 'パスワードリセット申請に失敗しました';
        const errorDetails = data.details ? ` (${data.details})` : '';
        setError(errorMessage + errorDetails);
      }
    } catch (error) {
      console.error('パスワードリセット申請エラー:', error);
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
          <h2 className="text-sm">パスワードリセット</h2>
        </div>
        
        {/* Form */}
        <div className="bg-white p-8 shadow-lg">
          <div className="text-center mb-6">
            <p className="text-gray-600 text-sm">
              登録済みのメールアドレスを入力してください
            </p>
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'メール送信中...' : 'パスワードリセットメールを送信'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/auth/signin')}
              className="text-teal-500 hover:text-teal-600 text-sm"
            >
              ← ログイン画面に戻る
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              パスワードを忘れた方用の画面です
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}