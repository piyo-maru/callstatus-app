'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// --- 型定義 ---
type Staff = {
  id: number;
  name: string;
  department: string;
  group: string;
  currentStatus: string; 
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

// --- 定数定義 ---
const statusColors: { [key: string]: string } = {
  'Online': '#22c55e', 'Meeting': '#f59e0b', 'Training': '#3b82f6',
  'Break': '#f97316', 'Off': '#ef4444', 'Night Duty': '#4f46e5',
};
const apiUrl = 'http://localhost:3002';
const availableStatuses = ['Online', 'Meeting', 'Training', 'Break', 'Off', 'Night Duty'];

// --- 時間選択肢を生成するヘルパー関数 ---
const generateTimeOptions = (startHour: number, endHour: number) => {
    const options = [];
    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 15) {
            const timeValue = h + m / 60;
            const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            options.push({ value: timeValue, label: timeLabel });
        }
    }
    return options;
};

// --- 登録モーダル ---
const ScheduleModal = ({ isOpen, onClose, staffList, onSave }: { isOpen: boolean; onClose: () => void; staffList: Staff[]; onSave: (data: any) => void; }) => {
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState('Online');
  const [startTime, setStartTime] = useState('9');
  const [endTime, setEndTime] = useState('9.25');
  const timeOptions = useMemo(() => generateTimeOptions(9, 19), []);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!staffId || parseFloat(startTime) >= parseFloat(endTime)) {
      console.error("入力内容が正しくありません。");
      return;
    }
    onSave({ staffId: parseInt(staffId), status, start: parseFloat(startTime), end: parseFloat(endTime) });
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
              <select id="start" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700">終了</label>
              <select id="end" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 <option value={19}>19:00</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border-transparent rounded-md hover:bg-indigo-700">保存</button>
        </div>
      </div>
    </div>
  );
};

// --- 削除確認モーダル ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; message: string; }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-medium leading-6 text-gray-900">確認</h3>
                <div className="mt-2"><p className="text-sm text-gray-500">{message}</p></div>
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
                    <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">削除</button>
                </div>
            </div>
        </div>
    );
};

// --- チャートコンポーネント ---
const StatusChart = ({ data }: { data: any[] }) => (
    // ★★★ h2タイトルを削除し、UIをコンパクトに ★★★
    <div className="mb-8 p-4 bg-white shadow rounded-lg" style={{ height: '150px' }}>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis allowDecimals={false}/>
                <Tooltip />
                <Legend />
                {availableStatuses.map(status => (
                    <Line key={status} type="monotone" dataKey={status} stroke={statusColors[status] || '#8884d8'} strokeWidth={2} connectNulls />
                ))}
            </LineChart>
        </ResponsiveContainer>
    </div>
);

// --- スタッフ一行を描画するコンポーネント ---
const StaffRow = ({ staff, staffSchedules, onDeleteClick }: { staff: Staff; staffSchedules: Schedule[]; onDeleteClick: (id: number, status: string) => void; }) => {
  return (
    <div className="grid grid-cols-[200px_1fr] items-center min-h-[50px] hover:bg-gray-50 border-t border-gray-100">
      <div className="p-2 pl-12 text-sm font-medium whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10">{staff.name}</div>
      <div className="h-full relative border-l border-gray-200">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="absolute h-full border-r border-gray-200" style={{ left: `${(index + 1) * 10}%`, top: 0 }}></div>
        ))}
        {staffSchedules.map((schedule) => {
          const startPosition = ((schedule.start - 9) / 10) * 100;
          const barWidth = ((schedule.end - schedule.start) / 10) * 100;
          return (
            <div
              key={schedule.id}
              className={`absolute h-6 rounded text-white text-xs flex items-center justify-center cursor-pointer hover:opacity-80`}
              style={{ left: `${startPosition}%`, width: `${barWidth}%`, top: '50%', transform: 'translateY(-50%)', backgroundColor: statusColors[schedule.status] || '#9ca3af' }}
              onClick={() => onDeleteClick(schedule.id, schedule.status)}
            >
              <span className="px-1 truncate">{schedule.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// --- メインのコンポーネント (Home) ---
export default function Home() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: number, status: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/schedules`);
      if (!res.ok) throw new Error(`Network response was not ok`);
      const data: { staff: Staff[], schedules: ScheduleFromDB[] } = await res.json();
      
      setStaffList(data.staff as Staff[]);
      const formattedSchedules = data.schedules.map(s => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return {
          ...s,
          start: start.getUTCHours() + start.getUTCMinutes() / 60,
          end: end.getUTCHours() + end.getUTCMinutes() / 60,
        };
      });
      setSchedules(formattedSchedules);
    } catch (error) { console.error('データの取得に失敗しました', error); } 
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const socket: Socket = io(apiUrl);
    const handleNewSchedule = (newSchedule: ScheduleFromDB) => {
      const start = new Date(newSchedule.start);
      const end = new Date(newSchedule.end);
      const formattedSchedule: Schedule = {
        ...newSchedule,
        start: start.getUTCHours() + start.getUTCMinutes() / 60,
        end: end.getUTCHours() + end.getUTCMinutes() / 60,
      };
      setSchedules((prev) => [...prev, formattedSchedule]);
    };
    const handleDeletedSchedule = (id: number) => setSchedules((prev) => prev.filter(s => s.id !== id));
    socket.on('schedule:new', handleNewSchedule);
    socket.on('schedule:deleted', handleDeletedSchedule);
    return () => { 
        socket.off('schedule:new', handleNewSchedule);
        socket.off('schedule:deleted', handleDeletedSchedule);
        socket.disconnect(); 
    };
  }, [fetchData]);

  const handleSaveSchedule = async (newScheduleData: any) => {
    try {
      await fetch(`${apiUrl}/api/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newScheduleData) });
    } catch (error) { console.error('予定の追加に失敗しました', error); }
  };
  
  const handleDeleteSchedule = async (id: number) => {
    try {
      await fetch(`${apiUrl}/api/schedules/${id}`, { method: 'DELETE' });
    } catch (error) { console.error('予定の削除に失敗しました', error); }
    setDeleteConfirmation(null);
  };

  const staffWithCurrentStatus = useMemo(() => {
    const currentDecimalHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    return staffList.map(staff => {
      const currentSchedule = schedules.find(s => 
        s.staffId === staff.id && 
        currentDecimalHour >= s.start && 
        currentDecimalHour < s.end
      );
      return {
        ...staff,
        currentStatus: currentSchedule ? currentSchedule.status : 'Off'
      };
    });
  }, [staffList, schedules, currentTime]);
  
  const departmentGroupFilteredStaff = useMemo(() => {
    return staffWithCurrentStatus.filter(staff => {
        const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
        const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
        return departmentMatch && groupMatch;
    });
  }, [staffWithCurrentStatus, selectedDepartment, selectedGroup]);

  const availableStaffCount = useMemo(() => {
      return departmentGroupFilteredStaff.filter(staff => staff.currentStatus === 'Online').length;
  }, [departmentGroupFilteredStaff]);

  const filteredStaffForDisplay = useMemo(() => {
      return departmentGroupFilteredStaff.filter(staff => {
        if (selectedStatus === 'all') return true;
        if (selectedStatus === 'available') return staff.currentStatus === 'Online';
        if (selectedStatus === 'unavailable') return staff.currentStatus !== 'Online';
        return true;
      });
  }, [departmentGroupFilteredStaff, selectedStatus]);
  
  const chartData = useMemo(() => {
    const data = [];
    const staffToChart = staffList.filter(staff => {
        const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
        const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
        return departmentMatch && groupMatch;
    });
    
    let statusesToDisplay: string[];
    if (selectedStatus === 'all') {
        statusesToDisplay = availableStatuses;
    } else if (selectedStatus === 'available') {
        statusesToDisplay = ['Online'];
    } else { // unavailable
        statusesToDisplay = availableStatuses.filter(s => s !== 'Online');
    }

    for (let hour = 9; hour < 19; hour++) {
      const timeLabel = `${hour}:00`;
      const counts: { [key: string]: any } = { time: timeLabel };
      
      statusesToDisplay.forEach(status => { counts[status] = 0; });
      
      staffToChart.forEach(staff => {
        const currentSchedule = schedules.find(s => s.staffId === staff.id && hour >= s.start && hour < s.end);
        
        const status = currentSchedule ? currentSchedule.status : 'Off';
        
        if (statusesToDisplay.includes(status)) {
            counts[status]++;
        }
      });
      data.push(counts);
    }
    return data;
  }, [schedules, staffList, selectedDepartment, selectedGroup, selectedStatus]);

  const currentTimePosition = useMemo(() => {
    const currentDecimalHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (currentDecimalHour < 9 || currentDecimalHour >= 19) {
      return null;
    }
    return ((currentDecimalHour - 9) / 10) * 100;
  }, [currentTime]);

  const groupedStaff = useMemo(() => {
    return filteredStaffForDisplay.reduce((acc, staff) => {
      const { department, group } = staff;
      if (!acc[department]) {
        acc[department] = {};
      }
      if (!acc[department][group]) {
        acc[department][group] = [];
      }
      acc[department][group].push(staff);
      return acc;
    }, {} as Record<string, Record<string, Staff[]>>);
  }, [filteredStaffForDisplay]);
  
  // ★★★ 日付をフォーマットする関数を追加 ★★★
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${year}年${month}月${day}日(${dayOfWeek})`;
  };


  if (isLoading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <Fragment>
      <ScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} staffList={staffList as Staff[]} onSave={handleSaveSchedule} />
      <ConfirmationModal isOpen={deleteConfirmation !== null} onClose={() => setDeleteConfirmation(null)} onConfirm={() => { if (deleteConfirmation) handleDeleteSchedule(deleteConfirmation.id); }} message={`「${deleteConfirmation?.status || ''}」の予定を削除しますか？`} />
      
      <main className="container mx-auto p-4 font-sans">
        {/* ★★★ ヘッダーのUIを修正 ★★★ */}
        <header className="mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button type="button" className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100">
                        今日
                    </button>
                    <button type="button" className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100">
                        &lt;
                    </button>
                    <button type="button" className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100">
                        &gt;
                    </button>
                </div>
                <h1 className="text-xl font-semibold text-gray-700">{formatDate(new Date())}</h1>
            </div>

            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow">
                予定を追加
            </button>
        </header>

        <StatusChart data={chartData} />

        <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <select onChange={(e) => setSelectedDepartment(e.target.value)} value={selectedDepartment} className="rounded-md border-gray-300 shadow-sm">
                    <option value="all">すべての部署</option>
                    {[...new Set(staffList.map(s => s.department))].map(dep => <option key={dep} value={dep}>{dep}</option>)}
                </select>
                <select onChange={(e) => setSelectedGroup(e.target.value)} value={selectedGroup} className="rounded-md border-gray-300 shadow-sm">
                    <option value="all">すべてのグループ</option>
                    {[...new Set(staffList.filter(s => selectedDepartment === 'all' || s.department === selectedDepartment).map(s => s.group))].map(grp => <option key={grp} value={grp}>{grp}</option>)}
                </select>
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button
                        type="button"
                        onClick={() => setSelectedStatus('all')}
                        className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-l-lg border border-gray-300 focus:z-10 focus:ring-2 focus:ring-indigo-500 ${selectedStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
                    >
                        すべて
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedStatus('available')}
                        className={`px-4 py-2 text-sm font-medium transition-colors duration-150 border-t border-b border-gray-300 focus:z-10 focus:ring-2 focus:ring-indigo-500 ${selectedStatus === 'available' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
                    >
                        対応可能
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedStatus('unavailable')}
                        className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-r-lg border border-gray-300 focus:z-10 focus:ring-2 focus:ring-indigo-500 ${selectedStatus === 'unavailable' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
                    >
                        対応不可
                    </button>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm text-gray-600">現在の対応可能人数</p>
                <p className="text-2xl font-bold text-green-600">{availableStaffCount}人</p>
            </div>
        </div>
        
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <div className="min-w-[1200px]">
            <div className="sticky top-0 z-20 bg-white grid grid-cols-[200px_1fr]">
                <div className="p-2 sticky left-0 bg-gray-100 z-10 font-bold text-gray-600 text-sm text-center border-b border-r">部署 / グループ / スタッフ名</div>
                <div className="grid grid-cols-10 font-bold bg-gray-100 border-b text-sm">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i+9} className="text-center border-r py-2">{`${i + 9}:00`}</div>
                    ))}
                </div>
            </div>
            <div className="relative">
                {currentTimePosition !== null && (
                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                        style={{ left: `${currentTimePosition}%` }}
                        title={`現在時刻: ${currentTime.getHours()}:${String(currentTime.getMinutes()).padStart(2, '0')}`}
                    ></div>
                )}
                
                {Object.keys(groupedStaff).length > 0 ? (
                  Object.entries(groupedStaff).map(([department, groups]) => (
                    <div key={department} className="department-group border-t-2 border-gray-300">
                      <h3 className="p-2 text-md font-bold bg-gray-200 sticky left-0 z-10 w-full">{department}</h3>
                      {Object.entries(groups).map(([group, staffInGroup]) => (
                        <div key={group}>
                          <h4 className="p-2 text-sm font-semibold bg-gray-100 sticky left-0 z-10 pl-6 w-full">{group}</h4>
                          {staffInGroup.map(staff => (
                            <StaffRow
                              key={staff.id}
                              staff={staff}
                              staffSchedules={schedules.filter(s => s.staffId === staff.id)}
                              onDeleteClick={(id, status) => setDeleteConfirmation({ id, status })}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">表示対象のスタッフがいません。</div>
                )}
            </div>
          </div>
        </div>
      </main>
    </Fragment>
  );
}
