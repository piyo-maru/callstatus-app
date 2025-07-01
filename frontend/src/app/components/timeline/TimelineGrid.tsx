/**
 * タイムライングリッドコンポーネント
 * 15分間隔のグリッド線、背景エリア、現在時刻インジケーターを描画
 */

import React from 'react';
import { TIMELINE_CONFIG, SPECIAL_TIME_AREAS, getCurrentTimePosition } from './TimelineUtils';

interface TimelineGridProps {
  /** 現在時刻（現在時刻ラインの表示用） */
  currentTime?: Date;
  /** 早朝・夜間エリアの背景表示 */
  showSpecialAreas?: boolean;
  /** 15分間隔の細かいグリッド線表示 */
  showMinorLines?: boolean;
  /** 追加のCSSクラス */
  className?: string;
  /** 開始時間（デフォルト: 8） */
  startHour?: number;
  /** 終了時間（デフォルト: 21） */
  endHour?: number;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  currentTime,
  showSpecialAreas = true,
  showMinorLines = true,
  className = '',
  startHour = TIMELINE_CONFIG.START_HOUR,
  endHour = TIMELINE_CONFIG.END_HOUR
}) => {
  const totalQuarters = (endHour - startHour) * 4;
  
  // 位置をパーセンテージで計算
  const timeToPosition = (time: number): number => {
    const quartersFromStart = (time - startHour) * 4;
    return Math.max(0, Math.min(100, (quartersFromStart / totalQuarters) * 100));
  };

  // 現在時刻の位置を計算
  const currentTimePosition = currentTime ? getCurrentTimePosition(currentTime) : null;
  const currentTimeFormatted = currentTime 
    ? `${currentTime.getHours()}:${String(currentTime.getMinutes()).padStart(2, '0')}`
    : '';

  // 5分間隔のグリッド線を生成（視認性重視）
  const generateGridLines = () => {
    if (!showMinorLines) return [];
    
    const markers = [];
    const DISPLAY_STEP = 5; // 5分間隔で表示
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += DISPLAY_STEP) {
        if (hour === endHour && minute > 0) break; // 終了時刻で止める
        
        const time = hour + minute / 60;
        const position = timeToPosition(time);
        const timeString = `${hour}:${String(minute).padStart(2, '0')}`;
        
        // 1時間間隔は濃い線、5分間隔は薄い線
        const isHourMark = minute === 0;
        const lineClassName = isHourMark 
          ? "absolute top-0 bottom-0 w-0.5 border-l border-gray-400 z-10 opacity-70" // 控えめな濃い線
          : "absolute top-0 bottom-0 w-0.5 border-l border-gray-300 z-5 opacity-50";  // 薄い線
        
        markers.push(
          <div
            key={`${hour}-${minute}`}
            className={lineClassName}
            style={{ left: `${position}%` }}
            title={timeString}
          />
        );
      }
    }
    
    return markers;
  };

  // 特別エリア（早朝・夜間）の背景を生成
  const generateSpecialAreas = () => {
    if (!showSpecialAreas) return [];
    
    const areas = [];
    
    // 早朝エリア（8:00-9:00）
    if (startHour <= SPECIAL_TIME_AREAS.EARLY_MORNING.start && endHour > SPECIAL_TIME_AREAS.EARLY_MORNING.start) {
      const startPos = timeToPosition(SPECIAL_TIME_AREAS.EARLY_MORNING.start);
      const endPos = timeToPosition(Math.min(SPECIAL_TIME_AREAS.EARLY_MORNING.end, endHour));
      const width = endPos - startPos;
      
      areas.push(
        <div 
          key="early-morning"
          className={`absolute top-0 bottom-0 z-10 ${SPECIAL_TIME_AREAS.EARLY_MORNING.className}`}
          style={{ left: `${startPos}%`, width: `${width}%` }}
          title={SPECIAL_TIME_AREAS.EARLY_MORNING.title}
        />
      );
    }
    
    // 夜間エリア（18:00-21:00）
    if (startHour < SPECIAL_TIME_AREAS.NIGHT_TIME.end && endHour >= SPECIAL_TIME_AREAS.NIGHT_TIME.start) {
      const startPos = timeToPosition(Math.max(SPECIAL_TIME_AREAS.NIGHT_TIME.start, startHour));
      const endPos = timeToPosition(Math.min(SPECIAL_TIME_AREAS.NIGHT_TIME.end, endHour));
      const width = endPos - startPos;
      
      areas.push(
        <div 
          key="night-time"
          className={`absolute top-0 bottom-0 z-10 ${SPECIAL_TIME_AREAS.NIGHT_TIME.className}`}
          style={{ left: `${startPos}%`, width: `${width}%` }}
          title={SPECIAL_TIME_AREAS.NIGHT_TIME.title}
        />
      );
    }
    
    return areas;
  };

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* 5分間隔のグリッド線 */}
      {generateGridLines()}
      
      {/* 特別エリアの背景 */}
      {generateSpecialAreas()}
      
      {/* 現在時刻ライン */}
      {currentTimePosition !== null && (
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30" 
          style={{ left: `${currentTimePosition}%` }}
          title={`現在時刻: ${currentTimeFormatted}`}
        >
          {/* 現在時刻ラベル（オプション） */}
          <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-1 rounded whitespace-nowrap">
            {currentTimeFormatted}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineGrid;