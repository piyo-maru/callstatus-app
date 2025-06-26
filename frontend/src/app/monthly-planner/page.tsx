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

// 月次プランナーでは予定データは参照しない（削除）

type SelectedCell = {
  staffId: number;
  date: string;
};

// APIのURL取得
const getApiUrl = (): string => {
  if (typeof window !== 'undefined' && window.APP_CONFIG?.API_HOST) {
    return window.APP_CONFIG.API_HOST;
  }
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${currentHost}:3002`;
};

// 月次プランナーのメインコンポーネント
export default function MonthlyPlannerPage() {
  const { user, token } = useAuth();
  
  // 基本状態
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // セル選択状態
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // 部署・グループフィルター（メイン画面と同様）
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  // 部署・グループ設定
  const [departmentSettings, setDepartmentSettings] = useState<{
    departments: any[];
    groups: any[];
  }>({ departments: [], groups: [] });

  // プリセット予定の定義
  const presetSchedules = [
    { key: 'off', label: '休み', status: 'off', start: 9, end: 18 },
    { key: 'morning-off', label: '午前休', status: 'off', start: 9, end: 13 },
    { key: 'afternoon-off', label: '午後休', status: 'off', start: 13, end: 18 },
    { key: 'night-duty', label: '夜間担当', status: 'night duty', start: 18, end: 21 },
    { key: 'training', label: '研修', status: 'training', start: 9, end: 18 },
    { key: 'meeting', label: '会議', status: 'meeting', start: 10, end: 12 },
  ];

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

  // 部署・グループマップ（パフォーマンス最適化）
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

  // フィルタリングされたスタッフリスト（メイン画面と同様）
  const filteredStaffList = useMemo(() => {
    return staffList.filter(staff => {
      const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
      const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
      return departmentMatch && groupMatch;
    });
  }, [staffList, selectedDepartment, selectedGroup]);

  // 部署とグループの一覧をソート済みで取得（メイン画面と同様）
  const sortedDepartments = useMemo(() => {
    const uniqueDepts = [...new Set(staffList.map(s => s.department))];
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
    const uniqueGroups = [...new Set(filteredStaff.map(s => s.group))];
    
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

  // スタッフを部署・グループごとにグループ化してソート（メイン画面と完全に同じロジック）
  const groupedStaffForDisplay = useMemo(() => {
    const grouped: { [department: string]: { [group: string]: Staff[] } } = {};
    
    filteredStaffList.forEach(staff => {
      // メイン画面と同様：支援中でも元の部署/グループの位置に表示
      const department = staff.department;
      const group = staff.group;
      if (!grouped[department]) grouped[department] = {};
      if (!grouped[department][group]) grouped[department][group] = [];
      grouped[department][group].push(staff);
    });

    // 各グループ内のスタッフをempNo順でソート（メイン画面と同じ）
    Object.keys(grouped).forEach(department => {
      Object.keys(grouped[department]).forEach(group => {
        grouped[department][group].sort((a, b) => {
          // empNoがない場合は後ろに配置
          if (!a.empNo && !b.empNo) return a.id - b.id;
          if (!a.empNo) return 1;
          if (!b.empNo) return -1;
          return a.empNo.localeCompare(b.empNo);
        });
      });
    });

    return grouped;
  }, [filteredStaffList]);

  // 部署・グループの背景色計算（メイン画面と同様）
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

  // ソート関数（メイン画面と完全に同じロジック）
  const sortByDisplayOrder = useCallback((entries: [string, any][], type: 'department' | 'group') => {
    return entries.sort((a, b) => {
      const aName = a[0];
      const bName = b[0];
      
      const aSettings = departmentSettings[type === 'department' ? 'departments' : 'groups'].find(s => s.name === aName);
      const bSettings = departmentSettings[type === 'department' ? 'departments' : 'groups'].find(s => s.name === bName);
      
      const aOrder = aSettings?.displayOrder || 0;
      const bOrder = bSettings?.displayOrder || 0;
      
      // displayOrderで比較、同じ場合は名前順
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
          'Authorization': `Bearer ${token}`,
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

  // 部署・グループ設定を取得（メイン画面と同様）
  const fetchDepartmentSettings = useCallback(async () => {
    try {
      const currentApiUrl = getApiUrl();
      const response = await fetch(`${currentApiUrl}/api/department-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  // セルクリック処理
  const handleCellClick = useCallback((staffId: number, day: number, event: React.MouseEvent) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const cellKey = { staffId, date: dateString };
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+クリックで複数選択
      setSelectedCells(prev => {
        const exists = prev.some(cell => cell.staffId === staffId && cell.date === dateString);
        if (exists) {
          return prev.filter(cell => !(cell.staffId === staffId && cell.date === dateString));
        } else {
          return [...prev, cellKey];
        }
      });
    } else {
      // 通常クリックで単一選択
      setSelectedCells([cellKey]);
    }
  }, [currentMonth]);

  // プリセットメニュー表示
  const showPresetMenuHandler = useCallback((event: React.MouseEvent) => {
    if (selectedCells.length === 0) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowPresetMenu(true);
  }, [selectedCells]);

  // プリセット適用
  const applyPreset = useCallback(async (preset: typeof presetSchedules[0]) => {
    if (selectedCells.length === 0) return;

    try {
      const currentApiUrl = getApiUrl();
      
      // 選択されたセルに対してスケジュールを作成
      const createPromises = selectedCells.map(async (cell) => {
        const scheduleData = {
          staffId: cell.staffId,
          date: cell.date,
          status: preset.status,
          start: preset.start,
          end: preset.end,
          memo: preset.label
        };

        const response = await fetch(`${currentApiUrl}/api/schedules`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(scheduleData)
        });

        return response.ok;
      });

      const results = await Promise.all(createPromises);
      const successCount = results.filter(Boolean).length;
      
      if (successCount > 0) {
        alert(`${successCount}件の予定を作成しました`);
      }
    } catch (error) {
      console.error('Failed to apply preset:', error);
      alert('予定の作成に失敗しました');
    }

    setSelectedCells([]);
    setShowPresetMenu(false);
  }, [selectedCells, token]);

  // セルの選択状態判定
  const isCellSelected = useCallback((staffId: number, day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return selectedCells.some(cell => cell.staffId === staffId && cell.date === dateString);
  }, [selectedCells, currentMonth]);

  // 初期データ取得
  useEffect(() => {
    fetchStaffData();
    fetchDepartmentSettings();
  }, [fetchStaffData, fetchDepartmentSettings]);

  // メニューを閉じる
  useEffect(() => {
    const handleClickOutside = () => {
      setShowPresetMenu(false);
    };

    if (showPresetMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showPresetMenu]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">📅 月次プランナー</h1>
            <DatePicker
              selected={currentMonth}
              onChange={(date: Date | null) => date && setCurrentMonth(date)}
              dateFormat="yyyy年MM月"
              showMonthYearPicker
              locale="ja"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="flex items-center space-x-4">
            {selectedCells.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedCells.length}セル選択中
                </span>
                <button
                  onClick={showPresetMenuHandler}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  予定設定
                </button>
                <button
                  onClick={() => setSelectedCells([])}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  選択解除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* フィルター（メイン画面と同様） */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">部署</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="all">すべて</option>
              {sortedDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">グループ</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="all">すべて</option>
              {sortedGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
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
                {/* 左側：スタッフ一覧（メイン画面と同様の階層構造） */}
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
                            {staffInGroup.map(staff => (
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
                      {dateArray.map(day => (
                        <div
                          key={day}
                          className="w-20 px-2 py-3 text-center font-bold text-xs border-r"
                        >
                          {day}日
                        </div>
                      ))}
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
                              <div key={day} className="w-20 border-r border-b bg-gray-50"></div>
                            ))}
                          </div>
                          
                          {sortByDisplayOrder(Object.entries(groups), 'group').map(([group, staffInGroup]) => (
                            <div key={group}>
                              {/* グループヘッダー行 */}
                              <div className="flex h-[33px]">
                                {dateArray.map(day => (
                                  <div key={day} className="w-20 border-r border-b bg-gray-50"></div>
                                ))}
                              </div>
                              
                              {/* スタッフ行 */}
                              {staffInGroup.map(staff => (
                                <div key={staff.id} className="flex h-[45px]">
                                  {dateArray.map(day => {
                                    const isSelected = isCellSelected(staff.id, day);
                                    return (
                                      <div
                                        key={day}
                                        onClick={(e) => handleCellClick(staff.id, day, e)}
                                        className={`
                                          w-20 border-r border-b cursor-pointer relative
                                          ${isSelected ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-100'}
                                        `}
                                      >
                                        {/* セル内容は空（予定データは参照しない） */}
                                      </div>
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

      {/* プリセットメニュー */}
      {showPresetMenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed bg-white shadow-lg border rounded-md py-2 z-50"
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            minWidth: '160px'
          }}
        >
          <div className="px-3 py-1 text-xs font-medium text-gray-500 border-b">
            予定を設定
          </div>
          {presetSchedules.map(preset => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
            >
              <div
                className="w-3 h-3 rounded mr-2"
                style={{ backgroundColor: STATUS_COLORS[preset.status] }}
              />
              {preset.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}