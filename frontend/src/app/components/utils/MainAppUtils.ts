// MainAppUtils.ts - FullMainApp関連のユーティリティ関数

import { Holiday, CharacterCheckResult } from '../types/MainAppTypes';

// --- 祝日関連の関数 ---
export const fetchHolidays = async (): Promise<Holiday[]> => {
  // CORS制限により外部祝日データは取得不可のため、内蔵データを使用
  console.log('内蔵祝日データを使用します');
  
  // 2025年の祝日データ
  return [
      { date: '2025-01-01', name: '元日' },
      { date: '2025-01-13', name: '成人の日' },
      { date: '2025-02-11', name: '建国記念の日' },
      { date: '2025-02-23', name: '天皇誕生日' },
      { date: '2025-03-20', name: '春分の日' },
      { date: '2025-04-29', name: '昭和の日' },
      { date: '2025-05-03', name: '憲法記念日' },
      { date: '2025-05-04', name: 'みどりの日' },
      { date: '2025-05-05', name: 'こどもの日' },
      { date: '2025-07-21', name: '海の日' },
      { date: '2025-08-11', name: '山の日' },
      { date: '2025-09-15', name: '敬老の日' },
      { date: '2025-09-23', name: '秋分の日' },
      { date: '2025-10-13', name: '体育の日' },
      { date: '2025-11-03', name: '文化の日' },
      { date: '2025-11-23', name: '勤労感謝の日' },
    ];
};

export const isWeekend = (date: Date): 'saturday' | 'sunday' | null => {
  const day = date.getDay();
  if (day === 6) return 'saturday';
  if (day === 0) return 'sunday';
  return null;
};

export const getHoliday = (date: Date, holidays: Holiday[]): Holiday | null => {
  // JST基準で日付文字列を生成
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return holidays.find(holiday => holiday.date === dateStr) || null;
};

export const getDateColor = (date: Date, holidays: Holiday[]): string => {
  const holiday = getHoliday(date, holidays);
  if (holiday) return 'text-red-600'; // 祝日は赤色
  
  const weekend = isWeekend(date);
  if (weekend === 'sunday') return 'text-red-600'; // 日曜日は赤色
  if (weekend === 'saturday') return 'text-blue-600'; // 土曜日は青色
  
  return 'text-gray-700'; // 平日は通常色
};

export const formatDateWithHoliday = (date: Date, holidays: Holiday[]): string => {
  const holiday = getHoliday(date, holidays);
  const baseFormat = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
  
  if (holiday) {
    return `${baseFormat} (${holiday.name})`;
  }
  
  return baseFormat;
};

// --- 文字チェック関数 ---
export const checkSupportedCharacters = (data: Array<{name: string; dept: string; team: string}>): CharacterCheckResult => {
  // JIS第1-2水準漢字 + ひらがな + カタカナ + 英数字 + 基本記号 + 反復記号「々」+ 全角英数字の範囲
  const supportedCharsRegex = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\u0020-\u007e\uff01-\uff9f\u3000\u301c\u2010-\u2015\u2018-\u201f\u2026\u2030\u203b\u2212\u2500-\u257f\u3005]*$/;
  
  const errors: CharacterCheckResult['errors'] = [];
  
  data.forEach((item, index) => {
    // 名前をチェック
    if (!supportedCharsRegex.test(item.name)) {
      const invalidChars = Array.from(item.name).filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'name',
        value: item.name,
        invalidChars: Array.from(new Set(invalidChars)),
        position: index + 1
      });
    }
    
    // 部署をチェック
    if (!supportedCharsRegex.test(item.dept)) {
      const invalidChars = Array.from(item.dept).filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'dept',
        value: item.dept,
        invalidChars: Array.from(new Set(invalidChars)),
        position: index + 1
      });
    }
    
    // チーム/グループをチェック
    if (!supportedCharsRegex.test(item.team)) {
      const invalidChars = Array.from(item.team).filter(char => !supportedCharsRegex.test(char));
      errors.push({
        field: 'team',
        value: item.team,
        invalidChars: Array.from(new Set(invalidChars)),
        position: index + 1
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// --- 時刻変換ヘルパー関数 ---
export const timeStringToHours = (timeString: string): number => {
    // ISO文字列をパースしてJST時刻の数値表現に変換
    const date = new Date(timeString);
    // JST時刻に変換（UTC + 9時間オフセット）
    const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const hours = jstDate.getUTCHours();
    const minutes = jstDate.getUTCMinutes();
    return hours + minutes / 60;
};

export const hoursToTimeString = (hours: number): string => {
    // 数値時刻（例: 10.5）をUTC保存用のISO文字列に変換
    const hour = Math.floor(hours);
    const minute = Math.round((hours - hour) * 60);
    
    // 現在の日付を取得してJST時刻として設定
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    // JST時刻をISO-8601形式のタイムゾーン付き文字列として構築
    const jstIsoString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`;
    
    // JST文字列をパースしてUTC時刻のDateオブジェクトを作成
    return new Date(jstIsoString).toISOString();
};