// 操作者（画面で選んだ社員の氏名）。画面は x-operator-name に encodeURIComponent して送る
// （shared/staff-directory/operator.ts）。
//
// 分類を書き換える経路は6つあり、どれも最後に applyChanges を通る。名前を引数で
// 6経路に渡して回す代わりに、リクエストの間だけ AsyncLocalStorage に置いて
// applyChanges が自分で読む（渡し忘れた経路が黙って空になる形を作らないため）。

import { AsyncLocalStorage } from 'node:async_hooks';
import type { MiddlewareHandler } from 'hono';

const MAX_LENGTH = 100; // analyzer_classificationchange.operator_name の長さ

const store = new AsyncLocalStorage<string>();

export function decodeOperatorName(value: string | undefined): string {
  if (!value) return '';
  let name: string;
  try {
    name = decodeURIComponent(value);
  } catch {
    name = value;
  }
  return name.trim().slice(0, MAX_LENGTH);
}

export const operatorMiddleware: MiddlewareHandler = (c, next) => store.run(decodeOperatorName(c.req.header('x-operator-name')), next);

/** いまのリクエストの操作者。リクエストの外（取込スクリプト・テスト）では空文字 */
export const currentOperatorName = () => store.getStore() ?? '';

/** テストやスクリプトから操作者を付けて呼ぶ */
export const withOperator = <T>(name: string, fn: () => T): T => store.run(name, fn);
