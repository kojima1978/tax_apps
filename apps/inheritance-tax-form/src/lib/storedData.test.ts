import { beforeEach, describe, expect, it } from 'vitest';
import { DETAIL_METHOD, TABLE11F1_MULTIPLE, TABLE11F1_ROUTE_PRICE, type Values } from './calc';
import { HEIR_ID } from './heirRef';
import {
  BACKUP_KEY, DATA_VERSION, DEFAULT_USED, MAX_HEIRS, STORAGE_KEY,
  emptyData, isFormData, loadStored, migrate, normalize, pageCount, saveStored,
  type FormData,
} from './storedData';
import { TABLE10_DETAIL_FORM } from '../forms/table10';
import { TABLE9_DETAIL_FORM } from '../forms/table9';

/** vitest は node 環境なので localStorage が無い。読み書きの2つだけ持つ代用を置く */
const store = new Map<string, string>();
/** 容量超過や privacy モードの再現（保存だけが失敗する） */
let refuseSave = false;

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      if (refuseSave) throw new Error('QuotaExceededError');
      store.set(key, value);
    },
  },
});

beforeEach(() => {
  store.clear();
  refuseSave = false;
});

const BROKEN: [string, unknown][] = [
  ['null', null],
  ['数値', 1],
  ['文字列', 'x'],
  ['配列', []],
  ['common が無い', { heirs: [] }],
  ['common が null', { common: null, heirs: [] }],
  ['heirs が無い', { common: {} }],
  ['heirs が配列でない', { common: {}, heirs: {} }],
];

describe('保存データの形（isFormData）', () => {
  it.each(BROKEN)('形が違うものは読み込まない（%s）', (_name, value) => {
    expect(isFormData(value)).toBe(false);
  });

  it('common と heirs があれば読み込む（版・様式一覧・明細は後から補う）', () => {
    expect(isFormData({ common: {}, heirs: [] })).toBe(true);
  });
});

describe('現在の版はそのまま返す（migrate）', () => {
  it('中身にも触らない', () => {
    const data: Partial<FormData> = { common: { name: '甲野太郎' }, heirs: [{}], version: DATA_VERSION };
    expect(migrate(data)).toBe(data);
  });
});

describe('版4までの第2表④は「財産を取得した人」へ移る', () => {
  /** 版4の保存データ（第2表④が独立した行の一覧だったころ） */
  const v4 = (lawful: Values[]): Partial<FormData> => ({
    common: {}, heirs: [{ name: '甲' }, { name: '乙' }], version: 4, lawful,
  } as Partial<FormData>);

  it('結び付いた人に法定相続人の印・放棄・法定相続分が付く', () => {
    const out = migrate(v4([{ source: '1', renounced: '1', num: '1', den: '3' }]));
    expect(out.heirs).toEqual([
      { name: '甲' },
      { name: '乙', isLawful: '1', renounced: '1', lawNum: '1', lawDen: '3' },
    ]);
  });

  it('分数が空なら引き継がない（続柄からの自動候補に任せる）', () => {
    expect(migrate(v4([{ source: '0', num: '', den: '' }])).heirs?.[0]).toEqual({ name: '甲', isLawful: '1' });
  });

  it('放棄していない行は放棄の印を付けない', () => {
    expect(migrate(v4([{ source: '0', renounced: '' }])).heirs?.[0]).toEqual({ name: '甲', isLawful: '1' });
  });

  it('第1表の人と結び付いていない行・居ない人を指す行は移さない', () => {
    expect(migrate(v4([{ source: '', name: '丙' }, { source: '9' }])).heirs)
      .toEqual([{ name: '甲' }, { name: '乙' }]);
  });

  it('移した後は第2表④の一覧を持たない', () => {
    expect(migrate(v4([{ source: '0' }]))).not.toHaveProperty('lawful');
  });
});

describe('版1の付表は「1組＝1要素」から「1財産＝1要素」へまとめ直す', () => {
  const v1 = (rows: Values[]): Partial<FormData> => (
    { common: {}, heirs: [{}], version: 1, details: { table11f1: rows } }
  );

  it('項番が同じで明細欄が空の組は、直前の財産の取得者として後ろへ続ける', () => {
    const out = migrate(v1([
      { no: '1', kind: '宅地', who0: '1', amount0: '100', who1: '2', amount1: '200', who2: '3', amount2: '300' },
      { no: '1', who0: '4', amount0: '400' },
    ]));
    expect(out.details?.table11f1).toEqual([{
      kind: '宅地',
      who0: '1', amount0: '100', who1: '2', amount1: '200', who2: '3', amount2: '300',
      who3: '4', amount3: '400',
    }]);
  });

  it('項番が違えば別の財産として残す', () => {
    const out = migrate(v1([{ no: '1', kind: '宅地', who0: '1' }, { no: '2', kind: '家屋', who0: '2' }]));
    expect(out.details?.table11f1).toEqual([{ kind: '宅地', who0: '1' }, { kind: '家屋', who0: '2' }]);
  });

  it('明細欄が入っていれば項番が同じでも続きにしない（手で同じ番号を打っただけ）', () => {
    const out = migrate(v1([{ no: '1', kind: '宅地' }, { no: '1', kind: '家屋' }]));
    expect(out.details?.table11f1).toEqual([{ kind: '宅地' }, { kind: '家屋' }]);
  });

  it('まったくの空組は落とす（項番は順番から決まるのでずれる）', () => {
    const out = migrate(v1([{ no: '1', kind: '宅地' }, { no: '', kind: '' }, { no: '3', kind: '家屋' }]));
    expect(out.details?.table11f1).toEqual([{ kind: '宅地' }, { kind: '家屋' }]);
  });

  it('項番は持ち越さない（順番から決まる）', () => {
    expect(migrate(v1([{ no: '5', kind: '宅地' }])).details?.table11f1?.[0]).not.toHaveProperty('no');
  });

  it('版2以降の付表はまとめ直さない', () => {
    const rows: Values[] = [{ kind: '宅地', who0: '1' }, { kind: '', who0: '' }];
    const out = migrate({ common: {}, heirs: [{}], version: 2, details: { table11f1: rows } });
    expect(out.details?.table11f1).toEqual(rows);
  });

  it('明細が配列でなければ空の一覧にする（壊れた保存データ）', () => {
    const broken = JSON.parse('{"common":{},"heirs":[],"version":1,"details":{"table11f1":"x"}}') as Partial<FormData>;
    expect(migrate(broken).details?.table11f1).toEqual([]);
  });
});

describe('版2までの付表1は評価方式を推測していた', () => {
  const v2 = (rows: Values[]): Partial<FormData> => (
    { common: {}, heirs: [{}], version: 2, details: { table11f1: rows } }
  );

  it('固定資産税評価額が入っていれば倍率方式として焼き付ける', () => {
    expect(migrate(v2([{ fixedValue: '1000' }])).details?.table11f1)
      .toEqual([{ fixedValue: '1000', [DETAIL_METHOD]: 'ratio' }]);
  });

  it('固定資産税評価額が空なら推測しない（路線価方式のまま）', () => {
    expect(migrate(v2([{ fixedValue: ' ' }])).details?.table11f1).toEqual([{ fixedValue: ' ' }]);
  });

  it('既に方式を持っていれば触らない', () => {
    expect(migrate(v2([{ fixedValue: '1000', [DETAIL_METHOD]: 'route' }])).details?.table11f1)
      .toEqual([{ fixedValue: '1000', [DETAIL_METHOD]: 'route' }]);
  });
});

describe('版6までの付表1は路線価も倍数も同じ欄だった', () => {
  const v6 = (rows: Values[]): Partial<FormData> => (
    { common: {}, heirs: [{}], version: 6, details: { table11f1: rows } }
  );

  it('倍率方式なら倍数へ移す', () => {
    expect(migrate(v6([{ [DETAIL_METHOD]: 'ratio', unitPrice: '1.1' }])).details?.table11f1)
      .toEqual([{ [DETAIL_METHOD]: 'ratio', [TABLE11F1_MULTIPLE]: '1.1' }]);
  });

  it('路線価方式（方式が無いものも）なら路線価へ移す', () => {
    expect(migrate(v6([{ unitPrice: '200000' }])).details?.table11f1)
      .toEqual([{ [TABLE11F1_ROUTE_PRICE]: '200000' }]);
  });

  it('移す先が既に入っていれば古い単価は捨てる', () => {
    expect(migrate(v6([{ unitPrice: '1', [TABLE11F1_ROUTE_PRICE]: '200000' }])).details?.table11f1)
      .toEqual([{ [TABLE11F1_ROUTE_PRICE]: '200000' }]);
  });

  it('付表1以外は単価を移さない（欄を分けたのは付表1だけ）', () => {
    const out = migrate({ common: {}, heirs: [{}], version: 6, details: { table11f2: [{ unitPrice: '1' }] } });
    expect(out.details?.table11f2).toEqual([{ unitPrice: '1' }]);
  });
});

describe('読み込んだデータを現在の形に揃える（normalize）', () => {
  it('人が1人も居なければ1人分の枠を作る', () => {
    expect(normalize({ common: {}, heirs: [] }).heirs).toHaveLength(1);
  });

  it('IDの無い人にはIDを振り、持っている人はそのまま', () => {
    const data = normalize({
      common: {}, heirs: [{ name: '甲' }, { name: '乙', [HEIR_ID]: 'pkeep' }], version: DATA_VERSION,
    });
    // 版5までの参照は「何人目か」の数字なので、数字だけのIDは振らない
    expect(data.heirs[0]![HEIR_ID]).not.toMatch(/^\d*$/);
    expect(data.heirs[1]![HEIR_ID]).toBe('pkeep');
  });

  it('版はいつでも現在のものになる', () => {
    expect(normalize({ common: {}, heirs: [{}], version: 1 }).version).toBe(DATA_VERSION);
  });

  it('様式の一覧が無ければ既定に戻す', () => {
    expect(normalize({ common: {}, heirs: [{}], version: DATA_VERSION }).used).toEqual(DEFAULT_USED);
  });
});

describe('版5までの氏名欄は「第1表の何人目か」からIDへ読み替える', () => {
  const heirs: Values[] = [{ name: '甲', [HEIR_ID]: 'pa' }, { name: '乙', [HEIR_ID]: 'pb' }];

  it('共通欄と付表の参照が人のIDになる', () => {
    const data = normalize({
      common: { t9d0Who: '2' }, heirs, version: 5,
      details: { table11f1: [{ kind: '宅地', who0: '1' }] },
    });
    expect(data.common.t9d0Who).toBe('pb');
    expect(data.details.table11f1?.[0]?.who0).toBe('pa');
  });

  it('居ない人を指していた参照は空にする', () => {
    expect(normalize({ common: { t9d0Who: '9' }, heirs, version: 5 }).common.t9d0Who).toBe('');
  });

  it('参照でない欄は数字でも触らない', () => {
    expect(normalize({ common: { name: '2' }, heirs, version: 5 }).common.name).toBe('2');
  });

  it('版6以降は読み替えない（既にIDが入っている）', () => {
    expect(normalize({ common: { t9d0Who: 'pb' }, heirs, version: 6 }).common.t9d0Who).toBe('pb');
  });
});

describe('明細が入っている様式には「使用する」の印を自動で付ける', () => {
  it('明細のある付表と、その合計表である第11表に付く', () => {
    const data = normalize({
      common: {}, heirs: [{}], used: ['table1'], version: DATA_VERSION,
      details: { table11f2: [{ kind: '株式' }] },
    });
    expect(data.used).toEqual(['table1', 'table11f2', 'table11']);
  });

  it.each([['第9表', TABLE9_DETAIL_FORM], ['第10表', TABLE10_DETAIL_FORM]])(
    '%s の明細があれば転記先の付表4にも付く', (_name, form) => {
      const data = normalize({
        common: {}, heirs: [{}], used: ['table1'], version: DATA_VERSION,
        details: { [form]: [{ amt: '1000000' }] },
      });
      expect(data.used).toEqual(['table1', 'table11f4', 'table11']);
    },
  );

  it('打って消しただけの空の明細では付かない', () => {
    const data = normalize({
      common: {}, heirs: [{}], used: ['table1'], version: DATA_VERSION,
      details: { table11f2: [{ kind: '' }] },
    });
    expect(data.used).toEqual(['table1']);
  });

  it('既に印が付いていれば重ねない', () => {
    const data = normalize({
      common: {}, heirs: [{}], used: ['table11', 'table11f2'], version: DATA_VERSION,
      details: { table11f2: [{ kind: '株式' }] },
    });
    expect(data.used).toEqual(['table11', 'table11f2']);
  });
});

describe('保存と読み込み（loadStored / saveStored）', () => {
  const expectEmpty = (data: FormData): void => {
    expect(data.heirs).toHaveLength(1);
    expect(data.common).toEqual({});
    expect(data.details).toEqual({});
    expect(data.used).toEqual(DEFAULT_USED);
    expect(data.version).toBe(DATA_VERSION);
  };

  it('何も保存されていなければ空のデータ', () => {
    expectEmpty(loadStored());
  });

  it.each([['壊れた JSON', '{'], ['形が違うデータ', '{"heirs":[]}'], ['空文字', '']])(
    '読めないものは空のデータで始める（%s）', (_name, raw) => {
      store.set(STORAGE_KEY, raw);
      expectEmpty(loadStored());
    },
  );

  it('保存した内容を読み戻せる', () => {
    const data: FormData = {
      common: { name: '甲野太郎' }, heirs: [{ [HEIR_ID]: 'pa', name: '甲' }],
      used: ['table1'], details: { table11f1: [{ kind: '宅地' }] }, version: DATA_VERSION,
    };
    expect(saveStored(data)).toBe(true);
    expect(loadStored()).toEqual({ ...data, used: ['table1', 'table11f1', 'table11'] });
  });

  it('旧版を読んだときは移行前のものを退避する（まとめ直しは元に戻せない）', () => {
    const raw = '{"common":{},"heirs":[{}],"version":1}';
    store.set(STORAGE_KEY, raw);
    loadStored();
    expect(store.get(BACKUP_KEY)).toBe(raw);
  });

  it('退避は1回だけ（2回目の読み込みで移行前の姿を潰さない）', () => {
    store.set(BACKUP_KEY, '最初に退避したもの');
    store.set(STORAGE_KEY, '{"common":{},"heirs":[{}],"version":1}');
    loadStored();
    expect(store.get(BACKUP_KEY)).toBe('最初に退避したもの');
  });

  it('現在の版なら退避しない', () => {
    store.set(STORAGE_KEY, `{"common":{},"heirs":[{}],"version":${DATA_VERSION}}`);
    loadStored();
    expect(store.has(BACKUP_KEY)).toBe(false);
  });

  it('退避できなくても読み込みは続ける', () => {
    store.set(STORAGE_KEY, '{"common":{},"heirs":[{"name":"甲"}],"version":1}');
    refuseSave = true;
    expect(loadStored().heirs[0]?.name).toBe('甲');
  });

  it('保存できなければ false を返す（入力自体は続けられる）', () => {
    refuseSave = true;
    expect(saveStored(emptyData())).toBe(false);
  });
});

describe('第1表の枚数（pageCount）', () => {
  it.each([[0, 1], [1, 1], [2, 2], [3, 2], [4, 3], [5, 3]])(
    '%i人なら %i枚（1人目は第1表、2人目以降は（続）に2人ずつ）', (heirs, pages) => {
      expect(pageCount(heirs)).toBe(pages);
    },
  );

  it('人数の上限は第1表（続）10枚にちょうど収まる', () => {
    expect(pageCount(MAX_HEIRS)).toBe(11);
  });
});
