'use client'
import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { getApiUrl } from '../components/constants/MainAppConstants'

interface ProgressInfo {
  total: number
  processed: number
  currentChunk: number
  totalChunks: number
  percentage: number
  currentAction: string
  estimatedTimeRemaining: number
}

export default function TestImportPage() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  // デバッグ用: isConnected状態の変化をログ出力
  useEffect(() => {
    console.log('🔧 isConnected state changed to:', isConnected)
  }, [isConnected])
  const [importId, setImportId] = useState<string>('')
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null)

  // WebSocket接続
  useEffect(() => {
    const apiUrl = getApiUrl();
    console.log('🔍 WebSocket接続開始:', apiUrl, 'namespace: /import-progress')
    
    // Socket.IO名前空間の接続方式 - 複数パターンテスト
    let newSocket;
    
    try {
      // 方式1: 名前空間指定でURL構築
      newSocket = io(`${apiUrl}/import-progress`, {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true
      })
    } catch (error) {
      console.warn('🔧 名前空間URL接続失敗、代替方式を試行:', error)
      
      // 方式2: ベースURL + 名前空間指定
      newSocket = io(apiUrl, {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true
      }).of('/import-progress')
    }
    
    console.log('🔍 Socket.IO接続オプション:', {
      url: `${apiUrl}/import-progress`,
      transports: ['polling', 'websocket'],
      connected: newSocket.connected
    })

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected successfully')
      console.log('🔧 Setting isConnected to true...')
      setIsConnected(true)
      addLog('✅ WebSocket接続完了')
      console.log('🔧 isConnected state should now be: true')
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
      setIsConnected(false)
      addLog(`❌ WebSocket切断: ${reason}`)
    })

    newSocket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error)
      addLog(`🚨 WebSocket接続エラー: ${error.message}`)
      setIsConnected(false)
    })

    newSocket.on('error', (error) => {
      console.error('🚨 WebSocket error:', error)
      addLog(`🚨 WebSocketエラー: ${error}`)
    })

    newSocket.on('import-progress', (data) => {
      console.log('📊 Import progress received:', data)
      
      // プログレス情報があれば設定
      if (data.progress) {
        setProgress(data.progress)
        addLog(`⏳ ${data.progress.currentAction} - ${data.progress.percentage}% (${data.progress.processed}/${data.progress.total})`)
      } else {
        // 単純な進捗データの場合
        addLog(`📊 進捗更新: ${JSON.stringify(data)}`)
      }
    })

    newSocket.on('import-completed', (data) => {
      console.log('✅ Import completed:', data)
      addLog(`✅ インポート完了: ${JSON.stringify(data.summary)}`)
      setIsImporting(false)
      setProgress(null)
      stopProgressPolling() // ポーリング停止
    })

    newSocket.on('import-error', (data) => {
      console.log('❌ Import error:', data)
      addLog(`❌ インポートエラー: ${data.error || JSON.stringify(data)}`)
      setIsImporting(false)
      setProgress(null)
      stopProgressPolling() // ポーリング停止
    })

    newSocket.on('import-cancelled', (data) => {
      console.log('🚫 Import cancelled:', data)
      addLog(`🚫 インポートキャンセル: ${data.importId}`)
      setIsImporting(false)
      setProgress(null)
      stopProgressPolling() // ポーリング停止
    })

    // 全イベントをキャッチするデバッグリスナー
    newSocket.onAny((eventName, ...args) => {
      console.log(`🔍 WebSocketイベント受信: ${eventName}`, args)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // HTTP APIによる進捗ポーリング（WebSocketフォールバック）
  const startProgressPolling = (importId: string) => {
    console.log(`🔄 HTTPポーリング開始: ${importId}`)
    addLog(`🔄 WebSocket未接続のためHTTPポーリングで進捗確認`)
    
    const pollProgress = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/staff/import-status/${importId}`)
        const result = await response.json()
        
        if (result.success) {
          if (result.status === 'in_progress' && result.progress) {
            setProgress(result.progress)
            addLog(`📊 進捗更新: ${result.progress.percentage}% (${result.progress.processed}/${result.progress.total})`)
          } else if (result.status === 'completed_or_not_found') {
            addLog(`✅ インポート処理完了`)
            setIsImporting(false)
            stopProgressPolling()
          } else {
            addLog(`ℹ️ ${result.message || 'ステータス確認中...'}`)
          }
        } else {
          addLog(`⚠️ 進捗確認エラー: ${result.error}`)
        }
      } catch (error) {
        console.error('Progress polling error:', error)
        addLog(`❌ 進捗確認失敗: ${error}`)
      }
    }
    
    // 最初のポーリング実行
    pollProgress()
    
    // 2秒間隔でポーリング
    const timer = setInterval(pollProgress, 2000)
    setPollingTimer(timer)
  }

  const stopProgressPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      setPollingTimer(null)
      console.log(`⏹️ HTTPポーリング停止`)
    }
  }

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stopProgressPolling()
    }
  }, [])

  const startTestImport = async () => {
    setIsImporting(true)
    setProgress(null)
    setLogs([])
    
    // WebSocket未接続時の警告（実行は継続）
    if (!isConnected) {
      addLog('⚠️ WebSocket未接続 - 進捗表示なしで実行します')
    }
    
    // テスト用の社員データ（小規模）
    const testData = {
      employeeData: [
        {
          empNo: 'TEST001',
          name: 'テスト太郎',
          dept: 'システム部',
          team: 'システムチーム',
          email: 'test1@example.com',
          mondayHours: '9:00-18:00',
          tuesdayHours: '9:00-18:00',
          wednesdayHours: '9:00-18:00',
          thursdayHours: '9:00-18:00',
          fridayHours: '9:00-18:00'
        },
        {
          empNo: 'TEST002',
          name: 'テスト花子',
          dept: 'システム部',
          team: 'システムチーム',
          email: 'test2@example.com',
          mondayHours: '9:00-18:00',
          tuesdayHours: '9:00-18:00',
          wednesdayHours: '9:00-18:00',
          thursdayHours: '9:00-18:00',
          fridayHours: '9:00-18:00'
        },
        {
          empNo: 'TEST003',
          name: 'テスト次郎',
          dept: 'システム部',
          team: 'システムチーム',
          email: 'test3@example.com',
          mondayHours: '9:00-17:00',
          tuesdayHours: '9:00-17:00',
          wednesdayHours: '9:00-17:00',
          thursdayHours: '9:00-17:00',
          fridayHours: '9:00-17:00'
        }
      ]
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/staff/sync-from-json-body-chunked`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      })

      const result = await response.json()
      console.log('Import API response:', result)
      
      if (result.success) {
        setImportId(result.importId)
        addLog(`📡 API呼び出し成功: ${result.message}`)
        addLog(`🆔 インポートID: ${result.importId}`)
        
        // WebSocket未接続時はHTTPポーリングで進捗確認
        if (!isConnected) {
          startProgressPolling(result.importId)
        }
      } else {
        addLog(`❌ API呼び出し失敗: ${result.error}`)
        setIsImporting(false)
      }
    } catch (error) {
      console.error('Import error:', error)
      addLog(`❌ API呼び出しエラー: ${error}`)
      setIsImporting(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds}秒`
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">チャンク処理インポートテスト</h1>
      
      {/* 接続状態 */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">接続状態</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'WebSocket接続中' : 'WebSocket未接続'}</span>
        </div>
        {importId && (
          <div className="mt-2">
            <span className="font-medium">インポートID:</span> <code className="bg-gray-200 px-2 py-1 rounded">{importId}</code>
          </div>
        )}
      </div>

      {/* 進捗表示 */}
      {progress && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold mb-3">進捗状況</h2>
          
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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">処理済み:</span> {progress.processed} / {progress.total}
            </div>
            <div>
              <span className="font-medium">チャンク:</span> {progress.currentChunk} / {progress.totalChunks}
            </div>
            <div>
              <span className="font-medium">残り時間:</span> {formatTime(progress.estimatedTimeRemaining)}
            </div>
            <div>
              <span className="font-medium">進捗率:</span> {progress.percentage}%
            </div>
          </div>
        </div>
      )}

      {/* 操作ボタン */}
      <div className="mb-6">
        <button
          onClick={startTestImport}
          disabled={isImporting}
          className={`px-6 py-3 rounded-lg font-medium ${
            isImporting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isConnected 
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isImporting ? '処理中...' : isConnected ? 'テストインポート開始（3件）' : 'テストインポート開始（HTTPポーリング）'}
        </button>
        
        {/* WebSocket状態の説明 */}
        {!isConnected && !isImporting && (
          <p className="text-sm text-green-600 mt-2">
            💡 WebSocket未接続時もHTTPポーリングで進捗確認できます
          </p>
        )}
      </div>

      {/* ログ表示 */}
      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
        <h2 className="text-white font-bold mb-2">ログ</h2>
        {logs.length === 0 ? (
          <div className="text-gray-500">ログなし</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}