// 令和8年様式で旧第4表を「第4表の1」「第4表の2」に分割。
// データは従来どおり 'table4' バケット共通（calcTable4・第2/3/7表の参照を維持）。
// 計算本体は calcTable4.ts（様式の描画を持たない共通モジュール）。
export { Table4_1Grid as Table4_1 } from './Table4_1Grid';
export { Table4_2Grid as Table4_2 } from './Table4_2Grid';
export { calcTable4 } from './calcTable4';
