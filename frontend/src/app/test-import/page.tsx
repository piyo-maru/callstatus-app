'use client'
import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

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
  const [importId, setImportId] = useState<string>('')
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)

  // WebSocket接続
  useEffect(() => {
    const newSocket = io('http://localhost:3002', {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      addLog('✅ WebSocket接続完了')
    })

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      addLog('❌ WebSocket切断')
    })

    newSocket.on('importStarted', (data) => {
      console.log('Import started:', data)
      setProgress({ 
        total: data.total, 
        processed: 0, 
        currentChunk: 1, 
        totalChunks: Math.ceil(data.total / 25),
        percentage: 0,
        currentAction: 'インポート開始',
        estimatedTimeRemaining: 0
      })
      addLog(`🚀 インポート開始: ${data.total}件`)
    })

    newSocket.on('importProgress', (data) => {
      console.log('Import progress:', data)
      setProgress(data.progress)
      addLog(`⏳ ${data.progress.currentAction} - ${data.progress.percentage}% (${data.progress.processed}/${data.progress.total})`)
    })

    newSocket.on('importCompleted', (data) => {
      console.log('Import completed:', data)
      addLog(`✅ インポート完了: 成功${data.result.successful}件、失敗${data.result.failed}件`)
      setIsImporting(false)
    })

    newSocket.on('importError', (data) => {
      console.log('Import error:', data)
      addLog(`❌ インポートエラー: ${data.error}`)
      setIsImporting(false)
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

  const startTestImport = async () => {
    if (!isConnected) {
      alert('WebSocketが接続されていません')
      return
    }

    setIsImporting(true)
    setProgress(null)
    setLogs([])
    
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
      const response = await fetch('http://localhost:3002/api/staff/sync-from-json-body-chunked', {
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
          disabled={!isConnected || isImporting}
          className={`px-6 py-3 rounded-lg font-medium ${
            !isConnected || isImporting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isImporting ? '処理中...' : 'テストインポート開始（3件）'}
        </button>
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