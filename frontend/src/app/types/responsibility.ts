// 担当設定関連の統一型定義
export interface ResponsibilityData {
  fax?: boolean;
  custom?: string;
}

export interface GeneralResponsibilityData extends ResponsibilityData {
  subjectCheck?: boolean;
}

export interface ReceptionResponsibilityData extends ResponsibilityData {
  lunch?: boolean;
  cs?: boolean;
}

// 担当設定モーダルのプロパティ型
export interface ResponsibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: {
    id: number;
    name: string;
    department: string;
    group: string;
  };
  selectedDate: Date;
  onSave: (data: ResponsibilityData) => void;
  existingData?: ResponsibilityData | null;
}

// 担当設定バッジのプロパティ型
export interface ResponsibilityBadgesProps {
  responsibilities: ResponsibilityData | null;
  isReception: boolean;
}