// 欄の辞書を配るAPI。外部ツール（MCP サーバー）が唯一の拠り所にする。
//
// 辞書を配る側をここに置いたのは、様式の定義（src/components/tables）と同じリポジトリで
// テストに突き合わせられるため。外部ツール側に様式の知識を持たせると二重管理になり、
// 様式が変わったときに片方だけ古いまま静かにずれる。

import { Hono } from 'hono';
import { buildFieldCatalog } from '../fieldCatalog.js';

export function createFieldCatalogRouter() {
  const router = new Hono();

  router.get('/field-catalog', (c) => c.json(buildFieldCatalog()));

  return router;
}
