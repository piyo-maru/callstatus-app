import { format } from 'date-fns';

// 受付部署判定（統一ロジック）
export const isReceptionStaff = (staff: { department: string; group: string }): boolean => {
  return staff.department.includes('受付') || staff.group.includes('受付');
};

// 担当設定データのキー生成（統一形式）
export const createResponsibilityKey = (staffId: number, date: Date): string => {
  return `${staffId}-${format(date, 'yyyy-MM-dd')}`;
};

// 担当設定データの存在確認
export const hasResponsibilityData = (data: any): boolean => {
  if (!data) {
    return false;
  }
  
  const hasGeneral = data.fax || data.subjectCheck || (data.custom && data.custom.trim());
  const hasReception = data.lunch || data.cs;
  return hasGeneral || hasReception;
};

// 部署に応じた担当設定の初期化
export const initializeResponsibilityData = (isReception: boolean) => {
  if (isReception) {
    return {
      lunch: false,
      fax: false,
      cs: false,
      custom: ''
    };
  } else {
    return {
      fax: false,
      subjectCheck: false,
      custom: ''
    };
  }
};