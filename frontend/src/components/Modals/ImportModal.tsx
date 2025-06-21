import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ImportResult } from '@/types';
import { getApiEndpoint } from '@/utils/api';

type ImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const response = await fetch(getApiEndpoint('/api/staff/sync-from-json-body'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData)
      });

      const resultData = await response.json();
      setResult(resultData);

      if (response.ok) {
        onSuccess(); // スタッフデータを再取得
      }

    } catch (error: any) {
      setResult({
        added: 0,
        updated: 0,
        deleted: 0,
        details: { added: [], updated: [], deleted: [] },
        error: true,
        message: error.message || 'ファイルの処理に失敗しました'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="社員情報インポート" maxWidth="lg">
      <div className="space-y-4">
        {/* ファイルアップロード */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {isUploading && (
            <div className="mt-4 text-blue-600 flex items-center justify-center">
              <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent rounded-full mr-2"></div>
              インポート中...
            </div>
          )}
        </div>

        {/* 結果表示 */}
        {result && (
          <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <h3 className={`font-semibold mb-2 ${result.error ? 'text-red-800' : 'text-green-800'}`}>
              {result.error ? '❌ エラー' : '✅ インポート完了'}
            </h3>
            
            {result.error ? (
              <div className="text-red-700">
                <p>{result.message}</p>
              </div>
            ) : (
              <div className="text-green-700">
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="font-medium">追加:</span> {result.added}人
                  </div>
                  <div>
                    <span className="font-medium">更新:</span> {result.updated}人
                  </div>
                  <div>
                    <span className="font-medium">削除:</span> {result.deleted}人
                  </div>
                </div>
                
                {(result.details?.added?.length > 0 || result.details?.updated?.length > 0 || result.details?.deleted?.length > 0) && (
                  <div className="text-sm space-y-2">
                    {result.details.added?.length > 0 && (
                      <div>
                        <span className="font-medium">追加されたスタッフ:</span>
                        <div className="ml-4 text-xs">{result.details.added.slice(0, 10).join(', ')}{result.details.added.length > 10 ? ` 他${result.details.added.length - 10}人` : ''}</div>
                      </div>
                    )}
                    {result.details.updated?.length > 0 && (
                      <div>
                        <span className="font-medium">更新されたスタッフ:</span>
                        <div className="ml-4 text-xs">{result.details.updated.slice(0, 10).join(', ')}{result.details.updated.length > 10 ? ` 他${result.details.updated.length - 10}人` : ''}</div>
                      </div>
                    )}
                    {result.details.deleted?.length > 0 && (
                      <div>
                        <span className="font-medium">削除されたスタッフ:</span>
                        <div className="ml-4 text-xs">{result.details.deleted.slice(0, 10).join(', ')}{result.details.deleted.length > 10 ? ` 他${result.details.deleted.length - 10}人` : ''}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* フォーマット説明 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">インポート形式</h3>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`{
  "employeeData": [
    {
      "empNo": "1001",
      "name": "田中一郎",
      "dept": "システム開発部",
      "team": "基盤開発チーム",
      "email": "tanaka@example.com",
      "mondayHours": "09:00-18:00",
      "tuesdayHours": "09:00-18:00",
      ...
    }
  ]
}`}
          </pre>
        </div>

        {/* ボタン */}
        <div className="flex gap-2 pt-4">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            閉じる
          </Button>
        </div>
      </div>
    </Modal>
  );
};