export async function fetchAddressFromPostalCode(postalCode: string): Promise<string | null> {
  const cleaned = postalCode.replace(/[^\d]/g, "");
  if (cleaned.length !== 7) return null;

  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`);
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;

    return `${result.address1}${result.address2}${result.address3}`;
  } catch {
    return null;
  }
}

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

/** 全角英数 → 半角に正規化（住所マッチング用） */
function toHalfWidth(value: string): string {
  return value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
}

interface HeartRailsLocation {
  prefecture: string;
  city: string;
  town: string;
  postal: string;
}

async function fetchHeartRails(params: Record<string, string>): Promise<HeartRailsLocation[]> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`https://geoapi.heartrails.com/api/json?${query}`);
  const data = await res.json();
  return data.response?.location ?? [];
}

/**
 * 住所文字列から郵便番号(7桁)を推測する。
 * 都道府県 → 市区町村 → 町名 を段階的に最長一致でマッチし、該当町名の郵便番号を返す。
 * 判定不能・通信失敗時は null。
 */
export async function fetchPostalCodeFromAddress(address: string): Promise<string | null> {
  const normalized = toHalfWidth(address).replace(/\s+/g, "").trim();
  if (!normalized) return null;

  // 1. 都道府県を判定
  const prefecture = PREFECTURES.find(p => normalized.startsWith(p));
  if (!prefecture) return null;
  const afterPref = normalized.slice(prefecture.length);

  try {
    // 2. 市区町村を最長一致で特定
    const cities = await fetchHeartRails({ method: "getCities", prefecture });
    const city = cities
      .map(c => c.city)
      .filter(name => afterPref.startsWith(name))
      .sort((a, b) => b.length - a.length)[0];
    if (!city) return null;
    const afterCity = afterPref.slice(city.length);

    // 3. 町名を最長一致で特定し、郵便番号を返す
    const towns = await fetchHeartRails({ method: "getTowns", prefecture, city });
    const match = towns
      .filter(t => t.town && afterCity.startsWith(t.town))
      .sort((a, b) => b.town.length - a.town.length)[0];

    const postal = match?.postal?.replace(/[^\d]/g, "");
    return postal && postal.length === 7 ? postal : null;
  } catch {
    return null;
  }
}
