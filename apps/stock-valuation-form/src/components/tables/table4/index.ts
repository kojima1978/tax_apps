// 令和8年様式で旧第4表を「第4表の1」「第4表の2」に分割。
// データは従来どおり 'table4' バケット共通（calcTable4・第2/3/7表の参照を維持）。
// Table4Grid.tsx は calcTable4 と旧様式（測定用の温存）を保持。
export { Table4_1Grid as Table4_1 } from './Table4_1Grid';
export { Table4_2Grid as Table4_2 } from './Table4_2Grid';
export { calcTable4 } from './Table4Grid';
