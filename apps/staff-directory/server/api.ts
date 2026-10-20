import { Router, type Response } from 'express';
import type Database from 'better-sqlite3';
import { parseDepartmentInput, parseOfficeInput, parseStaffInput, type Result } from './normalize.js';
import {
  ConflictError,
  createDepartment,
  createStaff,
  deleteDepartment,
  getOffice,
  getStaff,
  listDepartments,
  listStaff,
  updateDepartment,
  updateOffice,
  updateStaff,
  type StaffStatus,
} from './repo.js';

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

export function createApiRouter(db: Database.Database): Router {
  const r = Router();

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

  r.get('/departments', (_req, res) => {
    res.json(listDepartments(db));
  });

  r.post('/departments', (req, res) => {
    respond(res, parseDepartmentInput(req.body), (input) => ({ id: createDepartment(db, input) }), 201);
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

  r.get('/office', (_req, res) => {
    res.json(getOffice(db));
  });

  r.put('/office', (req, res) => {
    respond(res, parseOfficeInput(req.body), (input) => updateOffice(db, input));
  });

  return r;
}
