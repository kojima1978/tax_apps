// サーバの応答の形（server/repo.ts と対）
export type Affiliation = {
  companyId: number;
  companyName: string;
  departmentId: number | null;
  departmentName: string | null;
  employeeNo: string | null;
  isPrimary: boolean;
};

export type Staff = {
  id: number;
  familyName: string;
  givenName: string;
  familyKana: string;
  givenKana: string;
  // 「姓 名」
  fullName: string;
  // 狭い欄はこちら。手で決めた略称があればそれ、無ければ autoShortName
  shortName: string;
  // 手で決めた略称（空なら自動）
  customShortName: string;
  // 姓だけ（在籍者に同姓がいれば名の頭を足す）
  autoShortName: string;
  nameKana: string;
  // 主所属が先頭
  affiliations: Affiliation[];
  // 以下は主所属の写し
  employeeNo: string | null;
  companyId: number | null;
  companyName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  mobilePhone: string;
  retiredOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffStatus = 'active' | 'retired' | 'all';

export type Company = {
  id: number;
  name: string;
  shortName: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
  sortOrder: number;
  departmentCount: number;
  staffCount: number;
  updatedAt: string;
};

export type CompanyForm = Omit<Company, 'id' | 'departmentCount' | 'staffCount' | 'updatedAt'>;

export type Department = {
  id: number;
  companyId: number;
  companyName: string;
  name: string;
  sortOrder: number;
  active: boolean;
  staffCount: number;
};

export type DepartmentForm = { companyId: number; name: string; sortOrder: number; active: boolean };

// 入力中の所属1行（select の値は文字列のまま持つ）
export type AffiliationForm = {
  companyId: string;
  departmentId: string;
  employeeNo: string;
  isPrimary: boolean;
};

export type StaffForm = {
  familyName: string;
  givenName: string;
  familyKana: string;
  givenKana: string;
  mobilePhone: string;
  retiredOn: string;
  affiliations: AffiliationForm[];
};

// 住所・生年月日。一覧（Staff）には入らず、/staff/:id/personal でだけ読み書きする
export type StaffPersonal = {
  postalCode: string;
  address: string;
  birthDate: string | null;
};

export type StaffPersonalForm = { postalCode: string; address: string; birthDate: string };

// JSON 控えの件数（server/backup.ts の DirectorySummary）
export type DirectorySummary = {
  companies: number;
  departments: number;
  staff: number;
  activeStaff: number;
  withPersonal: number;
  externalLinks: number;
};

export type RestoreResult = { exportedAt: string; current: DirectorySummary; restored: DirectorySummary };
