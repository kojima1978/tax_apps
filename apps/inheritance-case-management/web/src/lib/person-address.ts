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

export function combinePersonAddress(addressFromPostalCode?: string | null, addressManual?: string | null): string {
  const fromPostalCode = normalizeAddressText(addressFromPostalCode);
  const manual = normalizeAddressText(addressManual);
  return `${fromPostalCode}${manual}`;
}

export function normalizePersonAddressParts(parts: PersonAddressParts): NormalizedPersonAddressParts {
  const addressFromPostalCode = normalizeAddressText(parts.addressFromPostalCode);
  const legacyAddress = normalizeAddressText(parts.address);
  let addressManual = normalizeAddressText(parts.addressManual);

  if (!addressManual && legacyAddress) {
    addressManual = addressFromPostalCode && legacyAddress.startsWith(addressFromPostalCode)
      ? legacyAddress.slice(addressFromPostalCode.length).trim()
      : legacyAddress;
  }

  return {
    addressFromPostalCode,
    addressManual,
    address: combinePersonAddress(addressFromPostalCode, addressManual),
  };
}

export function applyPostalCodeAddress(
  parts: PersonAddressParts,
  addressFromPostalCode: string,
): NormalizedPersonAddressParts {
  const normalized = normalizePersonAddressParts({
    ...parts,
    addressFromPostalCode,
  });
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
