// 設定インポート・エクスポート管理のカスタムフック

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../components/AuthProvider';
import { SettingsValidator } from '../utils/SettingsValidator';

// デバッグログ制御（統一）
const isDebugEnabled = () => typeof window !== 'undefined' && 
  process.env.NODE_ENV === 'development' && 
  window.localStorage?.getItem('app-debug') === 'true';
import { DEFAULT_PRESET_SETTINGS, DEFAULT_UNIFIED_PRESETS, PRESET_CATEGORIES } from '../components/constants/PresetSchedules';
import { getApiUrl } from '../components/constants/MainAppConstants';
import { ALL_STATUSES, STATUS_COLORS, STATUS_DISPLAY_NAMES } from '../components/timeline/TimelineUtils';
import { 
  ExportedSettings, 
  ImportOptions, 
  ImportResult, 
  ValidationResult,
  ExportOptions,
  DisplaySettings,
  ManagementSettings,
  SettingsBackup
} from '../components/types/SettingsTypes';
import { UserPresetSettings } from '../components/types/PresetTypes';

interface UseSettingsImportExportReturn {
  // エクスポート機能
  exportSettings: (options: ExportOptions, authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>) => Promise<void>;
  
  // インポート機能
  importSettings: (file: File, options: ImportOptions, authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>) => Promise<ImportResult>;
  validateImportFile: (file: File) => Promise<ValidationResult>;
  
  // バックアップ管理
  createBackup: (name: string, isAutoBackup?: boolean, authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>) => Promise<void>;
  loadBackup: (backupId: string, authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>) => Promise<ImportResult>;
  deleteBackup: (backupId: string) => void;
  getBackupList: () => SettingsBackup[];
  
  // 状態
  isExporting: boolean;
  isImporting: boolean;
  lastImportResult: ImportResult | null;
  lastValidationResult: ValidationResult | null;
}

// ローカルストレージキー
const BACKUP_STORAGE_KEY = 'callstatus-settings-backups';
const MAX_BACKUPS = 10; // 最大保存バックアップ数

export function useSettingsImportExport(): UseSettingsImportExportReturn {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);
  const [lastValidationResult, setLastValidationResult] = useState<ValidationResult | null>(null);
  
  // ファイル参照用
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 部署・グループ設定をAPIから取得
   */
  const fetchDepartmentGroupSettings = useCallback(async (authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>): Promise<ManagementSettings> => {
    try {
      const currentApiUrl = getApiUrl();
      const apiUrl = `${currentApiUrl}/api/department-settings`;
      if (isDebugEnabled()) {
        console.log('部署・グループ設定を取得中:', apiUrl);
      }
      
      // 認証付きfetchが利用可能な場合はそれを使用、そうでなければ通常のfetchを使用
      const fetchFunction = authenticatedFetch || fetch;
      const response = await fetchFunction(apiUrl);
      if (isDebugEnabled()) {
        console.log('API レスポンス:', response.status, response.ok);
      }
      
      if (response.ok) {
        const data = await response.json();
        if (isDebugEnabled()) {
          console.log('取得されたデータ:', data);
          console.log('部署数:', data.departments?.length, 'グループ数:', data.groups?.length);
        }
        
        // エクスポート用に不要なフィールドを除外
        const cleanDepartments = (data.departments || []).map((dept: any) => ({
          id: dept.id,
          type: dept.type,
          name: dept.name,
          shortName: dept.shortName,
          backgroundColor: dept.backgroundColor,
          displayOrder: dept.displayOrder
        }));
        
        const cleanGroups = (data.groups || []).map((group: any) => ({
          id: group.id,
          type: group.type,
          name: group.name,
          shortName: group.shortName,
          backgroundColor: group.backgroundColor,
          displayOrder: group.displayOrder
        }));
        
        return {
          departments: cleanDepartments,
          groups: cleanGroups
        };
      } else {
        console.warn('部署・グループ設定の取得に失敗:', response.status);
        return { departments: [], groups: [] };
      }
    } catch (error) {
      console.warn('部署・グループ設定のAPI呼び出しに失敗:', error);
      return { departments: [], groups: [] };
    }
  }, []);

  /**
   * 現在の設定を収集
   */
  const collectCurrentSettings = useCallback(async (authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>): Promise<{
    display: DisplaySettings;
    presets: UserPresetSettings;
    management: ManagementSettings;
  }> => {
    // 表示設定をLocalStorageから取得（全ステータスの完全なデータを含む）
    const customStatusColors = JSON.parse(localStorage.getItem('callstatus-statusColors') || '{}');
    const customStatusDisplayNames = JSON.parse(localStorage.getItem('callstatus-statusDisplayNames') || '{}');
    
    // 全ステータスに対してカラー設定を完全に取得（デフォルト値含む）
    const completeStatusColors: { [key: string]: string } = {};
    const completeStatusDisplayNames: { [key: string]: string } = {};
    
    ALL_STATUSES.forEach(status => {
      // カスタム色があればそれを、なければデフォルト色を設定
      completeStatusColors[status] = customStatusColors[status] || STATUS_COLORS[status] || '#6b7280';
      // カスタム表示名があればそれを、なければデフォルト表示名を設定
      completeStatusDisplayNames[status] = customStatusDisplayNames[status] || STATUS_DISPLAY_NAMES[status] || status;
    });
    
    const display: DisplaySettings = {
      maskingEnabled: localStorage.getItem('callstatus-maskingEnabled') === 'true',
      timeRange: (localStorage.getItem('callstatus-timeRange') as 'standard' | 'extended') || 'standard',
      customStatusColors: completeStatusColors,
      customStatusDisplayNames: completeStatusDisplayNames
    };

    // プリセット設定を取得（APIから最新データを取得）
    let presets: UserPresetSettings;
    try {
      if (authenticatedFetch) {
        // APIから最新のプリセット設定を取得
        try {
          const apiUrl = getApiUrl();
          const response = await authenticatedFetch(`${apiUrl}/api/preset-settings/staff/999`);
          if (response.ok) {
            const apiPresets = await response.json();
            presets = {
              presets: apiPresets.presets || DEFAULT_UNIFIED_PRESETS,
              categories: PRESET_CATEGORIES,
              pagePresetSettings: apiPresets.pagePresetSettings || DEFAULT_PRESET_SETTINGS.pagePresetSettings,
              lastModified: apiPresets.lastModified || new Date().toISOString()
            };
            console.log('エクスポート用プリセット設定をAPIから取得:', {
              presetsCount: presets.presets?.length,
              hasPageSettings: !!presets.pagePresetSettings,
              lastModified: presets.lastModified
            });
          } else {
            throw new Error(`API request failed: ${response.status}`);
          }
        } catch (apiError) {
          console.warn('API取得失敗、LocalStorageにフォールバック:', apiError);
          throw apiError; // LocalStorageフォールバックに移行
        }
      } else {
        throw new Error('authenticatedFetch not available');
      }
    } catch (error) {
      // API取得失敗時はLocalStorageからフォールバック
      try {
        const presetsJson = localStorage.getItem('userPresetSettings');
        if (presetsJson) {
          const savedPresets = JSON.parse(presetsJson);
          presets = {
            presets: savedPresets.presets || DEFAULT_UNIFIED_PRESETS,
            categories: savedPresets.categories || PRESET_CATEGORIES,
            pagePresetSettings: savedPresets.pagePresetSettings || DEFAULT_PRESET_SETTINGS.pagePresetSettings,
            lastModified: savedPresets.lastModified || new Date().toISOString()
          };
          console.log('エクスポート用プリセット設定をLocalStorageから取得:', {
            presetsCount: presets.presets?.length,
            hasPageSettings: !!presets.pagePresetSettings,
            lastModified: presets.lastModified
          });
        } else {
          // LocalStorageにも設定がない場合はデフォルト設定を構築
          presets = {
            presets: DEFAULT_UNIFIED_PRESETS,
            categories: PRESET_CATEGORIES,
            pagePresetSettings: DEFAULT_PRESET_SETTINGS.pagePresetSettings,
            lastModified: new Date().toISOString()
          };
          console.log('エクスポート用デフォルトプリセット設定を構築しました');
        }
      } catch (localStorageError) {
        console.error('LocalStorage取得エラー:', localStorageError);
        // 最終フォールバック：デフォルト設定
        presets = {
          presets: DEFAULT_UNIFIED_PRESETS,
          categories: PRESET_CATEGORIES,
          pagePresetSettings: DEFAULT_PRESET_SETTINGS.pagePresetSettings,
          lastModified: new Date().toISOString()
        };
      }
    }

    // 管理設定を取得（APIから実際のデータを取得）
    const management: ManagementSettings = await fetchDepartmentGroupSettings(authenticatedFetch);

    return { display, presets, management };
  }, [fetchDepartmentGroupSettings]);

  /**
   * 設定をエクスポート
   */
  const exportSettings = useCallback(async (options: ExportOptions, authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>) => {
    setIsExporting(true);
    
    try {
      const currentSettings = await collectCurrentSettings(authenticatedFetch);
      
      // エクスポート対象を選択
      const exportedSettings = SettingsValidator.createExportedSettings(
        options.includeDisplay ? currentSettings.display : undefined,
        options.includePresets ? currentSettings.presets : undefined,
        options.includeManagement ? currentSettings.management : undefined,
        user?.name || user?.email || 'Unknown User'
      );

      // JSONファイルとしてダウンロード
      const jsonString = JSON.stringify(exportedSettings, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `callstatus-settings-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'unknown error';
      throw new Error(`設定のエクスポートに失敗しました: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  }, [collectCurrentSettings, user]);

  /**
   * インポートファイルのバリデーション
   */
  const validateImportFile = useCallback(async (file: File): Promise<ValidationResult> => {
    try {
      // ファイル基本チェック
      const fileValidation = SettingsValidator.validateFile(file);
      if (!fileValidation.isValid) {
        setLastValidationResult(fileValidation);
        return fileValidation;
      }

      // ファイル内容読み込み
      const fileContent = await file.text();
      
      // JSON内容バリデーション
      const contentValidation = await SettingsValidator.validateJsonContent(fileContent);
      setLastValidationResult(contentValidation);
      
      return contentValidation;
      
    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [`ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : 'unknown error'}`],
        warnings: []
      };
      setLastValidationResult(errorResult);
      return errorResult;
    }
  }, []);

  /**
   * 設定をインポート
   */
  const importSettings = useCallback(async (file: File, options: ImportOptions, authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>): Promise<ImportResult> => {
    console.log('=== インポート開始 ===', { fileName: file.name, fileSize: file.size, options });
    setIsImporting(true);
    
    try {
      // バリデーション実行
      console.log('バリデーション実行中...');
      const validation = await validateImportFile(file);
      console.log('バリデーション結果:', validation);
      
      if (!validation.isValid || !validation.parsedSettings) {
        console.error('バリデーション失敗:', validation.errors);
        const result: ImportResult = {
          success: false,
          message: '設定ファイルが無効です',
          details: {
            displaySettingsImported: false,
            presetsImported: 0,
            managementSettingsImported: false,
            errors: validation.errors,
            warnings: validation.warnings
          }
        };
        setLastImportResult(result);
        return result;
      }

      const settings = validation.parsedSettings;
      console.log('パース済み設定:', settings);
      let displayImported = false;
      let presetsImported = 0;
      let managementImported = false;
      const errors: string[] = [];
      const warnings = [...validation.warnings];

      // 表示設定のインポート
      if (options.includeDisplay && settings.settings.display) {
        console.log('表示設定インポート開始:', settings.settings.display);
        try {
          const display = settings.settings.display;
          localStorage.setItem('callstatus-maskingEnabled', display.maskingEnabled.toString());
          localStorage.setItem('callstatus-timeRange', display.timeRange);
          
          if (display.customStatusColors) {
            localStorage.setItem('callstatus-statusColors', JSON.stringify(display.customStatusColors));
          }
          
          if (display.customStatusDisplayNames) {
            localStorage.setItem('callstatus-statusDisplayNames', JSON.stringify(display.customStatusDisplayNames));
          }
          
          displayImported = true;
          console.log('表示設定インポート完了');
        } catch (error) {
          console.error('表示設定インポートエラー:', error);
          errors.push(`表示設定のインポートに失敗: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      // プリセット設定のインポート
      if (options.includePresets && settings.settings.presets) {
        console.log('プリセット設定インポート開始:', settings.settings.presets);
        try {
          const presets = settings.settings.presets;
          
          if (options.mergePresets) {
            console.log('マージモードでプリセット設定をインポート');
            // 既存設定とマージ
            const existingPresets = localStorage.getItem('userPresetSettings');
            if (existingPresets) {
              const existing = JSON.parse(existingPresets);
              // マージロジック（IDベースで重複除去）
              const mergedPresets = [...existing.presets];
              presets.presets?.forEach(newPreset => {
                const existingIndex = mergedPresets.findIndex(p => p.id === newPreset.id);
                if (existingIndex >= 0) {
                  mergedPresets[existingIndex] = newPreset; // 上書き
                } else {
                  mergedPresets.push(newPreset); // 追加
                }
              });
              presets.presets = mergedPresets;
            }
          }
          
          localStorage.setItem('userPresetSettings', JSON.stringify(presets));
          presetsImported = presets.presets?.length || 0;
          console.log('プリセット設定インポート完了:', presetsImported, '件');
        } catch (error) {
          console.error('プリセット設定インポートエラー:', error);
          errors.push(`プリセット設定のインポートに失敗: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      // 管理設定のインポート（管理者のみ）
      if (options.includeManagement && settings.settings.management) {
        if (user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN') {
          console.log('管理設定インポート開始:', settings.settings.management);
        
        try {
          const management = settings.settings.management;
          const currentApiUrl = getApiUrl();
          
          // 部署・グループ設定を統合して送信
          const allSettings = [
            ...(management.departments || []).map(dept => ({
              type: 'department' as const,
              name: dept.name,
              shortName: dept.shortName,
              backgroundColor: dept.backgroundColor,
              displayOrder: dept.displayOrder || 0
            })),
            ...(management.groups || []).map(group => ({
              type: 'group' as const,
              name: group.name,
              shortName: group.shortName,
              backgroundColor: group.backgroundColor,
              displayOrder: group.displayOrder || 0
            }))
          ];
          
          console.log('部署・グループ設定をAPIに送信:', allSettings);
          
          // 認証付きfetchが利用可能な場合はそれを使用、そうでなければ通常のfetchを使用
          const fetchFunction = authenticatedFetch || fetch;
          const response = await fetchFunction(`${currentApiUrl}/api/department-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allSettings)
          });
          
          if (response.ok) {
            managementImported = true;
            console.log('部署・グループ設定インポート完了');
          } else {
            console.error('部署・グループ設定API失敗:', response.status);
            errors.push(`部署・グループ設定のインポートに失敗: API応答 ${response.status}`);
          }
        } catch (error) {
          console.error('部署・グループ設定インポートエラー:', error);
          errors.push(`部署・グループ設定のインポートに失敗: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
        } else {
          console.warn('管理設定のインポートはスキップされました: 管理者権限が必要です (現在の権限:', user?.role, ')');
          warnings.push(`管理設定のインポートには管理者権限が必要です (現在の権限: ${user?.role || '未認証'})`);
        }
      }

      const result: ImportResult = {
        success: errors.length === 0,
        message: errors.length === 0 ? '設定のインポートが完了しました' : 'インポート中にエラーが発生しました',
        details: {
          displaySettingsImported: displayImported,
          presetsImported,
          managementSettingsImported: managementImported,
          errors,
          warnings
        }
      };

      console.log('インポート結果:', result);
      setLastImportResult(result);
      return result;
      
    } catch (error) {
      console.error('インポート処理で予期しないエラー:', error);
      const result: ImportResult = {
        success: false,
        message: `インポートエラー: ${error instanceof Error ? error.message : 'unknown error'}`,
        details: {
          displaySettingsImported: false,
          presetsImported: 0,
          managementSettingsImported: false,
          errors: [error instanceof Error ? error.message : 'unknown error'],
          warnings: []
        }
      };
      console.log('エラー結果:', result);
      setLastImportResult(result);
      return result;
    } finally {
      setIsImporting(false);
    }
  }, [validateImportFile, user]);

  /**
   * バックアップ作成
   */
  const createBackup = useCallback(async (name: string, isAutoBackup = false, authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>) => {
    try {
      const currentSettings = await collectCurrentSettings(authenticatedFetch);
      const exportedSettings = SettingsValidator.createExportedSettings(
        currentSettings.display,
        currentSettings.presets,
        currentSettings.management,
        user?.name || user?.email || 'Unknown User'
      );

      const backup: SettingsBackup = {
        id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        createdAt: new Date().toISOString(),
        settings: exportedSettings,
        isAutoBackup
      };

      // 既存バックアップリストを取得
      const existingBackups = getBackupList();
      
      // 新しいバックアップを追加
      const updatedBackups = [backup, ...existingBackups];
      
      // 最大数を超えた場合は古いものを削除（自動バックアップ優先で削除）
      if (updatedBackups.length > MAX_BACKUPS) {
        const toDelete = updatedBackups.slice(MAX_BACKUPS);
        const remaining = updatedBackups.slice(0, MAX_BACKUPS);
        localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updatedBackups));
      }

    } catch (error) {
      console.error('バックアップ作成エラー:', error);
      throw new Error(`バックアップの作成に失敗しました: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }, [collectCurrentSettings, user]);

  /**
   * バックアップからロード
   */
  const loadBackup = useCallback(async (backupId: string, authenticatedFetch?: (url: string, options?: RequestInit) => Promise<Response>): Promise<ImportResult> => {
    try {
      const backups = getBackupList();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        return {
          success: false,
          message: 'バックアップが見つかりません'
        };
      }

      // バックアップからJSONファイルを作成してインポート処理を実行
      const jsonString = JSON.stringify(backup.settings);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const file = new File([blob], `backup-${backup.name}.json`, { type: 'application/json' });

      // 全設定をインポート（authenticatedFetchを渡す）
      return await importSettings(file, {
        includeDisplay: true,
        includePresets: true,
        includeManagement: user?.role === 'ADMIN',
        overwriteExisting: true,
        mergePresets: false
      }, authenticatedFetch);

    } catch (error) {
      return {
        success: false,
        message: `バックアップの読み込みに失敗しました: ${error instanceof Error ? error.message : 'unknown error'}`
      };
    }
  }, [importSettings, user]);

  /**
   * バックアップ削除
   */
  const deleteBackup = useCallback((backupId: string) => {
    try {
      const backups = getBackupList();
      const updatedBackups = backups.filter(b => b.id !== backupId);
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updatedBackups));
    } catch (error) {
      console.error('バックアップ削除エラー:', error);
    }
  }, []);

  /**
   * バックアップリスト取得
   */
  const getBackupList = useCallback((): SettingsBackup[] => {
    try {
      const backupsJson = localStorage.getItem(BACKUP_STORAGE_KEY);
      return backupsJson ? JSON.parse(backupsJson) : [];
    } catch (error) {
      console.error('バックアップリスト取得エラー:', error);
      return [];
    }
  }, []);

  return {
    exportSettings,
    importSettings,
    validateImportFile,
    createBackup,
    loadBackup,
    deleteBackup,
    getBackupList,
    isExporting,
    isImporting,
    lastImportResult,
    lastValidationResult
  };
}