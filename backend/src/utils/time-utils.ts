/**
 * 時刻処理統一ユーティリティ
 * 
 * 【時刻処理厳格ルール】
 * 1. 内部処理は完全UTC
 * 2. 文字列はISO-8601 (Z付き)固定
 * 3. 日時型はTZ情報を持つ型選択
 * 4. 変数・カラム名は *_utc に統一
 * 5. 1分単位精度対応
 */

import { parseISO, formatISO, isValid, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export class TimeUtils {
  private static readonly JST_TIMEZONE = 'Asia/Tokyo';
  
  /**
   * 任意の日付入力をUTC文字列に変換
   * @param dateInput Date、文字列、数値
   * @returns ISO-8601 (Z付き) UTC文字列
   */
  static toUTC(dateInput: string | Date | number): string {
    let date: Date;
    
    if (typeof dateInput === 'string') {
      date = parseISO(dateInput);
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      date = dateInput;
    }
    
    if (!isValid(date)) {
      throw new Error(`Invalid date input: ${dateInput}`);
    }
    
    return formatISO(date); // ISO-8601 (Z付き)
  }
  
  /**
   * UTC文字列をJST Dateオブジェクトに変換（表示用）
   * @param utcString ISO-8601 (Z付き) UTC文字列
   * @returns JST時刻のDateオブジェクト
   */
  static toJST(utcString: string): Date {
    const utcDate = parseISO(utcString);
    if (!isValid(utcDate)) {
      throw new Error(`Invalid UTC string: ${utcString}`);
    }
    
    return toZonedTime(utcDate, this.JST_TIMEZONE);
  }
  
  /**
   * JST時刻をUTC文字列に変換
   * @param jstDate JST時刻のDateオブジェクト
   * @returns ISO-8601 (Z付き) UTC文字列
   */
  static jstToUTC(jstDate: Date): string {
    const utcDate = fromZonedTime(jstDate, this.JST_TIMEZONE);
    return formatISO(utcDate);
  }
  
  /**
   * 年月日からUTC基準の曜日を取得（Contract用）
   * @param year 年
   * @param month 月（1-12）
   * @param day 日
   * @returns 曜日（0: 日曜日, 1: 月曜日, ..., 6: 土曜日）
   */
  static getUTCDayOfWeek(year: number, month: number, day: number): number {
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    return utcDate.getUTCDay();
  }
  
  /**
   * UTC日付文字列から曜日を取得
   * @param utcDateString ISO-8601 (Z付き) UTC文字列
   * @returns 曜日（0: 日曜日, 1: 月曜日, ..., 6: 土曜日）
   */
  static getDayOfWeekFromUTC(utcDateString: string): number {
    const utcDate = parseISO(utcDateString);
    if (!isValid(utcDate)) {
      throw new Error(`Invalid UTC date string: ${utcDateString}`);
    }
    return utcDate.getUTCDay();
  }
  
  /**
   * 現在時刻をUTC文字列で取得
   * @returns ISO-8601 (Z付き) UTC文字列
   */
  static nowUTC(): string {
    return formatISO(new Date());
  }
  
  /**
   * 年月日からUTC日付文字列を生成
   * @param year 年
   * @param month 月（1-12）
   * @param day 日
   * @returns ISO-8601 (Z付き) UTC文字列
   */
  static createUTCDateString(year: number, month: number, day: number): string {
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    return formatISO(utcDate);
  }
  
  /**
   * 日付文字列をYYYY-MM-DD形式に変換（データベース検索用）
   * @param utcString ISO-8601 (Z付き) UTC文字列
   * @returns YYYY-MM-DD形式文字列
   */
  static formatDateOnly(utcString: string): string {
    const utcDate = parseISO(utcString);
    if (!isValid(utcDate)) {
      throw new Error(`Invalid UTC string: ${utcString}`);
    }
    
    return format(utcDate, 'yyyy-MM-dd');
  }
  
  /**
   * Contract曜日カラム名を取得
   * @param dayOfWeek 曜日（0: 日曜日, 1: 月曜日, ..., 6: 土曜日）
   * @returns Contract曜日カラム名
   */
  static getContractDayColumn(dayOfWeek: number): string {
    const dayColumns = [
      'sundayHours',      // 0: 日曜日
      'mondayHours',      // 1: 月曜日
      'tuesdayHours',     // 2: 火曜日
      'wednesdayHours',   // 3: 水曜日
      'thursdayHours',    // 4: 木曜日
      'fridayHours',      // 5: 金曜日
      'saturdayHours'     // 6: 土曜日
    ];
    
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error(`Invalid day of week: ${dayOfWeek}`);
    }
    
    return dayColumns[dayOfWeek];
  }
  
  /**
   * 時刻文字列（HH:MM形式）をUTC DateTime文字列に変換
   * @param timeString 時刻文字列（例："09:00"）
   * @param dateString 日付文字列（例："2025-07-09"）
   * @param isJST 入力時刻がJSTかどうか（デフォルト: true）
   * @returns ISO-8601 (Z付き) UTC文字列
   */
  static timeStringToUTC(timeString: string, dateString: string, isJST: boolean = true): string {
    const [hours, minutes] = timeString.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time string: ${timeString}`);
    }
    
    const [year, month, day] = dateString.split('-').map(Number);
    
    if (isJST) {
      // JST時刻として扱い、UTCに変換
      const jstDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      return this.jstToUTC(jstDate);
    } else {
      // 既にUTCとして扱う
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
      return formatISO(utcDate);
    }
  }
  
  /**
   * データベース保存用の現在時刻UTC取得
   * @returns データベース保存用UTC時刻
   */
  static getDBTimestamp(): Date {
    return new Date(); // Prismaが自動でUTCに変換
  }
}