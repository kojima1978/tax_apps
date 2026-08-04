// 管理画面で共用する表示名。

import type { IndustryLevel } from '@/data/industryDataset';
import type { DiffStatus } from './parsePastedTable';

export const LEVEL_LABELS: Readonly<Record<IndustryLevel, string>> = {
  LARGE: '大',
  MIDDLE: '中',
  SMALL: '小',
};

export const DIFF_STATUS_LABELS: Readonly<Record<DiffStatus, string>> = {
  new: '新規',
  changed: '変更',
  same: '据置',
};
