/**
 * タイムラインヘッダーコンポーネント
 * 時間軸（8:00-21:00）のヘッダー部分を描画
 */

import React from 'react';
import { TIMELINE_CONFIG } from './TimelineUtils';

interface TimelineHeaderProps {
  /** 開始時間（デフォルト: 8） */
  startHour?: number;
  /** 終了時間（デフォルト: 21） */
  endHour?: number;
  /** 追加のCSSクラス */
  className?: string;
  /** 早朝・夜間時間帯のハイライト表示 */
  highlightSpecialHours?: boolean;
  /** ヘッダーの固定表示 */
  sticky?: boolean;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  startHour = TIMELINE_CONFIG.START_HOUR,
  endHour = TIMELINE_CONFIG.END_HOUR,
  className = '',
  highlightSpecialHours = true,
  sticky = true
}) => {
  const totalHours = endHour - startHour;
  
  // 各時間の幅を計算（総52マス中、各時間は4マス分）
  const getHourWidth = (): string => {
    const totalQuarters = totalHours * 4;
    return `${(4 / totalQuarters) * 100}%`;
  };

  // 特別時間帯（早朝・夜間）の判定
  const isSpecialHour = (hour: number): boolean => {
    if (!highlightSpecialHours) return false;
    return hour === startHour || hour >= 18; // 8:00と18:00以降
  };

  return (
    <div className={`
      ${sticky ? 'sticky top-0' : ''} 
      z-10 bg-gray-100 border-b overflow-hidden 
      ${className}
    `}>
      <div className="min-w-[1300px]">
        <div className="flex font-bold text-sm">
          {Array.from({ length: totalHours }).map((_, i) => {
            const hour = startHour + i;
            const isEarlyOrNight = isSpecialHour(hour);
            const width = getHourWidth();
            
            return (
              <div 
                key={hour} 
                className={`
                  text-left pl-2 border-r py-2 whitespace-nowrap
                  ${isEarlyOrNight ? 'bg-blue-50' : ''}
                `}
                style={{ width }}
                title={`${hour}:00 ${isEarlyOrNight ? '(特別時間帯)' : ''}`}
              >
                {hour}:00
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineHeader;