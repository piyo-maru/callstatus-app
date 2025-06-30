// 設定インポート・エクスポート管理のカスタムフック

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../components/AuthProvider';
import { SettingsValidator } from '../utils/SettingsValidator';
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
  exportSettings: (options: ExportOptions) => Promise<void>;
  
  // インポート機能
  importSettings: (file: File, options: ImportOptions) => Promise<ImportResult>;
  validateImportFile: (file: File) => Promise<ValidationResult>;
  
  // バックアップ管理
  createBackup: (name: string, isAutoBackup?: boolean) => Promise<void>;
  loadBackup: (backupId: string) => Promise<ImportResult>;
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
   * 現在の設定を収集
   */
  const collectCurrentSettings = useCallback((): {
    display: DisplaySettings;
    presets: UserPresetSettings | null;
    management: ManagementSettings | null;
  } => {
    // 表示設定をLocalStorageから取得
    const display: DisplaySettings = {
      viewMode: (localStorage.getItem('callstatus-viewMode') as 'normal' | 'compact') || 'normal',
      maskingEnabled: localStorage.getItem('callstatus-maskingEnabled') === 'true',
      timeRange: (localStorage.getItem('callstatus-timeRange') as 'standard' | 'extended') || 'standard',
      customStatusColors: JSON.parse(localStorage.getItem('callstatus-statusColors') || '{}'),
      customStatusDisplayNames: JSON.parse(localStorage.getItem('callstatus-statusDisplayNames') || '{}')
    };

    // プリセット設定を取得
    let presets: UserPresetSettings | null = null;
    try {
      const presetsJson = localStorage.getItem('callstatus-presets');
      if (presetsJson) {
        presets = JSON.parse(presetsJson);
      }
    } catch (error) {
      console.warn('プリセット設定の読み込みに失敗:', error);
    }

    // 管理設定を取得（管理者のみ）
    let management: ManagementSettings | null = null;
    if (user?.role === 'ADMIN') {
      try {
        const departmentsJson = localStorage.getItem('callstatus-departments');
        const groupsJson = localStorage.getItem('callstatus-groups');
        
        if (departmentsJson || groupsJson) {
          management = {
            departments: departmentsJson ? JSON.parse(departmentsJson) : [],
            groups: groupsJson ? JSON.parse(groupsJson) : []
          };
        }
      } catch (error) {
        console.warn('管理設定の読み込みに失敗:', error);
      }
    }

    return { display, presets, management };
  }, [user]);

  /**
   * 設定をエクスポート
   */
  const exportSettings = useCallback(async (options: ExportOptions) => {
    setIsExporting(true);
    
    try {
      const currentSettings = collectCurrentSettings();
      
      // エクスポート対象を選択
      const exportedSettings = SettingsValidator.createExportedSettings(
        options.includeDisplay ? currentSettings.display : undefined,
        options.includePresets ? currentSettings.presets || undefined : undefined,
        options.includeManagement ? currentSettings.management || undefined : undefined,
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
  const importSettings = useCallback(async (file: File, options: ImportOptions): Promise<ImportResult> => {
    setIsImporting(true);
    
    try {
      // バリデーション実行
      const validation = await validateImportFile(file);
      if (!validation.isValid || !validation.parsedSettings) {
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
      let displayImported = false;
      let presetsImported = 0;
      let managementImported = false;
      const errors: string[] = [];
      const warnings = [...validation.warnings];

      // 表示設定のインポート
      if (options.includeDisplay && settings.settings.display) {
        try {
          const display = settings.settings.display;
          localStorage.setItem('callstatus-viewMode', display.viewMode);
          localStorage.setItem('callstatus-maskingEnabled', display.maskingEnabled.toString());
          localStorage.setItem('callstatus-timeRange', display.timeRange);
          
          if (display.customStatusColors) {
            localStorage.setItem('callstatus-statusColors', JSON.stringify(display.customStatusColors));
          }
          
          if (display.customStatusDisplayNames) {
            localStorage.setItem('callstatus-statusDisplayNames', JSON.stringify(display.customStatusDisplayNames));
          }
          
          displayImported = true;
        } catch (error) {
          errors.push(`表示設定のインポートに失敗: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      // プリセット設定のインポート
      if (options.includePresets && settings.settings.presets) {
        try {
          const presets = settings.settings.presets;
          
          if (options.mergePresets) {
            // 既存設定とマージ
            const existingPresets = localStorage.getItem('callstatus-presets');
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
          
          localStorage.setItem('callstatus-presets', JSON.stringify(presets));
          presetsImported = presets.presets?.length || 0;
        } catch (error) {
          errors.push(`プリセット設定のインポートに失敗: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      // 管理設定のインポート（管理者のみ）
      if (options.includeManagement && settings.settings.management && user?.role === 'ADMIN') {
        try {
          const management = settings.settings.management;
          
          if (management.departments) {
            localStorage.setItem('callstatus-departments', JSON.stringify(management.departments));
          }
          
          if (management.groups) {
            localStorage.setItem('callstatus-groups', JSON.stringify(management.groups));
          }
          
          managementImported = true;
        } catch (error) {
          errors.push(`管理設定のインポートに失敗: ${error instanceof Error ? error.message : 'unknown error'}`);
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

      setLastImportResult(result);
      return result;
      
    } catch (error) {
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
      setLastImportResult(result);
      return result;
    } finally {
      setIsImporting(false);
    }
  }, [validateImportFile, user]);

  /**
   * バックアップ作成
   */
  const createBackup = useCallback(async (name: string, isAutoBackup = false) => {
    try {
      const currentSettings = collectCurrentSettings();
      const exportedSettings = SettingsValidator.createExportedSettings(
        currentSettings.display,
        currentSettings.presets || undefined,
        currentSettings.management || undefined,
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
  const loadBackup = useCallback(async (backupId: string): Promise<ImportResult> => {
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

      // 全設定をインポート
      return await importSettings(file, {
        includeDisplay: true,
        includePresets: true,
        includeManagement: user?.role === 'ADMIN',
        overwriteExisting: true,
        mergePresets: false
      });

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