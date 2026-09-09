// 業種目データの入出力CLIで共用する最小限のAPIクライアント。
//
// 実行はコンテナの中を前提にしている（ローカルに node_modules を作らないため）:
//   docker compose exec stock-valuation-form npm run industry:export
// dev のイメージは API を 3114、本番は 3014 で待つ。どちらも PORT に入っているので
// 既定値はそこから組み立てる。別ホストを叩くときは --base か SVF_API_BASE で上書きする。

export const DEFAULT_BASE = process.env.SVF_API_BASE
  ?? `http://127.0.0.1:${process.env.PORT ?? 3014}/stock-valuation-form/api`;

/** `--key value` と `--flag` だけの素朴な解析。残りは位置引数として返す。 */
export function parseArgs(argv, flags = []) {
  const options = {};
  const rest = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (flags.includes(key)) {
      options[key] = true;
      continue;
    }
    index += 1;
    if (index >= argv.length) throw new Error(`--${key} に値がありません`);
    options[key] = argv[index];
  }

  return { options, rest };
}

/** サーバのエラー本体（{ error, detail }）を読める1行に畳んでから投げる。 */
async function unwrap(response, what) {
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // JSON でなければ生のまま見せる（プロキシが返した HTML など）。
  }

  if (!response.ok) {
    const message = body?.error ?? text.slice(0, 200) ?? `HTTP ${response.status}`;
    const numbers = body?.detail?.numbers;
    const suffix = numbers?.length ? `（${numbers.slice(0, 20).join(', ')}）` : '';
    throw new Error(`${what}: HTTP ${response.status} ${message}${suffix}`);
  }
  return body;
}

export async function getJson(base, path) {
  return unwrap(await fetch(`${base}${path}`), `GET ${path}`);
}

export async function postJson(base, path, body) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return unwrap(response, `POST ${path}`);
}

/** 登録済みの年分をアーカイブの内容で入れ直す（PUT /industry-years/:gregorianYear）。 */
export async function putJson(base, path, body) {
  const response = await fetch(`${base}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return unwrap(response, `PUT ${path}`);
}

export function archiveFileName(label, gregorianYear) {
  return `業種目データ_${label}_${gregorianYear}.json`;
}
