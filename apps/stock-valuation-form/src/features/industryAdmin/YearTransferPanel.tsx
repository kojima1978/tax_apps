import { useState, type DragEvent } from 'react';
import type { IndustryYear } from '@/data/industryDataset';
import { AdminAlert } from './AdminAlert';
import { createIndustryYear, fetchIndustryYearArchive, importMonthlyPrices } from './api';
import {
  archiveFileName,
  downloadJson,
  parseYearArchive,
  type ParsedArchive,
} from './yearArchive';

interface Props {
  years: readonly IndustryYear[];
  onImported: () => Promise<void>;
}

/**
 * 年分まるごとのJSON入出力。別のPC・別の環境へ業種目データを持っていくための画面。
 *
 * バックアップ（docker/scripts/backup.sh）とは目的が違う。あちらはDB全体を丸ごと戻す運用、
 * こちらは「この年分だけ」を人が持ち運ぶ経路で、書き出したファイルはそのまま
 * `POST /industry-years` に通る形になっている。
 */
export function YearTransferPanel({ years, onImported }: Props) {
  return (
    <div className="admin-panel-body">
      <ExportSection years={years} />
      <ImportSection years={years} onImported={onImported} />
    </div>
  );
}

function monthlyPriceCountOf(year: IndustryYear): number {
  return year.categories.reduce((total, category) => total + category.monthlyPrices.length, 0);
}

/** 登録済みの年分を1件ずつJSONファイルに落とす。 */
function ExportSection({ years }: { years: readonly IndustryYear[] }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (gregorianYear: number) => {
    setBusy(gregorianYear);
    setError(null);
    try {
      const archive = await fetchIndustryYearArchive(gregorianYear);
      downloadJson(archiveFileName(archive.label, archive.gregorianYear), archive);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="admin-detail">
      <h3 className="admin-detail-title">書き出し</h3>
      <p className="admin-note">
        業種目マスタ・B・C・D・前年平均・月別株価・内容説明をまとめて1ファイルにします。
        このファイルはそのまま下の「読み込み」で復元できます。
      </p>

      {error && <AdminAlert kind="error" scrollKey={error}>{error}</AdminAlert>}

      <div className="admin-scroll">
        <table className="admin-table admin-table-fit">
          <thead>
            <tr>
              <th>年分</th><th>西暦</th><th>業種目</th><th>月別株価</th><th>書き出し</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year.gregorianYear}>
                <td>{year.label}</td>
                <td>{year.gregorianYear}</td>
                <td>{year.categories.length} 件</td>
                <td>{monthlyPriceCountOf(year)} 件</td>
                <td>
                  <button
                    type="button"
                    className="app-tool-btn"
                    onClick={() => download(year.gregorianYear)}
                    disabled={busy !== null}
                  >
                    {busy === year.gregorianYear ? '書き出し中…' : 'JSONで書き出す'}
                  </button>
                </td>
              </tr>
            ))}
            {years.length === 0 && (
              <tr><td colSpan={5}>年分が登録されていません。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type Message = { kind: 'ok' | 'error'; text: string };

/**
 * 書き出したJSONの読み込み。未登録の年分なら丸ごと復元し、
 * 既に登録済みの年分なら月別株価だけを流し込む（年分の作り直しはできないため）。
 */
function ImportSection({ years, onImported }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [archive, setArchive] = useState<ParsedArchive | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const existing = archive
    ? years.find((year) => year.era === archive.era && year.eraYear === archive.eraYear)
    : undefined;

  const load = async (file: File | undefined) => {
    setMessage(null);
    setProgress(null);
    setArchive(null);
    setFileName(file?.name ?? null);
    if (!file) return;

    const result = parseYearArchive(await file.text());
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error });
      return;
    }
    setArchive(result.archive);
  };

  /*
   * 書き出したJSONは output フォルダやダウンロードフォルダに落ちている。
   * そこから直接放り込めるようにする（ファイル選択でも今までどおり選べる）。
   */
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    void load(event.dataTransfer.files[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    // 既定の動作はブラウザがそのファイルを開いてしまうこと。止めないと drop も来ない。
    event.preventDefault();
    if (!busy) setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // 枠の中の子要素をまたぐたびに leave が来るので、本当に外へ出たときだけ戻す。
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  /** 未登録の年分。業種目マスタも月別株価も1トランザクションで入る。 */
  const createWholeYear = async () => {
    if (!archive) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await createIndustryYear({
        era: archive.era,
        eraYear: archive.eraYear,
        categories: archive.categories,
      });
      await onImported();
      setMessage({
        kind: 'ok',
        text: `${response.year.label}を復元しました（業種目 ${response.categoryCount} 件 / 月別株価 ${response.monthlyPriceCount} 件）`,
      });
      setArchive(null);
      setFileName(null);
    } catch (caught) {
      setMessage({ kind: 'error', text: caught instanceof Error ? caught.message : String(caught) });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  /**
   * 登録済みの年分。月次取込APIは1回1ヶ月なので月ごとに送る。
   * 同じ (業種目, 年, 月) は上書きされるが、業種目マスタとB・C・Dには触らない。
   */
  const importMonthsOnly = async () => {
    if (!archive || !existing) return;
    setBusy(true);
    setMessage(null);

    let created = 0;
    let updated = 0;
    try {
      for (const [index, group] of archive.months.entries()) {
        setProgress(`${index + 1} / ${archive.months.length} ヶ月目（${group.year}年${group.month}月分）`);
        const response = await importMonthlyPrices(existing.gregorianYear, {
          year: group.year,
          month: group.month,
          rows: group.rows,
        });
        created += response.created;
        updated += response.updated;
      }
      await onImported();
      setMessage({
        kind: 'ok',
        text: `${existing.label}の月別株価を取り込みました（新規 ${created} 件 / 上書き ${updated} 件）`,
      });
      setArchive(null);
      setFileName(null);
    } catch (caught) {
      setMessage({
        kind: 'error',
        text: `${caught instanceof Error ? caught.message : String(caught)}`
          + `（ここまでに 新規 ${created} 件 / 上書き ${updated} 件 を取り込み済みです）`,
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <section className="admin-detail">
      <h3 className="admin-detail-title">読み込み</h3>
      <p className="admin-note">
        書き出したJSONを選ぶと中身を確認してから登録します。ファイルを選んだだけでは登録されません。
      </p>

      <div
        className={`admin-dropzone${dragging ? ' admin-dropzone-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label className="admin-label admin-label-grow">
          年分のJSONファイル
          <input
            type="file"
            className="admin-input"
            accept="application/json,.json"
            onChange={(event) => void load(event.target.files?.[0])}
            disabled={busy}
          />
        </label>
        <span className="admin-note">
          {dragging ? 'ここで離すと読み込みます' : 'この枠にファイルをドラッグしても読み込めます'}
        </span>
      </div>

      {fileName && !archive && !message && (
        <div className="admin-note">読み込み中… （{fileName}）</div>
      )}

      {archive && (
        <div className="admin-preview">
          <div className="admin-summary">
            <span><strong>{archive.label}</strong></span>
            <span className="admin-badge">業種目 {archive.categories.length} 件</span>
            <span className="admin-badge">月別株価 {archive.monthlyPriceCount} 件</span>
            <span className="admin-badge">{archive.months.length} か月分</span>
            {archive.exportedAt && (
              <span className="admin-note">
                書き出し日時 {new Date(archive.exportedAt).toLocaleString('ja-JP')}
              </span>
            )}
          </div>

          {archive.months.length > 0 && (
            <div className="admin-note">
              {archive.months.map((group) => `${group.year}年${group.month}月分(${group.rows.length})`).join(' / ')}
            </div>
          )}

          {existing && (
            <AdminAlert kind="warn" scrollKey={`existing-${existing.gregorianYear}`}>
              {existing.label}は既に登録されています。業種目マスタとB・C・Dの作り直しはできません
              （年分の削除APIを用意していないため）。月別株価だけなら上書きで取り込めます。
              まるごと戻したい場合はバックアップからのリストアで対応してください。
            </AdminAlert>
          )}
        </div>
      )}

      {progress && <div className="admin-note">取込中… {progress}</div>}

      {message && (
        <AdminAlert kind={message.kind} scrollKey={message.text}>{message.text}</AdminAlert>
      )}

      {archive && (
        <div className="admin-actions">
          <button
            type="button"
            className="app-tool-btn"
            onClick={() => { setArchive(null); setFileName(null); setMessage(null); }}
            disabled={busy}
          >
            選び直す
          </button>
          {existing ? (
            <button
              type="button"
              className="app-tool-btn admin-btn-primary"
              onClick={importMonthsOnly}
              disabled={busy || archive.months.length === 0}
            >
              {busy ? '取込中…' : `月別株価だけ取り込む（${archive.months.length} か月）`}
            </button>
          ) : (
            <button
              type="button"
              className="app-tool-btn admin-btn-primary"
              onClick={createWholeYear}
              disabled={busy}
            >
              {busy ? '復元中…' : `${archive.label}として復元`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
