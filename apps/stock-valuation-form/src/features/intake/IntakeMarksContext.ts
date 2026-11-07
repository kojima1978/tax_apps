import { createContext } from 'react';
import type { IntakeMarks } from '@/lib/intake';

/**
 * 外部ツールが入れた欄の控え（鍵は「<バケット>.<保存キー>」）。
 *
 * GridForm は表の中でこれを引いて「自動入力した欄」に印を付ける。既定は空なので、
 * 印刷用の描画やテストで Provider を置かなくても何も起きない。
 */
export const IntakeMarksContext = createContext<IntakeMarks>({});
