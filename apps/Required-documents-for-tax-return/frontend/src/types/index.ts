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

export interface CategoryGroup {
    id: string;
    category: string;
    documents: DocumentItem[];
    note?: string;
}
