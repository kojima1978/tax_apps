import { describe, expect, it } from 'vitest';
import type { AssetInput } from './types';
import { buildReviewGroups, describeSource, missingFields, reviewMark, reviewTooltip } from './review';

const asset = (extra: Partial<AssetInput> = {}): AssetInput => ({
  id: extra.id ?? 'a',
  no: '1',
  category: '工具器具備品（200%定率法）',
  categoryLabel: '工具器具備品（200%定率法）',
  name: 'パソコン',
  acquisitionDate: '2021-04-01',
  usefulLife: 4,
  acquisitionCost: 300000,
  bookValue: 50000,
  hasFixedAssetTaxRecord: false,
  isRental: false,
  ...extra,
});

const src = { file: '台帳.pdf', page: 3 };

describe('reviewMark', () => {
  it('人が入れた行・確認済みの行には印を付けない', () => {
    expect(reviewMark(asset())).toBeNull();
    expect(reviewMark(asset({ source: src, review: { confirmed: true, warnings: ['x'] } }))).toBeNull();
  });
  it('自信なし・注意ありは要確認、それ以外の取込は未確認', () => {
    expect(reviewMark(asset({ source: { ...src, uncertain: true }, review: {} }))).toBe('attention');
    expect(reviewMark(asset({ source: src, review: { warnings: ['日を補った'] } }))).toBe('attention');
    expect(reviewMark(asset({ source: src, review: {} }))).toBe('pending');
  });
});

describe('describeSource / reviewTooltip', () => {
  it('ファイル・ページ・メモ', () => {
    expect(describeSource({ file: '台帳.pdf' })).toBe('台帳.pdf');
    expect(describeSource({ file: '台帳.pdf', page: 3, note: '12行目' })).toBe('台帳.pdf 3ページ ／ 12行目');
  });
  it('ツールチップに注意を並べる', () => {
    const t = reviewTooltip(asset({ source: { ...src, uncertain: true }, review: { warnings: ['日を補った'] } }));
    expect(t.split('\n')).toEqual([
      '取込元: 台帳.pdf 3ページ',
      '読み取りに自信がありません。台帳と見比べてください',
      '・日を補った',
      '直すか「確認済み」を押すと印が消えます',
    ]);
    expect(reviewTooltip(asset())).toBe('');
  });
});

describe('missingFields', () => {
  it('評価に要る値', () => {
    expect(missingFields(asset())).toEqual([]);
    expect(missingFields(asset({ name: ' ', acquisitionDate: '2023/2/30', acquisitionCost: 0, usefulLife: 0 }))).toEqual([
      '資産名称',
      '取得年月日',
      '取得価額',
      '耐用年数',
    ]);
    // 簿価評価の区分は耐用年数を使わない
    expect(missingFields(asset({ category: '一括償却資産（3年均等）', usefulLife: 0 }))).toEqual([]);
  });
});

describe('buildReviewGroups', () => {
  it('1行は1つのグループにだけ入り、未入力は別に数える', () => {
    const rows = [
      asset({ id: 'manual' }),
      asset({ id: 'uncertain-building', category: '建物（定額法）', source: { ...src, uncertain: true }, review: {} }),
      asset({ id: 'building', category: '建物附属設備（200%定率法）', source: src, review: {} }),
      asset({ id: 'other', source: src, review: {} }),
      asset({ id: 'done', source: src, review: { confirmed: true } }),
      asset({ id: 'missing', name: '', source: src, review: {} }),
    ];
    const g = buildReviewGroups(rows);
    expect(g.hasIntake).toBe(true);
    expect(g.pendingCount).toBe(4);
    expect(g.attention.map((a) => a.id)).toEqual(['uncertain-building']);
    expect(g.building.map((a) => a.id)).toEqual(['building']);
    expect(g.other.map((a) => a.id)).toEqual(['other', 'missing']);
    expect(g.missing).toEqual([{ asset: rows[5], fields: ['資産名称'] }]);
  });
  it('取込の行が無ければ hasIntake は false', () => {
    expect(buildReviewGroups([asset()]).hasIntake).toBe(false);
  });
});
