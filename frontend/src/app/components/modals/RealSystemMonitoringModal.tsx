/**
 * 実データのみシステム監視ダッシュボード
 * 実際に取得可能なデータのみ表示、嘘をつかない設計
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SystemMetrics {
  timestamp: Date;
  server: {
    cpuUsage: number;
    memoryUsage: number;
    totalMemory: number;
    freeMemory: number;
    uptime: number;
    nodeVersion: string;
  };
  database: {
    responseTime: number;
    recentErrors: number;
    totalStaffCount: number;
    activeStaffCount: number;
    todayScheduleCount: number;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    lastChecked: Date;
  };
  businessContext: {
    companyScale: string;
    monitoringFocus: string;
    realDataSource: boolean;
  };
}

interface RealSystemMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealSystemMonitoringModal = ({ isOpen, onClose }: RealSystemMonitoringModalProps) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'server' | 'database'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 実際のデータ取得
  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/system-monitoring/metrics');
      if (!response.ok) {
        throw new Error('メトリクス取得に失敗しました');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データ取得エラー');
    } finally {
      setIsLoading(false);
    }
  };

  // 自動更新機能
  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && isOpen) {
      interval = setInterval(fetchMetrics, 30000); // 30秒間隔
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isOpen]);

  if (!isOpen) return null;

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-700 bg-green-100 border-green-300';
      case 'warning': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}日 ${hours}時間 ${minutes}分`;
  };

  const formatMemory = (mb: number) => {
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">システム監視ダッシュボード</h2>
            <p className="text-sm text-gray-600 mt-1">
              実データのみ表示 - システム安定稼働重視
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* 自動更新トグル */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">自動更新:</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  autoRefresh ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  autoRefresh ? 'translate-x-5' : 'translate-x-0'
                }`}></div>
              </button>
              {autoRefresh && <span className="text-xs text-green-600">30秒間隔</span>}
            </div>
            
            {/* 手動更新ボタン */}
            <button
              onClick={fetchMetrics}
              disabled={isLoading}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '更新中...' : '手動更新'}
            </button>
            
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2">×</button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[
            { key: 'overview', label: '概要' },
            { key: 'server', label: 'サーバー' },
            { key: 'database', label: 'データベース' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === tab.key
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツエリア */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!metrics && !isLoading && (
            <div className="text-center text-gray-500 py-8">
              データを読み込み中...
            </div>
          )}

          {metrics && (
            <>
              {/* 概要タブ */}
              {selectedTab === 'overview' && (
                <div className="space-y-6">
                  {/* ヘルスステータス */}
                  <div className={`p-4 rounded-lg border-2 ${getHealthColor(metrics.health.status)}`}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold">システムヘルス</h3>
                      <span className="text-sm">
                        {new Date(metrics.health.lastChecked).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="font-bold text-xl">
                        {metrics.health.status === 'healthy' ? '✅ 正常' :
                         metrics.health.status === 'warning' ? '⚠️ 警告' : '🚨 重大'}
                      </p>
                      {metrics.health.issues.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {metrics.health.issues.map((issue, index) => (
                            <li key={index} className="text-sm">• {issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* 主要メトリクス（実データのみ） */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">CPU使用率（実測）</h4>
                      <p className="text-2xl font-bold text-blue-600">{metrics.server.cpuUsage}%</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">メモリ使用率（実測）</h4>
                      <p className="text-2xl font-bold text-green-600">{metrics.server.memoryUsage}%</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">DB応答時間（実測）</h4>
                      <p className="text-2xl font-bold text-purple-600">{metrics.database.responseTime}ms</p>
                    </div>
                  </div>

                  {/* 警告条件 */}
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <h4 className="text-lg font-medium text-amber-800 mb-3">警告・重大判定条件</h4>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-amber-700 mb-1">⚠️ 警告レベル</h5>
                          <ul className="text-amber-600 space-y-1">
                            <li>• CPU使用率: 70%以上</li>
                            <li>• メモリ使用率: 80%以上</li>
                            <li>• DB応答時間: 500ms以上</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-red-700 mb-1">🚨 重大レベル</h5>
                          <ul className="text-red-600 space-y-1">
                            <li>• CPU使用率: 90%以上</li>
                            <li>• メモリ使用率: 95%以上</li>
                            <li>• DB応答時間: 2000ms以上</li>
                          </ul>
                        </div>
                      </div>
                      <div className="border-t border-amber-200 pt-2">
                        <span className="text-amber-700 font-medium">実データに基づく表示:</span>
                        <span className="text-amber-600"> システム安定稼働を重視した閾値設定</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* サーバータブ */}
              {selectedTab === 'server' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">CPU使用率</h4>
                      <p className="text-lg font-bold text-blue-600">{metrics.server.cpuUsage}%</p>
                      <p className="text-xs text-gray-500 mt-1">実測値（100ms計測）</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">メモリ使用率</h4>
                      <p className="text-lg font-bold text-green-600">{metrics.server.memoryUsage}%</p>
                      <p className="text-xs text-gray-500 mt-1">実測値</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">稼働時間</h4>
                      <p className="text-sm font-bold text-purple-600">{formatUptime(metrics.server.uptime)}</p>
                      <p className="text-xs text-gray-500 mt-1">実測値</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">総メモリ</h4>
                      <p className="text-lg font-bold text-teal-600">{formatMemory(metrics.server.totalMemory)}</p>
                      <p className="text-xs text-gray-500 mt-1">実測値</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">空きメモリ</h4>
                      <p className="text-lg font-bold text-indigo-600">{formatMemory(metrics.server.freeMemory)}</p>
                      <p className="text-xs text-gray-500 mt-1">実測値</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">Node.js バージョン</h4>
                      <p className="text-sm font-bold text-gray-800">{metrics.server.nodeVersion}</p>
                      <p className="text-xs text-gray-500 mt-1">実測値</p>
                    </div>
                  </div>
                </div>
              )}

              {/* データベースタブ */}
              {selectedTab === 'database' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">応答時間</h4>
                      <p className="text-lg font-bold text-blue-600">{metrics.database.responseTime}ms</p>
                      <p className="text-xs text-gray-500 mt-1">実測値（SELECT 1実行）</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">エラー数</h4>
                      <p className="text-lg font-bold text-red-600">{metrics.database.recentErrors}</p>
                      <p className="text-xs text-gray-500 mt-1">実測値</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">総スタッフ数</h4>
                      <p className="text-lg font-bold text-purple-600">{metrics.database.totalStaffCount}名</p>
                      <p className="text-xs text-gray-500 mt-1">実測値（論理削除含む）</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">アクティブスタッフ数</h4>
                      <p className="text-lg font-bold text-green-600">{metrics.database.activeStaffCount}名</p>
                      <p className="text-xs text-gray-500 mt-1">実測値（論理削除除く）</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-600 mb-1">今日の予定数</h4>
                      <p className="text-lg font-bold text-teal-600">{metrics.database.todayScheduleCount}件</p>
                      <p className="text-xs text-gray-500 mt-1">実測値（DB COUNT）</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {metrics && (
              <>
                最終更新: {new Date(metrics.timestamp).toLocaleString()} | 
                実データソース: {metrics.businessContext.realDataSource ? '✅' : '❌'}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};