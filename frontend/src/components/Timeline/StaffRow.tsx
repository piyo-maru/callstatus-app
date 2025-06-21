import React from 'react';
import { Staff, Schedule } from '@/types';
import { ScheduleBar } from './ScheduleBar';

type StaffRowProps = {
  staff: Staff;
  schedules: Schedule[];
  timeSlots: string[];
  onScheduleClick?: (schedule: Schedule) => void;
  onTimeSlotClick?: (staffId: number, time: string) => void;
};

export const StaffRow: React.FC<StaffRowProps> = ({
  staff,
  schedules,
  timeSlots,
  onScheduleClick,
  onTimeSlotClick
}) => {
  const handleTimeSlotClick = (time: string) => {
    if (onTimeSlotClick) {
      onTimeSlotClick(staff.id, time);
    }
  };

  return (
    <div className="flex border-b hover:bg-gray-50 group">
      {/* スタッフ情報 */}
      <div className="w-48 p-2 border-r bg-white sticky left-0">
        <div className="font-medium text-sm">{staff.name}</div>
        <div className="text-xs text-gray-500">{staff.department}</div>
        <div className="text-xs text-gray-400">{staff.group}</div>
        {staff.isSupporting && (
          <div className="text-xs text-amber-600 font-semibold">[支援]</div>
        )}
        {staff.empNo && (
          <div className="text-xs text-gray-400">ID: {staff.empNo}</div>
        )}
      </div>
      
      {/* タイムライン */}
      <div className="flex-1 relative h-16">
        {/* 時間軸線 */}
        {timeSlots.slice(0, -1).map((time, index) => (
          <div 
            key={time} 
            className="absolute top-0 h-full w-px bg-gray-200 hover:bg-gray-300 cursor-pointer"
            style={{ left: `${index * 40}px` }}
            onClick={() => handleTimeSlotClick(time)}
            title={`${time} - スケジュール追加`}
          />
        ))}
        
        {/* スケジュールバー */}
        {schedules.map((schedule) => (
          <ScheduleBar
            key={schedule.id}
            schedule={schedule}
            onClick={onScheduleClick}
          />
        ))}

        {/* クリック可能な時間エリア（デバッグ用） */}
        <div className="absolute inset-0 opacity-0 hover:opacity-10 hover:bg-blue-200 transition-opacity" />
      </div>
    </div>
  );
};