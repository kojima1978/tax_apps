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
  // 指定年齢時点の払込累計（返戻率の目安表示に使用）
  paidAtAge?: (age: number) => number;
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

  const isUsd = currency === 'USD';
  const unit = isUsd ? 'ドル' : '円';

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

  const removePoint = (index: number) => {
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
    { label: `現在（${currentAge ?? '-'}歳）`, age: currentAge ?? null },
    { label: `払込完了（${paymentEndAge}歳）`, age: paymentEndAge && paymentEndAge !== 999 ? paymentEndAge : null },
    { label: `満期（${policyEndAge}歳）`, age: policyEndAge && policyEndAge !== 999 ? policyEndAge : null },
  ].filter(item => item.age !== null && item.age >= 0 && !points.some(p => p.age === item.age));

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
          </p>

          {quickAdds.length > 0 && (
            <div className="surrender-quick-add">
              <span>年齢を追加:</span>
              {quickAdds.map(item => (
                <button key={item.label} type="button" className="calc-btn" onClick={() => addPoint(item.age as number)}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {points.length > 0 && (
            <table className="surrender-table">
              <thead>
                <tr>
                  <th>年齢</th>
                  <th>解約返戻金（{unit}）</th>
                  {isUsd && <th>円換算</th>}
                  {paidAtAge && <th>返戻率</th>}
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => {
                  const paid = paidAtAge ? paidAtAge(point.age) : 0;
                  const rate = paid > 0 ? (point.amount / paid) * 100 : null;
                  return (
                    <tr key={index} className={duplicateAges.has(point.age) ? 'is-duplicate' : ''}>
                      <td>
                        <input
                          type="number"
                          value={point.age}
                          aria-label={`${index + 1}行目の年齢`}
                          onChange={e => updatePoint(index, { age: Number(e.target.value) })}
                        />
                      </td>
                      <td>
                        <CommaInputRaw
                          value={displayValue(point)}
                          onChange={v => setAmount(index, v)}
                          ariaLabel={`${index + 1}行目の解約返戻金`}
                        />
                      </td>
                      {isUsd && <td className="surrender-cell-sub">{point.amount.toLocaleString()}円</td>}
                      {paidAtAge && (
                        <td className={`surrender-cell-rate ${rate !== null && rate >= 100 ? 'is-positive' : ''}`}>
                          {rate !== null ? `${rate.toFixed(0)}%` : '-'}
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
