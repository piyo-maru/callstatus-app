/**
 * タイムライン関連のユーティリティ関数とタイプ定義
 * メイン画面と個人ページで共通利用
 */

// === タイムライン設定定数 ===
export const TIMELINE_CONFIG = {
  START_HOUR: 8,        // 8:00
  END_HOUR: 21,         // 21:00
  MINUTES_STEP: 15,     // 15分間隔
  get TOTAL_QUARTERS() {
    return (this.END_HOUR - this.START_HOUR) * 4; // 13時間 × 4 = 52マス
  },
  get TOTAL_HOURS() {
    return this.END_HOUR - this.START_HOUR; // 13時間
  }
} as const;

// === スケジュール関連タイプ ===
export interface Schedule {
  id: number | string;
  status: string;
  start: Date | number;
  end: Date | number;
  memo?: string;
  layer?: 'contract' | 'adjustment' | 'historical';
  staffId: number;
  staffName?: string;
  staffDepartment?: string;
  staffGroup?: string;
  empNo?: string;
  date?: string;
  isHistorical?: boolean;
  _fetchDate?: string; // どの日付から取得されたかを記録
}

export interface Staff {
  id: number;
  empNo?: string;
  name: string;
  department: string;
  group: string;
  isActive?: boolean;
}

// === ステータス色定義 ===
export const STATUS_COLORS: { [key: string]: string } = {
  'online': '#22c55e',
  'remote': '#10b981', 
  'meeting': '#f59e0b',
  'training': '#3b82f6',
  'break': '#f97316',
  'off': '#ef4444', 
  'unplanned': '#dc2626',
  'night duty': '#4f46e5',
};

// === 時間変換ユーティリティ関数 ===

/**
 * 時間（小数点）を位置パーセンテージに変換
 * @param time 時間（例: 9.5 = 9:30）
 * @returns 位置パーセンテージ（0-100）
 */
export const timeToPositionPercent = (time: number): number => {
  const roundedTime = Math.round(time * 4) / 4; // 15分単位に丸める
  const quartersFromStart = (roundedTime - TIMELINE_CONFIG.START_HOUR) * 4;
  return Math.max(0, Math.min(100, (quartersFromStart / TIMELINE_CONFIG.TOTAL_QUARTERS) * 100));
};

/**
 * 位置パーセンテージを時間（小数点）に変換
 * @param percent 位置パーセンテージ（0-100）
 * @returns 時間（例: 9.5 = 9:30）
 */
export const positionPercentToTime = (percent: number): number => {
  const quartersFromStart = (percent / 100) * TIMELINE_CONFIG.TOTAL_QUARTERS;
  const time = TIMELINE_CONFIG.START_HOUR + quartersFromStart / 4;
  return Math.round(time * 4) / 4; // 15分単位に丸める
};

/**
 * 時間選択肢を生成（ドロップダウン用）
 * @param startHour 開始時間
 * @param endHour 終了時間
 * @returns {value: number, label: string}[] の配列
 */
export const generateTimeOptions = (
  startHour: number = TIMELINE_CONFIG.START_HOUR, 
  endHour: number = TIMELINE_CONFIG.END_HOUR
) => {
  const options = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += TIMELINE_CONFIG.MINUTES_STEP) {
      const timeValue = h + m / 60;
      const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      options.push({ value: timeValue, label: timeLabel });
    }
  }
  // 終了時刻も追加
  options.push({ value: endHour, label: `${endHour}:00`});
  return options;
};

/**
 * 小数点時間を時:分形式に変換
 * @param time 小数点時間（例: 9.5）
 * @returns 時:分形式の文字列（例: "9:30"）
 */
export const formatDecimalTime = (time: number): string => {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};

/**
 * 時:分形式を小数点時間に変換
 * @param timeString 時:分形式の文字列（例: "9:30"）
 * @returns 小数点時間（例: 9.5）
 */
export const parseTimeString = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + minutes / 60;
};

/**
 * 現在時刻の位置パーセンテージを計算
 * @param currentTime 現在時刻のDateオブジェクト
 * @returns 位置パーセンテージ（null = 表示範囲外）
 */
export const getCurrentTimePosition = (currentTime: Date): number | null => {
  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
  
  // 表示範囲外の場合はnullを返す
  if (currentHour < TIMELINE_CONFIG.START_HOUR || currentHour > TIMELINE_CONFIG.END_HOUR) {
    return null;
  }
  
  return timeToPositionPercent(currentHour);
};

/**
 * ステータス文字列を表示用に整形
 * @param status ステータス文字列
 * @returns 先頭大文字の文字列
 */
export const capitalizeStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/**
 * スケジュールの表示順序を決定（レイヤー順）
 * @param schedules スケジュールの配列
 * @returns ソートされたスケジュール配列
 */
export const sortSchedulesByLayer = (schedules: Schedule[]): Schedule[] => {
  return schedules.sort((a, b) => {
    // レイヤー順: contract(1) < adjustment(2) < historical(3)
    const layerOrder: { [key: string]: number } = { 
      contract: 1, 
      adjustment: 2,
      historical: 3
    };
    const aLayer = a.layer || 'adjustment';
    const bLayer = b.layer || 'adjustment';
    return layerOrder[aLayer] - layerOrder[bLayer];
  });
};

/**
 * スケジュールバーのスタイル情報を計算
 * @param schedule スケジュールオブジェクト
 * @returns スタイル情報
 */
export const calculateScheduleBarStyle = (schedule: Schedule) => {
  const startPosition = timeToPositionPercent(typeof schedule.start === 'number' ? schedule.start : 0);
  const endPosition = timeToPositionPercent(typeof schedule.end === 'number' ? schedule.end : 0);
  const barWidth = endPosition - startPosition;
  const scheduleLayer = schedule.layer || 'adjustment';
  const isContract = scheduleLayer === 'contract';
  const isHistoricalData = schedule.isHistorical || scheduleLayer === 'historical';
  
  return {
    left: `${startPosition}%`,
    width: `${barWidth}%`,
    backgroundColor: STATUS_COLORS[schedule.status] || '#9ca3af',
    opacity: isContract ? 0.5 : isHistoricalData ? 0.8 : 1,
    zIndex: isContract ? 10 : isHistoricalData ? 15 : 30,
    startPosition,
    endPosition,
    barWidth,
    isContract,
    isHistoricalData
  };
};

// === 利用可能なステータス一覧 ===
export const AVAILABLE_STATUSES = [
  'online', 
  'remote', 
  'meeting', 
  'training', 
  'break', 
  'off', 
  'unplanned', 
  'night duty'
] as const;

// === 時間軸の特別エリア定義 ===
export const SPECIAL_TIME_AREAS = {
  EARLY_MORNING: {
    start: TIMELINE_CONFIG.START_HOUR,     // 8:00
    end: TIMELINE_CONFIG.START_HOUR + 1,   // 9:00
    className: 'bg-blue-50 opacity-30',
    title: '早朝時間帯（8:00-9:00）'
  },
  NIGHT_TIME: {
    start: 18,                             // 18:00
    end: TIMELINE_CONFIG.END_HOUR,         // 21:00
    className: 'bg-blue-50 opacity-30',
    title: '夜間時間帯（18:00-21:00）'
  }
} as const;