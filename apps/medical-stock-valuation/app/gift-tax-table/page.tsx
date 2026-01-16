'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { buttonStyle, buttonHoverClass } from '@/lib/button-styles';

export default function GiftTaxTable() {
  const router = useRouter();

  const goBack = () => {
    router.back();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">【参考】相続税額早見表</h1>

      <p className="mb-6">
        法定相続分に応じて財産を取得した場合に、以下の表より簡単に概算の相続税額を知ることができます。
      </p>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">■配偶者がいる場合</h2>
        <div className="overflow-x-auto">
          <table className="border-collapse w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-center" rowSpan={2}>課税価格</th>
                <th className="border border-gray-400 p-2 text-center" colSpan={4}>相続税額</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-center">配偶者＋子１人</th>
                <th className="border border-gray-400 p-2 text-center">配偶者＋子２人</th>
                <th className="border border-gray-400 p-2 text-center">配偶者＋子３人</th>
                <th className="border border-gray-400 p-2 text-center">配偶者＋子４人</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 text-right">5,000万円</td>
                <td className="border border-gray-400 p-2 text-right">40万円</td>
                <td className="border border-gray-400 p-2 text-right">10万円</td>
                <td className="border border-gray-400 p-2 text-right">0万円</td>
                <td className="border border-gray-400 p-2 text-right">0万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">7,500万円</td>
                <td className="border border-gray-400 p-2 text-right">197万円</td>
                <td className="border border-gray-400 p-2 text-right">143万円</td>
                <td className="border border-gray-400 p-2 text-right">106万円</td>
                <td className="border border-gray-400 p-2 text-right">75万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">1億円</td>
                <td className="border border-gray-400 p-2 text-right">385万円</td>
                <td className="border border-gray-400 p-2 text-right">315万円</td>
                <td className="border border-gray-400 p-2 text-right">262万円</td>
                <td className="border border-gray-400 p-2 text-right">225万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">2億円</td>
                <td className="border border-gray-400 p-2 text-right">1,670万円</td>
                <td className="border border-gray-400 p-2 text-right">1,350万円</td>
                <td className="border border-gray-400 p-2 text-right">1,217万円</td>
                <td className="border border-gray-400 p-2 text-right">1,125万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">3億円</td>
                <td className="border border-gray-400 p-2 text-right">3,460万円</td>
                <td className="border border-gray-400 p-2 text-right">2,860万円</td>
                <td className="border border-gray-400 p-2 text-right">2,539万円</td>
                <td className="border border-gray-400 p-2 text-right">2,350万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">4億円</td>
                <td className="border border-gray-400 p-2 text-right">5,460万円</td>
                <td className="border border-gray-400 p-2 text-right">4,610万円</td>
                <td className="border border-gray-400 p-2 text-right">4,154万円</td>
                <td className="border border-gray-400 p-2 text-right">3,850万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">5億円</td>
                <td className="border border-gray-400 p-2 text-right">7,605万円</td>
                <td className="border border-gray-400 p-2 text-right">6,555万円</td>
                <td className="border border-gray-400 p-2 text-right">5,962万円</td>
                <td className="border border-gray-400 p-2 text-right">5,500万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">6億円</td>
                <td className="border border-gray-400 p-2 text-right">9,855万円</td>
                <td className="border border-gray-400 p-2 text-right">8,680万円</td>
                <td className="border border-gray-400 p-2 text-right">7,837万円</td>
                <td className="border border-gray-400 p-2 text-right">7,375万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">7億円</td>
                <td className="border border-gray-400 p-2 text-right">1億2,250万円</td>
                <td className="border border-gray-400 p-2 text-right">1億870万円</td>
                <td className="border border-gray-400 p-2 text-right">9,884万円</td>
                <td className="border border-gray-400 p-2 text-right">9,300万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">8億円</td>
                <td className="border border-gray-400 p-2 text-right">1億4,750万円</td>
                <td className="border border-gray-400 p-2 text-right">1億3,120万円</td>
                <td className="border border-gray-400 p-2 text-right">1億2,134万円</td>
                <td className="border border-gray-400 p-2 text-right">1億1,300万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">9億円</td>
                <td className="border border-gray-400 p-2 text-right">1億7,250万円</td>
                <td className="border border-gray-400 p-2 text-right">1億5,435万円</td>
                <td className="border border-gray-400 p-2 text-right">1億4,385万円</td>
                <td className="border border-gray-400 p-2 text-right">1億3,400万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">10億円</td>
                <td className="border border-gray-400 p-2 text-right">1億9,750万円</td>
                <td className="border border-gray-400 p-2 text-right">1億7,810万円</td>
                <td className="border border-gray-400 p-2 text-right">1億6,634万円</td>
                <td className="border border-gray-400 p-2 text-right">1億5,650万円</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">■配偶者がいない場合</h2>
        <div className="overflow-x-auto">
          <table className="border-collapse w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-center" rowSpan={2}>課税価格</th>
                <th className="border border-gray-400 p-2 text-center" colSpan={4}>相続税額</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-center">子１人</th>
                <th className="border border-gray-400 p-2 text-center">子２人</th>
                <th className="border border-gray-400 p-2 text-center">子３人</th>
                <th className="border border-gray-400 p-2 text-center">子４人</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 text-right">5,000万円</td>
                <td className="border border-gray-400 p-2 text-right">160万円</td>
                <td className="border border-gray-400 p-2 text-right">80万円</td>
                <td className="border border-gray-400 p-2 text-right">19万円</td>
                <td className="border border-gray-400 p-2 text-right">0万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">7,500万円</td>
                <td className="border border-gray-400 p-2 text-right">580万円</td>
                <td className="border border-gray-400 p-2 text-right">395万円</td>
                <td className="border border-gray-400 p-2 text-right">270万円</td>
                <td className="border border-gray-400 p-2 text-right">210万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">1億円</td>
                <td className="border border-gray-400 p-2 text-right">1,220万円</td>
                <td className="border border-gray-400 p-2 text-right">770万円</td>
                <td className="border border-gray-400 p-2 text-right">629万円</td>
                <td className="border border-gray-400 p-2 text-right">490万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">2億円</td>
                <td className="border border-gray-400 p-2 text-right">4,860万円</td>
                <td className="border border-gray-400 p-2 text-right">3,340万円</td>
                <td className="border border-gray-400 p-2 text-right">2,459万円</td>
                <td className="border border-gray-400 p-2 text-right">2,120万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">3億円</td>
                <td className="border border-gray-400 p-2 text-right">9,180万円</td>
                <td className="border border-gray-400 p-2 text-right">6,920万円</td>
                <td className="border border-gray-400 p-2 text-right">5,460万円</td>
                <td className="border border-gray-400 p-2 text-right">4,580万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">4億円</td>
                <td className="border border-gray-400 p-2 text-right">1億4,000万円</td>
                <td className="border border-gray-400 p-2 text-right">1億920万円</td>
                <td className="border border-gray-400 p-2 text-right">8,979万円</td>
                <td className="border border-gray-400 p-2 text-right">7,580万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">5億円</td>
                <td className="border border-gray-400 p-2 text-right">1億9,000万円</td>
                <td className="border border-gray-400 p-2 text-right">1億5,210万円</td>
                <td className="border border-gray-400 p-2 text-right">1億2,979万円</td>
                <td className="border border-gray-400 p-2 text-right">1億1,040万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">6億円</td>
                <td className="border border-gray-400 p-2 text-right">2億4,000万円</td>
                <td className="border border-gray-400 p-2 text-right">1億9,710万円</td>
                <td className="border border-gray-400 p-2 text-right">1億6,980万円</td>
                <td className="border border-gray-400 p-2 text-right">1億5,040万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">7億円</td>
                <td className="border border-gray-400 p-2 text-right">2億9,320万円</td>
                <td className="border border-gray-400 p-2 text-right">2億4,500万円</td>
                <td className="border border-gray-400 p-2 text-right">2億1,239万円</td>
                <td className="border border-gray-400 p-2 text-right">1億9,040万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">8億円</td>
                <td className="border border-gray-400 p-2 text-right">3億4,820万円</td>
                <td className="border border-gray-400 p-2 text-right">2億9,500万円</td>
                <td className="border border-gray-400 p-2 text-right">2億5,739万円</td>
                <td className="border border-gray-400 p-2 text-right">2億3,040万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">9億円</td>
                <td className="border border-gray-400 p-2 text-right">4億320万円</td>
                <td className="border border-gray-400 p-2 text-right">3億4,500万円</td>
                <td className="border border-gray-400 p-2 text-right">3億240万円</td>
                <td className="border border-gray-400 p-2 text-right">2億7,270万円</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-right">10億円</td>
                <td className="border border-gray-400 p-2 text-right">4億5,820万円</td>
                <td className="border border-gray-400 p-2 text-right">3億9,500万円</td>
                <td className="border border-gray-400 p-2 text-right">3億4,999万円</td>
                <td className="border border-gray-400 p-2 text-right">3億1,770万円</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8 p-4 bg-gray-50 border border-gray-300 rounded">
        <p className="text-sm mb-2">
          ※ 法定相続分により相続した場合の相続税額を計算しています。
        </p>
        <p className="text-sm mb-2">
          ※ 配偶者の税額軽減を法定相続分まで活用するものとしています。
        </p>
        <p className="text-sm mb-2">
          ※ 税額は1万円未満の金額を切り捨てていますので、実際の相続税とは若干の相違があります。
        </p>
        <p className="text-sm">
          ※ 課税価格は基礎控除前の相続税の課税価格になります。
        </p>
      </div>

      {/* 戻るボタン */}
      <div className="text-center mt-8">
        <button
          className={buttonHoverClass}
          style={buttonStyle}
          onClick={goBack}
        >
          <ArrowLeft size={20} />
          計算結果に戻る
        </button>
      </div>
    </div>
  );
}
