'use client';

import { useState, useEffect, useMemo, useCallback, Fragment, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// ★★★ カレンダーライブラリをインポート ★★★
import DatePicker, { registerLocale } from 'react-datepicker';
import ja from 'date-fns/locale/ja';
import "react-datepicker/dist/react-datepicker.css";

// ★★★ カレンダーの表示言語を日本語に設定 ★★★
registerLocale('ja', ja);


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

type DragInfo = {
  staff: Staff;
  startX: number;
  currentX: number;
  rowRef: HTMLDivElement;
};

// --- 定数定義 ---
const statusColors: { [key: string]: string } = {
  'Online': '#22c55e', 'Meeting': '#f59e0b', 'Training': '#3b82f6',
  'Break': '#f97316', 'Off': '#ef4444', 'Night Duty': '#4f46e5',
};
const apiUrl = 'http://localhost:3003';
const availableStatuses = ['Online', 'Meeting', 'Training', 'Break', 'Off', 'Night Duty'];
const AVAILABLE_STATUSES = ['Online', 'Night Duty'];

// --- 変則スケール対応のヘルパー関数 ---
const timeToPositionPercent = (time: number): number => {
    const START_HOUR = 9;
    const BREAK_HOUR = 18;
    const VISUAL_TOTAL_HOURS = 10;
    if (time < BREAK_HOUR) { return ((time - START_HOUR) / VISUAL_TOTAL_HOURS) * 100; } 
    else {
        const basePercent = ((BREAK_HOUR - START_HOUR) / VISUAL_TOTAL_HOURS) * 100;
        const postBreakHours = 3;
        const timeIntoPostBreak = time - BREAK_HOUR;
        const postBreakPercent = (timeIntoPostBreak / postBreakHours) * (1 / VISUAL_TOTAL_HOURS) * 100;
        return basePercent + postBreakPercent;
    }
};

const positionPercentToTime = (percent: number): number => {
    const START_HOUR = 9;
    const BREAK_HOUR = 18;
    const VISUAL_TOTAL_HOURS = 10;
    const breakPercent = ((BREAK_HOUR - START_HOUR) / VISUAL_TOTAL_HOURS) * 100;
    if (percent < breakPercent) { return START_HOUR + (percent / 100) * VISUAL_TOTAL_HOURS; } 
    else {
        const postBreakHours = 3;
        const postBreakPercent = (percent - breakPercent) / 100;
        return BREAK_HOUR + postBreakPercent * VISUAL_TOTAL_HOURS * postBreakHours;
    }
}

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
    options.push({ value: endHour, label: `${endHour}:00`});
    return options;
};

// --- 登録・編集モーダル ---
const ScheduleModal = ({ isOpen, onClose, staffList, onSave, scheduleToEdit, initialData }: { 
    isOpen: boolean; 
    onClose: () => void; 
    staffList: Staff[]; 
    onSave: (data: any) => void;
    scheduleToEdit: Schedule | null;
    initialData?: Partial<Schedule>;
}) => {
  const isEditMode = !!scheduleToEdit;
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState('Online');
  const [startTime, setStartTime] = useState('9');
  const [endTime, setEndTime] = useState('9.25');
  const timeOptions = useMemo(() => generateTimeOptions(9, 21), []);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const data = scheduleToEdit || initialData;
    if (isOpen && data) {
        setStaffId(data.staffId?.toString() || '');
        setStatus(data.status || 'Online');
        setStartTime(data.start?.toString() || '9');
        setEndTime(data.end?.toString() || '9.25');
    } else if (!isOpen) {
        setStaffId(''); setStatus('Online'); setStartTime('9'); setEndTime('9.25');
    }
  }, [scheduleToEdit, initialData, isOpen]);

  if (!isOpen || !isClient) return null;

  const handleSave = () => {
    if (!staffId || parseFloat(startTime) >= parseFloat(endTime)) { console.error("入力内容が正しくありません。"); return; }
    const scheduleData = { staffId: parseInt(staffId), status, start: parseFloat(startTime), end: parseFloat(endTime) };
    onSave(isEditMode ? { ...scheduleData, id: scheduleToEdit.id } : scheduleData);
    onClose();
  };
  
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{isEditMode ? '予定を編集' : '予定を追加'}</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="staff" className="block text-sm font-medium text-gray-700">スタッフ</label>
            <select id="staff" value={staffId} onChange={e => setStaffId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={isEditMode || !!initialData?.staffId}>
              <option value="" disabled>選択してください</option>
              {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">ステータス</label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700">開始</label>
              <select id="start" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">{timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700">終了</label>
              <select id="end" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">{timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border-transparent rounded-md hover:bg-indigo-700">保存</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- 削除確認モーダル ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; message: string; }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);
    if (!isOpen || !isClient) return null;
    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
                <h3 className="text-lg font-medium leading-6 text-gray-900">確認</h3>
                <div className="mt-2"><p className="text-sm text-gray-500">{message}</p></div>
                <div className="mt-6 flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
                    <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">削除</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- チャートコンポーネント ---
const StatusChart = ({ data }: { data: any[] }) => (
    <div className="mb-8 p-4 bg-white shadow rounded-lg" style={{ height: '150px' }}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis allowDecimals={false}/><Tooltip /><Legend />{availableStatuses.map(status => (<Line key={status} type="monotone" dataKey={status} stroke={statusColors[status] || '#8884d8'} strokeWidth={2} connectNulls />))}</LineChart></ResponsiveContainer>
    </div>
);

// --- スタッフ一行を描画するコンポーネント ---
const StaffRow = ({ staff, staffSchedules, onDeleteClick, onEditClick, onTimelineMouseDown, dragInfo }: { 
    staff: Staff; 
    staffSchedules: Schedule[]; 
    onDeleteClick: (id: number) => void;
    onEditClick: (schedule: Schedule) => void;
    onTimelineMouseDown: (e: React.MouseEvent<HTMLDivElement>, staff: Staff) => void;
    dragInfo: DragInfo | null;
}) => {
  return (
    <div className="grid grid-cols-[200px_1fr] items-center min-h-[50px] hover:bg-gray-50 border-t border-gray-100">
      <div className="p-2 pl-12 text-sm font-medium whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10">{staff.name}</div>
      <div className="h-full relative border-l border-gray-200" onMouseDown={(e) => onTimelineMouseDown(e, staff)}>
        {staffSchedules.sort((a, b) => a.id - b.id).map((schedule) => {
          const startPosition = timeToPositionPercent(schedule.start);
          const endPosition = timeToPositionPercent(schedule.end);
          const barWidth = endPosition - startPosition;
          return (
            <div key={schedule.id} className={`absolute h-6 rounded text-white text-xs flex items-center justify-between px-2 cursor-pointer hover:opacity-80`} style={{ left: `${startPosition}%`, width: `${barWidth}%`, top: '50%', transform: 'translateY(-50%)', backgroundColor: statusColors[schedule.status] || '#9ca3af', zIndex: schedule.id }} onClick={(e) => { e.stopPropagation(); onEditClick(schedule); }}>
              <span className="truncate">{schedule.status}</span>
              <button onClick={(e) => { e.stopPropagation(); onDeleteClick(schedule.id); }} className="text-white hover:text-red-200 ml-2">×</button>
            </div>
          );
        })}
        {dragInfo && dragInfo.staff.id === staff.id && (<div className="absolute bg-indigo-200 bg-opacity-50 border-2 border-dashed border-indigo-500 rounded pointer-events-none z-30" style={{ left: `${Math.min(dragInfo.startX, dragInfo.currentX)}px`, top: '25%', width: `${Math.abs(dragInfo.currentX - dragInfo.startX)}px`, height: '50%' }} />)}
      </div>
    </div>
  );
};


// --- メインのコンポーネント (Home) ---
export default function Home() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date());
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [draggedSchedule, setDraggedSchedule] = useState<Partial<Schedule> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const fetchData = useCallback(async (date: Date) => {
    setIsLoading(true);
    const dateString = date.toISOString().split('T')[0];
    try {
      const res = await fetch(`${apiUrl}/api/schedules?date=${dateString}`);
      if (!res.ok) throw new Error(`Network response was not ok`);
      const data: { staff: Staff[], schedules: ScheduleFromDB[] } = await res.json();
      setStaffList(data.staff as Staff[]);
      const formattedSchedules = data.schedules.map(s => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return { ...s, start: start.getUTCHours() + start.getUTCMinutes() / 60, end: end.getUTCHours() + end.getUTCMinutes() / 60 };
      });
      setSchedules(formattedSchedules);
    } catch (error) { console.error('データの取得に失敗しました', error); } 
    finally { setIsLoading(false); }
  }, []);
  
  useEffect(() => {
    fetchData(displayDate);
  }, [displayDate, fetchData]);

  useEffect(() => {
    const socket: Socket = io(apiUrl);
    const handleNewSchedule = (newSchedule: ScheduleFromDB) => {
        const scheduleDate = new Date(newSchedule.start);
        if(scheduleDate.toISOString().split('T')[0] === displayDate.toISOString().split('T')[0]) {
            const formatted = { ...newSchedule, start: scheduleDate.getUTCHours() + scheduleDate.getUTCMinutes()/60, end: new Date(newSchedule.end).getUTCHours() + new Date(newSchedule.end).getUTCMinutes()/60 };
            setSchedules((prev) => [...prev, formatted]);
        }
    };
    const handleUpdatedSchedule = (updatedSchedule: ScheduleFromDB) => {
        const scheduleDate = new Date(updatedSchedule.start);
        if(scheduleDate.toISOString().split('T')[0] === displayDate.toISOString().split('T')[0]){
            const formatted = { ...updatedSchedule, start: scheduleDate.getUTCHours() + scheduleDate.getUTCMinutes()/60, end: new Date(updatedSchedule.end).getUTCHours() + new Date(updatedSchedule.end).getUTCMinutes()/60 };
            setSchedules(prev => prev.map(s => s.id === formatted.id ? formatted : s));
        }
    }
    const handleDeletedSchedule = (id: number) => setSchedules((prev) => prev.filter(s => s.id !== id));
    socket.on('schedule:new', handleNewSchedule);
    socket.on('schedule:updated', handleUpdatedSchedule);
    socket.on('schedule:deleted', handleDeletedSchedule);
    return () => { 
        socket.off('schedule:new', handleNewSchedule);
        socket.off('schedule:updated', handleUpdatedSchedule);
        socket.off('schedule:deleted', handleDeletedSchedule);
        socket.disconnect(); 
    };
  }, [displayDate]);
  
  const handleOpenModal = (schedule: Schedule | null = null, initialData: Partial<Schedule> | null = null) => {
    setEditingSchedule(schedule);
    setDraggedSchedule(initialData);
    setIsModalOpen(true);
  };
  
  const handleSaveSchedule = async (scheduleData: Schedule & { id?: number }) => {
    const date = displayDate.toISOString().split('T')[0];
    const payload = { ...scheduleData, date };
    if (scheduleData.id) {
      await fetch(`${apiUrl}/api/schedules/${scheduleData.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch(`${apiUrl}/api/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
  };
  
  const handleDeleteSchedule = async (id: number) => {
    try {
      await fetch(`${apiUrl}/api/schedules/${id}`, { method: 'DELETE' });
    } catch (error) { console.error('予定の削除に失敗しました', error); }
    setDeletingScheduleId(null);
  };
  
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>, staff: Staff) => {
    if ((e.target as HTMLElement).closest('.absolute')) { return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    setDragInfo({ staff, startX, currentX: startX, rowRef: e.currentTarget });
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!dragInfo) return;
        const rect = dragInfo.rowRef.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        setDragInfo(prev => prev ? { ...prev, currentX } : null);
    };
    const handleMouseUp = () => {
        if (!dragInfo || Math.abs(dragInfo.startX - dragInfo.currentX) < 10) { setDragInfo(null); return; }
        const rowWidth = dragInfo.rowRef.offsetWidth;
        const startPercent = (Math.min(dragInfo.startX, dragInfo.currentX) / rowWidth) * 100;
        const endPercent = (Math.max(dragInfo.startX, dragInfo.currentX) / rowWidth) * 100;
        const start = positionPercentToTime(startPercent);
        const end = positionPercentToTime(endPercent);
        const snappedStart = Math.round(start * 4) / 4;
        const snappedEnd = Math.round(end * 4) / 4;
        if (snappedStart < snappedEnd) {
            handleOpenModal(null, { staffId: dragInfo.staff.id, start: snappedStart, end: snappedEnd });
        }
        setDragInfo(null);
    };
    if (dragInfo) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo]);

  const staffWithCurrentStatus = useMemo(() => {
    const currentDecimalHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    return staffList.map(staff => {
      const applicableSchedules = schedules.filter(s => s.staffId === staff.id && currentDecimalHour >= s.start && currentDecimalHour < s.end);
      const currentSchedule = applicableSchedules.length > 0 ? applicableSchedules.reduce((latest, current) => latest.id > current.id ? latest : current) : null;
      return { ...staff, currentStatus: currentSchedule ? currentSchedule.status : 'Off' };
    });
  }, [staffList, schedules, currentTime]);
  
  const departmentGroupFilteredStaff = useMemo(() => {
    return staffWithCurrentStatus.filter(staff => {
        const departmentMatch = selectedDepartment === 'all' || staff.department === selectedDepartment;
        const groupMatch = selectedGroup === 'all' || staff.group === selectedGroup;
        return departmentMatch && groupMatch;
    });
  }, [staffWithCurrentStatus, selectedDepartment, selectedGroup]);

  const availableStaffCount = useMemo(() => departmentGroupFilteredStaff.filter(staff => AVAILABLE_STATUSES.includes(staff.currentStatus)).length, [departmentGroupFilteredStaff]);

  const filteredStaffForDisplay = useMemo(() => {
      return departmentGroupFilteredStaff.filter(staff => {
        if (selectedStatus === 'all') return true;
        if (selectedStatus === 'available') return AVAILABLE_STATUSES.includes(staff.currentStatus);
        if (selectedStatus === 'unavailable') return !AVAILABLE_STATUSES.includes(staff.currentStatus);
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
    if (selectedStatus === 'all') { statusesToDisplay = availableStatuses; } 
    else if (selectedStatus === 'available') { statusesToDisplay = AVAILABLE_STATUSES; } 
    else { statusesToDisplay = availableStatuses.filter(s => !AVAILABLE_STATUSES.includes(s)); }
    for (let hour = 9; hour < 19; hour++) {
      const timeLabel = `${hour}:00`;
      const counts: { [key: string]: any } = { time: timeLabel };
      statusesToDisplay.forEach(status => { counts[status] = 0; });
      staffToChart.forEach(staff => {
        const applicableSchedules = schedules.filter(s => s.staffId === staff.id && hour >= s.start && hour < s.end);
        const topSchedule = applicableSchedules.length > 0 ? applicableSchedules.reduce((latest, current) => latest.id > current.id ? latest : current) : null;
        const status = topSchedule ? topSchedule.status : 'Off';
        if (statusesToDisplay.includes(status)) { counts[status]++; }
      });
      data.push(counts);
    }
    return data;
  }, [schedules, staffList, selectedDepartment, selectedGroup, selectedStatus]);

  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const isToday = displayDate.getFullYear() === now.getFullYear() && displayDate.getMonth() === now.getMonth() && displayDate.getDate() === now.getDate();
    if (!isToday) return null;
    const currentDecimalHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (currentDecimalHour < 9 || currentDecimalHour >= 21) { return null; }
    return timeToPositionPercent(currentDecimalHour);
  }, [currentTime, displayDate]);

  const groupedStaff = useMemo(() => {
    return filteredStaffForDisplay.reduce((acc, staff) => {
      const { department, group } = staff;
      if (!acc[department]) { acc[department] = {}; }
      if (!acc[department][group]) { acc[department][group] = []; }
      acc[department][group].push(staff);
      return acc;
    }, {} as Record<string, Record<string, Staff[]>>);
  }, [filteredStaffForDisplay]);
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${year}年${month}月${day}日(${dayOfWeek})`;
  };
  
  const handleDateChange = (days: number) => { setDisplayDate(current => { const newDate = new Date(current); newDate.setDate(newDate.getDate() + days); return newDate; }); };
  const goToToday = () => setDisplayDate(new Date());

  const CustomDatePickerInput = forwardRef<HTMLButtonElement, { value?: string, onClick?: () => void }>(({ value, onClick }, ref) => (
    <button className="text-xl font-semibold text-gray-700" onClick={onClick} ref={ref}>
      {value}
    </button>
  ));
  CustomDatePickerInput.displayName = 'CustomDatePickerInput';

  if (isLoading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <Fragment>
      <ScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} staffList={staffList as Staff[]} onSave={handleSaveSchedule} scheduleToEdit={editingSchedule} initialData={draggedSchedule} />
      <ConfirmationModal isOpen={deletingScheduleId !== null} onClose={() => setDeletingScheduleId(null)} onConfirm={() => { if (deletingScheduleId) handleDeleteSchedule(deletingScheduleId); }} message="この予定を削除しますか？" />
      
      <main className="container mx-auto p-4 font-sans">
        <header className="mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button type="button" onClick={goToToday} className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100">今日</button>
                    <button type="button" onClick={() => handleDateChange(-1)} className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100">&lt;</button>
                    <button type="button" onClick={() => handleDateChange(1)} className="px-3 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100">&gt;</button>
                </div>
                <DatePicker
                  selected={displayDate}
                  onChange={(date: Date) => setDisplayDate(date)}
                  customInput={<CustomDatePickerInput />}
                  locale="ja"
                  dateFormat="yyyy年M月d日(E)"
                />
            </div>

            <button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">
                予定を追加
            </button>
        </header>

        <StatusChart data={chartData} />

        <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <select onChange={(e) => setSelectedDepartment(e.target.value)} value={selectedDepartment} className="rounded-md border-gray-300 shadow-sm"><option value="all">すべての部署</option>{[...new Set(staffList.map(s => s.department))].map(dep => <option key={dep} value={dep}>{dep}</option>)}</select>
                <select onChange={(e) => setSelectedGroup(e.target.value)} value={selectedGroup} className="rounded-md border-gray-300 shadow-sm"><option value="all">すべてのグループ</option>{[...new Set(staffList.filter(s => selectedDepartment === 'all' || s.department === selectedDepartment).map(s => s.group))].map(grp => <option key={grp} value={grp}>{grp}</option>)}</select>
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button type="button" onClick={() => setSelectedStatus('all')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-l-lg border ${selectedStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>すべて</button>
                    <button type="button" onClick={() => setSelectedStatus('available')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 border-t border-b ${selectedStatus === 'available' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>対応可能</button>
                    <button type="button" onClick={() => setSelectedStatus('unavailable')} className={`px-4 py-2 text-sm font-medium transition-colors duration-150 rounded-r-lg border ${selectedStatus === 'unavailable' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>対応不可</button>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm text-gray-600">現在の対応可能人数</p>
                <p className="text-2xl font-bold text-green-600">{availableStaffCount}人</p>
            </div>
        </div>
        
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <div className="min-w-[1200px]">
            <div className="sticky top-0 z-30 bg-white grid grid-cols-[200px_1fr]">
                <div className="p-2 sticky left-0 bg-gray-100 z-10 font-bold text-gray-600 text-sm text-center border-b border-r">部署 / グループ / スタッフ名</div>
                <div className="grid grid-cols-10 font-bold bg-gray-100 border-b text-sm">
                    {Array.from({ length: 9 }).map((_, i) => (<div key={i+9} className="text-left pl-2 border-r py-2">{`${i + 9}:00`}</div>))}
                    <div className="text-left pl-2 border-r py-2">18:00</div>
                </div>
            </div>
            <div className="relative">
                {currentTimePosition !== null && (<div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-40" style={{ left: `${currentTimePosition}%` }} title={`現在時刻: ${currentTime.getHours()}:${String(currentTime.getMinutes()).padStart(2, '0')}`}></div>)}
                {Object.keys(groupedStaff).length > 0 ? (
                  Object.entries(groupedStaff).map(([department, groups]) => (
                    <div key={department} className="department-group border-t-2 border-gray-300">
                      <h3 className="p-2 text-md font-bold bg-gray-200 sticky left-0 z-20 w-full">{department}</h3>
                      {Object.entries(groups).map(([group, staffInGroup]) => (
                        <div key={group}>
                          <h4 className="p-2 text-sm font-semibold bg-gray-100 sticky left-0 z-20 pl-6 w-full">{group}</h4>
                          {staffInGroup.map(staff => (
                            <StaffRow
                              key={staff.id}
                              staff={staff}
                              staffSchedules={schedules.filter(s => s.staffId === staff.id)}
                              onDeleteClick={setDeletingScheduleId}
                              onEditClick={handleOpenModal}
                              onTimelineMouseDown={handleTimelineMouseDown}
                              dragInfo={dragInfo}
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
