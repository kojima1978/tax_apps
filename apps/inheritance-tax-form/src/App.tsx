import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { GridCell } from './components/ui/GridForm';
import { PrintRenderContext } from './components/ui/printContext';
import { DetailPanel } from './components/DetailPanel';
import { RowSortPanel } from './components/RowSortPanel';
import { Table11f1Worksheet } from './components/Table11f1Worksheet';
import { AssetTaxWorksheet } from './components/AssetTaxWorksheet';
import { PersonPanel } from './components/PersonPanel';
import { ResetDialog } from './components/ResetDialog';
import { FormPage, PageControl, PageDetail, PageList } from './components/pageShell';
import {
  ContPage, DetailPage, Table10Page, Table1112f1Page, Table1112f1bPage, Table112Page, Table11Page,
  Table13Page, Table14Page, Table15ContPage, Table42Page, Table4Page, Table88Page, Table9Page,
} from './components/formPages';
import {
  ASSET_CATEGORY, DETAIL_FORMS, DETAIL_SPECS, FORMS, MAX_PAGES, ROW_SORTS, ROW_SORT_REMAPS,
  TABLE1_SOURCE_FOR_ROW, TABLE1_TRANSFERRED_ROWS, assetDescription, type DetailForm, type FormMeta,
} from './forms/registry';
import { giftYearOptions } from './data/codes';
import {
  DISABILITY_GENERAL, DISABILITY_SPECIAL, candidateGroups, personActionPrefix,
} from './forms/person';
import {
  COMMON, TABLE1_FORM_CODE, TABLE1_NOTES, TABLE1_TITLE, TOTALS, buildTable1, taxOfficeOptions,
} from './forms/table1';
import {
  LAWFUL_ROWS, TABLE2_EDITION, TABLE2_FORM_CODE, TABLE2_JOINT_NOTES, TABLE2_NOTES, TABLE2_SUBTITLE,
  TABLE2_TITLE, buildTable2, type LawfulRowRef,
} from './forms/table2';
import { TABLE11_ROWS } from './forms/table11';
import { TABLE112_ROWS } from './forms/table112';
import {
  TABLE13_DEBT_FORM, TABLE13_DEBT_ROWS, TABLE13_FUNERAL_FORM, TABLE13_FUNERAL_ROWS,
} from './forms/table13';
import {
  TABLE14_BEQUEST_FORM, TABLE14_BEQUEST_ROWS, TABLE14_DONATION_FORM, TABLE14_DONATION_ROWS,
  TABLE14_GIFT_FORM, TABLE14_GIFT_ROWS,
} from './forms/table14';
import {
  TABLE15CONT_PERSONS, TABLE15_ASPECT, TABLE15_EDITION, TABLE15_FORM_CODE, TABLE15_SUBTITLE,
  TABLE15_TITLE, buildTable15,
} from './forms/table15';
import { TABLE1112F1_CONT_ROWS, TABLE1112F1_ROWS, table1112f1First } from './forms/table1112f1';
import { TABLE1112F1B_OWNERS } from './forms/table1112f1b';
import { TABLE10_DETAIL_FORM, TABLE10_ROWS } from './forms/table10';
import { TABLE9_DETAIL_FORM, TABLE9_ROWS } from './forms/table9';
import { TABLE4_PERSONS } from './forms/table4';
import { TABLE42_PERSONS } from './forms/table42';
import {
  TABLE5_ASPECT, TABLE5_EDITION, TABLE5_FORM_CODE, TABLE5_NOTES, TABLE5_SUBTITLE, TABLE5_TITLE, buildTable5,
} from './forms/table5';
import {
  TABLE6_ASPECT, TABLE6_EDITION, TABLE6_FORM_CODE, TABLE6_MINOR_AGE, TABLE6_NOTES, TABLE6_SUBTITLE, TABLE6_TITLE,
  buildTable6, type Table6Options,
} from './forms/table6';
import {
  TABLE7_ASPECT, TABLE7_EDITION, TABLE7_FORM_CODE, TABLE7_NOTES, TABLE7_SUBTITLE, TABLE7_TITLE, buildTable7,
} from './forms/table7';
import { TABLE88_PERSONS } from './forms/table88';
import { DETAIL_GROUPS, type DetailItem } from './forms/detail';
import { detailLabel, detailPrefix, heirIndex, heirLabel, heirPrefix, useFormData } from './hooks/useFormData';
import { usePrinting } from './hooks/usePrinting';
import { useZipPrefecture } from './hooks/useZipPrefecture';
import {
  DETAIL_SOURCE, deriveLawful, detailShareCount, detailSlots, hasTable112, isEmptyDetail, lawfulMembers, num,
  sameValues, table10MinPages, table10Pages, table112Pages, table13MinPages, table13Pages, table14MinPages,
  table14Pages, table15Transferred, table42Pages, table4Pages, table88Pages, table9MinPages, table9Pages,
  type Values,
} from './lib/calc';
import { HEIR_ID } from './lib/heirRef';
import { pageCount } from './lib/storedData';
import { buildAssetTaxWorksheet, type AssetTaxSource } from './lib/assetTaxWorksheet';

/**
 * サイドバーの開閉状態の保存先。申告内容（inheritance-tax-form:v1）とは別キーにして、
 * JSON保存/読込・クリアの対象から外す（画面の見た目であって申告内容ではないため）。
 */
const SIDEBAR_KEY = 'inheritance-tax-form:sidebar';

function loadSidebarOpen(): boolean {
  try {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) return saved !== 'closed';
    return !window.matchMedia('(max-width: 800px)').matches;
  } catch {
    return true;
  }
}

export default function App() {
  const {
    data, detailRows, g, u, addHeir, removeHeir, moveHeir, setHeir, addDetailPage, setDetailCount, setDetailItem, removeDetailItem,
    moveDetailItem, toggleUsed, reset, exportJson, importJson, requiredForms, maxHeirs,
  } = useFormData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState('table1');
  /** 別画面で編集中の明細（付表の様式IDと通し番号） */
  const [editing, setEditing] = useState<{ form: DetailForm; index: number } | null>(null);
  /** 別画面で並べ替え中の明細（様式ID。`ROW_SORTS` のキー） */
  const [sorting, setSorting] = useState<string | null>(null);
  /** 別画面で編集中の「財産を取得した人」（何人目か） */
  const [editingPerson, setEditingPerson] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(loadSidebarOpen);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { printing, print } = usePrinting();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? 'open' : 'closed');
    } catch {
      // privacy モード等では保存を諦める（開閉自体は続けられる）
    }
  }, [sidebarOpen]);

  // 提出先税務署の候補は被相続人の郵便番号（＝住所地）の都道府県で絞る。
  // 郵便番号が未入力・該当なしのときは全国の署を出す。
  const officePref = useZipPrefecture((data.common['zip_1'] ?? '') + (data.common['zip_2'] ?? ''));
  const officeOptions = useMemo(
    () => taxOfficeOptions(officePref, data.common.office ?? ''),
    [officePref, data.common.office],
  );
  // 第11の2表の年分は「平成15年（制度創設）〜相続開始年」に限る。
  const giftYears = useMemo(
    () => giftYearOptions(data.common.startEra ?? '', data.common.startY ?? ''),
    [data.common.startEra, data.common.startY],
  );
  /**
   * 人物の画面を開いた時点の内容（「取消」で戻す先）。
   * この画面は打つそばから書き込むので、戻すには開く側で控えておくしかない。
   * 別の人へ移った時も控え直すため、取り消せるのは今開いている人の分だけ。
   */
  const personBackup = useRef<Values>({});
  const openPerson = useCallback((index: number) => {
    personBackup.current = data.heirs[index] ?? {};
    setEditingPerson(index);
  }, [data.heirs]);
  /** 用紙の人物ブロックのクリック → その人の基本情報の画面を開く */
  const onPersonAction = useCallback((action: string) => {
    const prefix = personActionPrefix(action);
    if (prefix !== undefined) openPerson(heirIndex(prefix));
  }, [openPerson]);
  /** 人物の画面の「取消」。開いた時から変わっている時だけ確認する */
  const cancelPerson = useCallback(() => {
    if (editingPerson === null) return;
    const current = data.heirs[editingPerson] ?? {};
    if (!sameValues(current, personBackup.current)
      && !window.confirm('この画面で入力した内容を、開いた時の状態に戻します。よろしいですか？')) return;
    setHeir(editingPerson, personBackup.current);
    setEditingPerson(null);
  }, [editingPerson, data.heirs, setHeir]);
  const table1Cells = useMemo(
    () => buildTable1(heirPrefix(0), TABLE1_TRANSFERRED_ROWS, officeOptions, TABLE1_SOURCE_FOR_ROW),
    [officeOptions],
  );
  /**
   * 第2表④に並ぶ法定相続人。行を作るのではなく、「法定相続人」の印を付けた人が
   * 登録順にそのまま並ぶ（氏名・続柄・法定相続分はその人の欄を指す）。
   */
  const lawfulPeople = useMemo(
    () => deriveLawful(data.heirs).map((row) => ({
      index: Number(row.source),
      name: (row.name ?? '').trim(),
      autoable: row.autoable === '1',
    })),
    [data.heirs],
  );
  /** 養子の数の制限（相法15条2項）で④から外れた人。黙って落とさず画面で知らせる */
  const limitedAdoptions = useMemo(
    () => lawfulMembers(data.heirs).flatMap((member) => (member.counted ? [] : [
      (member.heir.name ?? '').trim() === '' ? heirLabel(member.index) : member.heir.name!,
    ])),
    [data.heirs],
  );
  const table2Cells = useMemo(
    (): GridCell[] => buildTable2(COMMON, TOTALS, lawfulPeople.slice(0, LAWFUL_ROWS).map(
      (person): LawfulRowRef => ({ prefix: heirPrefix(person.index), autoable: person.autoable }),
    )),
    [lawfulPeople],
  );
  const table5Cells = useMemo(() => buildTable5(COMMON, TOTALS), []);
  const heirPages = pageCount(data.heirs.length);
  /** 第1表（続）の枚数（1人目は第1表に載るので、2人目以降が2人ずつ） */
  const contPages = heirPages - 1;
  const table11Pages = Math.max(1, Math.ceil(data.heirs.length / TABLE11_ROWS));
  /**
   * 付表の割り付け。財産の並び順を様式の組へ配る。
   * 1財産が2組以上を使うことがある（4人以上の共有）ので、枚数は件数ではなく組数から決まる。
   * 用紙の余りは空の財産で埋め、1枚は必ず出す。
   */
  const detailLayout = useMemo(() => Object.fromEntries(DETAIL_FORMS.map((form) => {
    // 転記された明細（付表4 ← 第9表・第10表）は保存した明細の後ろに並ぶ。
    // 添字がずれるので、入力画面を開く添字は保存した明細の側で数え直す
    const stored = data.details[form]?.length ?? 0;
    const rows = detailRows[form] ?? [];
    const derived = rows.length - stored;
    const pages = Math.max(1, Math.ceil(detailSlots(rows, 0).length / DETAIL_GROUPS));
    const slots = detailSlots(rows, pages * DETAIL_GROUPS);
    // 用紙1枚ぶんずつに切り分けておく（描画のたびに配列を作ると GridForm の再計算が毎回走る）
    const pageItems: DetailItem[][] = Array.from({ length: pages }, (_, page) => slots
      .slice(page * DETAIL_GROUPS, (page + 1) * DETAIL_GROUPS)
      .map(({ item, base }): DetailItem => ({
        index: item, prefix: detailPrefix(form, item), label: detailLabel(item), base, first: base === 0,
        // 転記行はその印を、空の組は保存した明細の続きとして開く添字を持たせる
        source: rows[item]?.[DETAIL_SOURCE],
        edit: item < stored ? item : item - derived,
      })));
    // 最後の1枚を削るときに残す件数。用紙の切れ目が財産の途中（続きの組）に当たるときは、
    // 財産を半分だけ消すことになるので − を出さない
    const edge = slots[(pages - 1) * DETAIL_GROUPS]!;
    const keep = Math.min(stored, edge.item);
    // 転記行は消せないので、最後の1枚が転記行から始まるときは − を出さない
    return [form, { pageItems, pages, keep, canRemove: pages > 1 && edge.base === 0 && edge.item < stored }];
  })), [data.details, detailRows]);
  /** 補助資料に載せる付表1の明細（空の枠は載せない。番号は用紙と同じ通し番号） */
  const table11f1Rows = useMemo(
    () => (data.details.table11f1 ?? [])
      .map((item, index) => ({ index, item }))
      .filter(({ item }) => !isEmptyDetail(item)),
    [data.details],
  );
  /** 付表の枚数 */
  const detailPages = (form: string): number => detailLayout[form]?.pages ?? 1;
  /**
   * 付表の「財産を取得した人の番号」の選択肢（第1表の人）。
   * 値は人のID。用紙に出る番号は何人目かだが、保存するのは人そのものにする
   * （並べ替えや途中の削除で番号が動いても、指す相手が変わらないように）。
   */
  const detailHeirOptions = useMemo(
    () => data.heirs.map((heir, i) => ({
      value: heir[HEIR_ID] ?? '', label: `${i + 1} ${heir.name ?? '（氏名未入力）'}`,
    })),
    [data.heirs],
  );
  /** 第13表の最低枚数（3の承継した人は1枚に4人分、1・2の明細も入力した件数だけ用紙が要る） */
  const t13Min = table13MinPages(data.heirs.length, data.details);
  const t13Pages = table13Pages(data.common, data.heirs.length, data.details);
  /** 第4表の枚数（加算の対象になるかは続柄だけでは決まらないので人数からは決めない） */
  const t4Pages = table4Pages(data.common);
  /** 第4表の2の枚数（贈与税を納めているかは相続人の一覧からは分からないので人数からは決めない） */
  const t42Pages = table42Pages(data.common);
  /** 第14表の枚数（3つの節がそれぞれ別の件数を持つので表全体で1つ。下限は明細が載り切る枚数） */
  const t14Min = table14MinPages(data.details);
  const t14Pages = table14Pages(data.common, data.details);
  /** 第8の8表の枚数（控除・猶予の対象者は相続人の一覧からは分からないので人数からは決めない） */
  const t88Pages = table88Pages(data.common);
  /** 第9表の枚数（明細も相続人も1枚に5件ずつ）と、明細の件数から決まる最低枚数 */
  const t9Min = table9MinPages(data.details);
  const t9Pages = table9Pages(data.common, data.details);
  /** 第10表の枚数（第9表と同じく1枚に5件ずつ） */
  const t10Min = table10MinPages(data.details);
  const t10Pages = table10Pages(data.common, data.details);
  /** 各表の氏名欄（第13表の「負担する人の氏名」など）。値は人のIDで、印字は氏名になる */
  const whoOptions = useMemo(
    (): GridCell['options'] => ['', ...data.heirs.map((heir) => ({ value: heir[HEIR_ID] ?? '', label: heir.name ?? '' }))],
    [data.heirs],
  );
  /**
   * 第11表の資産明細と第1表の人別税額を結び、法定様式とは別の参考資料を作る。
   * 所有者は g() を通すことで、保存中の固定IDも転記明細の人物番号も同じ番号にそろう。
   */
  const assetTaxData = useMemo(() => {
    const assets: AssetTaxSource[] = [];
    DETAIL_FORMS.forEach((form) => {
      (detailRows[form] ?? []).forEach((item, itemIndex) => {
        for (let share = 0; share < detailShareCount(item); share += 1) {
          const prefix = detailPrefix(form, itemIndex);
          const personIndex = num(g(`${prefix}who${share}`)) - 1;
          const amount = num(g(`${prefix}amount${share}`));
          if (personIndex < 0 || personIndex >= data.heirs.length || amount <= 0) continue;
          assets.push({
            id: `${form}-${itemIndex}-${share}`,
            category: ASSET_CATEGORY[form],
            description: assetDescription(form, item),
            personIndex,
            amount,
          });
        }
      });
    });
    const people = data.heirs.map((heir, index) => {
      const prefix = heirPrefix(index);
      return {
        name: heir.name ?? '',
        declaredAssets: num(g(`${prefix}v1`)),
        otherTaxBase: Math.max(0, num(g(`${prefix}v2`))) + Math.max(0, num(g(`${prefix}v5`))),
        debtAndFuneral: num(g(`${prefix}v3`)),
        taxablePrice: num(g(`${prefix}v6`)) * 1000,
        taxBurden: num(g(`${prefix}v19`)),
        payable: num(g(`${prefix}v21`)) * 100,
      };
    });
    return buildAssetTaxWorksheet(assets, people);
  }, [data.heirs, detailRows, g]);
  /**
   * 第6表の氏名欄も選択式（③⑤の相続税額を第1表から自動転記するため）。
   * 人物の画面で登録した属性から候補を分けて並べるが、自動では埋めない（選ぶのは利用者）。
   */
  const table6Options = useMemo((): Table6Options => {
    const people = data.heirs.map((heir, i) => ({
      value: heir[HEIR_ID] ?? '', label: (heir.name ?? '').trim() === '' ? heirLabel(i) : heir.name!,
    }));
    const age = (i: number): string => g(`${heirPrefix(i)}age`);
    const disability = (i: number): string => data.heirs[i]?.disability ?? '';
    return {
      minor: candidateGroups(people, [
        { label: `候補（${TABLE6_MINOR_AGE}歳未満）`, match: (i) => age(i) !== '' && Number(age(i)) < TABLE6_MINOR_AGE },
      ]),
      disabled: candidateGroups(people, [
        { label: '候補（一般障害者）', match: (i) => disability(i) === DISABILITY_GENERAL },
        { label: '候補（特別障害者）', match: (i) => disability(i) === DISABILITY_SPECIAL },
      ]),
      support: candidateGroups(people, [
        { label: '候補（扶養義務者）', match: (i) => data.heirs[i]?.supporter === '1' },
      ]),
    };
  }, [data.heirs, g]);
  const table6Cells = useMemo(() => buildTable6(COMMON, TOTALS, table6Options), [table6Options]);
  /** 第7表の氏名欄も選択式（⑩の純資産価額を第1表から自動転記するため） */
  const table7Cells = useMemo(() => buildTable7(COMMON, TOTALS, whoOptions), [whoOptions]);
  /** 第15表で他の様式からの転記になっている欄（丸番号） */
  const t15Transferred = useMemo(() => new Set(table15Transferred(data.used)), [data.used]);
  /** 第15表（続）の枚数（第15表に1人目まで載るので、2人目以降を2人ずつ） */
  const t15ContPages = data.used.includes('table15')
    ? Math.ceil(Math.max(0, data.heirs.length - 1) / TABLE15CONT_PERSONS)
    : 0;
  const table15Cells = useMemo(
    () => buildTable15(COMMON, [
      { prefix: TOTALS, label: '各人の合計' },
      { prefix: heirPrefix(0), label: heirLabel(0), nameCode: 'E02' },
    ], t15Transferred),
    [t15Transferred],
  );

  /** 第11・11の2表の付表1の明細の件数（本表1枚分は常に出す） */
  const f1Count = Math.max(TABLE1112F1_ROWS, data.details.table1112f1?.length ?? 0);
  /** （続）の枚数（本表に3件載るので4件目から5件ずつ） */
  const f1ContPages = data.used.includes('table1112f1')
    ? Math.ceil(Math.max(0, f1Count - TABLE1112F1_ROWS) / TABLE1112F1_CONT_ROWS)
    : 0;
  /** 別表1の枚数（一の宅地等1件＝1枚） */
  const f1bCount = Math.max(1, data.details.table1112f1b?.length ?? 0);
  /**
   * 明細の「対応する別表1」の選択肢。値は `枚数-取得者` で、
   * 選ぶとその取得者の「2 選択特例対象宅地等」が明細の③④に転記される。
   */
  const f1LinkOptions = useMemo(
    () => Array.from({ length: f1bCount }, (_, s) => Array.from(
      { length: TABLE1112F1B_OWNERS },
      (_unused, b) => ({ value: `${s}-${b}`, label: `別表1 ${s + 1}件目・取得者${b + 1}` }),
    )).flat(),
    [f1bCount],
  );
  /** 明細ごとに別表1と結び付いているか（③④を読み取り専用にする） */
  const f1LinkedMask = useMemo(
    () => Array.from({ length: f1Count }, (_, i) => ((data.details.table1112f1?.[i]?.link ?? '') === '' ? '0' : '1')).join(''),
    [f1Count, data.details.table1112f1],
  );

  /** 自動で付く様式の枚数（0枚なら提出しない） */
  const autoPages: Record<string, number> = {
    table1cont: contPages, table15cont: t15ContPages, table1112f1c: f1ContPages,
  };

  /** その様式を提出する（＝印刷する）か */
  const used = (form: FormMeta): boolean => {
    if (form.required) return true;
    if (form.auto) return (autoPages[form.id] ?? 0) > 0;
    return data.used.includes(form.id);
  };

  /** ページ増減の操作。枚数を共通欄に持つ様式は形が同じなので、欄名と今の枚数だけ渡す */
  const pageStepper = (field: string, count: number, min = 1) => ({
    onDecrease: () => u(field, String(count - 1)),
    onIncrease: () => u(field, String(count + 1)),
    decreaseDisabled: count <= min,
    increaseDisabled: count >= MAX_PAGES,
  });

  const pages: Record<string, ReactNode> = {
    table1: (
      <>
        {/* 用紙の枚数は人数から決まる。人の追加・削除は人物の画面（PersonPanel）で行う */}
        <PageControl page={1} total={heirPages} detail={`財産を取得した人 ${data.heirs.length}人`} />
        <FormPage
          cells={table1Cells}
          g={g}
          u={u}
          formCode={TABLE1_FORM_CODE}
          title={TABLE1_TITLE}
          formId="t1"
          onNavigate={setActive}
          onAction={onPersonAction}
          notes={TABLE1_NOTES}
        />
      </>
    ),
    table1cont: (
      <PageList count={contPages} total={heirPages} firstPage={2} detail={`財産を取得した人 ${data.heirs.length}人`}>
        {(page) => <ContPage page={page} g={g} u={u} onNavigate={setActive} onAction={onPersonAction} />}
      </PageList>
    ),
    table2: (
      <>
      {/* 第2表④の対象者は帳票を見始める前に確認できるよう、用紙の直前に置く。
          画面だけの操作・説明であり、印刷する様式には含めない。 */}
      <section className="table2-lawful-guide no-print" aria-labelledby="table2-lawful-guide-title">
        <div className="table2-lawful-guide__summary">
          <span className="table2-lawful-guide__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </span>
          <div className="table2-lawful-guide__copy">
            <div className="table2-lawful-guide__heading">
              <h2 id="table2-lawful-guide-title">第2表④に記載する法定相続人</h2>
              <span className="table2-lawful-guide__count">{lawfulPeople.length}人</span>
            </div>
            <p>相続税の総額と基礎控除の計算に使います。財産を取得しない法定相続人も指定が必要です。</p>
          </div>
          <button
            type="button"
            className="app-btn app-btn--primary table2-lawful-guide__action"
            onClick={() => openPerson(lawfulPeople[0]?.index ?? 0)}
          >
            確認・追加
          </button>
        </div>

        {lawfulPeople.length === 0 ? (
          <p className="table2-lawful-guide__empty" role="status">
            法定相続人が指定されていません。「確認・追加」から該当する人を指定してください。
          </p>
        ) : (
          <div className="table2-lawful-guide__people" aria-label="指定済みの法定相続人">
            <span className="table2-lawful-guide__people-label">指定済み</span>
            {lawfulPeople.map((person) => (
              <button
                key={person.index}
                type="button"
                className="table2-lawful-guide__person"
                onClick={() => openPerson(person.index)}
                aria-label={`${person.name === '' ? `${person.index + 1}人目（氏名未入力）` : person.name}の人物情報を編集`}
              >
                {person.name === '' ? `${person.index + 1}人目（氏名未入力）` : person.name}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {limitedAdoptions.length > 0 && (
          <p className="table2-lawful-guide__warning">
            {`養子の数の制限（相法15条2項）により、${limitedAdoptions.join('・')}は法定相続人の数に算入されません`}
          </p>
        )}
        {lawfulPeople.length > LAWFUL_ROWS && (
          <p className="table2-lawful-guide__warning">
            {`様式の④は${LAWFUL_ROWS}人分までです。${LAWFUL_ROWS + 1}人目以降は第2表の付表に書きます（人数と税額の計算には全員入っています）`}
          </p>
        )}

        <details className="table2-lawful-guide__details">
          <summary>この指定が必要な理由</summary>
          <ul>
            <li>法定相続人の人数から遺産に係る基礎控除額を計算します。</li>
            <li>法定相続分に応じた取得金額と相続税の総額を第2表で計算します。</li>
            <li>相続放棄や養子の扱いは、それぞれの人物情報で別に指定します。</li>
          </ul>
        </details>
      </section>
      <FormPage
        cells={table2Cells}
        g={g}
        u={u}
        formCode={TABLE2_FORM_CODE}
        title={TABLE2_TITLE}
        subtitle={TABLE2_SUBTITLE}
        aspectRatio="1065 / 1311.5"
        formId="t2"
        onNavigate={setActive}
        onAction={onPersonAction}
        notes={TABLE2_JOINT_NOTES}
        edition={TABLE2_EDITION}
        beforeFootnote={<div className="gov-note">{TABLE2_NOTES}</div>}
      />
      </>
    ),
    table4: (
      <PageList count={t4Pages} {...pageStepper('t4Pages', t4Pages)} detail={`加算の対象となる人${TABLE4_PERSONS}人／ページ`}>
        {(page) => <Table4Page page={page} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />}
      </PageList>
    ),
    table42: (
      <PageList count={t42Pages} {...pageStepper('t42Pages', t42Pages)} detail={`控除を受ける人${TABLE42_PERSONS}人／ページ`}>
        {(page) => <Table42Page page={page} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />}
      </PageList>
    ),
    table5: (
      <FormPage
        cells={table5Cells}
        g={g}
        u={u}
        formCode={TABLE5_FORM_CODE}
        title={TABLE5_TITLE}
        subtitle={TABLE5_SUBTITLE}
        aspectRatio={TABLE5_ASPECT}
        formId="t5"
        onNavigate={setActive}
        notes={TABLE5_NOTES}
        edition={TABLE5_EDITION}
      />
    ),
    table6: (
      <FormPage
        cells={table6Cells}
        g={g}
        u={u}
        formCode={TABLE6_FORM_CODE}
        title={TABLE6_TITLE}
        subtitle={TABLE6_SUBTITLE}
        aspectRatio={TABLE6_ASPECT}
        formId="t6"
        onNavigate={setActive}
        notes={TABLE6_NOTES}
        edition={TABLE6_EDITION}
      />
    ),
    table7: (
      <FormPage
        cells={table7Cells}
        g={g}
        u={u}
        formCode={TABLE7_FORM_CODE}
        title={TABLE7_TITLE}
        subtitle={TABLE7_SUBTITLE}
        aspectRatio={TABLE7_ASPECT}
        formId="t7"
        onNavigate={setActive}
        notes={TABLE7_NOTES}
        edition={TABLE7_EDITION}
      />
    ),
    table88: (
      <PageList count={t88Pages} {...pageStepper('t88Pages', t88Pages)} detail={`1・2とも${TABLE88_PERSONS}人／ページ`}>
        {(page) => (
          <Table88Page
            page={page}
            whoOptions={whoOptions}
            autoCredit={data.used.includes('table6')}
            autoSuccessive={data.used.includes('table7')}
            g={g}
            u={u}
            onNavigate={setActive}
          />
        )}
      </PageList>
    ),
    table9: (
      <PageList
        count={t9Pages}
        {...pageStepper('t9Pages', t9Pages, t9Min)}
        detail={<PageDetail text={`保険金${TABLE9_ROWS}件・相続人${TABLE9_ROWS}人／ページ`} forms={[TABLE9_DETAIL_FORM]} onSort={setSorting} />}
      >
        {(page) => <Table9Page page={page} last={page === t9Pages - 1} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />}
      </PageList>
    ),
    table10: (
      <PageList
        count={t10Pages}
        {...pageStepper('t10Pages', t10Pages, t10Min)}
        detail={<PageDetail text={`退職手当金${TABLE10_ROWS}件・相続人${TABLE10_ROWS}人／ページ`} forms={[TABLE10_DETAIL_FORM]} onSort={setSorting} />}
      >
        {(page) => <Table10Page page={page} last={page === t10Pages - 1} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />}
      </PageList>
    ),
    table11: Array.from({ length: table11Pages }, (_, page) => (
      <Table11Page key={page} page={page} g={g} u={u} onNavigate={setActive} />
    )),
    // 第11の2表は贈与を受けた人ごとに1枚以上。記入が1つも無い人の分は印刷しない。
    table112: data.heirs.map((heir, i) => {
      const sheets = table112Pages(heir);
      const setSheets = (n: number) => u(`${heirPrefix(i)}t112Pages`, String(n));
      return (
        <div key={i} className={hasTable112(heir) ? undefined : 'no-print'}>
          <PageList
            count={sheets}
            onDecrease={() => setSheets(sheets - 1)}
            onIncrease={() => setSheets(sheets + 1)}
            decreaseDisabled={sheets <= 1}
            increaseDisabled={sheets >= MAX_PAGES}
            detail={`${heirLabel(i)}・年分${TABLE112_ROWS}行／ページ`}
          >
            {(page) => <Table112Page heir={i} page={page} last={page === sheets - 1} yearOptions={giftYears} g={g} u={u} onNavigate={setActive} />}
          </PageList>
        </div>
      );
    }),
    table1112f1: (
      <>
        <PageControl
          page={1}
          total={1 + f1ContPages}
          onDecrease={() => setDetailCount('table1112f1', f1Count - 1)}
          onIncrease={() => setDetailCount('table1112f1', f1Count + 1)}
          decreaseDisabled={f1Count <= TABLE1112F1_ROWS}
          detail={`小規模宅地等の明細 ${f1Count}件`}
        />
        <Table1112f1Page
          sheet={0}
          rows={TABLE1112F1_ROWS}
          linkedMask={f1LinkedMask.slice(0, TABLE1112F1_ROWS)}
          whoOptions={whoOptions}
          g={g}
          u={u}
          onNavigate={setActive}
        />
        {/* 明細と別表1の対応づけ。選ぶと③④が別表1から転記されて読み取り専用になる */}
        <div className="app-linkctl no-print">
          {Array.from({ length: f1Count }, (_, i) => (
            <label key={i}>
              {detailLabel(i)}の別表1
              <select
                value={data.details.table1112f1?.[i]?.link ?? ''}
                onChange={(event) => u(`${detailPrefix('table1112f1', i)}link`, event.target.value)}
                aria-label={`${detailLabel(i)}に対応する別表1`}
              >
                <option value="">使わない（③④は手入力）</option>
                {f1LinkOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </>
    ),
    table1112f1c: (
      <PageList
        count={f1ContPages}
        total={1 + f1ContPages}
        firstPage={2}
        onDecrease={() => setDetailCount('table1112f1', f1Count - 1)}
        onIncrease={() => setDetailCount('table1112f1', f1Count + 1)}
        decreaseDisabled={f1Count <= TABLE1112F1_ROWS}
        detail={`小規模宅地等の明細 ${f1Count}件`}
      >
        {(page) => (
          <Table1112f1Page
            sheet={page + 1}
            rows={TABLE1112F1_CONT_ROWS}
            linkedMask={f1LinkedMask
              .slice(table1112f1First(page + 1), table1112f1First(page + 1) + TABLE1112F1_CONT_ROWS)
              .padEnd(TABLE1112F1_CONT_ROWS, '0')}
            whoOptions={whoOptions}
            g={g}
            u={u}
            onNavigate={setActive}
          />
        )}
      </PageList>
    ),
    table1112f1b: (
      <PageList
        count={f1bCount}
        onDecrease={() => setDetailCount('table1112f1b', f1bCount - 1)}
        onIncrease={() => setDetailCount('table1112f1b', f1bCount + 1)}
        decreaseDisabled={f1bCount <= 1}
        detail={`一の宅地等 ${f1bCount}件`}
      >
        {(sheet) => <Table1112f1bPage sheet={sheet} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />}
      </PageList>
    ),
    table13: (
      <PageList
        count={t13Pages}
        {...pageStepper('t13Pages', t13Pages, t13Min)}
        detail={<PageDetail text={`債務${TABLE13_DEBT_ROWS}件・葬式費用${TABLE13_FUNERAL_ROWS}件／ページ`} forms={[TABLE13_DEBT_FORM, TABLE13_FUNERAL_FORM]} onSort={setSorting} />}
      >
        {(page) => <Table13Page page={page} last={page === t13Pages - 1} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />}
      </PageList>
    ),
    assetTaxWorksheet: <AssetTaxWorksheet {...assetTaxData} />,
    table14: (
      <PageList
        count={t14Pages}
        {...pageStepper('t14Pages', t14Pages, t14Min)}
        detail={<PageDetail text={`贈与${TABLE14_GIFT_ROWS}件・遺贈${TABLE14_BEQUEST_ROWS}件・寄附${TABLE14_DONATION_ROWS}件／ページ`} forms={[TABLE14_GIFT_FORM, TABLE14_BEQUEST_FORM, TABLE14_DONATION_FORM]} onSort={setSorting} />}
      >
        {(page) => <Table14Page page={page} last={page === t14Pages - 1} whoOptions={whoOptions} g={g} u={u} onNavigate={setActive} />}
      </PageList>
    ),
    table15: (
      <FormPage
        cells={table15Cells}
        g={g}
        u={u}
        formCode={TABLE15_FORM_CODE}
        title={TABLE15_TITLE}
        subtitle={TABLE15_SUBTITLE}
        aspectRatio={TABLE15_ASPECT}
        formId="t15"
        edition={TABLE15_EDITION}
      />
    ),
    table15cont: Array.from({ length: t15ContPages }, (_, page) => (
      <Table15ContPage key={page} page={page} g={g} u={u} t15Transferred={t15Transferred} onNavigate={setActive} />
    )),
    ...Object.fromEntries(DETAIL_FORMS.map((id) => [id, (
      <PageList
        count={detailPages(id)}
        onDecrease={() => setDetailCount(id, detailLayout[id]!.keep)}
        onIncrease={() => addDetailPage(id, DETAIL_GROUPS)}
        decreaseDisabled={!detailLayout[id]!.canRemove}
        detail={(
          <>
            財産{DETAIL_GROUPS}件／ページ
            <button type="button" className="app-btn" onClick={() => setEditing({ form: id, index: (data.details[id] ?? []).length })}>
              財産を追加
            </button>
            <button type="button" className="app-btn" onClick={() => setSorting(id)}>
              並べ替え
            </button>
            <span>（用紙をクリックすると入力画面が開きます）</span>
          </>
        )}
      >
        {(page) => (
          <DetailPage form={id} page={page} items={detailLayout[id]!.pageItems[page]!} g={g} u={u} onNavigate={setActive} onEdit={(index) => setEditing({ form: id, index })} />
        )}
      </PageList>
    )])),
    table11f1calc: <Table11f1Worksheet rows={table11f1Rows} />,
  };

  /**
   * 前項複写のもと。編集中の明細より前にある、空でない最後の明細。
   * 途中の空欄（まだ書いていない枠）は飛ばす。
   */
  const previousDetail = useMemo(() => {
    if (editing === null) return undefined;
    const rows = data.details[editing.form] ?? [];
    for (let i = Math.min(editing.index, rows.length) - 1; i >= 0; i -= 1) {
      const item = rows[i]!;
      if (!isEmptyDetail(item)) return item;
    }
    return undefined;
  }, [editing, data.details]);

  const onPickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!await importJson(file)) window.alert('このファイルは読み込めませんでした。');
  };

  const openResetDialog = () => {
    menuRef.current?.removeAttribute('open');
    setResetDialogOpen(true);
  };

  const confirmReset = () => {
    reset();
    setActive('table1');
    setEditing(null);
    setSorting(null);
    setEditingPerson(null);
    setResetDialogOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="app-topbar no-print">
        <div className="app-topbar__left">
          <a className="app-home-link" href="/" title="ポータルに戻る" aria-label="ポータルに戻る">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            ポータル
          </a>
          <div className="app-title">
            相続税の申告書
            <small>入力内容はこのブラウザに自動保存されます</small>
          </div>
        </div>
        <div className="app-toolbar">
          <button type="button" className="app-btn" onClick={exportJson}>データを保存</button>
          <button type="button" className="app-btn" onClick={() => fileRef.current?.click()}>保存データを読み込む</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onPickFile} hidden aria-label="保存データファイルを選択" />
          <button type="button" className="app-btn app-btn--primary" onClick={print}>印刷</button>
          <details ref={menuRef} className="app-menu">
            <summary className="app-btn" aria-label="その他の操作">その他</summary>
            <div className="app-menu__panel">
              <button type="button" className="app-menu__danger" onClick={openResetDialog}>
                申告データをクリア
              </button>
            </div>
          </details>
        </div>
      </header>

      {resetDialogOpen && <ResetDialog onCancel={() => setResetDialogOpen(false)} onConfirm={confirmReset} />}

      <div className="mobile-hint no-print">A4横幅の様式です。横スクロールしてご覧ください。</div>

      <div className="app-body">
        <aside className={`app-sidebar no-print${sidebarOpen ? '' : ' app-sidebar--closed'}`}>
          <div className="app-sidebar__head">
            <span className="app-sidebar__title">
              <strong>様式を選択</strong>
              <small>チェックした様式を印刷</small>
            </span>
            <button
              type="button"
              className="app-sidebar__toggle"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? '様式一覧を閉じる' : '様式一覧を開く'}
              title={sidebarOpen ? '様式一覧を閉じる' : '様式一覧を開く'}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d={sidebarOpen ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
              </svg>
            </button>
          </div>
          <ul className="form-list">
            {FORMS.map((form) => {
              // 明細を入れた付表と第11表は印を外せない。印は集計・転記のスイッチも兼ねていて、
              // 外すと入力したものが第11表にも第1表①にも出てこなくなるため
              const byDetails = requiredForms.includes(form.id);
              return (
              <li key={form.id} className={`form-item${active === form.id ? ' form-item--active' : ''}`}>
                <input
                  type="checkbox"
                  className="form-item__check"
                  checked={used(form)}
                  disabled={form.required || form.auto || byDetails}
                  title={byDetails ? '入力した明細があるため、この様式は外せません' : undefined}
                  onChange={() => toggleUsed(form.id)}
                  aria-label={`${form.label}を使用する`}
                />
                <button type="button" className="form-item__btn" onClick={() => setActive(form.id)}>
                  <span className="form-item__label">{form.label}</span>
                  <small>{form.note}</small>
                </button>
              </li>
              );
            })}
          </ul>
          <p className="form-list__hint">
            チェックした様式だけを印刷します。第1表（続）・第15表（続）は財産を取得した人が2人以上のときに自動で付きます。
            付表に明細を入れると、その付表と第11表には自動でチェックが付きます（外すと第11表・第1表①へ集計されなくなるため）。
          </p>
        </aside>

        <PrintRenderContext.Provider value={printing}>
        <main className="app-main">
          {FORMS.map((form) => (
            <section
              key={form.id}
              className={[
                'form-pages',
                active === form.id ? '' : 'form-pages--hidden',
                used(form) ? '' : 'form-pages--unused',
              ].filter(Boolean).join(' ')}
            >
              {/* 画面には選択中の様式だけを置く。全様式を隠して置いておくと、
                  1文字打つたびに24様式ぶん（セル5,000個超）を描き直すことになる。 */}
              {active === form.id || (printing && used(form)) ? pages[form.id] : null}
            </section>
          ))}
        </main>
        </PrintRenderContext.Provider>
      </div>

      {editing && (
        <DetailPanel
          key={`${editing.form}#${editing.index}`}
          form={editing.form}
          spec={DETAIL_SPECS[editing.form].spec}
          index={editing.index}
          item={data.details[editing.form]?.[editing.index] ?? {}}
          heirs={detailHeirOptions}
          previous={previousDetail}
          onSubmit={(item) => { setDetailItem(editing.form, editing.index, item); setEditing(null); }}
          onDelete={() => { removeDetailItem(editing.form, editing.index); setEditing(null); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {sorting !== null && (
        <RowSortPanel
          heading={ROW_SORTS[sorting]!.heading}
          subtitle={ROW_SORTS[sorting]!.subtitle}
          columns={ROW_SORTS[sorting]!.columns}
          amountOf={ROW_SORTS[sorting]!.amountOf}
          items={data.details[sorting] ?? []}
          onMove={(from, to) => moveDetailItem(sorting, from, to, ROW_SORT_REMAPS[sorting])}
          onClose={() => setSorting(null)}
        />
      )}

      {/* 人数を減らした直後は、開いていた人が居なくなっていることがある */}
      {editingPerson !== null && editingPerson < data.heirs.length && (
        <PersonPanel
          index={editingPerson}
          total={data.heirs.length}
          prefix={heirPrefix(editingPerson)}
          g={g}
          u={u}
          onAdd={data.heirs.length < maxHeirs ? addHeir : undefined}
          onRemove={data.heirs.length > 1 ? () => removeHeir(editingPerson) : undefined}
          onMove={(to) => { moveHeir(editingPerson, to); setEditingPerson(to); }}
          onSelect={(index) => {
            openPerson(index);
            // その人が載っている用紙へ移る（1人目は第1表、2人目からは第1表（続））
            setActive(index === 0 ? 'table1' : 'table1cont');
          }}
          onClose={() => setEditingPerson(null)}
          onCancel={cancelPerson}
        />
      )}
    </div>
  );
}
