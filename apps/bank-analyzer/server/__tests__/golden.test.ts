// 段階1で記録した Django 版の正解（test-data/golden）が、テストの走る場所から
// 読めることだけを確かめる。段階3以降のテストはすべてここを読むので、
// .dockerignore や CI のチェックアウトで落ちていたら最初に気づけるようにしておく。

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const GOLDEN_DIR = path.resolve('test-data/golden');

describe('test-data/golden', () => {
  it('入力の手順と正解が揃っている', () => {
    const scenarios = JSON.parse(
      fs.readFileSync(path.join(GOLDEN_DIR, 'inputs/scenarios.json'), 'utf8'),
    ) as unknown;
    expect(Array.isArray(scenarios) || typeof scenarios === 'object').toBe(true);

    for (const name of ['importer', 'scenarios']) {
      expect(fs.statSync(path.join(GOLDEN_DIR, 'expected', name)).isDirectory()).toBe(true);
    }
    expect(fs.readdirSync(path.join(GOLDEN_DIR, 'inputs/files')).length).toBeGreaterThan(0);
  });

  it('改行コードが変換されていない（CRLF と LF の入力をそれぞれそのまま読むため）', () => {
    // .gitattributes の -text が効いていれば、作ったときの改行のまま届く。
    // autocrlf で揃えられると「CRLF の CSV を読めるか」のテストが何も試さなくなる。
    const read = (name: string) => fs.readFileSync(path.join(GOLDEN_DIR, 'inputs/files', name));
    expect(read('e06_cp932_crlf.csv').includes('\r\n')).toBe(true);
    expect(read('e01_leading_zero_account.csv').includes('\r')).toBe(false);
  });
});
