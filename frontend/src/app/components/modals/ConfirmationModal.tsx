'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }: ConfirmationModalProps) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => { 
    setIsClient(true); 
  }, []);
  
  if (!isOpen) return null;

  // サーバーサイドレンダリング時はポータルを作成しない
  if (!isClient) return null;
  
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
        <h3 className="text-lg font-medium leading-6 text-gray-900">確認</h3>
        <div className="mt-2">
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            削除
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};