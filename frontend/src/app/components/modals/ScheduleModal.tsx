'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Staff, Schedule } from '../types/MainAppTypes';
import { capitalizeStatus, ALL_STATUSES, formatDecimalTime, parseTimeString, LIGHT_ANIMATIONS } from '../timeline/TimelineUtils';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onSave: (data: any) => void;
  scheduleToEdit: Schedule | null;
  initialData?: Partial<Schedule>;
}

export const ScheduleModal = ({ isOpen, onClose, staffList, onSave, scheduleToEdit, initialData }: ScheduleModalProps) => {
  const isEditMode = !!scheduleToEdit;
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState('online');
  const [startTime, setStartTime] = useState('08:00'); // HH:MM形式
  const [endTime, setEndTime] = useState('09:00');     // HH:MM形式
  const [memo, setMemo] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  // 一般ユーザーの場合は自分のスタッフ情報のみに制限
  const filteredStaffList = useMemo(() => {
    // 認証コンテキストから現在のユーザー情報を取得
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // STAFFの場合は自分のスタッフ情報のみ表示
          if (user.role === 'STAFF' && user.staffId) {
            return staffList.filter(staff => staff.id === user.staffId);
          }
        } catch (error) {
          console.error('ユーザー情報の解析エラー:', error);
        }
      }
    }
    // ADMIN・SYSTEM_ADMINまたは認証情報がない場合は全スタッフ表示
    return staffList;
  }, [staffList]);
  
  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const data = scheduleToEdit || initialData;
    if (isOpen && data) {
        setStaffId(data.staffId?.toString() || '');
        setStatus(data.status || 'online');
        // 小数点時間をHH:MM形式に変換
        setStartTime(data.start ? formatDecimalTime(Number(data.start)) : '08:00');
        setEndTime(data.end ? formatDecimalTime(Number(data.end)) : '09:00');
        setMemo(data.memo || '');
    } else if (!isOpen) {
        setStaffId(''); setStatus('online'); setStartTime('08:00'); setEndTime('09:00'); setMemo('');
    }
  }, [scheduleToEdit, initialData, isOpen]);

  // 開始時刻変更時に終了時刻を自動調整（新規作成時のみ、ドラッグ作成は除く）
  useEffect(() => {
    if (!isEditMode && !initialData?.isDragCreated && startTime) {
      const start = parseTimeString(startTime);
      let newEndTime = start + 1; // 1時間後
      
      // 21時を超える場合は21時に調整
      if (newEndTime > 21) {
        newEndTime = 21;
      }
      
      setEndTime(formatDecimalTime(newEndTime));
    }
  }, [startTime, isEditMode, initialData?.isDragCreated]);

  if (!isOpen) return null;

  // サーバーサイドレンダリング時はポータルを作成しない
  if (!isClient) return null;

  const handleSave = () => {
    console.log('=== ScheduleModal handleSave ===', { staffId, startTime, endTime, status, memo });
    
    // HH:MM形式を小数点時間に変換
    const startDecimal = parseTimeString(startTime);
    const endDecimal = parseTimeString(endTime);
    
    if (!staffId || startDecimal >= endDecimal) { 
      console.error("入力内容が正しくありません。"); 
      alert("入力内容が正しくありません。スタッフを選択し、開始時刻が終了時刻より前になるように設定してください。");
      return; 
    }
    
    
    
    const scheduleData = { 
      staffId: parseInt(staffId), 
      status, 
      start: startDecimal, 
      end: endDecimal,
      memo: (status === 'meeting' || status === 'training') ? memo : undefined
    };
    console.log('Schedule data prepared:', scheduleData);
    
    onSave(isEditMode ? { ...scheduleData, id: scheduleToEdit.id } : scheduleData);
    onClose();
  };
  
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{isEditMode ? '予定を編集' : '予定を追加'}</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="staff" className="block text-sm font-medium text-gray-700">スタッフ</label>
            <select id="staff" value={staffId} onChange={e => setStaffId(e.target.value)} className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm ${LIGHT_ANIMATIONS.input}`} disabled={isEditMode}>
              <option value="" disabled>選択してください</option>
              {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">ステータス</label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)} className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm ${LIGHT_ANIMATIONS.input}`}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{capitalizeStatus(s)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700">開始時刻</label>
              <input 
                type="time" 
                id="start" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)} 
                min="08:00"
                max="21:00"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700">終了時刻</label>
              <input 
                type="time" 
                id="end" 
                value={endTime} 
                onChange={e => setEndTime(e.target.value)} 
                min="08:00"
                max="21:00"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
          {(status === 'meeting' || status === 'training') && (
            <div>
              <label htmlFor="memo" className="block text-sm font-medium text-gray-700">
                メモ ({status === 'meeting' ? '会議' : '研修'}内容)
              </label>
              <textarea
                id="memo"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                placeholder={status === 'meeting' ? '会議の内容を入力...' : '研修の内容を入力...'}
              />
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${LIGHT_ANIMATIONS.button}`}>キャンセル</button>
          <button type="button" onClick={handleSave} className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 border-transparent rounded-md hover:bg-indigo-700 ${LIGHT_ANIMATIONS.button}`}>保存</button>
        </div>
      </div>
    </div>,
    document.body
  );
};