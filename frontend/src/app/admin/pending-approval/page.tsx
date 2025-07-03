'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../components/AuthProvider';
import AuthGuard from '../../components/AuthGuard';
import { STATUS_COLORS, capitalizeStatus, BUTTON_STYLES } from '../../components/timeline/TimelineUtils';

// 型定義
type PendingSchedule = {
  id: number;
  staffId: number;
  staffName?: string;
  date: string;
  status: string;
  start: number;
  end: number;
  memo?: string;
  isPending: boolean;
  pendingType: 'monthly-planner' | 'manual';
  approvedBy?: { id: number; name: string };
  approvedAt?: string;
  rejectedBy?: { id: number; name: string };
  rejectedAt?: string;
  rejectionReason?: string;
  approvalLogs?: any[];
  createdAt: string;
  updatedAt: string;
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

// APIのURL取得
const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.APP_CONFIG?.API_HOST) {
    return window.APP_CONFIG.API_HOST;
  }
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${currentHost}:3002`;
};

// カスタム複合予定の詳細解析ユーティリティ
const parseCompositeScheduleDetails = (memo: string) => {
  try {
    // カスタム複合予定のパターンを確認
    if (memo.includes('カスタム複合予定') && memo.includes('details:')) {
      const detailsMatch = memo.match(/details:(\{.*\})$/);
      if (detailsMatch) {
        const details = JSON.parse(detailsMatch[1]);
        return {
          isComposite: true,
          description: details.description || '',
          schedules: details.schedules || [],
          presetLabel: 'カスタム複合予定'
        };
      }
    }
    
    // 通常のプリセット予定のパターン
    if (memo.includes('月次プランナー:') && !memo.includes('カスタム複合予定')) {
      const labelMatch = memo.match(/月次プランナー:\s*([^|]+)/);
      if (labelMatch) {
        return {
          isComposite: false,
          presetLabel: labelMatch[1].trim(),
          description: '',
          schedules: []
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse composite schedule details:', error);
    return null;
  }
};

// 時刻を表示用にフォーマット
const formatTime = (decimalTime: number): string => {
  const hours = Math.floor(decimalTime);
  const minutes = Math.round((decimalTime - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export default function PendingApprovalPage() {
  const { user, token, logout } = useAuth();
  
  // 基本状態
  const [pendingList, setPendingList] = useState<PendingSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  // フィルター状態
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  
  // 承認・却下モーダル状態
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalReason, setApprovalReason] = useState('');
  const [processingItem, setProcessingItem] = useState<PendingSchedule | null>(null);

  // Pending一覧取得
  const fetchPendingList = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentApiUrl = getApiUrl();
      const params = new URLSearchParams();
      
      if (filterDate) params.append('date', filterDate);
      if (filterDepartment !== 'all') params.append('department', filterDepartment);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const response = await fetch(`${currentApiUrl}/api/admin/pending-schedules?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingList(data);
      } else {
        console.error('Failed to fetch pending list:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch pending list:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, filterDate, filterDepartment, filterStatus]);

  // 個別承認・却下
  const handleIndividualApproval = useCallback(async (item: PendingSchedule, action: 'approve' | 'reject') => {
    setProcessingItem(item);
    setApprovalAction(action);
    setApprovalReason('');
    setShowApprovalModal(true);
  }, []);

  // 一括承認・却下
  const handleBulkApproval = useCallback(async (action: 'approve' | 'reject') => {
    if (selectedItems.size === 0) {
      alert('処理する項目を選択してください');
      return;
    }
    
    setProcessingItem(null);
    setApprovalAction(action);
    setApprovalReason('');
    setShowApprovalModal(true);
  }, [selectedItems]);

  // 承認・却下実行
  const executeApproval = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      
      if (processingItem) {
        // 個別処理
        const endpoint = approvalAction === 'approve' ? 'approve' : 'reject';
        const response = await fetch(`${currentApiUrl}/api/schedules/pending/${processingItem.id}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: approvalReason })
        });
        
        if (response.ok) {
          alert(`${approvalAction === 'approve' ? '承認' : '却下'}しました`);
        } else {
          alert(`${approvalAction === 'approve' ? '承認' : '却下'}に失敗しました`);
        }
      } else {
        // 一括処理
        const response = await fetch(`${currentApiUrl}/api/admin/pending-schedules/bulk-approval`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pendingIds: Array.from(selectedItems),
            action: approvalAction,
            reason: approvalReason
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`${result.success}件の${approvalAction === 'approve' ? '承認' : '却下'}が完了しました`);
          setSelectedItems(new Set());
        } else {
          alert(`一括${approvalAction === 'approve' ? '承認' : '却下'}に失敗しました`);
        }
      }
      
      // データ再取得
      await fetchPendingList();
      setShowApprovalModal(false);
    } catch (error) {
      console.error('Approval failed:', error);
      alert('処理に失敗しました');
    }
  }, [processingItem, approvalAction, approvalReason, selectedItems, token, fetchPendingList]);

  // 部署一覧取得
  const departments = useMemo(() => {
    const deptSet = new Set(pendingList.map(item => item.staffName?.split(' ')[0]).filter(Boolean));
    return Array.from(deptSet).sort();
  }, [pendingList]);

  // フィルタリングされたリスト
  const filteredList = useMemo(() => {
    return pendingList.filter(item => {
      if (filterStatus === 'pending' && (item.approvedAt || item.rejectedAt)) return false;
      if (filterStatus === 'approved' && !item.approvedAt) return false;
      if (filterStatus === 'rejected' && !item.rejectedAt) return false;
      return true;
    });
  }, [pendingList, filterStatus]);

  // 全選択・全解除
  const handleSelectAll = useCallback(() => {
    const availableItems = filteredList.filter(item => !item.approvedAt && !item.rejectedAt);
    if (selectedItems.size === availableItems.length && availableItems.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(availableItems.map(item => item.id)));
    }
  }, [filteredList, selectedItems]);

  // 統計情報
  const stats = useMemo(() => {
    const pending = pendingList.filter(item => !item.approvedAt && !item.rejectedAt).length;
    const approved = pendingList.filter(item => item.approvedAt).length;
    const rejected = pendingList.filter(item => item.rejectedAt).length;
    return { pending, approved, rejected, total: pendingList.length };
  }, [pendingList]);

  // 初期データ取得
  useEffect(() => {
    fetchPendingList();
  }, [fetchPendingList]);

  return (
    <AuthGuard requiredRole={['ADMIN', 'SYSTEM_ADMIN']}>
      <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        {/* タイトル行 */}
        <div className="bg-indigo-600 px-6 py-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">
              <svg className="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
              </svg>
              申請承認管理
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-indigo-100">
                {user?.name || user?.email} ({user?.role === 'SYSTEM_ADMIN' ? 'システム管理者' : user?.role === 'ADMIN' ? '管理者' : '一般ユーザー'})
              </span>
              <a
                href="/"
                className={BUTTON_STYLES.headerSecondary}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
                出社状況
              </a>
              <a
                href="/personal"
                className={BUTTON_STYLES.headerSecondary}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                個人ページ
              </a>
              <a
                href="/monthly-planner"
                className={BUTTON_STYLES.headerPrimary}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                月次プランナー
              </a>
              <button
                onClick={logout}
                className={BUTTON_STYLES.headerNeutral}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                ログアウト
              </button>
            </div>
          </div>
        </div>
        
        {/* 統計・操作行 */}
        <div className="px-6 py-3 flex items-center justify-between">
          {/* 左：フィルター・統計 */}
          <div className="flex items-center gap-6">
            {/* フィルター - 1行表示 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">ステータス:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="all">すべて</option>
                  <option value="pending">承認待ち</option>
                  <option value="approved">承認済み</option>
                  <option value="rejected">却下済み</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">日付:</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">部署:</span>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="all">すべて</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 統計表示 */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="bg-yellow-100 px-2 py-1 rounded">
                承認待ち: <span className="font-bold text-yellow-800">{stats.pending}</span>
              </div>
              <div className="bg-green-100 px-2 py-1 rounded">
                承認済み: <span className="font-bold text-green-800">{stats.approved}</span>
              </div>
              <div className="bg-red-100 px-2 py-1 rounded">
                却下済み: <span className="font-bold text-red-800">{stats.rejected}</span>
              </div>
            </div>
          </div>

          {/* 右：操作ボタン */}
          <div className="flex items-center space-x-2">
            {selectedItems.size > 0 && (
              <>
                <span className="text-sm text-gray-600">{selectedItems.size}件選択中</span>
                <button
                  onClick={() => handleBulkApproval('approve')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  一括承認
                </button>
                <button
                  onClick={() => handleBulkApproval('reject')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  一括却下
                </button>
              </>
            )}
            <button
              onClick={fetchPendingList}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              更新
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {/* テーブルヘッダー */}
            <div className="border-b p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedItems.size > 0 && selectedItems.size === filteredList.filter(item => !item.approvedAt && !item.rejectedAt).length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">全選択</span>
              </div>
            </div>

            {/* テーブル内容 */}
            <div className="divide-y">
              {filteredList.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  該当するPending予定がありません
                </div>
              ) : (
                filteredList.map((item) => {
                  const isProcessed = item.approvedAt || item.rejectedAt;
                  return (
                    <div key={item.id} className={`p-4 hover:bg-gray-50 ${isProcessed ? 'opacity-75' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {!isProcessed && (
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedItems);
                                if (e.target.checked) {
                                  newSelected.add(item.id);
                                } else {
                                  newSelected.delete(item.id);
                                }
                                setSelectedItems(newSelected);
                              }}
                              className="rounded"
                            />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: STATUS_COLORS[item.status] }}
                              />
                              <span className="font-medium text-gray-900">{item.staffName}</span>
                              <span className="text-sm text-gray-500">{item.date}</span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {capitalizeStatus(item.status)} ({formatTime(item.start)}-{formatTime(item.end)})
                              {item.memo && (() => {
                                const compositeDetails = parseCompositeScheduleDetails(item.memo);
                                if (compositeDetails?.isComposite) {
                                  const schedulesSummary = compositeDetails.schedules.map((schedule: any) => 
                                    `${capitalizeStatus(schedule.status)} ${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}`
                                  ).join(' , ');
                                  return (
                                    <span className="ml-2">
                                      <span className="text-indigo-600 font-medium">- {compositeDetails.presetLabel}</span>
                                      {compositeDetails.description && (
                                        <span className="text-gray-700"> - 説明: {compositeDetails.description}</span>
                                      )}
                                      <span className="text-gray-600 text-xs"> ({schedulesSummary})</span>
                                    </span>
                                  );
                                } else if (compositeDetails?.presetLabel) {
                                  return (
                                    <span className="ml-2 text-indigo-600 font-medium">
                                      - {compositeDetails.presetLabel}
                                    </span>
                                  );
                                } else {
                                  return <span className="ml-2">- {item.memo}</span>;
                                }
                              })()}
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                              <span>タイプ: {item.pendingType}</span>
                              <span>作成: {new Date(item.createdAt).toLocaleDateString('ja-JP')}</span>
                            </div>
                          </div>
                        </div>

                        {/* ステータス・操作ボタン */}
                        <div className="flex items-center space-x-2">
                          {item.approvedAt ? (
                            <div className="text-center">
                              <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                承認済み
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.approvedBy?.name} ({new Date(item.approvedAt).toLocaleDateString('ja-JP')})
                              </div>
                            </div>
                          ) : item.rejectedAt ? (
                            <div className="text-center">
                              <div className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                却下済み
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.rejectedBy?.name} ({new Date(item.rejectedAt).toLocaleDateString('ja-JP')})
                              </div>
                              {item.rejectionReason && (
                                <div className="text-xs text-red-600 mt-1">
                                  理由: {item.rejectionReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleIndividualApproval(item, 'approve')}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                承認
                              </button>
                              <button
                                onClick={() => handleIndividualApproval(item, 'reject')}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              >
                                却下
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 承認・却下モーダル */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {approvalAction === 'approve' ? '承認' : '却下'}の確認
            </h3>
            
            {processingItem ? (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>{processingItem.staffName}</strong>の予定を{approvalAction === 'approve' ? '承認' : '却下'}します
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {processingItem.date} {capitalizeStatus(processingItem.status)} ({formatTime(processingItem.start)}-{formatTime(processingItem.end)})
                </p>
                {processingItem.memo && (() => {
                  const compositeDetails = parseCompositeScheduleDetails(processingItem.memo);
                  if (compositeDetails?.isComposite) {
                    const schedulesSummary = compositeDetails.schedules.map((schedule: any) => 
                      `${capitalizeStatus(schedule.status)} ${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}`
                    ).join(' , ');
                    return (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-sm text-blue-800">
                          <span className="font-medium">{compositeDetails.presetLabel}</span>
                          {compositeDetails.description && (
                            <span className="text-blue-700"> - 説明: {compositeDetails.description}</span>
                          )}
                          <div className="text-xs text-blue-600 mt-1">({schedulesSummary})</div>
                        </div>
                      </div>
                    );
                  } else if (compositeDetails?.presetLabel) {
                    return (
                      <div className="mt-2 p-2 bg-indigo-50 rounded border border-indigo-200">
                        <div className="text-sm text-indigo-700 font-medium">
                          {compositeDetails.presetLabel}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="text-sm text-gray-700">
                          メモ: {processingItem.memo}
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  選択された<strong>{selectedItems.size}件</strong>を{approvalAction === 'approve' ? '承認' : '却下'}します
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                理由（任意）
              </label>
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder={`${approvalAction === 'approve' ? '承認' : '却下'}理由を入力してください（任意）`}
              />
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={executeApproval}
                className={`px-3 py-2 text-sm text-white rounded hover:opacity-90 ${
                  approvalAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {approvalAction === 'approve' ? '承認する' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}