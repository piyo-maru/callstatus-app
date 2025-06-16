// backend/src/schedules/schedules.gateway.ts

import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class SchedulesGateway {
  @WebSocketServer()
  server: Server;

  sendNewSchedule(schedule: any) {
    this.server.emit('schedule:new', schedule);
  }

  // ★★★ 新しい機能: 削除通知 ★★★
  sendScheduleDeleted(deletedScheduleId: number) {
    this.server.emit('schedule:deleted', deletedScheduleId);
  }
}
