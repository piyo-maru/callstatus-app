import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Staff, Schedule, STATUS_COLORS } from '@/types';

type ScheduleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Partial<Schedule>) => Promise<void>;
  schedule?: Schedule; // 編集の場合は既存スケジュール
  staff: Staff[];
  selectedStaffId?: number;
  selectedTime?: string;
  selectedDate: string;
};

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schedule,
  staff,
  selectedStaffId,
  selectedTime,
  selectedDate
}) => {
  const [formData, setFormData] = useState({
    staffId: selectedStaffId || schedule?.staffId || 0,
    status: schedule?.status || 'Online',
    startTime: '',
    endTime: '',
    memo: schedule?.memo || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときの初期化
  useEffect(() => {
    if (isOpen) {
      if (schedule) {
        // 編集モード
        const startTime = new Date(schedule.start).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const endTime = new Date(schedule.end).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        setFormData({
          staffId: schedule.staffId,
          status: schedule.status,
          startTime,
          endTime,
          memo: schedule.memo || ''
        });
      } else if (selectedTime) {
        // 新規作成モード（時間指定）
        const endTime = addMinutes(selectedTime, 60); // デフォルト1時間
        setFormData(prev => ({
          ...prev,
          staffId: selectedStaffId || 0,
          startTime: selectedTime,
          endTime
        }));
      }
      setError(null);
    }
  }, [isOpen, schedule, selectedTime, selectedStaffId]);

  // 時間に分を追加するヘルパー関数
  const addMinutes = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.staffId || !formData.startTime || !formData.endTime) {
      setError('必須項目を入力してください');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      setError('終了時刻は開始時刻より後に設定してください');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 日時文字列を構築
      const startDateTime = `${selectedDate}T${formData.startTime}:00`;
      const endDateTime = `${selectedDate}T${formData.endTime}:00`;

      const scheduleData: Partial<Schedule> = {
        staffId: formData.staffId,
        status: formData.status,
        start: startDateTime,
        end: endDateTime,
        memo: formData.memo || null
      };

      if (schedule) {
        scheduleData.id = schedule.id;
      }

      await onSave(scheduleData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'スケジュールの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      staffId: 0,
      status: 'Online',
      startTime: '',
      endTime: '',
      memo: ''
    });
    setError(null);
    onClose();
  };

  const selectedStaff = staff.find(s => s.id === formData.staffId);
  const isEditMode = !!schedule;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isEditMode ? 'スケジュール編集' : '新規スケジュール作成'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* スタッフ選択 */}
        <div>
          <label className="block text-sm font-medium mb-2">スタッフ *</label>
          <select
            value={formData.staffId}
            onChange={(e) => setFormData(prev => ({ ...prev, staffId: Number(e.target.value) }))}
            className="w-full p-2 border border-gray-300 rounded-lg"
            required
          >
            <option value={0}>スタッフを選択してください</option>
            {staff.map(person => (
              <option key={person.id} value={person.id}>
                {person.name} ({person.department} - {person.group})
              </option>
            ))}
          </select>
        </div>

        {/* 選択されたスタッフ情報 */}
        {selectedStaff && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm">
              <div className="font-medium">{selectedStaff.name}</div>
              <div className="text-gray-600">{selectedStaff.department}</div>
              <div className="text-gray-500">{selectedStaff.group}</div>
            </div>
          </div>
        )}

        {/* 日付表示 */}
        <div>
          <label className="block text-sm font-medium mb-2">日付</label>
          <div className="p-2 bg-gray-50 rounded-lg text-sm">
            {selectedDate}
          </div>
        </div>

        {/* 時間設定 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">開始時刻 *</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
              min="08:00"
              max="21:00"
              step="900" // 15分間隔
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">終了時刻 *</label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
              min="08:00"
              max="21:00"
              step="900" // 15分間隔
              required
            />
          </div>
        </div>

        {/* ステータス選択 */}
        <div>
          <label className="block text-sm font-medium mb-2">ステータス *</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_COLORS).map(([status, colorClass]) => (
              <button
                key={status}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status }))}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.status === status
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${colorClass} rounded`}></div>
                  {status}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* メモ */}
        <div>
          <label className="block text-sm font-medium mb-2">メモ</label>
          <textarea
            value={formData.memo}
            onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="会議内容、研修名など..."
          />
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <div className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent rounded-full mr-2"></div>
                保存中...
              </>
            ) : (
              isEditMode ? '更新' : '作成'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};