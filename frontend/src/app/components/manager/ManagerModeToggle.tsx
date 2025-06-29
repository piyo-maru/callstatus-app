'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthProvider';

interface ManagerModeToggleProps {
  // 既存のフィルター状態と連携
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  selectedGroup: string;
  setSelectedGroup: (group: string) => void;
  // 管理者モードの状態
  isManagerMode: boolean;
  setIsManagerMode: (mode: boolean) => void;
  // 利用可能な部署・グループ選択肢
  departmentOptions: Array<{ value: string; label: string }>;
  groupOptions: Array<{ value: string; label: string }>;
}

export const ManagerModeToggle: React.FC<ManagerModeToggleProps> = ({
  selectedDepartment,
  setSelectedDepartment,
  selectedGroup,
  setSelectedGroup,
  isManagerMode,
  setIsManagerMode,
  departmentOptions,
  groupOptions,
}) => {
  const { user, canManageDepartment, getAvailableDepartments } = useAuth();
  
  // 管理者権限がない場合は何も表示しない
  if (!user?.isManager && user?.role !== 'ADMIN' && user?.role !== 'SYSTEM_ADMIN') {
    return null;
  }

  // 管理可能な部署のオプションを取得
  const availableDepartments = getAvailableDepartments();
  const manageDepartmentOptions = availableDepartments.length === 0 
    ? departmentOptions // 全部署管理可能
    : departmentOptions.filter(opt => 
        opt.value === 'all' || availableDepartments.includes(opt.value)
      );

  // 管理者モード切り替え時の処理
  const handleManagerModeToggle = (enabled: boolean) => {
    setIsManagerMode(enabled);
    
    if (enabled) {
      // 管理者モード有効時は管理対象部署で自動フィルター
      if (availableDepartments.length > 0) {
        // 管理対象部署が限定されている場合、最初の部署を選択
        const firstManagedDept = availableDepartments[0];
        if (selectedDepartment === 'all' || !availableDepartments.includes(selectedDepartment)) {
          setSelectedDepartment(firstManagedDept);
        }
      }
      // グループフィルターはリセット
      setSelectedGroup('all');
    }
  };

  // 部署変更時の管理権限チェック
  const handleDepartmentChange = (dept: string) => {
    if (isManagerMode && dept !== 'all' && !canManageDepartment(dept)) {
      // 管理権限のない部署は選択不可
      return;
    }
    setSelectedDepartment(dept);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="manager-mode"
              checked={isManagerMode}
              onChange={(e) => handleManagerModeToggle(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="manager-mode"
              className="ml-2 text-sm font-medium text-blue-800"
            >
              管理者モード
            </label>
          </div>
          {isManagerMode && (
            <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded">
              有効
            </span>
          )}
        </div>
        {user?.isManager && user.managerDepartments && (
          <div className="text-xs text-blue-600">
            管理部署: {user.managerDepartments.join(', ')}
          </div>
        )}
      </div>
      
      {isManagerMode && (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-blue-700">管理対象:</span>
          <select
            value={selectedDepartment}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="px-2 py-1 border border-blue-300 rounded text-blue-800 bg-white"
            disabled={manageDepartmentOptions.length <= 1}
          >
            {manageDepartmentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {selectedDepartment !== 'all' && (
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-2 py-1 border border-blue-300 rounded text-blue-800 bg-white"
            >
              {groupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      
      {isManagerMode && (
        <div className="mt-2 text-xs text-blue-600">
          💡 管理者モードでは選択部署のスタッフの予定を編集・承認できます
        </div>
      )}
    </div>
  );
};