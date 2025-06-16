'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { io, Socket } from 'socket.io-client';

// --- 型定義 ---
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
  start: number; // 9.0, 9.25, 9.5, 9.75 のような小数で管理
  end: number;
};

const statusColors: { [key: string]: string } = {
  'Online': '#22c55e', 'Meeting': '#f59e0b', 'Training': '#3b82f6',
  'Break': '#f97316', 'Off': '#ef4444', 'Night Duty': '#4f46e5',
};
const apiUrl = 'http://localhost:3002';
const availableStatuses = ['Online', 'Meeting', 'Training', 'Break', 'Off', 'Night Duty'];

// ★★★ ここからが15分単位対応の修正 ★★★

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

// --- 登録・削除モーダル ---
const ScheduleModal = ({ isOpen, onClose, staffList, onSave }: { isOpen: boolean; onClose: () => void; staffList: Staff[]; onSave: (data: any) => void; }) => {
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState('Online');
  const [startTime, setStartTime] = useState('9');
  const [endTime, setEndTime] = useState('9.25');

  // 時間の選択肢を生成
  const timeOptions = useMemo(() => generateTimeOptions(9, 19), []);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!staffId || parseFloat(startTime) >= parseFloat(endTime)) {
      alert("入力内容が正しくありません。");
      return;
    }
    onSave({
      staffId: parseInt(staffId),
      status,
      start: parseFloat(startTime),
      end: parseFloat(endTime),
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
            <select id="staff" value={staffId} onChange={e => setStaffId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
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
              <select id="start" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700">終了</label>
              <select id="end" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 <option value={19}>19:00</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button type="button" onClick={onClose}>キャンセル</button>
          <button type="button" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

// --- スタッフ一行を描画する専門の部品 ---
const StaffRow = ({ staff, staffSchedules, timeSlots, slotWidth, onDeleteClick }: { staff: Staff; staffSchedules: Schedule[]; timeSlots: number[]; slotWidth: number; onDeleteClick: (id: number, status: string) => void; }) => {
  return (
    <div className="grid grid-cols-[150px_repeat(44,1fr)] gap-px items-center min-h-[50px] hover:bg-gray-50 border-t border-gray-100">
      <div className="p-2 pl-12 text-sm font-normal whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10">{staff.name}</div>
      <div className="col-span-44 h-full relative">
        {/* 背景のグリッド線 (1時間ごと) */}
        {Array.from({ length: 10 }).map((_, index) => (<div key={index} className="absolute h-full border-r border-gray-200" style={{ left: `${(index + 1) * 4 * slotWidth}%`, top: 0 }}></div>))}
        {staffSchedules.map((schedule) => {
          const startPosition = (schedule.start - 9) * 4 * slotWidth;
          const barWidth = (schedule.end - schedule.start) * 4 * slotWidth;
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


// --- メインの部品 (Home) ---
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/schedules`);
      if (!res.ok) throw new Error(`Network response was not ok`);
      const data: { staff: Staff[], schedules: ScheduleFromDB[] } = await res.json();
      setStaffList(data.staff);
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
    socket.on('schedule:new', (newSchedule: ScheduleFromDB) => {
      const start = new Date(newSchedule.start);
      const end = new Date(newSchedule.end);
      const formattedSchedule: Schedule = {
        ...newSchedule,
        start: start.getUTCHours() + start.getUTCMinutes() / 60,
        end: end.getUTCHours() + end.getUTCMinutes() / 60,
      };
      setSchedules((prev) => [...prev, formattedSchedule]);
    });
    socket.on('schedule:deleted', (id: number) => {
      setSchedules((prev) => prev.filter(s => s.id !== id));
    });
    return () => { socket.disconnect(); };
  }, [fetchData]);

  const handleSaveSchedule = async (newScheduleData: any) => {
    try {
      await fetch(`${apiUrl}/api/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newScheduleData), });
    } catch (error) { console.error('予定の追加に失敗しました', error); }
  };
  
  const handleDeleteSchedule = async (id: number) => {
    try {
      await fetch(`${apiUrl}/api/schedules/${id}`, { method: 'DELETE', });
    } catch (error) { console.error('予定の削除に失敗しました', error); }
    setDeleteConfirmation(null);
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter(staff => {
      // ... フィルタリングロジック ...
      return true;
    });
  }, [staffList, schedules, selectedDepartment, selectedGroup, selectedStatus, currentTime]);

  const groupedStaff = useMemo(() => {
    // ... グループ化ロジック ...
    return [];
  }, [filteredStaff]);
  
  const timeSlots = useMemo(() => Array.from({ length: 11 * 4 }, (_, i) => 9 + i * 0.25), []);
  const slotWidth = 100 / timeSlots.length;
  
  if (isLoading) return <div>読み込み中...</div>;

  return (
    <Fragment>
      <ScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} staffList={staffList} onSave={handleSaveSchedule} />
      <ConfirmationModal isOpen={deleteConfirmation !== null} onClose={() => setDeleteConfirmation(null)} onConfirm={() => { if (deleteConfirmation) handleDeleteSchedule(deleteConfirmation.id); }} message={`「${deleteConfirmation?.status}」の予定を削除しますか？`} />
      <main className="container mx-auto p-4">
        {/* ... ヘッダーとフィルター ... */}
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <div className="min-w-[1800px]">
            <div className="sticky top-0 z-20 bg-white">
              <div className="grid grid-cols-[150px_repeat(44,1fr)] gap-px font-bold bg-gray-100 border-b">
                <div className="p-2 sticky left-0 bg-gray-100 z-10 text-center">スタッフ名</div>
                {Array.from({ length: 11 }).map((_, i) => {
                  const hour = i + 9;
                  return (
                    <div key={hour} className="col-span-4 text-center border-l py-2 text-sm">
                      {hour < 19 ? `${hour}:00` : '夜間'}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="relative">
              <div className="divide-y">
                {staffList.map(staff => (
                  <StaffRow
                    key={staff.id}
                    staff={staff}
                    staffSchedules={schedules.filter(s => s.staffId === staff.id)}
                    timeSlots={timeSlots}
                    slotWidth={slotWidth}
                    onDeleteClick={(id, status) => setDeleteConfirmation({ id, status })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </Fragment>
  );
}
