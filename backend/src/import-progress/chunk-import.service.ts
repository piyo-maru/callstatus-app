import { Injectable } from '@nestjs/common';

@Injectable()
export class ChunkImportService {
  
  // 純粋なチャンク処理（WebSocketなし）
  async processStaffImportInChunks<T, R>(
    dataArray: T[],
    processingFunction: (item: T, index: number) => Promise<R>,
    options: {
      importId: string;
      chunkSize: number;
      onStaffProcessed?: (staff: T, result: R, index: number) => void;
    }
  ): Promise<R[]> {
    const { chunkSize, onStaffProcessed } = options;
    const results: R[] = [];
    
    // チャンクに分割して処理
    for (let i = 0; i < dataArray.length; i += chunkSize) {
      const chunk = dataArray.slice(i, i + chunkSize);
      console.log(`チャンク処理: ${i + 1}-${Math.min(i + chunkSize, dataArray.length)}/${dataArray.length}`);
      
      // チャンク内の並列処理
      const chunkPromises = chunk.map(async (item, chunkIndex) => {
        const globalIndex = i + chunkIndex;
        const result = await processingFunction(item, globalIndex);
        
        if (onStaffProcessed) {
          onStaffProcessed(item, result, globalIndex);
        }
        
        return result;
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    
    return results;
  }
}