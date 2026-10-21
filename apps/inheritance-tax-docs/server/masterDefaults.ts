import { CATEGORIES } from '../src/constants/documents.js';
import { SIMPLIFIED_CATEGORIES } from '../src/constants/simplifiedDocuments.js';
import { UNLISTED_STOCK_CATEGORIES } from '../src/constants/unlistedStockDocuments.js';
import { GIFT_TAX_CATEGORIES, INCOME_TAX_CATEGORIES } from '../src/constants/incomeGiftDocuments.js';

export type MasterDocument = {
  id: string;
  name: string;
  description: string;
  howToGet: string;
  canDelegate: boolean;
  companyIds?: number[];
};

export type MasterCategory = {
  id: string;
  name: string;
  documents: MasterDocument[];
  isActive?: boolean;
};

export type MasterSeed = {
  code: string;
  label: string;
  categories: MasterCategory[];
};

const normalize = (categories: typeof CATEGORIES): MasterCategory[] =>
  categories.map((category) => ({
    id: category.id,
    name: category.name,
    documents: category.documents.map((document) => ({
      id: document.id,
      name: document.name,
      description: document.description,
      howToGet: document.howToGet,
      canDelegate: document.canDelegate ?? false,
    })),
  }));

export const MASTER_SEEDS: MasterSeed[] = [
  { code: 'income-tax', label: '所得税申告', categories: normalize(INCOME_TAX_CATEGORIES) },
  { code: 'gift-tax', label: '贈与税申告', categories: normalize(GIFT_TAX_CATEGORIES) },
  { code: 'inheritance-tax', label: '相続税申告', categories: normalize(CATEGORIES) },
  { code: 'simplified', label: '相続シミュレーション', categories: normalize(SIMPLIFIED_CATEGORIES) },
  { code: 'unlisted-stock', label: '非上場株式評価', categories: normalize(UNLISTED_STOCK_CATEGORIES) },
];
