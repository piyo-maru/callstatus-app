import { Injectable } from '@nestjs/common';
import { ImportProgressGateway, ProgressInfo } from './import-progress.gateway';

@Injectable()
export class ChunkImportService {
  constructor(private progressGateway: ImportProgressGateway) {}

  // チャンク分割ユーティリティ
  chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 短時間待機（システム負荷軽減）
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 推定残り時間計算
  calculateETA(startTime: Date, processed: number, total: number): number {
    if (processed === 0) return 0;
    
    const elapsed = Date.now() - startTime.getTime();
    const rate = processed / elapsed; // 件/ms
    const remaining = total - processed;
    
    return Math.round(remaining / rate / 1000); // 秒
  }

  // 汎用チャンク処理フレームワーク
  async processInChunks<T, R>(
    items: T[],
    chunkSize: number,
    processor: (item: T, index: number) => Promise<R>,
    options: {
      importId: string;
      actionName?: string;
      parallel?: boolean;
      delayBetweenChunks?: number;
      onChunkStart?: (chunk: T[], chunkIndex: number) => void;
      onChunkComplete?: (results: R[], chunkIndex: number) => void;
      onItemStart?: (item: T, itemIndex: number) => void;
      onItemComplete?: (result: R, item: T, itemIndex: number) => void;
    }
  ): Promise<R[]> {
    const {
      importId,
      actionName = '処理中',
      parallel = true,
      delayBetweenChunks = 100,
      onChunkStart,
      onChunkComplete,
      onItemStart,
      onItemComplete,
    } = options;

    const chunks = this.chunkArray(items, chunkSize);
    const startTime = new Date();
    const allResults: R[] = [];
    let processed = 0;

    console.log(`=== チャンク処理開始: ${items.length}件を${chunkSize}件ずつ処理 ===`);

    // 初期進捗通知
    this.progressGateway.notifyImportStarted(importId, items.length);

    try {
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        // チャンク開始通知
        const progress: ProgressInfo = {
          total: items.length,
          processed,
          currentChunk: chunkIndex + 1,
          totalChunks: chunks.length,
          percentage: Math.round((processed / items.length) * 100),
          currentAction: `${actionName} (${chunkIndex + 1}/${chunks.length}チャンク目)`,
          estimatedTimeRemaining: this.calculateETA(startTime, processed, items.length),
        };

        this.progressGateway.notifyProgress(importId, progress);

        // チャンク開始コールバック
        if (onChunkStart) {
          onChunkStart(chunk, chunkIndex);
        }

        console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} items)`);

        // チャンク内アイテム処理
        let chunkResults: R[];
        
        if (parallel) {
          // 並列処理
          const promises = chunk.map(async (item, itemIndexInChunk) => {
            const globalItemIndex = chunkIndex * chunkSize + itemIndexInChunk;
            
            if (onItemStart) {
              onItemStart(item, globalItemIndex);
            }

            try {
              const result = await processor(item, globalItemIndex);
              
              if (onItemComplete) {
                onItemComplete(result, item, globalItemIndex);
              }

              return result;
            } catch (error) {
              console.error(`Item processing failed at index ${globalItemIndex}:`, error);
              throw error;
            }
          });

          const settledResults = await Promise.allSettled(promises);
          chunkResults = settledResults
            .filter((result): result is PromiseFulfilledResult<Awaited<R>> => result.status === 'fulfilled')
            .map(result => result.value);

          // エラーがあった場合の処理
          const failures = settledResults.filter(result => result.status === 'rejected');
          if (failures.length > 0) {
            console.warn(`Chunk ${chunkIndex + 1} partial failure: ${failures.length}/${chunk.length} failed`);
            failures.forEach((failure, index) => {
              console.error(`Failure ${index + 1}:`, failure.reason);
            });
          }
        } else {
          // 順次処理
          chunkResults = [];
          for (let itemIndexInChunk = 0; itemIndexInChunk < chunk.length; itemIndexInChunk++) {
            const item = chunk[itemIndexInChunk];
            const globalItemIndex = chunkIndex * chunkSize + itemIndexInChunk;
            
            if (onItemStart) {
              onItemStart(item, globalItemIndex);
            }

            try {
              const result = await processor(item, globalItemIndex);
              chunkResults.push(result);
              
              if (onItemComplete) {
                onItemComplete(result, item, globalItemIndex);
              }
            } catch (error) {
              console.error(`Item processing failed at index ${globalItemIndex}:`, error);
              throw error;
            }
          }
        }

        // チャンク完了処理
        allResults.push(...chunkResults);
        processed += chunk.length;

        if (onChunkComplete) {
          onChunkComplete(chunkResults, chunkIndex);
        }

        // 最終進捗更新
        const finalProgress: ProgressInfo = {
          total: items.length,
          processed,
          currentChunk: chunkIndex + 1,
          totalChunks: chunks.length,
          percentage: Math.round((processed / items.length) * 100),
          currentAction: processed === items.length ? '完了' : actionName,
          estimatedTimeRemaining: this.calculateETA(startTime, processed, items.length),
        };

        this.progressGateway.notifyProgress(importId, finalProgress);

        // チャンク間の待機（最後のチャンク以外）
        if (chunkIndex < chunks.length - 1 && delayBetweenChunks > 0) {
          await this.sleep(delayBetweenChunks);
        }
      }

      console.log(`=== チャンク処理完了: ${processed}件処理完了 ===`);
      return allResults;

    } catch (error) {
      console.error('チャンク処理中にエラーが発生:', error);
      this.progressGateway.notifyImportError(importId, error);
      throw error;
    }
  }

  // 社員インポート専用のチャンク処理ラッパー
  async processStaffImportInChunks<T, R>(
    staffData: T[],
    processor: (staff: T, index: number) => Promise<R>,
    options: {
      importId: string;
      chunkSize?: number;
      onStaffProcessed?: (staff: T, result: R, index: number) => void;
    }
  ): Promise<R[]> {
    const { importId, chunkSize = 25, onStaffProcessed } = options;

    return this.processInChunks(
      staffData,
      chunkSize,
      processor,
      {
        importId,
        actionName: '社員情報処理',
        parallel: true,
        delayBetweenChunks: 200,
        onChunkStart: (chunk, chunkIndex) => {
          console.log(`スタッフチャンク ${chunkIndex + 1} 開始: ${chunk.length}人`);
        },
        onChunkComplete: (results, chunkIndex) => {
          console.log(`スタッフチャンク ${chunkIndex + 1} 完了: ${results.length}人処理完了`);
        },
        onItemComplete: (result, staff, index) => {
          if (onStaffProcessed) {
            onStaffProcessed(staff, result, index);
          }
        },
      }
    );
  }
}