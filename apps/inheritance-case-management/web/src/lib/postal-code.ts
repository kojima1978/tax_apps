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
