import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import * as fs from 'fs';
import * as ini from 'ini';

// 設定ファイルから動的にCORS設定を読み込む
function loadCorsConfig() {
  const configPath = '/app/config.ini';
  try {
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf-8');
      const config = ini.parse(configFile);
      const allowedOrigins =
        config.cors?.allowed_origins || 'http://localhost:3000';
      const origins = allowedOrigins
        .split(',')
        .map((origin: string) => origin.trim());
      return origins;
    }
  } catch (error) {
    console.warn(
      'WebSocket: Config file not found, using default CORS settings:',
      error.message,
    );
  }

  // デフォルト設定
  return ['http://localhost:3000'];
}

@WebSocketGateway({
  cors: {
    origin: loadCorsConfig(), // 動的設定読み込み
  },
})
export class SchedulesGateway {
  @WebSocketServer()
  server: Server;

  sendNewSchedule(schedule: any) {
    this.server.emit('schedule:new', schedule);
  }

  sendScheduleDeleted(id: number) {
    this.server.emit('schedule:deleted', id);
  }

  // ★★★ ここからが追加箇所 ★★★
  sendScheduleUpdated(schedule: any) {
    this.server.emit('schedule:updated', schedule);
  }
  // ★★★ ここまでが追加箇所 ★★★
}
