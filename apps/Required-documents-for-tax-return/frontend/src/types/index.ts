export interface SubItem {
    id: string;
    text: string;
    checked: boolean;
}

export interface DocumentItem {
    id: string;
    text: string;
    checked: boolean;
    subItems?: SubItem[];
}

export interface Staff {
    id: number;
    staff_name: string;
    mobile_number?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CategoryGroup {
    id: string;
    category: string;
    documents: DocumentItem[];
    note?: string;
}

export interface Customer {
    id: number;
    customer_name: string;
    staff_name: string;
    staff_id?: number;
    created_at?: string;
    updated_at?: string;
}
