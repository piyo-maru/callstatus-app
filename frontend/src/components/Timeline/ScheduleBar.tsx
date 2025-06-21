import React from 'react';
import { Schedule, STATUS_COLORS } from '@/types';

type ScheduleBarProps = {
  schedule: Schedule;
  onClick?: (schedule: Schedule) => void;
};

export const ScheduleBar: React.FC<ScheduleBarProps> = ({
  schedule,
  onClick
}) => {
  // 時刻をpx位置に変換
  const timeToPosition = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = (hours - 8) * 60 + minutes;
    return (totalMinutes / 15) * 40; // 15分 = 40px
  };

  const startTime = new Date(schedule.start).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const endTime = new Date(schedule.end).toLocaleTimeString('ja-JP', {
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  const startPos = timeToPosition(startTime);
  const endPos = timeToPosition(endTime);
  const width = endPos - startPos;
  
  if (width <= 0) return null;
  
  const colorClass = STATUS_COLORS[schedule.status] || 'bg-gray-300';
  const isLayer1 = schedule.layer === 'contract';
  const opacity = isLayer1 ? 'opacity-50' : 'opacity-100';
  const borderStyle = isLayer1 ? 'border-2 border-dashed border-gray-400' : '';
  
  const handleClick = () => {
    if (onClick) {
      onClick(schedule);
    }
  };

  return (
    <div
      className={`absolute top-2 h-12 ${colorClass} ${opacity} ${borderStyle} rounded text-white text-xs flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shadow-sm`}
      style={{
        left: `${startPos}px`,
        width: `${width}px`,
        minWidth: '20px'
      }}
      onClick={handleClick}
      title={`${schedule.status} (${startTime}-${endTime})${schedule.memo ? `\n${schedule.memo}` : ''}${schedule.layer ? `\nレイヤー: ${schedule.layer}` : ''}`}
    >
      {width > 60 && (
        <span className="truncate px-1">
          {schedule.status}
          {schedule.memo && width > 100 && (
            <div className="text-xs opacity-75">{schedule.memo}</div>
          )}
        </span>
      )}
      {width <= 60 && width > 30 && (
        <span className="text-xs font-bold">
          {schedule.status.charAt(0)}
        </span>
      )}
    </div>
  );
};