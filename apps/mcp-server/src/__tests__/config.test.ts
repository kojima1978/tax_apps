import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';

describe('接続先の設定', () => {
  it('既定は共有ネットワーク上の株式評価明細書', () => {
    const config = loadConfig({});
    expect(config.svfBaseUrl).toBe('http://stock-valuation-form:3014/stock-valuation-form/api');
    expect(config.timeoutMs).toBe(15_000);
  });

  it('末尾のスラッシュは落とす（パスを足すときに // にならないように）', () => {
    expect(loadConfig({ SVF_API_BASE: 'http://localhost:3014/api//' }).svfBaseUrl).toBe(
      'http://localhost:3014/api',
    );
  });

  it('読めない制限時間は既定に戻す', () => {
    expect(loadConfig({ SVF_API_TIMEOUT_MS: 'なし' }).timeoutMs).toBe(15_000);
    expect(loadConfig({ SVF_API_TIMEOUT_MS: '0' }).timeoutMs).toBe(15_000);
    expect(loadConfig({ SVF_API_TIMEOUT_MS: '5000' }).timeoutMs).toBe(5000);
  });
});
