import { CategoryGroup } from '@/types';
import { taxReturnData, replaceYearPlaceholder } from '@/data/taxReturnData';

// 初期データを生成する関数
export function generateInitialDocumentGroups(year: number): CategoryGroup[] {
    const groups: CategoryGroup[] = [];
    let docIdCounter = 0;

    // 基本書類
    taxReturnData.baseRequired.forEach((group, groupIndex) => {
        groups.push({
            id: `base_${groupIndex}`,
            category: group.category,
            documents: group.documents.map((doc) => ({
                id: `doc_${docIdCounter++}`,
                text: replaceYearPlaceholder(doc, year),
                checked: false,
                subItems: [],
            })),
            note: group.note,
        });
    });

    // 所得の種類別
    taxReturnData.options.forEach((opt) => {
        groups.push({
            id: `option_${opt.id}`,
            category: `【所得】${opt.label}`,
            documents: opt.documents.map((doc) => ({
                id: `doc_${docIdCounter++}`,
                text: replaceYearPlaceholder(doc, year),
                checked: false,
                subItems: [],
            })),
        });
    });

    // 控除項目
    taxReturnData.deductions.forEach((ded) => {
        groups.push({
            id: `deduction_${ded.id}`,
            category: `【控除】${ded.label}`,
            documents: ded.documents.map((doc) => ({
                id: `doc_${docIdCounter++}`,
                text: replaceYearPlaceholder(doc, year),
                checked: false,
                subItems: [],
            })),
        });
    });

    return groups;
}
