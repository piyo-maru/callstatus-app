# CLAUDE.md

このファイルは、シフト管理アプリ（shift-manager-app）でコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## 🎯 プロジェクト概要

**シフト管理アプリ** - 月次シフト計画作成に特化したWebアプリケーション。親アプリ（callstatus-app）の補完機能として、Excel風の操作でシフト表を作成し、詳細スケジュールを親アプリに送信する統合システムの一部です。

## 🔗 親アプリ（callstatus-app）との関係性

### 📊 親アプリの役割
- **目的**: 日次ガントチャート・リアルタイムスケジュール管理
- **URL**: http://localhost:3000
- **技術スタック**: Next.js 14 + NestJS + PostgreSQL + Socket.IO + Prisma
- **主要機能**: 
  - 15分刻みタイムライン表示
  - リアルタイム更新（WebSocket）
  - 2層データ構造（契約・調整レイヤー）
  - JWT認証システム
  - 社員情報管理
  - 履歴スナップショット機能

### 🎯 本アプリの役割
- **目的**: 月次シフト計画作成（Excel置き換え）
- **データフロー**: 本アプリで月次計画 → 親アプリで日次詳細調整
- **重要**: 親アプリの**機能の一部**として動作すること

## 🎨 デザインシステム完全統一（最重要）

### 📋 基本方針
**親アプリと区別がつかないレベルの統一感を実現する**

### 🎛️ Tailwind CSS設定（完全一致必須）
```javascript
// tailwind.config.js - 親アプリと完全同一にすること
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 親アプリと同じ設定を使用
    },
  },
  plugins: [],
}
```

### 🏗️ レイアウト構造（厳密に統一）

#### ヘッダー構造
```typescript
// 親アプリと完全一致させること
<header className="mb-2 flex justify-between items-center">
  <div className="flex items-center space-x-3">
    {/* 日付ナビゲーション */}
    <div className="inline-flex rounded-md shadow-sm" role="group">
      <button type="button" className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 h-7">
        &lt;
      </button>
      <button type="button" className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 h-7">
        今月
      </button>
      <button type="button" className="px-2 py-1 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 h-7">
        &gt;
      </button>
    </div>
    
    {/* 月次DatePicker */}
    <DatePicker
      selected={displayMonth}
      onChange={setDisplayMonth}
      locale="ja"
      dateFormat="yyyy年M月"
      showMonthYearPicker
      popperClassName="!z-[10000]"
      popperPlacement="bottom-start"
    />
  </div>

  <div className="flex items-center space-x-2">
    {/* 親アプリと同じボタンスタイル */}
    <button className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 h-7">
      ガントチャートに反映
    </button>
    <button className="px-3 py-1 text-xs font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 h-7">
      ⚙️ 設定
    </button>
  </div>
</header>
```

#### メインコンテナ
```typescript
// 親アプリのガントチャートと同じコンテナスタイル
<div className="bg-white shadow rounded-lg relative">
  <div className="flex">
    {/* 左列：スタッフ一覧（親アプリと同じ構造） */}
    <div className="min-w-fit max-w-[400px] sticky left-0 z-20 bg-white border-r border-gray-200">
      <div className="px-2 py-2 bg-gray-100 font-bold text-gray-600 text-sm text-center border-b whitespace-nowrap">
        スタッフ名
      </div>
      {/* スタッフリスト */}
    </div>
    
    {/* 右列：カレンダーグリッド */}
    <div className="flex-1 overflow-x-auto">
      {/* 月次カレンダー表示 */}
    </div>
  </div>
</div>
```

### 🎨 共通スタイル定義
```typescript
// 親アプリと完全一致するクラス定義
const SHARED_STYLES = {
  // ボタンスタイル
  primaryButton: "px-3 py-1 text-xs font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 h-7",
  secondaryButton: "px-3 py-1 text-xs font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 h-7",
  
  // モーダルスタイル
  modalOverlay: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
  modalContent: "bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden",
  modalHeader: "flex justify-between items-center p-6 border-b border-gray-200",
  
  // フィルタースタイル
  filterContainer: "mb-2 p-2 bg-gray-50 rounded-lg flex items-center justify-between",
  filterSelect: "rounded-md border-gray-300 shadow-sm text-xs h-6",
  
  // スタッフ行スタイル
  staffRow: "px-2 pl-12 text-sm font-medium whitespace-nowrap h-[45px] hover:bg-gray-50 flex items-center cursor-pointer",
  departmentHeader: "px-2 min-h-[33px] text-sm font-bold whitespace-nowrap flex items-center",
  groupHeader: "px-2 pl-6 min-h-[33px] text-xs font-semibold whitespace-nowrap flex items-center"
};
```

## 🔐 認証システム連携（完全委譲）

### ⚠️ 重要: 独自認証は一切実装しない

```typescript
// 認証は完全に親アプリに委譲
export class AuthService {
  private readonly PARENT_APP_URL = process.env.PARENT_APP_URL || 'http://localhost:3002';

  // トークン検証（親アプリのAPIを使用）
  async validateToken(token: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.PARENT_APP_URL}/api/auth/verify`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('認証検証エラー:', error);
      return null;
    }
  }

  // ユーザー情報取得
  async getCurrentUser(): Promise<User | null> {
    const token = this.getTokenFromCookie();
    if (!token) return null;
    
    return this.validateToken(token);
  }

  // クッキーからトークン取得
  private getTokenFromCookie(): string | null {
    if (typeof window === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => 
      cookie.trim().startsWith('auth-token=')
    );
    
    return authCookie ? authCookie.split('=')[1] : null;
  }
}
```

### 🛡️ 認証ガード実装
```typescript
// 親アプリと同じ認証チェック
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authService = new AuthService();
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        // 親アプリのログイン画面にリダイレクト
        window.location.href = 'http://localhost:3000/login';
        return;
      }
      
      setUser(currentUser);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  return { user, isLoading };
};
```

## 👥 社員情報連携（完全統一）

### 📋 データ形式（厳密に遵守）
```typescript
// 親アプリと完全一致するデータ形式
interface Staff {
  id: number;
  empNo: string;
  name: string;
  department: string;
  group: string;
  email: string;
  mondayHours?: string;
  tuesdayHours?: string;
  wednesdayHours?: string;
  thursdayHours?: string;
  fridayHours?: string;
  saturdayHours?: string;
  sundayHours?: string;
  isActive: boolean;
}

// JSON形式（親アプリのインポート形式）
interface EmployeeData {
  employeeData: Array<{
    empNo: string;
    name: string;
    dept: string;
    team: string;
    email: string;
    mondayHours?: string;
    tuesdayHours?: string;
    wednesdayHours?: string;
    thursdayHours?: string;
    fridayHours?: string;
    saturdayHours?: string;
    sundayHours?: string;
  }>;
}
```

### 🔄 データ取得実装
```typescript
// 親アプリAPIから社員情報取得
export class StaffService {
  private readonly PARENT_APP_URL = process.env.PARENT_APP_URL || 'http://localhost:3002';

  async getStaffList(token: string): Promise<Staff[]> {
    try {
      const response = await fetch(`${this.PARENT_APP_URL}/api/staff`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`社員情報取得エラー: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('社員情報取得失敗:', error);
      throw error;
    }
  }
}
```

## 📊 シフトデータ設計

### 🗓️ 月次シフトデータ構造
```typescript
// シンプルな月次シフト構造
interface MonthlyShift {
  id?: number;
  staffId: number;
  year: number;
  month: number;
  shifts: {
    [day: number]: ShiftInfo;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface ShiftInfo {
  type: ShiftType;
  startTime?: string;  // カスタム開始時間
  endTime?: string;    // カスタム終了時間
  memo?: string;       // メモ
}

type ShiftType = '通常' | '夜勤' | 'AM休' | 'PM休' | '全休' | '振出' | '遅出' | 'カスタム';
```

### 🎨 シフトタイプ設定
```typescript
// 親アプリのステータス色と統一
export const SHIFT_TYPE_CONFIG = {
  '通常': {
    status: 'Online',
    defaultTime: '09:00-18:00',
    color: '#10b981',  // 親アプリのOnlineと同じ色
    displayName: '通常'
  },
  '夜勤': {
    status: 'Night Duty',
    defaultTime: '18:00-09:00',
    color: '#8b5cf6',  // 親アプリのNight Dutyと同じ色
    displayName: '夜勤'
  },
  'AM休': {
    status: 'Off',
    defaultTime: '09:00-13:00',
    color: '#ef4444',  // 親アプリのOffと同じ色
    displayName: 'AM休'
  },
  'PM休': {
    status: 'Off', 
    defaultTime: '13:00-18:00',
    color: '#ef4444',
    displayName: 'PM休'
  },
  '全休': {
    status: 'Off',
    defaultTime: 'all-day',
    color: '#6b7280',
    displayName: '全休'
  },
  '振出': {
    status: 'Online',
    defaultTime: '07:00-16:00',
    color: '#f59e0b',
    displayName: '振出'
  },
  '遅出': {
    status: 'Online',
    defaultTime: '11:00-20:00',
    color: '#06b6d4',
    displayName: '遅出'
  }
};
```

## 🔗 親アプリへのデータ送信

### 📤 スケジュール一括送信API
```typescript
// 親アプリのスケジュール形式に変換して送信
export class ScheduleExportService {
  private readonly PARENT_APP_URL = process.env.PARENT_APP_URL || 'http://localhost:3002';

  async exportToParentApp(monthlyShift: MonthlyShift, token: string): Promise<void> {
    const schedules = this.convertToScheduleFormat(monthlyShift);
    
    try {
      const response = await fetch(`${this.PARENT_APP_URL}/api/schedules/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schedules,
          source: 'shift-manager',
          batchId: `shift_${monthlyShift.year}${monthlyShift.month.toString().padStart(2, '0')}_${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error(`データ送信エラー: ${response.status}`);
      }

      console.log('ガントチャートへのデータ送信完了');
    } catch (error) {
      console.error('データ送信失敗:', error);
      throw error;
    }
  }

  private convertToScheduleFormat(monthlyShift: MonthlyShift) {
    const schedules = [];
    
    for (const [day, shiftInfo] of Object.entries(monthlyShift.shifts)) {
      const date = `${monthlyShift.year}-${monthlyShift.month.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      const config = SHIFT_TYPE_CONFIG[shiftInfo.type];
      
      if (config.defaultTime === 'all-day') {
        // 全休の場合はスキップまたは特別処理
        continue;
      }

      const timeRange = shiftInfo.startTime && shiftInfo.endTime 
        ? `${shiftInfo.startTime}-${shiftInfo.endTime}`
        : config.defaultTime;
      
      const [startTime, endTime] = this.parseTimeRange(timeRange);

      schedules.push({
        staffId: monthlyShift.staffId,
        date,
        status: config.status,
        start: startTime,
        end: endTime,
        memo: `月次シフト: ${config.displayName}${shiftInfo.memo ? ` (${shiftInfo.memo})` : ''}`
      });
    }

    return schedules;
  }

  private parseTimeRange(timeRange: string): [number, number] {
    // "09:00-18:00" -> [9.0, 18.0] (親アプリの小数点時間形式)
    const [start, end] = timeRange.split('-');
    return [
      this.timeStringToDecimal(start),
      this.timeStringToDecimal(end)
    ];
  }

  private timeStringToDecimal(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
  }
}
```

## 🎛️ UI実装ガイドライン

### 📅 月次カレンダーグリッド
```typescript
// 親アプリのガントチャートと同じ構造
const MonthlyCalendarGrid = ({ staff, month, shifts, onShiftChange }) => {
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  
  return (
    <div className="grid grid-cols-32 gap-0"> {/* 31日+1列 */}
      {/* ヘッダー行：日付 */}
      <div className="bg-gray-100 border-b border-gray-200 p-1 text-xs font-bold text-center">
        日
      </div>
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
        <div key={day} className="bg-gray-100 border-b border-gray-200 p-1 text-xs font-bold text-center">
          {day}
        </div>
      ))}
      
      {/* データ行：各スタッフのシフト */}
      {staff.map(person => (
        <React.Fragment key={person.id}>
          <div className="px-2 py-2 text-sm font-medium border-b border-gray-200 bg-gray-50 flex items-center">
            {person.name}
          </div>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const shift = shifts[person.id]?.[day];
            return (
              <ShiftCell
                key={`${person.id}-${day}`}
                staff={person}
                day={day}
                shift={shift}
                onChange={(newShift) => onShiftChange(person.id, day, newShift)}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};
```

### 🎯 シフトセル実装
```typescript
// Excel風の編集体験
const ShiftCell = ({ staff, day, shift, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState(shift?.type || '');

  return (
    <div 
      className="h-[40px] border border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-center relative"
      onClick={() => setIsEditing(true)}
      style={{
        backgroundColor: shift ? SHIFT_TYPE_CONFIG[shift.type].color + '20' : 'white'
      }}
    >
      {isEditing ? (
        <select
          className="w-full h-full text-xs border-none bg-transparent outline-none"
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            onChange({ type: e.target.value });
            setIsEditing(false);
          }}
          onBlur={() => setIsEditing(false)}
          autoFocus
        >
          <option value="">選択</option>
          {Object.keys(SHIFT_TYPE_CONFIG).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      ) : (
        <span className="text-xs font-medium truncate px-1">
          {shift?.type || ''}
        </span>
      )}
    </div>
  );
};
```

### ⌨️ Excel風キーボード操作
```typescript
// 矢印キー・Tab・Enterでの移動
const useExcelLikeNavigation = (gridRef, onMove) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gridRef.current) return;
      
      const focusedElement = document.activeElement;
      if (!focusedElement || !gridRef.current.contains(focusedElement)) return;

      const currentCell = focusedElement.closest('[data-cell-coords]');
      if (!currentCell) return;

      const [row, col] = currentCell.dataset.cellCoords.split('-').map(Number);
      let newRow = row, newCol = col;

      switch (e.key) {
        case 'ArrowRight':
        case 'Tab':
          if (!e.shiftKey) {
            newCol += 1;
            e.preventDefault();
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey && e.key === 'Tab') {
            newCol -= 1;
            e.preventDefault();
          } else if (e.key === 'ArrowLeft') {
            newCol -= 1;
          }
          break;
        case 'ArrowDown':
        case 'Enter':
          newRow += 1;
          e.preventDefault();
          break;
        case 'ArrowUp':
          newRow -= 1;
          e.preventDefault();
          break;
      }

      onMove(newRow, newCol);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

## 🛠️ 開発コマンド・環境設定

### 📦 技術スタック（親アプリと統一）
```json
{
  "name": "shift-manager-app",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18",
    "react-datepicker": "^4.25.0",
    "date-fns": "^2.30.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.3.0"
  }
}
```

### 🔧 環境設定
```bash
# 開発サーバー起動
npm run dev

# 親アプリとの連携テスト
curl http://localhost:3002/api/staff
curl http://localhost:3002/api/auth/verify
```

## 🚫 実装してはいけない機能（重要）

### ❌ 絶対に実装しない機能
1. **独自認証システム** - 親アプリに完全委譲
2. **社員情報管理** - 親アプリのAPIを使用
3. **リアルタイム機能** - WebSocket等は不要
4. **複雑なレポート機能** - 親アプリで実装
5. **履歴・スナップショット機能** - 親アプリの機能
6. **権限管理システム** - 親アプリの認証結果を使用
7. **設定管理機能** - 基本設定のみ
8. **CSVインポート** - 親アプリの社員情報を使用

### ✅ 実装すべき最小機能
1. **月次カレンダー表示**
2. **シフト選択・編集**
3. **親アプリ認証連携**
4. **データ保存・読み込み**
5. **親アプリへのデータ送信**
6. **基本的なエラーハンドリング**

## 📋 開発優先度（厳守）

### Phase 1: 基盤構築（1-2日）
1. ✅ プロジェクト初期化・環境設定
2. ✅ 親アプリ認証連携実装
3. ✅ 基本レイアウト（デザイン統一）
4. ✅ 社員情報取得機能

### Phase 2: コア機能（3-4日）
5. ✅ 月次カレンダーUI実装
6. ✅ シフト選択・編集機能
7. ✅ データ保存・読み込み
8. ✅ Excel風キーボード操作

### Phase 3: 連携機能（1-2日）
9. ✅ 親アプリへのデータ送信
10. ✅ エラーハンドリング・バリデーション
11. ✅ アプリ間ナビゲーション

### Phase 4: 最終調整（1日）
12. ✅ デザイン最終統一
13. ✅ パフォーマンス最適化
14. ✅ テスト・デバッグ

## 🎯 品質チェックリスト

### ✅ デザイン統一チェック
- [ ] ヘッダーレイアウトが親アプリと一致
- [ ] ボタンスタイルが完全に同じ
- [ ] 色使い・フォントサイズが統一
- [ ] モーダル・フィルターが同じスタイル
- [ ] レスポンシブ対応が統一

### ✅ 機能連携チェック
- [ ] 親アプリ認証が正常動作
- [ ] 社員情報取得が成功
- [ ] データ送信が正常完了
- [ ] エラー時の適切なハンドリング

### ✅ ユーザー体験チェック
- [ ] 親アプリからの自然な画面遷移
- [ ] Excel風の操作感
- [ ] 一つのアプリとしての統一感
- [ ] モバイル・タブレット対応

## 💡 重要な指示・注意事項

### 🎨 デザイン統一の重要性
**このアプリは親アプリの機能の一部として認識されるべきです。** ユーザーが別のアプリを使っている感覚を持たないよう、デザイン・操作感を完全に統一してください。

### 🔗 認証・データの委譲
**独自のシステムは構築せず、必ず親アプリに委譲してください。** これにより、統一感と保守性を維持できます。

### ⚡ 軽量性の維持
**必要最小限の機能のみ実装し、軽量性を保ってください。** 複雑な機能は親アプリで実装済みのため、重複実装は避けてください。

### 📱 Excel置き換えの実現
**このアプリの最大の目的はExcel作業からの脱却です。** Excel使用者が違和感なく移行できるよう、操作感を重視してください。

---

## 🏆 成功指標

- [ ] 親アプリとの見分けがつかないレベルのデザイン統一
- [ ] Excel作業と同等以上の効率性
- [ ] 親アプリとのシームレスなデータ連携
- [ ] 軽量・高速な動作
- [ ] 直感的で学習コストのない操作性

このガイドに従って実装することで、親アプリと完全に統合された月次シフト管理機能を実現できます。