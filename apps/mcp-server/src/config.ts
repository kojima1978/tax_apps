/**
 * 接続先の設定。
 *
 * 既定は共有ネットワーク `tax-apps-network` 上の株式評価明細書コンテナ。
 * 3014 を叩くのは、開発モード（Vite が /stock-valuation-form/api を同一コンテナの
 * 3114 へプロキシする）でも本番モード（Node が 3014 で API ごと配信する）でも
 * 同じURLで通るため。モードによって接続先を変えずに済む。
 */
export interface Config {
  /** 株式評価明細書のAPIの入口（末尾にスラッシュを付けない） */
  svfBaseUrl: string;
  /** 1リクエストの制限時間（ミリ秒） */
  timeoutMs: number;
}

const DEFAULT_BASE_URL = 'http://stock-valuation-form:3014/stock-valuation-form/api';
const DEFAULT_TIMEOUT_MS = 15_000;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const base = (env.SVF_API_BASE ?? DEFAULT_BASE_URL).trim().replace(/[/]+$/, '');
  const timeout = Number(env.SVF_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return {
    svfBaseUrl: base,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}
