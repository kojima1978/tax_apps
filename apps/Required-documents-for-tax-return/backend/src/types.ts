export interface Customer {
    id: number;
    customer_name: string;
    staff_name: string;
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
}
