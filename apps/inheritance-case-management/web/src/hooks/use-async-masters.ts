import { useQuery } from '@tanstack/react-query';
import type { Assignee, Department } from '@/types/shared';
import { getAssignees } from '@/lib/api/assignees';
import { getDepartments } from '@/lib/api/departments';

const EMPTY_ASSIGNEES: Assignee[] = [];
const EMPTY_DEPARTMENTS: Department[] = [];

/** Fetch masters once per mount, independently of list filters and result counts. */
export function useAsyncMasters() {
    const { data, refetch } = useQuery({
        queryKey: ['case-filter-masters'],
        staleTime: 0,
        queryFn: async () => {
            const [assignees, departments] = await Promise.all([getAssignees(), getDepartments()]);
            return { assignees, departments };
        },
    });
    return {
        assignees: data?.assignees ?? EMPTY_ASSIGNEES,
        departments: data?.departments ?? EMPTY_DEPARTMENTS,
        refetch,
    };
}
