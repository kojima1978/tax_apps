import type { AcquisitionGuideId } from './acquisitionGuides';

export type AcquisitionGuideImageDefault = {
  filename: string;
  originalName: string;
  mimeType: 'image/gif' | 'image/jpeg' | 'image/png';
};

/**
 * Gitに含める取得案内の標準画像。
 * 戸籍謄本は、亡くなった方用と財産を引き継ぐ方用で同じ見本を使う。
 */
export const ACQUISITION_GUIDE_IMAGE_DEFAULTS = {
  'family-register': {
    filename: 'family-register.gif',
    originalName: '戸籍謄本サンプル.gif',
    mimeType: 'image/gif',
  },
  'heir-family-register': {
    filename: 'family-register.gif',
    originalName: '戸籍謄本サンプル.gif',
    mimeType: 'image/gif',
  },
  'family-register-address-history': {
    filename: 'family-register-address-history.png',
    originalName: '戸籍の附票サンプル.png',
    mimeType: 'image/png',
  },
  'seal-certificate': {
    filename: 'seal-certificate.png',
    originalName: '印鑑登録証明書サンプル.png',
    mimeType: 'image/png',
  },
  'resident-record': {
    filename: 'resident-record.jpg',
    originalName: '住民票サンプル.jpg',
    mimeType: 'image/jpeg',
  },
  'bank-balance': {
    filename: 'bank-balance.png',
    originalName: '銀行残高証明書サンプル.png',
    mimeType: 'image/png',
  },
  'legal-heir-information': {
    filename: 'legal-heir-information.png',
    originalName: '法定相続情報一覧図サンプル.png',
    mimeType: 'image/png',
  },
} satisfies Partial<Record<AcquisitionGuideId, AcquisitionGuideImageDefault>>;

export const DEFAULT_ACQUISITION_GUIDE_IMAGE_IDS = new Set<AcquisitionGuideId>(
  Object.keys(ACQUISITION_GUIDE_IMAGE_DEFAULTS) as AcquisitionGuideId[],
);
