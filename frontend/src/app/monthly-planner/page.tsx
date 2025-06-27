'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { createPortal } from 'react-dom';
import { STATUS_COLORS, capitalizeStatus } from '../components/timeline/TimelineUtils';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import "react-datepicker/dist/react-datepicker.css";

registerLocale('ja', ja);

// 型定義
type Staff = {
  id: number;
  empNo?: string;
  name: string;
  department: string;
  group: string;
  isActive?: boolean;
};

// Pending予定データの型定義
type PendingSchedule = {
  id: number;
  staffId: number;
  staffName?: string;
  date: string;
  status: string;
  start: number;
  end: number;
  memo?: string;
  isPending: boolean;
  pendingType: 'monthly-planner' | 'manual';
  approvedBy?: { id: number; name: string };
  approvedAt?: string;
  rejectedBy?: { id: number; name: string };
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
};

// プリセット型定義
type PresetSchedule = {
  key: string;
  label: string;
  status: string;
  start: number;
  end: number;
};

// APIのURL取得
const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.APP_CONFIG?.API_HOST) {
    return window.APP_CONFIG.API_HOST;
  }
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${currentHost}:3002`;
};

// プリセット予定の定義
const presetSchedules: PresetSchedule[] = [
  { key: 'off', label: '休み', status: 'off', start: 9, end: 18 },
  { key: 'morning-off', label: '午前休', status: 'off', start: 9, end: 13 },
  { key: 'afternoon-off', label: '午後休', status: 'off', start: 13, end: 18 },
  { key: 'night-duty', label: '夜間担当', status: 'night duty', start: 18, end: 21 },
  { key: 'training', label: '研修', status: 'training', start: 9, end: 18 },
  { key: 'meeting', label: '会議', status: 'meeting', start: 10, end: 12 },
];

// 色のコントラスト計算関数
const getContrastColor = (backgroundColor: string, isTransparent: boolean = false): string => {
  // 透明背景（申請中）の場合は元の色を使用
  if (isTransparent) {
    return backgroundColor || '#333333';
  }
  
  // 背景色から明度を計算
  if (!backgroundColor || !backgroundColor.includes('#')) {
    return '#000000'; // デフォルトは黒文字
  }
  
  const color = backgroundColor.replace('#', '');
  if (color.length !== 6) {
    return '#000000'; // 不正な色形式の場合は黒文字
  }
  
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // 明度計算（YIQ公式）
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 明度が高い（明るい）色なら黒文字、低い（暗い）色なら白文字
  return brightness > 150 ? '#000000' : '#ffffff';
};

// 承認状態スタイル取得関数
const getPendingStyle = (pending: PendingSchedule, backgroundColor: string) => {
  if (pending.approvedAt) {
    // 承認済み: 塗りつぶし（現在のスタイル）
    return {
      backgroundColor,
      opacity: 0.9,
      border: '2px solid transparent'
    };
  } else if (pending.rejectedAt) {
    // 却下済み: 薄い塗りつぶし
    return {
      backgroundColor,
      opacity: 0.3,
      border: '2px solid #ef4444'
    };
  } else {
    // 申請中（承認待ち）: 枠のみ
    return {
      backgroundColor: 'transparent',
      opacity: 1,
      border: `2px dashed ${backgroundColor}`
    };
  }
};

// HTML5 Drag&Dropドラッグ可能なPending予定コンポーネント
const DraggablePending: React.FC<{
  pending: PendingSchedule;
  backgroundColor: string;
  textColor: string;
  pendingStyle: any;
  isTransparent: boolean;
  onDragStart: (pending: PendingSchedule) => void;
}> = ({ pending, backgroundColor, textColor, pendingStyle, isTransparent, onDragStart }) => {
  const canDrag = !pending.approvedAt && !pending.rejectedAt; // 未承認のみドラッグ可能

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify(pending));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(pending);
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={`w-full h-full rounded-md flex flex-col text-xs text-center pt-1 ${
        canDrag ? 'cursor-move' : 'cursor-default'
      }`}
      style={pendingStyle}
    >
      {/* 予定種別 */}
      <div 
        className="font-medium leading-none mb-0.5"
        style={{ color: textColor }}
      >
        {capitalizeStatus(pending.status)}
        {pending.approvedAt && <span className="ml-1">✓</span>}
      </div>
      
      {/* 時刻表示 */}
      <div 
        className="text-xs leading-none"
        style={{ 
          color: textColor, 
          opacity: isTransparent ? 0.8 : 0.9 
        }}
      >
        {String(pending.start).padStart(2, '0')}:00-{String(pending.end).padStart(2, '0')}:00
      </div>
    </div>
  );
};

// HTML5 Drag&Dropドロップ可能なセルコンポーネント
const DroppableCell: React.FC<{
  staffId: number;
  day: number;
  children: React.ReactNode;
  onDrop: (draggedPending: PendingSchedule, targetStaffId: number, targetDay: number) => void;
  hasContract: boolean;
}> = ({ staffId, day, children, onDrop, hasContract }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    try {
      const pendingData = e.dataTransfer.getData('application/json');
      const draggedPending: PendingSchedule = JSON.parse(pendingData);
      onDrop(draggedPending, staffId, day);
    } catch (error) {
      console.error('Failed to parse dropped data:', error);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-24 border-r border-b cursor-pointer relative overflow-hidden ${
        hasContract ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-blue-50'
      } ${
        isOver ? 'bg-blue-100 border-blue-400 border-2' : ''
      }`}
      style={{
        minHeight: '45px',
      }}
    >
      {children}
    </div>
  );
};

// 月次プランナーのメインコンポーネント
function MonthlyPlannerPageContent() {
  const { user, token } = useAuth();
  
  // 基本状態
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedPending, setDraggedPending] = useState<PendingSchedule | null>(null);
  
  // 月ナビゲーション関数
  const goToPreviousMonth = useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
  }, [currentMonth]);
  
  const goToNextMonth = useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
  }, [currentMonth]);
  
  // Pending関連状態
  const [pendingSchedules, setPendingSchedules] = useState<PendingSchedule[]>([]);
  
  // 契約スケジュール状態（月次プランナーでは不要 - プリセット登録専用）
  
  // モーダル状態
  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    staffId: number;
    staffName: string;
    day: number;
    dateString: string;
  } | null>(null);
  
  // セル選択状態（2段階操作用）
  const [selectedCellForHighlight, setSelectedCellForHighlight] = useState<{
    staffId: number;
    day: number;
  } | null>(null);
  
  // 部署・グループフィルター
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  // 部署・グループ設定
  const [departmentSettings, setDepartmentSettings] = useState<{
    departments: any[];
    groups: any[];
  }>({ departments: [], groups: [] });

  // 月の日数を取得
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentMonth]);

  // 日付の配列を生成
  const dateArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // 部署・グループマップ
  const departmentMap = useMemo(() => {
    const map = new Map<string, any>();
    departmentSettings.departments.forEach(dept => map.set(dept.name, dept));
    return map;
  }, [departmentSettings.departments]);

  const groupToStaffMap = useMemo(() => {
    const map = new Map<string, any>();
    staffList.forEach(staff => {
      if (!map.has(staff.group)) {
        map.set(staff.group, staff);
      }
    });
    return map;
  }, [staffList]);

  // フィルタリングされたスタッフリスト
  const filteredStaffList = useMemo(() => {
    return staffList.filter(staff => {
      const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
      const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
      return departmentMatch && groupMatch;
    });
  }, [staffList, selectedDepartment, selectedGroup]);

  // 部署とグループの一覧をソート済みで取得
  const sortedDepartments = useMemo(() => {
    const uniqueDepts = Array.from(new Set(staffList.map(s => s.department)));
    return uniqueDepts.sort((a, b) => {
      const settingA = departmentMap.get(a);
      const settingB = departmentMap.get(b);
      const orderA = settingA?.displayOrder || 0;
      const orderB = settingB?.displayOrder || 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b);
    });
  }, [staffList, departmentMap]);

  const sortedGroups = useMemo(() => {
    const filteredStaff = staffList.filter(s => {
      return selectedDepartment === 'all' || s.department === selectedDepartment;
    });
    const uniqueGroups = Array.from(new Set(filteredStaff.map(s => s.group)));
    
    return uniqueGroups.sort((a, b) => {
      const staffA = groupToStaffMap.get(a);
      const staffB = groupToStaffMap.get(b);
      
      if (!staffA || !staffB) return 0;
      
      const deptA = departmentMap.get(staffA.department);
      const deptB = departmentMap.get(staffB.department);
      
      const orderA = deptA?.displayOrder ?? 999;
      const orderB = deptB?.displayOrder ?? 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b, 'ja', { numeric: true });
    });
  }, [staffList, selectedDepartment, groupToStaffMap, departmentMap]);

  // スタッフを部署・グループごとにグループ化してソート
  const groupedStaffForDisplay = useMemo(() => {
    const grouped: { [department: string]: { [group: string]: Staff[] } } = {};
    
    filteredStaffList.forEach(staff => {
      const department = staff.department;
      const group = staff.group;
      if (!grouped[department]) grouped[department] = {};
      if (!grouped[department][group]) grouped[department][group] = [];
      grouped[department][group].push(staff);
    });

    // 各グループ内のスタッフをempNo順でソート
    Object.keys(grouped).forEach(department => {
      Object.keys(grouped[department]).forEach(group => {
        grouped[department][group].sort((a, b) => {
          if (!a.empNo && !b.empNo) return a.id - b.id;
          if (!a.empNo) return 1;
          if (!b.empNo) return -1;
          return a.empNo.localeCompare(b.empNo);
        });
      });
    });

    return grouped;
  }, [filteredStaffList]);

  // 部署・グループの背景色計算
  const departmentColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    departmentSettings.departments.forEach(dept => {
      if (dept.backgroundColor) {
        colors[dept.name] = dept.backgroundColor;
      }
    });
    return colors;
  }, [departmentSettings.departments]);

  const teamColors = useMemo(() => {
    const colors: { [key: string]: string } = {};
    departmentSettings.groups.forEach(group => {
      if (group.backgroundColor) {
        colors[group.name] = group.backgroundColor;
      }
    });
    return colors;
  }, [departmentSettings.groups]);

  // ソート関数
  const sortByDisplayOrder = useCallback((entries: [string, any][], type: 'department' | 'group') => {
    return entries.sort((a, b) => {
      const aName = a[0];
      const bName = b[0];
      
      const aSettings = departmentSettings[type === 'department' ? 'departments' : 'groups'].find(s => s.name === aName);
      const bSettings = departmentSettings[type === 'department' ? 'departments' : 'groups'].find(s => s.name === bName);
      
      const aOrder = aSettings?.displayOrder || 0;
      const bOrder = bSettings?.displayOrder || 0;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return aName.localeCompare(bName);
    });
  }, [departmentSettings]);

  // スタッフデータを取得
  const fetchStaffData = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/staff`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStaffList(data.filter((staff: Staff) => staff.isActive !== false));
      }
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
    }
  }, [token]);

  // 部署・グループ設定を取得
  const fetchDepartmentSettings = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/department-settings`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartmentSettings(data);
      }
    } catch (error) {
      console.warn('Failed to fetch department settings:', error);
    }
  }, [token]);

  // Pending取得関数（月次プランナー専用API使用）
  const fetchPendingSchedules = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/monthly-planner?year=${year}&month=${month}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data: PendingSchedule[] = await response.json();
        console.log(`Monthly planner: fetched ${data.length} pending schedules for ${year}-${month}`);
        setPendingSchedules(data);
      } else {
        console.error('Failed to fetch pending schedules:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch pending schedules:', error);
    }
  }, [currentMonth]);

  // 契約レイヤースケジュール取得無効化（最軽量）
  const fetchContractSchedules = useCallback(async () => {
    // 月次プランナーはプリセット登録専用なので契約背景色は不要
    // パフォーマンス優先で契約データ取得を無効化
    console.log('Contract schedules: Disabled for monthly planner performance');
  }, []);

  // セルクリック処理（2段階操作）
  const handleCellClick = useCallback((staff: Staff, day: number) => {
    const currentSelection = selectedCellForHighlight;
    
    // 同じセルを再度クリックした場合はモーダルを表示
    if (currentSelection && 
        currentSelection.staffId === staff.id && 
        currentSelection.day === day) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // 承認済み予定があるセルでは編集を制限
      const approvedPending = pendingSchedules.find(pending => {
        const pendingDate = new Date(pending.date).toISOString().split('T')[0];
        return pending.staffId === staff.id && 
               pendingDate === dateString &&
               pending.approvedAt;
      });

      if (approvedPending) {
        alert('承認済み予定があるため編集できません。');
        return;
      }
      
      setSelectedCell({
        staffId: staff.id,
        staffName: staff.name,
        day,
        dateString
      });
      setShowModal(true);
    } else {
      // 初回クリックまたは別のセルクリック時は選択状態にする
      setSelectedCellForHighlight({
        staffId: staff.id,
        day
      });
    }
  }, [currentMonth, selectedCellForHighlight, pendingSchedules]);

  // プリセット適用
  const applyPreset = useCallback(async (preset: PresetSchedule) => {
    if (!selectedCell) return;

    // 該当セルに承認済み予定があるかチェック
    const approvedPending = pendingSchedules.find(pending => {
      const pendingDate = new Date(pending.date).toISOString().split('T')[0];
      return pending.staffId === selectedCell.staffId && 
             pendingDate === selectedCell.dateString &&
             pending.approvedAt;
    });

    if (approvedPending) {
      alert('承認済み予定があるため編集できません。');
      return;
    }

    // 該当セルに既存のpending予定があるかチェック
    const existingPending = pendingSchedules.find(pending => {
      const pendingDate = new Date(pending.date).toISOString().split('T')[0];
      return pending.staffId === selectedCell.staffId && 
             pendingDate === selectedCell.dateString &&
             !pending.approvedAt && 
             !pending.rejectedAt;
    });

    if (existingPending) {
      alert('このマスには既にpending予定が設定されています。先に既存の予定を削除してください。');
      return;
    }

    try {
      const currentApiUrl = getApiUrl();
      
      const pendingData = {
        staffId: selectedCell.staffId,
        date: selectedCell.dateString,
        status: preset.status,
        start: preset.start,
        end: preset.end,
        memo: `月次プランナー: ${preset.label}`,
        pendingType: 'monthly-planner' as const
      };

      const response = await fetch(`${currentApiUrl}/api/schedules/pending`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(pendingData)
      });

      if (response.ok) {
        alert(`${preset.label}のPending予定を作成しました（承認待ち）`);
        await fetchPendingSchedules();
      } else {
        alert('Pending予定の作成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create pending:', error);
      alert('Pending予定の作成に失敗しました');
    }

    setShowModal(false);
    setSelectedCell(null);
    setSelectedCellForHighlight(null);
  }, [selectedCell, pendingSchedules, fetchPendingSchedules]);

  // 予定クリア
  const clearSchedule = useCallback(async () => {
    if (!selectedCell) return;

    // 該当セルのpendingを削除
    const cellPendings = pendingSchedules.filter(pending => {
      const pendingDate = new Date(pending.date).toISOString().split('T')[0];
      return pending.staffId === selectedCell.staffId && pendingDate === selectedCell.dateString;
    });

    if (cellPendings.length === 0) {
      alert('削除する予定がありません');
      setShowModal(false);
      return;
    }

    // 承認済み予定があるかチェック
    const approvedPendings = cellPendings.filter(pending => pending.approvedAt);
    const deletablePendings = cellPendings.filter(pending => !pending.approvedAt && !pending.rejectedAt);

    if (approvedPendings.length > 0) {
      alert('承認済み予定があるため削除できません。');
      setShowModal(false);
      return;
    }

    if (deletablePendings.length === 0) {
      alert('削除可能な予定がありません');
      setShowModal(false);
      return;
    }

    if (!confirm(`${deletablePendings.length}件のPending予定を削除しますか？`)) return;

    try {
      const currentApiUrl = getApiUrl();
      
      for (const pending of deletablePendings) {
        await fetch(`${currentApiUrl}/api/schedules/pending/${pending.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      alert('Pending予定を削除しました');
      await fetchPendingSchedules();
    } catch (error) {
      console.error('Failed to delete pending:', error);
      alert('削除に失敗しました');
    }

    setShowModal(false);
    setSelectedCell(null);
    setSelectedCellForHighlight(null);
  }, [selectedCell, pendingSchedules, fetchPendingSchedules]);

  // セル内のスケジュール取得関数
  const getCellPendings = useCallback((staffId: number, day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return pendingSchedules.filter(pending => {
      const pendingDate = new Date(pending.date).toISOString().split('T')[0];
      return pending.staffId === staffId && pendingDate === dateString;
    });
  }, [currentMonth, pendingSchedules]);

  // セルにpending予定があるかチェック（未承認のみ）
  const hasPendingInCell = useCallback((staffId: number, day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return pendingSchedules.some(pending => {
      const pendingDate = new Date(pending.date).toISOString().split('T')[0];
      return pending.staffId === staffId && 
             pendingDate === dateString &&
             !pending.approvedAt && 
             !pending.rejectedAt;
    });
  }, [currentMonth, pendingSchedules]);

  // 契約スケジュール有無判定関数
  const hasContractSchedule = useCallback((staffId: number, day: number) => {
    // 軽量な契約判定：曜日ベースでの基本判定
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0=日曜, 6=土曜
    
    // 基本的に平日は契約勤務あり、土日は契約勤務なし
    // （将来的には実際の契約データを参照可能）
    return dayOfWeek >= 1 && dayOfWeek <= 5; // 月〜金のみ
  }, [currentMonth]);

  // Pending予定のドラッグ&ドロップ処理
  const handlePendingDrop = useCallback(async (draggedPending: PendingSchedule, targetStaffId: number, targetDay: number) => {
    if (draggedPending.staffId !== targetStaffId) {
      // 異なるスタッフには移動不可
      alert('同じスタッフの予定のみ移動できます');
      return;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const targetDateString = `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
    
    // 元の日付と同じ場合は何もしない
    const originalDate = new Date(draggedPending.date).toISOString().split('T')[0];
    if (originalDate === targetDateString) {
      return;
    }

    try {
      const currentApiUrl = getApiUrl();
      
      // 移動先に承認済み予定があるかチェック
      const approvedPendings = pendingSchedules.filter(p => {
        const pDate = new Date(p.date).toISOString().split('T')[0];
        return p.staffId === targetStaffId && pDate === targetDateString && p.approvedAt;
      });

      if (approvedPendings.length > 0) {
        alert('承認済み予定があるため移動できません。');
        return;
      }
      
      // 移動先に既存のpending予定があるかチェック
      const targetPendings = pendingSchedules.filter(p => {
        const pDate = new Date(p.date).toISOString().split('T')[0];
        return p.staffId === targetStaffId && pDate === targetDateString && !p.approvedAt && !p.rejectedAt;
      });

      if (targetPendings.length > 0) {
        // 重複拒否：1つのマスには1つのpending予定のみ
        alert(`${targetDay}日には既にpending予定が設定されています。先に既存の予定を削除してください。`);
        return;
      }

      // ドラッグされた予定を新しい日付に移動
      const response = await fetch(`${currentApiUrl}/api/schedules/pending/${draggedPending.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: targetDateString
        })
      });

      if (response.ok) {
        alert('予定を移動しました');
        await fetchPendingSchedules();
      } else {
        alert('予定の移動に失敗しました');
      }
    } catch (error) {
      console.error('Failed to move pending:', error);
      alert('予定の移動に失敗しました');
    }
  }, [currentMonth, pendingSchedules, fetchPendingSchedules]);

  // 初期データ取得
  useEffect(() => {
    fetchStaffData();
    fetchDepartmentSettings();
  }, [fetchStaffData, fetchDepartmentSettings]);

  // 月が変更された時にpendingデータを取得（契約データ無効化）
  useEffect(() => {
    if (staffList.length > 0) {
      fetchPendingSchedules();
    }
  }, [currentMonth, staffList, fetchPendingSchedules]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー - 個人ページと同じレイアウト */}
      <div className="bg-white border-b border-gray-200">
        {/* タイトル行 */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">月次プランナー</h1>
            <div className="text-sm text-gray-600">
              トグル
            </div>
          </div>
        </div>
        
        {/* ナビゲーション行 */}
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button 
                type="button" 
                onClick={goToPreviousMonth}
                className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 h-7"
              >
                &lt;
              </button>
              <button 
                type="button" 
                onClick={() => setCurrentMonth(new Date())}
                className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 h-7"
              >
                今月
              </button>
              <button 
                type="button" 
                onClick={goToNextMonth}
                className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 h-7"
              >
                &gt;
              </button>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </h2>
          </div>
        </div>

        {/* フィルター行 */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center space-x-6">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-2 py-1 text-sm border-0 bg-transparent text-gray-700"
          >
            <option value="all">すべての部署</option>
            {sortedDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-2 py-1 text-sm border-0 bg-transparent text-gray-700"
          >
            <option value="all">すべてのグループ</option>
            {sortedGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">読み込み中...</div>
            </div>
          ) : (
            <div className="min-w-max">
              <div className="flex">
                {/* 左側：スタッフ一覧 */}
                <div className="min-w-fit max-w-[400px] sticky left-0 z-20 bg-white border-r border-gray-200">
                  {/* ヘッダー */}
                  <div className="px-2 py-3 bg-gray-100 font-bold text-gray-600 text-sm text-center border-b whitespace-nowrap">
                    部署 / グループ / スタッフ名
                  </div>
                  
                  {/* スタッフリスト */}
                  {Object.keys(groupedStaffForDisplay).length > 0 ? (
                    sortByDisplayOrder(Object.entries(groupedStaffForDisplay), 'department').map(([department, groups]) => (
                      <div key={department} className="department-group">
                        <h3 
                          className="px-2 min-h-[33px] text-sm font-bold whitespace-nowrap flex items-center" 
                          style={{backgroundColor: departmentColors[department] || '#f5f5f5'}}
                        >
                          {department}
                        </h3>
                        {sortByDisplayOrder(Object.entries(groups), 'group').map(([group, staffInGroup]) => (
                          <div key={group}>
                            <h4 
                              className="px-2 pl-6 min-h-[33px] text-xs font-semibold whitespace-nowrap flex items-center" 
                              style={{backgroundColor: teamColors[group] || '#f5f5f5'}}
                            >
                              {group}
                            </h4>
                            {staffInGroup.map((staff: any) => (
                              <div 
                                key={staff.id} 
                                className="px-2 pl-12 text-sm font-medium whitespace-nowrap h-[45px] hover:bg-gray-50 flex items-center border-b"
                              >
                                <span className="staff-name">{staff.name}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 whitespace-nowrap">
                      表示対象のスタッフがいません。
                    </div>
                  )}
                </div>

                {/* 右側：日付グリッド */}
                <div className="flex-1 flex flex-col">
                  {/* 日付ヘッダー */}
                  <div className="sticky top-0 z-10 bg-gray-100 border-b">
                    <div className="flex">
                      {dateArray.map(day => {
                        const year = currentMonth.getFullYear();
                        const month = currentMonth.getMonth();
                        const date = new Date(year, month, day);
                        const dayOfWeek = date.getDay();
                        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                        const getTextColor = () => {
                          if (dayOfWeek === 0) return 'text-red-600'; // 日曜日は赤
                          if (dayOfWeek === 6) return 'text-blue-600'; // 土曜日は青
                          return 'text-gray-800'; // 平日は通常色
                        };
                        
                        return (
                          <div
                            key={day}
                            className={`w-24 px-2 py-2 text-center font-bold text-xs border-r ${getTextColor()}`}
                          >
                            <div>{day}日</div>
                            <div className="text-xs font-normal">
                              ({dayNames[dayOfWeek]})
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* セルグリッド */}
                  <div className="flex-1">
                    {Object.keys(groupedStaffForDisplay).length > 0 ? (
                      sortByDisplayOrder(Object.entries(groupedStaffForDisplay), 'department').map(([department, groups]) => (
                        <div key={department}>
                          {/* 部署ヘッダー行 */}
                          <div className="flex h-[33px]">
                            {dateArray.map(day => (
                              <div key={day} className="w-24 border-r border-b bg-gray-50"></div>
                            ))}
                          </div>
                          
                          {sortByDisplayOrder(Object.entries(groups), 'group').map(([group, staffInGroup]) => (
                            <div key={group}>
                              {/* グループヘッダー行 */}
                              <div className="flex h-[33px]">
                                {dateArray.map(day => (
                                  <div key={day} className="w-24 border-r border-b bg-gray-50"></div>
                                ))}
                              </div>
                              
                              {/* スタッフ行 */}
                              {staffInGroup.map((staff: any) => (
                                <div key={staff.id} className="flex h-[45px]">
                                  {dateArray.map(day => {
                                    const pendings = getCellPendings(staff.id, day);
                                    const hasContract = hasContractSchedule(staff.id, day);
                                    
                                    return (
                                      <DroppableCell
                                        key={day}
                                        staffId={staff.id}
                                        day={day}
                                        onDrop={handlePendingDrop}
                                        hasContract={hasContract}
                                      >
                                        <div
                                          onClick={() => handleCellClick(staff, day)}
                                          className={`w-full h-full relative cursor-pointer ${
                                            selectedCellForHighlight?.staffId === staff.id && 
                                            selectedCellForHighlight?.day === day
                                              ? 'ring-2 ring-blue-500 ring-inset bg-blue-50'
                                              : 'hover:bg-gray-100'
                                          }`}
                                        >
                                          {/* Pendingスケジュール表示 */}
                                          {pendings.map((pending) => {
                                            const backgroundColor = STATUS_COLORS[pending.status] || '#f3f4f6';
                                            const pendingStyle = getPendingStyle(pending, backgroundColor);
                                            const isTransparent = pendingStyle.backgroundColor === 'transparent';
                                            const textColor = getContrastColor(backgroundColor, isTransparent);
                                            
                                            return (
                                              <div key={`pending-${pending.id}`} className="absolute inset-1 flex items-center justify-center z-10">
                                                <DraggablePending
                                                  pending={pending}
                                                  backgroundColor={backgroundColor}
                                                  textColor={textColor}
                                                  pendingStyle={pendingStyle}
                                                  isTransparent={isTransparent}
                                                  onDragStart={setDraggedPending}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </DroppableCell>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-gray-500">表示対象のスタッフがいません。</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* プリセット選択モーダル */}
      {showModal && selectedCell && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  予定登録
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCellForHighlight(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{selectedCell.staffName}</span> さんの
                  <span className="font-medium">{selectedCell.day}日</span> の予定
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-gray-700">プリセット予定を選択</h4>
                {presetSchedules.map(preset => (
                  <button
                    key={preset.key}
                    onClick={() => applyPreset(preset)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center"
                  >
                    <div
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: STATUS_COLORS[preset.status] }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{preset.label}</div>
                      <div className="text-sm text-gray-500">
                        {preset.start}:00 - {preset.end}:00
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={clearSchedule}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  予定クリア
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCellForHighlight(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// メインコンポーネント
export default function MonthlyPlannerPage() {
  return <MonthlyPlannerPageContent />;
}