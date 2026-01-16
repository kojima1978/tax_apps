'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Map,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Printer,
  Ruler,
} from 'lucide-react';

interface TaxResults {
  total: number;
  landAcq: number;
  landReg: number;
  bldgAcq: number;
  bldgReg: number;
  totalAcq: number;
  totalReg: number;
  process: {
    landAcq: string[];
    landReg: string[];
    bldgAcq: string[];
    bldgReg: string[];
  };
}

export default function TaxCalculator() {
  // ヘルパー: 数値文字列（カンマ付き）を数値に変換
  const parseNumber = (val: string | number): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const normalized = val
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/,/g, '');
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  // ヘルパー: 数値をカンマ付き文字列に変換
  const formatValue = (val: string | number | null | undefined): string => {
    if (val === '' || val === null || val === undefined) return '';
    let str = String(val)
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/,/g, '');
    str = str.replace(/[^0-9.]/g, '');

    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (parts.length > 1) {
      return `${parts[0]}.${parts[1]}`;
    }

    if (str.endsWith('.') || (parts.length === 2 && parts[1] === '')) {
      return `${parts[0]}.`;
    }

    return parts[0];
  };

  // 和暦取得ヘルパー
  const getWareki = (year: number): string => {
    if (year >= 2019) return `令和${year - 2018}年`;
    if (year >= 1989) return `平成${year - 1988}年`;
    if (year >= 1926) return `昭和${year - 1925}年`;
    if (year >= 1912) return `大正${year - 1911}年`;
    return `明治${year - 1867}年`;
  };

  // 年リスト生成
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 1900; y--) {
      years.push(y);
    }
    return years;
  }, []);

  // 入力ステート
  const [includeLand, setIncludeLand] = useState(true);
  const [includeBuilding, setIncludeBuilding] = useState(true);

  const [landValuation, setLandValuation] = useState('');
  const [buildingValuation, setBuildingValuation] = useState('');
  const [transactionType, setTransactionType] = useState('purchase');
  const [landArea, setLandArea] = useState('');
  const [buildingArea, setBuildingArea] = useState('');

  const [selYear, setSelYear] = useState('');
  const [selMonth, setSelMonth] = useState('');
  const [selDay, setSelDay] = useState('');
  const [buildingDate, setBuildingDate] = useState('');

  const [landType, setLandType] = useState('residential');
  const [isResidential, setIsResidential] = useState(true);
  const [hasHousingCertificate, setHasHousingCertificate] = useState(true);
  const [acquisitionDeduction, setAcquisitionDeduction] = useState('');

  const [showDetails, setShowDetails] = useState(false);
  const [deductionMessage, setDeductionMessage] = useState('');

  const [results, setResults] = useState<TaxResults>({
    total: 0,
    landAcq: 0,
    landReg: 0,
    bldgAcq: 0,
    bldgReg: 0,
    totalAcq: 0,
    totalReg: 0,
    process: { landAcq: [], landReg: [], bldgAcq: [], bldgReg: [] },
  });

  const handleFormattedInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const formatted = formatValue(e.target.value);
    setter(formatted);
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(num);
  };

  const handlePrint = () => {
    window.print();
  };

  // 年月日選択ステートが変更されたら buildingDate を更新
  useEffect(() => {
    if (selYear && selMonth && selDay) {
      const y = selYear;
      const m = selMonth.padStart(2, '0');
      const d = selDay.padStart(2, '0');
      setBuildingDate(`${y}-${m}-${d}`);
    } else {
      setBuildingDate('');
    }
  }, [selYear, selMonth, selDay]);

  // 建築年月日から控除額を計算
  useEffect(() => {
    if (!isResidential) {
      setDeductionMessage('住宅用ではないため控除なし');
      setAcquisitionDeduction('0');
      return;
    }
    if (transactionType === 'new_build') {
      setAcquisitionDeduction('12,000,000');
      setDeductionMessage('新築住宅 (原則1,200万円控除)');
      return;
    }
    if (!buildingDate) {
      setDeductionMessage('建築年月日を指定すると自動判定します');
      return;
    }
    const date = new Date(buildingDate);
    let deduction = 0;
    let msg = '';
    const d1997 = new Date('1997-04-01');
    const d1989 = new Date('1989-04-01');
    const d1985 = new Date('1985-07-01');
    const d1981 = new Date('1981-07-01');
    const d1976 = new Date('1976-01-01');

    if (date >= d1997) {
      deduction = 12000000;
      msg = '1997年4月1日以降 (1,200万円控除)';
    } else if (date >= d1989) {
      deduction = 10000000;
      msg = '1989年4月1日～ (1,000万円控除)';
    } else if (date >= d1985) {
      deduction = 4500000;
      msg = '1985年7月1日～ (450万円控除)';
    } else if (date >= d1981) {
      deduction = 4200000;
      msg = '1981年7月1日～ (420万円控除)';
    } else if (date >= d1976) {
      deduction = 3500000;
      msg = '1976年1月1日～ (350万円控除)';
    } else {
      deduction = 0;
      msg = '1975年以前';
    }

    setAcquisitionDeduction(formatValue(deduction));
    setDeductionMessage(
      `建築時期により自動設定: ${formatCurrency(deduction)} (${msg})`
    );
  }, [buildingDate, transactionType, isResidential]);

  // 税額計算
  useEffect(() => {
    calculateTax();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    includeLand,
    includeBuilding,
    landValuation,
    buildingValuation,
    transactionType,
    landType,
    isResidential,
    hasHousingCertificate,
    acquisitionDeduction,
    landArea,
    buildingArea,
  ]);

  const calculateTax = () => {
    const valLand = parseNumber(landValuation);
    const valBldg = parseNumber(buildingValuation);
    const areaLand = parseNumber(landArea);
    const areaBldg = parseNumber(buildingArea);
    const valDeduction = parseNumber(acquisitionDeduction);

    const r: TaxResults = {
      landAcq: 0,
      landReg: 0,
      bldgAcq: 0,
      bldgReg: 0,
      totalAcq: 0,
      totalReg: 0,
      total: 0,
      process: { landAcq: [], landReg: [], bldgAcq: [], bldgReg: [] },
    };

    // --- 土地の計算 ---
    if (includeLand && valLand > 0) {
      if (transactionType === 'inheritance') {
        r.landAcq = 0;
        r.process.landAcq.push('相続のため不動産取得税は非課税 (0円)');
      } else {
        let landAcqBase = valLand;
        let landBaseNote = '';
        if (landType === 'residential') {
          landAcqBase = Math.floor(valLand / 2);
          landBaseNote = ' (宅地特例 1/2)';
        }

        const landAcqRate = 0.03;
        const originalTax = Math.floor(landAcqBase * landAcqRate);

        r.process.landAcq.push(`評価額: ${formatCurrency(valLand)}`);
        if (landType === 'residential') {
          r.process.landAcq.push(
            `課税標準額: ${formatCurrency(landAcqBase)}${landBaseNote}`
          );
        }
        r.process.landAcq.push(
          `計算上の税額: ${formatCurrency(landAcqBase)} × 3% = ${formatCurrency(originalTax)}`
        );

        let reductionAmount = 0;

        if (isResidential && areaLand > 0 && areaBldg > 0) {
          const reductionA = 45000;
          const unitPrice = landAcqBase / areaLand;
          const cappedArea = Math.min(areaBldg * 2, 200);
          const reductionB = Math.floor(unitPrice * cappedArea * 0.03);

          reductionAmount = Math.max(reductionA, reductionB);

          r.process.landAcq.push(`--- 税額軽減 (住宅用地) ---`);
          r.process.landAcq.push(
            `土地1m²あたりの課税標準額: ${Math.floor(unitPrice).toLocaleString()}円`
          );
          r.process.landAcq.push(
            `控除対象面積 (床面積×2, 上限200m²): ${cappedArea}m²`
          );
          r.process.landAcq.push(
            `控除額計算 B: ${Math.floor(unitPrice).toLocaleString()} × ${cappedArea} × 3% = ${formatCurrency(reductionB)}`
          );
          r.process.landAcq.push(
            `適用控除額 (45,000円と比較し大きい方): ${formatCurrency(reductionAmount)}`
          );
        } else if (isResidential && (areaLand <= 0 || areaBldg <= 0)) {
          r.process.landAcq.push(
            `※土地面積と建物床面積を入力すると、税額軽減（最大45,000円等）が計算されます`
          );
        }

        r.landAcq = Math.max(0, originalTax - reductionAmount);
        if (reductionAmount > 0) {
          r.process.landAcq.push(
            `納付税額: ${formatCurrency(originalTax)} - ${formatCurrency(reductionAmount)} = ${formatCurrency(r.landAcq)}`
          );
        }
      }

      // 登録免許税
      const landRegBase = Math.floor(valLand / 1000) * 1000;
      let landRegRate = 0.02;
      let landRegRateNote = '本則税率';

      if (transactionType === 'purchase') {
        landRegRate = 0.015;
        landRegRateNote = '売買の特例税率';
      } else if (transactionType === 'inheritance') {
        landRegRate = 0.004;
        landRegRateNote = '相続';
      } else if (transactionType === 'gift') {
        landRegRate = 0.02;
        landRegRateNote = '贈与';
      } else if (transactionType === 'new_build') {
        landRegRate = 0.004;
        landRegRateNote = '所有権移転(仮)';
      }

      const rawLandReg = Math.floor(landRegBase * landRegRate);
      r.landReg = Math.floor(rawLandReg / 100) * 100;
      if (r.landReg < 1000) r.landReg = 1000;

      r.process.landReg.push(`課税標準額: ${formatCurrency(landRegBase)}`);
      r.process.landReg.push(
        `税額: ${formatCurrency(landRegBase)} × ${(landRegRate * 100).toFixed(2)}% (${landRegRateNote}) = ${formatCurrency(rawLandReg)} → ${formatCurrency(r.landReg)}`
      );
    }

    // --- 建物の計算 ---
    if (includeBuilding && valBldg > 0) {
      if (transactionType === 'inheritance') {
        r.bldgAcq = 0;
        r.process.bldgAcq.push('相続のため不動産取得税は非課税 (0円)');
      } else {
        const bldgAcqBase = Math.max(0, valBldg - valDeduction);
        const bldgAcqRate = isResidential ? 0.03 : 0.04;
        const bldgRateNote = isResidential ? '住宅用' : '非住宅';

        r.bldgAcq = Math.floor(bldgAcqBase * bldgAcqRate);

        r.process.bldgAcq.push(`評価額: ${formatCurrency(valBldg)}`);
        if (valDeduction > 0) {
          r.process.bldgAcq.push(
            `課税標準額: ${formatCurrency(valBldg)} - ${formatCurrency(valDeduction)}(控除) = ${formatCurrency(bldgAcqBase)}`
          );
        } else {
          r.process.bldgAcq.push(`課税標準額: ${formatCurrency(bldgAcqBase)}`);
        }
        r.process.bldgAcq.push(
          `税額: ${formatCurrency(bldgAcqBase)} × ${(bldgAcqRate * 100).toFixed(0)}% (${bldgRateNote}) = ${formatCurrency(r.bldgAcq)}`
        );
      }

      // 登録免許税
      const bldgRegBase = Math.floor(valBldg / 1000) * 1000;
      let bldgRegRate = 0.02;
      let bldgRegRateNote = '本則';

      if (transactionType === 'purchase') {
        if (isResidential && hasHousingCertificate) {
          bldgRegRate = 0.003;
          bldgRegRateNote = '住宅用家屋証明あり';
        } else {
          bldgRegRate = 0.02;
        }
      } else if (transactionType === 'new_build') {
        if (isResidential && hasHousingCertificate) {
          bldgRegRate = 0.0015;
          bldgRegRateNote = '住宅用家屋証明あり';
        } else {
          bldgRegRate = 0.004;
          bldgRegRateNote = '本則(保存)';
        }
      } else if (transactionType === 'inheritance') {
        bldgRegRate = 0.004;
        bldgRegRateNote = '相続';
      } else if (transactionType === 'gift') {
        bldgRegRate = 0.02;
        bldgRegRateNote = '贈与';
      }

      const rawBldgReg = Math.floor(bldgRegBase * bldgRegRate);
      r.bldgReg = Math.floor(rawBldgReg / 100) * 100;
      if (r.bldgReg < 1000) r.bldgReg = 1000;

      r.process.bldgReg.push(`課税標準額: ${formatCurrency(bldgRegBase)}`);
      r.process.bldgReg.push(
        `税額: ${formatCurrency(bldgRegBase)} × ${(bldgRegRate * 100).toFixed(2)}% (${bldgRegRateNote}) = ${formatCurrency(rawBldgReg)} → ${formatCurrency(r.bldgReg)}`
      );
    }

    r.totalAcq = r.landAcq + r.bldgAcq;
    r.totalReg = r.landReg + r.bldgReg;
    r.total = r.totalAcq + r.totalReg;
    setResults(r);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen pb-20">
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100 relative">
        {/* ヘッダー */}
        <div className="bg-blue-600 p-6 text-white flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="w-6 h-6" />
              不動産税金シミュレーター
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              土地の税額軽減・築年数控除 対応版
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="no-print bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition backdrop-blur-sm"
          >
            <Printer className="w-5 h-5" />
            印刷する
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* 1. 取引条件 */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 p-1 rounded">
                <CheckCircle className="w-5 h-5" />
              </span>
              取引条件
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                登記原因 (取引種別)
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="purchase">売買 (購入)</option>
                <option value="new_build">新築 (建物の保存登記)</option>
                <option value="inheritance">相続</option>
                <option value="gift">贈与</option>
              </select>
              {transactionType === 'inheritance' && (
                <p className="text-sm text-green-600 mt-2 font-medium">
                  ※ 相続の場合、不動産取得税は非課税です。
                </p>
              )}
            </div>
          </section>

          {/* 計算対象選択 */}
          <div className="flex gap-4 border-b pb-6">
            <label
              className={`flex-1 cursor-pointer border-2 rounded-lg p-4 flex items-center justify-center gap-3 transition ${
                includeLand
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-500'
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={includeLand}
                onChange={(e) => setIncludeLand(e.target.checked)}
              />
              <Map className="w-4 h-4" />
              <span className="font-bold">土地を計算する</span>
            </label>
            <label
              className={`flex-1 cursor-pointer border-2 rounded-lg p-4 flex items-center justify-center gap-3 transition ${
                includeBuilding
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-500'
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={includeBuilding}
                onChange={(e) => setIncludeBuilding(e.target.checked)}
              />
              <Building2 className="w-4 h-4" />
              <span className="font-bold">建物を計算する</span>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 2. 土地入力エリア */}
            <section
              className={`space-y-4 ${!includeLand ? 'opacity-30 pointer-events-none grayscale' : ''}`}
            >
              <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                <Map className="w-4 h-4" /> 土地の情報
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  固定資産税評価額
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="例: 15,000,000"
                    value={landValuation}
                    onChange={(e) => handleFormattedInput(e, setLandValuation)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right font-mono"
                  />
                  <span className="absolute left-2 top-2 text-gray-400 text-sm pointer-events-none">
                    ¥
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Ruler className="w-4 h-4" /> 土地面積 (m²)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="例: 100"
                    value={landArea}
                    onChange={(e) => handleFormattedInput(e, setLandArea)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right font-mono"
                  />
                  <span className="absolute left-2 top-2 text-gray-400 text-sm pointer-events-none">
                    Area
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ※税額軽減の計算に使用します
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                <div className="font-semibold text-gray-600 mb-1">地目</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLandType('residential')}
                    className={`flex-1 py-2 px-1 border rounded text-xs font-medium transition ${
                      landType === 'residential'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    宅地
                    <br />
                    (特例あり)
                  </button>
                  <button
                    onClick={() => setLandType('other')}
                    className={`flex-1 py-2 px-1 border rounded text-xs font-medium transition ${
                      landType === 'other'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    その他
                    <br />
                    (農地等)
                  </button>
                </div>
                {landType === 'residential' && (
                  <p className="text-xs text-blue-600 mt-2">
                    <span className="font-bold">✓ 宅地の課税標準特例を適用</span>
                  </p>
                )}
              </div>
            </section>

            {/* 3. 建物入力エリア */}
            <section
              className={`space-y-4 ${!includeBuilding ? 'opacity-30 pointer-events-none grayscale' : ''}`}
            >
              <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
                <Building2 className="w-4 h-4" /> 建物の情報
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  固定資産税評価額
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="例: 10,000,000"
                    value={buildingValuation}
                    onChange={(e) =>
                      handleFormattedInput(e, setBuildingValuation)
                    }
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right font-mono"
                  />
                  <span className="absolute left-2 top-2 text-gray-400 text-sm pointer-events-none">
                    ¥
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Ruler className="w-4 h-4" /> 建物床面積 (m²)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="例: 90"
                    value={buildingArea}
                    onChange={(e) => handleFormattedInput(e, setBuildingArea)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right font-mono"
                  />
                  <span className="absolute left-2 top-2 text-gray-400 text-sm pointer-events-none">
                    Area
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ※土地の税額軽減にも影響します
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> 建築年月日
                </label>
                <div className="flex gap-2">
                  <select
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right appearance-none bg-white cursor-pointer"
                    value={selYear}
                    onChange={(e) => setSelYear(e.target.value)}
                  >
                    <option value="">年を選択</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}年 ({getWareki(y)})
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-20 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right appearance-none bg-white cursor-pointer"
                    value={selMonth}
                    onChange={(e) => setSelMonth(e.target.value)}
                  >
                    <option value="">月</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}月
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-20 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right appearance-none bg-white cursor-pointer"
                    value={selDay}
                    onChange={(e) => setSelDay(e.target.value)}
                  >
                    <option value="">日</option>
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}日
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ※築年数による控除判定に使用
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded text-sm space-y-3">
                <div className="font-semibold text-gray-600">建物の軽減措置</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isResidential}
                    onChange={(e) => setIsResidential(e.target.checked)}
                  />
                  <span>
                    居住用である{' '}
                    <span className="text-xs text-gray-500">
                      (取得税3%/4%判定)
                    </span>
                  </span>
                </label>

                <div
                  className={`pl-4 border-l-2 border-gray-300 space-y-2 ${!isResidential ? 'opacity-50' : ''}`}
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasHousingCertificate}
                      onChange={(e) =>
                        setHasHousingCertificate(e.target.checked)
                      }
                      disabled={!isResidential}
                    />
                    <span>
                      住宅用家屋証明書あり{' '}
                      <span className="text-xs text-gray-500">
                        (登録免許税減税)
                      </span>
                    </span>
                  </label>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      建物不動産取得税の控除額
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="例: 12,000,000"
                        value={acquisitionDeduction}
                        onChange={(e) =>
                          handleFormattedInput(e, setAcquisitionDeduction)
                        }
                        disabled={!isResidential}
                        className="w-full p-1 border rounded text-right font-mono"
                      />
                      <span className="absolute left-2 top-1 text-gray-400 text-xs pointer-events-none">
                        ¥
                      </span>
                    </div>
                    {deductionMessage && (
                      <p className="text-xs text-blue-600 mt-1">
                        {deductionMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* 結果エリア */}
        <div className="bg-gray-800 text-white p-6">
          <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-600">
            計算結果
          </h2>

          <div className="space-y-4 mb-6">
            {/* 不動産取得税 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-300 font-bold">
                  不動産取得税
                </div>
                <div className="text-xs text-gray-400">
                  {includeLand && `土地: ${formatCurrency(results.landAcq)}`}
                  {includeLand && includeBuilding && ' + '}
                  {includeBuilding &&
                    `建物: ${formatCurrency(results.bldgAcq)}`}
                </div>
              </div>
              <div className="text-xl font-bold">
                {formatCurrency(results.totalAcq)}
              </div>
            </div>

            {/* 登録免許税 */}
            <div className="flex items-center justify-between border-t border-gray-700 pt-4">
              <div>
                <div className="text-sm text-green-300 font-bold">
                  登録免許税
                </div>
                <div className="text-xs text-gray-400">
                  {includeLand && `土地: ${formatCurrency(results.landReg)}`}
                  {includeLand && includeBuilding && ' + '}
                  {includeBuilding &&
                    `建物: ${formatCurrency(results.bldgReg)}`}
                </div>
              </div>
              <div className="text-xl font-bold">
                {formatCurrency(results.totalReg)}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-gray-600 pt-4 mt-4">
            <span className="text-lg text-gray-300">合計納税額</span>
            <span className="text-4xl font-bold text-white">
              {formatCurrency(results.total)}
            </span>
          </div>
        </div>

        {/* 計算過程の詳細 */}
        <div className="border-t border-gray-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full p-4 flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition font-medium text-sm no-print"
          >
            {showDetails ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
            {showDetails ? '計算過程を隠す' : '計算過程の詳細を表示'}
          </button>

          {showDetails && (
            <div className="p-6 bg-gray-50 text-sm space-y-6">
              {/* 土地詳細 */}
              {includeLand && (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Map className="w-4 h-4" /> 土地の計算詳細
                  </h3>
                  <div className="bg-white p-4 rounded border border-gray-200 shadow-sm space-y-4">
                    <div>
                      <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                        不動産取得税
                      </span>
                      <ul className="list-disc list-inside mt-1 text-gray-600 space-y-1 pl-1">
                        {results.process.landAcq.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t pt-3">
                      <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                        登録免許税
                      </span>
                      <ul className="list-disc list-inside mt-1 text-gray-600 space-y-1 pl-1">
                        {results.process.landReg.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 建物詳細 */}
              {includeBuilding && (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> 建物の計算詳細
                  </h3>
                  <div className="bg-white p-4 rounded border border-gray-200 shadow-sm space-y-4">
                    <div>
                      <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                        不動産取得税
                      </span>
                      <ul className="list-disc list-inside mt-1 text-gray-600 space-y-1 pl-1">
                        {results.process.bldgAcq.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t pt-3">
                      <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                        登録免許税
                      </span>
                      <ul className="list-disc list-inside mt-1 text-gray-600 space-y-1 pl-1">
                        {results.process.bldgReg.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 mt-4 no-print">
        ※この計算は概算です。実際の税額は、自治体の条例や端数処理のルールにより数円～数十円異なる場合があります。
      </p>
    </div>
  );
}
