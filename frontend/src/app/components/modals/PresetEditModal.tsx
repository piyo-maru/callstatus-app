// プリセット編集モーダルコンポーネント

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UnifiedPreset, PresetScheduleItem, PresetEditFormData } from '../types/PresetTypes';
import { PRESET_CATEGORIES } from '../constants/PresetSchedules';
import { AVAILABLE_STATUSES } from '../constants/MainAppConstants';
import { formatDecimalTime, parseTimeString } from '../timeline/TimelineUtils';

interface PresetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (presetData: PresetEditFormData) => void;
  preset?: UnifiedPreset | null; // nullの場合は新規作成
  mode: 'create' | 'edit' | 'duplicate';
}

interface ValidationError {
  field: string;
  message: string;
}

export function PresetEditModal({ isOpen, onClose, onSave, preset, mode }: PresetEditModalProps) {
  const [formData, setFormData] = useState<PresetEditFormData>({
    name: '',
    displayName: '',
    description: '',
    category: 'general',
    schedules: [],
    isActive: true,
    customizable: true
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォームデータの初期化
  useEffect(() => {
    if (isOpen) {
      if (preset && (mode === 'edit' || mode === 'duplicate')) {
        setFormData({
          name: mode === 'duplicate' ? `${preset.name}-copy` : preset.name,
          displayName: mode === 'duplicate' ? `${preset.displayName} (コピー)` : preset.displayName,
          description: preset.description || '',
          category: preset.category,
          schedules: [...preset.schedules],
          isActive: preset.isActive,
          customizable: true // 編集時は常にカスタマイズ可能
        });
      } else {
        // 新規作成時のデフォルト値
        setFormData({
          name: '',
          displayName: '',
          description: '',
          category: 'general',
          schedules: [
            {
              status: 'online',
              startTime: 9,
              endTime: 18,
              memo: ''
            }
          ],
          isActive: true,
          customizable: true
        });
      }
      setErrors([]);
    }
  }, [isOpen, preset, mode]);

  // バリデーション
  const validateForm = useCallback((): ValidationError[] => {
    const newErrors: ValidationError[] = [];

    // 必須項目チェック
    if (!formData.displayName.trim()) {
      newErrors.push({ field: 'displayName', message: '表示名は必須です' });
    }

    if (formData.schedules.length === 0) {
      newErrors.push({ field: 'schedules', message: '少なくとも1つのスケジュールが必要です' });
    }

    // スケジュールの妥当性チェック
    formData.schedules.forEach((schedule, index) => {
      if (schedule.startTime >= schedule.endTime) {
        newErrors.push({ 
          field: `schedule-${index}`, 
          message: `スケジュール${index + 1}: 開始時間は終了時間より前である必要があります` 
        });
      }

      if (schedule.startTime < 8 || schedule.endTime > 21) {
        newErrors.push({ 
          field: `schedule-${index}`, 
          message: `スケジュール${index + 1}: 時間は8:00-21:00の範囲内で設定してください` 
        });
      }
    });

    // 時間重複チェック
    for (let i = 0; i < formData.schedules.length; i++) {
      for (let j = i + 1; j < formData.schedules.length; j++) {
        const schedule1 = formData.schedules[i];
        const schedule2 = formData.schedules[j];
        
        if (
          (schedule1.startTime < schedule2.endTime && schedule1.endTime > schedule2.startTime) ||
          (schedule2.startTime < schedule1.endTime && schedule2.endTime > schedule1.startTime)
        ) {
          newErrors.push({ 
            field: 'schedules', 
            message: `スケジュール${i + 1}と${j + 1}の時間が重複しています` 
          });
        }
      }
    }

    return newErrors;
  }, [formData]);

  // フォーム送信
  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('プリセット保存エラー:', error);
      setErrors([{ field: 'form', message: '保存に失敗しました' }]);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSave, onClose]);

  // スケジュール項目の追加
  const addSchedule = useCallback(() => {
    const lastSchedule = formData.schedules[formData.schedules.length - 1];
    const newStartTime = lastSchedule ? lastSchedule.endTime : 9;
    const newEndTime = Math.min(newStartTime + 1, 21);

    setFormData(prev => ({
      ...prev,
      schedules: [
        ...prev.schedules,
        {
          status: 'online',
          startTime: newStartTime,
          endTime: newEndTime,
          memo: ''
        }
      ]
    }));
  }, [formData.schedules]);

  // スケジュール項目の削除
  const removeSchedule = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }));
  }, []);

  // スケジュール項目の更新
  const updateSchedule = useCallback((index: number, updates: Partial<PresetScheduleItem>) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.map((schedule, i) => 
        i === index ? { ...schedule, ...updates } : schedule
      )
    }));
  }, []);

  // エラーメッセージ取得
  const getFieldError = useCallback((field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  }, [errors]);

  // モーダルタイトル
  const getModalTitle = () => {
    switch (mode) {
      case 'create':
        return '新しいプリセット作成';
      case 'duplicate':
        return 'プリセット複製';
      default:
        return 'プリセット編集';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フォームコンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    getFieldError('displayName') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="プリセットの表示名"
                />
                {getFieldError('displayName') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('displayName')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRESET_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="プリセットの説明（オプション）"
              />
            </div>

            {/* スケジュール設定 */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">スケジュール設定</h3>
                <button
                  type="button"
                  onClick={addSchedule}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  + 時間帯追加
                </button>
              </div>

              {getFieldError('schedules') && (
                <p className="mb-4 text-sm text-red-600">{getFieldError('schedules')}</p>
              )}

              <div className="space-y-4">
                {formData.schedules.map((schedule, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900">時間帯 {index + 1}</h4>
                      {formData.schedules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSchedule(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          削除
                        </button>
                      )}
                    </div>

                    {getFieldError(`schedule-${index}`) && (
                      <p className="mb-3 text-sm text-red-600">{getFieldError(`schedule-${index}`)}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ステータス
                        </label>
                        <select
                          value={schedule.status}
                          onChange={(e) => updateSchedule(index, { status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {AVAILABLE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          開始時間
                        </label>
                        <input
                          type="time"
                          value={formatDecimalTime(schedule.startTime)}
                          onChange={(e) => updateSchedule(index, { startTime: parseTimeString(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          終了時間
                        </label>
                        <input
                          type="time"
                          value={formatDecimalTime(schedule.endTime)}
                          onChange={(e) => updateSchedule(index, { endTime: parseTimeString(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          メモ
                        </label>
                        <input
                          type="text"
                          value={schedule.memo || ''}
                          onChange={(e) => updateSchedule(index, { memo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="メモ（オプション）"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* その他の設定 */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  プリセットを有効にする
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {errors.length > 0 && (
              <span className="text-red-600">⚠️ {errors.length}個のエラーがあります</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}