"use client";

import { LoaderCircle, Repeat2, TrendingDown } from "lucide-react";
import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { compactYen } from "@/lib/format";

type Scenario = {
  spouseSharePercent: number;
  spouseAcquiredJpy: number;
  primaryTaxJpy: number;
  secondaryEstateJpy: number;
  secondaryTaxJpy: number;
  combinedTaxJpy: number;
};

type Result = {
  heirCount: number;
  spouseOwnAssetsJpy: number;
  primaryEstateValueJpy: number;
  recommendedPercent: number;
  scenarios: Scenario[];
};

const JPY_PER_MAN_YEN = 10_000;

/**
 * 二次相続シミュレーション。一次相続で配偶者が取得する割合を振って、
 * 一次＋二次の相続税合計が最小になる配分の目安を概算で示す。
 */
export function SecondaryInheritanceSimulator({ householdId }: { householdId: number }) {
  const [spouseOwnAssetsMan, setSpouseOwnAssetsMan] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function simulate() {
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const spouseOwnAssetsJpy = Math.round((Number(spouseOwnAssetsMan.replace(/,/g, "")) || 0) * JPY_PER_MAN_YEN);
      const response = await fetch(`${API_BASE}/inheritance-tax-secondary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, spouseOwnAssetsJpy }),
      });
      const data = await response.json().catch(() => null) as (Result & { error?: string }) | null;
      if (!response.ok || !data) throw new Error(data?.error || "二次相続を試算できませんでした。");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "二次相続を試算できませんでした。");
    } finally {
      setStatus("idle");
    }
  }

  const worst = result ? Math.max(...result.scenarios.map((scenario) => scenario.combinedTaxJpy)) : 0;
  const best = result ? Math.min(...result.scenarios.map((scenario) => scenario.combinedTaxJpy)) : 0;

  return <section className="secondary-sim" aria-labelledby="secondary-sim-title">
    <header className="secondary-sim-heading">
      <Repeat2 />
      <div>
        <h3 id="secondary-sim-title">二次相続シミュレーション</h3>
        <p>一次相続での配偶者の取得割合を変えたとき、一次＋二次で納める相続税の合計がどう変わるかを概算します。</p>
      </div>
    </header>

    <div className="secondary-sim-form">
      <label>配偶者の固有財産（万円）
        <input
          inputMode="numeric"
          value={spouseOwnAssetsMan}
          onChange={(event) => setSpouseOwnAssetsMan(event.target.value.replace(/[^0-9,]/g, ""))}
          placeholder="例：5,000"
        />
        <small>配偶者自身がすでに保有する財産（今回のB/Sとは別）。二次相続の遺産にこの額を加えて試算します。</small>
      </label>
      <button type="button" className="button primary" onClick={() => void simulate()} disabled={status === "loading"}>
        {status === "loading" ? <LoaderCircle className="spin" /> : <TrendingDown />}{status === "loading" ? "試算中" : "試算する"}
      </button>
    </div>

    {error ? <p className="secondary-sim-error" role="alert">{error}</p> : null}

    {result ? <div className="secondary-sim-result">
      <div className="table-scroll">
        <table className="secondary-sim-table">
          <caption className="sr-only">配偶者取得割合ごとの一次・二次相続税の概算</caption>
          <thead><tr>
            <th scope="col">配偶者の取得割合</th>
            <th scope="col" className="number">配偶者取得額</th>
            <th scope="col" className="number">一次の相続税</th>
            <th scope="col" className="number">二次の遺産額</th>
            <th scope="col" className="number">二次の相続税</th>
            <th scope="col" className="number">合計（一次＋二次）</th>
          </tr></thead>
          <tbody>{result.scenarios.map((scenario) => {
            const recommended = scenario.spouseSharePercent === result.recommendedPercent;
            return <tr key={scenario.spouseSharePercent} className={recommended ? "secondary-sim-best" : undefined}>
              <th scope="row">{scenario.spouseSharePercent}%{recommended ? <span className="secondary-sim-badge">最小</span> : null}</th>
              <td className="number">{compactYen(scenario.spouseAcquiredJpy)}</td>
              <td className="number">{compactYen(scenario.primaryTaxJpy)}</td>
              <td className="number">{compactYen(scenario.secondaryEstateJpy)}</td>
              <td className="number">{compactYen(scenario.secondaryTaxJpy)}</td>
              <td className="number emphasis">{compactYen(scenario.combinedTaxJpy)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="secondary-sim-note" role="note">
        配偶者の取得割合を{result.recommendedPercent}%にすると、この試算では合計税額が最小（{compactYen(best)}）になります。
        最大との差は{compactYen(worst - best)}です。実際は二次相続までの財産の増減・使用、遺産分割、配偶者居住権などで変動するため、あくまで検討の目安としてご利用ください。
      </p>
    </div> : null}
  </section>;
}
