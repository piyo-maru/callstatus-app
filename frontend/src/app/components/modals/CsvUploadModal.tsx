'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isOpen) return null;

  // サーバーサイドレンダリング時はポータルを作成しない
  if (!isClient) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv') || file.type === 'text/csv');
    if (csvFile) {
      setSelectedFile(csvFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert('ファイルを選択してください。');
      return;
    }

    onUpload(selectedFile);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">スケジュールインポート（CSV）</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            指定フォーマットのCSVファイルをアップロードしてスケジュールデータを一括投入します。
          </p>
          <p className="text-xs text-gray-500 mb-3">
            フォーマット: 日付,社員名,ステータス,開始時刻,終了時刻,メモ
          </p>
        </div>

        <div 
          className={`mb-4 border-2 border-dashed rounded-lg p-8 text-center ${
            isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">サイズ: {(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                CSVファイルをドラッグ&ドロップするか、クリックして選択
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csvFile"
              />
              <label
                htmlFor="csvFile"
                className="inline-block px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 cursor-pointer"
              >
                ファイルを選択
              </label>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>注意:</strong> アップロードにより、既存のスケジュールデータが更新される場合があります。
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300"
          >
            キャンセル
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              selectedFile 
                ? 'bg-gray-700 hover:bg-gray-800' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            インポート実行
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};