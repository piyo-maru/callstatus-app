'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { io, Socket } from 'socket.io-client';

// --- 型定義 (Type Definitions) ---
type Staff = {
  id: number;
  name: string;
  department: string;
  group: string;
};

type ScheduleFromDB = {
  id: number;
  staffId: number;
  status: string;
  start: string;
  end: string;
};

type Schedule = {
  id: number;
  staffId: number;
  status: string;
  start: number;
  end: number;
};

// --- 定数 (Constants) ---
const statusColors: { [key: string]: string } = {
  'Online': '#22c55e', 'Meeting': '#f59e0b', 'Training': '#3b82f6',
  'Break': '#f97316', 'Off': '#ef4444', 'Night Duty': '#4f46e5',
};
const apiUrl = 'http://localhost:3002';
const availableStatuses = ['Online', 'Meeting', 'Training', 'Break', 'Off', 'Night Duty'];

// --- スケジュール登録モーダル (Schedule Creation Modal) ---
const ScheduleModal = ({ isOpen, onClose, staffList, onSave }: { isOpen: boolean; onClose: () => void; staffList: Staff[]; onSave: (data: any) => void; }) => {
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState('Online');
  const [startHour, setStartHour] = useState('9');
  const [endHour, setEndHour] = useState('10');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!staffId || parseInt(startHour) >= parseInt(endHour)) {
      console.error("Invalid input. Please check the form.");
      return;
    }
    onSave({
      staffId: parseInt(staffId),
      status,
      start: parseInt(startHour),
      end: parseInt(endHour),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
        <h3 className="text-lg font-medium leading-6 text-gray-900">予定を追加</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="staff" className="block text-sm font-medium text-gray-700">スタッフ</label>
            <select id="staff" value={staffId} onChange={e => setStaffId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
              <option value="" disabled>選択してください</option>
              {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">ステータス</label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
              {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700">開始</label>
              <select id="start" value={startHour} onChange={e => setStartHour(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                {Array.from({ length: 10 }, (_, i) => i + 9).map(h => <option key={h} value={h}>{`${h}:00`}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700">終了</label>
              <select id="end" value={endHour} onChange={e => setEndHour(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                {Array.from({ length: 10 }, (_, i) => i + 10).map(h => <option key={h} value={h}>{`${h}:00`}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">キャンセル</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">保存</button>
        </div>
      </div>
    </div>
  );
};

// --- 削除確認モーダル (Deletion Confirmation Modal) ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; message: string; }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-medium leading-6 text-gray-900">確認</h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-500">{message}</p>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">キャンセル</button>
                    <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">削除</button>
                </div>
            </div>
        </div>
    );
};


// --- スタッフ一行を描画するコンポーネント (Staff Row Component) ---
const StaffRow = ({ staff, staffSchedules, timeSlots, slotWidth, onDeleteClick }: { staff: Staff; staffSchedules: Schedule[]; timeSlots: number[]; slotWidth: number; onDeleteClick: (id: number, status: string) => void; }) => {
  return (
    <div className="grid grid-cols-[150px_repeat(11,1fr)] gap-px items-center min-h-[50px] hover:bg-gray-50 border-t border-gray-100">
      <div className="p-2 pl-12 text-sm font-normal whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10">{staff.name}</div>
      <div className="col-span-11 h-full relative">
        {timeSlots.slice(0, -1).map((_, index) => (<div key={index} className="absolute h-full border-r border-gray-200" style={{ left: `${(index + 1) * slotWidth}%`, top: 0 }}></div>))}
        {staffSchedules.map((schedule) => {
          const isNightDuty = schedule.status === 'Night Duty';
          const barWidth = isNightDuty ? 100 - ((schedule.start - 9) * slotWidth) : (schedule.end - schedule.start) * slotWidth;
          return (
            <div
              key={schedule.id}
              className={`absolute h-6 rounded text-white text-xs flex items-center justify-center cursor-pointer hover:opacity-80 transition-all duration-200`}
              style={{ left: `${(schedule.start - 9) * slotWidth}%`, width: `${barWidth}%`, top: '50%', transform: 'translateY(-50%)', backgroundColor: statusColors[schedule.status] || '#9ca3af' }}
              onClick={() => onDeleteClick(schedule.id, schedule.status)}
            >
              <span className="px-1">{schedule.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- メインのコンポーネント (Home Component) ---
export default function Home() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: number, status: string } | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentTime, setCurrentTime] = useState(10.5);
  const [isLoading, setIsLoading] = useState(true);

  // Data fetching logic
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/schedules`);
      if (!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`);
      const data: { staff: Staff[], schedules: ScheduleFromDB[] } = await res.json();
      setStaffList(data.staff);
      const formattedSchedules = data.schedules.map(s => ({ ...s, start: new Date(s.start).getUTCHours(), end: new Date(s.end).getUTCHours() }));
      setSchedules(formattedSchedules);
    } catch (error) { console.error('データの取得に失敗しました', error); } 
    finally { setIsLoading(false); }
  }, []);

  // Effect for initial data fetch and WebSocket connection
  useEffect(() => {
    fetchData();
    const socket: Socket = io(apiUrl);
    socket.on('connect_error', (err) => console.error('Socket接続エラー:', err.message));
    socket.on('schedule:new', (newSchedule: ScheduleFromDB) => {
      const formattedSchedule: Schedule = { ...newSchedule, start: new Date(newSchedule.start).getUTCHours(), end: new Date(newSchedule.end).getUTCHours() };
      setSchedules((prevSchedules) => [...prevSchedules, formattedSchedule]);
    });
    socket.on('schedule:deleted', (deletedScheduleId: number) => {
      setSchedules((prevSchedules) => prevSchedules.filter(s => s.id !== deletedScheduleId));
    });
    return () => { socket.disconnect(); };
  }, [fetchData]);

  // Handler for saving a new schedule
  const handleSaveSchedule = async (newScheduleData: any) => {
    try {
      await fetch(`${apiUrl}/api/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newScheduleData), });
    } catch (error) { console.error('予定の追加に失敗しました', error); }
  };

  // Handler for deleting a schedule
  const handleDeleteSchedule = async (id: number) => {
    try {
      await fetch(`${apiUrl}/api/schedules/${id}`, { method: 'DELETE', });
    } catch (error) { console.error('予定の削除に失敗しました', error); }
    setDeleteConfirmation(null); // Close modal after deletion
  };

  // Memoized filtered staff list
  const filteredStaff = useMemo(() => {
    const isAvailableAtCurrentTime = (staffId: number) => {
      const currentHour = Math.floor(currentTime);
      return schedules.some(s => s.staffId === staffId && s.status === 'Online' && s.start <= currentHour && s.end > currentHour);
    };
    return staffList.filter(staff => {
      const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
      const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
      const statusMatch = selectedStatus === 'all' || (selectedStatus === 'available' && isAvailableAtCurrentTime(staff.id)) || (selectedStatus === 'unavailable' && !isAvailableAtCurrentTime(staff.id));
      return departmentMatch && groupMatch && statusMatch;
    });
  }, [staffList, schedules, selectedDepartment, selectedGroup, selectedStatus, currentTime]);

  // Memoized grouped staff list with specific ordering
  const groupedStaff = useMemo(() => {
    const departmentOrder = ["財務情報第一システムサポート課", "財務情報第二システムサポート課", "税務情報システムサポート課", "給与計算システムサポート課", "ＯＭＳ・テクニカルサポート課", "一次受付サポート課"];
    const groupOrder: Record<string, string[]> = {
        "財務情報第一システムサポート課": ["財務会計グループ", "ＦＸ２グループ", "ＦＸ２・ＦＸ４クラウドグループ", "業種別システムグループ"],
        "財務情報第二システムサポート課": ["ＦＸクラウドグループ", "ＳＸ・ＦＭＳグループ"],
        "税務情報システムサポート課": ["税務情報第一システムグループ", "税務情報第二システムグループ"],
        "給与計算システムサポート課": ["ＰＸ第一グループ", "ＰＸ第二グループ", "ＰＸ第三グループ"],
        "ＯＭＳ・テクニカルサポート課": ["ＯＭＳグループ", "ハードウェアグループ"],
        "一次受付サポート課": ["一次受付グループ"]
    };
    const grouped = filteredStaff.reduce((acc, staff) => {
      const { department, group } = staff;
      if (!acc[department]) { acc[department] = {}; }
      if (!acc[department][group]) { acc[department][group] = []; }
      acc[department][group].push(staff);
      return acc;
    }, {} as Record<string, Record<string, Staff[]>>);
    return departmentOrder
      .filter(dep => grouped[dep])
      .map(dep => {
        const groups = grouped[dep];
        const sortedGroups = (groupOrder[dep] || [])
          .filter(group => groups[group])
          .map(group => ({ groupName: group, staff: groups[group] }));
        return { department: dep, groups: sortedGroups };
      });
  }, [filteredStaff]);
  
  // Memoized values for timeline and filters
  const timeSlots = useMemo(() => Array.from({ length: 11 }, (_, i) => i + 9), []);
  const slotWidth = 100 / timeSlots.length;
  const departments = useMemo(() => ['all', ...new Set(staffList.map(s => s.department))], [staffList]);
  const groups = useMemo(() => {
    if (selectedDepartment === 'all') return ['all'];
    const filteredGroups = staffList.filter(s => s.department === selectedDepartment).map(s => s.group);
    return ['all', ...new Set(filteredGroups)];
  }, [staffList, selectedDepartment]);
  useEffect(() => { setSelectedGroup('all'); }, [selectedDepartment]);
  
  // Memoized availability chart data
  const hourlyAvailability = useMemo(() => {
    const deptAndGroupFilteredStaff = staffList.filter(staff => {
        const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
        const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
        return departmentMatch && groupMatch;
    });
    const availabilityData = timeSlots.slice(0, -1).map(hour => {
        const count = deptAndGroupFilteredStaff.filter(staff => 
            schedules.some(s => s.staffId === staff.id && s.status === 'Online' && s.start <= hour && s.end > hour)
        ).length;
        return { hour, count };
    });
    const maxCount = deptAndGroupFilteredStaff.length > 0 ? deptAndGroupFilteredStaff.length : 1;
    return { data: availabilityData, maxCount };
  }, [staffList, schedules, selectedDepartment, selectedGroup, timeSlots]);

  // Memoized online count for the current time
  const onlineCount = useMemo(() => {
    const currentHour = Math.floor(currentTime);
    return hourlyAvailability.data.find(d => d.hour === currentHour)?.count || 0;
  }, [hourlyAvailability, currentTime]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-2xl">データを読み込み中...</div>;
  }

  return (
    <Fragment>
      <ScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} staffList={staffList} onSave={handleSaveSchedule} />
      <ConfirmationModal 
        isOpen={deleteConfirmation !== null}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={() => {
            if (deleteConfirmation) {
                handleDeleteSchedule(deleteConfirmation.id);
            }
        }}
        message={`「${deleteConfirmation?.status}」の予定を削除しますか？`}
      />

      <main className="container mx-auto p-4 font-sans bg-gray-50 min-h-screen">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">コールセンター在席状況</h1>
          <p className="text-xl text-gray-600">日付: 2025/06/15</p>
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm flex justify-between items-center">
            <span className="text-2xl font-bold text-green-600">現在の対応可能人数: {onlineCount}人</span>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">＋ 予定を追加</button>
          </div>
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label htmlFor="department-filter" className="block text-sm font-medium text-gray-700">部署</label><select id="department-filter" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">{departments.map(dep => (<option key={dep} value={dep}>{dep === 'all' ? '全ての部署' : dep}</option>))}</select></div>
            <div><label htmlFor="group-filter" className="block text-sm font-medium text-gray-700">グループ</label><select id="group-filter" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} disabled={selectedDepartment === 'all'} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200">{groups.map(group => (<option key={group} value={group}>{group === 'all' ? '全てのグループ' : group}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-gray-700">ステータス</label><div className="mt-1 flex rounded-md shadow-sm"><button onClick={() => setSelectedStatus('all')} className={`px-4 py-2 text-sm font-medium rounded-l-md w-full ${selectedStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>全て</button><button onClick={() => setSelectedStatus('available')} className={`px-4 py-2 text-sm font-medium w-full ${selectedStatus === 'available' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>対応可能</button><button onClick={() => setSelectedStatus('unavailable')} className={`px-4 py-2 text-sm font-medium rounded-r-md w-full ${selectedStatus === 'unavailable' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>対応不可</button></div></div>
          </div>
        </header>

        {/* Availability Graph */}
        <div className="mb-4 bg-white rounded-lg shadow-sm">
            <div className="grid grid-cols-[150px_1fr]">
                <div className="flex items-center justify-center border-r border-gray-200">
                    <h3 className="text-xs font-medium text-gray-500 p-2">対応可能<br/>人数推移</h3>
                </div>
                <div className="grid grid-cols-[repeat(11,1fr)] gap-px p-2 h-16">
                  <div className="col-span-10">
                    <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 500 60">
                      {(() => {
                          if(hourlyAvailability.data.length < 2) return null;
                          // ★★★ 修正点: chartHeightを20に、yOffsetを0に変更 ★★★
                          const chartWidth = 500, chartHeight = 20, yOffset = 0;
                          const points = hourlyAvailability.data.map((d, i) => {
                              const x = (i / (hourlyAvailability.data.length - 1)) * chartWidth;
                              const y = yOffset + chartHeight - (d.count / hourlyAvailability.maxCount) * chartHeight;
                              return `${x},${y}`;
                          });
                          const pathD = `M ${points.join(" L ")}`;
                          const areaD = `${pathD} L ${chartWidth},${yOffset+chartHeight} L 0,${yOffset+chartHeight} Z`;
                          return (
                              <Fragment>
                                  <defs><linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.4"/><stop offset="100%" stopColor="#6ee7b7" stopOpacity="0"/></linearGradient></defs>
                                  <path d={areaD} fill="url(#area-gradient)" />
                                  <path d={pathD} fill="none" stroke="#10b981" strokeWidth="0.5" strokeLinejoin="round" strokeLinecap="round" />
                              </Fragment>
                          );
                      })()}
                    </svg>
                  </div>
                </div>
            </div>
        </div>
        
        {/* Schedule Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <div className="min-w-[900px] relative"> 
            
            {/* 現在時刻を示す赤い線 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40"
              style={{ 
                left: `calc(150px + ${(currentTime - 9) * slotWidth}%)`,
              }} 
            >
              <div className="sticky top-0">
                  <div className="absolute -top-5 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {`${String(Math.floor(currentTime)).padStart(2, '0')}:${String(Math.round((currentTime % 1) * 60)).padStart(2, '0')}`}
                  </div>
              </div>
            </div>
            
            {/* タイムラインヘッダー */}
            <div className="sticky top-0 z-20 bg-white">
              <div className="grid grid-cols-[150px_repeat(11,1fr)] gap-px font-bold bg-gray-100 border-b border-gray-200">
                <div className="p-2 sticky left-0 bg-gray-100 z-30 text-center">スタッフ名</div>
                {timeSlots.map(hour => (<div key={hour} className="py-2 pl-1 border-l border-gray-200 text-left text-xs">{hour < 19 ? `${hour}:00` : '夜間'}</div>))}
              </div>
            </div>

            {/* スケジュール本体 */}
            <div className="divide-y divide-gray-200">
              {groupedStaff.map(({ department, groups }) => (
                <div key={department}>
                  <div className="grid grid-cols-[1fr] bg-gray-200">
                    <div className="px-2 py-1 font-extrabold text-gray-800 text-left">{department}</div>
                  </div>
                  {groups.map(({ groupName, staff }) => (
                    <div key={groupName}>
                      <div className="grid grid-cols-[1fr]">
                          <div className="px-4 py-1 font-bold text-gray-600 text-left bg-gray-50">{groupName}</div>
                      </div>
                      {staff.map(s => {
                        const staffSchedules = schedules.filter(sc => sc.staffId === s.id);
                        return (
                          <StaffRow
                            key={s.id}
                            staff={s}
                            staffSchedules={staffSchedules}
                            timeSlots={timeSlots}
                            slotWidth={slotWidth}
                            onDeleteClick={(id, status) => setDeleteConfirmation({ id, status })}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </Fragment>
  );
}
