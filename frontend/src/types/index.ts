// 型定義ファイル
export type Staff = {
  id: number;
  empNo: string | null;
  name: string;
  department: string;
  group: string;
  isActive: boolean;
  deletedAt: string | null;
  currentStatus?: string;
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

export type Schedule = {
  id: number;
  status: string;
  start: string;
  end: string;
  memo: string | null;
  staffId: number;
  layer?: 'contract' | 'adjustment';
  source?: string;
  canMove?: boolean;
};

export type ResponsibilityData = {
  fax: boolean;
  subjectCheck: boolean;
  custom: string;
};

export type StatusColors = {
  [key: string]: string;
};

export const STATUS_COLORS: StatusColors = {
  'Online': 'bg-green-500',
  'Remote': 'bg-blue-500',
  'Meeting': 'bg-yellow-500',
  'Training': 'bg-purple-500',
  'Break': 'bg-gray-400',
  'Off': 'bg-red-500',
  'Unplanned': 'bg-red-700',
  'Night Duty': 'bg-indigo-600'
};

export type ImportResult = {
  added: number;
  updated: number;
  deleted: number;
  details: {
    added: string[];
    updated: string[];
    deleted: string[];
  };
  error?: boolean;
  message?: string;
};