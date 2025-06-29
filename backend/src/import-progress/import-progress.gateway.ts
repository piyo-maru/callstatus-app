import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

export interface ProgressInfo {
  total: number;
  processed: number;
  currentChunk: number;
  totalChunks: number;
  currentStaff?: string;
  currentAction?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
  errors?: any[];
}

@Injectable()
@WebSocketGateway({
  namespace: '/import-progress',
  cors: {
    origin: ['http://localhost:3000', 'http://10.99.129.21:3000'],
    credentials: true,
  },
})
export class ImportProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Set<Socket> = new Set();
  private activeImports: Map<string, ProgressInfo> = new Map();

  handleConnection(client: Socket) {
    console.log(`Import progress client connected: ${client.id}`);
    this.connectedClients.add(client);
    
    // 既存の進行中インポートがあれば送信
    this.activeImports.forEach((progress, importId) => {
      client.emit('import-progress', { importId, ...progress });
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Import progress client disconnected: ${client.id}`);
    this.connectedClients.delete(client);
  }

  // 進捗通知（WebSocket失敗に対して堅牢）
  notifyProgress(importId: string, progress: ProgressInfo) {
    this.activeImports.set(importId, progress);
    
    const progressData = {
      importId,
      ...progress,
      timestamp: new Date().toISOString(),
    };

    console.log(`Progress notification: ${progress.percentage}% (${progress.processed}/${progress.total})`);
    
    try {
      // WebSocket通知が失敗してもデータ処理は継続
      if (this.server && this.connectedClients.size > 0) {
        this.server.emit('import-progress', progressData);
        console.log(`✅ WebSocket進捗通知送信成功: ${importId}`);
      } else {
        console.log(`ℹ️ WebSocket未接続のため進捗通知スキップ: ${importId}`);
      }
    } catch (error) {
      console.warn(`⚠️ WebSocket進捗通知失敗（処理は継続）: ${error.message}`);
    }
  }

  // インポート開始通知
  notifyImportStarted(importId: string, totalItems: number) {
    const progress: ProgressInfo = {
      total: totalItems,
      processed: 0,
      currentChunk: 0,
      totalChunks: 0,
      percentage: 0,
      currentAction: 'インポート開始',
    };

    this.notifyProgress(importId, progress);
  }

  // インポート完了通知（WebSocket失敗に対して堅牢）
  notifyImportCompleted(importId: string, summary: any) {
    const completionData = {
      importId,
      status: 'completed',
      summary,
      timestamp: new Date().toISOString(),
    };

    console.log(`Import completion: ${importId}`, summary);
    
    try {
      if (this.server && this.connectedClients.size > 0) {
        this.server.emit('import-completed', completionData);
        console.log(`✅ WebSocket完了通知送信成功: ${importId}`);
      } else {
        console.log(`ℹ️ WebSocket未接続のため完了通知スキップ: ${importId}`);
      }
    } catch (error) {
      console.warn(`⚠️ WebSocket完了通知失敗: ${error.message}`);
    }
    
    this.activeImports.delete(importId);
  }

  // エラー通知（WebSocket失敗に対して堅牢）
  notifyImportError(importId: string, error: any) {
    const errorData = {
      importId,
      status: 'error',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    console.error(`Import error: ${importId}`, error);
    
    try {
      if (this.server && this.connectedClients.size > 0) {
        this.server.emit('import-error', errorData);
        console.log(`✅ WebSocketエラー通知送信成功: ${importId}`);
      } else {
        console.log(`ℹ️ WebSocket未接続のためエラー通知スキップ: ${importId}`);
      }
    } catch (wsError) {
      console.warn(`⚠️ WebSocketエラー通知失敗: ${wsError.message}`);
    }
    
    this.activeImports.delete(importId);
  }

  // キャンセル受信
  @SubscribeMessage('cancel-import')
  handleCancelImport(@MessageBody() data: { importId: string }, @ConnectedSocket() client: Socket) {
    console.log(`Import cancellation requested: ${data.importId}`);
    // キャンセル処理は実装側で対応
    this.server.emit('import-cancelled', { importId: data.importId });
    return { status: 'cancellation-requested' };
  }

  // 接続中クライアント数取得
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // HTTP API用: 進捗状況取得（WebSocketフォールバック）
  getImportProgress(importId: string): ProgressInfo | null {
    return this.activeImports.get(importId) || null;
  }

  // HTTP API用: 全進行中インポートの取得
  getAllActiveImports(): Map<string, ProgressInfo> {
    return new Map(this.activeImports);
  }

  // HTTP API用: インポート状況チェック
  isImportActive(importId: string): boolean {
    return this.activeImports.has(importId);
  }
}