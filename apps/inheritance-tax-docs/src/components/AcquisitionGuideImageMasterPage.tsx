import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { ACQUISITION_GUIDES, type AcquisitionGuideId } from '@/constants/acquisitionGuides';
import { useAcquisitionGuideImages } from '@/hooks/useAcquisitionGuideImages';
import { selectedOperatorHeaders } from '@/shared/staff-directory/operator';

const API_BASE = '/inheritance-tax-docs/api/acquisition-guide-images';

export const AcquisitionGuideImageMasterPage = () => {
  const { images, loading, error: loadError, reload } = useAcquisitionGuideImages();
  const [workingId, setWorkingId] = useState<AcquisitionGuideId | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inputRefs = useRef<Partial<Record<AcquisitionGuideId, HTMLInputElement | null>>>({});

  const upload = async (guideId: AcquisitionGuideId, file: File | undefined) => {
    if (!file) return;
    setWorkingId(guideId); setMessage(''); setError('');
    try {
      const body = new FormData(); body.append('image', file);
      const response = await fetch(`${API_BASE}/${guideId}`, { method: 'PUT', headers: selectedOperatorHeaders(), body });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'アップロードに失敗しました');
      await reload();
      setMessage('見本画像を保存しました。次回の案内印刷から使用されます。');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'アップロードに失敗しました');
    } finally {
      setWorkingId(null);
      const input = inputRefs.current[guideId]; if (input) input.value = '';
    }
  };

  const remove = async (guideId: AcquisitionGuideId, title: string) => {
    if (!window.confirm(`「${title}」の見本画像を無効化しますか？`)) return;
    setWorkingId(guideId); setMessage(''); setError('');
    try {
      const response = await fetch(`${API_BASE}/${guideId}`, { method: 'DELETE', headers: selectedOperatorHeaders() });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? '無効化に失敗しました');
      await reload(); setMessage('見本画像を無効化しました。案内には簡易図解を表示します。');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '無効化に失敗しました'); }
    finally { setWorkingId(null); }
  };

  return (
    <section role="tabpanel" aria-label="取得案内画像マスタ" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h2 className="text-lg font-bold">取得案内の見本画像</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">お客様へ渡す取得案内に表示する画像を登録します。PNG・JPEG・WebP・GIF、8MB以下。画像本体はDBに保存し、差し替え前の版も操作履歴のため保持します。</p>
        <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">氏名・住所・本籍・生年月日・口座番号・証券番号・保険証券番号・QRコード・印影は必ず伏せてください。</p>
      </div>
      {message ? <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p> : null}
      {(error || loadError) ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200">{error || loadError}</p> : null}
      {loading ? <p className="py-10 text-center text-sm text-slate-500">読み込み中…</p> : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {ACQUISITION_GUIDES.map((guide) => {
            const image = images.find((item) => item.guideId === guide.id);
            const working = workingId === guide.id;
            return <article key={guide.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="aspect-[16/8] bg-slate-50 dark:bg-slate-800">
                {image ? <img src={image.contentUrl} alt={`${guide.title}の見本`} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">画像未登録（簡易図解を使用）</div>}
              </div>
              <div className="p-4">
                <h3 className="font-bold">{guide.title}</h3>
                <p className="mt-1 truncate text-xs text-slate-500">{image ? `${image.originalName}・${Math.ceil(image.byteSize / 1024)}KB` : guide.sampleTitle}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">
                    {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{image ? '差し替える' : '画像を登録'}
                    <input ref={(node) => { inputRefs.current[guide.id] = node; }} disabled={working} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void upload(guide.id, event.target.files?.[0])} className="sr-only" />
                  </label>
                  {image ? <button disabled={working} type="button" onClick={() => void remove(guide.id, guide.title)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"><Trash2 className="h-4 w-4" />無効化</button> : null}
                </div>
              </div>
            </article>;
          })}
        </div>
      )}
    </section>
  );
};
