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
  const [importId, setImportId] = useState<string>('')
  const [logs, setLogs] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }


  // ポーリングで完了をチェックする関数
  const startPollingForCompletion = (initialCount: number) => {
    let pollCount = 0;
    const maxPolls = 60; // 最大60回（約5分）
    
    const checkCompletion = async () => {
      try {
        pollCount++;
        addLog(`🔍 処理状況確認中... (${pollCount}/${maxPolls})`)
        
        // スタッフ数をチェック
        const response = await fetch(getApiEndpoint('/api/staff'));
        const data = await response.json();
        const currentStaffCount = data.data?.length || 0;
        
        if (currentStaffCount > initialCount) {
          // データが増えていれば完了と判断
          const addedCount = currentStaffCount - initialCount;
          addLog(`✅ インポート完了！ ${addedCount}名追加されました`)
          setResult({
            added: addedCount,
            updated: 0,
            deleted: 0,
            details: { added: [], updated: [], deleted: [] },
            error: false,
            message: `${addedCount}名のスタッフが正常にインポートされました`
          })
          setIsUploading(false)
          onSuccess() // データ再取得
        } else if (pollCount >= maxPolls) {
          // タイムアウト
          addLog(`⏰ タイムアウト：処理は継続中の可能性があります`)
          setIsUploading(false)
          onSuccess() // 念のためデータ再取得
        } else {
          // 5秒後に再チェック
          setTimeout(checkCompletion, 5000)
        }
      } catch (error) {
        console.error('Polling error:', error)
        if (pollCount >= maxPolls) {
          addLog(`❌ 処理状況確認に失敗しました`)
          setIsUploading(false)
        } else {
          setTimeout(checkCompletion, 5000)
        }
      }
    }
    
    setTimeout(checkCompletion, 5000) // 最初は5秒後にチェック
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);
    setLogs([]);

    try {
      // 開始前のスタッフ数を取得
      addLog(`🔍 現在のスタッフ数を確認中...`)
      const initialResponse = await fetch(getApiEndpoint('/api/staff'));
      const initialData = await initialResponse.json();
      const initialStaffCount = initialData.data?.length || 0;
      addLog(`📊 現在のスタッフ数: ${initialStaffCount}名`)
      
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const employeeCount = Array.isArray(jsonData) ? jsonData.length : Object.keys(jsonData).length;
      addLog(`👥 インポート予定数: ${employeeCount}名`)

      // 新しいチャンク処理APIを使用
      addLog(`🚀 インポート開始...`)
      const response = await fetch(getApiEndpoint('/api/staff/sync-from-json-body-chunked'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData)
      });

      const result = await response.json();
      console.log('Import API response:', result);
      
      if (result.success) {
        setImportId(result.importId)
        addLog(`📡 API呼び出し成功: ${result.message}`)
        addLog(`🆔 インポートID: ${result.importId}`)
        
        // 定期チェックで完了を確認
        addLog(`⏳ インポート処理中...`)
        startPollingForCompletion(initialStaffCount)
      } else {
        addLog(`❌ API呼び出し失敗: ${result.error}`)
        setResult({
          added: 0,
          updated: 0,
          deleted: 0,
          details: { added: [], updated: [], deleted: [] },
          error: true,
          message: result.error || 'API呼び出しに失敗しました'
        })
        setIsUploading(false)
      }
    } catch (error: any) {
      console.error('Import error:', error)
      addLog(`❌ ファイル処理エラー: ${error.message}`)
      setResult({
        added: 0,
        updated: 0,
        deleted: 0,
        details: { added: [], updated: [], deleted: [] },
        error: true,
        message: error.message || 'ファイルの処理に失敗しました'
      })
      setIsUploading(false)
    }
  };

  const handleClose = () => {
    setResult(null);
    setLogs([]);
    setImportId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="社員情報インポート" maxWidth="lg">
      <div className="space-y-4">
        {/* インポートID表示 */}
        {importId && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">インポートID: {importId}</span>
            </div>
          </div>
        )}

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
              インポート処理中...
            </div>
          )}
        </div>

        {/* ログ表示 */}
        {logs.length > 0 && (
          <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs max-h-32 overflow-y-auto">
            <h3 className="text-white font-bold mb-1 text-sm">処理ログ</h3>
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        )}

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