'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PersonalSchedulePage from '../../components/PersonalSchedulePage';
import { useAuth } from '../../components/AuthProvider';
import AuthGuard from '../../components/AuthGuard';

interface StaffPersonalPageProps {
  params: {
    staffId: string;
  };
}

export default function StaffPersonalPage({ params }: StaffPersonalPageProps) {
  const router = useRouter();
  const { canEditSchedule } = useAuth();
  const staffId = parseInt(params.staffId);

  // 無効なstaffIdの場合は元のページにリダイレクト
  if (isNaN(staffId)) {
    router.replace('/personal');
    return <div>無効なスタッフIDです...</div>;
  }

  // 編集権限をチェック（閲覧は全員可能、編集は権限チェック）
  const canEdit = canEditSchedule(staffId);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* パンくずナビゲーション */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <button
              onClick={() => router.back()}
              className="hover:text-blue-600 transition-colors"
            >
              ← 戻る
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              スタッフ個人ページ (ID: {staffId})
            </span>
            {!canEdit && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                閲覧専用
              </span>
            )}
          </div>
        </div>

        {/* 既存の個人ページコンポーネントを再利用 */}
        <PersonalSchedulePage 
          initialStaffId={staffId}
          readOnlyMode={!canEdit}
        />
      </div>
    </AuthGuard>
  );
}