import { dateJa } from "@/lib/format";
import { type Portfolio, type PrintSection, type Snapshot, fiscalYearLabel } from "@/lib/portfolio-view";

/** 印刷に含められるセクション。目次の並びもこの順に従う。 */
export const PRINT_SECTION_META: ReadonlyArray<{ key: PrintSection; title: string; description: string }> = [
  { key: "profile-family", title: "本人・家族情報", description: "本人の基本情報と親族構成、法定相続分および年齢" },
  { key: "balance", title: "貸借対照表", description: "現在価値と相続時予測による資産・負債の構成" },
  { key: "tax-calculation", title: "相続税の概算", description: "概算税額および計算根拠" },
  { key: "details", title: "資産・負債明細", description: "資産、負債および保証債務の明細" },
  { key: "history", title: "年度比較", description: "年度ごとの残高推移と比較" },
];

/** 印刷時だけ出す表紙と目次。画面では `aria-hidden` で読み飛ばす。 */
export function PrintFrontMatter({
  household,
  snapshot,
  sections,
}: {
  household: Portfolio["household"];
  snapshot: Snapshot;
  sections: PrintSection[];
}) {
  const includedSections = PRINT_SECTION_META.filter(({ key }) => sections.includes(key));

  return (
    <div className="print-front-matter" aria-hidden="true">
      <section className="print-cover">
        <div className="print-cover-mark">PERSONAL ASSET BALANCE SHEET</div>
        <div className="print-cover-main">
          <p>PRIVATE BANKING REPORT</p>
          <h1>個人資産・負債管理レポート</h1>
          <span className="print-cover-rule" />
          <dl>
            <div><dt>顧客名</dt><dd>{household.name}</dd></div>
            <div><dt>顧客コード</dt><dd>{household.clientCode}</dd></div>
            <div><dt>対象年度</dt><dd>{fiscalYearLabel(snapshot)}</dd></div>
            <div><dt>B/S基準日</dt><dd>{dateJa(snapshot.asOfDate)}</dd></div>
          </dl>
        </div>
        <p className="print-cover-confidential">CONFIDENTIAL</p>
      </section>

      <section className="print-toc">
        <header>
          <p>CONTENTS</p>
          <h2>目次</h2>
        </header>
        <ol>
          {includedSections.map(({ key, title, description }, index) => (
            <li key={key}>
              <span className="print-toc-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="print-toc-copy"><strong>{title}</strong><small>{description}</small></span>
            </li>
          ))}
        </ol>
        <footer>
          <span>{household.name}</span>
          <span>{fiscalYearLabel(snapshot)}・基準日 {dateJa(snapshot.asOfDate)}</span>
        </footer>
      </section>
    </div>
  );
}
