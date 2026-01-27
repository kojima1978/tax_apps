export interface Customer {
    id: number;
    customer_name: string;
    staff_name: string; // Deprecated, kept for backward compatibility during migration
    staff_id?: number | null;
    staff?: Staff;
    created_at?: string;
    updated_at?: string;
}

export interface Staff {
    id: number;
    staff_name: string;
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

