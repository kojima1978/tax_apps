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

// 退職日。空なら在籍。実在しない日付（2026-02-30 など）は Date が黙って
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

export type StaffInput = {
  employeeNo: string | null;
  name: string;
  nameKana: string;
  departmentId: number | null;
  mobilePhone: string;
  retiredOn: string | null;
};

export function parseStaffInput(body: unknown): Result<StaffInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = text(b.name).replace(/\s+/g, ' ');
  if (name === '') return fail('氏名を入力してください');

  const employeeNo = text(b.employeeNo).normalize('NFKC');
  const kana = normalizeKana(b.nameKana);
  if (!kana.ok) return kana;
  const phone = normalizePhone(b.mobilePhone, '携帯電話');
  if (!phone.ok) return phone;
  const retiredOn = normalizeDate(b.retiredOn, '退職日');
  if (!retiredOn.ok) return retiredOn;

  let departmentId: number | null = null;
  if (b.departmentId !== null && b.departmentId !== undefined && b.departmentId !== '') {
    const n = Number(b.departmentId);
    if (!Number.isInteger(n) || n <= 0) return fail('部署の指定が正しくありません');
    departmentId = n;
  }

  return ok({
    employeeNo: employeeNo === '' ? null : employeeNo,
    name,
    nameKana: kana.value,
    departmentId,
    mobilePhone: phone.value,
    retiredOn: retiredOn.value,
  });
}

export type DepartmentInput = { name: string; sortOrder: number; active: boolean };

export function parseDepartmentInput(body: unknown): Result<DepartmentInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = text(b.name);
  if (name === '') return fail('部署名を入力してください');
  const sortOrder = b.sortOrder === undefined || b.sortOrder === '' ? 0 : Number(b.sortOrder);
  if (!Number.isInteger(sortOrder)) return fail('表示順は整数で入力してください');
  return ok({ name, sortOrder, active: b.active === undefined ? true : Boolean(b.active) });
}

export type OfficeInput = {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
};

export function parseOfficeInput(body: unknown): Result<OfficeInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const phone = normalizePhone(b.phone, '代表電話');
  if (!phone.ok) return phone;
  const fax = normalizePhone(b.fax, 'FAX');
  if (!fax.ok) return fax;
  // 〒 は表示側で付ける。保存は「770-0002」の形
  const postal = text(b.postalCode).normalize('NFKC').replace(/^〒\s*/, '').replace(/[ー－―‐]/g, '-');
  if (!/^(\d{3}-?\d{4})?$/.test(postal)) return fail('郵便番号は 123-4567 の形で入力してください');
  const postalCode = /^\d{7}$/.test(postal) ? `${postal.slice(0, 3)}-${postal.slice(3)}` : postal;
  return ok({
    name: text(b.name),
    postalCode,
    address: text(b.address),
    phone: phone.value,
    fax: fax.value,
  });
}
