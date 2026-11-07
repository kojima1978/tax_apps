/**
 * Claude デスクトップの設定へ tax-apps の MCP サーバーを足す（他は保つ）。
 *
 * このプログラムは**ホストでは実行しない**。setup-mcp.sh が
 * `docker run --rm -i node:<ver>-alpine node` の stdin へ流し込んで動かす
 * （別の PC に node がある保証は無く、ホストへ入れるのも方針に反する）。
 * ファイルの読み書きもしない: 受け取るのは環境変数、返すのは stdout だけ。
 * 設定ファイルを開くのも控えを取るのも書き戻すのも呼び出し側の仕事 ──
 * 書き込みをコンテナの中へ入れると、Windows のパス変換とマウントが要るうえ、
 * 失敗したときに「書けたのかどうか」が分からなくなる。
 *
 * 受け取るもの（環境変数）:
 *   MCP_SERVER_KEY   mcpServers の下に置く名前（例 tax-apps）
 *   MCP_CONFIG_JSON  いまの設定ファイルの中身。無い／空なら新しく作る
 *   MCP_ENTRY_JSON   登録する内容（command と args）
 *
 * 返すもの:
 *   stdout  まるごと書き戻すための JSON（2スペース・末尾改行つき）
 *   stderr  status=created|added|changed|same と others=<ほかのサーバー名>
 *   終了コード 0=正常 / 3=いまの設定が読めない（このときは何も返さない）
 *
 * **読めない設定を黙って作り直さない**ことが要点。ここで `{}` から組み直すと、
 * 人が自分で足したほかの MCP サーバーの設定が消える。
 */
'use strict';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** キーの並び順の違いで「変わった」と言わないための比較。 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(
      (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]),
    );
  }
  return false;
}

function fail(message) {
  process.stderr.write('status=error\n');
  process.stderr.write(message + '\n');
  process.exit(3);
}

const key = process.env.MCP_SERVER_KEY || 'tax-apps';

let entry;
try {
  entry = JSON.parse(process.env.MCP_ENTRY_JSON || '');
} catch (error) {
  fail('登録する内容（MCP_ENTRY_JSON）が JSON として読めません: ' + error.message);
}
if (!isPlainObject(entry)) fail('登録する内容（MCP_ENTRY_JSON）が { } の形ではありません。');

// BOM 付きで保存されていることがある（Windows のメモ帳など）。付いたままだと JSON.parse が落ちる。
const text = (process.env.MCP_CONFIG_JSON || '').replace(/^﻿/, '').trim();
const created = text === '';

let config = {};
if (!created) {
  try {
    config = JSON.parse(text);
  } catch (error) {
    fail('いまの設定ファイルが JSON として読めません。壊さずに中止します: ' + error.message);
  }
  if (!isPlainObject(config)) {
    fail('いまの設定ファイルが { } で始まる形ではありません。壊さずに中止します。');
  }
}

let servers = config.mcpServers;
if (servers === undefined || servers === null) {
  servers = {};
} else if (!isPlainObject(servers)) {
  fail('いまの設定の mcpServers が { } の形ではありません。壊さずに中止します。');
}

const before = Object.prototype.hasOwnProperty.call(servers, key) ? servers[key] : undefined;
const others = Object.keys(servers).filter((name) => name !== key);

let status;
if (before === undefined) status = created ? 'created' : 'added';
else status = deepEqual(before, entry) ? 'same' : 'changed';

servers[key] = entry;
config.mcpServers = servers;

process.stderr.write('status=' + status + '\n');
process.stderr.write('others=' + others.join(',') + '\n');
process.stdout.write(JSON.stringify(config, null, 2) + '\n');
