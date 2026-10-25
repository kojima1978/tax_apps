import type { CompanyInfo } from '@/shared/staff-directory/company';

/**
 * 帳票に載せる会社の電話番号の行（`TEL 088-…`）。電話番号が無ければ空文字。
 *
 * 共有の getContactLine は FAX まで並べるが、お客様へ渡す書類リストに FAX は要らないので、
 * このアプリでは画面の帯・印刷・Excel のどれもこちらを使う（3箇所で食い違わせないため）。
 */
export function getPhoneLine(company: CompanyInfo): string {
  return company.phone ? `TEL ${company.phone}` : '';
}
