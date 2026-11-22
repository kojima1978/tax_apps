"use client";

import { type ChangeEvent, useState } from "react";
import { findMunicipalityCandidates, municipalities, parsePropertyLocation, propertyLocationOf, type Municipality } from "@/lib/municipality";
import type { AssetDetails } from "@/lib/portfolio-view";
import { composedPropertyLocation, normalizeAza, normalizeLotNumber, type PropertyLocation } from "@/lib/property-location";

const datalistId = "property-municipality-options";

/** 市区町村の入力候補（都道府県から書いた名前）。1件ずつの入力とまとめて入力で共有する。 */
export function MunicipalityDatalist({ id }: { id: string }) {
  return <datalist id={id}>{municipalities.map((item) => <option key={item.code} value={item.name} />)}</datalist>;
}

/** 市区町村の欄の下に出す案内。同じ名前が複数あるときは候補を挙げる（表に無いのとは分けて知らせる）。 */
export function municipalityHintFor(name: string): { municipality: Municipality | null; text: string; warning: boolean } {
  if (!name.trim()) return { municipality: null, text: "市区町村コードは名前から自動で付きます。", warning: false };
  const candidates = findMunicipalityCandidates(name);
  if (candidates.length === 1) return { municipality: candidates[0], text: `市区町村コード ${candidates[0].code}`, warning: false };
  if (candidates.length > 1) {
    return { municipality: null, text: `同じ名前の市区町村が複数あります（${candidates.map((item) => item.name).join("・")}）。都道府県から入力してください。`, warning: true };
  }
  return { municipality: null, text: "表に無い名前です（市区町村コードは付きません）。都道府県から入力してください。", warning: true };
}

/**
 * 物件の基本情報のうち所在の欄（市区町村・大字町名・字・地番・家屋番号・原文）。
 * 「物件の基本情報」の2列の枠にそのまま並ぶよう、ラベルを並べて返す。
 * 構造を保存していない古い明細は、原文から分けた案を入れて開く（保存するまでデータは変わらない）。
 */
export function PropertyLocationFields({ details, propertyType }: { details: AssetDetails; propertyType: string }) {
  const [initial] = useState(() => propertyLocationOf(details));
  const [location, setLocation] = useState<PropertyLocation>(initial.location);
  const [notice, setNotice] = useState<{ inferred: boolean; problems: string[] }>({ inferred: initial.inferred, problems: initial.problems });
  const change = (key: keyof PropertyLocation) => (event: ChangeEvent<HTMLInputElement>) => setLocation((current) => ({ ...current, [key]: event.target.value }));
  const municipalityHint = municipalityHintFor(location.municipalityName);
  const municipality = municipalityHint.municipality;
  const isBuilding = propertyType === "BUILDING";
  const preview = composedPropertyLocation({
    ...location,
    municipalityName: municipality?.name ?? location.municipalityName.trim(),
    townName: location.townName.trim(),
    aza: normalizeAza(location.aza),
    lotNumber: location.lotNumber.trim() ? normalizeLotNumber(location.lotNumber) : "",
    houseNumber: isBuilding && location.houseNumber.trim() ? normalizeLotNumber(location.houseNumber) : "",
  });
  const splitSource = () => {
    const parsed = parsePropertyLocation(location.source);
    // 家屋番号は原文から読まない（所在・地番の原文に家屋番号は書かれない）ので、入力済みの値を残す
    setLocation({ ...parsed.location, houseNumber: location.houseNumber });
    setNotice({ inferred: true, problems: parsed.problems });
  };

  return <>
    <label>市区町村
      <input name="assetDetail.municipalityName" list={datalistId} value={location.municipalityName} onChange={change("municipalityName")} placeholder="例：東京都港区" autoComplete="off" />
      <MunicipalityDatalist id={datalistId} />
      <small className={`asset-detail-hint${municipalityHint.warning ? " warning" : ""}`}>{municipalityHint.text}</small>
    </label>
    <label>大字・町名<input name="assetDetail.townName" value={location.townName} onChange={change("townName")} placeholder="例：大字上野" /><small className="asset-detail-hint">元資料に書かれた名称のまま入力します。</small></label>
    <label>字<input name="assetDetail.aza" value={location.aza} onChange={change("aza")} placeholder="記載が無ければ空欄" /></label>
    <label>地番<input name="assetDetail.lotNumber" value={location.lotNumber} onChange={change("lotNumber")} placeholder="例：123番4" /><small className="asset-detail-hint">「123-4」と入力しても「123番4」で保存します。</small></label>
    {isBuilding ? <label>家屋番号<input name="assetDetail.houseNumber" value={location.houseNumber} onChange={change("houseNumber")} placeholder="例：123番4" /></label> : null}
    <div className="position-field-wide">
      <label>所在・地番の原文
        {/* 入力欄とボタンを1つの横並びに入れ、ボタンを入力欄の高さへ伸ばす（入力欄の高さは画面幅で変わる） */}
        <span className="property-location-source-row">
          <input name="assetDetail.propertyAddress" value={location.source} onChange={change("source")} required={!preview} placeholder="例：東京都港区南青山一丁目123番4" />
          <button type="button" className="button secondary" onClick={splitSource} disabled={!location.source.trim()}>原文から分ける</button>
        </span>
      </label>
      <small className="asset-detail-hint">照合できなかったときに元の表記を確かめるために残します。市区町村と地番を入力すれば空でも保存できます。</small>
    </div>
    {notice.inferred || notice.problems.length > 0 || preview ? <div className="position-field-wide property-location-notes" aria-live="polite">
      {notice.inferred ? <p className="asset-detail-hint warning">原文から自動で分けた案です。原文と見比べてから保存してください。</p> : null}
      {notice.problems.length > 0 ? <ul className="asset-detail-hint warning">{notice.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
      {preview ? <p className="asset-detail-hint">一覧・印刷での表示：{preview}</p> : null}
    </div> : null}
  </>;
}
