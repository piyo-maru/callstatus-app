import React from 'react';
import { Staff, STATUS_COLORS } from '@/types';

type FilterBarProps = {
  staff: Staff[];
  filters: {
    department: string;
    group: string;
    status: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
};

export const FilterBar: React.FC<FilterBarProps> = ({
  staff,
  filters,
  onFilterChange,
  onClearFilters
}) => {
  // ユニークな部署リストを取得
  const departments = Array.from(new Set(staff.map(s => s.department))).sort();
  
  // ユニークなグループリストを取得（選択された部署に基づく）
  const groups = Array.from(new Set(
    staff
      .filter(s => !filters.department || s.department === filters.department)
      .map(s => s.group)
  )).sort();

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="bg-white border-b p-4 space-y-3">
      {/* 検索とクリアボタン */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="スタッフ名で検索..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            フィルターをクリア
          </button>
        )}
      </div>

      {/* フィルターオプション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 部署フィルター */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">部署</label>
          <select
            value={filters.department}
            onChange={(e) => onFilterChange('department', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">すべての部署</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* グループフィルター */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">グループ</label>
          <select
            value={filters.group}
            onChange={(e) => onFilterChange('group', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            disabled={!filters.department}
          >
            <option value="">すべてのグループ</option>
            {groups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        {/* ステータスフィルター */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">ステータス</label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">すべてのステータス</option>
            {Object.entries(STATUS_COLORS).map(([status, colorClass]) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* アクティブフィルター表示 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              <span>検索: "{filters.search}"</span>
              <button
                onClick={() => onFilterChange('search', '')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </div>
          )}
          {filters.department && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
              <span>部署: {filters.department}</span>
              <button
                onClick={() => onFilterChange('department', '')}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </div>
          )}
          {filters.group && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
              <span>グループ: {filters.group}</span>
              <button
                onClick={() => onFilterChange('group', '')}
                className="ml-1 text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </div>
          )}
          {filters.status && (
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
              <span>ステータス: {filters.status}</span>
              <button
                onClick={() => onFilterChange('status', '')}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};