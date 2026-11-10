// 住所は「郵便番号から自動入力した住所」と「住所補足（手入力）」の2欄で持ち、
// 結合済みの `address` は表示・保存のときに作る派生値。
//
// 入力中の値は加工しない。trim は保存・表示のときだけ、
// 旧データ（`address` だけある人）からの移行は読み込み・フォームを開くときだけ行う
// （キー入力のたびに移行をかけると、1つ前に作った `address` が「旧データ」と見なされて
// 住所補足へ流れ込み、住所補足を空にできない・空白を打てない、という症状になる）。

export interface PersonAddressParts {
  address?: string | null;
  addressFromPostalCode?: string | null;
  addressManual?: string | null;
}

export interface NormalizedPersonAddressParts {
  address: string;
  addressFromPostalCode: string;
  addressManual: string;
}

export function normalizeAddressText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** 2欄を結合する。入力中にも通るので trim しない（保存時は normalizePersonAddressParts を使う）。 */
export function combinePersonAddress(addressFromPostalCode?: string | null, addressManual?: string | null): string {
  return `${asText(addressFromPostalCode)}${asText(addressManual)}`;
}

/** 入力中の2欄から結合済みの住所だけを作り直す。値はそのまま持つ。 */
export function withCombinedPersonAddress<T extends PersonAddressParts>(
  parts: T,
  next: Partial<Pick<NormalizedPersonAddressParts, "addressFromPostalCode" | "addressManual">>,
): T & { address: string } {
  const addressFromPostalCode = next.addressFromPostalCode ?? asText(parts.addressFromPostalCode);
  const addressManual = next.addressManual ?? asText(parts.addressManual);

  return {
    ...parts,
    addressFromPostalCode,
    addressManual,
    address: combinePersonAddress(addressFromPostalCode, addressManual),
  };
}

/** 保存・表示用。2欄を trim して結合する。旧データの `address` は見ない。 */
export function normalizePersonAddressParts(parts: PersonAddressParts): NormalizedPersonAddressParts {
  const addressFromPostalCode = normalizeAddressText(parts.addressFromPostalCode);
  const addressManual = normalizeAddressText(parts.addressManual);

  return {
    addressFromPostalCode,
    addressManual,
    address: combinePersonAddress(addressFromPostalCode, addressManual),
  };
}

/**
 * 旧データの受け口。2欄が空で結合済みの `address` だけある人を、住所補足へ寄せる。
 * 読み込み・フォームを開くとき・取込・バックアップのときに1回だけ通す
 * （2欄が揃っている今のデータでは何も変わらない）。
 */
export function migrateLegacyPersonAddress(parts: PersonAddressParts): NormalizedPersonAddressParts {
  const normalized = normalizePersonAddressParts(parts);
  const legacyAddress = normalizeAddressText(parts.address);
  if (normalized.addressManual || !legacyAddress) return normalized;

  const { addressFromPostalCode } = normalized;
  const addressManual = addressFromPostalCode && legacyAddress.startsWith(addressFromPostalCode)
    ? legacyAddress.slice(addressFromPostalCode.length).trim()
    : legacyAddress;

  return {
    addressFromPostalCode,
    addressManual,
    address: combinePersonAddress(addressFromPostalCode, addressManual),
  };
}

/**
 * 郵便番号から住所を引いたとき。住所補足の先頭に同じ住所が入っていれば外す
 * （郵便番号検索を押したときだけ通るので、ここでは trim してよい）。
 */
export function applyPostalCodeAddress(
  parts: PersonAddressParts,
  addressFromPostalCode: string,
): NormalizedPersonAddressParts {
  const normalized = normalizePersonAddressParts({ ...parts, addressFromPostalCode });
  let addressManual = normalized.addressManual;

  if (normalized.addressFromPostalCode && addressManual.startsWith(normalized.addressFromPostalCode)) {
    addressManual = addressManual.slice(normalized.addressFromPostalCode.length).trim();
  }

  return {
    addressFromPostalCode: normalized.addressFromPostalCode,
    addressManual,
    address: combinePersonAddress(normalized.addressFromPostalCode, addressManual),
  };
}
