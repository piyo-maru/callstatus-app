import { useEffect, useRef, useCallback } from 'react';

type WebSocketEventHandler = (data: any) => void;

export const useWebSocket = (url: string) => {
  const ws = useRef<WebSocket | null>(null);
  const handlers = useRef<Map<string, WebSocketEventHandler[]>>(new Map());
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url.replace('http', 'ws'));
      
      ws.current.onopen = () => {
        console.log('WebSocket接続成功');
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const eventHandlers = handlers.current.get(message.event) || [];
          eventHandlers.forEach(handler => handler(message.data));
        } catch (error) {
          console.error('WebSocketメッセージの解析エラー:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket接続が閉じられました');
        
        // 自動再接続
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`再接続試行 ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          console.log('最大再接続試行回数に達しました');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocketエラー:', error);
      };

    } catch (error) {
      console.error('WebSocket接続エラー:', error);
    }
  }, [url]);

  // イベントハンドラーの登録
  const on = useCallback((event: string, handler: WebSocketEventHandler) => {
    const eventHandlers = handlers.current.get(event) || [];
    eventHandlers.push(handler);
    handlers.current.set(event, eventHandlers);

    // クリーンアップ関数を返す
    return () => {
      const currentHandlers = handlers.current.get(event) || [];
      const filteredHandlers = currentHandlers.filter(h => h !== handler);
      if (filteredHandlers.length > 0) {
        handlers.current.set(event, filteredHandlers);
      } else {
        handlers.current.delete(event);
      }
    };
  }, []);

  // イベントハンドラーの削除
  const off = useCallback((event: string, handler?: WebSocketEventHandler) => {
    if (handler) {
      const eventHandlers = handlers.current.get(event) || [];
      const filteredHandlers = eventHandlers.filter(h => h !== handler);
      if (filteredHandlers.length > 0) {
        handlers.current.set(event, filteredHandlers);
      } else {
        handlers.current.delete(event);
      }
    } else {
      handlers.current.delete(event);
    }
  }, []);

  // 接続状態の取得
  const isConnected = useCallback(() => {
    return ws.current?.readyState === WebSocket.OPEN;
  }, []);

  // 手動再接続
  const reconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  // 初期化と清掃
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    on,
    off,
    isConnected,
    reconnect
  };
};