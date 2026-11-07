/**
 * 案件を作る道具。見ているのは3つ:
 *   - 試算のときは作らない（他の書き込み系と同じ）
 *   - 第1表の1 の欄まで入る … 列だけ埋めると、画面を開いた次の自動保存で見出しが空になる
 *   - 和暦として成り立たない日付を弾く … 黙って別の日で作ると会社規模の判定ごと変わる
 */
import { describe, expect, it } from 'vitest';
import type { SvfApi } from '../api.js';
import * as tools from '../tools.js';
import { caseRow, catalog, createFakeApi } from './fixtures.js';

const 課税時期 = '令和8年3月31日';

describe('create_case', () => {
  it('既定では作らず、入る欄を見せるだけ', async () => {
    const api = createFakeApi();
    const text = await tools.createCase(api, { companyName: '甲野工業　株式会社', taxPeriod: 課税時期 });

    expect(api.creates).toHaveLength(0);
    expect(text).toContain('試算');
    expect(text).toContain('f12=甲野工業　株式会社');
    expect(text).toContain('f14_y=8');
  });

  it('commit で作り、第1表の1 の欄まで入る', async () => {
    const api = createFakeApi();
    const text = await tools.createCase(api, {
      companyName: '甲野工業　株式会社',
      taxPeriod: 課税時期,
      fiscalYearFrom: '令和7年4月1日',
      fiscalYearTo: '令和8年3月31日',
      commit: true,
    });

    expect(api.creates).toHaveLength(1);
    const body = api.creates[0]!;
    expect(body.companyName).toBe('甲野工業　株式会社');
    // 一覧の見出しは欄から作り直されるので、列と欄の両方が同じ値になっていること
    expect(body.taxPeriod).toBe('令和8年3月31日');
    expect(body.data.table1_1).toEqual({
      f12: '甲野工業　株式会社',
      f14_g: '令和',
      f14_y: '8',
      f14_m: '3',
      f14_d: '31',
      f15_from_g: '令和',
      f15_from_y: '7',
      f15_from_m: '4',
      f15_from_d: '1',
      f15_to_g: '令和',
      f15_to_y: '8',
      f15_to_m: '3',
      f15_to_d: '31',
    });
    expect(text).toContain('案件を作りました。');
    expect(text).toContain('caseId: 2');
  });

  it('同じ会社・同じ課税時期の案件があれば作らずにそれを返す', async () => {
    const api = createFakeApi();
    api.cases.push(caseRow(7, '甲野工業　株式会社', 課税時期));

    const text = await tools.createCase(api, {
      companyName: '甲野工業　株式会社',
      taxPeriod: 課税時期,
      commit: true,
    });

    expect(api.creates).toHaveLength(0);
    expect(text).toContain('新しくは作りません');
    expect(text).toContain('caseId: 7');
  });

  it('課税時期が違えば別の案件として作る', async () => {
    const api = createFakeApi();
    api.cases.push(caseRow(7, '甲野工業　株式会社', '令和7年3月31日'));

    await tools.createCase(api, { companyName: '甲野工業　株式会社', taxPeriod: 課税時期, commit: true });
    expect(api.creates).toHaveLength(1);
  });

  it('ゴミ箱にだけあるときは作るが、復元できることを知らせる', async () => {
    const api = createFakeApi();
    api.cases.push(caseRow(7, '甲野工業　株式会社', 課税時期, '2026-02-01T00:00:00.000Z'));

    const text = await tools.createCase(api, {
      companyName: '甲野工業　株式会社',
      taxPeriod: 課税時期,
      commit: true,
    });

    expect(api.creates).toHaveLength(1);
    expect(text).toContain('ゴミ箱にあります（caseId: 7）');
  });

  it('月日が分からなければ年までで作り、人が入れる欄として挙げる', async () => {
    const api = createFakeApi();
    const text = await tools.createCase(api, {
      companyName: '甲野工業',
      taxPeriod: '令和8年',
      commit: true,
    });

    expect(api.creates[0]!.taxPeriod).toBe('令和8年');
    expect(api.creates[0]!.data.table1_1).toMatchObject({ f14_y: '8', f14_m: '', f14_d: '' });
    expect(text).toContain('人が画面で入れる欄:');
    expect(text).toContain('課税時期の月日が入っていません');
    expect(text).toContain('直前期（自）は空のままです');
  });

  it('元号を省いたら令和として扱い、全角数字も読む', async () => {
    const api = createFakeApi();
    await tools.createCase(api, { companyName: '甲野工業', taxPeriod: '８年３月３１日', commit: true });
    expect(api.creates[0]!.data.table1_1).toMatchObject({ f14_g: '令和', f14_y: '8', f14_m: '3', f14_d: '31' });
  });

  it('「元年」を1年として読む', async () => {
    const api = createFakeApi();
    await tools.createCase(api, { companyName: '甲野工業', taxPeriod: '令和元年6月1日', commit: true });
    expect(api.creates[0]!.taxPeriod).toBe('令和1年6月1日');
  });

  it('会社名が空なら弾く', async () => {
    const api = createFakeApi();
    await expect(tools.createCase(api, { companyName: '  ', taxPeriod: 課税時期 })).rejects.toThrow(/会社名/);
    expect(api.creates).toHaveLength(0);
  });

  it('課税時期が空なら弾く（一覧で見分けられなくなるため）', async () => {
    const api = createFakeApi();
    await expect(tools.createCase(api, { companyName: '甲野工業', taxPeriod: '' })).rejects.toThrow(/課税時期/);
  });

  const 弾く日付: [string, string, RegExp][] = [
    ['日付として読めない', '2026年3月31日です', /日付として読めません/],
    ['選べない元号', '大正5年3月31日', /選べる元号にありません/],
    ['その元号に無い年', '平成40年3月31日', /平成に40年はありません/],
    ['実在しない日', '令和8年2月30日', /2月に30日はありません/],
    ['元号の期間の外', '令和1年1月1日', /期間（2019-05-01）の外/],
    ['改元後の平成', '平成31年5月1日', /期間/],
  ];

  it.each(弾く日付)('%s は弾く', async (_name, taxPeriod, pattern) => {
    const api = createFakeApi();
    await expect(tools.createCase(api, { companyName: '甲野工業', taxPeriod, commit: true }))
      .rejects.toThrow(pattern);
    expect(api.creates).toHaveLength(0);
  });

  it('直前期の自と至が入れ違っていたら弾く', async () => {
    const api = createFakeApi();
    await expect(
      tools.createCase(api, {
        companyName: '甲野工業',
        taxPeriod: 課税時期,
        fiscalYearFrom: '令和8年3月31日',
        fiscalYearTo: '令和7年4月1日',
        commit: true,
      }),
    ).rejects.toThrow(/入れ違って/);
  });

  it('辞書に案件の見出しの欄が無ければ作りに行かない', async () => {
    const api: SvfApi = {
      ...createFakeApi(),
      async getCatalog() {
        return { ...catalog, caseIdentity: undefined };
      },
    };
    await expect(
      tools.createCase(api, { companyName: '甲野工業', taxPeriod: 課税時期, commit: true }),
    ).rejects.toThrow(/caseIdentity/);
  });
});
