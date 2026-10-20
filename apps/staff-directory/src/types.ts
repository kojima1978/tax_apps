// サーバの応答の形（server/repo.ts と対）
export type Staff = {
  id: number;
  employeeNo: string | null;
  name: string;
  nameKana: string;
  departmentId: number | null;
  departmentName: string | null;
  mobilePhone: string;
  retiredOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffStatus = 'active' | 'retired' | 'all';

export type Department = {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
  staffCount: number;
};

export type Office = {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
  updatedAt: string;
};

export type StaffForm = {
  employeeNo: string;
  name: string;
  nameKana: string;
  departmentId: string;
  mobilePhone: string;
  retiredOn: string;
};
