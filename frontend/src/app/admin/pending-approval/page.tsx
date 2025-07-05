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
    
    // 通常のプリセット予定のパターン（月次プランナー/月次計画両対応）
    if ((memo.includes('月次プランナー:') || memo.includes('月次計画:')) && !memo.includes('カスタム複合予定')) {
      const labelMatch = memo.match(/(?:月次プランナー|月次計画):\s*([^|]+)/);
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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  // 部署・グループ設定
  const [departmentSettings, setDepartmentSettings] = useState<{
    departments: Array<{id: number, name: string, shortName?: string, backgroundColor?: string, displayOrder?: number}>;
    groups: Array<{id: number, name: string, shortName?: string, backgroundColor?: string, displayOrder?: number}>;
  }>({ departments: [], groups: [] });
  
  // スタッフ情報（フィルタリング用）
  const [staffList, setStaffList] = useState<Array<{id: number, empNo?: string, name: string, department: string, group: string}>>([]);
  
  // 承認・却下モーダル状態
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalReason, setApprovalReason] = useState('');
  const [processingItem, setProcessingItem] = useState<PendingSchedule | null>(null);
  
  // 処理状態管理
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [processingType, setProcessingType] = useState<'approve' | 'reject' | null>(null);
  const [processingResults, setProcessingResults] = useState({ success: 0, failed: 0, errors: [] as string[] });
  const [isIndividualProcessing, setIsIndividualProcessing] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<number | null>(null);

  // 部署・グループ設定取得
  const fetchDepartmentSettings = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/department-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartmentSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch department settings:', error);
    }
  }, [token]);

  // スタッフ一覧取得
  const fetchStaffList = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/staff`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStaffList(data);
      }
    } catch (error) {
      console.error('Failed to fetch staff list:', error);
    }
  }, [token]);

  // Pending一覧取得
  const fetchPendingList = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentApiUrl = getApiUrl();
      const params = new URLSearchParams();
      
      // 日付フィルター: 単一日付が指定されている場合はそれを優先、なければ日付範囲を使用
      if (filterDate) {
        params.append('date', filterDate);
      } else {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }
      
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
  }, [token, filterDate, startDate, endDate, filterStatus]);

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
    const currentApiUrl = getApiUrl();
    
    if (processingItem) {
      // 個別処理
      setIsIndividualProcessing(true);
      setProcessingItemId(processingItem.id);
      
      try {
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
          await fetchPendingList();
          setShowApprovalModal(false);
        } else {
          alert(`${approvalAction === 'approve' ? '承認' : '却下'}に失敗しました`);
        }
      } catch (error) {
        console.error('Individual approval failed:', error);
        alert('処理に失敗しました');
      } finally {
        setIsIndividualProcessing(false);
        setProcessingItemId(null);
      }
    } else {
      // 一括処理（進行状況追跡付き）
      const itemsToProcess = Array.from(selectedItems);
      const totalItems = itemsToProcess.length;
      
      setIsProcessing(true);
      setProcessingType(approvalAction);
      setProcessingProgress({ current: 0, total: totalItems });
      setProcessingResults({ success: 0, failed: 0, errors: [] });
      setShowApprovalModal(false);
      
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      try {
        for (let i = 0; i < itemsToProcess.length; i++) {
          const itemId = itemsToProcess[i];
          const item = pendingList.find(p => p.id === itemId);
          
          try {
            const endpoint = approvalAction === 'approve' ? 'approve' : 'reject';
            const response = await fetch(`${currentApiUrl}/api/schedules/pending/${itemId}/${endpoint}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ reason: approvalReason })
            });
            
            if (response.ok) {
              successCount++;
            } else {
              failedCount++;
              const errorText = await response.text();
              errors.push(`${item?.staffName || itemId}: ${errorText}`);
            }
          } catch (error) {
            failedCount++;
            errors.push(`${item?.staffName || itemId}: ネットワークエラー`);
          }
          
          // 進行状況更新
          setProcessingProgress({ current: i + 1, total: totalItems });
          setProcessingResults({ success: successCount, failed: failedCount, errors });
          
          // API負荷軽減のため少し待機
          if (i < itemsToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // 処理完了後の結果表示
        const resultMessage = `処理完了: 成功 ${successCount}件 / 失敗 ${failedCount}件`;
        if (failedCount > 0) {
          const detailMessage = `${resultMessage}\n\n失敗詳細:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...他' + (errors.length - 5) + '件' : ''}`;
          alert(detailMessage);
        } else {
          alert(resultMessage);
        }
        
        setSelectedItems(new Set());
        await fetchPendingList();
        
      } catch (error) {
        console.error('Bulk approval failed:', error);
        alert('一括処理に失敗しました');
      } finally {
        setIsProcessing(false);
        setProcessingType(null);
        setProcessingProgress({ current: 0, total: 0 });
        setProcessingResults({ success: 0, failed: 0, errors: [] });
      }
    }
  }, [processingItem, approvalAction, approvalReason, selectedItems, token, fetchPendingList, pendingList]);

  // 部署・グループマップ
  const departmentMap = useMemo(() => {
    const map = new Map();
    departmentSettings.departments.forEach(dept => {
      map.set(dept.name, dept);
    });
    return map;
  }, [departmentSettings.departments]);

  const groupToStaffMap = useMemo(() => {
    const map = new Map();
    staffList.forEach(staff => {
      map.set(staff.group, staff);
    });
    return map;
  }, [staffList]);

  // 部署のソート
  const sortedDepartments = useMemo(() => {
    const uniqueDepts = Array.from(new Set(staffList.map(s => s.department)));
    return uniqueDepts.sort((a, b) => {
      const settingA = departmentMap.get(a);
      const settingB = departmentMap.get(b);
      const orderA = settingA?.displayOrder || 0;
      const orderB = settingB?.displayOrder || 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b);
    });
  }, [staffList, departmentMap]);

  // グループのソート（選択部署に基づく）
  const sortedGroups = useMemo(() => {
    const filteredStaff = staffList.filter(s => {
      return filterDepartment === 'all' || s.department === filterDepartment;
    });
    const uniqueGroups = Array.from(new Set(filteredStaff.map(s => s.group)));
    
    return uniqueGroups.sort((a, b) => {
      const staffA = groupToStaffMap.get(a);
      const staffB = groupToStaffMap.get(b);
      
      if (!staffA || !staffB) return 0;
      
      const deptA = departmentMap.get(staffA.department);
      const deptB = departmentMap.get(staffB.department);
      
      const orderA = deptA?.displayOrder ?? 999;
      const orderB = deptB?.displayOrder ?? 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b, 'ja', { numeric: true });
    });
  }, [staffList, filterDepartment, groupToStaffMap, departmentMap]);

  // フィルタリングされたリスト
  const filteredList = useMemo(() => {
    const filtered = pendingList.filter(item => {
      // ステータスフィルター
      if (filterStatus === 'pending' && (item.approvedAt || item.rejectedAt)) return false;
      if (filterStatus === 'approved' && !item.approvedAt) return false;
      if (filterStatus === 'rejected' && !item.rejectedAt) return false;
      
      // 部署・グループフィルター
      const staff = staffList.find(s => s.id === item.staffId);
      if (!staff) return true; // スタッフ情報が見つからない場合は表示
      
      const departmentMatch = filterDepartment === 'all' || staff.department === filterDepartment;
      const groupMatch = filterGroup === 'all' || staff.group === filterGroup;
      
      return departmentMatch && groupMatch;
    });

    // ソート：部署>グループ>社員番号>日付の順
    return filtered.sort((a, b) => {
      const staffA = staffList.find(s => s.id === a.staffId);
      const staffB = staffList.find(s => s.id === b.staffId);
      
      // スタッフ情報が見つからない場合は最後に
      if (!staffA && !staffB) return 0;
      if (!staffA) return 1;
      if (!staffB) return -1;

      // 1. 部署でソート（部署設定のdisplayOrderを考慮）
      const deptA = departmentMap.get(staffA.department);
      const deptB = departmentMap.get(staffB.department);
      const deptOrderA = deptA?.displayOrder ?? 999;
      const deptOrderB = deptB?.displayOrder ?? 999;
      
      if (deptOrderA !== deptOrderB) {
        return deptOrderA - deptOrderB;
      }
      if (staffA.department !== staffB.department) {
        return staffA.department.localeCompare(staffB.department);
      }

      // 2. グループでソート
      if (staffA.group !== staffB.group) {
        return staffA.group.localeCompare(staffB.group, 'ja', { numeric: true });
      }

      // 3. 社員番号でソート
      const empNoA = staffA.empNo || '';
      const empNoB = staffB.empNo || '';
      if (empNoA !== empNoB) {
        return empNoA.localeCompare(empNoB, 'ja', { numeric: true });
      }

      // 4. 日付でソート
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }

      // 最終的にIDでソート（一意性確保）
      return a.id - b.id;
    });
  }, [pendingList, filterStatus, staffList, filterDepartment, filterGroup, departmentMap]);

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
    fetchDepartmentSettings();
    fetchStaffList();
    fetchPendingList();
  }, [fetchDepartmentSettings, fetchStaffList, fetchPendingList]);

  // 部署選択変更時にグループをリセット
  useEffect(() => {
    setFilterGroup('all');
  }, [filterDepartment]);

  return (
    <AuthGuard requiredRole={['ADMIN', 'SYSTEM_ADMIN']}>
      <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        {/* タイトル行 */}
        <div className="bg-indigo-600 px-6 py-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">
              <svg className="w-5 h-5 mr-2 inline" fill="currentColor" viewBox="0 0 512 512">
                <path d="M441.123,301.182c0,0-18.339,0-33.781,0c-29.613,0-72.404,0-72.404,0c-28.19-3.163-36.485-51.044-22.89-116.593c8.207-39.524,24.55-71.256,24.55-103.995C336.599,36.088,300.511,0,255.996,0c-44.506,0-80.594,36.088-80.594,80.594c0,32.74,16.352,64.472,24.55,103.995c13.595,65.549,5.3,113.43-22.89,116.593c0,0-42.793,0-72.404,0c-15.442,0-33.782,0-33.782,0c-22.562,0-40.858,18.295-40.858,40.858v97.052h451.963V342.04C481.981,319.477,463.687,301.182,441.123,301.182z" />
                <rect x="64.242" y="471.884" width="383.525" height="40.116" />
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
                月次計画
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
          {/* 左：フィルター・統計 - 2行構成 */}
          <div className="flex flex-col gap-3">
            {/* 1行目：部署　グループ */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">部署:</span>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="all">すべての部署</option>
                  {sortedDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">グループ:</span>
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="all">すべてのグループ</option>
                  {sortedGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* 2行目：日付　ステータス */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">日付:</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  placeholder="単一日付"
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">または範囲:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="開始日"
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                />
                <span className="text-xs text-gray-500">〜</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="終了日"
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>

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
            </div>
          </div>

          {/* 右：統計バッジ + 操作ボタン - Y軸中央配置 */}
          <div className="flex items-center space-x-2 self-center">
            {/* 統計表示 */}
            <div className="bg-yellow-100 px-2 py-1 rounded text-xs">
              承認待ち: <span className="font-bold text-yellow-800">{stats.pending}</span>
            </div>
            <div className="bg-green-100 px-2 py-1 rounded text-xs">
              承認済み: <span className="font-bold text-green-800">{stats.approved}</span>
            </div>
            <div className="bg-red-100 px-2 py-1 rounded text-xs">
              却下済み: <span className="font-bold text-red-800">{stats.rejected}</span>
            </div>
            {selectedItems.size > 0 && (
              <>
                <span className="text-sm text-gray-600">{selectedItems.size}件選択中</span>
                <button
                  onClick={() => handleBulkApproval('approve')}
                  disabled={isProcessing || isIndividualProcessing || isLoading}
                  className={`px-3 py-1 text-white text-sm rounded ${
                    isProcessing || isIndividualProcessing || isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isProcessing && processingType === 'approve' ? '承認中...' : '一括承認'}
                </button>
                <button
                  onClick={() => handleBulkApproval('reject')}
                  disabled={isProcessing || isIndividualProcessing || isLoading}
                  className={`px-3 py-1 text-white text-sm rounded ${
                    isProcessing || isIndividualProcessing || isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isProcessing && processingType === 'reject' ? '却下中...' : '一括却下'}
                </button>
              </>
            )}
            <button
              onClick={fetchPendingList}
              disabled={isProcessing || isIndividualProcessing || isLoading}
              className={`px-3 py-1 text-white text-sm rounded ${
                isProcessing || isIndividualProcessing || isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isLoading ? '更新中...' : '更新'}
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
                  disabled={isProcessing || isIndividualProcessing}
                  className={`rounded ${
                    isProcessing || isIndividualProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <span className={`text-sm font-medium text-gray-700 ${
                  isProcessing || isIndividualProcessing ? 'opacity-50' : ''
                }`}>全選択</span>
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
                          {/* 左側：チェックボックスとステータス色インジケーター */}
                          <div className="flex items-center space-x-2">
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
                                disabled={isProcessing || isIndividualProcessing}
                                className={`rounded ${
                                  isProcessing || isIndividualProcessing ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              />
                            )}
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: STATUS_COLORS[item.status] }}
                            />
                          </div>
                          
                          {/* 右側：2行の情報表示 */}
                          <div className="flex-1 min-w-0">
                            {/* 1行目：社員番号　スタッフ名　部署　グループ　タイプ　作成日 */}
                            <div className="flex items-center space-x-4">
                              {(() => {
                                const staff = staffList.find(s => s.id === item.staffId);
                                return (
                                  <>
                                    <span className="text-sm text-gray-900">{staff?.empNo || 'N/A'}</span>
                                    <span className="font-medium text-gray-900">{item.staffName}</span>
                                    <span className="text-sm text-gray-600">{staff?.department || 'N/A'}</span>
                                    <span className="text-sm text-gray-600">{staff?.group || 'N/A'}</span>
                                    <span className="text-xs text-gray-500">タイプ: {item.pendingType}</span>
                                    <span className="text-xs text-gray-500">作成: {new Date(item.createdAt).toLocaleDateString('ja-JP')}</span>
                                  </>
                                );
                              })()}
                            </div>
                            
                            {/* 2行目：日付（yyyy/mm/dd(aaa)）　ステータス名　時間範囲　プリセット情報 */}
                            <div className="mt-1 flex items-center space-x-4">
                              <span className="text-sm text-gray-500">
                                {(() => {
                                  const date = new Date(item.date);
                                  const dateStr = date.toLocaleDateString('ja-JP', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit' 
                                  });
                                  const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
                                  return `${dateStr}(${weekday})`;
                                })()}
                              </span>
                              <span className="text-sm text-gray-600">{capitalizeStatus(item.status)}</span>
                              <span className="text-sm text-gray-600">({formatTime(item.start)}-{formatTime(item.end)})</span>
                              {item.memo && (() => {
                                const compositeDetails = parseCompositeScheduleDetails(item.memo);
                                if (compositeDetails?.isComposite) {
                                  const schedulesSummary = compositeDetails.schedules.map((schedule: any) => 
                                    `${capitalizeStatus(schedule.status)} ${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}`
                                  ).join(' , ');
                                  return (
                                    <span>
                                      <span className="text-indigo-600 font-medium">- {compositeDetails.presetLabel}</span>
                                      {compositeDetails.description && (
                                        <span className="text-gray-700"> - 説明: {compositeDetails.description}</span>
                                      )}
                                      <span className="text-gray-600 text-xs"> ({schedulesSummary})</span>
                                    </span>
                                  );
                                } else if (compositeDetails?.presetLabel) {
                                  return (
                                    <span className="text-indigo-600 font-medium">
                                      - {compositeDetails.presetLabel}
                                    </span>
                                  );
                                } else {
                                  return <span>- {item.memo}</span>;
                                }
                              })()}
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
                                disabled={isProcessing || (isIndividualProcessing && processingItemId === item.id)}
                                className={`px-2 py-1 text-white text-xs rounded ${
                                  isProcessing || (isIndividualProcessing && processingItemId === item.id)
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                }`}
                              >
                                {isIndividualProcessing && processingItemId === item.id ? '承認中...' : '承認'}
                              </button>
                              <button
                                onClick={() => handleIndividualApproval(item, 'reject')}
                                disabled={isProcessing || (isIndividualProcessing && processingItemId === item.id)}
                                className={`px-2 py-1 text-white text-xs rounded ${
                                  isProcessing || (isIndividualProcessing && processingItemId === item.id)
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700'
                                }`}
                              >
                                {isIndividualProcessing && processingItemId === item.id ? '却下中...' : '却下'}
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
                disabled={isIndividualProcessing}
                className={`px-3 py-2 text-sm border border-gray-300 rounded ${
                  isIndividualProcessing
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                キャンセル
              </button>
              <button
                onClick={executeApproval}
                disabled={isIndividualProcessing}
                className={`px-3 py-2 text-sm text-white rounded ${
                  isIndividualProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `hover:opacity-90 ${
                        approvalAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                      }`
                }`}
              >
                {isIndividualProcessing
                  ? `${approvalAction === 'approve' ? '承認' : '却下'}中...`
                  : `${approvalAction === 'approve' ? '承認する' : '却下する'}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 処理中モーダル */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="text-center">
              {/* タイトル */}
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {processingType === 'approve' ? '一括承認中' : '一括却下中'}
              </h3>
              
              {/* ローディングスピナー */}
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
              
              {/* 進行状況 */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  {processingProgress.current} / {processingProgress.total} 件処理中
                </div>
                
                {/* 進行状況バー */}
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${processingProgress.total > 0 ? (processingProgress.current / processingProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {/* 結果表示 */}
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-green-600">成功:</span>
                  <span className="font-medium text-green-600">{processingResults.success}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">失敗:</span>
                  <span className="font-medium text-red-600">{processingResults.failed}件</span>
                </div>
              </div>
              
              {/* 注意メッセージ */}
              <div className="mt-4 text-xs text-gray-500">
                処理中はこのウィンドウを閉じないでください
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}