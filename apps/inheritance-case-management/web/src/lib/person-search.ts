import { normalizePersonNameSpacing } from "@/shared/person-name/personName";

type SearchablePerson = {
  name?: string;
  nameKana?: string;
  profession?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressFromPostalCode?: string;
  addressManual?: string;
  memo?: string;
};

function hiraganaToKatakana(value: string): string {
  return value.replace(/[\u3041-\u3096]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

/**
 * 氏名を保存する形へ。姓と名の間は全角スペース1つ（規則は shared/person-name に1つだけ置く）。
 * 姓と名は分けて持たない ── 様式の氏名は1マスで、関係者の欄には法人名も入るため。
 */
export function normalizePersonNameForStorage(value: string): string {
  return normalizePersonNameSpacing(value);
}

export function normalizeNameKanaForStorage(value: string): string {
  return normalizePersonNameSpacing(hiraganaToKatakana(value.normalize("NFKC")));
}

export function normalizePersonSearchText(value: string): string {
  return normalizeNameKanaForStorage(value)
    .toLowerCase()
    .replace(/[\s\u3000\-ーｰ・･()（）]/g, "");
}

export function personMatchesSearch(person: SearchablePerson, query: string): boolean {
  const normalizedQuery = normalizePersonSearchText(query);
  if (!normalizedQuery) return true;

  return [
    person.name,
    person.nameKana,
    person.profession,
    person.phone,
    person.postalCode,
    person.address,
    person.addressFromPostalCode,
    person.addressManual,
    person.memo,
  ]
    .some((value) => normalizePersonSearchText(value ?? "").includes(normalizedQuery));
}
