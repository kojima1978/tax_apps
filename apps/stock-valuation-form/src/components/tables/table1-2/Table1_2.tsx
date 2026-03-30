import React, { useEffect } from 'react';
import { TableTitleBar } from '../TableTitleBar';
import { bb, parseNum } from '../shared';
import type { TableProps } from '@/types/form';
import { SectionTitle } from './SectionTitle';
import { InputLeft } from './InputLeft';
import { InputRight } from './InputRight';
import { EmployeeClass } from './EmployeeClass';
import { IndustrySelect } from './IndustrySelect';
import { SizeMatrixLeft } from './SizeMatrixLeft';
import { SizeMatrixRight } from './SizeMatrixRight';
import { Note } from './Note';
import { SizeResult } from './SizeResult';
import { CapitalChanges } from './CapitalChanges';

const T = 'table1_2' as const;

// 会社規模レベル: 4=大会社, 3=0.90, 2=0.75, 1=0.60, 0=小会社
type SizeLevel = 0 | 1 | 2 | 3 | 4;
const SIZE_RESULTS: Record<SizeLevel, string> = {
  4: '大会社', 3: '中0.90', 2: '中0.75', 1: '中0.60', 0: '小会社',
};
const LEVEL_NAMES: Record<SizeLevel, string> = {
  4: '大会社', 3: '中の大(0.90)', 2: '中の中(0.75)', 1: '中の小(0.60)', 0: '小会社',
};

const ASSET_THRESHOLDS: Record<string, number[]> = {
  '卸売業':                    [2_000_000, 400_000, 200_000, 70_000],
  '小売・サービス':             [1_500_000, 500_000, 250_000, 40_000],
  '卸売業、小売・サービス業以外': [1_500_000, 500_000, 250_000, 50_000],
};

const TRANS_THRESHOLDS: Record<string, number[]> = {
  '卸売業':                    [3_000_000, 700_000, 350_000, 200_000],
  '小売・サービス':             [2_000_000, 500_000, 250_000,  60_000],
  '卸売業、小売・サービス業以外': [1_500_000, 400_000, 200_000,  80_000],
};

function classify(value: number, thresholds: number[]): SizeLevel {
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]!) return (4 - i) as SizeLevel;
  }
  return 0;
}

function classifyEmp(emp: number): SizeLevel {
  if (emp > 35) return 4;
  if (emp > 20) return 2;
  if (emp > 5) return 1;
  return 0;
}

export function Table1_2({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  // 従業員数の自動計算
  const regularEmp = parseNum(g('regular_emp'));
  const partEmp = parseNum(g('part_emp'));
  const totalEmp = regularEmp + Math.floor(partEmp * 0.5);
  const totalEmpDisplay = (regularEmp > 0 || partEmp > 0) ? String(totalEmp) : '';

  // 自動判定ロジック
  const industryType = g('industry_type');
  const totalAssets = parseNum(g('total_assets'));
  const transactionAmount = parseNum(g('transaction_amount'));
  const hasAllFields = !!(totalEmpDisplay && industryType && g('total_assets') && g('transaction_amount'));
  const is70Over = totalEmpDisplay !== '' && totalEmp >= 70;

  // 判定レベルの計算
  const assetLevel = industryType ? classify(totalAssets, ASSET_THRESHOLDS[industryType] ?? []) : null;
  const empLevel = classifyEmp(totalEmp);
  const transLevel = industryType ? classify(transactionAmount, TRANS_THRESHOLDS[industryType] ?? []) : null;
  const sectionTe = (assetLevel !== null) ? Math.min(assetLevel, empLevel) as SizeLevel : null;
  const finalLevel = (sectionTe !== null && transLevel !== null) ? Math.max(sectionTe, transLevel) as SizeLevel : null;

  useEffect(() => {
    if (is70Over) {
      updateField(T, 'size_result', '大会社');
    } else if (hasAllFields && finalLevel !== null) {
      updateField(T, 'size_result', SIZE_RESULTS[finalLevel]);
    }
  }, [is70Over, hasAllFields, finalLevel, updateField]);

  // セル色分け
  const showCell = hasAllFields && !is70Over;
  const iCol = industryType === '卸売業' ? 0 : industryType === '小売・サービス' ? 1 : 2;
  const assetAdopted = showCell && assetLevel !== null && assetLevel <= empLevel;
  const empAdopted = showCell && assetLevel !== null && empLevel <= assetLevel;

  const aBg = (lv: SizeLevel, col: number): React.CSSProperties =>
    (!showCell || assetLevel !== lv || col !== iCol) ? {} :
    assetAdopted ? { background: '#bbdefb', fontWeight: 700 } : { background: '#e3f2fd' };
  const eBg = (lv: SizeLevel): React.CSSProperties =>
    (!showCell || empLevel !== lv) ? {} :
    empAdopted ? { background: '#c8e6c9', fontWeight: 700 } : { background: '#e8f5e9' };
  const tBg = (lv: SizeLevel, col: number): React.CSSProperties =>
    (!showCell || transLevel !== lv || col !== iCol) ? {} : { background: '#fff3e0' };
  const jBg = (lv: SizeLevel): React.CSSProperties =>
    (!showCell || finalLevel !== lv) ? {} : { background: '#fff8e1', fontWeight: 700 };

  const onReset = () => {
    ['total_assets', 'transaction_amount', 'regular_emp', 'part_emp', 'industry_type', 'size_result'].forEach(f => u(f, ''));
  };

  return (
    <div className="gov-form">
      <TableTitleBar
        title="第１表の２　評価上の株主の判定及び会社規模の判定の明細書（続）"
        fontSize={11}
        companyNameReadonly={getField('table1_1', 'companyName')}
      />

      <SectionTitle onReset={onReset} />

      {/* 入力ガイド */}
      {!is70Over && !hasAllFields && (
        <div className="no-print" style={{ padding: '3px 6px', fontSize: 7.5, color: '#795548', background: '#fff3e0', ...bb }}>
          <span style={{ fontWeight: 700 }}>未入力: </span>
          {!totalEmpDisplay && <span style={{ marginRight: 8 }}>○ 従業員数</span>}
          {!industryType && <span style={{ marginRight: 8 }}>○ 業種</span>}
          {!g('total_assets') && <span style={{ marginRight: 8 }}>○ 総資産価額</span>}
          {!g('transaction_amount') && <span style={{ marginRight: 8 }}>○ 取引金額</span>}
        </div>
      )}

      {/* 判定要素 左右 */}
      <div style={{ display: 'flex' }}>
        <InputLeft g={g} u={u} />
        <InputRight g={g} u={u} totalEmpDisplay={totalEmpDisplay} />
      </div>

      <EmployeeClass totalEmp={totalEmp} totalEmpDisplay={totalEmpDisplay} />

      {/* グループ４: 70人以上でグレーアウト */}
      <div style={is70Over ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
        <IndustrySelect g={g} u={u} />

        {/* マトリクス 左右 */}
        <div style={{ display: 'flex' }}>
          <SizeMatrixLeft aBg={aBg} eBg={eBg} />
          <SizeMatrixRight tBg={tBg} jBg={jBg} />
        </div>

        {/* 判定過程の可視化（70人未満） */}
        {showCell && finalLevel !== null && sectionTe !== null && assetLevel !== null && transLevel !== null && (
          <div className="no-print" style={{ padding: '3px 6px', fontSize: 7.5, background: '#f5f5f5', lineHeight: 1.8, ...bb }}>
            <div style={{ fontWeight: 700, marginBottom: 1 }}>▶ 判定過程</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
              <span>総資産価額 → <span style={{ background: assetAdopted ? '#bbdefb' : '#e3f2fd', padding: '0 3px', fontWeight: assetAdopted ? 700 : 400 }}>{LEVEL_NAMES[assetLevel]}</span></span>
              <span>従業員数 → <span style={{ background: empAdopted ? '#c8e6c9' : '#e8f5e9', padding: '0 3px', fontWeight: empAdopted ? 700 : 400 }}>{LEVEL_NAMES[empLevel]}</span></span>
              <span>㋠（下位） = <span style={{ fontWeight: 700, background: '#e8eaf6', padding: '0 3px' }}>{LEVEL_NAMES[sectionTe]}</span></span>
              <span>取引金額 → <span style={{ background: '#fff3e0', padding: '0 3px' }}>{LEVEL_NAMES[transLevel]}</span></span>
              <span>最終判定（上位） = <span style={{ fontWeight: 700, background: '#fff8e1', padding: '0 3px' }}>{LEVEL_NAMES[finalLevel]}</span></span>
            </div>
          </div>
        )}

        <Note />
      </div>

      {/* 判定過程の可視化（70人以上） */}
      {is70Over && totalEmpDisplay && (
        <div className="no-print" style={{ padding: '3px 6px', fontSize: 7.5, background: '#f5f5f5', ...bb }}>
          <span style={{ fontWeight: 700 }}>▶ 判定過程: </span>
          <span>従業員数 {totalEmp}人（70人以上）→ </span>
          <span style={{ fontWeight: 700, background: '#fff8e1', padding: '0 4px' }}>大会社</span>
        </div>
      )}

      <SizeResult g={g} u={u} />
      <CapitalChanges g={g} u={u} />
    </div>
  );
}
