export interface Customer {
    id: number;
    customer_name: string;
    customer_code?: string | null;
    staff_name: string; // JOINで取得（customersテーブルには存在しない）
    staff_id: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface Staff {
    id: number;
    staff_name: string;
    staff_code?: string | null;
    mobile_number?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface DocumentRecord {
    id: number;
    customer_id: number;
    year: number;
    document_groups: string;
    created_at?: string;
    updated_at?: string;
}

export interface CustomerWithYears extends Customer {
    years: number[];
    latest_updated_at: string | null;
}

export interface DocumentRecordWithCustomer {
    id: number;
    customer_name: string;
    staff_name: string;
    year: number;
    updated_at: string;
    customer_id: number;
    staff_id: number | null;
}

