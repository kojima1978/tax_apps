import { useState, useEffect } from 'react';
import type { Assignee, Department } from '@/types/shared';
import { getAssignees } from '@/lib/api/assignees';
import { getDepartments } from '@/lib/api/departments';

interface AsyncMastersResult {
    assignees: Assignee[];
    departments: Department[];
}

/**
 * 担当者・部署マスタデータを非同期取得する共通フック
 * @param deps - 再取得のトリガーとなる依存値の配列
 */
export function useAsyncMasters(deps: unknown[] = []): AsyncMastersResult {
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    useEffect(() => {
        Promise.all([getAssignees(), getDepartments()])
            .then(([a, d]) => { setAssignees(a); setDepartments(d); })
            .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return { assignees, departments };
}
