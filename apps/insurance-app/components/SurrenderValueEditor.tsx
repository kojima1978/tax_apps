'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Clipboard, Plus, Trash2 } from 'lucide-react';
import type { SurrenderValuePoint } from '@/types';
import { CommaInputRaw } from './CommaInput';

interface SurrenderValueEditorProps {
  points: SurrenderValuePoint[];
  onChange: (points: SurrenderValuePoint[]) => void;
  currency: 'JPY' | 'USD';
  exchangeRate: number;
  contractAge: number;
  paymentEndAge: number;
  policyEndAge: number;
  currentAge?: number | null;
  // 指定年齢時点の払込累計（返戻率の基準）。外貨建ては設計書に合わせてドル基準を使う
  paidAtAge?: (age: number) => number;
  foreignPaidAtAge?: (age: number) => number;
}

const yenFromForeign = (amount: number, exchangeRate: number) => Math.round((amount || 0) * (exchangeRate || 0));

// 「1,200,000」「120万」「1.2百万円」などを数値に変換
export function parsePastedAmount(token: string): number | null {
  const text = token.replace(/[,，\s円¥￥$＄]/g, '').replace(/[０-９．]/g, ch =>
    ch === '．' ? '.' : String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  if (!text) return null;

  const okuMatch = text.match(/^(-?[\d.]+)億$/);
  if (okuMatch) return Math.round(Number(okuMatch[1]) * 100000000);
  const manMatch = text.match(/^(-?[\d.]+)万$/);
  if (manMatch) return Math.round(Number(manMatch[1]) * 10000);

  const plain = text.replace(/[^\d.-]/g, '');
  if (!plain || !/\d/.test(plain)) return null;
  const num = Number(plain);
  return Number.isFinite(num) ? Math.round(num) : null;
}

// 貼り付けテキストを「年齢 + 金額」の組に変換。経過年数表記は契約年齢を足して年齢に直す
export function parsePastedSurrenderValues(text: string, contractAge: number): { age: number; amount: number }[] {
  const results: { age: number; amount: number }[] = [];

  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    // 桁区切りのカンマは列の区切りと紛らわしいので、数値の途中のものは先に除去する
    const normalized = trimmed.replace(/(\d)[,，](?=\d{3}(?!\d))/g, '$1');
    const tokens = normalized.split(/[\t,，、|｜\s]+/).filter(Boolean);
    if (tokens.length < 2) return;

    const ageToken = tokens[0];
    const ageNum = parsePastedAmount(ageToken.replace(/[歳才年目経過]/g, ''));
    if (ageNum === null || ageNum < 0 || ageNum > 120) return;

    const isElapsed = /年目|経過|年$/.test(ageToken) && !/歳|才/.test(ageToken);
    const age = isElapsed || (!/歳|才/.test(ageToken) && ageNum < contractAge)
      ? contractAge + ageNum
      : ageNum;
    if (age > 120) return;

    // 金額は行の残りから最初に数値として読めるものを採用
    let amount: number | null = null;
    for (let i = 1; i < tokens.length; i++) {
      const parsed = parsePastedAmount(tokens[i]);
      if (parsed !== null && parsed >= 0) {
        amount = parsed;
        break;
      }
    }
    if (amount === null) return;

    results.push({ age, amount });
  });

  return results;
}

// 保存時に捨てられる行・グラフに反映されない行を入力中に気づけるようにする。
// 文言は入力モード（年齢／経過年数）で変わるので、判定と文言生成は分けている
type RowIssue = { kind: 'dropped' | 'ignored'; reason: 'outOfRange' | 'beforeContract' | 'afterPolicyEnd' };

export function getSurrenderRowIssue(
  age: number,
  contractAge: number,
  policyEndAge: number,
): RowIssue | null {
  if (!Number.isFinite(age) || age < 0 || age > 120) {
    return { kind: 'dropped', reason: 'outOfRange' };
  }
  if (contractAge > 0 && age < contractAge) {
    return { kind: 'ignored', reason: 'beforeContract' };
  }
  if (policyEndAge > 0 && policyEndAge !== 999 && age > policyEndAge) {
    return { kind: 'ignored', reason: 'afterPolicyEnd' };
  }
  return null;
}

// 1列目を年齢で入れるか経過年数（◯年目）で入れるか。証券の表記に合わせて切り替える
type AgeMode = 'age' | 'elapsed';

const AGE_MODE_STORAGE_KEY = 'insurance-app:surrender-age-mode:v1';

const AGE_MODE_OPTIONS: { value: AgeMode; label: string }[] = [
  { value: 'age', label: '年齢' },
  { value: 'elapsed', label: '経過年数' },
];

const MAX_AGE = 120;

const SurrenderValueEditor: React.FC<SurrenderValueEditorProps> = ({
  points,
  onChange,
  currency,
  exchangeRate,
  contractAge,
  paymentEndAge,
  policyEndAge,
  currentAge,
  paidAtAge,
  foreignPaidAtAge,
}) => {
  const [isOpen, setIsOpen] = useState(points.length > 0);
  // 既存契約の編集時は formData が後から入るため、点が現れた時点で開く
  const [hadPoints, setHadPoints] = useState(points.length > 0);
  if (!hadPoints && points.length > 0) {
    setHadPoints(true);
    setIsOpen(true);
  }
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  // 返戻率は金額から逆算して表示するため、入力中は打鍵ごとの丸めで値が跳ねる。確定するまで生の文字列を保持する
  const [rateDraft, setRateDraft] = useState<{ index: number; text: string } | null>(null);
  // 証券の表記は年齢と経過年数のどちらもあるので、前回選んだ側で開く
  // （このエディタは証券フォームを開いたときだけ描画されるのでSSR時には存在せず、初期値で読んでよい）
  const [ageMode, setAgeMode] = useState<AgeMode>(() => {
    if (typeof window === 'undefined') return 'age';
    const saved = window.localStorage.getItem(AGE_MODE_STORAGE_KEY);
    return saved === 'age' || saved === 'elapsed' ? saved : 'age';
  });

  const changeAgeMode = (mode: AgeMode) => {
    setAgeMode(mode);
    window.localStorage.setItem(AGE_MODE_STORAGE_KEY, mode);
  };

  const isUsd = currency === 'USD';
  const unit = isUsd ? 'ドル' : '円';
  // 契約年齢がないと年数↔年齢を換算できないので、その間は年齢入力に固定する
  const canUseElapsed = contractAge > 0;
  const isElapsed = ageMode === 'elapsed' && canUseElapsed;
  // 契約年齢が未入力の間は年齢入力に落ちるので、選択状態も実際に効いている側に合わせる
  const effectiveMode: AgeMode = isElapsed ? 'elapsed' : 'age';
  // 「1年目 = 契約年齢+1歳」。貼り付け取込の「◯年目」換算と同じ数え方に揃えている
  const toElapsed = (age: number) => age - contractAge;
  const fromElapsed = (elapsed: number) => contractAge + elapsed;
  const formatAge = (age: number) => (isElapsed ? `${toElapsed(age)}年目` : `${age}歳`);
  // 対になる表記（年齢モードなら年目、経過年数モードなら歳）。取り違え防止に隣へ添える
  const formatCounterpart = (age: number) => (isElapsed ? `${age}歳` : `${toElapsed(age)}年目`);

  const duplicateAges = useMemo(() => {
    const seen = new Set<number>();
    const dup = new Set<number>();
    points.forEach(p => {
      if (seen.has(p.age)) dup.add(p.age);
      seen.add(p.age);
    });
    return dup;
  }, [points]);

  const isUnsorted = useMemo(
    () => points.some((p, i) => i > 0 && p.age < points[i - 1].age),
    [points],
  );

  const rowIssues = useMemo(
    () => points.map(p => getSurrenderRowIssue(p.age, contractAge, policyEndAge)),
    [points, contractAge, policyEndAge],
  );

  const describeIssue = (issue: RowIssue): string => {
    switch (issue.reason) {
      case 'outOfRange':
        return isElapsed
          ? `経過年数は0〜${MAX_AGE - contractAge}年の範囲で入力してください（このままでは保存時に削除されます）`
          : `年齢は0〜${MAX_AGE}の範囲で入力してください（このままでは保存時に削除されます）`;
      case 'beforeContract':
        return `契約時点（${formatAge(contractAge)}）より前の行はグラフ・返戻率に反映されません`;
      case 'afterPolicyEnd':
        return `保険期間終了（${formatAge(policyEndAge)}）より後の行はグラフ・返戻率に反映されません`;
    }
  };

  // 同じ理由の行が複数あっても表示は1回にまとめる
  const issueMessages = useMemo(() => {
    const dropped = new Set<string>();
    const ignored = new Set<string>();
    rowIssues.forEach(issue => {
      if (!issue) return;
      (issue.kind === 'dropped' ? dropped : ignored).add(describeIssue(issue));
    });
    return { dropped: [...dropped], ignored: [...ignored] };
    // describeIssue はモード・契約年齢・保険期間から決まるので、その3つを依存に置く
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIssues, isElapsed, contractAge, policyEndAge]);

  const displayValue = (point: SurrenderValuePoint) =>
    isUsd ? (point.foreignAmount ?? 0) : point.amount;

  const updatePoint = (index: number, patch: Partial<SurrenderValuePoint>) => {
    onChange(points.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const setAmount = (index: number, value: number) => {
    updatePoint(index, isUsd
      ? { foreignAmount: value, amount: yenFromForeign(value, exchangeRate) }
      : { foreignAmount: undefined, amount: value });
  };

  // 返戻率の分母。設計書の返戻率はドルベースなので、外貨建てはドルの払込累計に合わせる
  const showRate = isUsd ? Boolean(foreignPaidAtAge) : Boolean(paidAtAge);
  const rateBasisAt = (age: number) => (isUsd ? foreignPaidAtAge?.(age) : paidAtAge?.(age)) ?? 0;

  const setRate = (index: number, text: string) => {
    setRateDraft({ index, text });
    const rate = Number(text);
    const basis = rateBasisAt(points[index].age);
    if (text.trim() === '' || !Number.isFinite(rate) || basis <= 0) return;
    const value = (basis * rate) / 100;
    setAmount(index, isUsd ? Math.round(value * 100) / 100 : Math.round(value));
  };

  const removePoint = (index: number) => {
    setRateDraft(null);
    onChange(points.filter((_, i) => i !== index));
  };

  const addPoint = (age: number) => {
    if (points.some(p => p.age === age)) return;
    onChange([...points, { age, amount: 0 }]);
    setIsOpen(true);
  };

  const addBlankRow = () => {
    const lastAge = points.length > 0 ? points[points.length - 1].age : contractAge;
    const nextAge = Math.min(120, Math.max(contractAge, lastAge + 5));
    onChange([...points, { age: nextAge, amount: 0 }]);
  };

  const sortByAge = () => {
    onChange([...points].sort((a, b) => a.age - b.age));
  };

  const applyPaste = () => {
    const parsed = parsePastedSurrenderValues(pasteText, contractAge);
    if (parsed.length === 0) {
      setPasteMessage('年齢と金額の組を読み取れませんでした。「60歳 1,200,000」のように1行1件で貼り付けてください。');
      return;
    }
    const merged = new Map<number, SurrenderValuePoint>();
    points.forEach(p => merged.set(p.age, p));
    parsed.forEach(({ age, amount }) => {
      merged.set(age, isUsd
        ? { age, foreignAmount: amount, amount: yenFromForeign(amount, exchangeRate) }
        : { age, amount });
    });
    onChange([...merged.values()].sort((a, b) => a.age - b.age));
    setPasteMessage(`${parsed.length}件を取り込みました。`);
    setPasteText('');
  };

  const quickAdds = [
    { name: '現在', age: currentAge ?? null },
    { name: '払込完了', age: paymentEndAge && paymentEndAge !== 999 ? paymentEndAge : null },
    { name: '満期', age: policyEndAge && policyEndAge !== 999 ? policyEndAge : null },
  ].filter((item): item is { name: string; age: number } =>
    item.age !== null && item.age >= 0 && !points.some(p => p.age === item.age));

  return (
    <div className="surrender-editor">
      <button
        type="button"
        className="surrender-editor-toggle"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
        <span>年齢別の解約返戻金を入力（任意）</span>
        {points.length > 0 && <span className="surrender-editor-count">{points.length}件</span>}
      </button>

      {isOpen && (
        <div className="surrender-editor-body">
          <p className="field-hint">
            入力した年齢だけを保存し、間の年齢はグラフ側で線形補間します。全年齢を埋める必要はありません。
            {showRate && '解約返戻金と返戻率はどちらから入力しても構いません（もう一方を自動計算します）。'}
          </p>

          <div className="surrender-mode-switch">
            <span>入力方法:</span>
            {AGE_MODE_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                className={`surrender-mode-btn${effectiveMode === option.value ? ' is-active' : ''}`}
                aria-pressed={effectiveMode === option.value}
                disabled={option.value === 'elapsed' && !canUseElapsed}
                title={option.value === 'elapsed' && !canUseElapsed ? '契約年齢を入力すると経過年数で入力できます' : undefined}
                onClick={() => changeAgeMode(option.value)}
              >
                {option.label}
              </button>
            ))}
            {isElapsed && <span>1年目 = 契約年齢（{contractAge}歳）の1年後</span>}
          </div>

          {quickAdds.length > 0 && (
            <div className="surrender-quick-add">
              <span>{isElapsed ? '経過年数' : '年齢'}を追加:</span>
              {quickAdds.map(item => (
                <button key={item.name} type="button" className="calc-btn" onClick={() => addPoint(item.age)}>
                  {item.name}（{formatAge(item.age)}）
                </button>
              ))}
            </div>
          )}

          {points.length > 0 && (
            <table className="surrender-table">
              <thead>
                <tr>
                  <th className="surrender-col-age">{isElapsed ? '経過年数' : '年齢'}</th>
                  {canUseElapsed && <th className="surrender-col-agesub">{isElapsed ? '年齢' : '経過年数'}</th>}
                  <th className="surrender-col-amount">解約返戻金（{unit}）</th>
                  {isUsd && <th>円換算</th>}
                  {showRate && <th className="surrender-col-rate">返戻率{isUsd ? '（ドル基準）' : ''}</th>}
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => {
                  const rateBasis = rateBasisAt(point.age);
                  const rate = rateBasis > 0 ? (displayValue(point) / rateBasis) * 100 : null;
                  const rateText = rateDraft?.index === index
                    ? rateDraft.text
                    : rate !== null ? String(Math.round(rate * 10) / 10) : '';
                  const issue = rowIssues[index];
                  const rowClass = [
                    duplicateAges.has(point.age) ? 'is-duplicate' : '',
                    issue ? `is-${issue.kind}` : '',
                  ].filter(Boolean).join(' ');
                  return (
                    <tr key={index} className={rowClass}>
                      <td className="surrender-col-age">
                        <input
                          type="number"
                          min={0}
                          max={isElapsed ? MAX_AGE - contractAge : MAX_AGE}
                          value={isElapsed ? toElapsed(point.age) : point.age}
                          title={issue ? describeIssue(issue) : undefined}
                          aria-label={`${index + 1}行目の${isElapsed ? '経過年数' : '年齢'}`}
                          aria-invalid={issue?.kind === 'dropped' || undefined}
                          onChange={e => updatePoint(index, {
                            age: isElapsed ? fromElapsed(Number(e.target.value)) : Number(e.target.value),
                          })}
                        />
                      </td>
                      {canUseElapsed && (
                        <td className="surrender-cell-sub surrender-col-agesub">{formatCounterpart(point.age)}</td>
                      )}
                      <td className="surrender-col-amount">
                        <CommaInputRaw
                          value={displayValue(point)}
                          onChange={v => setAmount(index, v)}
                          ariaLabel={`${index + 1}行目の解約返戻金`}
                          decimalPlaces={isUsd ? 2 : 0}
                        />
                      </td>
                      {isUsd && <td className="surrender-cell-sub">{point.amount.toLocaleString()}円</td>}
                      {showRate && (
                        <td className={`surrender-cell-rate surrender-col-rate ${rate !== null && rate >= 100 ? 'is-positive' : ''}`}>
                          <div className="surrender-rate-input">
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={rateText}
                              disabled={rateBasis <= 0}
                              title={rateBasis <= 0 ? '保険料を入力すると返戻率から金額を計算できます' : undefined}
                              aria-label={`${index + 1}行目の返戻率`}
                              onChange={e => setRate(index, e.target.value)}
                              onBlur={() => setRateDraft(null)}
                            />
                            <span>%</span>
                          </div>
                        </td>
                      )}
                      <td>
                        <button
                          type="button"
                          className="surrender-row-delete"
                          onClick={() => removePoint(index)}
                          aria-label={`${index + 1}行目を削除`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {duplicateAges.size > 0 && (
            <span className="field-error">同じ年齢が重複しています（保存時は後の行が優先されます）</span>
          )}
          {issueMessages.dropped.map(message => (
            <span key={message} className="field-error">{message}</span>
          ))}
          {issueMessages.ignored.map(message => (
            <span key={message} className="surrender-editor-warning">{message}</span>
          ))}

          <div className="surrender-editor-actions">
            <button type="button" className="calc-btn" onClick={addBlankRow}>
              <Plus size={14} aria-hidden="true" /> 行を追加
            </button>
            {isUnsorted && (
              <button type="button" className="calc-btn" onClick={sortByAge}>年齢順に並べ替え</button>
            )}
            <button
              type="button"
              className="calc-btn"
              onClick={() => { setShowPaste(prev => !prev); setPasteMessage(''); }}
            >
              <Clipboard size={14} aria-hidden="true" /> 表から貼り付け
            </button>
          </div>

          {showPaste && (
            <div className="surrender-paste">
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={5}
                placeholder={'設計書の返戻金表をそのまま貼り付けてください\n例）\n60歳\t1,200,000\n65歳\t1,450,000\n10年目\t980,000'}
              />
              <div className="surrender-editor-actions">
                <button type="button" className="calc-btn" onClick={applyPaste}>取り込む</button>
                <span className="field-hint">
                  「◯年目」「経過◯年」は契約年齢（{contractAge}歳）を足して年齢に変換します。
                </span>
              </div>
              {pasteMessage && <span className="field-hint">{pasteMessage}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SurrenderValueEditor;
