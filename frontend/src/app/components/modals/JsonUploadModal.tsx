'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface JsonUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}

export const JsonUploadModal: React.FC<JsonUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isOpen) return null;

  // サーバーサイドレンダリング時はポータルを作成しない
  if (!isClient) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    } else {
      alert('JSONファイルを選択してください');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert('ファイルを選択してください');
      return;
    }

    if (selectedFile.type !== 'application/json') {
      alert('JSONファイルを選択してください');
      return;
    }

    onUpload(selectedFile);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">スタッフデータ同期（JSON）</h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            指定フォーマットのJSONファイルをアップロードして社員情報を一括投入します。
          </p>
          <p className="text-xs text-gray-500 mb-3">
            フォーマット：{"{"} "employeeData": [{"{"} "name": "名前", "dept": "部署", "team": "グループ" {"}"}] {"}"}
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
                JSONファイルをドラッグ&ドロップするか、クリックして選択
              </p>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                id="jsonFile"
              />
              <label
                htmlFor="jsonFile"
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
              <strong>注意:</strong> アップロードにより、既存のスタッフデータが更新・削除される場合があります。
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
                ? 'bg-indigo-600 hover:bg-indigo-700' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            同期実行
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};