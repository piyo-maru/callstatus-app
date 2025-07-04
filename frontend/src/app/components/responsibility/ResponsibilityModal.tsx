'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import type { 
  ResponsibilityModalProps, 
  ResponsibilityData, 
  GeneralResponsibilityData, 
  ReceptionResponsibilityData 
} from '../../types/responsibility';
import { isReceptionStaff } from '../../utils/responsibilityUtils';

/**
 * 統一担当設定モーダルコンポーネント
 * 月次プランナーの最優秀実装をベースに全ページで使用
 */
export const ResponsibilityModal: React.FC<ResponsibilityModalProps> = ({
  isOpen,
  onClose,
  staff,
  selectedDate,
  onSave,
  existingData
}) => {
  // 部署判定（受付が含まれるかどうか）
  const isReception = isReceptionStaff(staff);
  
  // 一般部署用state
  const [fax, setFax] = useState(false);
  const [subjectCheck, setSubjectCheck] = useState(false);
  const [custom, setCustom] = useState('');
  
  // 受付部署用state
  const [lunch, setLunch] = useState(false);
  const [cs, setCs] = useState(false);
  
  // 既存データの読み込み（月次プランナーと同じロジック）
  useEffect(() => {
    if (isOpen && existingData) {
      console.log('既存担当設定データを読み込み:', existingData);
      
      if (isReception && 'lunch' in existingData) {
        // 受付部署用データの読み込み
        const r = existingData as ReceptionResponsibilityData;
        setLunch(r.lunch || false);
        setFax(r.fax || false);
        setCs(r.cs || false);
        setCustom(r.custom || '');
      } else if (!isReception && 'subjectCheck' in existingData) {
        // 一般部署用データの読み込み
        const r = existingData as GeneralResponsibilityData;
        setFax(r.fax || false);
        setSubjectCheck(r.subjectCheck || false);
        setCustom(r.custom || '');
      } else {
        // 型が合わない場合は基本フィールドのみ読み込み
        setFax(existingData.fax || false);
        setCustom(existingData.custom || '');
        if (isReception) {
          setLunch(false);
          setCs(false);
        } else {
          setSubjectCheck(false);
        }
      }
    } else if (isOpen && !existingData) {
      // 既存データがない場合は初期化
      console.log('既存担当設定データなし - 初期値を設定');
      setFax(false);
      setSubjectCheck(false);
      setLunch(false);
      setCs(false);
      setCustom('');
    }
  }, [isOpen, existingData, isReception]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let responsibilityData: ResponsibilityData;
    
    if (isReception) {
      responsibilityData = {
        lunch,
        fax,
        cs,
        custom
      } as ReceptionResponsibilityData;
    } else {
      responsibilityData = {
        fax,
        subjectCheck,
        custom
      } as GeneralResponsibilityData;
    }
    
    onSave(responsibilityData);
    onClose();
  };

  const handleClear = () => {
    if (confirm(`${staff.name}の担当設定をクリアしますか？`)) {
      let responsibilityData: ResponsibilityData;
      
      if (isReception) {
        responsibilityData = {
          lunch: false,
          fax: false,
          cs: false,
          custom: ''
        } as ReceptionResponsibilityData;
      } else {
        responsibilityData = {
          fax: false,
          subjectCheck: false,
          custom: ''
        } as GeneralResponsibilityData;
      }
      
      onSave(responsibilityData);
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          担当設定 - {format(selectedDate, 'M月d日(E)', { locale: ja })}
        </h2>
        
        <div className="mb-4 p-3 bg-blue-50 rounded border">
          <div className="text-sm text-blue-800">
            <strong>担当者:</strong> {staff.name} ({staff.department})
            {isReception && (
              <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded">受付部署</span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            {isReception ? (
              // 受付部署用UI
              <>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={lunch}
                    onChange={(e) => setLunch(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">🍽️ 昼当番</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={fax}
                    onChange={(e) => setFax(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">📠 FAX当番</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={cs}
                    onChange={(e) => setCs(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">☎️ CS担当</span>
                </label>
              </>
            ) : (
              // 一般部署用UI
              <>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={fax}
                    onChange={(e) => setFax(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">📠 FAX当番</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={subjectCheck}
                    onChange={(e) => setSubjectCheck(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">📝 件名チェック担当</span>
                </label>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                その他の担当業務
              </label>
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="その他の担当業務があれば入力してください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>
        
        {/* ボタンエリア（出社状況モーダルと同じレイアウト） */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between">
          {/* クリアボタン（左側） */}
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            クリア
          </button>
          
          {/* キャンセル・保存ボタン（右側） */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as any);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};