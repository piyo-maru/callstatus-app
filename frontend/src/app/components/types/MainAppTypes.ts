// MainAppTypes.ts - FullMainApp関連の型定義

// Global Window interface extension
declare global {
  interface Window {
    APP_CONFIG?: {
      API_HOST: string;
    };
  }
}

// 祝日データ型
export type Holiday = {
  date: string;
  name: string;
};

// スタッフ情報型
export type Staff = {
  id: number;
  empNo?: string;  // データベーススキーマに存在するフィールド
  name: string;
  department: string;
  group: string;
  currentStatus: string;
  isActive?: boolean;
  isSupporting?: boolean;
  originalDept?: string;
  originalGroup?: string;
  currentDept?: string;
  currentGroup?: string;
  supportInfo?: {
    startDate: string;
    endDate: string;
    reason: string;
  } | null;
  responsibilities?: ResponsibilityData | null;
  hasResponsibilities?: boolean;
  isReception?: boolean;
};

// 責任者情報型
export type GeneralResponsibilityData = {
  fax: boolean;
  subjectCheck: boolean;
  custom: string;
};

export type ReceptionResponsibilityData = {
  lunch: boolean;
  fax: boolean;
  cs: boolean;
  custom: string;
};

export type ResponsibilityData = GeneralResponsibilityData | ReceptionResponsibilityData;

// スケジュール関連型
export type ScheduleFromDB = {
  id: number;
  staffId: number;
  status: string;
  start: string;
  end: string;
  memo?: string;
  layer?: 'contract' | 'adjustment';
};

export type Schedule = {
  id: number | string;
  staffId: number;
  status: string;
  start: number;
  end: number;
  memo?: string;
  layer?: 'contract' | 'adjustment' | 'historical';
  isHistorical?: boolean;
  isDragCreated?: boolean;
  // Phase 1: 楽観的更新用プロパティ
  _isOptimistic?: boolean;
  _originalId?: string | number;
  _timestamp?: number;
};

// ドラッグ操作型
export type DragInfo = {
  staff: Staff;
  startX: number;
  currentX: number;
  rowRef: HTMLDivElement;
};

// インポート履歴型
export type ImportHistory = {
  batchId: string;
  importedAt: string;
  recordCount: number;
  staffCount: number;
  staffList: string[];
  dateRange: string;
  canRollback: boolean;
};

// スナップショット履歴型
export type SnapshotHistory = {
  id: number;
  targetDate: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  recordCount: number;
  batchId: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
};

// 文字チェック結果型
export type CharacterCheckResult = {
  isValid: boolean;
  errors: Array<{
    field: string;
    value: string;
    invalidChars: string[];
    position: number;
  }>;
};

// 部署・グループ設定型
export type DepartmentGroupSetting = {
  id: number;
  type: 'department' | 'group';
  name: string;
  shortName?: string;
  backgroundColor?: string;
  displayOrder?: number;
};

// 表示設定型
export type DisplaySettings = {
  viewMode: 'normal' | 'compact';
  maskingEnabled: boolean;
  timeRange?: 'standard' | 'extended';
};

// 統一設定モーダルのプロパティ型
export type UnifiedSettingsData = {
  displaySettings: DisplaySettings;
  presets: any[];
  departmentGroups?: DepartmentGroupSetting[];
};