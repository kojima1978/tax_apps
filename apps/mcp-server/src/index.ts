/**
 * tax-apps MCP サーバー（stdio）
 *
 * 想定している使い方は「法人税の申告書・決算書・内訳書のPDFを AI に読ませ、
 * 読み取った数字を株式評価明細書の該当欄へ入れる」こと。
 *
 * このサーバは様式を知らない。どの欄に何が入るかは、株式評価明細書が配る
 * 欄の辞書（GET /field-catalog）だけが決める。辞書に無いコード・自動計算欄・
 * 単位違い・小数混入はすべてここで弾く。
 *
 * 書き込みは既定で試算（dryRun）。差分を見てから commit: true で確定する。
 *
 * 通信は stdin/stdout。ログは必ず stderr へ出すこと（stdout はプロトコルが使う）。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createSvfApi } from './api.js';
import { loadConfig } from './config.js';
import { ApiError, InputError } from './errors.js';
import * as tools from './tools.js';

const config = loadConfig();
const api = createSvfApi(config);

const server = new McpServer(
  { name: 'tax-apps', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

/**
 * 入力の誤り（InputError）と接続の失敗（ApiError）は、文面をそのまま返して
 * 直してもらう。想定外の例外だけは中身が漏れないよう一言にまとめる。
 */
async function run(handler: () => Promise<string>): Promise<ToolResult> {
  try {
    return { content: [{ type: 'text', text: await handler() }] };
  } catch (error) {
    if (error instanceof InputError || error instanceof ApiError) {
      return { content: [{ type: 'text', text: error.message }], isError: true };
    }
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[tax-apps-mcp]', error);
    return { content: [{ type: 'text', text: `処理できませんでした: ${detail}` }], isError: true };
  }
}

const caseId = z.number().int().positive().describe('list_cases が返す caseId');
const commit = z
  .boolean()
  .optional()
  .describe('true で確定して書き込む。省略時は試算のみで、案件は変わらない');

const cellValue = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .describe('金額は千円単位の整数。小数・円単位は受け付けない。空文字は欄を空にする');

server.registerTool(
  'describe_fields',
  {
    title: '書き込める欄の一覧',
    description:
      '株式評価明細書のうち、外から書き込める欄の辞書を返す。書き込む前に必ずこれを読むこと。'
      + 'コードは国税庁の様式に印字されている識別記号（G01 など）で、'
      + '単位・整数かどうか・負数の書き方・備考の選択肢もここに入っている。'
      + '自動計算欄と他表からの転記欄は載っていない（書いても再計算で消えるため）。',
    inputSchema: {
      form: z.string().optional().describe('様式で絞る（例: 第4表の1、第5表）。省略時は全部'),
    },
  },
  async (args) => run(() => tools.describeFields(api, args)),
);

server.registerTool(
  'list_cases',
  {
    title: '案件の一覧',
    description: '登録されている評価案件（会社1社ぶん）の一覧を返す。',
    inputSchema: {
      includeArchived: z.boolean().optional().describe('ゴミ箱の案件も含める'),
    },
  },
  async (args) => run(() => tools.listCases(api, args)),
);

server.registerTool(
  'get_case',
  {
    title: '案件の現在値',
    description:
      '1件の案件について、辞書に載っている欄の現在値と第5表の明細を返す。'
      + '書き込む前にこれで既存の入力を確かめること。',
    inputSchema: { caseId },
  },
  async (args) => run(() => tools.getCase(api, args)),
);

server.registerTool(
  'set_fields',
  {
    title: '欄に書き込む',
    description:
      '決算書・申告書から読み取った数字を、コードで指定した欄へ入れる。'
      + '既定は試算で、差分を返すだけで案件は変わらない。確定するには commit: true。'
      + '金額の単位は様式どおり千円。円で読み取った値は千円に直してから渡すこと'
      + '（換算はこちらでは行わない）。経常か非経常かの判断が要るものは、'
      + '勝手に決めず人に確認すること。',
    inputSchema: {
      caseId,
      values: z
        .array(
          z.object({
            code: z.string().describe('様式の識別記号（describe_fields が返すもの）'),
            value: cellValue,
          }),
        )
        .min(1)
        .describe('書き込む欄。1つでも通らなければ何も書き込まない'),
      commit,
    },
  },
  async (args) => run(() => tools.setFields(api, args)),
);

server.registerTool(
  'import_balance_sheet',
  {
    title: '第5表の明細を入れ替える',
    description:
      '決算書（貸借対照表）から読み取った科目を第5表の明細へ入れる。'
      + '指定した側（資産・負債）は1行目から詰め直すので、その側の既存の行はすべて消える。'
      + '指定しなかった側はそのまま。既定は試算で、確定するには commit: true。'
      + '科目をまとめたり、相続税評価額を帳簿価額から埋めたり、備考（株式等・土地等）を'
      + '推測したりはしない ── どれも評価の判断そのものなので人が決めること。',
    inputSchema: {
      caseId,
      sides: z
        .array(
          z.object({
            side: z.string().describe('describe_fields の rowTables[].sides[].side（asset / liability）'),
            rows: z
              .array(
                z.object({
                  name: z.string().describe('科目'),
                  evaluated: cellValue.describe('相続税評価額（千円）'),
                  book: cellValue.describe('帳簿価額（千円）'),
                  note: z
                    .string()
                    .optional()
                    .describe('備考。辞書の noteOptions に完全一致するものだけ。無ければ省く'),
                }),
              )
              .describe('上から順に入る。空行は挟まないこと'),
          }),
        )
        .min(1),
      commit,
    },
  },
  async (args) => run(() => tools.importBalanceSheet(api, args)),
);

async function main() {
  await server.connect(new StdioServerTransport());
  console.error(`[tax-apps-mcp] ready (svf: ${config.svfBaseUrl})`);
}

main().catch((error: unknown) => {
  console.error('[tax-apps-mcp] 起動できませんでした:', error);
  process.exit(1);
});
