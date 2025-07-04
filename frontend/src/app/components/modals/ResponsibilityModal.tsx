'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Staff, ResponsibilityData, GeneralResponsibilityData, ReceptionResponsibilityData } from '../types/MainAppTypes';

interface ResponsibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  onSave: (data: { staffId: number; responsibilities: ResponsibilityData }) => void;
}

export const ResponsibilityModal: React.FC<ResponsibilityModalProps> = ({ isOpen, onClose, staff, onSave }) => {
  const [isClient, setIsClient] = useState(false);
  
  // 一般部署用のstate
  const [fax, setFax] = useState(false);
  const [subjectCheck, setSubjectCheck] = useState(false);
  const [custom, setCustom] = useState('');
  
  // 受付部署用のstate
  const [lunch, setLunch] = useState(false);
  const [cs, setCs] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (isOpen && staff) {
      // 既存の担当設定があれば読み込み
      if (staff.responsibilities) {
        if (staff.isReception) {
          const r = staff.responsibilities as ReceptionResponsibilityData;
          setLunch(r.lunch || false);
          setFax(r.fax || false);
          setCs(r.cs || false);
          setCustom(r.custom || '');
        } else {
          const r = staff.responsibilities as GeneralResponsibilityData;
          setFax(r.fax || false);
          setSubjectCheck(r.subjectCheck || false);
          setCustom(r.custom || '');
        }
      } else {
        // 新規設定の場合は全て初期化
        setLunch(false);
        setFax(false);
        setCs(false);
        setSubjectCheck(false);
        setCustom('');
      }
    } else if (!isOpen) {
      // モーダルが閉じられた時は全て初期化
      setLunch(false);
      setFax(false);
      setCs(false);
      setSubjectCheck(false);
      setCustom('');
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  // サーバーサイドレンダリング時はポータルを作成しない
  if (!isClient) return null;

  const handleSave = () => {
    const responsibilities: ResponsibilityData = staff.isReception 
      ? { lunch, fax, cs, custom }
      : { fax, subjectCheck, custom };

    onSave({
      staffId: staff.id,
      responsibilities
    });
    onClose();
  };

  const handleClear = () => {
    if (confirm(`${staff.name}の担当設定をクリアしますか？`)) {
      const responsibilities: ResponsibilityData = staff.isReception 
        ? { lunch: false, fax: false, cs: false, custom: '' }
        : { fax: false, subjectCheck: false, custom: '' };

      onSave({
        staffId: staff.id,
        responsibilities
      });
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            担当設定 - {staff.name}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {staff.department} / {staff.group}
          </p>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          {staff.isReception ? (
            // 受付部署用
            <>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="lunch"
                  checked={lunch}
                  onChange={(e) => setLunch(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="lunch" className="ml-2 text-sm font-medium text-gray-700">
                  昼当番
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fax"
                  checked={fax}
                  onChange={(e) => setFax(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="fax" className="ml-2 text-sm font-medium text-gray-700">
                  FAX当番
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="cs"
                  checked={cs}
                  onChange={(e) => setCs(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="cs" className="ml-2 text-sm font-medium text-gray-700">
                  CS担当
                </label>
              </div>
            </>
          ) : (
            // 一般部署用
            <>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fax"
                  checked={fax}
                  onChange={(e) => setFax(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="fax" className="ml-2 text-sm font-medium text-gray-700">
                  FAX当番
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="subjectCheck"
                  checked={subjectCheck}
                  onChange={(e) => setSubjectCheck(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="subjectCheck" className="ml-2 text-sm font-medium text-gray-700">
                  件名チェック担当
                </label>
              </div>
            </>
          )}
          
          {/* その他の担当業務 */}
          <div>
            <label htmlFor="custom" className="block text-sm font-medium text-gray-700 mb-1">
              その他の担当業務
            </label>
            <textarea
              id="custom"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="その他の担当業務があれば入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        </div>
        
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
              onClick={handleSave}
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