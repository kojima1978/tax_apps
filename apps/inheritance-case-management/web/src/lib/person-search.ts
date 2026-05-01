type SearchablePerson = {
  name?: string;
  nameKana?: string;
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

export function normalizeNameKanaForStorage(value: string): string {
  return hiraganaToKatakana(value.normalize("NFKC")).replace(/\s+/g, " ").trim();
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
    person.phone,
    person.postalCode,
    person.address,
    person.addressFromPostalCode,
    person.addressManual,
    person.memo,
  ]
    .some((value) => normalizePersonSearchText(value ?? "").includes(normalizedQuery));
}
