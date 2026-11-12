import { Router, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  parseCompanyInput,
  parseDepartmentInput,
  parseIdList,
  parseShortName,
  parseStaffInput,
  parseStaffPersonalInput,
  type Result,
} from './normalize.js';
import {
  ConflictError,
  createCompany,
  createDepartment,
  createStaff,
  deleteCompany,
  deleteDepartment,
  getStaff,
  getStaffPersonal,
  listCompanies,
  listDepartments,
  listLinks,
  listStaff,
  reorderCompanies,
  reorderDepartments,
  updateCompany,
  updateDepartment,
  updateStaff,
  updateStaffPersonal,
  updateStaffShortName,
  type StaffStatus,
} from './repo.js';
import { exportDirectory, parseBackup, restoreDirectory } from './backup.js';
import type { Notifier } from './notify.js';
import { alertLines, openIncidents, type LinkMonitor } from './linkHealth.js';

// 読み取り（GET）は他アプリからも呼ばれる。書き込みは台帳の画面だけが使う。
// 社員の DELETE は置かない ── 台帳IDは他アプリが控えとして持つので、消すと
// 参照先が無くなる。辞めた人は退職日を入れる。

const STATUSES: readonly StaffStatus[] = ['active', 'retired', 'all'];

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 入力検査の失敗は 400、一意制約などの衝突は 409、それ以外は express に任せる
function respond<T>(res: Response, parsed: Result<T>, run: (value: T) => unknown, status = 200): void {
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const out = run(parsed.value);
    if (out === null) {
      res.status(404).json({ error: '見つかりません' });
      return;
    }
    res.status(status).json(out);
  } catch (err) {
    if (err instanceof ConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
}

// 保存しても写しを持つアプリへ知らせない書き込み。preview は巻き戻すので台帳は変わらない。
// 住所・生年月日は写しに入らない（他アプリは1人ずつ /staff/:id/personal を読む）
const SILENT_WRITES = [/^\/backup\/preview$/, /^\/staff\/[^/]+\/personal$/];

export function createApiRouter(
  db: Database.Database,
  options: { notifier?: Notifier; linkMonitor?: LinkMonitor } = {},
): Router {
  const r = Router();
  const { notifier, linkMonitor } = options;

  // 書き込みが成功したら（応答を返したあとで）写しを持つアプリへ知らせる。保存の応答は待たせない
  if (notifier) {
    r.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD' && !SILENT_WRITES.some((re) => re.test(req.path))) {
        res.on('finish', () => {
          if (res.statusCode < 300) notifier.notify();
        });
      }
      next();
    });
  }

  // 保存のたびの知らせの状況（連携の画面が読む）。知らせを使わない構成では enabled: false
  r.get('/notify', (_req, res) => {
    res.set('Cache-Control', 'no-store').json(
      notifier?.status() ?? { enabled: false, targets: [], pending: false, lastChangeAt: null, results: [] },
    );
  });

  // 連携の状態（写し・担当件数の口ごとの正常／失敗といつからか、失敗の記録）。画面の注記と連携の画面が読む
  r.get('/link-health', (_req, res) => {
    res.set('Cache-Control', 'no-store').json(
      linkMonitor?.status() ?? { checkedAt: null, intervalMs: 0, checks: [], incidents: [] },
    );
  });

  // デスクトップの警告に載せる行（manage.sh link-check が読む）。その場で読み直してから、
  // minutes 分以上続いている失敗だけを1件1行の text/plain で返す（無ければ空）
  r.get('/link-health/alerts', async (req, res) => {
    const minutes = Number(req.query.minutes ?? 30);
    if (!Number.isFinite(minutes) || minutes < 0) {
      res.status(400).json({ error: 'minutes は0以上の数で指定してください' });
      return;
    }
    if (linkMonitor) await linkMonitor.checkAll();
    const lines = alertLines(openIncidents(db), minutes, Date.now());
    res.set('Cache-Control', 'no-store').type('text/plain').send(lines.map((l) => `${l}
`).join(''));
  });

  r.get('/staff', (req, res) => {
    const status = (req.query.status ?? 'active') as StaffStatus;
    if (!STATUSES.includes(status)) {
      res.status(400).json({ error: 'status は active / retired / all のいずれかです' });
      return;
    }
    res.json(listStaff(db, status));
  });

  r.get('/staff/:id', (req, res) => {
    const id = parseId(req.params.id);
    const staff = id === null ? null : getStaff(db, id);
    if (!staff) {
      res.status(404).json({ error: '見つかりません' });
      return;
    }
    res.json(staff);
  });

  r.post('/staff', (req, res) => {
    respond(res, parseStaffInput(req.body), (input) => createStaff(db, input), 201);
  });

  r.put('/staff/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(404).json({ error: '見つかりません' });
      return;
    }
    respond(res, parseStaffInput(req.body), (input) => updateStaff(db, id, input));
  });

  r.put('/staff/:id/short-name', (req, res) => {
    const id = parseId(req.params.id);
    respond(res, parseShortName(req.body?.shortName), (value) => (id === null ? null : updateStaffShortName(db, id, value)));
  });

  // 住所・生年月日。/staff と /staff/:id には混ぜない（一覧や写しの同期で全員分が流れるため）。
  // 読むのは台帳の編集画面で「表示」を押したときと、他アプリが1人分を必要としたとき
  r.get('/staff/:id/personal', (req, res) => {
    const id = parseId(req.params.id);
    respond(res, { ok: true, value: id }, (value) => (value === null ? null : getStaffPersonal(db, value)));
  });

  r.put('/staff/:id/personal', (req, res) => {
    const id = parseId(req.params.id);
    respond(res, parseStaffPersonalInput(req.body), (input) => (id === null ? null : updateStaffPersonal(db, id, input)));
  });

  r.get('/departments', (_req, res) => {
    res.json(listDepartments(db));
  });

  r.post('/departments', (req, res) => {
    const parsed = parseDepartmentInput(req.body);
    respond(
      res,
      parsed.ok && parsed.value.companyId === null ? { ok: false, error: '会社を選んでください' } : parsed,
      (input) => ({ id: createDepartment(db, { ...input, companyId: input.companyId! }) }),
      201,
    );
  });

  // 会社ごとの並び替え。:id の口より先に置く（'order' を id として読ませない）
  r.put('/departments/order', (req, res) => {
    const companyId = parseId(String(req.body?.companyId ?? ''));
    const ids = parseIdList(req.body?.ids);
    respond(res, companyId === null ? { ok: false, error: '会社を選んでください' } : ids, (value) => {
      reorderDepartments(db, companyId!, value);
      return { ok: true };
    });
  });

  r.put('/departments/:id', (req, res) => {
    const id = parseId(req.params.id);
    respond(res, parseDepartmentInput(req.body), (input) =>
      id !== null && updateDepartment(db, id, input) ? { id } : null,
    );
  });

  r.delete('/departments/:id', (req, res) => {
    const id = parseId(req.params.id);
    respond(res, { ok: true, value: id }, (value) =>
      value !== null && deleteDepartment(db, value) ? { id: value } : null,
    );
  });

  r.get('/companies', (_req, res) => {
    res.json(listCompanies(db));
  });

  r.post('/companies', (req, res) => {
    respond(res, parseCompanyInput(req.body), (input) => ({ id: createCompany(db, input) }), 201);
  });

  r.put('/companies/order', (req, res) => {
    respond(res, parseIdList(req.body?.ids), (ids) => {
      reorderCompanies(db, ids);
      return { ok: true };
    });
  });

  r.put('/companies/:id', (req, res) => {
    const id = parseId(req.params.id);
    respond(res, parseCompanyInput(req.body), (input) => (id !== null && updateCompany(db, id, input) ? { id } : null));
  });

  r.delete('/companies/:id', (req, res) => {
    const id = parseId(req.params.id);
    respond(res, { ok: true, value: id }, (value) => (value !== null && deleteCompany(db, value) ? { id: value } : null));
  });

  // 台帳まるごとの JSON 控え（住所・生年月日を含む）。読むのは台帳の画面の「JSONで書き出し」だけ
  r.get('/backup', (_req, res) => {
    res.set('Cache-Control', 'no-store').json(exportDirectory(db));
  });

  // 復元。preview は最後まで流してから巻き戻し、件数だけ返す（確認画面用）
  for (const [path, dryRun] of [['/backup/preview', true], ['/backup/restore', false]] as const) {
    r.post(path, (req, res) => {
      const parsed = parseBackup(req.body);
      const result = parsed.ok ? restoreDirectory(db, parsed.value, dryRun) : parsed;
      respond(res, result, (value) => value);
    });
  }

  r.get('/links', (req, res) => {
    const app = req.query.app;
    if (typeof app !== 'string' || app === '') {
      res.status(400).json({ error: 'app を指定してください' });
      return;
    }
    res.json(listLinks(db, app));
  });

  return r;
}
