import { useMemo } from 'react';
import { PlusCircle, RefreshCcw } from 'lucide-react';
import { CategoryGroup } from '@/types';
import { taxReturnData, replaceYearPlaceholder } from '@/data/taxReturnData';

interface MissingCategoriesRestoreProps {
  documentGroups: CategoryGroup[];
  year: number;
  onRestore: (group: CategoryGroup) => void;
}

export function MissingCategoriesRestore({
  documentGroups,
  year,
  onRestore,
}: MissingCategoriesRestoreProps) {
  const currentGroupIds = useMemo(() => new Set(documentGroups.map((g) => g.id)), [documentGroups]);

  const missingDefaults = useMemo(() => {
    return [
      ...taxReturnData.baseRequired.map((g, i) => ({
        id: `base_${i}`,
        category: g.category,
        original: g,
        type: 'base' as const,
      })),
      ...taxReturnData.options.map((o) => ({
        id: `option_${o.id}`,
        category: `【所得】${o.label}`,
        original: o,
        type: 'option' as const,
      })),
      ...taxReturnData.deductions.map((d) => ({
        id: `deduction_${d.id}`,
        category: `【控除】${d.label}`,
        original: d,
        type: 'deduction' as const,
      })),
    ].filter((item) => !currentGroupIds.has(item.id));
  }, [currentGroupIds]);

  if (missingDefaults.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <p className="text-sm text-slate-500 font-bold mb-2 flex items-center">
        <RefreshCcw className="w-3 h-3 mr-1" />
        削除されたデフォルトカテゴリを復元:
      </p>
      <div className="flex flex-wrap gap-2">
        {missingDefaults.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              let documents: string[] = [];
              let note: string | undefined = undefined;

              if (item.type === 'base') {
                const original = item.original as { documents: string[]; note?: string };
                documents = original.documents;
                note = original.note;
              } else {
                const original = item.original as { documents: string[] };
                documents = original.documents;
              }

              const newGroup: CategoryGroup = {
                id: item.id,
                category: item.category,
                documents: documents.map((doc, idx) => ({
                  id: `doc_${Date.now()}_${idx}`,
                  text: replaceYearPlaceholder(doc, year),
                  checked: false,
                  subItems: [],
                })),
                note,
              };

              onRestore(newGroup);
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs rounded-full border border-slate-200 hover:border-emerald-200 transition-colors flex items-center"
          >
            <PlusCircle className="w-3 h-3 mr-1" />
            {item.category}
          </button>
        ))}
      </div>
    </div>
  );
}
