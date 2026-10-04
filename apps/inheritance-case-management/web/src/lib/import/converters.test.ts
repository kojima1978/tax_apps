import { describe, expect, it } from 'vitest';
import { buildColumnMaps, rowToInput } from './converters';
import type { ResolverMaps } from './types';

const maps = (headers: string[]) => buildColumnMaps(headers);
const parse = (headers: string[], row: string[], resolvers?: ResolverMaps) =>
  rowToInput(row, maps(headers), resolvers);

const resolvers = (): ResolverMaps => ({
  assigneeNameToId: new Map([['佐藤 一郎', 11], ['鈴木 二郎', 12]]),
  // 紹介者のキーは「会社名\0部署名」。部署名なしの登録はキーの後半が空。
  referrerNameToId: new Map([['あおぞら銀行\0', 21], ['あおぞら銀行\0新宿支店', 22]]),
});

describe('列の対応付け', () => {
  it('ID・進捗データ・相続人列を本文の列と分けて拾う', () => {
    const m = maps(['ID', '被相続人氏名', '相続人1_氏名', '相続人2_住所', '進捗データ']);
    expect(m.idCol).toBe(0);
    expect(m.progressCol).toBe(4);
    expect(m.fieldMap.get(1)).toBe('deceasedName');
    expect(m.heirCols.get(2)).toEqual({ index: 1, field: 'name' });
    expect(m.heirCols.get(3)).toEqual({ index: 2, field: 'address' });
  });

  it('書き出し専用の列（作成日・更新日）と未知の列は無視する', () => {
    const m = maps(['作成日', '更新日', '社内用メモ欄']);
    expect(m.fieldMap.size).toBe(0);
    expect(m.idCol).toBeNull();
    expect(m.progressCol).toBeNull();
  });

  it('旧い見出しも同じ項目に寄せる', () => {
    const m = maps(['進み具合', '申告日', '相続人数', '相続人1_メール']);
    expect(m.fieldMap.get(0)).toBe('status');
    expect(m.fieldMap.get(1)).toBe('caseCompletedDate');
    expect(m.fieldMap.get(2)).toBe('feeCalculationHeirCount');
    expect(m.heirCols.get(3)).toEqual({ index: 1, field: 'memo' });
  });

  it('相続人の列番号が範囲外なら相続人として扱わない', () => {
    const m = maps(['相続人11_氏名', '相続人0_氏名']);
    expect(m.heirCols.size).toBe(0);
  });
});

describe('1行をフォームの入力値へ', () => {
  it('ID は正の整数のときだけ更新対象になる', () => {
    expect(parse(['ID'], ['42']).rawId).toBe(42);
    expect(parse(['ID'], ['']).rawId).toBeNull();
    expect(parse(['ID'], ['0']).rawId).toBeNull();
    expect(parse(['ID'], ['新規']).rawId).toBeNull();
  });

  it('日付は書式を問わず YYYY-MM-DD に揃える', () => {
    const { obj } = parse(['死亡日', '受託日', '請求日'], ['R7/3/1', '2026.4.1', '']);
    expect(obj.dateOfDeath).toBe('2025-03-01');
    expect(obj.caseAddedDate).toBe('2026-04-01');
    expect(obj.billedDate).toBeUndefined();
  });

  it('遺産未分割は「はい/true/1/○」だけ真', () => {
    for (const v of ['はい', 'true', '1', '○']) {
      expect(parse(['遺産未分割'], [v]).obj.isUndivided, v).toBe(true);
    }
    for (const v of ['いいえ', 'false', '0', '×']) {
      expect(parse(['遺産未分割'], [v]).obj.isUndivided, v).toBe(false);
    }
    // 空欄は「触れない」。既定値を当てるのは後段の zod。
    expect('isUndivided' in parse(['遺産未分割'], ['']).obj).toBe(false);
  });

  it('知らないステータスは undefined にして既定値へ落とす', () => {
    expect(parse(['ステータス'], ['手続中']).obj.status).toBe('手続中');
    expect(parse(['ステータス'], ['進行中']).obj.status).toBeUndefined();
  });

  it('金額は丸めるが、紹介料率だけは小数のまま残す', () => {
    const { obj } = parse(['報酬額', '紹介料率(%)'], ['1,234,567.6', '12.5']);
    expect(obj.feeAmount).toBe(1234568);
    expect(obj.referralFeeRate).toBe(12.5);
  });

  it('特記事項は10文字で切り、切ったことを警告に残す', () => {
    const { obj, rowWarnings } = parse(['特記事項'], ['あいうえおかきくけこさ']);
    expect(obj.summary).toBe('あいうえおかきくけこ');
    expect(rowWarnings).toHaveLength(1);
    expect(rowWarnings[0]).toContain('11文字');

    expect(parse(['特記事項'], ['あいうえおかきくけこ']).rowWarnings).toEqual([]);
  });
});

describe('担当者・紹介者の突き合わせ', () => {
  it('登録済みの名前は ID に解決する', () => {
    const { obj } = parse(['担当者_氏名', '紹介者_会社名'], ['佐藤 一郎', 'あおぞら銀行'], resolvers());
    expect(obj.assigneeId).toBe(11);
    expect(obj.referrerId).toBe(21);
  });

  it('部署名まで一致すればその部署、無ければ会社だけの登録へ落ちる', () => {
    const r = resolvers();
    expect(parse(['紹介者_会社名', '紹介者_部署名'], ['あおぞら銀行', '新宿支店'], r).obj.referrerId).toBe(22);
    expect(parse(['紹介者_会社名', '紹介者_部署名'], ['あおぞら銀行', '渋谷支店'], r).obj.referrerId).toBe(21);
  });

  it('未登録の名前は「これから作るもの」として持ち越す', () => {
    const res = parse(
      ['担当者_氏名', '担当者_部署名', '紹介者_会社名', '紹介者_部署名', '社内紹介者_氏名'],
      ['田中 三郎', '資産税部', 'みらい信金', '本店', '高橋 四郎'],
      resolvers()
    );
    expect(res.pendingAssignee).toEqual({ name: '田中 三郎', department: '資産税部' });
    expect(res.pendingReferrer).toEqual({ company: 'みらい信金', department: '本店' });
    expect(res.pendingInternalReferrer).toEqual({ name: '高橋 四郎' });
    expect(res.obj.assigneeId).toBeUndefined();
    expect(res.obj.referrerId).toBeUndefined();
  });

  it('旧い1列形式（担当者・紹介者）は未解決の名前を別枠で返す', () => {
    const res = parse(['担当者', '紹介者'], ['佐藤 一郎', '知らない銀行'], resolvers());
    expect(res.obj.assigneeId).toBe(11);
    expect(res.obj.referrerId).toBeNull();
    expect(res.unresolvedReferrer).toBe('知らない銀行');
  });

  it('2列形式が入っていれば旧い1列形式より優先する', () => {
    const res = parse(['担当者', '担当者_氏名'], ['佐藤 一郎', '鈴木 二郎'], resolvers());
    expect(res.obj.assigneeId).toBe(12);
  });

  it('社内紹介者は担当者の名簿から引く', () => {
    const res = parse(['社内紹介者'], ['鈴木 二郎'], resolvers());
    expect(res.obj.internalReferrerId).toBe(12);
    expect(res.pendingInternalReferrer).toBeUndefined();
  });
});

describe('相続人の列', () => {
  const headers = [
    '相続人1_氏名', '相続人1_続柄', '相続人1_生年月日', '相続人1_住所',
    '相続人2_氏名', '相続人3_電話',
  ];

  it('番号ごとにまとめ、住所は手入力欄にも写す', () => {
    const { obj } = parse(headers, ['相続 花子', '配偶者', 'S30.4.1', '東京都港区1-1', '相続 次郎', '']);
    expect(obj.heirs).toEqual([
      {
        name: '相続 花子', phone: '', postalCode: '', address: '東京都港区1-1',
        addressManual: '東京都港区1-1', dateOfBirth: '1955-04-01', relationship: '配偶者', memo: '',
      },
      { name: '相続 次郎', phone: '', postalCode: '', address: '', addressManual: '', memo: '' },
    ]);
  });

  it('氏名が無くても電話だけあれば1人として取り込む', () => {
    const { obj } = parse(headers, ['', '', '', '', '', '03-0000-0000']);
    expect(obj.heirs).toHaveLength(1);
    expect((obj.heirs as { phone: string }[])[0].phone).toBe('03-0000-0000');
  });

  it('全部空なら相続人の欄自体を作らない', () => {
    expect('heirs' in parse(headers, ['', '', '', '', '', '']).obj).toBe(false);
  });
});

describe('進捗データの列', () => {
  it('JSON配列を進捗ステップに戻す', () => {
    const json = JSON.stringify([
      { id: 'step-1', name: '初回連絡', date: '2026-01-10' },
      { id: 'step-2', name: '初回面談', date: null, memo: '要再訪', isDynamic: true },
    ]);
    const { obj } = parse(['進捗データ'], [json]);
    expect(obj.progress).toEqual([
      { id: 'step-1', name: '初回連絡', date: '2026-01-10' },
      { id: 'step-2', name: '初回面談', date: null, memo: '要再訪', isDynamic: true },
    ]);
  });

  it('壊れた JSON でも行ごと落とさず、警告を付けて進捗なしで取り込む', () => {
    const { obj, rowWarnings } = parse(['被相続人氏名', '進捗データ'], ['山田', '[{壊れ']);
    expect(obj.deceasedName).toBe('山田');
    expect(obj.progress).toBeUndefined();
    expect(rowWarnings).toEqual(['進捗データのJSON形式が不正です（進捗データなしで取り込みます）']);
  });

  it('配列でない JSON は進捗として扱わない（警告も出さない）', () => {
    const { obj, rowWarnings } = parse(['進捗データ'], ['{"id":"step-1"}']);
    expect(obj.progress).toBeUndefined();
    expect(rowWarnings).toEqual([]);
  });
});
