export interface Assignee {
    id: string;
    name: string;
    employeeId?: string;
    department: string;
    active?: boolean;
}

export interface Referrer {
    id: string;
    company: string;
    department?: string;
    name: string;
    active?: boolean;
}
