// 令和8年様式で旧第7表を「第7表の1」「第7表の2」に、旧第8表を「第7表の3」に分割。
// データは第7表の1/2が 'table7' 共通、第7表の3が 'table8'（calcTable7・第6表/第7表の3の参照を維持）。
export { Table7_1Grid as Table7_1 } from './Table7_1Grid';
export { Table7_2Grid as Table7_2 } from './Table7_2Grid';
// 第7表の3（旧第8表＝S1純資産修正＋S2＋株式の価額、令和8年様式：38%・第7表の2参照・Cコード）
export { Table8Grid as Table7_3 } from '../table8/Table8Grid';
export { calcTable7 } from './Table7Grid';
