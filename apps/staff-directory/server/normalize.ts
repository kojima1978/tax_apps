// 画面と取込の両方が通る入力の整形と検査。
// 結果は { ok: true, value } か { ok: false, error }（error は画面にそのまま出す日本語）。

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T = never>(error: string): Result<T> => ({ ok: false, error });

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

// フリガナはカタカナに揃えて保存する。並び順を SQLite の文字コード順に任せるため
// （ひらがなとカタカナが混ざると、同じ読みでも別の塊に分かれて並ぶ）。
// 半角カナ・全角英数は NFKC で寄せる。
export function normalizeKana(v: unknown): Result<string> {
  const s = text(v)
    .normalize('NFKC')
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/\s+/g, ' ');
  if (!/^[ァ-ヺー ]*$/.test(s)) {
    return fail('フリガナはカタカナ（またはひらがな）で入力してください');
  }
  return ok(s);
}

// 電話番号は数字・ハイフン・括弧だけ。桁数や市外局番の形までは見ない
// （内線や海外の携帯もありうるので、弾く理由のほうが少ない）。
export function normalizePhone(v: unknown, label: string): Result<string> {
  const s = text(v).normalize('NFKC').replace(/[ー－―‐]/g, '-').replace(/\s+/g, '');
  if (!/^[0-9()+-]*$/.test(s)) return fail(`${label}は数字とハイフンで入力してください`);
  return ok(s);
}

// 退職日・生年月日。空は未入力（退職日なら在籍）。実在しない日付（2026-02-30 など）は Date が黙って
// 翌月へ繰り越すので、組み立て直して一致するかで弾く。
export function normalizeDate(v: unknown, label: string): Result<string | null> {
  const s = text(v);
  if (s === '') return ok(null);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return fail(`${label}の形式が正しくありません（例: 2026-10-21）`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return fail(`${label}が存在しない日付です`);
  }
  return ok(s);
}

export type AffiliationInput = {
  companyId: number;
  departmentId: number | null;
  employeeNo: string | null;
  isPrimary: boolean;
};

export type StaffInput = {
  familyName: string;
  givenName: string;
  familyKana: string;
  givenKana: string;
  mobilePhone: string;
  retiredOn: string | null;
  affiliations: AffiliationInput[];
};

function optionalId(v: unknown, error: string): Result<number | null> {
  if (v === null || v === undefined || v === '') return ok(null);
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? ok(n) : fail(error);
}

// 所属。同じ会社は1行だけ。主所属はちょうど1つ（どれにも付いていなければ先頭を主所属にする）
function parseAffiliations(v: unknown): Result<AffiliationInput[]> {
  if (v === undefined || v === null) return ok([]);
  if (!Array.isArray(v)) return fail('所属の指定が正しくありません');
  const out: AffiliationInput[] = [];
  for (const raw of v as Record<string, unknown>[]) {
    const companyId = optionalId(raw?.companyId, '会社の指定が正しくありません');
    if (!companyId.ok) return companyId;
    if (companyId.value === null) return fail('所属の会社を選んでください');
    if (out.some((a) => a.companyId === companyId.value)) return fail('同じ会社の所属が2つあります');
    const departmentId = optionalId(raw.departmentId, '部署の指定が正しくありません');
    if (!departmentId.ok) return departmentId;
    const employeeNo = text(raw.employeeNo).normalize('NFKC');
    out.push({
      companyId: companyId.value,
      departmentId: departmentId.value,
      employeeNo: employeeNo === '' ? null : employeeNo,
      isPrimary: raw.isPrimary === true,
    });
  }
  const primaries = out.filter((a) => a.isPrimary).length;
  if (primaries > 1) return fail('主所属は1つだけ選んでください');
  if (primaries === 0 && out.length > 0) out[0].isPrimary = true;
  return ok(out);
}

// 姓・名の中の空白は詰める（「山田 太郎」を姓の欄に入れると、表示で空白が二重になるため）
const namePart = (v: unknown) => text(v).normalize('NFKC').replace(/\s+/g, '');

export function parseStaffInput(body: unknown): Result<StaffInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const familyName = namePart(b.familyName);
  if (familyName === '') return fail('姓を入力してください');

  const familyKana = normalizeKana(b.familyKana);
  if (!familyKana.ok) return familyKana;
  const givenKana = normalizeKana(b.givenKana);
  if (!givenKana.ok) return givenKana;
  const phone = normalizePhone(b.mobilePhone, '携帯電話');
  if (!phone.ok) return phone;
  const retiredOn = normalizeDate(b.retiredOn, '退職日');
  if (!retiredOn.ok) return retiredOn;
  const affiliations = parseAffiliations(b.affiliations);
  if (!affiliations.ok) return affiliations;

  return ok({
    familyName,
    givenName: namePart(b.givenName),
    familyKana: familyKana.value.replace(/ /g, ''),
    givenKana: givenKana.value.replace(/ /g, ''),
    mobilePhone: phone.value,
    retiredOn: retiredOn.value,
    affiliations: affiliations.value,
  });
}

function parseSortOrder(v: unknown): Result<number> {
  const n = v === undefined || v === '' ? 0 : Number(v);
  return Number.isInteger(n) ? ok(n) : fail('表示順は整数で入力してください');
}

// companyId は作るときだけ使う（部署の会社は後から変えない ── 所属している人の会社と食い違うため）
export type DepartmentInput = { companyId: number | null; name: string; sortOrder: number; active: boolean };

export function parseDepartmentInput(body: unknown): Result<DepartmentInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = text(b.name);
  if (name === '') return fail('部署名を入力してください');
  const sortOrder = parseSortOrder(b.sortOrder);
  if (!sortOrder.ok) return sortOrder;
  const companyId = optionalId(b.companyId, '会社の指定が正しくありません');
  if (!companyId.ok) return companyId;
  return ok({
    companyId: companyId.value,
    name,
    sortOrder: sortOrder.value,
    active: b.active === undefined ? true : Boolean(b.active),
  });
}

// 〒 は表示側で付ける。保存は「770-0002」の形
function normalizePostalCode(v: unknown): Result<string> {
  const postal = text(v).normalize('NFKC').replace(/^〒\s*/, '').replace(/[ー－―‐]/g, '-');
  if (!/^(\d{3}-?\d{4})?$/.test(postal)) return fail('郵便番号は 123-4567 の形で入力してください');
  return ok(/^\d{7}$/.test(postal) ? `${postal.slice(0, 3)}-${postal.slice(3)}` : postal);
}

export type CompanyInput = {
  name: string;
  shortName: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
  sortOrder: number;
};

export function parseCompanyInput(body: unknown): Result<CompanyInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = text(b.name);
  if (name === '') return fail('会社名を入力してください');
  const sortOrder = parseSortOrder(b.sortOrder);
  if (!sortOrder.ok) return sortOrder;
  const phone = normalizePhone(b.phone, '代表電話');
  if (!phone.ok) return phone;
  const fax = normalizePhone(b.fax, 'FAX');
  if (!fax.ok) return fax;
  const postalCode = normalizePostalCode(b.postalCode);
  if (!postalCode.ok) return postalCode;
  return ok({
    name,
    shortName: text(b.shortName),
    postalCode: postalCode.value,
    address: text(b.address),
    phone: phone.value,
    fax: fax.value,
    sortOrder: sortOrder.value,
  });
}

// 社員の個人情報（住所・生年月日）。氏名などとは別の口で読み書きする（repo.ts の StaffPersonal）
export type StaffPersonalInput = {
  postalCode: string;
  address: string;
  birthDate: string | null;
};

export function parseStaffPersonalInput(body: unknown): Result<StaffPersonalInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const postalCode = normalizePostalCode(b.postalCode);
  if (!postalCode.ok) return postalCode;
  const birthDate = normalizeDate(b.birthDate, '生年月日');
  if (!birthDate.ok) return birthDate;
  return ok({ postalCode: postalCode.value, address: text(b.address), birthDate: birthDate.value });
}
