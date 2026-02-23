import React, { useEffect } from 'react';
import { NumberField } from '@/components/ui/NumberField';
import { FormField } from '@/components/ui/FormField';
import type { TableId } from '@/types/form';

interface Props {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
}

const T: TableId = 'table1_2';

const bb = { borderBottom: '0.5px solid #000' } as const;
const br = { borderRight: '0.5px solid #000' } as const;
const bl = { borderLeft: '0.5px solid #000' } as const;

// 会社規模レベル: 4=大会社, 3=0.90, 2=0.75, 1=0.60, 0=小会社
type SizeLevel = 0 | 1 | 2 | 3 | 4;
const SIZE_RESULTS: Record<SizeLevel, string> = {
  4: '大会社', 3: '中0.90', 2: '中0.75', 1: '中0.60', 0: '小会社',
};
const LEVEL_NAMES: Record<SizeLevel, string> = {
  4: '大会社', 3: '中の大(0.90)', 2: '中の中(0.75)', 1: '中の小(0.60)', 0: '小会社',
};

// 総資産価額の閾値（千円）: [大会社, 0.90, 0.75, 0.60] の下限
const ASSET_THRESHOLDS: Record<string, number[]> = {
  '卸売業':                    [2_000_000, 400_000, 200_000, 70_000],
  '小売・サービス':             [1_500_000, 500_000, 250_000, 40_000],
  '卸売業、小売・サービス業以外': [1_500_000, 500_000, 250_000, 50_000],
};

// 取引金額の閾値（千円）
const TRANS_THRESHOLDS: Record<string, number[]> = {
  '卸売業':                    [3_000_000, 700_000, 350_000, 200_000],
  '小売・サービス':             [2_000_000, 500_000, 250_000,  60_000],
  '卸売業、小売・サービス業以外': [1_500_000, 400_000, 200_000,  80_000],
};

function classify(value: number, thresholds: number[]): SizeLevel {
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) return (4 - i) as SizeLevel;
  }
  return 0;
}

// 従業員数の区分: >35→4, >20→2, >5→1, ≤5→0
function classifyEmp(emp: number): SizeLevel {
  if (emp > 35) return 4;
  if (emp > 20) return 2;
  if (emp > 5) return 1;
  return 0;
}

export function Table1_2({ getField, updateField }: Props) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  // 従業員数の自動計算: 正社員 + 正社員以外 × 0.5
  const regularEmp = parseInt(g('regular_emp'), 10) || 0;
  const partEmp = parseInt(g('part_emp'), 10) || 0;
  const totalEmp = regularEmp + Math.floor(partEmp * 0.5);
  const totalEmpDisplay = (regularEmp > 0 || partEmp > 0) ? String(totalEmp) : '';

  // 自動判定ロジック
  const industryType = g('industry_type');
  const totalAssets = parseInt(g('total_assets'), 10) || 0;
  const transactionAmount = parseInt(g('transaction_amount'), 10) || 0;
  const hasAllFields = !!(totalEmpDisplay && industryType && g('total_assets') && g('transaction_amount'));
  const is70Over = totalEmpDisplay !== '' && totalEmp >= 70;

  // 判定レベルの計算
  const assetLevel = industryType ? classify(totalAssets, ASSET_THRESHOLDS[industryType]) : null;
  const empLevel = classifyEmp(totalEmp);
  const transLevel = industryType ? classify(transactionAmount, TRANS_THRESHOLDS[industryType]) : null;
  const sectionTe = (assetLevel !== null) ? Math.min(assetLevel, empLevel) as SizeLevel : null;
  const finalLevel = (sectionTe !== null && transLevel !== null) ? Math.max(sectionTe, transLevel) as SizeLevel : null;

  useEffect(() => {
    if (is70Over) {
      updateField(T, 'size_result', '大会社');
    } else if (hasAllFields && finalLevel !== null) {
      updateField(T, 'size_result', SIZE_RESULTS[finalLevel]);
    }
  }, [is70Over, hasAllFields, finalLevel, updateField]);

  // セル色分け: 業種列のみハイライト
  const showCell = hasAllFields && !is70Over;
  const iCol = industryType === '卸売業' ? 0 : industryType === '小売・サービス' ? 1 : 2;
  const assetAdopted = showCell && assetLevel !== null && assetLevel <= empLevel;
  const empAdopted = showCell && assetLevel !== null && empLevel <= assetLevel;
  // 総資産: 青系（業種列のみ）
  const aBg = (lv: SizeLevel, col: number): React.CSSProperties =>
    (!showCell || assetLevel !== lv || col !== iCol) ? {} :
    assetAdopted ? { background: '#bbdefb', fontWeight: 700 } : { background: '#e3f2fd' };
  // 従業員: 緑系
  const eBg = (lv: SizeLevel): React.CSSProperties =>
    (!showCell || empLevel !== lv) ? {} :
    empAdopted ? { background: '#c8e6c9', fontWeight: 700 } : { background: '#e8f5e9' };
  // 取引金額: オレンジ系（業種列のみ）
  const tBg = (lv: SizeLevel, col: number): React.CSSProperties =>
    (!showCell || transLevel !== lv || col !== iCol) ? {} : { background: '#fff3e0' };
  // 最終判定: 黄系
  const jBg = (lv: SizeLevel): React.CSSProperties =>
    (!showCell || finalLevel !== lv) ? {} : { background: '#fff8e1', fontWeight: 700 };

  return (
    <div className="gov-form">

      {/* ========== グループ１: タイトル行 ========== */}
      <div style={{ display: 'flex', alignItems: 'center', ...bb }}>
        <div style={{ flex: 1, padding: '3px 6px', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
          第１表の２　評価上の株主の判定及び会社規模の判定の明細書（続）
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', whiteSpace: 'nowrap', ...bl }}>
          <span>会社名</span>
          <span style={{ minWidth: 80 }}>{getField('table1_1', 'companyName')}</span>
        </div>
      </div>

      {/* ---- セクション見出し ---- */}
      <div style={{ display: 'flex', alignItems: 'center', ...bb }}>
        <div style={{ flex: 1, padding: '2px 4px', fontWeight: 700 }}>
          ３．会社の規模（Ｌの割合）の判定
        </div>
        <button
          className="no-print"
          style={{ padding: '1px 8px', fontSize: 7, cursor: 'pointer', marginRight: 4, border: '1px solid #999', borderRadius: 2, background: '#fff' }}
          onClick={() => {
            ['total_assets', 'transaction_amount', 'regular_emp', 'part_emp', 'industry_type', 'size_result'].forEach(f => u(f, ''));
          }}
        >
          リセット
        </button>
      </div>

      {/* ---- 入力ガイド ---- */}
      {!is70Over && !hasAllFields && (
        <div className="no-print" style={{ padding: '3px 6px', fontSize: 7.5, color: '#795548', background: '#fff3e0', ...bb }}>
          <span style={{ fontWeight: 700 }}>未入力: </span>
          {!totalEmpDisplay && <span style={{ marginRight: 8 }}>○ 従業員数</span>}
          {!industryType && <span style={{ marginRight: 8 }}>○ 業種</span>}
          {!g('total_assets') && <span style={{ marginRight: 8 }}>○ 総資産価額</span>}
          {!g('transaction_amount') && <span style={{ marginRight: 8 }}>○ 取引金額</span>}
        </div>
      )}

      {/* ========== グループ２: 判定要素テーブル（5列×5行） ========== */}
      <div style={{ ...bb }}>
        <table className="gov-table" style={{ fontSize: 8.5 }}>
          <thead>
            <tr>
              <th>項　　目</th>
              <th>金　　　額</th>
              <th>項　　目</th>
              <th colSpan={2}>人　　　数</th>
            </tr>
          </thead>
          <tbody>
            {/* Body Row 1: 総資産(rs2) + 従業員数(rs4) + 正社員 */}
            <tr>
              <td rowSpan={2} className="text-left" style={{ padding: '2px 4px', verticalAlign: 'top' }}>
                <div>直前期末の総資産価額</div>
                <div>（帳 簿 価 額）</div>
              </td>
              <td rowSpan={2} style={{ verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <NumberField value={g('total_assets')} onChange={(v) => u('total_assets', v)} />
                  <span style={{ marginLeft: 2, whiteSpace: 'nowrap' }}>千円</span>
                </div>
              </td>
              <td rowSpan={4} className="text-left" style={{ padding: '2px 4px', verticalAlign: 'top', fontSize: 7.5, lineHeight: 1.3 }}>
                <div>直前期末以前１年間</div>
                <div>における従業員数</div>
              </td>
              <td className="text-left" style={{ padding: '1px 3px', fontSize: 7.5 }}>正社員</td>
              <td style={{ fontSize: 7.5 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <NumberField value={g('regular_emp')} onChange={(v) => u('regular_emp', v)} className="w-10" />
                  <span style={{ marginLeft: 1 }}>人</span>
                </div>
              </td>
            </tr>
            {/* Body Row 2: 正社員以外 */}
            <tr>
              <td className="text-left" style={{ padding: '1px 3px', fontSize: 7.5 }}>正社員以外</td>
              <td style={{ fontSize: 7.5 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <NumberField value={g('part_emp')} onChange={(v) => u('part_emp', v)} className="w-10" />
                  <span style={{ marginLeft: 1 }}>人</span>
                </div>
              </td>
            </tr>
            {/* Body Row 3: 取引金額(rs2) + 合計(rs2) */}
            <tr>
              <td rowSpan={2} className="text-left" style={{ padding: '2px 4px', verticalAlign: 'top' }}>
                <div>直前期末以前１年間</div>
                <div>の取引金額</div>
              </td>
              <td rowSpan={2} style={{ verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <NumberField value={g('transaction_amount')} onChange={(v) => u('transaction_amount', v)} />
                  <span style={{ marginLeft: 2, whiteSpace: 'nowrap' }}>千円</span>
                </div>
              </td>
              <td rowSpan={2} className="text-left" style={{ padding: '1px 3px', fontSize: 7.5, fontWeight: 700 }}>合計</td>
              <td rowSpan={2} style={{ fontSize: 7.5 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="gov-input gov-input-number" style={{ background: '#f5f5f0', cursor: 'default' }}>{totalEmpDisplay}</span>
                  <span style={{ marginLeft: 1 }}>人</span>
                </div>
              </td>
            </tr>
            {/* Body Row 4: 空行（rs2の継続用） */}
            <tr></tr>
          </tbody>
        </table>
      </div>

      {/* ========== グループ３: ㋣ 2×2 レイアウト ========== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', fontSize: 8.5, ...bb }}>
        {/* 1列目: ㋣（2行結合） */}
        <div style={{ gridRow: '1 / 3', padding: '2px 4px', display: 'flex', alignItems: 'center', ...br }}>
          ㋣　直前期末以前１年間における従業員数に応ずる区分
        </div>
        {/* 2列目 Row1: 70人以上 */}
        <div className={totalEmp >= 70 && totalEmpDisplay ? 'gov-choice selected' : ''} style={{ padding: '2px 8px', borderBottom: '0.5px solid #000' }}>
          70人以上の会社は、大会社（㋠及び㋷は不要）
        </div>
        {/* 2列目 Row2: 70人未満 */}
        <div className={totalEmp < 70 && totalEmpDisplay ? 'gov-choice selected' : ''} style={{ padding: '2px 8px' }}>
          70人未満の会社は、㋠及び㋷により判定
        </div>
      </div>

      {/* ========== グループ４: 業種選択 + ㋠㋷ + 会社規模マトリクス + 注記 ========== */}
      <div style={is70Over ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', ...bb }}>
        <div style={{ padding: '2px 4px', fontWeight: 700, fontSize: 8.5 }}>
          規模区分を判定する場合の業種
        </div>
        <a
          className="no-print"
          href="https://www.nta.go.jp/law/joho-zeikaishaku/hyoka/250600/pdf/02.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: 8, fontSize: 7, color: '#1565c0', textDecoration: 'underline' }}
        >
          （別表）対比表（令和７年分）PDF
        </a>
      </div>
      <div style={{ display: 'flex', fontSize: 8.5, ...bb }}>
        <div
          className={`gov-choice${g('industry_type') === '卸売業' ? ' selected' : ''}`}
          style={{ flex: 1, padding: '3px 4px', textAlign: 'center', cursor: 'pointer', ...br }}
          onClick={() => u('industry_type', '卸売業')}
        >
          卸売業
        </div>
        <div
          className={`gov-choice${g('industry_type') === '小売・サービス' ? ' selected' : ''}`}
          style={{ flex: 1, padding: '3px 4px', textAlign: 'center', cursor: 'pointer', ...br }}
          onClick={() => u('industry_type', '小売・サービス')}
        >
          小売・サービス
        </div>
        <div
          className={`gov-choice${g('industry_type') === '卸売業、小売・サービス業以外' ? ' selected' : ''}`}
          style={{ flex: 1, padding: '3px 4px', textAlign: 'center', cursor: 'pointer' }}
          onClick={() => u('industry_type', '卸売業、小売・サービス業以外')}
        >
          卸売業、小売・サービス業以外
        </div>
      </div>
      <div style={{ ...bb }}>
        <table className="gov-table" style={{ fontSize: 7 }}>
          <thead>
            <tr>
              <th colSpan={4} style={{ fontSize: 7.5, textAlign: 'left', padding: '2px 4px', fontWeight: 400 }}>
                ㋠　直前期末の総資産価額（帳簿価額）及び直前期末以前<br />
                　１年間における従業員数に応ずる区分
              </th>
              <th colSpan={3} style={{ fontSize: 7.5, textAlign: 'left', padding: '2px 4px', fontWeight: 400 }}>
                ㋷　直前期末以前１年間の取引金額に応ずる区分
              </th>
              <th style={{ width: 55 }}></th>
            </tr>
            <tr>
              <th colSpan={3} style={{ fontSize: 7.5 }}>総 資 産 価 額（帳 簿 価 額）</th>
              <th rowSpan={2} style={{ width: 45, fontSize: 7 }}>従業員数</th>
              <th colSpan={3} style={{ fontSize: 7.5 }}>取　引　金　額</th>
              <th rowSpan={2} style={{ width: 55, fontSize: 6.5, lineHeight: 1.2 }}>
                会社規模とＬの<br />割合（中会社）<br />の区分
              </th>
            </tr>
            <tr>
              <th>卸 売 業</th>
              <th style={{ fontSize: 6.5 }}>小売・サービ<br />ス業</th>
              <th style={{ fontSize: 6.5 }}>卸売業、小売・<br />サービス業以外</th>
              <th>卸 売 業</th>
              <th style={{ fontSize: 6.5 }}>小売・サービ<br />ス業</th>
              <th style={{ fontSize: 6.5 }}>卸売業、小売・<br />サービス業以外</th>
            </tr>
          </thead>
          <tbody>
            {/* 大会社 */}
            <tr style={{ height: 18 }}>
              <td style={aBg(4, 0)}>20億円以上</td>
              <td style={aBg(4, 1)}>15億円以上</td>
              <td style={aBg(4, 2)}>15億円以上</td>
              <td style={eBg(4)}>35 人 超</td>
              <td style={tBg(4, 0)}>30億円以上</td>
              <td style={tBg(4, 1)}>20億円以上</td>
              <td style={tBg(4, 2)}>15億円以上</td>
              <td style={{ fontWeight: 700, letterSpacing: '0.3em', ...jBg(4) }}>大 会 社</td>
            </tr>
            {/* 中会社の大 0.90 */}
            <tr style={{ height: 22 }}>
              <td style={aBg(3, 0)}>４億円以上<br />20億円未満</td>
              <td style={aBg(3, 1)}>５億円以上<br />15億円未満</td>
              <td style={aBg(3, 2)}>５億円以上<br />15億円未満</td>
              <td style={eBg(3)}>35 人 超</td>
              <td style={tBg(3, 0)}>７億円以上<br />30億円未満</td>
              <td style={tBg(3, 1)}>５億円以上<br />20億円未満</td>
              <td style={tBg(3, 2)}>４億円以上<br />15億円未満</td>
              <td style={jBg(3)}>
                <div>０．９０</div>
              </td>
            </tr>
            {/* 中会社の中 0.75 */}
            <tr style={{ height: 22 }}>
              <td style={aBg(2, 0)}>２億円以上<br />４億円未満</td>
              <td style={{ fontSize: 6.5, ...aBg(2, 1) }}>2億5,000万円以上<br />５億円未満</td>
              <td style={{ fontSize: 6.5, ...aBg(2, 2) }}>2億5,000万円以上<br />５億円未満</td>
              <td style={{ fontSize: 6.5, ...eBg(2) }}>20 人 超<br />35 人 以下</td>
              <td style={{ fontSize: 6.5, ...tBg(2, 0) }}>3億5,000万円以上<br />７億円未満</td>
              <td style={{ fontSize: 6.5, ...tBg(2, 1) }}>2億5,000万円以上<br />５億円未満</td>
              <td style={tBg(2, 2)}>２億円以上<br />４億円未満</td>
              <td style={jBg(2)}>
                <div>０．７５</div>
              </td>
            </tr>
            {/* 中会社の小 0.60 */}
            <tr style={{ height: 22 }}>
              <td style={{ fontSize: 6.5, ...aBg(1, 0) }}>7,000万円以上<br />２億円未満</td>
              <td style={{ fontSize: 6.5, ...aBg(1, 1) }}>4,000万円以上<br />2億5,000万円未満</td>
              <td style={{ fontSize: 6.5, ...aBg(1, 2) }}>5,000万円以上<br />2億5,000万円未満</td>
              <td style={{ fontSize: 6.5, ...eBg(1) }}>５ 人 超<br />20 人 以下</td>
              <td style={{ fontSize: 6.5, ...tBg(1, 0) }}>２億円以上<br />3億5,000万円未満</td>
              <td style={{ fontSize: 6.5, ...tBg(1, 1) }}>6,000万円以上<br />2億5,000万円未満</td>
              <td style={{ fontSize: 6.5, ...tBg(1, 2) }}>8,000万円以上<br />２億円未満</td>
              <td style={jBg(1)}>
                <div>０．６０</div>
              </td>
            </tr>
            {/* 小会社 */}
            <tr style={{ height: 18 }}>
              <td style={{ fontSize: 6.5, ...aBg(0, 0) }}>7,000万円未満</td>
              <td style={{ fontSize: 6.5, ...aBg(0, 1) }}>4,000万円未満</td>
              <td style={{ fontSize: 6.5, ...aBg(0, 2) }}>5,000万円未満</td>
              <td style={eBg(0)}>５ 人 以下</td>
              <td style={tBg(0, 0)}>２億円未満</td>
              <td style={{ fontSize: 6.5, ...tBg(0, 1) }}>6,000万円未満</td>
              <td style={{ fontSize: 6.5, ...tBg(0, 2) }}>8,000万円未満</td>
              <td style={{ fontWeight: 700, letterSpacing: '0.3em', ...jBg(0) }}>小 会 社</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* ---- 判定過程の可視化（70人未満） ---- */}
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
      {/* ---- 注記 ---- */}
      <div style={{ padding: '2px 4px', fontSize: 7, lineHeight: 1.3, ...bb }}>
        ・「会社規模とＬの割合（中会社）の区分」欄は、㋠欄の区分（「総資産価額（帳簿価額）」と「従業員数」とのいずれか
        下位の区分）と㋷欄（取引金額）の区分とのいずれか上位の区分により判定します。
      </div>
      </div>{/* /グループ４ グレーアウト wrapper */}

      {/* ---- 判定過程の可視化（70人以上） ---- */}
      {is70Over && totalEmpDisplay && (
        <div className="no-print" style={{ padding: '3px 6px', fontSize: 7.5, background: '#f5f5f5', ...bb }}>
          <span style={{ fontWeight: 700 }}>▶ 判定過程: </span>
          <span>従業員数 {totalEmp}人（70人以上）→ </span>
          <span style={{ fontWeight: 700, background: '#fff8e1', padding: '0 4px' }}>大会社</span>
        </div>
      )}

      {/* ========== グループ５: 判定結果 ========== */}
      <div style={{ ...bb }}>
        <table className="gov-table" style={{ fontSize: 8.5 }}>
          <tbody>
            <tr>
              <td rowSpan={2} style={{ width: 20, writingMode: 'vertical-rl', textOrientation: 'mixed', fontWeight: 700, letterSpacing: '0.1em', background: '#f5f5f0', fontSize: 7.5 }}>
                判定（Lの割合）
              </td>
              <td style={{ fontWeight: 700 }}>
                <span className="gov-choice" onClick={() => u('size_result', '大会社')}>
                  大　会　社
                </span>
              </td>
              <td colSpan={3}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span>中　　　会　　　社</span>
                </div>
              </td>
              <td style={{ fontWeight: 700 }}>
                <span className="gov-choice" onClick={() => u('size_result', '小会社')}>
                  小　会　社
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <span className={`gov-choice${g('size_result') === '大会社' ? ' selected' : ''}`} onClick={() => u('size_result', '大会社')}>１．００</span>
              </td>
              <td>
                <span className={`gov-choice${g('size_result') === '中0.90' ? ' selected' : ''}`} onClick={() => u('size_result', '中0.90')}>０．９０</span>
              </td>
              <td>
                <span className={`gov-choice${g('size_result') === '中0.75' ? ' selected' : ''}`} onClick={() => u('size_result', '中0.75')}>０．７５</span>
              </td>
              <td>
                <span className={`gov-choice${g('size_result') === '中0.60' ? ' selected' : ''}`} onClick={() => u('size_result', '中0.60')}>０．６０</span>
              </td>
              <td>
                <span className={`gov-choice${g('size_result') === '小会社' ? ' selected' : ''}`} onClick={() => u('size_result', '小会社')}>０．５０</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========== グループ６: ４．増（減）資の状況 ========== */}
      <div style={{ padding: '2px 4px', fontWeight: 700, ...bb }}>
        ４．増（減）資の状況その他評価上の参考事項
      </div>
      <div style={{ flex: 1, padding: '4px' }}>
        <FormField
          value={g('capital_changes')}
          onChange={(v) => u('capital_changes', v)}
        />
      </div>

    </div>
  );
}
