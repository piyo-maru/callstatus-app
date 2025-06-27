'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginScreen() {
  const { loginWithCredentials, setPassword: setUserPassword, checkUserExists, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password' | 'set-password'>('email');

  // メール入力後の処理
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userInfo = await checkUserExists(email);
      
      if (!userInfo.exists) {
        setError('このメールアドレスは登録されていません');
        return;
      }

      setUserName(userInfo.name || '');
      
      if (userInfo.hasPassword) {
        setStep('password');
      } else {
        setStep('set-password');
      }
    } catch (error) {
      setError('ユーザー情報の確認に失敗しました');
      console.error('User check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginWithCredentials(email, password);
    } catch (error: any) {
      setError(error.message || 'ログインに失敗しました');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim() || !confirmPassword.trim()) {
      setError('パスワードと確認パスワードを入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await setUserPassword(email, password, confirmPassword);
    } catch (error: any) {
      setError(error.message || 'パスワード設定に失敗しました');
      console.error('Set password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 戻るボタン
  const handleBack = () => {
    setStep('email');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#f5f5f5'}}>
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#f5f5f5'}}>
      <div className="w-full max-w-sm">
        {/* ダークヘッダー */}
        <div className="bg-gray-800 text-white text-center py-4 mb-0">
          <h1 className="text-lg font-medium">出社状況管理ボード</h1>
          <h2 className="text-base font-bold mt-1">Login</h2>
          {step !== 'email' && userName && (
            <p className="text-sm text-gray-300 mt-2">
              {step === 'password' && `${userName}さん、パスワードを入力してください`}
              {step === 'set-password' && `${userName}さん、初回パスワードを設定してください`}
            </p>
          )}
        </div>
        
        {/* 白いフォームコンテナ */}
        <div className="bg-white p-8 shadow-lg">
          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={
            step === 'email' ? handleEmailSubmit :
            step === 'password' ? handleLogin :
            handleSetPassword
          } className="space-y-6">
            
            {/* メールアドレス入力 - メール入力ステップでのみ表示 */}
            {step === 'email' && (
              <div>
                <input
                  type="email"
                  placeholder="メールアドレスを入力"
                  required
                  className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* パスワード入力 - パスワード入力ステップとパスワード設定ステップで表示 */}
            {(step === 'password' || step === 'set-password') && (
              <>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={step === 'password' ? 'パスワードを入力' : '新しいパスワード（8文字以上）'}
                    required
                    className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* パスワード確認入力 - パスワード設定ステップでのみ表示 */}
                {step === 'set-password' && (
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="パスワードを再入力"
                      required
                      className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 bg-transparent text-gray-700 placeholder-gray-400 focus:outline-none focus:border-teal-500 transition-colors"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-3 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ボタンエリア */}
            <div className="flex space-x-3">
              {/* 戻るボタン - メール入力以外のステップで表示 */}
              {step !== 'email' && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 flex justify-center items-center py-3 px-4 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  back
                </button>
              )}
              
              {/* メインボタン */}
              <button
                type="submit"
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? '処理中...' : 
                 step === 'email' ? 'next' :
                 step === 'password' ? 'Login' :
                 'パスワード設定'}
              </button>
            </div>

          </form>

          {/* テストアカウント情報 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              テストアカウント<br />
              管理者: admin@example.com<br />
              一般ユーザー: user@example.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}