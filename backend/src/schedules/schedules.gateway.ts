import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // 開発のため全許可
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