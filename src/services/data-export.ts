/**
 * Data Export/Import Service
 * Handles backup and restore of game data
 */

import type { GameData } from '../types/game-data';

const STORAGE_KEY = 'earthOnlineDataV3';

/**
 * Export game data to JSON file
 */
export function exportGameData(data: GameData): void {
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `earth-online-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy game data to clipboard
 */
export async function copyDataToClipboard(data: GameData): Promise<boolean> {
  const dataStr = JSON.stringify(data, null, 2);

  try {
    await navigator.clipboard.writeText(dataStr);
    return true;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}

/**
 * Validate imported data structure
 * Returns validation result with errors if any
 */
export function validateImportData(data: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('无效的数据格式：不是有效的 JSON 对象');
    return { valid: false, errors, warnings };
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  const requiredFields = ['customTasks', 'mainQuests'];
  for (const field of requiredFields) {
    if (!(field in obj)) {
      warnings.push(`缺少字段: ${field}，将使用默认值`);
    }
  }

  // Check array fields
  const arrayFields = [
    'customTasks',
    'archivedTasks',
    'mainQuests',
    'archivedMainQuests',
    'recurringTasks',
    'weeklyGoals',
    'habits',
    'events',
    'activeSeasons',
  ];
  for (const field of arrayFields) {
    if (field in obj && !Array.isArray(obj[field])) {
      errors.push(`字段 ${field} 应该是数组类型`);
    }
  }

  // Check numeric fields
  const numericFields = ['level', 'experience'];
  for (const field of numericFields) {
    if (field in obj && typeof obj[field] !== 'number') {
      warnings.push(`字段 ${field} 应该是数字类型，将尝试转换`);
    }
  }

  const resources = obj.resources as Record<string, unknown> | undefined;
  const money = resources?.money as Record<string, unknown> | undefined;
  if (!resources || !money || typeof money.balance !== 'number') {
    errors.push('导入文件格式过旧或不完整：缺少 resources.money.balance（金币字段）');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Import game data from file
 * Returns a promise that resolves with the imported data or rejects with error
 */
export function importFromFile(): Promise<{
  data: Partial<GameData>;
  validation: ReturnType<typeof validateImportData>;
}> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('没有选择文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          const validation = validateImportData(importedData);

          resolve({
            data: importedData as Partial<GameData>,
            validation,
          });
        } catch {
          reject(new Error('文件格式错误：不是有效的 JSON'));
        }
      };

      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };

      reader.readAsText(file);
    };

    // Handle cancel
    input.addEventListener('cancel', () => {
      reject(new Error('已取消'));
    });

    input.click();
  });
}

/**
 * Get data statistics for display
 */
export function getDataStats(data: GameData): {
  tasks: number;
  archivedTasks: number;
  quests: number;
  seasons: number;
  habits: number;
  events: number;
  totalXP: number;
} {
  return {
    tasks: data.customTasks?.length || 0,
    archivedTasks: data.archivedTasks?.length || 0,
    quests: data.mainQuests?.length || 0,
    seasons: data.activeSeasons?.length || 0,
    habits: data.habits?.length || 0,
    events: data.events?.length || 0,
    totalXP: data.experience || 0,
  };
}

/**
 * Clear all data from localStorage
 */
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get raw data from localStorage
 */
export function getRawStorageData(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Get storage size in bytes
 */
export function getStorageSize(): number {
  const data = getRawStorageData();
  return data ? new Blob([data]).size : 0;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
