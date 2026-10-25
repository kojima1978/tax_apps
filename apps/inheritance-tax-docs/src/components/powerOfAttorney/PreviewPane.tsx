import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { PowerOfAttorneySheet } from '@/utils/powerOfAttorney/record';
import { PowerOfAttorneySheetView } from '@/components/powerOfAttorney/PowerOfAttorneySheetView';

// A4 の横幅（CSS の 96dpi で数える）
const SHEET_WIDTH_PX = (210 * 96) / 25.4;

type Zoom = 'fit' | 'actual';
const ZOOM_OPTIONS: { value: Zoom; label: string }[] = [
  { value: 'fit', label: '幅に合わせる' },
  { value: 'actual', label: '実寸' },
];

export const sheetDomId = (key: string) => `poa-sheet-${key}`;

/** プレビューの横幅を見張り、紙が収まる倍率を返す（実寸より大きくはしない） */
function useFitScale(zoom: Zoom) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = zoom === 'actual' || width === 0 ? 1 : Math.min(1, width / SHEET_WIDTH_PX);
  return { ref, scale };
}

// 上の帯の下端からこれだけ下までに上端が来た紙を「いま見ている紙」とする
const ACTIVE_LINE_OFFSET_PX = 100;
// 紙へ移動したとき、上の帯の下に空ける隙間
const JUMP_GAP_PX = 12;

/** 上の帯の高さ。紙のボタンが折り返したり注意が出たりで変わるので見張る */
function useHeight(ref: RefObject<HTMLDivElement | null>) {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return height;
}

/**
 * いま見ている紙＝上端が上の帯のすぐ下の線を越えた紙のうち最後のもの。
 * 「見えている紙の先頭」で選ぶと、移動した直後も前の紙の下端が帯の裏に残っていて前の紙のままになる
 */
function useActiveSheet(sheets: PowerOfAttorneySheet[], toolbarRef: RefObject<HTMLDivElement | null>) {
  const [active, setActive] = useState<string | null>(null);
  const keys = sheets.map((sheet) => sheet.key).join('|');
  useEffect(() => {
    const order = keys.split('|');
    const update = () => {
      const line = (toolbarRef.current?.getBoundingClientRect().bottom ?? 0) + ACTIVE_LINE_OFFSET_PX;
      let current = order[0] ?? null;
      order.forEach((key) => {
        const top = document.getElementById(sheetDomId(key))?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = key;
      });
      setActive(current);
    };
    update();
    // 横並びではプレビューの枠が、縦積みでは窓がスクロールするので、捕捉段階でどちらも拾う
    window.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [keys, toolbarRef]);
  return active;
}

/**
 * 縮めて出す1枚。transform は場所を取ったまま見た目だけ縮むので、外側の箱に縮めた後の
 * 大きさを持たせる（高さは文字の大きさ合わせで変わるので見張る）。印刷では CSS が両方外す
 */
const ScaledSheet = ({ sheet, scale }: { sheet: PowerOfAttorneySheet; scale: number }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const height = useHeight(innerRef);
  return (
    <div
      className="poa-scale-outer shadow-lg print:shadow-none"
      style={{ width: SHEET_WIDTH_PX * scale, height: height === 0 ? undefined : height * scale }}
    >
      <div ref={innerRef} className="poa-scale-inner w-fit origin-top-left print:w-auto" style={scale === 1 ? undefined : { transform: `scale(${scale})` }}>
        <PowerOfAttorneySheetView sheet={sheet} />
      </div>
    </div>
  );
};

/**
 * 画面の右側：刷る紙の一覧。上の帯で枚数・紙への移動・倍率を出し、
 * 印刷できない理由（notice）もここに出す（ボタンの title だけでは気づけない）
 */
export const PreviewPane = ({ sheets, notice }: { sheets: PowerOfAttorneySheet[]; notice?: ReactNode }) => {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const { ref, scale } = useFitScale(zoom);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const active = useActiveSheet(sheets, toolbarRef);
  const toolbarHeight = useHeight(toolbarRef);

  const jump = (key: string) => document.getElementById(sheetDomId(key))?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-900 lg:overflow-y-auto print:bg-transparent print:overflow-visible">
      {/* 縦積みのときは画面の見出しが上に貼り付くので、こちらは横並びのときだけ貼り付ける */}
      <div ref={toolbarRef} className="no-print lg:sticky lg:top-0 z-[5] border-b border-slate-200 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur px-4 py-2 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            印刷イメージ <span className="font-normal text-slate-500 dark:text-slate-400">{sheets.length}枚</span>
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="紙へ移動">
            {sheets.map((sheet) => (
              <button
                key={sheet.key}
                type="button"
                onClick={() => jump(sheet.key)}
                aria-current={active === sheet.key ? 'true' : undefined}
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  active === sheet.key
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {sheet.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex rounded border border-slate-300 dark:border-slate-600 overflow-hidden" role="group" aria-label="表示の大きさ">
            {ZOOM_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={zoom === option.value}
                onClick={() => setZoom(option.value)}
                className={`px-2 py-0.5 text-xs ${
                  zoom === option.value
                    ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {notice}
      </div>

      {/* 印刷ではスクロール領域にしない（overflow があると2枚目以降が切れる） */}
      <div className="p-4 md:p-6 overflow-x-auto print:p-0 print:overflow-visible">
        <div ref={ref} className="space-y-6 print:space-y-0">
          {sheets.map((sheet) => (
            <div
              key={sheet.key}
              id={sheetDomId(sheet.key)}
              data-sheet-key={sheet.key}
              className="poa-page space-y-1 w-fit mx-auto print:w-auto print:mx-0"
              style={{ scrollMarginTop: toolbarHeight + JUMP_GAP_PX }}
            >
              <p className="no-print text-xs font-medium text-slate-500 dark:text-slate-400">{sheet.label}</p>
              <ScaledSheet sheet={sheet} scale={scale} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
