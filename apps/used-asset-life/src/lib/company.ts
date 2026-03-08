export const COMPANY_INFO = {
    name: '税理士法人マスエージェント',
    postalCode: '〒770-0002',
    address: '徳島県徳島市春日２丁目３−３３',
    phone: '088-632-6228',
    fax: '088-631-9870',
} as const;

export function getFullAddress(): string {
    return `${COMPANY_INFO.postalCode} ${COMPANY_INFO.address}`;
}
