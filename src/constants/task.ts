import type { Effort } from '../types/task';
import type { TranslationKey } from '../lib/i18n/types';

export const EFFORT_CONFIG: Record<Effort, {
  icon: string;
  labelKey: TranslationKey;
  timeKey: TranslationKey;
}> = {
  light: { icon: '🪶', labelKey: 'task.effort.light_label', timeKey: 'task.effort.light_time' },
  medium: { icon: '📦', labelKey: 'task.effort.medium_label', timeKey: 'task.effort.medium_time' },
  heavy: { icon: '🏋️', labelKey: 'task.effort.heavy_label', timeKey: 'task.effort.heavy_time' },
};
