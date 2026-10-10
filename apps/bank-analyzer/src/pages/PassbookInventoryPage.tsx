// 通帳有無一覧表（Django: views/passbook_inventory.py・passbook_inventory.html・passbook_inventory.js）。
// 口座ごとに、年ごとの通帳の有無・通帳残高・残証残高・既経過利息・備考を一覧で直す。
//
// Django 版から直したもの:
// - 保存の失敗が画面のどこにも出なかった（fetch の catch は console.error だけで、応答の
//   ok:false も見ていない）。入れた値はそのまま残るので保存できていないことに気づけない
//   → 失敗したら元の値へ戻して通知に出す
// - 「変わったかどうか」を画面を開いた時点の値と比べていたため、A→B と直したあとに B→A へ
//   戻すと保存が飛ばず、画面は A・DB は B のままずれた → 直前に保存できた値と比べる
// - 合計を画面の入力欄から数え直していたので、通帳残高が自動（欄が空）の行は 0 として扱われ、
//   どれか1つを直した瞬間に合計が減った → サーバと同じ数え方（自動の値も含める）で数える
// - 通帳残高の欄に自動の値が入っていて、手で入れた値と区別できなかった（消すと数字そのものが
//   消えたように見える）→ 欄には手で入れた値だけを出し、自動のときは薄く値と「自動」を出す
// - 並び替えがドラッグだけで、キーボードでは動かせなかった（失敗も黙って捨てていた）
//   → 上下のボタンにして、失敗したら元の並びへ戻す
// - 口座の追加・取込はページごと再読込で、結果はメッセージだけだった → その場で一覧へ反映する
// - 印刷は「用紙に合わせて縮小」を手で選ぶ前提だった（年が24年分あると表は 559mm 幅で、
//   A4横にも収まらず右が切れる）。題も印刷されなかった → A4横で、表を用紙の幅へ縮めて刷る

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Download, Plus, Upload, Wallet } from 'lucide-react';
import { DownloadButton } from '../components/DownloadButton';
import { FileDrop } from '../components/FileDrop';
import { Breadcrumb } from '../components/Layout';
import { useNotice } from '../components/Notice';
import { useApiData } from '../hooks/useApiData';
import { usePrintFit } from '../hooks/usePrintFit';
import { api, errorMessage } from '../lib/api';
import { num, warekiShort } from '../lib/format';

type BalanceMatch = '○' | '×' | '証明のみ' | '残高証明なし';

type Row = {
  id: number;
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  years: { year: number; has: boolean }[];
  // 手で入れた値（入れていなければ null。欄に出すのはこれ）
  manualBalance: number | null;
  // 手で入れた値が無ければ自動（相続開始日以前で最後の残高）。合計と残高一致はこちら
  passbookBalance: number | null;
  autoBalance: number | null;
  certificateBalance: number | null;
  balanceMatch: BalanceMatch;
  hasAccruedInterest: boolean;
  inventoryRemarks: string;
};

type Inventory = {
  caseName: string;
  referenceDate: string | null;
  years: { year: number; wareki: string }[];
  rows: Row[];
};

// PATCH の応答（サーバが数え直した値。画面はこれで上書きする）
type Saved = Pick<Row, 'manualBalance' | 'passbookBalance' | 'autoBalance' | 'balanceMatch'>;

// 左に貼り付ける列（年が増えると横に長くなるので、どの口座の行かが見えるようにする）。
// left は手前の列の幅の合計なので、幅を変えたらここも変える
const FIXED = [
  { label: '', width: '4.5rem', left: '0rem' },
  { label: 'No', width: '2.5rem', left: '4.5rem' },
  { label: '銀行名', width: '7rem', left: '7rem' },
  { label: '支店名', width: '5rem', left: '14rem' },
  { label: '種類', width: '3rem', left: '19rem' },
  { label: '口座番号', width: '6rem', left: '22rem' },
] as const;

// 印刷では貼り付けをやめる（position: sticky のままだと列が重なる）
const fixed = (i: number, extra = '', head = false) => ({
  className: `sticky ${head ? 'z-20 bg-slate-50' : 'z-10 bg-white'} print:static ${extra}`,
  style: { left: FIXED[i]!.left, minWidth: FIXED[i]!.width, maxWidth: FIXED[i]!.width },
});

// @page は Tailwind で書けないのでここだけ CSS。余白 8mm なので印刷できる幅は 297 − 16 = 281mm
const PAGE_CSS = '@media print { @page { size: A4 landscape; margin: 8mm; } }';
const PRINTABLE_WIDTH_MM = 281;

const MATCH_CLASS: Record<BalanceMatch, string> = {
  '○': 'text-emerald-700',
  '×': 'font-bold text-red-700',
  証明のみ: 'text-amber-700',
  残高証明なし: 'text-slate-400',
};

export function PassbookInventoryPage() {
  const { caseId = '' } = useParams();
  const notice = useNotice();
  const { data, error, loading, reload, setData } = useApiData(`passbook-inventory-${caseId}`, () =>
    api.get<Inventory>(`/cases/${caseId}/passbook-inventory`),
  );

  const rows = data?.rows ?? [];
  const tableBox = useRef<HTMLDivElement>(null);
  usePrintFit(tableBox, PRINTABLE_WIDTH_MM);
  const years = data?.years ?? [];

  // 合計はサーバと同じ数え方（自動の通帳残高も含める）。欄の文字から数え直さない
  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({ passbook: a.passbook + (r.passbookBalance ?? 0), certificate: a.certificate + (r.certificateBalance ?? 0) }),
        { passbook: 0, certificate: 0 },
      ),
    [rows],
  );

  const applyRow = (id: number, patch: Partial<Row>) =>
    setData((d) => (d ? { ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : d));

  // 1つの欄を保存する。先に画面へ反映し、失敗したら元の行へ戻して通知を出す
  const save = async (row: Row, body: Record<string, unknown>, optimistic: Partial<Row>) => {
    applyRow(row.id, optimistic);
    try {
      const saved = await api.patch<Saved>(`/cases/${caseId}/passbook-inventory/accounts/${row.id}`, body);
      applyRow(row.id, saved);
    } catch (e) {
      applyRow(row.id, row);
      notice.error(errorMessage(e));
    }
  };

  // 並び替え。押したボタンは行と一緒に動くので、描画後に同じボタンへ焦点を戻す
  const moveRefs = useRef(new Map<string, HTMLButtonElement>());
  const [refocus, setRefocus] = useState<string | null>(null);
  useEffect(() => {
    if (!refocus) return;
    const [id, dir] = refocus.split(':');
    const at = (d: string) => moveRefs.current.get(`${id}:${d}`);
    const same = at(dir!);
    (same && !same.disabled ? same : at(dir === 'up' ? 'down' : 'up'))?.focus();
    setRefocus(null);
  }, [refocus]);

  const move = async (index: number, dir: 'up' | 'down') => {
    const next = [...rows];
    const [picked] = next.splice(index, 1);
    next.splice(index + (dir === 'up' ? -1 : 1), 0, picked!);
    setData((d) => (d ? { ...d, rows: next } : d));
    setRefocus(`${picked!.id}:${dir}`);
    try {
      await api.put(`/cases/${caseId}/passbook-inventory/order`, { order: next.map((r) => r.id) });
    } catch (e) {
      setData((d) => (d ? { ...d, rows } : d));
      notice.error(errorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-[120rem] space-y-4 px-4 py-6 print:space-y-2 print:p-0">
      <style>{PAGE_CSS}</style>
      <Breadcrumb
        items={[{ label: '案件一覧', to: '/' }, { label: data?.caseName ?? '案件', to: `/cases/${caseId}` }, { label: '通帳有無一覧' }]}
      />
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Wallet size={20} className="text-slate-500" aria-hidden="true" />
          通帳有無一覧表
          {data && <small className="font-normal text-slate-500">{data.caseName}</small>}
        </h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link to={`/cases/${caseId}`} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} aria-hidden="true" />
            分析に戻る
          </Link>
          <DownloadButton path={`/cases/${caseId}/export/xlsx/passbook-inventory`} title="この一覧を Excel で書き出します">
            <Download size={14} aria-hidden="true" />
            Excel出力
          </DownloadButton>
        </div>
      </div>

      <h1 className="hidden text-base font-bold print:block">通帳有無一覧表　{data?.caseName}</h1>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {loading && !data && <p className="py-8 text-center text-slate-500">読み込み中…</p>}

      {data && (
        <>
          {!data.referenceDate && (
            <p className="flex flex-wrap items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
              <AlertTriangle size={16} aria-hidden="true" />
              相続開始日が未設定です。通帳残高（自動）は最後の残高をそのまま拾います。
              <Link to={`/cases/${caseId}`} className="text-blue-700 underline">
                案件の設定で入力
              </Link>
            </p>
          )}
          {data.referenceDate && (
            <p className="text-xs text-slate-500">
              通帳残高（自動）は相続開始日 {warekiShort(data.referenceDate)} 以前で最後の残高です。
            </p>
          )}

          <AddAccountCard caseId={caseId} onDone={reload} />

          <div className="card overflow-hidden print:overflow-visible print:border-0 print:shadow-none">
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                口座がありません。取引を取り込むか、上の「残高証明書だけの口座」から追加してください。
              </p>
            ) : (
              <div ref={tableBox} className="overflow-x-auto print:overflow-visible">
                <table className="table-base">
                  <thead>
                    <tr>
                      {FIXED.map((f, i) => (
                        <th key={f.label || 'move'} rowSpan={2} {...fixed(i, i === 0 ? 'print:hidden' : '', true)}>
                          {f.label || <span className="sr-only">並び替え</span>}
                        </th>
                      ))}
                      {years.length > 0 && (
                        <th colSpan={years.length} className="bg-slate-50 text-center">
                          通帳の有無
                        </th>
                      )}
                      <th rowSpan={2} className="text-right">
                        通帳残高
                      </th>
                      <th rowSpan={2} className="text-center">
                        残高一致
                      </th>
                      <th rowSpan={2} className="text-right">
                        残証残高
                      </th>
                      <th rowSpan={2} className="text-center">
                        既経過
                        <br />
                        利息
                      </th>
                      <th rowSpan={2} className="min-w-48">
                        備考
                      </th>
                    </tr>
                    <tr>
                      {years.map((y) => (
                        <th key={y.year} className="text-center">
                          {y.year}
                          <br />
                          <small className="font-normal">{y.wareki}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.id}>
                        <td {...fixed(0, 'print:hidden')}>
                          <div className="flex gap-0.5">
                            {(['up', 'down'] as const).map((dir) => (
                              <button
                                key={dir}
                                type="button"
                                ref={(el) => {
                                  if (el) moveRefs.current.set(`${row.id}:${dir}`, el);
                                  else moveRefs.current.delete(`${row.id}:${dir}`);
                                }}
                                className="btn btn-secondary btn-sm px-1"
                                disabled={dir === 'up' ? i === 0 : i === rows.length - 1}
                                onClick={() => void move(i, dir)}
                                title={dir === 'up' ? '1つ上へ' : '1つ下へ'}
                                aria-label={`${row.bankName}${row.accountNumber} を1つ${dir === 'up' ? '上' : '下'}へ`}
                              >
                                {dir === 'up' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td {...fixed(1, 'text-right tabular-nums text-slate-500')}>{i + 1}</td>
                        <td {...fixed(2, 'truncate')} title={row.bankName}>
                          {row.bankName || '-'}
                        </td>
                        <td {...fixed(3, 'truncate')} title={row.branchName}>
                          {row.branchName || '-'}
                        </td>
                        <td {...fixed(4, 'truncate')} title={row.accountType}>
                          {row.accountType || '-'}
                        </td>
                        <td {...fixed(5, 'truncate')} title={row.accountNumber}>
                          {row.accountNumber}
                        </td>
                        {row.years.map((y) => (
                          <td key={y.year} className="p-0 text-center">
                            <YearToggle
                              has={y.has}
                              label={`${row.bankName}${row.accountNumber} の ${y.year}年の通帳`}
                              onToggle={() => void save(row, { field: 'passbookYear', year: y.year, value: !y.has }, {
                                years: row.years.map((o) => (o.year === y.year ? { ...o, has: !y.has } : o)),
                              })}
                            />
                          </td>
                        ))}
                        <td className="text-right">
                          <AmountCell
                            value={row.manualBalance}
                            auto={row.autoBalance}
                            label={`${row.bankName}${row.accountNumber} の通帳残高`}
                            onSave={(v) => void save(row, { field: 'passbookBalance', value: v }, { manualBalance: v })}
                          />
                        </td>
                        <td className={`text-center whitespace-nowrap ${MATCH_CLASS[row.balanceMatch]}`}>{row.balanceMatch}</td>
                        <td className="text-right">
                          <AmountCell
                            value={row.certificateBalance}
                            label={`${row.bankName}${row.accountNumber} の残証残高`}
                            onSave={(v) => void save(row, { field: 'certificateBalance', value: v }, { certificateBalance: v })}
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={row.hasAccruedInterest}
                            onChange={(e) => void save(row, { field: 'hasAccruedInterest', value: e.target.checked }, { hasAccruedInterest: e.target.checked })}
                            aria-label={`${row.bankName}${row.accountNumber} の既経過利息`}
                          />
                        </td>
                        <td>
                          <RemarksCell
                            value={row.inventoryRemarks}
                            label={`${row.bankName}${row.accountNumber} の備考`}
                            onSave={(v) => void save(row, { field: 'inventoryRemarks', value: v }, { inventoryRemarks: v })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td {...fixed(0, 'print:hidden')} />
                      <td colSpan={FIXED.length - 1 + years.length} className="text-right">
                        計（{num(rows.length)}口座）
                      </td>
                      <td className="text-right tabular-nums">{num(totals.passbook)}</td>
                      <td />
                      <td className="text-right tabular-nums">{num(totals.certificate)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 print:hidden">
            ○ を押すとその年の通帳の有無が変わります。金額・備考は欄から離れたときに保存します。
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 欄ごとの小物
// ---------------------------------------------------------------------------

// 通帳の有無。押すと切り替わる（キーボードでも押せるボタン）
function YearToggle({ has, label, onToggle }: { has: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`h-7 w-full text-sm ${has ? 'font-bold text-emerald-700' : 'text-slate-300'} hover:bg-slate-100`}
      aria-pressed={has}
      aria-label={label}
      onClick={onToggle}
      title={has ? '通帳あり（押すと無しへ）' : '通帳なし（押すと有りへ）'}
    >
      {has ? '○' : '−'}
    </button>
  );
}

// 金額の欄。欄から離れたときに保存する。
// value は「手で入れた値」だけ。auto があれば薄く出す（欄が空でも 0 円ではない）
function AmountCell({ value, auto, label, onSave }: { value: number | null; auto?: number | null; label: string; onSave: (v: number | null) => void }) {
  const text = value === null ? '' : num(value);
  const [draft, setDraft] = useState(text);
  const [last, setLast] = useState(text);
  if (last !== text) {
    setLast(text);
    setDraft(text);
  }
  const [invalid, setInvalid] = useState(false);

  const commit = () => {
    const raw = draft.replace(/,/g, '').trim();
    if (raw !== '' && !/^-?\d+$/.test(raw)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    const next = raw === '' ? null : Number(raw);
    // 直前に保存できた値と比べる（開いたときの値と比べると、戻したときに保存が飛ぶ）
    if (next === value) {
      setDraft(text);
      return;
    }
    onSave(next);
  };

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        className={`input py-1 text-right tabular-nums ${invalid ? 'border-red-400' : ''}`}
        value={draft}
        placeholder={auto !== null && auto !== undefined ? num(auto) : ''}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setDraft(e.target.value.replace(/,/g, ''));
          e.target.select();
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setInvalid(false);
            setDraft(text);
          }
        }}
      />
      {invalid && (
        <span role="alert" className="block text-right text-xs text-red-700">
          数字で入力してください
        </span>
      )}
      {value === null && auto !== null && auto !== undefined && <span className="block text-right text-xs text-slate-400">自動</span>}
    </>
  );
}

// 備考の欄。欄から離れたとき・Enter で保存、Esc で取り消し
function RemarksCell({ value, label, onSave }: { value: string; label: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [last, setLast] = useState(value);
  if (last !== value) {
    setLast(value);
    setDraft(value);
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
    if (e.key === 'Escape') setDraft(value);
  };
  return (
    <input
      type="text"
      className="input py-1"
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => {
        if (draft !== value) onSave(draft);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 残高証明書だけの口座（取引の無い口座を足す・リストを取り込む）
// ---------------------------------------------------------------------------

const ADD_FIELDS = [
  { key: 'bankName', label: '銀行名', placeholder: '例: みずほ銀行', required: false },
  { key: 'branchName', label: '支店名', placeholder: '例: 本店', required: false },
  { key: 'accountType', label: '種類', placeholder: '例: 普通', required: false },
  { key: 'accountNumber', label: '口座番号', placeholder: '必須', required: true },
  { key: 'certificateBalance', label: '残証残高', placeholder: '1000000', required: false },
  { key: 'passbookBalance', label: '通帳残高', placeholder: '空欄なら自動', required: false },
] as const;

type AddForm = Record<(typeof ADD_FIELDS)[number]['key'], string> & { hasAccruedInterest: boolean; inventoryRemarks: string };

const EMPTY: AddForm = {
  bankName: '',
  branchName: '',
  accountType: '',
  accountNumber: '',
  certificateBalance: '',
  passbookBalance: '',
  hasAccruedInterest: false,
  inventoryRemarks: '',
};

function AddAccountCard({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const notice = useNotice();
  const [open, setOpen] = useState<'add' | 'import' | null>(null);
  const [form, setForm] = useState<AddForm>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const addAccount = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ message: string }>(`/cases/${caseId}/passbook-inventory/accounts`, { ...form });
      notice.success(res.message);
      setForm(EMPTY);
      setOpen(null);
      onDone();
    } catch (err) {
      notice.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const importList = async (e: FormEvent) => {
    e.preventDefault();
    const file = files[0];
    if (!file) {
      notice.error('取込ファイルを選択してください。');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api.post<{ message: string }>(`/cases/${caseId}/passbook-inventory/import`, body);
      notice.success(res.message);
      setFiles([]);
      setOpen(null);
      onDone();
    } catch (err) {
      notice.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">残高証明書だけの口座</h2>
        <small className="text-slate-500">取引履歴が無い口座を、残高証明書から足します</small>
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" aria-expanded={open === 'add'} onClick={() => setOpen(open === 'add' ? null : 'add')}>
            <Plus size={14} aria-hidden="true" />
            1件追加
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-expanded={open === 'import'}
            onClick={() => setOpen(open === 'import' ? null : 'import')}
          >
            <Upload size={14} aria-hidden="true" />
            リストを取込
          </button>
        </div>
      </div>

      {open === 'add' && (
        <form className="mt-3 border-t border-slate-200 pt-3" onSubmit={addAccount} noValidate>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ADD_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label" htmlFor={`add-${f.key}`}>
                  {f.label}
                  {f.required && <span className="ml-1 text-red-600">*</span>}
                </label>
                <input
                  id={`add-${f.key}`}
                  className="input"
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="label" htmlFor="add-remarks">
                備考
              </label>
              <input
                id="add-remarks"
                className="input"
                value={form.inventoryRemarks}
                placeholder="空欄なら「取引履歴なし・残高証明書あり」"
                onChange={(e) => setForm({ ...form, inventoryRemarks: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
              <input type="checkbox" checked={form.hasAccruedInterest} onChange={(e) => setForm({ ...form, hasAccruedInterest: e.target.checked })} />
              既経過利息あり
            </label>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="mr-auto text-xs text-slate-500">同じ口座番号の口座があれば、その口座を直します。</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(null)}>
              閉じる
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? '追加中…' : '追加'}
            </button>
          </div>
        </form>
      )}

      {open === 'import' && (
        <form className="mt-3 border-t border-slate-200 pt-3" onSubmit={importList} noValidate>
          <FileDrop
            accept=".csv,.xlsx"
            files={files}
            onChange={setFiles}
            hint="CSV / Excel（10MBまで）"
          />
          <p className="mt-2 text-xs text-slate-500">
            列名: 銀行名、支店名、種類、口座番号、残証残高、通帳残高、既経過利息、備考。口座番号が既存なら上書き更新します。
            読めない金額が1つでもあれば、1件も取り込みません。
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(null)}>
              閉じる
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || files.length === 0}>
              {busy ? '取込中…' : '取り込む'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
