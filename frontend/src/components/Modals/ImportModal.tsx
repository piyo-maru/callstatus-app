import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ImportResult } from '@/types';
import { getApiEndpoint } from '@/utils/api';
import { io, Socket } from 'socket.io-client';

interface ProgressInfo {
  total: number
  processed: number
  currentChunk: number
  totalChunks: number
  percentage: number
  currentAction: string
  estimatedTimeRemaining: number
}

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
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [importId, setImportId] = useState<string>('')
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // WebSocket接続
  useEffect(() => {
    if (!isOpen) return;
    
    console.log('🔍 ImportModal WebSocket接続開始');
    
    let newSocket;
    
    try {
      newSocket = io(getApiEndpoint('/import-progress'), {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true
      })
    } catch (error) {
      console.warn('🔧 名前空間URL接続失敗、代替方式を試行:', error)
      
      newSocket = io(getApiEndpoint(''), {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true
      }).of('/import-progress')
    }

    newSocket.on('connect', () => {
      console.log('✅ ImportModal WebSocket接続完了')
      setIsConnected(true)
      addLog('✅ リアルタイム進捗表示準備完了')
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ ImportModal WebSocket切断:', reason)
      setIsConnected(false)
      addLog(`❌ WebSocket切断: ${reason}`)
    })

    newSocket.on('connect_error', (error) => {
      console.error('🚨 ImportModal WebSocket接続エラー:', error)
      addLog(`⚠️ WebSocket接続エラー: 進捗表示なしで実行します`)
      setIsConnected(false)
    })

    newSocket.on('import-progress', (data) => {
      console.log('📊 Import progress received:', data)
      
      if (data.progress) {
        setProgress(data.progress)
        addLog(`⏳ ${data.progress.currentAction} - ${data.progress.percentage}% (${data.progress.processed}/${data.progress.total})`)
      } else {
        addLog(`📊 進捗更新: ${JSON.stringify(data)}`)
      }
    })

    newSocket.on('import-completed', (data) => {
      console.log('✅ Import completed:', data)
      addLog(`✅ インポート完了!`)
      setIsUploading(false)
      setProgress(null)
      
      // 結果を新しい形式に変換
      if (data.summary) {
        setResult({
          added: data.summary.added || 0,
          updated: data.summary.updated || 0,
          deleted: data.summary.deleted || 0,
          details: data.summary.details || { added: [], updated: [], deleted: [] },
          error: false,
          message: 'インポートが正常に完了しました'
        })
      }
      
      onSuccess() // スタッフデータを再取得
    })

    newSocket.on('import-error', (data) => {
      console.log('❌ Import error:', data)
      addLog(`❌ インポートエラー: ${data.error || JSON.stringify(data)}`)
      setIsUploading(false)
      setProgress(null)
      
      setResult({
        added: 0,
        updated: 0,
        deleted: 0,
        details: { added: [], updated: [], deleted: [] },
        error: true,
        message: data.error || 'インポート中にエラーが発生しました'
      })
    })

    setSocket(newSocket)

    return () => {
      console.log('🔧 ImportModal WebSocket切断')
      newSocket.disconnect()
    }
  }, [isOpen])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds}秒`
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);
    setProgress(null);
    setLogs([]);
    
    // WebSocket未接続時の警告（実行は継続）
    if (!isConnected) {
      addLog('⚠️ WebSocket未接続 - 進捗表示なしで実行します')
    }

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // 新しいチャンク処理APIを使用
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
        
        // WebSocket未接続時は簡易完了通知
        if (!isConnected) {
          addLog(`⏳ インポート処理中... (進捗表示なし)`)
          // 10秒後に簡易完了メッセージ（実際の処理時間は不明）
          setTimeout(() => {
            addLog(`✅ インポート処理完了（推定） - 結果確認にはページを更新してください`)
            setIsUploading(false)
            onSuccess() // スタッフデータを再取得
          }, 10000)
        }
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
    setProgress(null);
    setLogs([]);
    setImportId('');
    if (socket) {
      socket.disconnect();
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="社員情報インポート" maxWidth="lg">
      <div className="space-y-4">
        {/* 接続状態 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span>{isConnected ? 'リアルタイム進捗表示対応' : '進捗表示なし（処理は実行されます）'}</span>
            {importId && (
              <span className="ml-2 text-xs text-gray-600">ID: {importId}</span>
            )}
          </div>
        </div>

        {/* 進捗表示 */}
        {progress && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold mb-3 text-blue-800">📊 進捗状況</h3>
            
            {/* プログレスバー */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{progress.currentAction}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            </div>

            {/* 詳細情報 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">処理済み:</span> {progress.processed} / {progress.total}
              </div>
              <div>
                <span className="font-medium">チャンク:</span> {progress.currentChunk} / {progress.totalChunks}
              </div>
              {progress.estimatedTimeRemaining > 0 && (
                <div className="col-span-2">
                  <span className="font-medium">残り時間:</span> {formatTime(progress.estimatedTimeRemaining)}
                </div>
              )}
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
              {isConnected ? 'インポート処理中...' : 'インポート処理中（進捗表示なし）...'}
            </div>
          )}
          {!isConnected && !isUploading && (
            <p className="text-sm text-yellow-600 mt-2">
              💡 WebSocket未接続のため進捗表示できませんが、インポートは実行されます
            </p>
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