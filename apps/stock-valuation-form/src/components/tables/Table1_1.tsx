import { useState, useEffect } from 'react';
import { ResetButton } from '@/components/ui/ResetButton';
import { bb } from './shared';
import { parseNum, pct } from './shared';
import type { TableProps } from '@/types/form';
import {
  HeaderLeft,
  HeaderRight,
  Shareholders,
  JudgmentMatrix,
  MinoritySection,
  DefinitionsPanel,
} from './table1-1';

const T = 'table1_1' as const;
const DEFAULT_ROWS = 10;

const HEADER_FIELDS = [
  'companyName', 'representative', 'taxDate', 'fiscalStart', 'fiscalEnd', 'address',
  ...([0, 1, 2, 3].flatMap((i) => [`businessDesc_${i}`, `businessCode_${i}`, `salesRatio_${i}`])),
];

export function Table1_1({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  const [defOpen, setDefOpen] = useState(false);

  // 株主行管理
  const rowCount = Math.max(parseNum(g('sh_count')) || DEFAULT_ROWS, DEFAULT_ROWS);
  const setRowCount = (n: number) => u('sh_count', String(n));
  const indices = Array.from({ length: rowCount }, (_, i) => i);

  // リセット: ヘッダー（会社情報）
  const resetHeader = () => {
    if (!window.confirm('会社情報をすべてリセットしますか？')) return;
    HEADER_FIELDS.forEach((f) => u(f, ''));
  };

  // 自動計算
  const totalSharesSum = indices.reduce((s, i) => s + parseNum(g(`sh_shares_${i}`)), 0);
  const dozokuVotesSum = indices.reduce((s, i) => g(`sh_dozoku_${i}`) === '1' ? s + parseNum(g(`sh_votes_${i}`)) : s, 0);
  const hittouVotesSum = indices.reduce((s, i) => g(`sh_hittou_${i}`) === '1' ? s + parseNum(g(`sh_votes_${i}`)) : s, 0);
  const totalVotesSum = indices.reduce((s, i) => s + parseNum(g(`sh_votes_${i}`)), 0);
  const ratio5 = pct(dozokuVotesSum, totalVotesSum);
  const ratio6 = pct(hittouVotesSum, totalVotesSum);

  // ① 発行済株式総数・⑤議決権割合をフォーム状態に同期（他の表から参照用）
  useEffect(() => {
    updateField(T, 'total_shares_sum', totalSharesSum > 0 ? String(totalSharesSum) : '');
    updateField(T, 'ratio5', ratio5 !== null ? String(ratio5) : '');
  }, [totalSharesSum, ratio5, updateField]);

  // 判定ロジック: ⑤⑥ → マトリクス → 株主区分
  const matrixRow: 'over50' | 'under50' | null = ratio5 !== null ? (ratio5 > 50 ? 'over50' : 'under50') : null;
  const matrixCol: 0 | 1 | 2 | null = ratio6 !== null ? (ratio6 > 50 ? 0 : ratio6 >= 30 ? 1 : 2) : null;
  const autoClass: '同族株主等' | '同族株主等以外' | null = matrixRow === 'over50' ? '同族株主等' : matrixRow === 'under50' ? '同族株主等以外' : null;

  // 少数株式所有者の判定ロジック
  const mOfficer = g('minority_officer');
  const mCentral = g('minority_central');
  const mCentralOther = g('minority_central_other');
  const minorityResult: '原則的評価方式等' | '配当還元方式' | null =
    mOfficer === 'である' ? '原則的評価方式等' :
    mOfficer === 'でない' && mCentral === 'である' ? '原則的評価方式等' :
    mOfficer === 'でない' && mCentral === 'でない' && mCentralOther === 'がいる' ? '配当還元方式' :
    mOfficer === 'でない' && mCentral === 'でない' && mCentralOther === 'がいない' ? '原則的評価方式等' :
    null;

  return (
    <div className="gov-form">
      {/* タイトル行 */}
      <div style={{ padding: '3px 6px', fontWeight: 700, fontSize: 11, ...bb, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>第１表の１　評価上の株主の判定及び会社規模の判定の明細書</span>
        <ResetButton onClick={resetHeader} label="会社情報リセット" />
      </div>

      {/* 会社情報ヘッダー */}
      <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', ...bb }}>
        <HeaderLeft g={g} u={u} />
        <HeaderRight g={g} u={u} />
      </div>

      {/* メイン2列: 株主判定 + 判定フロー */}
      <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', alignItems: 'stretch' }}>
        {/* 左: 株主テーブル */}
        <Shareholders
          g={g}
          u={u}
          rowCount={rowCount}
          setRowCount={setRowCount}
          totalSharesSum={totalSharesSum}
          dozokuVotesSum={dozokuVotesSum}
          hittouVotesSum={hittouVotesSum}
          totalVotesSum={totalVotesSum}
          ratio5={ratio5}
          ratio6={ratio6}
        />

        {/* 右: 判定フロー */}
        <div className="panel-right" style={{ display: 'flex', flexDirection: 'column' }}>
          <JudgmentMatrix matrixRow={matrixRow} matrixCol={matrixCol} autoClass={autoClass} />
          <MinoritySection g={g} u={u} minorityResult={minorityResult} />
        </div>
      </div>

      {/* 用語の定義 */}
      <DefinitionsPanel open={defOpen} onToggle={() => setDefOpen((v) => !v)} />
    </div>
  );
}
