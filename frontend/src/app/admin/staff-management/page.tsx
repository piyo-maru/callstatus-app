'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/AuthProvider';
import AuthGuard from '../../components/AuthGuard';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '../../components/constants/MainAppConstants';

// 型定義
interface StaffMember {
  id: number;
  empNo?: string;
  name: string;
  department: string;
  group: string;
  isActive: boolean;
  isManager: boolean;
  managerDepartments: string[];
  managerPermissions: string[];
  managerActivatedAt?: Date;
  user_auth?: {
    email: string;
    userType: string;
    isActive: boolean;
    lastLoginAt?: Date;
  };
  Contract?: {
    email: string;
  }[];
}

interface ManagerPermissionEditProps {
  staff: StaffMember;
  onSave: (staffId: number, permissions: ManagerPermissionUpdate) => void;
  onCancel: () => void;
}

interface ManagerPermissionUpdate {
  isManager: boolean;
  managerDepartments: string[];
  managerPermissions: string[];
  isSystemAdmin?: boolean; // システム管理者権限フラグ
}

// 権限編集モーダルコンポーネント
const ManagerPermissionEditModal: React.FC<ManagerPermissionEditProps> = ({
  staff,
  onSave,
  onCancel
}) => {
  const [isManager, setIsManager] = useState(staff.isManager);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(staff.managerDepartments || []);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(staff.managerPermissions || []);
  const [isSystemAdmin, setIsSystemAdmin] = useState(staff.user_auth?.userType === 'ADMIN');
  const [availableDepartments] = useState(['コールセンター', 'システム開発部', '営業部', '総務部']); // TODO: APIから取得

  const permissionOptions = [
    { value: 'READ', label: '閲覧', description: 'スケジュールの閲覧が可能' },
    { value: 'WRITE', label: '編集', description: 'スケジュールの編集が可能' },
    { value: 'APPROVE', label: '承認', description: 'Pending予定の承認が可能' },
    { value: 'DELETE', label: '削除', description: 'スケジュールの削除が可能' }
  ];

  const handleDepartmentToggle = (dept: string) => {
    if (selectedDepartments.includes(dept)) {
      setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
    } else {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };

  const handlePermissionToggle = (perm: string) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const handleSave = () => {
    onSave(staff.id, {
      isManager,
      managerDepartments: isManager ? selectedDepartments : [],
      managerPermissions: isManager ? selectedPermissions : [],
      isSystemAdmin
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            管理者権限編集: {staff.name}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">スタッフ情報</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">社員番号:</span> {staff.empNo || 'なし'}
              </div>
              <div>
                <span className="text-gray-600">部署:</span> {staff.department}
              </div>
              <div>
                <span className="text-gray-600">グループ:</span> {staff.group}
              </div>
              <div>
                <span className="text-gray-600">メール:</span> {staff.user_auth?.email || 
                 staff.Contract?.[0]?.email || 
                 'なし'}
              </div>
            </div>
          </div>

          {/* システム管理者権限設定 */}
          <div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="isSystemAdmin"
                checked={isSystemAdmin}
                onChange={(e) => setIsSystemAdmin(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="isSystemAdmin" className="ml-2 font-medium text-gray-900">
                システム管理者権限を付与する
              </label>
            </div>
            
            {isSystemAdmin && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">重要な権限です</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>システム全体の管理権限が付与されます</li>
                        <li>全スタッフの管理・権限変更が可能になります</li>
                        <li>認証アカウントが自動作成されます</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 部署管理者権限設定 */}
          <div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="isManager"
                checked={isManager}
                onChange={(e) => setIsManager(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isManager" className="ml-2 font-medium text-gray-900">
                部署管理者権限を付与する
              </label>
            </div>

            {isManager && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                {/* 管理対象部署 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">管理対象部署</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {availableDepartments.map((dept) => (
                      <label key={dept} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedDepartments.includes(dept)}
                          onChange={() => handleDepartmentToggle(dept)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm">{dept}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 権限レベル */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">権限レベル</h4>
                  <div className="space-y-2">
                    {permissionOptions.map((option) => (
                      <label key={option.value} className="flex items-start">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(option.value)}
                          onChange={() => handlePermissionToggle(option.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                        />
                        <div className="ml-2">
                          <div className="text-sm font-medium">{option.label}</div>
                          <div className="text-xs text-gray-600">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// メインコンポーネント
export default function StaffManagementPage() {
  const router = useRouter();
  const { user, isSystemAdmin, loading: authLoading } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterManagerOnly, setFilterManagerOnly] = useState(false);

  // システム管理者以外はアクセス拒否
  useEffect(() => {
    if (!authLoading && !isSystemAdmin()) {
      router.push('/');
      return;
    }
  }, [authLoading, isSystemAdmin, router]);

  // モックデータ（APIが動作しない場合の代替）
  const mockStaffData: StaffMember[] = [
    {
      id: 1,
      empNo: 'EMP001',
      name: 'テスト太郎',
      department: 'コールセンター',
      group: 'グループA',
      isActive: true,
      isManager: true,
      managerDepartments: ['コールセンター'],
      managerPermissions: ['READ', 'WRITE', 'APPROVE'],
      user_auth: {
        email: 'test.taro@example.com',
        userType: 'STAFF',
        isActive: true
      }
    },
    {
      id: 2,
      empNo: 'EMP002',
      name: 'テスト花子',
      department: 'システム開発部',
      group: 'グループB',
      isActive: true,
      isManager: false,
      managerDepartments: [],
      managerPermissions: [],
      user_auth: {
        email: 'test.hanako@example.com',
        userType: 'STAFF',
        isActive: true
      }
    }
  ].sort((a, b) => {
    // 部署 → グループ → 社員番号 → 名前の順でソート
    if (a.department !== b.department) return a.department.localeCompare(b.department);
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    if (a.empNo !== b.empNo) return (a.empNo || '').localeCompare(b.empNo || '');
    return a.name.localeCompare(b.name);
  });

  // スタッフ一覧取得
  const fetchStaffList = useCallback(async () => {
    setLoading(true);
    const apiUrl = getApiUrl();
    console.log('Staff Management - API URL:', apiUrl);
    console.log('Staff Management - Environment:', { 
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR'
    });
    
    try {
      const fullUrl = `${apiUrl}/api/staff/management`;
      console.log('Staff Management - Fetching from:', fullUrl);
      
      const response = await fetch(fullUrl);
      console.log('Staff Management - Response status:', response.status);
      console.log('Staff Management - Response headers:', [...response.headers.entries()]);
      
      const data = await response.json();
      console.log('Staff Management - Response data keys:', Object.keys(data));
      
      if (data.success) {
        setStaffList(data.data);
        console.log('Staff Management - Loaded', data.data.length, 'staff members');
      } else {
        console.error('API応答エラー:', data.error);
        setError(`API応答エラー: ${data.error}`);
        // フォールバックとしてモックデータを使用
        setStaffList(mockStaffData);
      }
      setLoading(false);
    } catch (error) {
      console.error('スタッフ一覧取得エラー:', error);
      setError(`取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      // フォールバックとしてモックデータを使用
      setStaffList(mockStaffData);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isSystemAdmin()) {
      fetchStaffList();
    }
  }, [authLoading, isSystemAdmin, fetchStaffList]);

  // 権限更新
  const handlePermissionUpdate = async (staffId: number, permissions: ManagerPermissionUpdate) => {
    try {
      // 部署管理者権限の更新
      if (permissions.isManager !== undefined) {
        const response = await fetch(`${getApiUrl()}/api/staff/${staffId}/manager-permissions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isManager: permissions.isManager,
            managerDepartments: permissions.managerDepartments,
            managerPermissions: permissions.managerPermissions,
            updatedBy: user?.name || 'システム'
          })
        });

        if (!response.ok) {
          throw new Error('部署管理者権限の更新に失敗しました');
        }
      }

      // システム管理者権限の更新
      if (permissions.isSystemAdmin !== undefined) {
        const response = await fetch(`${getApiUrl()}/api/staff/${staffId}/system-admin-permissions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isSystemAdmin: permissions.isSystemAdmin,
            updatedBy: user?.name || 'システム'
          })
        });

        if (!response.ok) {
          throw new Error('システム管理者権限の更新に失敗しました');
        }
      }

      // スタッフ一覧を再取得
      await fetchStaffList();
      
      setEditingStaff(null);
      alert('権限を更新しました');
    } catch (error) {
      console.error('権限更新エラー:', error);
      alert(`権限更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // フィルター適用
  const filteredStaff = staffList.filter(staff => {
    if (filterDepartment !== 'all' && staff.department !== filterDepartment) {
      return false;
    }
    if (filterManagerOnly && !staff.isManager) {
      return false;
    }
    return true;
  });

  const departments = Array.from(new Set(staffList.map(s => s.department)));

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  if (!isSystemAdmin()) {
    return null; // リダイレクト処理中
  }

  return (
    <AuthGuard requiredRole="SYSTEM_ADMIN">
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">管理者権限管理</h1>
              <p className="text-gray-600 mt-1">スタッフの管理者権限を設定・管理します</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              ← 戻る
            </button>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">部署</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">全部署</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="managerOnly"
                checked={filterManagerOnly}
                onChange={(e) => setFilterManagerOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="managerOnly" className="ml-2 text-sm text-gray-700">
                管理者のみ表示
              </label>
            </div>
            <div className="text-sm text-gray-500">
              {filteredStaff.length}件表示 / 全{staffList.length}件
            </div>
          </div>
        </div>

        {/* スタッフ一覧 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchStaffList}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              再試行
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    社員番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    スタッフ情報
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    部署・グループ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    管理者権限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    管理対象部署
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono text-gray-900">
                        {staff.empNo || 'なし'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{staff.name}</div>
                        <div className="text-sm text-gray-500">
                          {staff.user_auth?.email || 
                           staff.Contract?.[0]?.email || 
                           'メールなし'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {staff.department} / {staff.group}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {staff.user_auth?.userType === 'ADMIN' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            システム管理者
                          </span>
                        )}
                        {staff.isManager && (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              部署管理者
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {staff.managerPermissions.join(', ')}
                            </div>
                          </div>
                        )}
                        {!staff.isManager && staff.user_auth?.userType !== 'ADMIN' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            一般ユーザー
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {staff.managerDepartments.length > 0 ? staff.managerDepartments.join(', ') : 'なし'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setEditingStaff(staff)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        権限編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 権限編集モーダル */}
        {editingStaff && (
          <ManagerPermissionEditModal
            staff={editingStaff}
            onSave={handlePermissionUpdate}
            onCancel={() => setEditingStaff(null)}
          />
        )}
        </div>
      </div>
    </AuthGuard>
  );
}