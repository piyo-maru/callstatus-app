import React from 'react';
import { Staff, Schedule } from '@/types';
import { StaffRow } from './StaffRow';

type TimelineContainerProps = {
  staff: Staff[];
  schedules: Schedule[];
  onScheduleClick?: (schedule: Schedule) => void;
  onTimeSlotClick?: (staffId: number, time: string) => void;
};

export const TimelineContainer: React.FC<TimelineContainerProps> = ({
  staff,
  schedules,
  onScheduleClick,
  onTimeSlotClick
}) => {
  // 時間軸生成（8:00-21:00、15分間隔）
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    slots.push('21:00'); // 終了時刻
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // スタッフのスケジュールを取得
  const getStaffSchedules = (staffId: number) => {
    return schedules.filter(s => s.staffId === staffId);
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* 時間軸ヘッダー */}
        <div className="flex border-b bg-gray-50 sticky top-0 z-10">
          <div className="w-48 p-2 border-r font-medium bg-gray-50">スタッフ</div>
          <div className="flex-1 relative">
            <div className="flex">
              {timeSlots.slice(0, -1).map((time, index) => (
                <div key={time} className="w-10 text-xs text-center py-2 border-r">
                  {index % 4 === 0 ? time : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* スタッフ行 */}
        <div className="max-h-[600px] overflow-y-auto">
          {staff.slice(0, 30).map((person) => ( // 30人まで表示
            <StaffRow
              key={person.id}
              staff={person}
              schedules={getStaffSchedules(person.id)}
              timeSlots={timeSlots}
              onScheduleClick={onScheduleClick}
              onTimeSlotClick={onTimeSlotClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};