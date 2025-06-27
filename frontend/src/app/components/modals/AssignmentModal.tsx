'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import "react-datepicker/dist/react-datepicker.css";
import { Staff } from '../types/MainAppTypes';

// 日本語ロケール設定
registerLocale('ja', ja);

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  staffList: Staff[];
  onSave: (data: {
    staffId: number;
    startDate: string;
    endDate: string;
    department: string;
    group: string;
  }) => void;
  onDelete?: (staffId: number) => void;
}

export const AssignmentModal = ({ isOpen, onClose, staff, staffList, onSave, onDelete }: AssignmentModalProps) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [department, setDepartment] = useState('');
  const [group, setGroup] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // クライアントサイドでのみ日付を初期化
    setStartDate(new Date());
    setEndDate(new Date());
  }, []);

  // 既存の支援設定がある場合は初期値として設定
  useEffect(() => {
    if (isOpen && staff) {
      if (staff.supportInfo) {
        setStartDate(new Date(staff.supportInfo.startDate));
        setEndDate(new Date(staff.supportInfo.endDate));
        setDepartment(staff.currentDept || '');
        setGroup(staff.currentGroup || '');
      } else {
        // 新規の場合は今日から開始
        const today = new Date();
        setStartDate(today);
        setEndDate(today);
        setDepartment('');
        setGroup('');
      }
    } else if (!isOpen) {
      setStartDate(null);
      setEndDate(null);
      setDepartment('');
      setGroup('');
    }
  }, [isOpen, staff]);

  // 利用可能な部署とグループを取得（「受付」を含むものは除外）
  const availableDepartments = useMemo(() => {
    return Array.from(new Set(staffList.map(s => s.department)))
      .filter(dept => !dept.includes('受付'));
  }, [staffList]);

  const availableGroups = useMemo(() => {
    if (!department) return [];
    return Array.from(new Set(staffList.filter(s => s.department === department).map(s => s.group)))
      .filter(group => !group.includes('受付'));
  }, [staffList, department]);

  // 部署が変更されたらグループをリセット
  useEffect(() => {
    if (department && !availableGroups.includes(group)) {
      setGroup('');
    }
  }, [department, availableGroups, group]);

  if (!isOpen || !staff) return null;

  // サーバーサイドレンダリング時はポータルを作成しない
  if (!isClient) return null;

  const handleSave = () => {
    if (!startDate || !endDate || !department || !group) {
      alert('すべての項目を入力してください。');
      return;
    }

    if (startDate > endDate) {
      alert('開始日は終了日より前の日付を選択してください。');
      return;
    }

    onSave({
      staffId: staff.id,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      department,
      group
    });
    onClose();
  };

  const handleDelete = () => {
    if (staff && onDelete) {
      if (confirm(`${staff.name}さんの支援設定を削除しますか？`)) {
        onDelete(staff.id);
        onClose();
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9997] flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {staff?.name}さんの支援設定
        </h3>
        
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">支援期間</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500">開始日</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  locale="ja"
                  dateFormat="yyyy/MM/dd"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholderText="開始日を選択"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">終了日</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  locale="ja"
                  dateFormat="yyyy/MM/dd"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholderText="終了日を選択"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">支援先部署</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">部署を選択してください</option>
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">支援先グループ</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              disabled={!department}
            >
              <option value="">グループを選択してください</option>
              {availableGroups.map(grp => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          {staff?.supportInfo && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              削除
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};