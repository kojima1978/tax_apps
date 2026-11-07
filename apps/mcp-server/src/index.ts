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

/**
 * 読んだ資料。付けた欄は画面に印が付き、「取込の確認」に出る（印刷には出ない）。
 * PDF から読み取って入れるときは必ず付けること ── 付けないと、あとから人が
 * 「どの数字を誰がどこから入れたのか」を追えない。
 */
const source = z
  .object({
    source: z.string().describe('読んだ資料のファイル名（「決算書.pdf」など）'),
    page: z.number().int().positive().optional().describe('その資料の何ページか'),
    note: z
      .string()
      .optional()
      .describe('読み取りのメモ（「別表四の所得金額」「中間配当と区別できず」など）'),
    uncertain: z
      .boolean()
      .optional()
      .describe('資料から読み切れず自信がないとき true。画面で赤く出て、確認の一覧の先頭に並ぶ'),
  })
  .optional()
  .describe('読んだ資料。人の指示で直すだけのときは省く（出典が無い欄は確認の一覧に出ない）');

/** 明細行の1マス。入っていないキーは「その列は空」の意味になる。 */
const rowCell = z
  .union([z.string(), z.number(), z.null()])
  .describe('金額は千円単位の整数。小数・円単位は受け付けない');

server.registerTool(
  'describe_fields',
  {
    title: '書き込める欄の一覧',
    description:
      '株式評価明細書のうち、外から書き込める欄の辞書を返す。書き込む前に必ずこれを読むこと。'
      + 'コードは「様式の略号:様式に印字されている識別記号」（4-1:G01 / 1-2:G09）。'
      + '識別記号は様式ごとに振り直されているので、略号まで含めて指定する。'
      + '単位・整数かどうか・負数の書き方・明細行の表（列の名前と選択肢）もここに入っている。'
      + '自動計算欄と他表からの転記欄は載っていない（書いても再計算で消えるため）。'
      + '従業員数・第5表の相続税評価額・続柄や役職も載っていない（人が画面で入れる）。',
    inputSchema: {
      form: z
        .string()
        .optional()
        .describe('様式で絞る（例: 第1表の1、第1表の2、第4表の1、第5表）。省略時は全部'),
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
  'create_case',
  {
    title: '案件を作る',
    description:
      '評価案件（会社1社・1つの課税時期ぶん）を新しく作る。'
      + '同じ会社名・同じ課税時期の案件が既にあれば作らず、その caseId を返す。'
      + '既定は試算で、確定するには commit: true。'
      + '会社名は決算書の表紙どおりに、課税時期は相続開始の日（被相続人の死亡の日）を'
      + '和暦で指定すること。どちらも一覧に出る見出しになるので、推測で入れないこと。',
    inputSchema: {
      companyName: z.string().describe('会社名（決算書の表紙どおり。「有限会社」などの種類も含める）'),
      taxPeriod: z
        .string()
        .describe('課税時期。和暦で「令和8年3月31日」の形。月日が分からなければ「令和8年」まででも可'),
      fiscalYearFrom: z.string().optional().describe('直前期（自）。和暦で「令和7年4月1日」の形'),
      fiscalYearTo: z.string().optional().describe('直前期（至）。和暦で「令和8年3月31日」の形'),
      source,
      commit,
    },
  },
  async (args) => run(() => tools.createCase(api, args)),
);

server.registerTool(
  'get_case',
  {
    title: '案件の現在値',
    description:
      '1件の案件について、辞書に載っている欄の現在値と明細行の表（第5表の資産・負債、'
      + '第1表の1 の株主）を返す。書き込む前にこれで既存の入力を確かめること。'
      + 'intake には「外から入れたまま人がまだ確認していない欄」とその出典が、'
      + 'manualItems には「資料からは決まらないので人が画面で入れるもの」が入っている。',
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
      + '勝手に決めず人に確認すること。'
      + '資料から読み取った値には source（ファイル名・ページ）を付けること。'
      + '付けた欄は画面に印が付き、人が確認する一覧に出る（印刷には出ない）。',
    inputSchema: {
      caseId,
      values: z
        .array(
          z.object({
            code: z.string().describe('欄のコード（describe_fields が返す fields[].code。例 4-1:G04）'),
            value: cellValue,
          }),
        )
        .min(1)
        .describe('書き込む欄。1つでも通らなければ何も書き込まない'),
      source,
      commit,
    },
  },
  async (args) => run(() => tools.setFields(api, args)),
);

server.registerTool(
  'import_rows',
  {
    title: '明細行の表を入れ替える',
    description:
      '決算書・申告書から読み取った明細を、辞書の明細行の表へ入れる'
      + '（balanceSheet = 第5表の資産・負債、shareholders = 第1表の1 の株主）。'
      + '指定した側は1行目から詰め直すので、その側の既存の行はすべて消える。'
      + '指定しなかった側はそのまま。続紙の枚数は入れた行に足りるよう自動で増やす。'
      + '既定は試算で、確定するには commit: true。'
      + '科目をまとめたり、相続税評価額を帳簿価額から埋めたり、備考（株式等・土地等）を'
      + '推測したりはしない ── どれも評価の判断そのものなので人が決めること。'
      + '株主の表は1行目が納税義務者なので、並び順は人に確かめてから渡すこと。'
      + '資料から読み取った行には source（ファイル名・ページ）を付けること'
      + '（控えは行の先頭列に1つ付く）。',
    inputSchema: {
      caseId,
      rowTable: z.string().describe('describe_fields の rowTables[].id（balanceSheet / shareholders）'),
      sides: z
        .array(
          z.object({
            side: z
              .string()
              .describe('その表の sides[].key（第5表は asset / liability、株主は shareholder）'),
            rows: z
              .array(z.record(z.string(), rowCell))
              .describe(
                '上から順に入る。空行は挟まないこと。キーは辞書の columns[].name'
                + '（第5表は name / evaluated / book / note、株主は name / shares / undivided / votes）。'
                + '資料から決まらない列は入れずに省く',
              ),
          }),
        )
        .min(1),
      source,
      commit,
    },
  },
  async (args) => run(() => tools.importRows(api, args)),
);

async function main() {
  await server.connect(new StdioServerTransport());
  console.error(`[tax-apps-mcp] ready (svf: ${config.svfBaseUrl})`);
}

main().catch((error: unknown) => {
  console.error('[tax-apps-mcp] 起動できませんでした:', error);
  process.exit(1);
});
