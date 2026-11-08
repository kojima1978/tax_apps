/**
 * normalize_asset_case。正規化の中身は asset-valuation 側のテストが見るので、
 * ここでは「同じ関数を通っていること」と報告の形・エラーの返し方を見る。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeAssetCase } from '../assetCase.js';
import { InputError } from '../errors.js';

const sample = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../asset-valuation/test-data/asset-valuation-intake-sample.json', import.meta.url)),
    'utf8',
  ),
);

const today = new Date(2026, 10, 8);

describe('normalize_asset_case', () => {
  it('ダミー台帳の取込サンプルを、台帳の合計と同じ数字で返す', () => {
    const report = JSON.parse(normalizeAssetCase({ case: sample }, today));
    expect(report.fileName).toBe('R081108_ダミー商事株式会社 様_減価償却資産評価.json');
    expect(report.totals.count).toBe(9);
    expect(report.totals.acquisitionCost).toBe(58_170_000);
    expect(report.totals.bookValue).toBe(33_989_825);
    expect(report.caseJson.version).toBe('1.1');
    expect(report.caseJson.taxDate).toBe('2026-03-31');
  });

  it('確かめてほしい行をアプリの「取込の確認」と同じ分け方で返す', () => {
    const { review } = JSON.parse(normalizeAssetCase({ case: sample }, today));
    expect(review.attention.map((r: { no: string }) => r.no)).toEqual(['002', '004', '009']);
    expect(review.building.map((r: { no: string }) => r.no)).toEqual(['001']);
    expect(review.missing.map((r: { no: string }) => r.no)).toEqual(['009']);
    expect(review.otherCount).toBe(5);
    const r004 = review.attention.find((r: { no: string }) => r.no === '004');
    expect(r004.reasons[0]).toContain('uncertain');
    expect(r004.source).toContain('2ページ');
  });

  it('和暦・カンマ付き金額・「15年」・科目の別名を正規化する', () => {
    const { caseJson } = JSON.parse(
      normalizeAssetCase(
        {
          case: {
            caseName: 'テスト 様',
            taxDate: 'R8.3.31',
            assets: [
              {
                no: '001',
                name: '空調設備',
                category: '建物付属設備',
                acquisitionDate: '平成28年10月1日',
                usefulLife: '15年',
                acquisitionCost: '3,200,000',
                bookValue: '720,512',
                source: { file: '台帳.pdf', page: 1 },
              },
            ],
          },
        },
        today,
      ),
    );
    const [a] = caseJson.assets;
    expect(a.category).toMatch(/^建物附属設備/);
    expect(a.acquisitionDate).toBe('2016-10-01');
    expect(a.usefulLife).toBe(15);
    expect(a.acquisitionCost).toBe(3_200_000);
  });

  it('案件として成り立たないときは入力の誤りとして返す', () => {
    expect(() => normalizeAssetCase({ case: { caseName: 'x', assets: [] } }, today)).toThrow(InputError);
    expect(() => normalizeAssetCase({ case: { caseName: 'x', assets: [] } }, today)).toThrow('課税時期');
  });
});
