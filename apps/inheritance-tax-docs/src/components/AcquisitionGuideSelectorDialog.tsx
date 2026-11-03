import {
  BookOpenCheck,
  Building2,
  CheckSquare2,
  Landmark,
  LoaderCircle,
  Printer,
  ShieldCheck,
  Square,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { DialogOverlay } from '@/components/ui/ConfirmDialog';
import {
  ACQUISITION_GUIDES,
  type AcquisitionGuideId,
  type AcquisitionGuideVisual,
} from '@/constants/acquisitionGuides';

type AcquisitionGuideSelectorDialogProps = {
  selectedIds: AcquisitionGuideId[];
  onSelectedIdsChange: (ids: AcquisitionGuideId[]) => void;
  onPrint: () => void;
  onClose: () => void;
  isPreparing?: boolean;
};
const VISUAL_ICONS: Record<AcquisitionGuideVisual, LucideIcon> = {
  registry: BookOpenCheck,
  certificate: Building2,
  bank: WalletCards,
  insurance: ShieldCheck,
  'family-tree': Landmark,
};

export const AcquisitionGuideSelectorDialog = ({
  selectedIds,
  onSelectedIdsChange,
  onPrint,
  onClose,
  isPreparing = false,
}: AcquisitionGuideSelectorDialogProps) => {
  const selectedSet = new Set(selectedIds);
  const toggle = (id: AcquisitionGuideId) => {
    onSelectedIdsChange(selectedSet.has(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id]);
  };

  return (
    <DialogOverlay labelledBy="acquisition-guide-dialog-title" onClose={onClose} maxWidth="w-[calc(100vw-2rem)] max-w-5xl">
      <div className="flex max-h-[86vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-700 dark:text-emerald-400">相続税申告用</p>
            <h2 id="acquisition-guide-dialog-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              お客様へ渡す取得案内を選ぶ
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              お客様へ渡す案内にチェックしてください。選んだ案内だけを1種類1ページで印刷します。
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="閉じる">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            選択中: {selectedIds.length} / {ACQUISITION_GUIDES.length}
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:ml-2 sm:inline">一覧は上下にスクロールできます</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => onSelectedIdsChange(ACQUISITION_GUIDES.map((guide) => guide.id))} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              すべて選択
            </button>
            <button type="button" onClick={() => onSelectedIdsChange([])} className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              選択解除
            </button>
          </div>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 auto-rows-max content-start grid-cols-1 gap-3 overflow-y-auto overscroll-contain px-1 pr-2 [scrollbar-gutter:stable] sm:grid-cols-2">
          {ACQUISITION_GUIDES.map((guide) => {
            const selected = selectedSet.has(guide.id);
            const Icon = VISUAL_ICONS[guide.visual];
            return (
              <label key={guide.id} className={`flex h-auto cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 transition-colors duration-200 dark:bg-slate-800 ${selected ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700'}`}>
                <input type="checkbox" checked={selected} onChange={() => toggle(guide.id)} className="sr-only" />
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <strong className="min-w-0 break-words text-sm text-slate-900 dark:text-slate-100">{guide.title}</strong>
                    {selected ? <CheckSquare2 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" /> : <Square className="h-5 w-5 shrink-0 text-slate-400" />}
                  </span>
                  <span className="mt-1 block break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">{guide.shortDescription}</span>
                  <span className="mt-2 block break-words text-[11px] font-medium leading-relaxed text-emerald-800 [overflow-wrap:anywhere] dark:text-emerald-300">取る場所: {guide.destination}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col-reverse items-stretch justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:items-center">
          <button type="button" onClick={onClose} className="min-h-11 cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">キャンセル</button>
          <button type="button" onClick={onPrint} disabled={selectedIds.length === 0 || isPreparing} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500">
            {isPreparing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />}
            {isPreparing ? '画像を準備中…' : `選択した案内を印刷（${selectedIds.length}）`}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
